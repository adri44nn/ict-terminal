#!/usr/bin/env python3
"""
ICT Mastery & Live Micro Futures Trading Terminal Server
Handles live quotes, multi-timeframe candle parsing, ICT pattern recognition,
and paper trading execution state.
"""

import os
import sys
import json
import time
import urllib.request
import urllib.error
import threading
from typing import Any, Dict, List, Optional
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from ict_engine import ICTEngine
from icc_engine import ICCEngine

PORT = 8080
engine = ICTEngine()
icc_engine = ICCEngine()

# In-memory cache for candle and analysis data to avoid rate limits
CACHE = {
    "data": {},
    "icc_data": {},
    "last_fetched": {},
    "paper_account": {
        "balance": 25000.00,
        "starting_balance": 25000.00,
        "positions": [],
        "history": []
    },
    "alerts": []
}

SYMBOLS = {
    "MNQ": {"name": "Micro E-mini Nasdaq-100", "yahoo": "MNQ=F", "alt": "NQ=F", "point_val": 2.00, "tick": 0.25},
    "MES": {"name": "Micro E-mini S&P 500", "yahoo": "MES=F", "alt": "ES=F", "point_val": 5.00, "tick": 0.25},
    "M2K": {"name": "Micro E-mini Russell 2000", "yahoo": "M2K=F", "alt": "RTY=F", "point_val": 5.00, "tick": 0.10},
    "MGC": {"name": "Micro Gold Futures", "yahoo": "MGC=F", "alt": "GC=F", "point_val": 10.00, "tick": 0.10},
}


def fetch_candles(ticker: str, interval: str = "5m", range_str: str = "1d"):
    """Fetches real-time candles from Yahoo Finance."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval={interval}&range={range_str}"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    req = urllib.request.Request(url, headers=headers)
    
    try:
        with urllib.request.urlopen(req, timeout=7) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            result = data['chart']['result'][0]
            timestamps = result.get('timestamp', [])
            quotes = result['indicators']['quote'][0]
            
            candles = []
            opens = quotes.get('open', [])
            highs = quotes.get('high', [])
            lows = quotes.get('low', [])
            closes = quotes.get('close', [])
            volumes = quotes.get('volume', [])

            for i in range(len(timestamps)):
                if (opens[i] is not None and highs[i] is not None and 
                    lows[i] is not None and closes[i] is not None):
                    candles.append({
                        "time": timestamps[i],
                        "open": round(opens[i], 2),
                        "high": round(highs[i], 2),
                        "low": round(lows[i], 2),
                        "close": round(closes[i], 2),
                        "volume": volumes[i] if (volumes and volumes[i]) else 0
                    })
            return candles
    except Exception as e:
        print(f"Fetch error for {ticker} ({interval}): {e}")
        return []


def get_symbol_candles(sym_key: str, interval: str = "5m"):
    """Fetches with primary symbol and falls back to mini contract or 5d weekend range if needed."""
    cfg = SYMBOLS.get(sym_key)
    if not cfg:
        return []
    
    candles = fetch_candles(cfg['yahoo'], interval=interval, range_str="1d")
    if not candles:
        candles = fetch_candles(cfg['alt'], interval=interval, range_str="1d")
    if not candles:
        candles = fetch_candles(cfg['yahoo'], interval=interval, range_str="5d")
    if not candles:
        candles = fetch_candles(cfg['alt'], interval=interval, range_str="5d")
    return candles


def update_market_cache():
    """Background loop to refresh candle data and run ICT & ICC detection."""
    while True:
        try:
            for sym_key, sym_info in SYMBOLS.items():
                for tf in ["1m", "5m", "15m"]:
                    cache_key = f"{sym_key}_{tf}"
                    candles = get_symbol_candles(sym_key, interval=tf)
                    if candles:
                        analysis = engine.analyze_symbol(sym_key, candles, timeframe=tf)
                        icc_analysis = icc_engine.analyze_symbol(sym_key, candles, timeframe=tf)
                        
                        CACHE["data"][cache_key] = {
                            "candles": candles[-120:],
                            "analysis": analysis,
                            "timestamp": time.time()
                        }
                        CACHE["icc_data"][cache_key] = {
                            "analysis": icc_analysis,
                            "timestamp": time.time()
                        }
                        
                        # Check if high confluence alert formed
                        if tf == "5m" and analysis.get("confluence_score", 0) >= 60:
                            alert_id = f"{sym_key}_{int(candles[-1]['time'])}"
                            if not any(a['id'] == alert_id for a in CACHE["alerts"]):
                                CACHE["alerts"].insert(0, {
                                    "id": alert_id,
                                    "symbol": sym_key,
                                    "timeframe": tf,
                                    "time_str": engine.get_ny_time(candles[-1]['time']).strftime("%H:%M NY"),
                                    "setup_type": analysis['setup_type'],
                                    "direction": analysis['direction'],
                                    "setup_grade": analysis.get('setup_grade', 'F'),
                                    "grade_desc": analysis.get('grade_desc', ''),
                                    "confluence": analysis['confluence_score'],
                                    "entry": analysis['trade_plan']['entry'],
                                    "sl": analysis['trade_plan']['stop_loss'],
                                    "tp": analysis['trade_plan']['take_profit'],
                                    "rr": analysis['trade_plan']['rr_ratio']
                                })
                                CACHE["alerts"] = CACHE["alerts"][:25]

            # Update Paper Trading Positions PnL with current live price
            for pos in CACHE["paper_account"]["positions"]:
                sym = pos["symbol"]
                cache_5m = CACHE["data"].get(f"{sym}_5m")
                if cache_5m and cache_5m["candles"]:
                    curr_p = cache_5m["candles"][-1]["close"]
                    pos["current_price"] = curr_p
                    mult = SYMBOLS[sym]["point_val"]
                    if pos["direction"] == "BULLISH":
                        pos["pnl_pts"] = round(curr_p - pos["entry_price"], 2)
                    else:
                        pos["pnl_pts"] = round(pos["entry_price"] - curr_p, 2)
                    pos["pnl_usd"] = round(pos["pnl_pts"] * mult * pos["contracts"], 2)

        except Exception as e:
            print(f"Background update error: {e}")

        time.sleep(5)


class ICTRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        if path == "/api/status":
            kz = engine.get_killzone_status()
            self.send_json({
                "status": "online",
                "killzone": kz,
                "server_time": time.time()
            })
            return

        elif path == "/api/scan":
            results = {}
            icc_results = {}
            for sym in SYMBOLS.keys():
                key = f"{sym}_5m"
                candles = None
                if key in CACHE["data"]:
                    results[sym] = CACHE["data"][key]["analysis"]
                    candles = CACHE["data"][key]["candles"]
                else:
                    candles = get_symbol_candles(sym, "5m")
                    if candles:
                        analysis = engine.analyze_symbol(sym, candles, "5m")
                        results[sym] = analysis
                        CACHE["data"][key] = {"candles": candles[-120:], "analysis": analysis, "timestamp": time.time()}

                if key in CACHE["icc_data"]:
                    icc_results[sym] = CACHE["icc_data"][key]["analysis"]
                elif candles:
                    analysis = icc_engine.analyze_symbol(sym, candles, "5m")
                    icc_results[sym] = analysis
                    CACHE["icc_data"][key] = {"analysis": analysis, "timestamp": time.time()}
            
            self.send_json({
                "killzone": engine.get_killzone_status(),
                "scan_results": results,
                "icc_scan_results": icc_results,
                "alerts": CACHE["alerts"][:10]
            })
            return

        elif path == "/api/icc/scan":
            results = {}
            for sym in SYMBOLS.keys():
                key = f"{sym}_5m"
                if key in CACHE["icc_data"]:
                    results[sym] = CACHE["icc_data"][key]["analysis"]
                elif key in CACHE["data"]:
                    candles = CACHE["data"][key]["candles"]
                    analysis = icc_engine.analyze_symbol(sym, candles, "5m")
                    results[sym] = analysis
                    CACHE["icc_data"][key] = {"analysis": analysis, "timestamp": time.time()}
                else:
                    candles = get_symbol_candles(sym, "5m")
                    if candles:
                        analysis = icc_engine.analyze_symbol(sym, candles, "5m")
                        results[sym] = analysis
                        CACHE["icc_data"][key] = {"analysis": analysis, "timestamp": time.time()}
            
            self.send_json({
                "scan_results": results,
                "server_time": time.time()
            })
            return

        elif path == "/api/chart":
            sym = query.get("symbol", ["MNQ"])[0].upper()
            tf = query.get("interval", ["5m"])[0].lower()
            key = f"{sym}_{tf}"

            if key in CACHE["data"]:
                cached = CACHE["data"][key]
                self.send_json({
                    "symbol": sym,
                    "timeframe": tf,
                    "candles": cached["candles"],
                    "analysis": cached["analysis"]
                })
            else:
                candles = get_symbol_candles(sym, interval=tf)
                analysis = engine.analyze_symbol(sym, candles, timeframe=tf)
                self.send_json({
                    "symbol": sym,
                    "timeframe": tf,
                    "candles": candles[-120:],
                    "analysis": analysis
                })
            return

        elif path in ("/api/paper", "/api/paper/account"):
            self.send_json(CACHE["paper_account"])
            return

        elif path == "/api/alerts":
            self.send_json({"alerts": CACHE["alerts"]})
            return

        # Serve static files
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8')
        data = json.loads(body) if body else {}

        if path == "/api/paper/trade":
            sym = data.get("symbol", "MNQ")
            direction = data.get("direction", "BULLISH")
            entry = float(data.get("entry", 0))
            sl = float(data.get("stop_loss", 0))
            tp = float(data.get("take_profit", 0))
            contracts = int(data.get("contracts", 1))
            setup = data.get("setup_type", "Manual Execution")

            pos = {
                "id": f"pos_{int(time.time()*1000)}",
                "symbol": sym,
                "direction": direction,
                "entry_price": entry,
                "current_price": entry,
                "stop_loss": sl,
                "take_profit": tp,
                "contracts": contracts,
                "setup_type": setup,
                "opened_at": engine.get_ny_time().strftime("%H:%M:%S NY"),
                "pnl_pts": 0.0,
                "pnl_usd": 0.0
            }
            CACHE["paper_account"]["positions"].insert(0, pos)
            self.send_json({"status": "success", "position": pos})
            return

        elif path == "/api/paper/close":
            pos_id = data.get("position_id")
            pos_to_close = None
            remaining = []
            for p in CACHE["paper_account"]["positions"]:
                if p["id"] == pos_id:
                    pos_to_close = p
                else:
                    remaining.append(p)

            if pos_to_close:
                CACHE["paper_account"]["positions"] = remaining
                pnl_usd = pos_to_close.get("pnl_usd", 0.0)
                CACHE["paper_account"]["balance"] += pnl_usd
                pos_to_close["closed_at"] = engine.get_ny_time().strftime("%H:%M:%S NY")
                CACHE["paper_account"]["history"].insert(0, pos_to_close)
                self.send_json({"status": "closed", "closed_position": pos_to_close, "new_balance": CACHE["paper_account"]["balance"]})
            else:
                self.send_json({"status": "error", "message": "Position not found"}, code=404)
            return

        elif path == "/api/paper/reset":
            CACHE["paper_account"] = {
                "balance": 25000.00,
                "starting_balance": 25000.00,
                "positions": [],
                "history": []
            }
            self.send_json({"status": "reset", "account": CACHE["paper_account"]})
            return

        self.send_json({"error": "Endpoint not found"}, code=404)

    def send_json(self, payload: Any, code: int = 200):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode('utf-8'))


def run_server():
    t = threading.Thread(target=update_market_cache, daemon=True)
    t.start()

    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, ICTRequestHandler)
    print(f"⚡ ICT Mastery Terminal Server running on http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        httpd.server_close()


if __name__ == "__main__":
    run_server()

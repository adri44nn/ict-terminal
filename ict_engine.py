"""
ICT (Inner Circle Trader) Algorithmic Analysis Engine
With Institutional Setup Grading System (A+, A, B, F):
- Grade A+ / A: Full Confluence (Sweep + MSS + FVG + 1:2+ R:R + Killzone / Silver Bullet)
- Grade B: High Potential Setup (Solid Structure / Forming FVG or Outside Prime Killzone)
- Grade F: No Setup / Conditions Not Met / Lunch Trap / Poor R:R
"""

import datetime
from typing import List, Dict, Any, Optional, Tuple


class ICTEngine:
    def __init__(self):
        self.symbol_specs = {
            "MNQ": {"name": "Micro E-mini Nasdaq-100", "point_value": 2.00, "tick_size": 0.25, "yahoo": "MNQ=F", "alt_yahoo": "NQ=F"},
            "MES": {"name": "Micro E-mini S&P 500", "point_value": 5.00, "tick_size": 0.25, "yahoo": "MES=F", "alt_yahoo": "ES=F"},
            "M2K": {"name": "Micro E-mini Russell 2000", "point_value": 5.00, "tick_size": 0.10, "yahoo": "M2K=F", "alt_yahoo": "RTY=F"},
            "MGC": {"name": "Micro Gold Futures", "point_value": 10.00, "tick_size": 0.10, "yahoo": "MGC=F", "alt_yahoo": "GC=F"},
        }

    @staticmethod
    def get_ny_time(timestamp: Optional[int] = None) -> datetime.datetime:
        if timestamp:
            utc_dt = datetime.datetime.fromtimestamp(timestamp, tz=datetime.timezone.utc)
        else:
            utc_dt = datetime.datetime.now(tz=datetime.timezone.utc)
        
        year = utc_dt.year
        dst_start = datetime.datetime(year, 3, 8, 2, 0, tzinfo=datetime.timezone.utc)
        dst_start += datetime.timedelta(days=(6 - dst_start.weekday()) % 7)
        dst_end = datetime.datetime(year, 11, 1, 2, 0, tzinfo=datetime.timezone.utc)
        dst_end += datetime.timedelta(days=(6 - dst_end.weekday()) % 7)

        offset_hours = -4 if (dst_start <= utc_dt < dst_end) else -5
        ny_tz = datetime.timezone(datetime.timedelta(hours=offset_hours))
        return utc_dt.astimezone(ny_tz)

    @classmethod
    def get_killzone_status(cls, timestamp: Optional[int] = None) -> Dict[str, Any]:
        ny_dt = cls.get_ny_time(timestamp)
        h = ny_dt.hour
        m = ny_dt.minute
        time_dec = h + m / 60.0

        is_sb = False
        sb_name = None
        active_kz = "Outside Killzones"
        is_high_probability = False
        is_lunch_trap = False

        if 2.0 <= time_dec < 5.0:
            active_kz = "London Open Killzone (02:00 - 05:00 NY)"
            is_high_probability = True
            if 3.0 <= time_dec < 4.0:
                is_sb = True
                sb_name = "London Silver Bullet (03:00 - 04:00 NY)"
        elif 8.5 <= time_dec < 11.0:
            active_kz = "New York AM Killzone (08:30 - 11:00 NY)"
            is_high_probability = True
            if 10.0 <= time_dec < 11.0:
                is_sb = True
                sb_name = "New York AM Silver Bullet (10:00 - 11:00 NY)"
        elif 12.0 <= time_dec < 13.0:
            active_kz = "New York Lunch (12:00 - 13:00 NY) - Low Volume Trap"
            is_lunch_trap = True
        elif 13.5 <= time_dec < 16.0:
            active_kz = "New York PM Killzone (13:30 - 16:00 NY)"
            is_high_probability = True
            if 14.0 <= time_dec < 15.0:
                is_sb = True
                sb_name = "New York PM Silver Bullet (14:00 - 15:00 NY)"
        elif time_dec >= 20.0 or time_dec < 0.0:
            active_kz = "Asian Session (20:00 - 00:00 NY)"
            is_high_probability = True
        elif 5.0 <= time_dec < 8.5:
            active_kz = "Pre-NY / London Lunch Session"

        next_events = [
            (2.0, "London Killzone (02:00 NY)"),
            (3.0, "London Silver Bullet (03:00 NY)"),
            (8.5, "NY AM Killzone (08:30 NY)"),
            (10.0, "NY AM Silver Bullet (10:00 NY)"),
            (13.5, "NY PM Killzone (13:30 NY)"),
            (14.0, "NY PM Silver Bullet (14:00 NY)"),
            (20.0, "Asian Session (20:00 NY)"),
        ]
        next_event_name = "London Killzone (02:00 NY)"
        minutes_to_next = 0
        for ev_time, ev_title in next_events:
            if ev_time > time_dec:
                next_event_name = ev_title
                minutes_to_next = int((ev_time - time_dec) * 60)
                break
        else:
            minutes_to_next = int((24.0 - time_dec + 2.0) * 60)
            next_event_name = "London Killzone (02:00 NY Tomorrow)"

        return {
            "ny_time_str": ny_dt.strftime("%H:%M:%S NY"),
            "ny_date_str": ny_dt.strftime("%Y-%m-%d"),
            "active_killzone": active_kz,
            "is_silver_bullet": is_sb,
            "silver_bullet_name": sb_name,
            "is_high_probability_time": is_high_probability,
            "is_lunch_trap": is_lunch_trap,
            "next_event": next_event_name,
            "minutes_to_next_event": minutes_to_next
        }

    @staticmethod
    def identify_swings(candles: List[Dict[str, float]], window: int = 2) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        swing_highs = []
        swing_lows = []
        n = len(candles)

        for i in range(window, n - window):
            curr_high = candles[i]['high']
            curr_low = candles[i]['low']

            if all(candles[i - j]['high'] < curr_high and candles[i + j]['high'] <= curr_high for j in range(1, window + 1)):
                swing_highs.append({"index": i, "time": candles[i]['time'], "price": curr_high, "type": "SWING_HIGH", "swept": False})

            if all(candles[i - j]['low'] > curr_low and candles[i + j]['low'] >= curr_low for j in range(1, window + 1)):
                swing_lows.append({"index": i, "time": candles[i]['time'], "price": curr_low, "type": "SWING_LOW", "swept": False})

        return swing_highs, swing_lows

    @staticmethod
    def detect_fvgs(candles: List[Dict[str, float]], min_gap_ticks: float = 1.0, tick_size: float = 0.25) -> List[Dict[str, Any]]:
        fvgs = []
        n = len(candles)
        if n < 3:
            return fvgs

        for i in range(2, n):
            c1 = candles[i - 2]
            c2 = candles[i - 1]
            c3 = candles[i]

            if c3['low'] > c1['high']:
                gap_size = c3['low'] - c1['high']
                if gap_size >= (min_gap_ticks * tick_size):
                    top = c3['low']
                    bottom = c1['high']
                    midpoint = (top + bottom) / 2.0
                    mitigated = any(candles[k]['low'] <= top for k in range(i + 1, n))
                    inverted = any(candles[k]['close'] < bottom for k in range(i + 1, n))

                    fvgs.append({
                        "type": "BULLISH_FVG",
                        "top": top,
                        "bottom": bottom,
                        "consequent_encroachment": midpoint,
                        "gap_size": round(gap_size, 4),
                        "candle_index": i - 1,
                        "time": c2['time'],
                        "mitigated": mitigated,
                        "inverted": inverted,
                        "status": "UNMITIGATED" if not mitigated else "MITIGATED"
                    })

            elif c3['high'] < c1['low']:
                gap_size = c1['low'] - c3['high']
                if gap_size >= (min_gap_ticks * tick_size):
                    top = c1['low']
                    bottom = c3['high']
                    midpoint = (top + bottom) / 2.0
                    mitigated = any(candles[k]['high'] >= bottom for k in range(i + 1, n))
                    inverted = any(candles[k]['close'] > top for k in range(i + 1, n))

                    fvgs.append({
                        "type": "BEARISH_FVG",
                        "top": top,
                        "bottom": bottom,
                        "consequent_encroachment": midpoint,
                        "gap_size": round(gap_size, 4),
                        "candle_index": i - 1,
                        "time": c2['time'],
                        "mitigated": mitigated,
                        "inverted": inverted,
                        "status": "UNMITIGATED" if not mitigated else "MITIGATED"
                    })

        return fvgs

    @classmethod
    def detect_mss(cls, candles: List[Dict[str, float]], swing_highs: List[Dict[str, Any]], swing_lows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        mss_events = []
        n = len(candles)
        if n < 5:
            return mss_events

        body_sizes = [abs(c['close'] - c['open']) for c in candles[-50:]]
        avg_body = sum(body_sizes) / max(len(body_sizes), 1)

        for sh in swing_highs:
            sh_idx = sh['index']
            sh_price = sh['price']
            for i in range(sh_idx + 1, n):
                c = candles[i]
                if c['close'] > sh_price:
                    body = abs(c['close'] - c['open'])
                    total_range = c['high'] - c['low']
                    body_ratio = body / total_range if total_range > 0 else 0
                    displacement_score = round(min((body / max(avg_body, 0.0001)) * 50 + (body_ratio * 50), 100), 1)

                    sh['swept'] = True
                    mss_events.append({
                        "type": "BULLISH_MSS",
                        "broken_level": sh_price,
                        "break_time": c['time'],
                        "break_index": i,
                        "displacement_score": displacement_score,
                        "is_strong_displacement": displacement_score >= 50
                    })
                    break

        for sl in swing_lows:
            sl_idx = sl['index']
            sl_price = sl['price']
            for i in range(sl_idx + 1, n):
                c = candles[i]
                if c['close'] < sl_price:
                    body = abs(c['close'] - c['open'])
                    total_range = c['high'] - c['low']
                    body_ratio = body / total_range if total_range > 0 else 0
                    displacement_score = round(min((body / max(avg_body, 0.0001)) * 50 + (body_ratio * 50), 100), 1)

                    sl['swept'] = True
                    mss_events.append({
                        "type": "BEARISH_MSS",
                        "broken_level": sl_price,
                        "break_time": c['time'],
                        "break_index": i,
                        "displacement_score": displacement_score,
                        "is_strong_displacement": displacement_score >= 50
                    })
                    break

        return mss_events

    @classmethod
    def detect_liquidity_sweeps(cls, candles: List[Dict[str, float]], swing_highs: List[Dict[str, Any]], swing_lows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        sweeps = []
        n = len(candles)

        for sh in swing_highs:
            sh_idx = sh['index']
            sh_price = sh['price']
            for i in range(sh_idx + 1, min(sh_idx + 50, n)):
                c = candles[i]
                if c['high'] > sh_price and c['close'] <= sh_price:
                    sweeps.append({
                        "type": "BSL_SWEEP",
                        "level": sh_price,
                        "candle_index": i,
                        "time": c['time']
                    })
                    break

        for sl in swing_lows:
            sl_idx = sl['index']
            sl_price = sl['price']
            for i in range(sl_idx + 1, min(sl_idx + 50, n)):
                c = candles[i]
                if c['low'] < sl_price and c['close'] >= sl_price:
                    sweeps.append({
                        "type": "SSL_SWEEP",
                        "level": sl_price,
                        "candle_index": i,
                        "time": c['time']
                    })
                    break

        return sweeps

    @staticmethod
    def detect_order_blocks(candles: List[Dict[str, float]], mss_events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        order_blocks = []
        for mss in mss_events:
            idx = mss['break_index']
            if mss['type'] == "BULLISH_MSS":
                start_search = max(0, idx - 6)
                lowest_candle = None
                lowest_idx = -1
                for j in range(start_search, idx):
                    c = candles[j]
                    if c['close'] <= c['open']:
                        if lowest_candle is None or c['low'] < lowest_candle['low']:
                            lowest_candle = c
                            lowest_idx = j
                if lowest_candle:
                    order_blocks.append({
                        "type": "BULLISH_ORDER_BLOCK",
                        "top": max(lowest_candle['open'], lowest_candle['close']),
                        "bottom": lowest_candle['low'],
                        "mean_threshold": round((lowest_candle['open'] + lowest_candle['low']) / 2.0, 2),
                        "candle_index": lowest_idx,
                        "time": lowest_candle['time']
                    })
            elif mss['type'] == "BEARISH_MSS":
                start_search = max(0, idx - 6)
                highest_candle = None
                highest_idx = -1
                for j in range(start_search, idx):
                    c = candles[j]
                    if c['close'] >= c['open']:
                        if highest_candle is None or c['high'] > highest_candle['high']:
                            highest_candle = c
                            highest_idx = j
                if highest_candle:
                    order_blocks.append({
                        "type": "BEARISH_ORDER_BLOCK",
                        "top": highest_candle['high'],
                        "bottom": min(highest_candle['open'], highest_candle['close']),
                        "mean_threshold": round((highest_candle['open'] + highest_candle['high']) / 2.0, 2),
                        "candle_index": highest_idx,
                        "time": highest_candle['time']
                    })

        return order_blocks

    @staticmethod
    def calculate_ote(low_price: float, high_price: float, direction: str) -> Dict[str, float]:
        price_range = max(high_price - low_price, 0.01)
        if direction.upper() == "BULLISH":
            return {
                "direction": "BULLISH",
                "equilibrium_50": round(high_price - 0.50 * price_range, 2),
                "ote_62": round(high_price - 0.62 * price_range, 2),
                "ote_705": round(high_price - 0.705 * price_range, 2),
                "ote_79": round(high_price - 0.79 * price_range, 2),
                "range_high": round(high_price, 2),
                "range_low": round(low_price, 2)
            }
        else:
            return {
                "direction": "BEARISH",
                "equilibrium_50": round(low_price + 0.50 * price_range, 2),
                "ote_62": round(low_price + 0.62 * price_range, 2),
                "ote_705": round(low_price + 0.705 * price_range, 2),
                "ote_79": round(low_price + 0.79 * price_range, 2),
                "range_high": round(high_price, 2),
                "range_low": round(low_price, 2)
            }

    @classmethod
    def analyze_symbol(cls, symbol_key: str, candles: List[Dict[str, float]], timeframe: str = "5m") -> Dict[str, Any]:
        if not candles or len(candles) < 10:
            return {"error": "Insufficient candle data", "symbol": symbol_key}

        n = len(candles)
        latest_candle = candles[-1]
        current_price = latest_candle['close']
        time_info = cls.get_killzone_status(latest_candle.get('time'))

        swing_highs, swing_lows = cls.identify_swings(candles, window=2)
        fvgs = cls.detect_fvgs(candles)
        mss_events = cls.detect_mss(candles, swing_highs, swing_lows)
        sweeps = cls.detect_liquidity_sweeps(candles, swing_highs, swing_lows)
        order_blocks = cls.detect_order_blocks(candles, mss_events)

        recent_sweeps = [s for s in sweeps if s['candle_index'] >= n - 15]
        recent_mss = [m for m in mss_events if m['break_index'] >= n - 15]
        recent_fvgs = [f for f in fvgs if f['candle_index'] >= n - 15 and not f['mitigated']]

        recent_ssl_sweep = any(s['type'] == "SSL_SWEEP" for s in recent_sweeps)
        recent_bsl_sweep = any(s['type'] == "BSL_SWEEP" for s in recent_sweeps)
        recent_bull_mss = any(m['type'] == "BULLISH_MSS" for m in recent_mss)
        recent_bear_mss = any(m['type'] == "BEARISH_MSS" for m in recent_mss)
        
        recent_bull_fvg = [f for f in recent_fvgs if f['type'] == "BULLISH_FVG"]
        recent_bear_fvg = [f for f in recent_fvgs if f['type'] == "BEARISH_FVG"]

        # Component Checklist
        checklist = []
        raw_score = 0

        has_sweep = recent_ssl_sweep or recent_bsl_sweep
        checklist.append({"item": "Fresh Liquidity Sweep (BSL/SSL)", "passed": has_sweep, "weight": 30})
        if has_sweep: raw_score += 30

        has_mss = recent_bull_mss or recent_bear_mss
        checklist.append({"item": "Confirmed MSS Displacement", "passed": has_mss, "weight": 30})
        if has_mss: raw_score += 30

        has_fvg = bool(recent_bull_fvg or recent_bear_fvg)
        checklist.append({"item": "Fresh Unmitigated FVG", "passed": has_fvg, "weight": 25})
        if has_fvg: raw_score += 25

        has_time = time_info['is_high_probability_time']
        checklist.append({"item": "Killzone / Session Timing", "passed": has_time, "weight": 15})
        if has_time: raw_score += 15

        confluence_score = min(raw_score, 100)

        # Potential Setup Evaluation
        is_bull_candidate = (recent_ssl_sweep and recent_bull_mss and bool(recent_bull_fvg))
        is_bear_candidate = (recent_bsl_sweep and recent_bear_mss and bool(recent_bear_fvg))

        direction = "NEUTRAL"
        is_active_trade = False
        entry_price = None
        stop_loss = None
        take_profit = None
        rr_ratio = 0.0

        # SETUP GRADING
        setup_grade = "F"
        grade_badge = "GRADE_F"
        grade_desc = "No Active Setup"

        if is_bull_candidate:
            fvg = recent_bull_fvg[-1]
            temp_entry = round(fvg['top'], 2)
            temp_sl = round(fvg['bottom'] - (2.0 if symbol_key in ['MNQ', 'MES'] else 0.8), 2)
            risk = max(abs(temp_entry - temp_sl), 0.5)

            valid_bsl = [sh['price'] for sh in swing_highs if (sh['price'] - temp_entry) >= (2.0 * risk)]
            if valid_bsl:
                target_bsl = round(valid_bsl[0], 2)
            else:
                session_high = max([c['high'] for c in candles[-60:]])
                if (session_high - temp_entry) >= (2.0 * risk):
                    target_bsl = round(session_high, 2)
                else:
                    target_bsl = round(temp_entry + (2.5 * risk), 2)

            reward = target_bsl - temp_entry
            rr_ratio = round(reward / risk, 2)

            if rr_ratio >= 1.8:
                direction = "BULLISH"
                is_active_trade = True
                entry_price = temp_entry
                stop_loss = temp_sl
                take_profit = target_bsl

                if time_info['is_silver_bullet']:
                    setup_grade = "A+"
                    grade_badge = "GRADE_A_PLUS"
                    grade_desc = "A+ Setup: Silver Bullet Macro Window + Sweep + MSS + FVG"
                    setup_type = "ICT Silver Bullet Model (Bullish Buy Limit)"
                elif time_info['is_high_probability_time']:
                    setup_grade = "A"
                    grade_badge = "GRADE_A"
                    grade_desc = "A Setup: Prime Killzone Session + Full Confluence"
                    setup_type = "ICT 2022 Mentorship Model (Bullish Buy Limit)"
                else:
                    setup_grade = "B"
                    grade_badge = "GRADE_B"
                    grade_desc = "B Setup: Valid Technical Structure Outside Prime Killzone"
                    setup_type = "ICT Bullish Sweep + FVG Retest (Off-Session)"
            else:
                setup_grade = "F"
                grade_badge = "GRADE_F"
                grade_desc = "F Grade: Target Too Close (R:R < 1:2)"
                setup_type = f"Target Too Close (R:R 1:{rr_ratio} < 1:2) - Trade Invalidated"

        elif is_bear_candidate:
            fvg = recent_bear_fvg[-1]
            temp_entry = round(fvg['bottom'], 2)
            temp_sl = round(fvg['top'] + (2.0 if symbol_key in ['MNQ', 'MES'] else 0.8), 2)
            risk = max(abs(temp_sl - temp_entry), 0.5)

            valid_ssl = [sl['price'] for sl in swing_lows if (temp_entry - sl['price']) >= (2.0 * risk)]
            if valid_ssl:
                target_ssl = round(valid_ssl[0], 2)
            else:
                session_low = min([c['low'] for c in candles[-60:]])
                if (temp_entry - session_low) >= (2.0 * risk):
                    target_ssl = round(session_low, 2)
                else:
                    target_ssl = round(temp_entry - (2.5 * risk), 2)

            reward = temp_entry - target_ssl
            rr_ratio = round(reward / risk, 2)

            if rr_ratio >= 1.8:
                direction = "BEARISH"
                is_active_trade = True
                entry_price = temp_entry
                stop_loss = temp_sl
                take_profit = target_ssl

                if time_info['is_silver_bullet']:
                    setup_grade = "A+"
                    grade_badge = "GRADE_A_PLUS"
                    grade_desc = "A+ Setup: Silver Bullet Macro Window + Sweep + MSS + FVG"
                    setup_type = "ICT Silver Bullet Model (Bearish Sell Limit)"
                elif time_info['is_high_probability_time']:
                    setup_grade = "A"
                    grade_badge = "GRADE_A"
                    grade_desc = "A Setup: Prime Killzone Session + Full Confluence"
                    setup_type = "ICT 2022 Mentorship Model (Bearish Sell Limit)"
                else:
                    setup_grade = "B"
                    grade_badge = "GRADE_B"
                    grade_desc = "B Setup: Valid Technical Structure Outside Prime Killzone"
                    setup_type = "ICT Bearish Sweep + FVG Retest (Off-Session)"
            else:
                setup_grade = "F"
                grade_badge = "GRADE_F"
                grade_desc = "F Grade: Target Too Close (R:R < 1:2)"
                setup_type = f"Target Too Close (R:R 1:{rr_ratio} < 1:2) - Trade Invalidated"

        else:
            # Check if forming setup deserves a B grade (e.g. 2 key structural pieces formed)
            if (has_sweep and has_mss) or (has_sweep and has_fvg):
                setup_grade = "B"
                grade_badge = "GRADE_B"
                grade_desc = "B Potential: Structure Forming (Awaiting Remaining Trigger)"
                setup_type = f"Setup Forming ({confluence_score}% Confluence Criteria Met)"
            else:
                setup_grade = "F"
                grade_badge = "GRADE_F"
                grade_desc = "F Grade: No Valid Setup (Prerequisites Missing)"
                setup_type = f"Observing Order Flow ({confluence_score}% Confluence Criteria Met)"

        recent_high = max([c['high'] for c in candles[-25:]])
        recent_low = min([c['low'] for c in candles[-25:]])
        ote_data = cls.calculate_ote(recent_low, recent_high, direction if direction != "NEUTRAL" else "BULLISH")

        return {
            "symbol": symbol_key,
            "timeframe": timeframe,
            "current_price": round(current_price, 2),
            "price_change_24h": round(latest_candle['close'] - candles[0]['open'], 2),
            "price_change_pct": round(((latest_candle['close'] - candles[0]['open']) / candles[0]['open']) * 100, 2),
            "killzone_info": time_info,
            "direction": direction,
            "is_active_trade": is_active_trade,
            "setup_grade": setup_grade,
            "grade_badge": grade_badge,
            "grade_desc": grade_desc,
            "confluence_score": confluence_score,
            "setup_type": setup_type,
            "checklist": checklist,
            "trade_plan": {
                "is_active": is_active_trade,
                "direction": direction,
                "entry": entry_price,
                "stop_loss": stop_loss,
                "take_profit": take_profit,
                "risk_points": round(abs(entry_price - stop_loss), 2) if (entry_price and stop_loss) else None,
                "reward_points": round(abs(take_profit - entry_price), 2) if (take_profit and entry_price) else None,
                "rr_ratio": f"1:{rr_ratio}" if is_active_trade else "--"
            },
            "ote_zone": ote_data,
            "active_fvgs_count": len(recent_bull_fvg) + len(recent_bear_fvg),
            "recent_mss_count": len(recent_mss),
            "recent_sweeps_count": len(recent_sweeps),
            "detected_fvgs": fvgs[-12:],
            "detected_mss": mss_events[-8:],
            "detected_sweeps": sweeps[-8:],
            "detected_order_blocks": order_blocks[-8:],
            "swing_highs": swing_highs[-10:],
            "swing_lows": swing_lows[-10:]
        }

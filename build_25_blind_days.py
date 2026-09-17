import subprocess
import json
import os
import glob
from datetime import datetime, timezone

SCENARIO_CONFIGS = [
    # 2023
    {"day": 1,  "year": 2023, "from": "2023-03-14", "to": "2023-03-16", "day_of": "2023-03-15", "type": "event"},
    {"day": 2,  "year": 2023, "from": "2023-05-17", "to": "2023-05-19", "day_of": "2023-05-18", "type": "normal"},
    {"day": 3,  "year": 2023, "from": "2023-06-13", "to": "2023-06-15", "day_of": "2023-06-14", "type": "event"},
    {"day": 4,  "year": 2023, "from": "2023-07-19", "to": "2023-07-21", "day_of": "2023-07-20", "type": "normal"},
    {"day": 5,  "year": 2023, "from": "2023-08-23", "to": "2023-08-25", "day_of": "2023-08-24", "type": "normal"},
    {"day": 6,  "year": 2023, "from": "2023-11-01", "to": "2023-11-03", "day_of": "2023-11-02", "type": "event"},
    # 2024
    {"day": 7,  "year": 2024, "from": "2024-01-10", "to": "2024-01-12", "day_of": "2024-01-11", "type": "event"},
    {"day": 8,  "year": 2024, "from": "2024-02-14", "to": "2024-02-16", "day_of": "2024-02-15", "type": "normal"},
    {"day": 9,  "year": 2024, "from": "2024-03-07", "to": "2024-03-09", "day_of": "2024-03-08", "type": "event"},
    {"day": 10, "year": 2024, "from": "2024-04-11", "to": "2024-04-13", "day_of": "2024-04-12", "type": "normal"},
    {"day": 11, "year": 2024, "from": "2024-05-14", "to": "2024-05-16", "day_of": "2024-05-15", "type": "event"},
    {"day": 12, "year": 2024, "from": "2024-06-11", "to": "2024-06-13", "day_of": "2024-06-12", "type": "event"},
    {"day": 13, "year": 2024, "from": "2024-07-10", "to": "2024-07-12", "day_of": "2024-07-11", "type": "normal"},
    {"day": 14, "year": 2024, "from": "2024-08-01", "to": "2024-08-03", "day_of": "2024-08-02", "type": "event"},
    {"day": 15, "year": 2024, "from": "2024-08-21", "to": "2024-08-23", "day_of": "2024-08-22", "type": "normal"},
    {"day": 16, "year": 2024, "from": "2024-09-17", "to": "2024-09-19", "day_of": "2024-09-18", "type": "event"},
    {"day": 17, "year": 2024, "from": "2024-10-16", "to": "2024-10-18", "day_of": "2024-10-17", "type": "normal"},
    {"day": 18, "year": 2024, "from": "2024-11-05", "to": "2024-11-07", "day_of": "2024-11-06", "type": "normal"},
    {"day": 19, "year": 2024, "from": "2024-12-11", "to": "2024-12-13", "day_of": "2024-12-12", "type": "normal"},
    # 2025
    {"day": 20, "year": 2025, "from": "2025-01-14", "to": "2025-01-16", "day_of": "2025-01-15", "type": "normal"},
    {"day": 21, "year": 2025, "from": "2025-02-12", "to": "2025-02-14", "day_of": "2025-02-13", "type": "normal"},
    {"day": 22, "year": 2025, "from": "2025-03-11", "to": "2025-03-13", "day_of": "2025-03-12", "type": "event"},
    {"day": 23, "year": 2025, "from": "2025-04-15", "to": "2025-04-17", "day_of": "2025-04-16", "type": "normal"},
    {"day": 24, "year": 2025, "from": "2025-05-07", "to": "2025-05-09", "day_of": "2025-05-08", "type": "normal"},
    # 2026
    {"day": 25, "year": 2026, "from": "2026-09-01", "to": "2026-09-03", "day_of": "2026-09-02", "type": "normal"}
]

os.makedirs("download", exist_ok=True)

def parse_candles(filepath):
    if not filepath or not os.path.exists(filepath):
        return []
    with open(filepath, 'r') as f:
        data = json.load(f)
    cleaned = []
    seen = set()
    for c in data:
        t_sec = int(c['timestamp'] // 1000)
        if t_sec not in seen:
            seen.add(t_sec)
            cleaned.append({
                "time": t_sec,
                "open": round(c['open'], 2),
                "high": round(c['high'], 2),
                "low": round(c['low'], 2),
                "close": round(c['close'], 2),
                "volume": 120
            })
    cleaned.sort(key=lambda x: x['time'])
    return cleaned

scenarios = []

for cfg in SCENARIO_CONFIGS:
    sit_num = cfg['day']
    sit_str = f"Situation {sit_num:02d}"
    sit_id = f"situation-{sit_num:02d}"

    nq_file = f"download/usatechidxusd-m1-bid-{cfg['from']}-{cfg['to']}.json"
    es_file = f"download/usa500idxusd-m1-bid-{cfg['from']}-{cfg['to']}.json"

    nq_candles = parse_candles(nq_file)
    es_candles = parse_candles(es_file)

    if not nq_candles:
        print(f"WARNING: Missing data for {sit_str} ({nq_file})")
        continue

    day_of_str = cfg['day_of']
    day_of_start_utc = int(datetime.strptime(day_of_str, "%Y-%m-%d").replace(tzinfo=timezone.utc).timestamp())
    
    prev_candles = [c for c in nq_candles if c['time'] < day_of_start_utc]
    curr_candles = [c for c in nq_candles if c['time'] >= day_of_start_utc]

    if prev_candles:
        pdh = round(max(c['high'] for c in prev_candles), 2)
        pdl = round(min(c['low'] for c in prev_candles), 2)
    else:
        half = max(1, len(nq_candles)//2)
        pdh = round(max(c['high'] for c in nq_candles[:half]), 2)
        pdl = round(min(c['low'] for c in nq_candles[:half]), 2)

    # Initial playback index at ~09:15 AM NY (13:15 UTC / 14:15 UTC)
    target_time = day_of_start_utc + 13 * 3600 + 15 * 60
    initial_idx = -1
    for i, c in enumerate(nq_candles):
        if c['time'] >= target_time:
            initial_idx = i
            break
    if initial_idx == -1:
        initial_idx = max(30, int(len(nq_candles) * 0.72))

    scenario = {
        "id": sit_id,
        "situationNumber": sit_num,
        "name": sit_str,
        "symbol": "MNQ",
        "category": "Blind Market Replay",
        "difficulty": "Standard Session",
        "description": "Authentic 2-day contiguous market dataset. Trade the NY session purely based on market structure, liquidity raids, and ICT delivery. Previous day high/low (PDH/PDL) and overnight Asia/London sessions are fully viewable on the chart.",
        "learningGoals": [
            "Pan back to mark Previous Day High (PDH) and Previous Day Low (PDL)",
            "Identify Asia & London liquidity sweeps before the 09:30 AM NY Open",
            "Execute ICT Silver Bullet, Fair Value Gap (FVG), or Equilibrium setups without hindsight bias"
        ],
        "playbook": {
            "bias": "Blind Replay — Evaluate Structure Dynamically",
            "midnightBias": "Reference 00:00 Midnight Open for institutional order flow",
            "entryWindow": "09:30 - 11:00 AM NY Session",
            "expectedSetup": "FVG Retest, Liquidity Sweep, or SMT Divergence",
            "invalidation": "Opposing structural swing high/low",
            "target": "Opposing Internal or External Liquidity"
        },
        "pdh": pdh,
        "pdl": pdl,
        "initialPlaybackIndex": initial_idx,
        "raw1m": nq_candles,
        "assets": {
            "MNQ": nq_candles,
            "MES": es_candles if es_candles else nq_candles
        }
    }
    scenarios.append(scenario)
    print(f"Built {sit_str}: {len(nq_candles)} NQ bars ({len(prev_candles)} prev, {len(curr_candles)} curr), initialIdx={initial_idx}, PDH={pdh}, PDL={pdl}")

print(f"\nSuccessfully built {len(scenarios)} situations!")

js_content = f"""// PB Trades — 25 Authentic Blind Market Situations (2-Day Contiguous Datasets)
// Synchronized 1-Minute Replay Data for NQ (MNQ) and ES (MES) across 2023, 2024, 2025, 2026
// Generated: {datetime.now(timezone.utc).isoformat()}

window.REPLAY_SCENARIOS = {{
  scenarios: {json.dumps(scenarios)},

  getAll() {{
    return this.scenarios;
  }},

  getById(id) {{
    return this.scenarios.find(s => s.id === id) || this.scenarios[0];
  }},

  aggregate(candles, tf) {{
    if (!candles || candles.length === 0) return [];
    if (tf === '1m') return candles;

    let minutes = 5;
    if (tf === '15m') minutes = 15;
    else if (tf === '30m') minutes = 30;
    else if (tf === '1h') minutes = 60;
    else if (tf === '4h') minutes = 240;
    else if (tf === '1d') minutes = 1440;

    const intervalSec = minutes * 60;
    const aggregated = [];
    let currentBar = null;

    for (let i = 0; i < candles.length; i++) {{
      const c = candles[i];
      const bucketTime = Math.floor(c.time / intervalSec) * intervalSec;

      if (!currentBar || currentBar.time !== bucketTime) {{
        if (currentBar) aggregated.push(currentBar);
        currentBar = {{
          time: bucketTime,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume || 0
        }};
      }} else {{
        if (c.high > currentBar.high) currentBar.high = c.high;
        if (c.low < currentBar.low) currentBar.low = c.low;
        currentBar.close = c.close;
        currentBar.volume = (currentBar.volume || 0) + (c.volume || 0);
      }}
    }}
    if (currentBar) aggregated.push(currentBar);
    return aggregated;
  }}
}};
"""

output_path = "replay_scenarios_data.js"
with open(output_path, "w") as f:
    f.write(js_content)

print(f"Saved {len(scenarios)} situations to {output_path} ({os.path.getsize(output_path) / (1024*1024):.2f} MB)")

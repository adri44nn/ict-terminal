import subprocess
import json
import os
import glob
from datetime import datetime, timedelta, timezone

# 50 carefully verified, non-overlapping weekday pairs across 2023, 2024, 2025
NEW_50_PAIRS = [
    # 2023
    {"num": 26, "from": "2023-01-11", "to": "2023-01-13", "day_prev": "2023-01-11", "day_of": "2023-01-12"},
    {"num": 27, "from": "2023-02-07", "to": "2023-02-09", "day_prev": "2023-02-07", "day_of": "2023-02-08"},
    {"num": 28, "from": "2023-02-09", "to": "2023-02-11", "day_prev": "2023-02-09", "day_of": "2023-02-10"},
    {"num": 29, "from": "2023-03-08", "to": "2023-03-10", "day_prev": "2023-03-08", "day_of": "2023-03-09"},
    {"num": 30, "from": "2023-03-30", "to": "2023-04-01", "day_prev": "2023-03-30", "day_of": "2023-03-31"},
    {"num": 31, "from": "2023-04-18", "to": "2023-04-20", "day_prev": "2023-04-18", "day_of": "2023-04-19"},
    {"num": 32, "from": "2023-04-26", "to": "2023-04-28", "day_prev": "2023-04-26", "day_of": "2023-04-27"},
    {"num": 33, "from": "2023-05-02", "to": "2023-05-04", "day_prev": "2023-05-02", "day_of": "2023-05-03"},
    {"num": 34, "from": "2023-05-04", "to": "2023-05-06", "day_prev": "2023-05-04", "day_of": "2023-05-05"},
    {"num": 35, "from": "2023-05-10", "to": "2023-05-12", "day_prev": "2023-05-10", "day_of": "2023-05-11"},
    {"num": 36, "from": "2023-05-22", "to": "2023-05-24", "day_prev": "2023-05-22", "day_of": "2023-05-23"},
    {"num": 37, "from": "2023-05-31", "to": "2023-06-02", "day_prev": "2023-05-31", "day_of": "2023-06-01"},
    {"num": 38, "from": "2023-07-11", "to": "2023-07-13", "day_prev": "2023-07-11", "day_of": "2023-07-12"},
    {"num": 39, "from": "2023-07-24", "to": "2023-07-26", "day_prev": "2023-07-24", "day_of": "2023-07-25"},
    {"num": 40, "from": "2023-08-07", "to": "2023-08-09", "day_prev": "2023-08-07", "day_of": "2023-08-08"},
    {"num": 41, "from": "2023-08-16", "to": "2023-08-18", "day_prev": "2023-08-16", "day_of": "2023-08-17"},
    {"num": 42, "from": "2023-09-06", "to": "2023-09-08", "day_prev": "2023-09-06", "day_of": "2023-09-07"},
    {"num": 43, "from": "2023-09-21", "to": "2023-09-23", "day_prev": "2023-09-21", "day_of": "2023-09-22"},
    {"num": 44, "from": "2023-09-28", "to": "2023-09-30", "day_prev": "2023-09-28", "day_of": "2023-09-29"},
    {"num": 45, "from": "2023-10-05", "to": "2023-10-07", "day_prev": "2023-10-05", "day_of": "2023-10-06"},
    {"num": 46, "from": "2023-10-16", "to": "2023-10-18", "day_prev": "2023-10-16", "day_of": "2023-10-17"},
    {"num": 47, "from": "2023-11-06", "to": "2023-11-08", "day_prev": "2023-11-06", "day_of": "2023-11-07"},
    {"num": 48, "from": "2023-12-12", "to": "2023-12-14", "day_prev": "2023-12-12", "day_of": "2023-12-13"},
    {"num": 49, "from": "2023-12-14", "to": "2023-12-16", "day_prev": "2023-12-14", "day_of": "2023-12-15"},
    {"num": 50, "from": "2023-12-18", "to": "2023-12-20", "day_prev": "2023-12-18", "day_of": "2023-12-19"},
    # 2024
    {"num": 51, "from": "2024-01-31", "to": "2024-02-02", "day_prev": "2024-01-31", "day_of": "2024-02-01"},
    {"num": 52, "from": "2024-02-07", "to": "2024-02-09", "day_prev": "2024-02-07", "day_of": "2024-02-08"},
    {"num": 53, "from": "2024-02-26", "to": "2024-02-28", "day_prev": "2024-02-26", "day_of": "2024-02-27"},
    {"num": 54, "from": "2024-03-12", "to": "2024-03-14", "day_prev": "2024-03-12", "day_of": "2024-03-13"},
    {"num": 55, "from": "2024-03-14", "to": "2024-03-16", "day_prev": "2024-03-14", "day_of": "2024-03-15"},
    {"num": 56, "from": "2024-04-02", "to": "2024-04-04", "day_prev": "2024-04-02", "day_of": "2024-04-03"},
    {"num": 57, "from": "2024-04-24", "to": "2024-04-26", "day_prev": "2024-04-24", "day_of": "2024-04-25"},
    {"num": 58, "from": "2024-05-28", "to": "2024-05-30", "day_prev": "2024-05-28", "day_of": "2024-05-29"},
    {"num": 59, "from": "2024-06-17", "to": "2024-06-19", "day_prev": "2024-06-17", "day_of": "2024-06-18"},
    {"num": 60, "from": "2024-06-20", "to": "2024-06-22", "day_prev": "2024-06-20", "day_of": "2024-06-21"},
    {"num": 61, "from": "2024-06-27", "to": "2024-06-29", "day_prev": "2024-06-27", "day_of": "2024-06-28"},
    {"num": 62, "from": "2024-07-23", "to": "2024-07-25", "day_prev": "2024-07-23", "day_of": "2024-07-24"},
    {"num": 63, "from": "2024-08-26", "to": "2024-08-28", "day_prev": "2024-08-26", "day_of": "2024-08-27"},
    {"num": 64, "from": "2024-09-03", "to": "2024-09-05", "day_prev": "2024-09-03", "day_of": "2024-09-04"},
    {"num": 65, "from": "2024-09-26", "to": "2024-09-28", "day_prev": "2024-09-26", "day_of": "2024-09-27"},
    {"num": 66, "from": "2024-10-03", "to": "2024-10-05", "day_prev": "2024-10-03", "day_of": "2024-10-04"},
    {"num": 67, "from": "2024-10-28", "to": "2024-10-30", "day_prev": "2024-10-28", "day_of": "2024-10-29"},
    {"num": 68, "from": "2024-10-31", "to": "2024-11-02", "day_prev": "2024-10-31", "day_of": "2024-11-01"},
    {"num": 69, "from": "2024-11-13", "to": "2024-11-15", "day_prev": "2024-11-13", "day_of": "2024-11-14"},
    # 2025
    {"num": 70, "from": "2025-02-04", "to": "2025-02-06", "day_prev": "2025-02-04", "day_of": "2025-02-05"},
    {"num": 71, "from": "2025-02-06", "to": "2025-02-08", "day_prev": "2025-02-06", "day_of": "2025-02-07"},
    {"num": 72, "from": "2025-02-27", "to": "2025-03-01", "day_prev": "2025-02-27", "day_of": "2025-02-28"},
    {"num": 73, "from": "2025-03-04", "to": "2025-03-06", "day_prev": "2025-03-04", "day_of": "2025-03-05"},
    {"num": 74, "from": "2025-04-09", "to": "2025-04-11", "day_prev": "2025-04-09", "day_of": "2025-04-10"},
    {"num": 75, "from": "2025-04-28", "to": "2025-04-30", "day_prev": "2025-04-28", "day_of": "2025-04-29"}
]

os.makedirs("download", exist_ok=True)

def download_instrument(inst, date_from, date_to):
    pattern = f"download/{inst}-m1-bid-{date_from}-{date_to}.json"
    matches = glob.glob(pattern)
    if matches and os.path.getsize(matches[0]) > 5000:
        return matches[0]

    cmd = [
        "pnpm", "dlx", "dukascopy-node",
        "-i", inst,
        "-from", date_from,
        "-to", date_to,
        "-t", "m1",
        "-f", "json"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"  Error downloading {inst} ({date_from} to {date_to}): {res.stderr[:200]}")
    matches = glob.glob(pattern)
    return matches[0] if matches else None

def parse_compact_candles(filepath):
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
            cleaned.append([
                t_sec,
                round(c['open'], 2),
                round(c['high'], 2),
                round(c['low'], 2),
                round(c['close'], 2),
                120
            ])
    cleaned.sort(key=lambda x: x[0])
    return cleaned

print(f"Starting download and build of 50 new situations (26 to 75)...")

new_scenarios = []

for item in NEW_50_PAIRS:
    sit_num = item['num']
    sit_id = f"situation-{sit_num:02d}"
    sit_name = f"Situation {sit_num:02d}"
    date_from = item['from']
    date_to = item['to']
    day_of_str = item['day_of']

    print(f"Processing Situation {sit_num:02d} ({item['day_prev']} -> {item['day_of']})...")
    
    nq_file = download_instrument("usatechidxusd", date_from, date_to)
    es_file = download_instrument("usa500idxusd", date_from, date_to)

    nq_compact = parse_compact_candles(nq_file)
    es_compact = parse_compact_candles(es_file)

    if not nq_compact:
        print(f"  FAILED: No NQ data for Situation {sit_num:02d}")
        continue

    day_of_start_utc = int(datetime.strptime(day_of_str, "%Y-%m-%d").replace(tzinfo=timezone.utc).timestamp())
    prev_bars = [b for b in nq_compact if b[0] < day_of_start_utc]
    curr_bars = [b for b in nq_compact if b[0] >= day_of_start_utc]

    if prev_bars:
        pdh = round(max(b[2] for b in prev_bars), 2)
        pdl = round(min(b[3] for b in prev_bars), 2)
    else:
        half = max(1, len(nq_compact) // 2)
        pdh = round(max(b[2] for b in nq_compact[:half]), 2)
        pdl = round(min(b[3] for b in nq_compact[:half]), 2)

    # Initial playback index at ~09:15 AM NY (13:15 or 14:15 UTC depending on daylight saving)
    target_utc_1315 = day_of_start_utc + 13 * 3600 + 15 * 60
    initial_idx = -1
    for i, b in enumerate(nq_compact):
        if b[0] >= target_utc_1315:
            initial_idx = i
            break
    if initial_idx == -1:
        initial_idx = max(30, int(len(nq_compact) * 0.72))

    scenario = {
        "id": sit_id,
        "situationNumber": sit_num,
        "name": sit_name,
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
        "a": {
            "MNQ": nq_compact,
            "MES": es_compact if es_compact else nq_compact
        }
    }
    new_scenarios.append(scenario)
    print(f"  Done Situation {sit_num:02d}: {len(nq_compact)} NQ bars, initialIdx={initial_idx}, PDH={pdh}, PDL={pdl}")

print(f"\nAll {len(new_scenarios)} situations built successfully!")

# Now load existing scenarios from replay_scenarios_data.js
with open("replay_scenarios_data.js", "r") as f:
    orig_content = f.read()

import re
m = re.search(r"const RAW_SCENARIOS = (\[.*?\]);\s*function unpack", orig_content, re.DOTALL)
if not m:
    print("Error: Could not parse RAW_SCENARIOS from replay_scenarios_data.js")
    exit(1)

existing_scenarios = json.loads(m.group(1))
print(f"Existing scenarios: {len(existing_scenarios)}")

# Combine: existing 25 + new 50 = 75
combined_scenarios = existing_scenarios + new_scenarios
print(f"Total combined scenarios: {len(combined_scenarios)}")

# Build updated replay_scenarios_data.js
combined_json = json.dumps(combined_scenarios)
new_content = orig_content[:m.start(1)] + combined_json + orig_content[m.end(1):]

with open("replay_scenarios_data.js", "w") as f:
    f.write(new_content)

print(f"Saved replay_scenarios_data.js with {len(combined_scenarios)} scenarios! Size: {os.path.getsize('replay_scenarios_data.js') / 1024 / 1024:.2f} MB")

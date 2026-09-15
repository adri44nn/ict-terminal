window.PB_ACADEMY_DATA = {
  "author": "PB Trades (ICT for Dummies Series)",
  "systemTitle": "The PB Trades ICT Execution Model & Advanced Masterclass",
  "tagline": "A complete 12-module institutional playbook from algorithmic daily bias and SMT divergence to the ICC execution framework and prop-firm risk sizing.",
  "checklist": [
    {
      "id": "htf_bias",
      "step": 1,
      "title": "1. Daily Bias & The 3 Questions (EP10)",
      "desc": "Where did price deliver from (BSL/SSL)? Which PDAs are respected vs disrespected? What is the clear Draw on Liquidity?",
      "hint": "Formulate a falsifiable IF/THEN scenario. If the active PDA is cleanly breached, your bias is immediately invalidated."
    },
    {
      "id": "liquidity_map",
      "step": 2,
      "title": "2. Liquidity Architecture & Sweeps (EP7)",
      "desc": "Did price purge a prominent PDH/PDL, Asia/London session extreme, EQH/EQL, or Low-Resistance Liquidity (LRL)?",
      "hint": "A sweep is an institutional stop-run to collect fuel. Look for rejection rather than immediate chasing."
    },
    {
      "id": "premium_discount",
      "step": 3,
      "title": "3. Premium vs Discount Location Filter (EP8)",
      "desc": "Where is current price relative to 50% Equilibrium? Only buy in Discount (<50%) and sell in Premium (>50%).",
      "hint": "Entering in discount expands your Risk-to-Reward exponentially without changing your target."
    },
    {
      "id": "smt_divergence",
      "step": 4,
      "title": "4. Intermarket SMT Divergence (EP9)",
      "desc": "Did NQ and ES disagree at the key liquidity sweep or HTF PDA? Did one fail to confirm a new swing high or low?",
      "hint": "The asset that refuses to break structure is the stronger asset. Trade the stronger asset for longs, weaker for shorts."
    },
    {
      "id": "time_window",
      "step": 5,
      "title": "5. Killzone Alignment & Silver Bullet",
      "desc": "Is price currently inside a high-probability Killzone (London 2\u20135 AM, NY AM 8:30\u201311:00 AM, Silver Bullet 10:00\u201311:00 AM)?",
      "hint": "Strictly avoid trading during NY Lunch (12:00\u20131:00 PM NY) consolidation chop."
    },
    {
      "id": "displacement_mss",
      "step": 6,
      "title": "6. Indication (I): Displacement & MSS",
      "desc": "Did price violently reverse with strong energetic displacement candles, closing beyond the recent opposing swing point?",
      "hint": "Displacement MUST leave behind a clean, imbalance Fair Value Gap (FVG) to prove institutional sponsorship."
    },
    {
      "id": "fvg_entry_risk",
      "step": 7,
      "title": "7. Correction (C) & Micro Sizing (EP11)",
      "desc": "Is entry placed at the FVG retest / 50% Consequent Encroachment with Stop Loss safely behind structural invalidation?",
      "hint": "Size contract count to your exact dollar risk using micros: Contracts = Dollar Risk / (Stop Points \u00d7 $/pt)."
    }
  ],
  "modules": [
  {
    "id": "pb-module-1",
    "title": "1. What is ICT? (Market Maker Reality)",
    "badge": "Core Foundation",
    "readTime": "6 min read",
    "description": "Deconstructing why retail indicators fail and how the Interbank Price Delivery Algorithm (IPDA) mechanically delivers price from liquidity to imbalance.",
    "chartExample": {
      "scenarioId": "real-session-2026-08-26",
      "symbol": "MNQ",
      "tf": "5m",
      "title": "\ud83d\udcc8 Real Chart Markup: Algorithmic IPDA Delivery (2026-08-26 MNQ)",
      "subtitle": "Notice how price ignores retail support, sweeps Sell-Side Liquidity (29,133.00), and mechanically rebalances the Bullish FVG before expanding.",
      "sliceStart": 2080,
      "sliceEnd": 2245,
      "annotations": [
        {
          "type": "ray",
          "y": 29133.0,
          "color": "#ef4444",
          "label": "SSL Pool Purged (29,133.00)",
          "xPercent": 0.15
        },
        {
          "type": "box",
          "y1": 29173.0,
          "y2": 29206.75,
          "color": "rgba(16, 185, 129, 0.28)",
          "borderColor": "#10b981",
          "label": "Bullish FVG Rebalance",
          "xPercent": 0.45,
          "wPercent": 0.35
        },
        {
          "type": "ray",
          "y": 29333.25,
          "color": "#a855f7",
          "label": "Target BSL Pool (29,333.25)",
          "xPercent": 0.75
        }
      ],
      "breakdown": [
        "<strong>1. Liquidity Fuel:</strong> Retail trendline support was breached at 29,133.00 to activate stop-loss sell orders and fill institutional buy orders.",
        "<strong>2. Imbalance Rebalance:</strong> Price displaced aggressively higher, creating an unfilled 5m Fair Value Gap between 29,173.00 and 29,206.75.",
        "<strong>3. Algorithmic Magnet:</strong> Pullbacks respected the 50% Consequent Encroachment before expanding straight into external Buy-Side Liquidity (29,333.25)."
      ]
    },
    "content": "\n        <div class=\"academy-article\">\n          <h3>The Algorithmic Delivery Truth</h3>\n          <p>In the <em>ICT for Dummies</em> series, PB Trades emphasizes one foundational truth: <strong>the markets are not driven by buyers and sellers at random support/resistance lines.</strong></p>\n          <p>Price is mechanically delivered by an automated computer algorithm known as the <strong>IPDA (Interbank Price Delivery Algorithm)</strong>. IPDA operates on binary logic:</p>\n          \n          <div class=\"model-steps-grid\">\n            <div class=\"model-step-card\">\n              <div class=\"step-num\">01</div>\n              <h4>Target Liquidity Pools</h4>\n              <p>Purging retail stop-loss orders resting above old highs (Buy-Side Liquidity) and below old lows (Sell-Side Liquidity).</p>\n            </div>\n            <div class=\"model-step-card\">\n              <div class=\"step-num\">02</div>\n              <h4>Rebalance Inefficiencies</h4>\n              <p>Returning to institutional imbalances called <strong>Fair Value Gaps (FVGs)</strong> to offer fair two-sided market delivery.</p>\n            </div>\n          </div>\n\n          <div class=\"tip-card highlight\" style=\"margin-top: 20px;\">\n            <h4>\ud83d\udca1 PB Trades Golden Rule:</h4>\n            <p>\"If you do not know where the liquidity is resting, <strong>YOU are the liquidity</strong>. We never guess turning points; we wait for the algorithm to raid a key level, shift structure, and show its hand.\"</p>\n          </div>\n        </div>\n      "
  },
  {
    "id": "pb-module-2",
    "title": "2. Market Structure & The True MSS",
    "badge": "Structure",
    "readTime": "8 min read",
    "description": "How to map swing highs/lows correctly and distinguish a real Market Structure Shift from a routine liquidity raid.",
    "chartExample": {
      "scenarioId": "real-session-2026-08-26",
      "symbol": "MNQ",
      "tf": "5m",
      "title": "\ud83d\udcc8 Real Chart Markup: True MSS vs Routine Liquidity Sweep (2026-08-26 MNQ)",
      "subtitle": "Notice how the displacement candle closes with a full body beyond the swing high (29,241.50), leaving a pristine FVG.",
      "sliceStart": 2090,
      "sliceEnd": 2220,
      "annotations": [
        {
          "type": "ray",
          "y": 29133.0,
          "color": "#ef4444",
          "label": "Sell-Side Liquidity Swept (29,133.00)",
          "xPercent": 0.18
        },
        {
          "type": "ray",
          "y": 29241.5,
          "color": "#38bdf8",
          "label": "Swing High Broken (True MSS Level)",
          "xPercent": 0.42
        },
        {
          "type": "box",
          "y1": 29173.0,
          "y2": 29206.75,
          "color": "rgba(16, 185, 129, 0.3)",
          "borderColor": "#10b981",
          "label": "Displacement Bullish FVG",
          "xPercent": 0.5,
          "wPercent": 0.35
        },
        {
          "type": "ray",
          "y": 29333.25,
          "color": "#a855f7",
          "label": "Target Expansion High (29,333.25)",
          "xPercent": 0.78
        }
      ],
      "breakdown": [
        "<strong>1. Liquidity Raid:</strong> Price sweeps the 29,133.00 session low, engineering cheap sell stops from weak longs.",
        "<strong>2. Energetic Displacement:</strong> A giant 116-point green 5m candle closes completely through the 29,241.50 swing high with a full candle body (not just a wick).",
        "<strong>3. FVG Imbalance:</strong> An unmitigated FVG is printed between 29,173.00 and 29,206.75, confirming institutional sponsorship and the true MSS."
      ]
    },
    "content": "\n        <div class=\"academy-article\">\n          <h3>Swing Highs, Swing Lows & Structural Hierarchy</h3>\n          <p>To read market structure like PB Trades, you must filter out noise and only map <strong>valid 3-candle swing points</strong>:</p>\n          <ul>\n            <li><strong>Swing High:</strong> A candle with a higher high flanked by a lower high to the left and a lower high to the right.</li>\n            <li><strong>Swing Low:</strong> A candle with a lower low flanked by a higher low to the left and a higher low to the right.</li>\n          </ul>\n\n          <div class=\"diagram-container\">\n            <div class=\"diagram-title\">\u26a1 Break of Structure (BOS) vs Market Structure Shift (MSS)</div>\n            <div class=\"ascii-diagram\">\nBullish Trend:  (HL) \u2500\u2500> [HH] \u2500\u2500> (HL) \u2500\u2500> [HH (BSL Sweep)]\n                                                \u2502\n                                                \u25bc (Aggressive Displacement Down)\n                                     \u2500\u2500\u2500 [MSS Break Level] \u2500\u2500\u2500\n                                                \u2502\n                                                \u25bc [Displacement Low]\n                                                \u2502\n                                                \u25b2 Retracement into Bearish FVG \u2794 SELL!\n            </div>\n          </div>\n\n          <h4>The Critical Role of Displacement</h4>\n          <p>A true <strong>Market Structure Shift (MSS)</strong> is <em>never</em> just a wick touching a line. PB Trades looks for:</p>\n          <ol>\n            <li><strong>Large, energetic body candles</strong> that close convincingly through the swing level.</li>\n            <li><strong>Fair Value Gaps (FVG)</strong> left directly behind in the displacement leg. If there is no FVG, there is no institutional commitment!</li>\n          </ol>\n        </div>\n      "
  },
  {
    "id": "pb-module-3",
    "title": "3. Liquidity Simplified (BSL, SSL & IRL / ERL)",
    "badge": "Liquidity",
    "readTime": "7 min read",
    "description": "Understanding Buy-Side vs Sell-Side Liquidity and the perpetual institutional delivery cycle from Internal to External range liquidity.",
    "chartExample": {
      "scenarioId": "real-session-2026-08-24",
      "symbol": "MNQ",
      "tf": "5m",
      "title": "\ud83d\udcc8 Real Chart Markup: Internal to External Liquidity Delivery (2026-08-24 MNQ)",
      "subtitle": "Watch price rebalance internal fair value inefficiency (IRL) before accelerating into external liquidation stops (ERL).",
      "sliceStart": 2030,
      "sliceEnd": 2160,
      "annotations": [
        {
          "type": "box",
          "y1": 29159.5,
          "y2": 29196.0,
          "color": "rgba(239, 68, 68, 0.28)",
          "borderColor": "#ef4444",
          "label": "Internal Liquidity (Bearish IRL FVG)",
          "xPercent": 0.25,
          "wPercent": 0.3
        },
        {
          "type": "ray",
          "y": 28947.75,
          "color": "#a855f7",
          "label": "External Liquidity (ERL Sell Stops 28,947.75)",
          "xPercent": 0.7
        }
      ],
      "breakdown": [
        "<strong>1. Internal Rebalancing:</strong> Price retraces into the Bearish FVG (29,159.50 - 29,196.00) inside the dealing range.",
        "<strong>2. Algorithmic Rejection:</strong> Institutional sell programs activate as sellers defend the FVG midpoint.",
        "<strong>3. External Expansion:</strong> Price cascades downwards, completely taking out external sell stops resting below 28,947.75."
      ]
    },
    "content": "\n        <div class=\"academy-article\">\n          <h3>Where Smart Money Takes Orders</h3>\n          <p>Liquidity is simply where pools of stop losses and pending breakout orders are clustered. Retail traders place stops in predictable locations:</p>\n          \n          <div class=\"table-responsive\">\n            <table class=\"academy-table\">\n              <thead>\n                <tr>\n                  <th>Liquidity Type</th>\n                  <th>Where it Rests</th>\n                  <th>Institutional Purpose</th>\n                </tr>\n              </thead>\n              <tbody>\n                <tr>\n                  <td><strong style=\"color: #10b981;\">BSL (Buy-Side Liquidity)</strong></td>\n                  <td>Above swing highs, Previous Day High (PDH), Equal Highs (EQH)</td>\n                  <td>Smart money enters Short positions by selling to retail buy stops.</td>\n                </tr>\n                <tr>\n                  <td><strong style=\"color: #ef4444;\">SSL (Sell-Side Liquidity)</strong></td>\n                  <td>Below swing lows, Previous Day Low (PDL), Equal Lows (EQL)</td>\n                  <td>Smart money enters Long positions by buying into retail sell stops.</td>\n                </tr>\n              </tbody>\n            </table>\n          </div>\n\n          <h4 style=\"margin-top: 20px;\">The Internal / External Range Cycle</h4>\n          <p>PB Trades summarizes price action into a continuous rhythm: <strong>Price sweeps External Liquidity (ERL) \u2794 rebalances Internal Inefficiency (IRL) \u2794 attacks opposite External Liquidity (ERL).</strong></p>\n        </div>\n      "
  },
  {
    "id": "pb-module-4",
    "title": "4. Fair Value Gaps (FVG) & Consequent Encroachment",
    "badge": "Imbalance",
    "readTime": "8 min read",
    "description": "How 3-candle imbalance patterns form, how to trade the 50% Consequent Encroachment, and Inversion FVGs.",
    "chartExample": {
      "scenarioId": "real-session-2026-08-28",
      "symbol": "MNQ",
      "tf": "5m",
      "title": "\ud83d\udcc8 Real Chart Markup: 50% Consequent Encroachment Precision (2026-08-28 MNQ)",
      "subtitle": "Candle wicks precisely into the 50% CE midpoint (29,615.12) of the FVG before rocketing 180 points higher.",
      "sliceStart": 2140,
      "sliceEnd": 2260,
      "annotations": [
        {
          "type": "box",
          "y1": 29602.0,
          "y2": 29628.25,
          "color": "rgba(16, 185, 129, 0.28)",
          "borderColor": "#10b981",
          "label": "Bullish 5m FVG (Displacement Leg)",
          "xPercent": 0.4,
          "wPercent": 0.35
        },
        {
          "type": "ray",
          "y": 29615.12,
          "color": "#f59e0b",
          "label": "50% CE Midpoint (29,615.12)",
          "xPercent": 0.45
        },
        {
          "type": "ray",
          "y": 29798.75,
          "color": "#10b981",
          "label": "Target BSL Pool (29,798.75)",
          "xPercent": 0.78
        }
      ],
      "breakdown": [
        "<strong>1. Imbalance Formed:</strong> Energetic buying created an unmitigated space between Candle 1 High (29,602.00) and Candle 3 Low (29,628.25).",
        "<strong>2. CE Touch:</strong> Price pulled back directly to the 50% CE level (29,615.12), where institutional algorithms reloaded long positions.",
        "<strong>3. Algorithmic Reaction:</strong> Instant rejection off CE without candle bodies closing through, driving price straight to 29,798.75."
      ]
    },
    "content": "\n        <div class=\"academy-article\">\n          <h3>The Anatomy of a 3-Candle Fair Value Gap</h3>\n          <p>A Fair Value Gap occurs when one-sided aggressive volume leaves an imbalance where only buyers or only sellers were filled:</p>\n          <ul>\n            <li><strong>Bullish FVG:</strong> Space between Candle 1's High and Candle 3's Low. Candle 2 is a massive upward expansion candle.</li>\n            <li><strong>Bearish FVG:</strong> Space between Candle 1's Low and Candle 3's High. Candle 2 is a massive downward expansion candle.</li>\n          </ul>\n\n          <div class=\"tip-card\">\n            <h4>\ud83c\udfaf Consequent Encroachment (CE)</h4>\n            <p>The exact 50% midpoint of the FVG is called <strong>Consequent Encroachment</strong>. High-probability institutional setups frequently tap CE and reverse violently. If candle bodies close past CE, the FVG may be failing.</p>\n          </div>\n\n          <h4>Inversion Fair Value Gaps (IFVG)</h4>\n          <p>When an existing FVG fails to hold price and gets blown through with displacement, it <strong>inverts</strong>:</p>\n          <p>A broken Bullish FVG flips into Bearish algorithmic resistance; a broken Bearish FVG flips into Bullish algorithmic support.</p>\n        </div>\n      "
  },
  {
    "id": "pb-module-5",
    "title": "5. The PB Trades ICT Execution Model (Full Blueprint)",
    "badge": "The Model",
    "readTime": "12 min read",
    "description": "The exact 4-step mechanical blueprint PB Trades uses to trade NQ, ES, Gold, and Forex daily.",
    "chartExample": {
      "scenarioId": "real-session-2026-08-26",
      "symbol": "MNQ",
      "tf": "5m",
      "title": "\ud83d\udcc8 Real Chart Markup: Complete 4-Step Execution Blueprint (2026-08-26 MNQ)",
      "subtitle": "Step 1 (DOL) \u2794 Step 2 (Sweep) \u2794 Step 3 (MSS + FVG) \u2794 Step 4 (Limit Entry @ FVG CE).",
      "sliceStart": 2080,
      "sliceEnd": 2245,
      "annotations": [
        {
          "type": "ray",
          "y": 29133.0,
          "color": "#ef4444",
          "label": "Step 2: Liquidity Sweep (29,133.00)",
          "xPercent": 0.2
        },
        {
          "type": "ray",
          "y": 29241.5,
          "color": "#38bdf8",
          "label": "Step 3: MSS Breakout Level (29,241.50)",
          "xPercent": 0.4
        },
        {
          "type": "box",
          "y1": 29173.0,
          "y2": 29206.75,
          "color": "rgba(16, 185, 129, 0.3)",
          "borderColor": "#10b981",
          "label": "Step 4: Long Entry FVG CE (29,190.00)",
          "xPercent": 0.46,
          "wPercent": 0.35
        },
        {
          "type": "ray",
          "y": 29333.25,
          "color": "#10b981",
          "label": "Step 1: HTF DOL Target (29,333.25)",
          "xPercent": 0.75
        }
      ],
      "breakdown": [
        "<strong>Step 1 - HTF DOL:</strong> Daily Draw on Liquidity was identified as unmitigated session highs at 29,333.25.",
        "<strong>Step 2 - Liquidity Raid:</strong> Price swept sell stops below 29,133.00 during the NY morning killzone.",
        "<strong>Step 3 - MSS with FVG:</strong> Aggressive displacement broke through 29,241.50, printing a clean Bullish FVG.",
        "<strong>Step 4 - Execution:</strong> Limit order placed at 29,190.00 (FVG CE), Stop Loss at 29,130.00 (60 pts), Target 29,333.25 (+143 pts) = 1:2.38 R:R winner."
      ]
    },
    "content": "\n        <div class=\"academy-article\">\n          <h3>The 4-Step Mechanical Execution Blueprint</h3>\n          <p>Follow these 4 steps in exact chronological order on your chart during backtesting:</p>\n\n          <div class=\"blueprint-card\">\n            <div class=\"blueprint-header\">\n              <span class=\"step-tag\">STEP 1</span>\n              <h4>Determine Higher Timeframe Draw on Liquidity (DOL)</h4>\n            </div>\n            <p>On the 1H / 15M chart, find the target pool: Is price reaching for equal highs, session highs, or an opposing daily FVG?</p>\n          </div>\n\n          <div class=\"blueprint-card\">\n            <div class=\"blueprint-header\">\n              <span class=\"step-tag\">STEP 2</span>\n              <h4>Wait for a Liquidity Sweep Inside Killzone</h4>\n            </div>\n            <p>During London Open (2\u20135 AM NY) or NY AM Session (8:30\u201311:00 AM NY), price sweeps a short-term high/low to engineer liquidity.</p>\n          </div>\n\n          <div class=\"blueprint-card\">\n            <div class=\"blueprint-header\">\n              <span class=\"step-tag\">STEP 3</span>\n              <h4>Confirm Market Structure Shift (MSS) with Displacement</h4>\n            </div>\n            <p>Price aggressively reverses on the 1M / 5M timeframe, breaking the swing low/high with full candle bodies and leaving a clear FVG.</p>\n          </div>\n\n          <div class=\"blueprint-card\">\n            <div class=\"blueprint-header\">\n              <span class=\"step-tag\">STEP 4</span>\n              <h4>Limit Entry at FVG / OTE + Stop Loss Placement</h4>\n            </div>\n            <p>Place limit order at the FVG high/low or 50% CE. Stop loss goes directly above/below the displacement swing point. Target the opposing DOL with minimum 1:2 R:R.</p>\n          </div>\n        </div>\n      "
  },
  {
    "id": "pb-module-6",
    "title": "6. Killzones & The Silver Bullet Windows",
    "badge": "Time & Price",
    "readTime": "6 min read",
    "description": "Timing is everything. Master the 10:00\u201311:00 AM NY Silver Bullet and avoid the NY Lunch consolidation trap.",
    "chartExample": {
      "scenarioId": "real-session-2026-08-26",
      "symbol": "MNQ",
      "tf": "5m",
      "title": "\ud83d\udcc8 Real Chart Markup: 10:00 AM Silver Bullet Window (2026-08-26 MNQ)",
      "subtitle": "Algorithmic macro injects energetic volume precisely between 10:00 and 11:00 AM NY local time.",
      "sliceStart": 2160,
      "sliceEnd": 2245,
      "annotations": [
        {
          "type": "box",
          "y1": 29252.5,
          "y2": 29271.5,
          "color": "rgba(59, 130, 246, 0.28)",
          "borderColor": "#38bdf8",
          "label": "10:00 AM Silver Bullet FVG",
          "xPercent": 0.35,
          "wPercent": 0.35
        },
        {
          "type": "ray",
          "y": 29333.25,
          "color": "#10b981",
          "label": "Silver Bullet Target (29,333.25)",
          "xPercent": 0.72
        }
      ],
      "breakdown": [
        "<strong>1. Macro Algorithm Starts:</strong> At exactly 10:00 AM NY (1m bar 2192), volume surges as algorithms seek institutional liquidity.",
        "<strong>2. Clean FVG Formation:</strong> Between 10:05 and 10:15 AM, a pristine 5m Fair Value Gap prints at 29,252.50 - 29,271.50.",
        "<strong>3. Target Delivered:</strong> By 10:45 AM, price expands +65 points to deliver the objective before NY Lunch begins."
      ]
    },
    "content": "\n        <div class=\"academy-article\">\n          <h3>The Institutional Clock (New York Local Time)</h3>\n          <div class=\"killzone-timeline\">\n            <div class=\"kz-item prime\">\n              <span class=\"kz-time\">02:00 \u2013 05:00 AM NY</span>\n              <strong>London Open Killzone</strong>\n              <p>Creates the high/low of the London session; frequently sets the daily directional baseline.</p>\n            </div>\n            <div class=\"kz-item prime\">\n              <span class=\"kz-time\">09:30 \u2013 11:00 AM NY</span>\n              <strong>New York AM Session & Equities Open</strong>\n              <p>Highest volume period of the day. The primary trend and displacement occur here.</p>\n            </div>\n            <div class=\"kz-item super\">\n              <span class=\"kz-time\">10:00 \u2013 11:00 AM NY</span>\n              <strong>\u2b50 The NY AM Silver Bullet</strong>\n              <p>PB Trades' favorite window! A guaranteed algorithmic FVG setup forms to deliver 15-40 NQ points or 10-20 pips.</p>\n            </div>\n            <div class=\"kz-item trap\">\n              <span class=\"kz-time\">12:00 \u2013 01:00 PM NY</span>\n              <strong>\u26a0\ufe0f New York Lunch (NO TRADE ZONE)</strong>\n              <p>Low liquidity algorithmic meat-grinder. Consolidations and false breakouts form here to trap retail.</p>\n            </div>\n            <div class=\"kz-item prime\">\n              <span class=\"kz-time\">02:00 \u2013 03:00 PM NY</span>\n              <strong>New York PM Silver Bullet</strong>\n              <p>Secondary high-probability delivery before the 4:00 PM equity market close.</p>\n            </div>\n          </div>\n        </div>\n      "
  },
  {
    "id": "pb-module-7",
    "title": "7. Risk Management & The Psychology of Sizing",
    "badge": "Discipline",
    "readTime": "5 min read",
    "description": "How professional ICT traders survive losing streaks, preserve capital, and scale accounts with fixed 1% risk.",
    "chartExample": {
      "scenarioId": "real-session-2026-08-28",
      "symbol": "MNQ",
      "tf": "5m",
      "title": "\ud83d\udcc8 Real Chart Markup: Structural Invalidation & Risk Bracket (2026-08-28 MNQ)",
      "subtitle": "Stop Loss placed where your thesis is proven mathematically incorrect, keeping risk strictly at 1%.",
      "sliceStart": 2140,
      "sliceEnd": 2260,
      "annotations": [
        {
          "type": "ray",
          "y": 29505.5,
          "color": "#ef4444",
          "label": "Invalidation Stop Loss (29,505.50)",
          "xPercent": 0.25
        },
        {
          "type": "ray",
          "y": 29604.0,
          "color": "#38bdf8",
          "label": "Long Entry @ FVG Retest (29,604.00)",
          "xPercent": 0.45
        },
        {
          "type": "ray",
          "y": 29798.0,
          "color": "#10b981",
          "label": "Take Profit Target (29,798.00 / 1:2 R:R)",
          "xPercent": 0.75
        }
      ],
      "breakdown": [
        "<strong>1. Logical Invalidation:</strong> The Stop Loss is not an arbitrary dollar amount; it sits below structural swing low (29,505.50). If price trades there, the setup is mathematically dead.",
        "<strong>2. Position Sizing:</strong> With 98 points of risk, a 1-micro contract (/pt) risks , perfectly fitting a 1% risk rule on a ,000 account.",
        "<strong>3. Reward vs Risk:</strong> Target at 29,798.00 captures 194 points ( profit) for a clean 1:1.98 Risk-to-Reward ratio."
      ]
    },
    "content": "\n        <div class=\"academy-article\">\n          <h3>The Math of Consistency</h3>\n          <p>Even an ICT setup with 60% win rate will experience 3 to 5 consecutive losses. If you risk 5% per trade, you will suffer devastating drawdowns.</p>\n          \n          <div class=\"tip-card highlight\">\n            <h4>\ud83d\udee1\ufe0f PB Trades Rules for Longevity:</h4>\n            <ul>\n              <li><strong>Max Risk Per Trade:</strong> 0.5% to 1.0% of total account equity.</li>\n              <li><strong>Max Daily Loss:</strong> 2 losing trades = shut down the terminal for the day.</li>\n              <li><strong>Minimum R:R Target:</strong> Never take a trade under 1:2 Risk to Reward.</li>\n              <li><strong>No Chasing:</strong> If price leaves without filling your FVG limit, let it go. There will always be another setup tomorrow.</li>\n            </ul>\n          </div>\n        </div>\n      "
  },
  {
    "id": "pb-module-8",
    "title": "8. Advanced Liquidity: Session Raids, LRL & The Devil's Mark",
    "badge": "EP. 7 Masterclass",
    "readTime": "10 min read",
    "description": "Expanding beyond basic BSL/SSL into Session Highs/Lows, Low-Resistance Liquidity (LRL), Data Wicks, and the Devil's Mark.",
    "chartExample": {
      "scenarioId": "real-session-2026-08-25",
      "symbol": "MNQ",
      "tf": "5m",
      "title": "\ud83d\udcc8 Real Chart Markup: Session Liquidity Sweep & LRL Attack (2026-08-25 MNQ)",
      "subtitle": "Watch how London sweeps the session low (29,105.75), rejects, and initiates a clean run through Low Resistance Liquidity.",
      "sliceStart": 1700,
      "sliceEnd": 1850,
      "annotations": [
        {
          "type": "ray",
          "y": 29105.75,
          "color": "#ef4444",
          "label": "London Liquidity Sweep (29,105.75)",
          "xPercent": 0.22
        },
        {
          "type": "box",
          "y1": 29215.0,
          "y2": 29235.0,
          "color": "rgba(16, 185, 129, 0.28)",
          "borderColor": "#10b981",
          "label": "Displacement Bullish FVG",
          "xPercent": 0.45,
          "wPercent": 0.35
        },
        {
          "type": "ray",
          "y": 29290.5,
          "color": "#10b981",
          "label": "LRL Target Session High (29,290.50)",
          "xPercent": 0.75
        }
      ],
      "breakdown": [
        "<strong>1. Session Liquidity Raid:</strong> Session Low (29,105.75) was purged during London open to engineer liquidity.",
        "<strong>2. Low-Resistance Run:</strong> The clean stair-step highs formed on the way down offered zero resistance for the algorithmic pump.",
        "<strong>3. Target Satisfied:</strong> The unmitigated high at 29,290.50 acted as the ultimate external magnet."
      ]
    },
    "content": "\n        <div class=\"academy-article\">\n          <h3>The Advanced Liquidity Architecture (Episode 7)</h3>\n          <p>In Episode 7, PB Trades emphasizes that a liquidity pool is <strong>primarily a target (Draw on Liquidity)</strong>, not an automatic entry. Stop treating every swing high/low equally.</p>\n          \n          <div class=\"table-responsive\">\n            <table class=\"academy-table\">\n              <thead>\n                <tr>\n                  <th>Liquidity Structure</th>\n                  <th>Institutional Function</th>\n                  <th>Priority Tier</th>\n                </tr>\n              </thead>\n              <tbody>\n                <tr>\n                  <td><strong>PDH / PDL</strong></td>\n                  <td>External daily boundaries; primary directional magnets for the daily profile.</td>\n                  <td><span class=\"badge\" style=\"background:#10b981;color:#fff;\">Tier 1 (Highest)</span></td>\n                </tr>\n                <tr>\n                  <td><strong>Session H / L</strong></td>\n                  <td>Asia (20:00-00:00), London (02:00-05:00), NY (09:30-16:00). Time-based liquidity.</td>\n                  <td><span class=\"badge\" style=\"background:#10b981;color:#fff;\">Tier 1 (Highest)</span></td>\n                </tr>\n                <tr>\n                  <td><strong>LRL (Low Resistance)</strong></td>\n                  <td>Stair-step swings along retail trendlines. Price cuts through them decisively.</td>\n                  <td><span class=\"badge\" style=\"background:#3b82f6;color:#fff;\">Tier 2 (High)</span></td>\n                </tr>\n                <tr>\n                  <td><strong>Data Wicks (CPI/NFP)</strong></td>\n                  <td>News spikes print extreme wicks. 50% midpoint acts as long-term balance magnet.</td>\n                  <td><span class=\"badge\" style=\"background:#f59e0b;color:#fff;\">Tier 3 (Context)</span></td>\n                </tr>\n                <tr>\n                  <td><strong>Devil's Mark</strong></td>\n                  <td>Wickless candles (Open = High/Low). Leaves one-sided auction imbalance to be revisited.</td>\n                  <td><span class=\"badge\" style=\"background:#8b5cf6;color:#fff;\">Tier 3 (Context)</span></td>\n                </tr>\n              </tbody>\n            </table>\n          </div>\n\n          <div class=\"tip-card highlight\" style=\"margin-top: 20px;\">\n            <h4>\ud83d\ude08 The Devil's Mark Explained:</h4>\n            <p>A candle with zero wick on one side indicates that the algorithm immediately flooded one side of the book without probing the opposing side. On 1H and 4H charts, the level of a Devil's Mark represents an unfinished auction that price will frequently revisit before sustained trends.</p>\n          </div>\n        </div>\n      "
  },
  {
    "id": "pb-module-9",
    "title": "9. Premium vs. Discount Dealing Ranges & R:R Optimization",
    "badge": "EP. 8 Mechanics",
    "readTime": "8 min read",
    "description": "Mastering the 50% Equilibrium rule, eliminating negative R:R chasing, and aligning fractal dealing ranges.",
    "chartExample": {
      "scenarioId": "real-session-2026-08-28",
      "symbol": "MNQ",
      "tf": "5m",
      "title": "\ud83d\udcc8 Real Chart Markup: Discount Entry vs Premium Chasing (2026-08-28 MNQ)",
      "subtitle": "Waiting for discount expansion turns a mediocre trade into a textbook high-expectancy R:R winner.",
      "sliceStart": 2140,
      "sliceEnd": 2260,
      "annotations": [
        {
          "type": "ray",
          "y": 29505.5,
          "color": "#ef4444",
          "label": "Range Low (0%) 29,505.50",
          "xPercent": 0.2
        },
        {
          "type": "ray",
          "y": 29652.12,
          "color": "#38bdf8",
          "label": "50% Equilibrium (29,652.12)",
          "xPercent": 0.45
        },
        {
          "type": "box",
          "y1": 29602.0,
          "y2": 29628.25,
          "color": "rgba(16, 185, 129, 0.28)",
          "borderColor": "#10b981",
          "label": "Discount Entry FVG (< 50% EQ)",
          "xPercent": 0.45,
          "wPercent": 0.35
        },
        {
          "type": "ray",
          "y": 29798.75,
          "color": "#10b981",
          "label": "Range High (100%) 29,798.75",
          "xPercent": 0.75
        }
      ],
      "breakdown": [
        "<strong>1. Dealing Range:</strong> Low at 29,505.50 to High at 29,798.75 establishes Equilibrium (50%) at 29,652.12.",
        "<strong>2. Discount FVG:</strong> Pullback below 29,652.12 into 29,602.00 - 29,628.25 offers a cheap institutional long location.",
        "<strong>3. R:R Multiplier:</strong> Risking 98 points below swing low to target 29,798.75 yields almost 200 points (+1:2 R:R). Chasing in Premium above 50% EQ would have created terrible risk-to-reward."
      ]
    },
    "content": "\n        <div class=\"academy-article\">\n          <h3>The R:R Multiplier Effect (Episode 8)</h3>\n          <p>PB Trades stresses that 50% Equilibrium does not \"predict\" turning points. Rather, <strong>location dictates whether your trade is mathematically viable</strong>.</p>\n\n          <div class=\"diagram-container\">\n            <div class=\"diagram-title\">\u2696\ufe0f Dealing Range Equilibrium & Mathematical Expectancy</div>\n            <div class=\"ascii-diagram\">\n100.0% \u2500\u2500 SWING HIGH (BSL Target: 21,200)\n         \u2502\n         \u2502   PREMIUM ZONE (Sell / Short Only \u2014 Expensive)\n         \u2502   [Chased Long Here: Risk 85 pts, Gain 25 pts \u2794 1:0.29 R:R \u274c]\n         \u2502\n 50.0% \u2500\u2500 EQUILIBRIUM (EQ: 21,145)\n         \u2502\n         \u2502   DISCOUNT ZONE (Buy / Long Only \u2014 Cheap)\n         \u2502   [Patient Long Here: Risk 20 pts, Gain 90 pts \u2794 1:4.50 R:R \u2705]\n         \u2502\n  0.0% \u2500\u2500 SWING LOW (SSL Sweep: 21,090)\n            </div>\n          </div>\n\n          <div class=\"tip-card highlight\" style=\"margin-top: 15px;\">\n            <h4>\ud83d\udca1 The Golden Lesson:</h4>\n            <p>When your bullish narrative points to higher prices, waiting for price to pull back into <strong>Discount (&lt; 50%)</strong> allows you to slash your stop loss distance and multiply your reward without needing a larger market move!</p>\n          </div>\n        </div>\n      "
  },
  {
    "id": "pb-module-10",
    "title": "10. Intermarket SMT Divergence Mastery (NQ vs ES)",
    "badge": "EP. 9 Intermarket",
    "readTime": "9 min read",
    "description": "How to detect institutional accumulation/distribution via NQ vs ES divergence, pick the stronger asset, and exit at SMT take-profit.",
    "chartExample": {
      "scenarioId": "real-session-2026-08-26",
      "symbol": "MNQ",
      "tf": "5m",
      "title": "\ud83d\udcc8 Real Chart Markup: Intermarket Bullish SMT Squeeze (2026-08-26 MNQ)",
      "subtitle": "While ES swept its overnight low, NQ refused to break prior low (Higher Low), producing a massive rally.",
      "sliceStart": 2080,
      "sliceEnd": 2245,
      "annotations": [
        {
          "type": "ray",
          "y": 29133.0,
          "color": "#ef4444",
          "label": "NQ Higher Low (SMT Absorption 29,133)",
          "xPercent": 0.2
        },
        {
          "type": "box",
          "y1": 29173.0,
          "y2": 29206.75,
          "color": "rgba(16, 185, 129, 0.3)",
          "borderColor": "#10b981",
          "label": "Stronger Asset Long Entry FVG",
          "xPercent": 0.45,
          "wPercent": 0.35
        },
        {
          "type": "ray",
          "y": 29333.25,
          "color": "#10b981",
          "label": "Take Profit Swept (29,333.25)",
          "xPercent": 0.75
        }
      ],
      "breakdown": [
        "<strong>1. SMT Divergence:</strong> ES swept its session low; NQ held cleanly above its prior low (Bullish SMT).",
        "<strong>2. Stronger Asset Selection:</strong> Because NQ refused to break, PB Trades selected NQ for the long execution.",
        "<strong>3. SMT at Take Profit:</strong> When ES touched its target high first, profit was secured before the pullback."
      ]
    },
    "content": "\n        <div class=\"academy-article\">\n          <h3>The Smart Money Tool (SMT) Framework (Episode 9)</h3>\n          <p>NQ (Nasdaq) and ES (S&P 500) normally move together. When they disagree at a critical liquidity level or HTF PDA, <strong>smart money is tipping its hand</strong>.</p>\n\n          <div class=\"model-steps-grid\">\n            <div class=\"model-step-card\">\n              <div class=\"step-num\">01</div>\n              <h4>Bullish SMT Divergence</h4>\n              <p>ES sweeps an external low (makes a Lower Low), but NQ refuses to break and makes a <strong>Higher Low</strong>. Smart money is quietly absorbing selling on NQ. <strong>Result: Explosive rally.</strong></p>\n            </div>\n            <div class=\"model-step-card\">\n              <div class=\"step-num\">02</div>\n              <h4>Bearish SMT Divergence</h4>\n              <p>NQ sweeps an external high (makes a Higher High), but ES fails to make a new high (prints a <strong>Lower High</strong>). Broader market breadth is exhausted. <strong>Result: Violent drop.</strong></p>\n            </div>\n          </div>\n\n          <div class=\"tip-card highlight\" style=\"margin-top: 20px;\">\n            <h4>\ud83c\udfaf SMT at Take-Profit (The Exit Edge):</h4>\n            <p>PB Trades teaches a vital nuance: If you are Long on NQ and targeting a BSL pool, watch ES! If ES <strong>already sweeps its BSL target</strong> while NQ stalls 5 points away, <strong>do NOT greedily wait for the last tick</strong>. The move's algorithmic objective is satisfied. Take your profit immediately!</p>\n          </div>\n        </div>\n      "
  },
  {
    "id": "pb-module-11",
    "title": "11. The Algorithmic Daily Bias Engine & The 3 Questions",
    "badge": "EP. 10 Daily Bias",
    "readTime": "11 min read",
    "description": "Constructing institutional daily bias using the 3 core questions, PDA respect/disrespect matrix, and falsifiable IF/THEN hypotheses.",
    "chartExample": {
      "scenarioId": "real-session-2026-08-26",
      "symbol": "MNQ",
      "tf": "5m",
      "title": "\ud83d\udcc8 Real Chart Markup: Algorithmic Daily Bias in Action (2026-08-26 MNQ)",
      "subtitle": "Swept SSL (Question 1) \u2794 Respected Bullish FVGs (Question 2) \u2794 Delivered to BSL (Question 3).",
      "sliceStart": 2080,
      "sliceEnd": 2245,
      "annotations": [
        {
          "type": "ray",
          "y": 29133.0,
          "color": "#ef4444",
          "label": "Q1: Delivered FROM SSL (29,133.00)",
          "xPercent": 0.2
        },
        {
          "type": "box",
          "y1": 29173.0,
          "y2": 29206.75,
          "color": "rgba(16, 185, 129, 0.3)",
          "borderColor": "#10b981",
          "label": "Q2: Bullish PDA Respected",
          "xPercent": 0.45,
          "wPercent": 0.35
        },
        {
          "type": "ray",
          "y": 29333.25,
          "color": "#10b981",
          "label": "Q3: Target BSL Magnet (29,333.25)",
          "xPercent": 0.75
        }
      ],
      "breakdown": [
        "<strong>Q1 - Delivered From:</strong> Price raided Sell-Side Liquidity below 29,133.00 during the NY session open.",
        "<strong>Q2 - PDA Respect:</strong> Bullish FVGs were strictly defended by institutional order flow, while bearish micro gaps failed.",
        "<strong>Q3 - Why Move:</strong> Untouched Buy-Side Liquidity at 29,333.25 was the unmitigated external magnet. Daily bias was 100% bullish."
      ]
    },
    "content": "\n        <div class=\"academy-article\">\n          <h3>The 3 Core Daily Bias Questions (Episode 10)</h3>\n          <p>Daily bias is not guessing candle color. It is a systematic delivery narrative answering three mechanical questions:</p>\n\n          <div class=\"blueprint-card\">\n            <div class=\"blueprint-header\">\n              <span class=\"step-tag\">QUESTION 1</span>\n              <h4>Where did price deliver FROM?</h4>\n            </div>\n            <p>Did price just sweep Buy-Side Liquidity (BSL) or Sell-Side Liquidity (SSL)? Did it reject a Higher Timeframe PDA?</p>\n          </div>\n\n          <div class=\"blueprint-card\">\n            <div class=\"blueprint-header\">\n              <span class=\"step-tag\">QUESTION 2</span>\n              <h4>Which PD Arrays are being RESPECTED vs DISRESPECTED?</h4>\n            </div>\n            <p>In a Bullish State, bullish FVGs hold as support and bearish FVGs fail. In a Bearish State, bearish FVGs hold and bullish FVGs fail.</p>\n          </div>\n\n          <div class=\"blueprint-card\">\n            <div class=\"blueprint-header\">\n              <span class=\"step-tag\">QUESTION 3</span>\n              <h4>WHY should price move toward the targeted level?</h4>\n            </div>\n            <p>The algorithm moves for only three reasons: (1) Seek Liquidity, (2) Rebalance Inefficiency (FVGs), or (3) Rebalance a Range toward 50% Equilibrium.</p>\n          </div>\n\n          <div class=\"tip-card highlight\" style=\"margin-top: 20px;\">\n            <h4>\ud83d\udee1\ufe0f Falsifiable IF / THEN Rule:</h4>\n            <p>\"IF price sweeps London Low into the 4H FVG and displaces, THEN I am bullish toward PDH. INVALIDATION: If price closes below the 4H FVG, the thesis is dead.\" Bias without invalidation is just gambling.</p>\n          </div>\n        </div>\n      "
  },
  {
    "id": "pb-module-12",
    "title": "12. Prop Firm Capital Preservation, Micro Sizing & Buffers",
    "badge": "EP. 11 Prop Mastery",
    "readTime": "10 min read",
    "description": "The exact mathematical sizing formula, NQ vs MNQ micro contract math, prop-firm account phases, and anti-overtrading rules.",
    "chartExample": {
      "scenarioId": "real-session-2026-08-28",
      "symbol": "MNQ",
      "tf": "5m",
      "title": "\ud83d\udcc8 Real Chart Markup: Precise Micro Sizing on NQ (2026-08-28 MNQ)",
      "subtitle": "Stop distance of 35 pts with  budget = 3 MNQ contracts ( risk). Zero guesswork.",
      "sliceStart": 2140,
      "sliceEnd": 2260,
      "annotations": [
        {
          "type": "ray",
          "y": 29505.5,
          "color": "#ef4444",
          "label": "Structural Stop (35 pts = /con)",
          "xPercent": 0.25
        },
        {
          "type": "ray",
          "y": 29604.0,
          "color": "#38bdf8",
          "label": "Entry (3 MNQ =  Risk)",
          "xPercent": 0.45
        },
        {
          "type": "ray",
          "y": 29798.0,
          "color": "#10b981",
          "label": "Take Profit (+194 pts = +,164)",
          "xPercent": 0.75
        }
      ],
      "breakdown": [
        "<strong>1. Invalidation Stop:</strong> The stop belongs strictly below the structural swing low (29,505.50).",
        "<strong>2. Micro Contract Math:</strong> Full NQ would risk  on a 35-point stop (violating the  budget). 3 MNQ (/pt) risks exactly  (under the budget).",
        "<strong>3. Capital Preservation:</strong> Sizing strictly to the structural stop eliminates the temptation to arbitrarily move stops into the noise."
      ]
    },
    "content": "\n        <div class=\"academy-article\">\n          <h3>The Prop-Firm Survival Blueprint (Episode 11)</h3>\n          <p>PB Trades outlines the exact mathematics and rules required to pass evaluations and keep funded accounts:</p>\n\n          <div class=\"table-responsive\">\n            <table class=\"academy-table\">\n              <thead>\n                <tr>\n                  <th>Account Phase</th>\n                  <th>Risk Per Trade</th>\n                  <th>Daily Operational Rules</th>\n                </tr>\n              </thead>\n              <tbody>\n                <tr>\n                  <td><strong>Phase 1: Evaluation</strong></td>\n                  <td>1.0% max (0.5% beginner)</td>\n                  <td>Strictly <strong>ONE A+ setup per day</strong>. Win or lose, you are finished for the session.</td>\n                </tr>\n                <tr>\n                  <td><strong>Phase 2: Buffer Building</strong></td>\n                  <td>0.5% strict</td>\n                  <td>Max 2 trades per day. <strong>Stop trading immediately after 1 win!</strong> Build cushion equal to max drawdown.</td>\n                </tr>\n                <tr>\n                  <td><strong>Phase 3: Payout Phase</strong></td>\n                  <td>0.5%</td>\n                  <td>Never withdraw into your buffer. Maintain the cushion so normal variance never violates the account.</td>\n                </tr>\n              </tbody>\n            </table>\n          </div>\n\n          <h4 style=\"margin-top: 25px;\">The Exact Position Sizing Equation</h4>\n          <div class=\"tip-card highlight\">\n            <p style=\"font-size: 14px; font-weight: 700; color: #38bdf8;\">\n              Number of Contracts = Dollar Risk Budget \u00f7 (Stop Distance in Points \u00d7 Point Value)\n            </p>\n            <p>For NQ with a  budget and 35-point stop:</p>\n            <ul>\n              <li><strong>Full E-mini NQ (/pt):</strong> 35 pts \u00d7  =  risk \u2794 <strong>0 Contracts (Too big!)</strong></li>\n              <li><strong>Micro E-mini MNQ (/pt):</strong> 35 pts \u00d7  =  risk/con \u2794 <strong>3 MNQ Contracts ( risk)</strong></li>\n            </ul>\n          </div>\n        </div>\n      "
  }
],
  "quizzes": [
    {
      "id": "q1",
      "question": "According to PB Trades, what must ALWAYS be present in a valid Market Structure Shift (MSS)?",
      "options": [
        "A crossover of the 20 and 50 Exponential Moving Averages",
        "A strong displacement candle leaving behind a Fair Value Gap (FVG)",
        "An RSI reading below 30 in the oversold zone",
        "A small wick touching the previous high or low"
      ],
      "correct": 1,
      "explanation": "Displacement with an unfilled Fair Value Gap (FVG) is the key signature of institutional sponsorship. Without an FVG, it is merely retail chop."
    },
    {
      "id": "q2",
      "question": "Which time window represents the high-probability New York AM Silver Bullet?",
      "options": [
        "12:00 PM \u2013 1:00 PM NY Time",
        "10:00 AM \u2013 11:00 AM NY Time",
        "08:00 AM \u2013 09:00 AM NY Time",
        "04:00 PM \u2013 05:00 PM NY Time"
      ],
      "correct": 1,
      "explanation": "10:00 AM to 11:00 AM NY Time is the premier Silver Bullet window where algorithms seek internal or external range liquidity via a clean FVG."
    },
    {
      "id": "q3",
      "question": "What is Consequent Encroachment (CE) in ICT price delivery?",
      "options": [
        "The highest price candle of the day",
        "The exact 50% mathematical midpoint of a Fair Value Gap",
        "The moving average of the last 20 periods",
        "The spread fee charged by the broker"
      ],
      "correct": 1,
      "explanation": "Consequent Encroachment (CE) is the 50% midpoint of an FVG. Price often respects this level as a precise algorithmic support/resistance pivot."
    },
    {
      "id": "q4",
      "question": "In Episode 7, what is a 'Devil's Mark' and why does it matter?",
      "options": [
        "A 666-point crash in the futures market",
        "A wickless candle indicating one-sided order flow imbalance that price often revisits",
        "A proprietary moving average crossover signal",
        "A retail double top pattern on the daily chart"
      ],
      "correct": 1,
      "explanation": "A Devil's Mark is a candle with no wick on one side. It reflects immediate one-sided institutional volume, leaving an imbalance that price frequently revisits to complete the auction."
    },
    {
      "id": "q5",
      "question": "In Episode 8, why does PB Trades insist on only taking Longs in the Discount Zone (< 50% Equilibrium)?",
      "options": [
        "Because 50% Equilibrium predicts 100% of market reversals",
        "Because Discount entry slashes stop distance and multiplies Risk-to-Reward without changing the target",
        "Because the exchange forbids market orders above 50%",
        "Because volume is always higher in the discount zone"
      ],
      "correct": 1,
      "explanation": "Entering in Discount reduces risk distance and vastly expands your R:R multiplier, turning a poor 1:0.8 trade into a 1:3 or 1:4+ high-expectancy setup."
    },
    {
      "id": "q6",
      "question": "In Episode 9, what does a Bullish SMT Divergence between NQ and ES signal?",
      "options": [
        "Both indices are crashing and retail should short",
        "ES swept its low but NQ held a Higher Low, revealing institutional accumulation on NQ",
        "NQ is weak and should be shorted immediately",
        "The market has entered a holiday schedule"
      ],
      "correct": 1,
      "explanation": "When ES breaks a low while NQ holds a higher low, smart money is absorbing NQ selling. NQ is the stronger asset and should be bought for an explosive move."
    },
    {
      "id": "q7",
      "question": "In Episode 9, what is PB Trades' elite rule regarding SMT at Take-Profit?",
      "options": [
        "Always hold until NQ hits the exact dollar penny of your target",
        "If correlated ES has already swept its target high while NQ stalls near target, take profits immediately",
        "Double your contract size when ES sweeps target",
        "Reverse your position and go short without confirmation"
      ],
      "correct": 1,
      "explanation": "If ES satisfies the institutional liquidity target, the algorithmic buy program may terminate. Never stubbornly demand the last tick on NQ\u2014protect your gains."
    },
    {
      "id": "q8",
      "question": "In Episode 10, what are the 3 Core Questions required to formulate Daily Bias?",
      "options": [
        "What did CNBC say? What is the RSI? Where is VWAP?",
        "Where did price deliver from? Which PDAs are respected vs disrespected? Why should price move to the target?",
        "Is the candle red or green? Did it break Bollinger Bands? What is the trendline angle?",
        "How many contracts did retail buy? What is the FED rate? What time is lunch?"
      ],
      "correct": 1,
      "explanation": "The 3 Questions identify: (1) Source of delivery (BSL/SSL raid), (2) Institutional order flow (FVG respect/disrespect), and (3) Algorithmic reason for movement (Liquidity, Inefficiency, or Range rebalance)."
    },
    {
      "id": "q9",
      "question": "In Episode 11, if your account risk budget is $250 and your NQ stop distance is 25 points, how should you size?",
      "options": [
        "Trade 1 full E-mini NQ ($500 risk)",
        "Trade 5 Micro MNQ contracts ($250 risk)",
        "Move your stop loss closer to 12 points to force a full E-mini contract",
        "Trade 10 Micro MNQ contracts and hope for the best"
      ],
      "correct": 1,
      "explanation": "Full NQ ($20/pt) risks $500 on a 25-pt stop (violating budget). 5 Micro MNQ ($2/pt) equals exactly $250. Never move your structural stop to fit a contract size!"
    },
    {
      "id": "q10",
      "question": "What is PB Trades' rule in the Prop-Firm Buffer Phase (Phase 2)?",
      "options": [
        "Risk 5% per trade and trade all day long",
        "Risk 0.5% per trade, max 2 trades per day, and stop trading immediately after 1 win",
        "Withdraw all profits down to $1 above the drawdown limit",
        "Trade only during the Asian session"
      ],
      "correct": 1,
      "explanation": "In the Buffer Phase, your goal is to build cushion to protect your account. Risking 0.5%, capping daily trades at 2, and stopping after 1 win prevents overtrading drawdowns."
    }
  ]
};

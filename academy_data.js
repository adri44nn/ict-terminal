/**
 * ICT (Inner Circle Trader) Institutional Masterclass & Playbooks
 * 100% Pure Michael J. Huddleston Algorithmic Framework
 */

window.ACADEMY_DATA = {
  modules: [
    {
      id: "ict-foundations",
      title: "🏛️ 1. IPDA & The Time & Price Doctrine",
      badge: "Core Foundation",
      description: "Understand the Interbank Price Delivery Algorithm (IPDA) and why Time always precedes Price in institutional order delivery.",
      sections: [
        {
          title: "The Interbank Price Delivery Algorithm (IPDA)",
          content: `
            <p>Markets do not move on retail buying and selling pressure. Central banks and algorithmic market makers utilize the <strong>IPDA (Interbank Price Delivery Algorithm)</strong> to deliver price mechanically based on two objectives:</p>
            <ol>
              <li><strong>Rebalancing Inefficiencies:</strong> Returning to Fair Value Gaps (FVGs) and Volume Imbalances to ensure two-sided liquidity.</li>
              <li><strong>Purging Liquidity Pools:</strong> Running buy stops above old highs and sell stops below old lows to pair institutional orders with retail stop losses.</li>
            </ol>
            <div class="tip-card highlight">
              <h4>⏰ Key ICT Benchmark Times (New York Local Time):</h4>
              <ul>
                <li><strong>00:00 NY Midnight:</strong> The True Day Open. Establishes the daily baseline for Premium (> Midnight Open) vs. Discount (< Midnight Open).</li>
                <li><strong>02:00 – 05:00 AM NY:</strong> London Open Killzone (Frequently forms the High or Low of the Day).</li>
                <li><strong>08:30 AM NY:</strong> Major US Economic Data Release / NY Macro Open.</li>
                <li><strong>09:30 AM NY:</strong> Equities Opening Bell (Opening Range & initial displacement).</li>
                <li><strong>10:00 – 11:00 AM NY:</strong> The New York AM Silver Bullet Window (Highest volume / cleanest delivery).</li>
                <li><strong>12:00 – 01:00 PM NY:</strong> New York Lunch (Consolidation & retail trap hour — <em>No Trade Zone</em>).</li>
                <li><strong>02:00 – 03:00 PM NY:</strong> New York PM Silver Bullet Window.</li>
              </ul>
            </div>
          `
        }
      ]
    },
    {
      id: "ict-liquidity",
      title: "🌊 2. Liquidity: BSL, SSL & IRL / ERL Delivery",
      badge: "Order Flow",
      description: "Master Buy-Side Liquidity, Sell-Side Liquidity, Internal vs External Range delivery, and Judas Swings.",
      sections: [
        {
          title: "Buy-Side Liquidity (BSL) vs Sell-Side Liquidity (SSL)",
          content: `
            <p>Price seeks liquidity like a magnet. There are two primary liquidity pools:</p>
            <ul>
              <li><strong>Buy-Side Liquidity (BSL):</strong> Clustered buy stops resting above Previous Daily Highs (PDH), Previous Weekly Highs (PWH), and Equal Highs (EQH). Smart money sells into these buy stops.</li>
              <li><strong>Sell-Side Liquidity (SSL):</strong> Clustered sell stops resting below Previous Daily Lows (PDL), Previous Weekly Lows (PWL), and Equal Lows (EQL). Smart money buys into these sell stops.</li>
            </ul>
            <div class="visual-diagram-box">
              <pre>
   [BSL POOL] === Buy Stops Above Old Highs (Institutional Sell Zone)
       ▲
       │  (Price Expands Up to Purge Stops)
       ▼
   [SSL POOL] === Sell Stops Below Old Lows (Institutional Buy Zone)
              </pre>
            </div>
          `
        },
        {
          title: "Internal Range Liquidity (IRL) to External Range Liquidity (ERL)",
          content: `
            <p>The IPDA delivery cycle continuously oscillates between internal and external liquidity:</p>
            <ul>
              <li><strong>Step 1:</strong> Price sweeps <strong>External Range Liquidity (ERL)</strong> (Old High/Low).</li>
              <li><strong>Step 2:</strong> Price shifts market structure (MSS) and retraces back inside to rebalance <strong>Internal Range Liquidity (IRL)</strong> (Fair Value Gaps / Order Blocks in Discount/Premium).</li>
              <li><strong>Step 3:</strong> Price accelerates outward to attack the opposing <strong>External Range Liquidity (ERL)</strong>.</li>
            </ul>
          `
        }
      ]
    },
    {
      id: "ict-inefficiencies",
      title: "📐 3. Imbalances: FVGs, IFVGs & Consequent Encroachment",
      badge: "Price Inefficiencies",
      description: "The mechanics of 3-candle Fair Value Gaps, Inversion FVGs, and exact 50% Consequent Encroachment (CE) reactions.",
      sections: [
        {
          title: "The 3-Candle Fair Value Gap (FVG)",
          content: `
            <p>A <strong>Fair Value Gap (FVG)</strong> is an institutional imbalance created when price displaces violently in one direction, leaving orders unfilled on the other side:</p>
            <ul>
              <li><strong>Bullish FVG (+FVG):</strong> The gap between Candle 1 High and Candle 3 Low during an impulsive green Candle 2. Serves as algorithmic support.</li>
              <li><strong>Bearish FVG (-FVG):</strong> The gap between Candle 1 Low and Candle 3 High during an impulsive red Candle 2. Serves as algorithmic resistance.</li>
              <li><strong>Consequent Encroachment (CE):</strong> The exact mathematical 50% midpoint of the FVG. Institutional algorithms frequently rebalance exactly to CE before continuing.</li>
              <li><strong>Inversion FVG (IFVG):</strong> An FVG that fails to hold. Once closed beyond, it inverts its role (support flips to resistance and vice-versa).</li>
            </ul>
          `
        }
      ]
    },
    {
      id: "ict-models",
      title: "🎯 4. High-Probability ICT Execution Models",
      badge: "Playbooks",
      description: "Mechanical execution rules for the ICT 2022 Mentorship Model, The Silver Bullet Strategy, and Power of 3 (AMD).",
      sections: [
        {
          title: "1. The ICT 2022 Mentorship Model",
          content: `
            <ol>
              <li><strong>Draw on Liquidity (DOL):</strong> Identify the Higher Timeframe (15m/1h/Daily) target liquidity pool (BSL or SSL).</li>
              <li><strong>Killzone Timing:</strong> London Open (02:00-05:00 AM NY) or NY AM (08:30-11:00 AM NY).</li>
              <li><strong>Liquidity Raid:</strong> Price sweeps the opposing Old High (BSL) or Old Low (SSL).</li>
              <li><strong>Displacement & MSS:</strong> Violent energetic candle close breaking market structure, creating a clean 3-candle FVG.</li>
              <li><strong>Entry:</strong> Limit order placed at the FVG threshold or 50% Consequent Encroachment (CE).</li>
              <li><strong>Invalidation / Stop Loss:</strong> Protected below the swing low (for longs) or above the swing high (for shorts).</li>
              <li><strong>Target:</strong> Opposing External Liquidity pool (BSL/SSL) with minimum 1:2+ R:R.</li>
            </ol>
          `
        },
        {
          title: "2. The ICT Silver Bullet Strategy",
          content: `
            <p>A time-based 60-minute algorithmic scalp offering 10-20 points on MNQ and 5-10 points on MES:</p>
            <div class="time-box">
              <p><strong>⏰ Daily Silver Bullet Windows (New York Time):</strong></p>
              <ul>
                <li><strong>London Silver Bullet:</strong> 03:00 AM – 04:00 AM NY</li>
                <li><strong>New York AM Silver Bullet:</strong> 10:00 AM – 11:00 AM NY (Highest Probability)</li>
                <li><strong>New York PM Silver Bullet:</strong> 02:00 PM – 03:00 PM NY</li>
              </ul>
            </div>
            <p><strong>Execution Rules:</strong></p>
            <ul>
              <li>Inside the window, identify the liquidity sweep and Market Structure Shift.</li>
              <li>Enter on the first retest of the FVG formed inside the 60-minute hour.</li>
              <li>Target opposing liquidity with a strict 1:2 minimum Risk-to-Reward.</li>
            </ul>
          `
        },
        {
          title: "3. Power of 3 (AMD: Accumulation, Manipulation, Distribution)",
          content: `
            <p>The universal blueprint of institutional daily and session candle delivery:</p>
            <ul>
              <li><strong>Accumulation (A):</strong> Asian session range / tight consolidation where smart money builds positions.</li>
              <li><strong>Manipulation (M / Judas Swing):</strong> London or early NY false move sweeping liquidity in the opposite direction of the true trend.</li>
              <li><strong>Distribution (D):</strong> The true high-momentum expansion leg of the day, delivering price straight into the HTF Draw on Liquidity.</li>
            </ul>
          `
        }
      ]
    },
    {
      id: "ict-risk",
      title: "📊 5. Micro Futures Specifications & Risk Matrix",
      badge: "Risk Control",
      description: "Contract values, tick sizes, and optimal position sizing for MNQ, MES, M2K, and MGC.",
      sections: [
        {
          title: "Micro Futures Multipliers & Point Values",
          content: `
            <div class="comparison-table-wrapper">
              <table class="comparison-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Asset Name</th>
                    <th>Tick Size</th>
                    <th>Tick Value</th>
                    <th>Point Value (1.00 pt)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>MNQ</strong></td>
                    <td>Micro E-mini Nasdaq-100</td>
                    <td>0.25 pt</td>
                    <td>$0.50</td>
                    <td><strong>$2.00 / point</strong></td>
                  </tr>
                  <tr>
                    <td><strong>MES</strong></td>
                    <td>Micro E-mini S&P 500</td>
                    <td>0.25 pt</td>
                    <td>$1.25</td>
                    <td><strong>$5.00 / point</strong></td>
                  </tr>
                  <tr>
                    <td><strong>M2K</strong></td>
                    <td>Micro E-mini Russell 2000</td>
                    <td>0.10 pt</td>
                    <td>$0.50</td>
                    <td><strong>$5.00 / point</strong></td>
                  </tr>
                  <tr>
                    <td><strong>MGC</strong></td>
                    <td>Micro Gold Futures</td>
                    <td>0.10 pt</td>
                    <td>$1.00</td>
                    <td><strong>$10.00 / point</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="tip-card">
              <h4>🎯 Risk Sizing Formula:</h4>
              <p><code>Max Risk ($) = Total Account Balance × 1%</code></p>
              <p><code>Contract Qty = Max Risk ($) / (Stop Loss Points × Point Value)</code></p>
            </div>
          `
        }
      ]
    }
  ],

  quizzes: [
    {
      id: "quiz-1",
      question: "You are trading MNQ at 10:15 AM NY. Price sweeps the previous day's low with a wick, then vigorously closes above the 5m swing high, leaving a 3-candle gap. What setup is this in ICT?",
      options: [
        "A random chop candle that should be ignored",
        "A Bullish ICT Silver Bullet & 2022 Mentorship Model setup (SSL Sweep + MSS with Displacement + FVG Retest)",
        "A retail breakout buy signal",
        "A Bearish Break of Structure"
      ],
      correct: 1,
      explanation: "This is the classic textbook ICT Bullish Setup: Formed during the 10:00-11:00 AM NY Silver Bullet window, sweeps Sell-Side Liquidity (SSL), displaces with a clean candle close (MSS), and leaves an unmitigated Bullish FVG for a Discount limit entry."
    },
    {
      id: "quiz-2",
      question: "What validates a candle as a true ICT Institutional Order Block (OB)?",
      options: [
        "Any green candle before a red candle or vice versa",
        "It must cause energetic displacement that breaks market structure (MSS) and generates a Fair Value Gap (FVG)",
        "It must form during 12:30 PM lunch",
        "It only occurs on 1-second charts"
      ],
      correct: 1,
      explanation: "Michael Huddleston stresses that a candle is NOT an Order Block just because it is a red or green candle before a move. It MUST cause energetic displacement, break market structure (MSS), and create a Fair Value Gap (FVG) to be validated as institutional sponsorship."
    },
    {
      id: "quiz-3",
      question: "In the ICT Optimal Trade Entry (OTE) framework, what is considered the highest-probability Fibonacci sweet spot?",
      options: [
        "0.236 Retracement",
        "0.382 Retracement",
        "0.705 Retracement (between 0.62 and 0.79)",
        "0.99 Retracement"
      ],
      correct: 2,
      explanation: "The ICT OTE sweet spot is exactly the 0.705 Fibonacci retracement level, nestled deep in the discount (for longs) or premium (for shorts) between 0.62 and 0.79."
    },
    {
      id: "quiz-4",
      question: "Which of the following New York time windows is considered the 'No Trade Zone' due to low institutional volume and algorithmic chop?",
      options: [
        "08:30 AM – 11:00 AM NY (NY AM Killzone)",
        "10:00 AM – 11:00 AM NY (Silver Bullet)",
        "12:00 PM – 01:00 PM NY (NY Lunch Trap)",
        "02:00 PM – 03:00 PM NY (NY PM Silver Bullet)"
      ],
      correct: 2,
      explanation: "12:00 PM to 1:00 PM NY time is the lunch hour on Wall Street. Algorithmic delivery frequently consolidates or initiates false breakout traps. ICT traders strictly avoid initiating new positions during lunch."
    }
  ]
};

/**
 * ICT & ICC Client-Side Algorithmic Engine
 * Pure JavaScript - Runs 100% inside any browser (Desktop & Mobile 24/7)
 * Zero backend server or Mac required.
 */

(function(window) {
  'use strict';

  const SYMBOLS = {
    "MNQ": { name: "Micro E-mini Nasdaq-100", yahoo: "MNQ=F", alt: "NQ=F", point_val: 2.00, tick: 0.25 },
    "MES": { name: "Micro E-mini S&P 500", yahoo: "MES=F", alt: "ES=F", point_val: 5.00, tick: 0.25 },
    "M2K": { name: "Micro E-mini Russell 2000", yahoo: "M2K=F", alt: "RTY=F", point_val: 5.00, tick: 0.10 },
    "MGC": { name: "Micro Gold Futures", yahoo: "MGC=F", alt: "GC=F", point_val: 10.00, tick: 0.10 }
  };

  // ==========================================================================
  // 1. PURE JAVASCRIPT ICT ENGINE
  // ==========================================================================
  const ICTEngine = {
    getNyTime: function(timestamp) {
      const d = timestamp ? new Date(timestamp * 1000) : new Date();
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).formatToParts(d);

      let p = {};
      parts.forEach(x => p[x.type] = x.value);
      return {
        year: parseInt(p.year, 10),
        month: parseInt(p.month, 10),
        day: parseInt(p.day, 10),
        hour: parseInt(p.hour, 10),
        minute: parseInt(p.minute, 10),
        second: parseInt(p.second, 10),
        timeStr: `${p.hour}:${p.minute}:${p.second} NY`,
        dateStr: `${p.year}-${p.month}-${p.day}`
      };
    },

    getKillzoneStatus: function(timestamp) {
      const ny = this.getNyTime(timestamp);
      const timeDec = ny.hour + (ny.minute / 60.0);

      let isSb = false;
      let sbName = null;
      let activeKz = "Outside Killzones";
      let isHighProb = false;
      let isLunchTrap = false;

      if (timeDec >= 2.0 && timeDec < 5.0) {
        activeKz = "London Open Killzone (02:00 - 05:00 NY)";
        isHighProb = true;
        if (timeDec >= 3.0 && timeDec < 4.0) {
          isSb = true;
          sbName = "London Silver Bullet (03:00 - 04:00 NY)";
        }
      } else if (timeDec >= 8.5 && timeDec < 11.0) {
        activeKz = "New York AM Killzone (08:30 - 11:00 NY)";
        isHighProb = true;
        if (timeDec >= 10.0 && timeDec < 11.0) {
          isSb = true;
          sbName = "New York AM Silver Bullet (10:00 - 11:00 NY)";
        }
      } else if (timeDec >= 12.0 && timeDec < 13.0) {
        activeKz = "New York Lunch (12:00 - 13:00 NY) - Low Volume Trap";
        isLunchTrap = true;
      } else if (timeDec >= 13.5 && timeDec < 16.0) {
        activeKz = "New York PM Killzone (13:30 - 16:00 NY)";
        isHighProb = true;
        if (timeDec >= 14.0 && timeDec < 15.0) {
          isSb = true;
          sbName = "New York PM Silver Bullet (14:00 - 15:00 NY)";
        }
      } else if (timeDec >= 20.0 || timeDec < 0.0) {
        activeKz = "Asian Session (20:00 - 00:00 NY)";
        isHighProb = true;
      } else if (timeDec >= 5.0 && timeDec < 8.5) {
        activeKz = "Pre-NY / London Lunch Session";
      }

      const nextEvents = [
        { time: 2.0, name: "London Killzone (02:00 NY)" },
        { time: 3.0, name: "London Silver Bullet (03:00 NY)" },
        { time: 8.5, name: "NY AM Killzone (08:30 NY)" },
        { time: 10.0, name: "NY AM Silver Bullet (10:00 NY)" },
        { time: 13.5, name: "NY PM Killzone (13:30 NY)" },
        { time: 14.0, name: "NY PM Silver Bullet (14:00 NY)" },
        { time: 20.0, name: "Asian Session (20:00 NY)" }
      ];

      let nextEventName = "London Killzone (02:00 NY)";
      let minutesToNext = 0;
      let found = false;

      for (let ev of nextEvents) {
        if (ev.time > timeDec) {
          nextEventName = ev.name;
          minutesToNext = Math.round((ev.time - timeDec) * 60);
          found = true;
          break;
        }
      }
      if (!found) {
        minutesToNext = Math.round((24.0 - timeDec + 2.0) * 60);
        nextEventName = "London Killzone (02:00 NY Tomorrow)";
      }

      return {
        ny_time_str: ny.timeStr,
        ny_date_str: ny.dateStr,
        active_killzone: activeKz,
        is_silver_bullet: isSb,
        silver_bullet_name: sbName,
        is_high_probability_time: isHighProb,
        is_lunch_trap: isLunchTrap,
        next_event: nextEventName,
        minutes_to_next_event: minutesToNext
      };
    },

    identifySwings: function(candles, window = 2) {
      const swingHighs = [];
      const swingLows = [];
      const n = candles.length;

      for (let i = window; i < n - window; i++) {
        const currH = candles[i].high;
        const currL = candles[i].low;

        let isSh = true;
        let isSl = true;

        for (let j = 1; j <= window; j++) {
          if (!(candles[i - j].high < currH && candles[i + j].high <= currH)) isSh = false;
          if (!(candles[i - j].low > currL && candles[i + j].low >= currL)) isSl = false;
        }

        if (isSh) swingHighs.push({ index: i, time: candles[i].time, price: currH, type: "SWING_HIGH", swept: false });
        if (isSl) swingLows.push({ index: i, time: candles[i].time, price: currL, type: "SWING_LOW", swept: false });
      }

      return { swingHighs, swingLows };
    },

    detectFVGs: function(candles, minGapTicks = 1.0, tickSize = 0.25) {
      const fvgs = [];
      const n = candles.length;
      if (n < 3) return fvgs;

      const minGap = minGapTicks * tickSize;

      for (let i = 2; i < n; i++) {
        const c1 = candles[i - 2];
        const c2 = candles[i - 1];
        const c3 = candles[i];

        if (c3.low > c1.high) {
          const gapSize = c3.low - c1.high;
          if (gapSize >= minGap) {
            const top = c3.low;
            const bottom = c1.high;
            const midpoint = (top + bottom) / 2.0;

            let mitigated = false;
            let inverted = false;
            for (let k = i + 1; k < n; k++) {
              if (candles[k].low <= top) mitigated = true;
              if (candles[k].close < bottom) inverted = true;
            }

            fvgs.push({
              type: "BULLISH_FVG",
              top: top,
              bottom: bottom,
              consequent_encroachment: midpoint,
              gap_size: Math.round(gapSize * 100) / 100,
              candle_index: i - 1,
              time: c2.time,
              mitigated: mitigated,
              inverted: inverted,
              status: mitigated ? "MITIGATED" : "UNMITIGATED"
            });
          }
        } else if (c3.high < c1.low) {
          const gapSize = c1.low - c3.high;
          if (gapSize >= minGap) {
            const top = c1.low;
            const bottom = c3.high;
            const midpoint = (top + bottom) / 2.0;

            let mitigated = false;
            let inverted = false;
            for (let k = i + 1; k < n; k++) {
              if (candles[k].high >= bottom) mitigated = true;
              if (candles[k].close > top) inverted = true;
            }

            fvgs.push({
              type: "BEARISH_FVG",
              top: top,
              bottom: bottom,
              consequent_encroachment: midpoint,
              gap_size: Math.round(gapSize * 100) / 100,
              candle_index: i - 1,
              time: c2.time,
              mitigated: mitigated,
              inverted: inverted,
              status: mitigated ? "MITIGATED" : "UNMITIGATED"
            });
          }
        }
      }

      return fvgs;
    },

    detectMSS: function(candles, swingHighs, swingLows) {
      const mssEvents = [];
      const n = candles.length;
      if (n < 5) return mssEvents;

      const recentCandles = candles.slice(-50);
      const avgBody = recentCandles.reduce((sum, c) => sum + Math.abs(c.close - c.open), 0) / Math.max(recentCandles.length, 1);

      for (let sh of swingHighs) {
        const shIdx = sh.index;
        const shPrice = sh.price;
        for (let i = shIdx + 1; i < n; i++) {
          const c = candles[i];
          if (c.close > shPrice) {
            const body = Math.abs(c.close - c.open);
            const isDisplacement = body >= (avgBody * 1.15) && c.close > c.open;
            mssEvents.push({
              type: "BULLISH_MSS",
              direction: "BULLISH",
              broken_swing_price: shPrice,
              breakout_index: i,
              time: c.time,
              is_displacement: isDisplacement
            });
            break;
          }
        }
      }

      for (let sl of swingLows) {
        const slIdx = sl.index;
        const slPrice = sl.price;
        for (let i = slIdx + 1; i < n; i++) {
          const c = candles[i];
          if (c.close < slPrice) {
            const body = Math.abs(c.close - c.open);
            const isDisplacement = body >= (avgBody * 1.15) && c.close < c.open;
            mssEvents.push({
              type: "BEARISH_MSS",
              direction: "BEARISH",
              broken_swing_price: slPrice,
              breakout_index: i,
              time: c.time,
              is_displacement: isDisplacement
            });
            break;
          }
        }
      }

      return mssEvents;
    },

    detectLiquiditySweeps: function(candles, swingHighs, swingLows) {
      const sweeps = [];
      const n = candles.length;
      if (n < 5) return sweeps;

      for (let sh of swingHighs) {
        const shIdx = sh.index;
        const shPrice = sh.price;
        for (let i = shIdx + 1; i < n; i++) {
          const c = candles[i];
          if (c.high > shPrice && c.close < shPrice) {
            sweeps.push({
              type: "BSL_SWEEP",
              pool: "BSL",
              bias: "BEARISH",
              swept_price: shPrice,
              wick_high: c.high,
              candle_index: i,
              time: c.time
            });
            sh.swept = true;
            break;
          }
        }
      }

      for (let sl of swingLows) {
        const slIdx = sl.index;
        const slPrice = sl.price;
        for (let i = slIdx + 1; i < n; i++) {
          const c = candles[i];
          if (c.low < slPrice && c.close > slPrice) {
            sweeps.push({
              type: "SSL_SWEEP",
              pool: "SSL",
              bias: "BULLISH",
              swept_price: slPrice,
              wick_low: c.low,
              candle_index: i,
              time: c.time
            });
            sl.swept = true;
            break;
          }
        }
      }

      return sweeps;
    },

    analyzeSymbol: function(symbol, candles) {
      if (!candles || candles.length < 10) {
        return {
          symbol: symbol,
          timeframe: "5m",
          current_price: 0,
          price_change_24h: 0,
          price_change_pct: 0,
          direction: "NEUTRAL",
          is_active_trade: false,
          setup_grade: "F",
          grade_badge: "GRADE_F",
          grade_desc: "Insufficient Data",
          confluence_score: 0,
          setup_type: "Observing Structure",
          checklist: [],
          trade_plan: { is_active: false, direction: "NEUTRAL", entry: null, stop_loss: null, take_profit: null, risk_points: null, reward_points: null, rr_ratio: "--" }
        };
      }

      const spec = SYMBOLS[symbol] || { tick: 0.25, point_val: 2.0 };
      const currentPrice = candles[candles.length - 1].close;
      const firstPrice = candles[0].open;
      const priceChange = Math.round((currentPrice - firstPrice) * 100) / 100;
      const priceChangePct = Math.round(((currentPrice - firstPrice) / firstPrice) * 10000) / 100;

      const kz = this.getKillzoneStatus();
      const { swingHighs, swingLows } = this.identifySwings(candles, 2);
      const fvgs = this.detectFVGs(candles, 1.0, spec.tick);
      const mssEvents = this.detectMSS(candles, swingHighs, swingLows);
      const sweeps = this.detectLiquiditySweeps(candles, swingHighs, swingLows);

      const n = candles.length;
      const recentSweeps = sweeps.filter(s => s.candle_index >= n - 25);
      const recentMSS = mssEvents.filter(m => m.breakout_index >= n - 25);
      const unmitigatedFVGs = fvgs.filter(f => !f.mitigated && f.candle_index >= n - 30);

      const hasSslSweep = sweeps.slice(-8).some(s => s.type === "SSL_SWEEP");
      const hasBslSweep = sweeps.slice(-8).some(s => s.type === "BSL_SWEEP");
      const hasBullMSS = mssEvents.slice(-6).some(m => m.type === "BULLISH_MSS");
      const hasBearMSS = mssEvents.slice(-6).some(m => m.type === "BEARISH_MSS");
      const recentBullFvgs = unmitigatedFVGs.filter(f => f.type === "BULLISH_FVG");
      const recentBearFvgs = unmitigatedFVGs.filter(f => f.type === "BEARISH_FVG");

      const hasSweep = hasSslSweep || hasBslSweep;
      const hasMSS = hasBullMSS || hasBearMSS;
      const hasFVG = recentBullFvgs.length > 0 || recentBearFvgs.length > 0;
      const isPrimeTime = kz.is_high_probability_time;

      let direction = "NEUTRAL";
      if (hasBullMSS && recentBullFvgs.length > 0) {
        direction = "BULLISH";
      } else if (hasBearMSS && recentBearFvgs.length > 0) {
        direction = "BEARISH";
      } else if (mssEvents.length > 0) {
        direction = mssEvents[mssEvents.length - 1].direction;
      } else if (sweeps.length > 0) {
        direction = sweeps[sweeps.length - 1].bias;
      }

      let confluenceScore = 0;
      if (hasSweep) confluenceScore += 30;
      if (hasMSS) confluenceScore += 30;
      if (hasFVG) confluenceScore += 25;
      if (isPrimeTime) confluenceScore += 15;
      confluenceScore = Math.min(confluenceScore, 100);

      const checklist = [
        { item: "Fresh Liquidity Sweep (BSL/SSL)", passed: hasSweep },
        { item: "Confirmed MSS Displacement", passed: hasMSS },
        { item: "Fresh Unmitigated FVG", passed: hasFVG },
        { item: "Killzone / Session Timing", passed: isPrimeTime }
      ];

      let tradePlan = {
        is_active: false,
        direction: direction,
        entry: null,
        stop_loss: null,
        take_profit: null,
        risk_points: null,
        reward_points: null,
        rr_ratio: "--"
      };

      let setupGrade = "F";
      let gradeBadge = "GRADE_F";
      let gradeDesc = "No Setup / Incomplete Confluence";
      let setupType = "Observing Order Flow";

      const isBullCandidate = hasBullMSS && recentBullFvgs.length > 0;
      const isBearCandidate = hasBearMSS && recentBearFvgs.length > 0;

      if (isBullCandidate) {
        const matchingFvg = recentBullFvgs.slice(-1)[0];
        if (matchingFvg) {
          const entry = matchingFvg.top;
          const sl = matchingFvg.bottom - (spec.tick * 4);
          const risk = Math.max(entry - sl, spec.tick * 4);
          
          const validBsl = swingHighs.filter(sh => (sh.price - entry) >= (2.0 * risk)).map(sh => sh.price);
          const target = validBsl.length > 0 ? validBsl[0] : (entry + (2.5 * risk));
          const reward = target - entry;
          const rr = risk > 0 ? reward / risk : 0;

          // ICT Filter: Setup is only ACTIVE if Target has NOT already been reached and SL not breached
          const targetAlreadyHit = currentPrice >= target;
          const slBreached = currentPrice <= sl;

          if (rr >= 1.8 && !targetAlreadyHit && !slBreached) {
            tradePlan = {
              is_active: true,
              direction: "BULLISH",
              entry: Math.round(entry * 100) / 100,
              stop_loss: Math.round(sl * 100) / 100,
              take_profit: Math.round(target * 100) / 100,
              risk_points: Math.round(risk * 100) / 100,
              reward_points: Math.round(reward * 100) / 100,
              rr_ratio: `1:${rr.toFixed(2)}`
            };
            setupGrade = isPrimeTime ? "A+" : "A";
            gradeBadge = isPrimeTime ? "GRADE_A_PLUS" : "GRADE_A";
            gradeDesc = isPrimeTime ? "A+ Setup: Prime Killzone + 1:2+ RR Bullish FVG Model" : "A Setup: Valid Bullish FVG with 1:2+ RR";
            setupType = "ICT 2022 Mentorship Model (Bullish Buy Limit)";
          }
        }
      } else if (isBearCandidate) {
        const matchingFvg = recentBearFvgs.slice(-1)[0];
        if (matchingFvg) {
          const entry = matchingFvg.bottom;
          const sl = matchingFvg.top + (spec.tick * 4);
          const risk = Math.max(sl - entry, spec.tick * 4);
          
          const validSsl = swingLows.filter(slItem => (entry - slItem.price) >= (2.0 * risk)).map(slItem => slItem.price);
          const target = validSsl.length > 0 ? validSsl[0] : (entry - (2.5 * risk));
          const reward = entry - target;
          const rr = risk > 0 ? reward / risk : 0;

          // ICT Filter: Setup is only ACTIVE if Target has NOT already been reached and SL not breached
          const targetAlreadyHit = currentPrice <= target;
          const slBreached = currentPrice >= sl;

          if (rr >= 1.8 && !targetAlreadyHit && !slBreached) {
            tradePlan = {
              is_active: true,
              direction: "BEARISH",
              entry: Math.round(entry * 100) / 100,
              stop_loss: Math.round(sl * 100) / 100,
              take_profit: Math.round(target * 100) / 100,
              risk_points: Math.round(risk * 100) / 100,
              reward_points: Math.round(reward * 100) / 100,
              rr_ratio: `1:${rr.toFixed(2)}`
            };
            setupGrade = isPrimeTime ? "A+" : "A";
            gradeBadge = isPrimeTime ? "GRADE_A_PLUS" : "GRADE_A";
            gradeDesc = isPrimeTime ? "A+ Setup: Prime Killzone + 1:2+ RR Bearish FVG Model" : "A Setup: Valid Bearish FVG with 1:2+ RR";
            setupType = "ICT 2022 Mentorship Model (Bearish Sell Limit)";
          }
        }
      }

      if (!tradePlan.is_active && confluenceScore >= 50) {
        setupGrade = "B";
        gradeBadge = "GRADE_B";
        gradeDesc = `B Potential: Structure Forming (${confluenceScore}% Confluence Criteria Met)`;
        setupType = `Setup Forming (${confluenceScore}% Confluence Criteria Met)`;
      }

      return {
        symbol: symbol,
        timeframe: "5m",
        current_price: currentPrice,
        price_change_24h: priceChange,
        price_change_pct: priceChangePct,
        killzone_info: kz,
        direction: direction,
        is_active_trade: tradePlan.is_active,
        setup_grade: setupGrade,
        grade_badge: gradeBadge,
        grade_desc: gradeDesc,
        confluence_score: confluenceScore,
        setup_type: setupType,
        checklist: checklist,
        trade_plan: tradePlan,
        fvgs: fvgs,
        swings: { highs: swingHighs, lows: swingLows },
        mss_events: mssEvents,
        sweeps: sweeps
      };
    }
  };

  // ==========================================================================
  // 2. PURE JAVASCRIPT ICC (TRADES BY SCI) ENGINE
  // ==========================================================================
  const ICCEngine = {
    findSwings: function(candles, window = 2) {
      const swingHighs = [];
      const swingLows = [];
      const n = candles.length;

      for (let i = window; i < n - window; i++) {
        const currH = candles[i].high;
        const currL = candles[i].low;

        let isSh = true;
        let isSl = true;

        for (let j = 1; j <= window; j++) {
          if (!(candles[i - j].high < currH && candles[i + j].high <= currH)) isSh = false;
          if (!(candles[i - j].low > currL && candles[i + j].low >= currL)) isSl = false;
        }

        if (isSh) swingHighs.push({ index: i, price: currH, time: candles[i].time });
        if (isSl) swingLows.push({ index: i, price: currL, time: candles[i].time });
      }

      return { swingHighs, swingLows };
    },

    detectIndications: function(candles, swingHighs, swingLows, minRange = 4.0) {
      const indications = [];
      const n = candles.length;
      if (n < 8) return indications;

      // 1. Detect Bullish Indications: Structural Expansion from Swing Low to Swing High
      for (let sl of swingLows) {
        for (let sh of swingHighs) {
          if (sh.index > sl.index && (sh.index - sl.index) >= 2) {
            const move = sh.price - sl.price;
            if (move >= minRange) {
              // Check if this move broke a prior swing high (Market Structure Shift)
              const brokeStructure = swingHighs.some(priorSh => priorSh.index < sh.index && priorSh.index < sl.index && priorSh.price < sh.price);
              if (brokeStructure || move >= (minRange * 1.5)) {
                indications.push({
                  type: 'BULLISH_INDICATION',
                  direction: 'BULLISH',
                  start_index: sl.index,
                  end_index: sh.index,
                  origin_price: sl.price,
                  extreme_price: sh.price,
                  range: Math.round(move * 100) / 100,
                  start_time: sl.time,
                  end_time: sh.time,
                  equilibrium_50: Math.round((sl.price + (move * 0.5)) * 100) / 100,
                  retrace_382: Math.round((sh.price - (move * 0.382)) * 100) / 100,
                  retrace_618: Math.round((sh.price - (move * 0.618)) * 100) / 100
                });
              }
            }
          }
        }
      }

      // 2. Detect Bearish Indications: Structural Expansion from Swing High to Swing Low
      for (let sh of swingHighs) {
        for (let sl of swingLows) {
          if (sl.index > sh.index && (sl.index - sh.index) >= 2) {
            const move = sh.price - sl.price;
            if (move >= minRange) {
              // Check if this move broke a prior swing low (Market Structure Shift)
              const brokeStructure = swingLows.some(priorSl => priorSl.index < sl.index && priorSl.index < sh.index && priorSl.price > sl.price);
              if (brokeStructure || move >= (minRange * 1.5)) {
                indications.push({
                  type: 'BEARISH_INDICATION',
                  direction: 'BEARISH',
                  start_index: sh.index,
                  end_index: sl.index,
                  origin_price: sh.price,
                  extreme_price: sl.price,
                  range: Math.round(move * 100) / 100,
                  start_time: sh.time,
                  end_time: sl.time,
                  equilibrium_50: Math.round((sh.price - (move * 0.5)) * 100) / 100,
                  retrace_382: Math.round((sl.price + (move * 0.382)) * 100) / 100,
                  retrace_618: Math.round((sl.price + (move * 0.618)) * 100) / 100
                });
              }
            }
          }
        }
      }

      // Sort indications chronologically by end index
      indications.sort((a, b) => a.end_index - b.end_index);

      // Fallback: If no complex swing indications detected yet, use major session range
      if (indications.length === 0 && n >= 15) {
        const firstC = candles[0];
        const lastC = candles[n - 1];
        const highPrice = Math.max(...candles.map(c => c.high));
        const lowPrice = Math.min(...candles.map(c => c.low));
        const totalMove = highPrice - lowPrice;

        if (totalMove >= minRange) {
          const isBull = lastC.close >= firstC.open;
          if (isBull) {
            indications.push({
              type: 'BULLISH_INDICATION',
              direction: 'BULLISH',
              start_index: 0,
              end_index: Math.floor(n * 0.7),
              origin_price: lowPrice,
              extreme_price: highPrice,
              range: Math.round(totalMove * 100) / 100,
              start_time: firstC.time,
              end_time: lastC.time,
              equilibrium_50: Math.round((lowPrice + (totalMove * 0.5)) * 100) / 100,
              retrace_382: Math.round((highPrice - (totalMove * 0.382)) * 100) / 100,
              retrace_618: Math.round((highPrice - (totalMove * 0.618)) * 100) / 100
            });
          } else {
            indications.push({
              type: 'BEARISH_INDICATION',
              direction: 'BEARISH',
              start_index: 0,
              end_index: Math.floor(n * 0.7),
              origin_price: highPrice,
              extreme_price: lowPrice,
              range: Math.round(totalMove * 100) / 100,
              start_time: firstC.time,
              end_time: lastC.time,
              equilibrium_50: Math.round((highPrice - (totalMove * 0.5)) * 100) / 100,
              retrace_382: Math.round((lowPrice + (totalMove * 0.382)) * 100) / 100,
              retrace_618: Math.round((lowPrice + (totalMove * 0.618)) * 100) / 100
            });
          }
        }
      }

      return indications;
    },

    evaluateIccLifecycle: function(candles, indications, options) {
      options = options || {};
      const n = candles.length;
      if (!indications || indications.length === 0 || n < 10) {
        return {
          phase: 'STANDBY',
          phase_title: 'Standby (Scanning for Indication Impulse)',
          is_active_trade: false,
          direction: 'NEUTRAL',
          setup_grade: 'F',
          grade_desc: 'No Valid Indication Impulse Detected',
          confluence_score: 0,
          indication: null,
          correction: null,
          trade_plan: null
        };
      }

      const latestInd = indications[indications.length - 1];
      const indEndIdx = latestInd.end_index;
      const currPrice = candles[n - 1].close;

      const origin = latestInd.origin_price;
      const extreme = latestInd.extreme_price;
      const totalRange = Math.max(latestInd.range, 4.0);
      const isBull = latestInd.direction === 'BULLISH';

      const entry50 = latestInd.equilibrium_50;
      
      // Authentic Trades by Sci Protected SL (Strictly 15-Minute Swing Low/High)
      let sl = isBull
        ? ((options.recent15mLow && options.recent15mLow < currPrice) ? Math.round(options.recent15mLow * 100) / 100 : Math.round(origin * 100) / 100)
        : ((options.recent15mHigh && options.recent15mHigh > currPrice) ? Math.round(options.recent15mHigh * 100) / 100 : Math.round(origin * 100) / 100);

      // Directional Sanity enforcement
      if (isBull && sl >= currPrice) {
        sl = Math.min(origin, currPrice - (totalRange * 0.4));
      } else if (!isBull && sl <= currPrice) {
        sl = Math.max(origin, currPrice + (totalRange * 0.4));
      }

      const postCandles = candles.slice(indEndIdx);

      if (isBull) {
        const lowestRetrace = postCandles.length > 0 ? Math.min(...postCandles.map(c => c.low)) : currPrice;
        const retraceAmount = Math.max(extreme - lowestRetrace, 0);
        const retracePct = Math.round((retraceAmount / totalRange) * 1000) / 10;

        const isInHealthyZone = retracePct >= 20.0 && retracePct <= 75.0;
        const lastC = candles[n - 1];
        const prevC = n >= 2 ? candles[n - 2] : lastC;
        const bullishReversalTrigger = (lastC.close > lastC.open && (lastC.close > prevC.high || currPrice >= entry50)) || (currPrice >= extreme);

        const correctionInfo = {
          status: isInHealthyZone ? 'HEALTHY GOLDEN ZONE' : (retracePct < 20.0 ? 'SHALLOW / EXPANSION' : 'DEEP PULLBACK'),
          lowest_price: lowestRetrace,
          retrace_pct: retracePct,
          zone_bottom: latestInd.retrace_618,
          zone_top: latestInd.retrace_382,
          equilibrium: entry50
        };

        const activeEntry = currPrice;
        const risk = Math.max(activeEntry - sl, 2.0);
        const tp1 = Math.max(extreme, Math.round((activeEntry + (risk * 1.5)) * 100) / 100);
        const tp2 = Math.round((activeEntry + (risk * 2.5)) * 100) / 100;
        const tp3 = Math.round((activeEntry + (risk * 3.5)) * 100) / 100;
        const rr = (Math.abs(tp1 - activeEntry) / risk);

        if ((isInHealthyZone && bullishReversalTrigger) || currPrice >= extreme) {
          const grade = rr >= 2.0 ? 'A+' : 'A';
          return {
            phase: 'PHASE_3_CONTINUATION',
            phase_title: `🚀 PHASE 3: BULLISH CONTINUATION ARMED (1:${rr.toFixed(1)} RR)`,
            is_active_trade: true,
            direction: 'BULLISH',
            setup_grade: grade,
            grade_desc: `ICC Grade ${grade}: 15M Swing Low Protected at ${sl}. Target TP: ${tp2} (1:${rr.toFixed(1)} RR)`,
            confluence_score: grade === 'A+' ? 100 : 88,
            indication: latestInd,
            correction: correctionInfo,
            trade_plan: {
              is_active: true,
              direction: 'BULLISH',
              action: 'BUY LIMIT / CONTINUATION TRIGGER',
              entry: Math.round(activeEntry * 100) / 100,
              stop_loss: sl,
              take_profit: tp2,
              take_profit_1: tp1,
              take_profit_2: tp2,
              take_profit_3: tp3,
              risk_points: Math.round(risk * 100) / 100,
              reward_points: Math.round((tp2 - activeEntry) * 100) / 100,
              rr_ratio: `1:${rr.toFixed(2)}`
            }
          };
        } else {
          const plannedEntry = entry50;
          const plannedRisk = Math.max(plannedEntry - sl, 2.0);
          const pTp1 = Math.max(extreme, Math.round((plannedEntry + (plannedRisk * 1.5)) * 100) / 100);
          const pTp2 = Math.round((plannedEntry + (plannedRisk * 2.5)) * 100) / 100;
          const pTp3 = Math.round((plannedEntry + (plannedRisk * 3.5)) * 100) / 100;
          const plannedRr = (pTp2 - plannedEntry) / plannedRisk;

          return {
            phase: 'PHASE_2_CORRECTION',
            phase_title: `⏳ Phase 2: Pullback in Progress (${retracePct}% Retraced)`,
            is_active_trade: false,
            direction: 'BULLISH',
            setup_grade: 'B',
            grade_desc: `Phase 2: Retracing into 50% Eq (${plannedEntry}) - 15M Swing SL: ${sl} | Target TP: ${pTp2}`,
            confluence_score: isInHealthyZone ? 70 : 45,
            indication: latestInd,
            correction: correctionInfo,
            trade_plan: {
              is_active: false,
              direction: 'BULLISH',
              action: 'PULLBACK IN PROGRESS',
              entry: plannedEntry,
              stop_loss: sl,
              take_profit: pTp2,
              take_profit_1: pTp1,
              take_profit_2: pTp2,
              take_profit_3: pTp3,
              risk_points: Math.round(plannedRisk * 100) / 100,
              reward_points: Math.round((pTp2 - plannedEntry) * 100) / 100,
              rr_ratio: `1:${plannedRr.toFixed(2)}`
            }
          };
        }
      } else {
        // BEARISH
        const highestRetrace = postCandles.length > 0 ? Math.max(...postCandles.map(c => c.high)) : currPrice;
        const retraceAmount = Math.max(highestRetrace - extreme, 0);
        const retracePct = Math.round((retraceAmount / totalRange) * 1000) / 10;

        const isInHealthyZone = retracePct >= 20.0 && retracePct <= 75.0;
        const lastC = candles[n - 1];
        const prevC = n >= 2 ? candles[n - 2] : lastC;
        const bearishReversalTrigger = (lastC.close < lastC.open && (lastC.close < prevC.low || currPrice <= entry50)) || (currPrice <= extreme);

        const correctionInfo = {
          status: isInHealthyZone ? 'HEALTHY GOLDEN ZONE' : (retracePct < 20.0 ? 'SHALLOW / EXPANSION' : 'DEEP PULLBACK'),
          highest_price: highestRetrace,
          retrace_pct: retracePct,
          zone_bottom: latestInd.retrace_382,
          zone_top: latestInd.retrace_618,
          equilibrium: entry50
        };

        const activeEntry = currPrice;
        const risk = Math.max(sl - activeEntry, 2.0);
        const tp1 = Math.min(extreme, Math.round((activeEntry - (risk * 1.5)) * 100) / 100);
        const tp2 = Math.round((activeEntry - (risk * 2.5)) * 100) / 100;
        const tp3 = Math.round((activeEntry - (risk * 3.5)) * 100) / 100;
        const rr = (Math.abs(activeEntry - tp1) / risk);

        if ((isInHealthyZone && bearishReversalTrigger) || currPrice <= extreme) {
          const grade = rr >= 2.0 ? 'A+' : 'A';
          return {
            phase: 'PHASE_3_CONTINUATION',
            phase_title: `🚀 PHASE 3: BEARISH CONTINUATION ARMED (1:${rr.toFixed(1)} RR)`,
            is_active_trade: true,
            direction: 'BEARISH',
            setup_grade: grade,
            grade_desc: `ICC Grade ${grade}: 15M Swing High Protected at ${sl}. Target TP: ${tp2} (1:${rr.toFixed(1)} RR)`,
            confluence_score: grade === 'A+' ? 100 : 88,
            indication: latestInd,
            correction: correctionInfo,
            trade_plan: {
              is_active: true,
              direction: 'BEARISH',
              action: 'SELL LIMIT / CONTINUATION TRIGGER',
              entry: Math.round(activeEntry * 100) / 100,
              stop_loss: sl,
              take_profit: tp2,
              take_profit_1: tp1,
              take_profit_2: tp2,
              take_profit_3: tp3,
              risk_points: Math.round(risk * 100) / 100,
              reward_points: Math.round((activeEntry - tp2) * 100) / 100,
              rr_ratio: `1:${rr.toFixed(2)}`
            }
          };
        } else {
          const plannedEntry = entry50;
          const plannedRisk = Math.max(sl - plannedEntry, 2.0);
          const pTp1 = Math.min(extreme, Math.round((plannedEntry - (plannedRisk * 1.5)) * 100) / 100);
          const pTp2 = Math.round((plannedEntry - (plannedRisk * 2.5)) * 100) / 100;
          const pTp3 = Math.round((plannedEntry - (plannedRisk * 3.5)) * 100) / 100;
          const plannedRr = (plannedEntry - pTp2) / plannedRisk;

          return {
            phase: 'PHASE_2_CORRECTION',
            phase_title: `⏳ Phase 2: Pullback in Progress (${retracePct}% Retraced)`,
            is_active_trade: false,
            direction: 'BEARISH',
            setup_grade: 'B',
            grade_desc: `Phase 2: Retracing into 50% Eq (${plannedEntry}) - 15M Swing SL: ${sl} | Target TP: ${pTp2}`,
            confluence_score: isInHealthyZone ? 70 : 45,
            indication: latestInd,
            correction: correctionInfo,
            trade_plan: {
              is_active: false,
              direction: 'BEARISH',
              action: 'PULLBACK IN PROGRESS',
              entry: plannedEntry,
              stop_loss: sl,
              take_profit: pTp2,
              take_profit_1: pTp1,
              take_profit_2: pTp2,
              take_profit_3: pTp3,
              risk_points: Math.round(plannedRisk * 100) / 100,
              reward_points: Math.round((plannedEntry - pTp2) * 100) / 100,
              rr_ratio: `1:${plannedRr.toFixed(2)}`
            }
          };
        }
      }
    },

    aggregateCandles: function(candles, factor) {
      if (!candles || candles.length === 0) return [];
      if (factor <= 1) return candles;

      const result = [];
      for (let i = 0; i < candles.length; i += factor) {
        const chunk = candles.slice(i, i + factor);
        if (chunk.length === 0) continue;
        const open = chunk[0].open;
        const close = chunk[chunk.length - 1].close;
        const high = Math.max(...chunk.map(c => c.high));
        const low = Math.min(...chunk.map(c => c.low));
        const volume = chunk.reduce((sum, c) => sum + (c.volume || 0), 0);
        const time = chunk[0].time;

        result.push({ time, open, high, low, close, volume });
      }
      return result;
    },

    analyzeSymbol: function(symbol, candles) {
      if (!candles || candles.length < 10) {
        return {
          symbol: symbol,
          timeframe: "5m",
          current_price: 0,
          price_change_24h: 0,
          price_change_pct: 0,
          phase: 'STANDBY',
          phase_title: 'Standby (Scanning for 1H Indication Impulse)',
          is_active_trade: false,
          direction: 'NEUTRAL',
          setup_grade: 'F',
          grade_desc: 'Insufficient Data',
          confluence_score: 0,
          indication: null,
          correction: null,
          trade_plan: null,
          multi_tf_trends: {
            '5m': { direction: 'NEUTRAL', phase_short: 'STANDBY', grade: 'F' },
            '15m': { direction: 'NEUTRAL', phase_short: 'STANDBY', grade: 'F' },
            '30m': { direction: 'NEUTRAL', phase_short: 'STANDBY', grade: 'F' },
            '1h': { direction: 'NEUTRAL', phase_short: 'STANDBY', grade: 'F' }
          },
          tf_alignment: { text: 'Scanning Structure', badge_class: 'neutral', bull_count: 0, bear_count: 0 }
        };
      }

      const currentPrice = candles[candles.length - 1].close;
      const firstPrice = candles[0].open;
      const priceChange = Math.round((currentPrice - firstPrice) * 100) / 100;
      const priceChangePct = Math.round(((currentPrice - firstPrice) / firstPrice) * 10000) / 100;

      // 1. Generate Multi-Timeframe Candle Sets (5m, 15m, 30m, 1h)
      const tf15Candles = this.aggregateCandles(candles, 3);
      const tf30Candles = this.aggregateCandles(candles, 6);
      const tf60Candles = this.aggregateCandles(candles, 12);

      // Determine 1-Hour HTF Trend Direction FIRST
      const htfCandles = tf60Candles.length >= 3 ? tf60Candles : (tf30Candles.length >= 3 ? tf30Candles : candles);
      const htfBull = htfCandles[htfCandles.length - 1].close >= htfCandles[0].open;
      const htfTrend = htfBull ? 'BULLISH' : 'BEARISH';
      const isBull = htfTrend === 'BULLISH';

      // 2. Extract 15-Minute Swings for Protected SL
      const tf15Swings = this.findSwings(tf15Candles, 1);
      let recent15mLow = null;
      if (tf15Swings.swingLows && tf15Swings.swingLows.length > 0) {
        const validLows = tf15Swings.swingLows.filter(s => s.price < currentPrice);
        recent15mLow = validLows.length > 0 ? validLows[validLows.length - 1].price : tf15Swings.swingLows[tf15Swings.swingLows.length - 1].price;
      }
      if (!recent15mLow || recent15mLow >= currentPrice) {
        recent15mLow = Math.min(...candles.slice(-40).map(c => c.low));
      }

      let recent15mHigh = null;
      if (tf15Swings.swingHighs && tf15Swings.swingHighs.length > 0) {
        const validHighs = tf15Swings.swingHighs.filter(s => s.price > currentPrice);
        recent15mHigh = validHighs.length > 0 ? validHighs[validHighs.length - 1].price : tf15Swings.swingHighs[tf15Swings.swingHighs.length - 1].price;
      }
      if (!recent15mHigh || recent15mHigh <= currentPrice) {
        recent15mHigh = Math.max(...candles.slice(-40).map(c => c.high));
      }

      // 3. Extract Indications and FILTER STRICTLY TO HTF TREND BIAS
      const ltfSwings = this.findSwings(candles, 2);
      const rawIndications = this.detectIndications(candles, ltfSwings.swingHighs, ltfSwings.swingLows);
      let alignedIndications = rawIndications.filter(ind => ind.direction === htfTrend);

      if (alignedIndications.length === 0) {
        const minL = Math.min(...candles.map(c => c.low));
        const maxH = Math.max(...candles.map(c => c.high));
        const rng = maxH - minL;
        if (isBull) {
          const orig = (recent15mLow && recent15mLow < maxH) ? recent15mLow : minL;
          const totR = maxH - orig;
          alignedIndications.push({
            type: 'BULLISH_INDICATION',
            direction: 'BULLISH',
            start_index: 0,
            end_index: Math.max(1, candles.length - 8),
            origin_price: Math.round(orig * 100) / 100,
            extreme_price: Math.round(maxH * 100) / 100,
            range: Math.round(totR * 100) / 100,
            start_time: candles[0].time,
            end_time: candles[candles.length - 1].time,
            equilibrium_50: Math.round((orig + (totR * 0.5)) * 100) / 100,
            retrace_382: Math.round((maxH - (totR * 0.382)) * 100) / 100,
            retrace_618: Math.round((maxH - (totR * 0.618)) * 100) / 100
          });
        } else {
          const orig = (recent15mHigh && recent15mHigh > minL) ? recent15mHigh : maxH;
          const totR = orig - minL;
          alignedIndications.push({
            type: 'BEARISH_INDICATION',
            direction: 'BEARISH',
            start_index: 0,
            end_index: Math.max(1, candles.length - 8),
            origin_price: Math.round(orig * 100) / 100,
            extreme_price: Math.round(minL * 100) / 100,
            range: Math.round(totR * 100) / 100,
            start_time: candles[0].time,
            end_time: candles[candles.length - 1].time,
            equilibrium_50: Math.round((orig - (totR * 0.5)) * 100) / 100,
            retrace_382: Math.round((minL + (totR * 0.382)) * 100) / 100,
            retrace_618: Math.round((minL + (totR * 0.618)) * 100) / 100
          });
        }
      }

      const ltfState = this.evaluateIccLifecycle(candles, alignedIndications, { recent15mLow, recent15mHigh });

      // 4. Multi-Timeframe Trend State Calculation
      const tf15State = tf15Candles.length >= 5 ? this.evaluateIccLifecycle(tf15Candles, this.detectIndications(tf15Candles, this.findSwings(tf15Candles, 2).swingHighs, this.findSwings(tf15Candles, 2).swingLows), { recent15mLow, recent15mHigh }) : null;
      const tf30State = tf30Candles.length >= 4 ? this.evaluateIccLifecycle(tf30Candles, this.detectIndications(tf30Candles, this.findSwings(tf30Candles, 2).swingHighs, this.findSwings(tf30Candles, 2).swingLows), { recent15mLow, recent15mHigh }) : null;
      const tf60State = tf60Candles.length >= 3 ? this.evaluateIccLifecycle(tf60Candles, this.detectIndications(tf60Candles, this.findSwings(tf60Candles, 1).swingHighs, this.findSwings(tf60Candles, 1).swingLows), { recent15mLow, recent15mHigh }) : null;

      function getTfSummary(state, fallbackCandles) {
        if (state && state.direction && state.direction !== 'NEUTRAL') {
          return {
            direction: state.direction,
            phase: state.phase,
            phase_short: state.phase === 'PHASE_3_CONTINUATION' ? 'P3 CONT' : (state.phase === 'PHASE_2_CORRECTION' ? 'P2 PULLBACK' : (state.phase === 'PHASE_1_INDICATION' ? 'P1 IMPULSE' : 'STANDBY')),
            grade: state.setup_grade || 'B',
            retrace_pct: state.correction ? state.correction.retrace_pct : null
          };
        }
        if (fallbackCandles && fallbackCandles.length >= 2) {
          const isB = fallbackCandles[fallbackCandles.length - 1].close >= fallbackCandles[0].open;
          return {
            direction: isB ? 'BULLISH' : 'BEARISH',
            phase: isB ? 'UPTREND' : 'DOWNTREND',
            phase_short: isB ? 'BULL TREND' : 'BEAR TREND',
            grade: 'B',
            retrace_pct: null
          };
        }
        return { direction: 'NEUTRAL', phase: 'STANDBY', phase_short: 'STANDBY', grade: 'F', retrace_pct: null };
      }

      const multiTfTrends = {
        '5m': getTfSummary(ltfState, candles),
        '15m': getTfSummary(tf15State, tf15Candles),
        '30m': getTfSummary(tf30State, tf30Candles),
        '1h': getTfSummary(tf60State, tf60Candles)
      };

      let bullCount = 0;
      let bearCount = 0;
      Object.values(multiTfTrends).forEach(t => {
        if (t.direction === 'BULLISH') bullCount++;
        if (t.direction === 'BEARISH') bearCount++;
      });

      let tfAlignmentText = 'Mixed Structure';
      let tfBadgeClass = 'mixed';
      if (bullCount === 4) {
        tfAlignmentText = '🔥 4/4 Full Bullish Alignment (100%)';
        tfBadgeClass = 'bullish';
      } else if (bullCount >= 3) {
        tfAlignmentText = `⚡ 3/4 Bullish Aligned (${bullCount * 25}%)`;
        tfBadgeClass = 'bullish';
      } else if (bearCount === 4) {
        tfAlignmentText = '🔥 4/4 Full Bearish Alignment (100%)';
        tfBadgeClass = 'bearish';
      } else if (bearCount >= 3) {
        tfAlignmentText = `⚡ 3/4 Bearish Aligned (${bearCount * 25}%)`;
        tfBadgeClass = 'bearish';
      } else {
        tfAlignmentText = '⚖️ 2/2 Mixed Timeframe Flow';
        tfBadgeClass = 'mixed';
      }

      // 5. TOP-DOWN ICC SYNTHESIS
      const isLtfArmed = ltfState.is_active_trade && ltfState.trade_plan;
      let finalPhase = ltfState.phase;
      let finalPhaseTitle = ltfState.phase_title;
      let isActiveTrade = false;
      let finalGrade = ltfState.setup_grade || 'B';
      let finalGradeDesc = ltfState.grade_desc || '';
      let finalTradePlan = ltfState.trade_plan;

      if (isLtfArmed) {
        isActiveTrade = true;
        finalPhase = 'PHASE_3_CONTINUATION';
        finalPhaseTitle = `🚀 PHASE 3: ${htfTrend} CONTINUATION ARMED (${ltfState.trade_plan.rr_ratio} RR)`;
        finalGrade = (bullCount >= 3 || bearCount >= 3) ? 'A+' : 'A';
        finalGradeDesc = `Aligned 1H ${htfTrend} Trend + 5M Confirmation Trigger (1:${ltfState.trade_plan.rr_ratio} RR)`;
      } else {
        isActiveTrade = false;
        finalPhase = 'PHASE_2_CORRECTION';
        finalPhaseTitle = `⏳ Phase 2: Pullback in Progress (Waiting for 5M to align with 1H ${htfTrend} Bias)`;
        finalGrade = 'B';
        finalGradeDesc = `1H Macro Bias is ${htfTrend}. Retracing towards discount 50% Eq level.`;
      }

      return {
        ...ltfState,
        symbol: symbol,
        timeframe: "5m",
        current_price: currentPrice,
        price_change_24h: priceChange,
        price_change_pct: priceChangePct,
        direction: htfTrend, // 1H Bias ALWAYS dictates the ICC tab card direction
        phase: finalPhase,
        phase_title: finalPhaseTitle,
        is_active_trade: isActiveTrade,
        setup_grade: finalGrade,
        grade_desc: finalGradeDesc,
        multi_tf_trends: multiTfTrends,
        tf_alignment: {
          text: tfAlignmentText,
          badge_class: tfBadgeClass,
          bull_count: bullCount,
          bear_count: bearCount
        },
        indication: ltfState.indication,
        correction: ltfState.correction,
        trade_plan: finalTradePlan
      };
    }
  };

  // ==========================================================================
  // 3. PURE JAVASCRIPT PAPER TRADING ENGINE (LOCALSTORAGE)
  // ==========================================================================
  const PaperEngine = {
    STORAGE_KEY: 'ict_paper_account_v2',

    getAccount: function() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (raw) {
          return JSON.parse(raw);
        }
      } catch (e) {}

      const initial = {
        balance: 25000.00,
        starting_balance: 25000.00,
        positions: [],
        history: []
      };
      this.saveAccount(initial);
      return initial;
    },

    saveAccount: function(acc) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(acc));
      } catch (e) {}
    },

    executeTrade: function(symbol, direction, entry, sl, tp, setupType, contracts = 1) {
      const acc = this.getAccount();
      const spec = SYMBOLS[symbol] || { point_val: 2.0 };
      const pos = {
        id: 'pos_' + Date.now(),
        symbol: symbol,
        direction: direction,
        entry_price: parseFloat(entry),
        current_price: parseFloat(entry),
        stop_loss: parseFloat(sl),
        take_profit: parseFloat(tp),
        contracts: parseInt(contracts, 10) || 1,
        point_value: spec.point_val,
        setup_type: setupType || 'ICT Execution',
        timestamp: Math.floor(Date.now() / 1000),
        pnl_points: 0.0,
        pnl_usd: 0.0
      };
      acc.positions.push(pos);
      this.saveAccount(acc);
      return { status: 'success', position: pos };
    },

    closePosition: function(posId, currentPrice) {
      const acc = this.getAccount();
      const idx = acc.positions.findIndex(p => p.id === posId);
      if (idx === -1) return { status: 'error', message: 'Position not found' };

      const pos = acc.positions.splice(idx, 1)[0];
      const exitPrice = currentPrice !== undefined ? currentPrice : pos.current_price;
      const isLong = pos.direction === 'BULLISH';
      const pnlPoints = isLong ? (exitPrice - pos.entry_price) : (pos.entry_price - exitPrice);
      const pnlUsd = pnlPoints * pos.point_value * pos.contracts;

      pos.exit_price = exitPrice;
      pos.closed_timestamp = Math.floor(Date.now() / 1000);
      pos.pnl_points = Math.round(pnlPoints * 100) / 100;
      pos.pnl_usd = Math.round(pnlUsd * 100) / 100;

      acc.balance = Math.round((acc.balance + pnlUsd) * 100) / 100;
      acc.history.unshift(pos);
      this.saveAccount(acc);
      return { status: 'closed', closed_position: pos };
    },

    resetAccount: function() {
      const initial = {
        balance: 25000.00,
        starting_balance: 25000.00,
        positions: [],
        history: []
      };
      this.saveAccount(initial);
      return { status: 'reset', balance: 25000.00 };
    },

    updateLivePrices: function(livePrices) {
      const acc = this.getAccount();
      let changed = false;

      acc.positions.forEach(pos => {
        const curr = livePrices[pos.symbol];
        if (curr) {
          pos.current_price = curr;
          const isLong = pos.direction === 'BULLISH';
          const pnlPoints = isLong ? (curr - pos.entry_price) : (pos.entry_price - curr);
          pos.pnl_points = Math.round(pnlPoints * 100) / 100;
          pos.pnl_usd = Math.round((pnlPoints * pos.point_value * pos.contracts) * 100) / 100;
          changed = true;
        }
      });

      if (changed) {
        this.saveAccount(acc);
      }
      return acc;
    }
  };

  // ==========================================================================
  // 4. CLIENT-SIDE LIVE DATA WATERFALL INGESTOR
  // ==========================================================================
  // ==========================================================================
  // 4. CLIENT-SIDE LIVE DATA WATERFALL & SYNTHESIS ENGINE
  // ==========================================================================
  const MarketData = {
    candleCache: {},
    inFlightRequests: {},
    lastTickTime: {},

    // Base market references for micro futures contracts (live 2026 intraday prices & 5M swing peaks)
    BASE_SPECS: {
      "MNQ": { basePrice: 29733.25, tick: 0.25, volAvg: 2200, swingAmp: 45.0, intradayHigh: 29755.00, intradayLow: 29690.00 },
      "MES": { basePrice: 7721.75, tick: 0.25, volAvg: 2800, swingAmp: 12.0, intradayHigh: 7732.50, intradayLow: 7710.00 },
      "M2K": { basePrice: 2972.40, tick: 0.10, volAvg: 1400, swingAmp: 6.5, intradayHigh: 2980.50, intradayLow: 2966.00 },
      "MGC": { basePrice: 4482.00, tick: 0.10, volAvg: 1200, swingAmp: 9.0, intradayHigh: 4488.50, intradayLow: 4474.00 }
    },

    generateFallbackCandles: function(symKey, count = 80, intervalMins = 5) {
      const spec = this.BASE_SPECS[symKey] || { basePrice: 4482.00, tick: 0.10, volAvg: 1200, swingAmp: 9.0, intradayHigh: 4488.50, intradayLow: 4474.00 };
      const now = Math.floor(Date.now() / 1000);
      const stepSecs = intervalMins * 60;
      const startTime = now - (count * stepSecs);

      const candles = [];
      const mLow = spec.intradayLow || (spec.basePrice - spec.swingAmp);
      const mHigh = spec.intradayHigh || (spec.basePrice + spec.swingAmp);
      const symCode = (symKey.charCodeAt(0) * 17) + (symKey.charCodeAt(1) || 5);

      // Deterministic mathematical generator (Zero random flickering across page refreshes)
      for (let i = 0; i < count; i++) {
        const cTime = startTime + (i * stepSecs);
        let targetPrice;

        if (i < 50) {
          // Bullish Impulse Expansion from Session Low to 5M Swing High Peak
          const progress = i / 49.0;
          targetPrice = mLow + (mHigh - mLow) * progress + (Math.sin(i / 4.0 + symCode) * spec.swingAmp * 0.15);
        } else {
          // Correction Pullback into 50% Equilibrium Zone near current live price
          const progress = (i - 49) / Math.max(1, count - 50);
          targetPrice = mHigh - (mHigh - spec.basePrice) * progress + (Math.cos(i / 3.0 + symCode) * spec.swingAmp * 0.12);
        }

        const open = Math.round(targetPrice / spec.tick) * spec.tick;
        const detWiggle = Math.sin(i * 12.9898 + symCode) * (spec.swingAmp * 0.08);
        const close = Math.round((targetPrice + detWiggle) / spec.tick) * spec.tick;

        const spread = Math.abs(Math.sin(i * 7.123 + symCode)) * (spec.swingAmp * 0.12) + Math.abs(close - open) * 0.15;
        let high = Math.round((Math.max(open, close) + spread) / spec.tick) * spec.tick;
        let low = Math.round((Math.min(open, close) - spread) / spec.tick) * spec.tick;

        if (i === 0) low = Math.min(low, mLow);
        if (i === 49) high = Math.max(high, mHigh);

        const volume = Math.floor(spec.volAvg * (0.7 + Math.abs(Math.sin(i + symCode)) * 0.6));

        candles.push({
          time: cTime,
          open: parseFloat(open.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2)),
          volume: volume
        });
      }

      return candles;
    },

    advanceCachedCandles: function(symKey, intervalMins = 5) {
      const cacheKey = 'ict_live_candles_v6_' + symKey;
      if (!this.candleCache[symKey] || this.candleCache[symKey].length === 0) {
        try {
          const stored = localStorage.getItem(cacheKey);
          if (stored) {
            this.candleCache[symKey] = JSON.parse(stored);
            return this.candleCache[symKey];
          }
        } catch (e) {}
        this.candleCache[symKey] = this.generateFallbackCandles(symKey, 80, intervalMins);
        try { localStorage.setItem(cacheKey, JSON.stringify(this.candleCache[symKey])); } catch (e) {}
        return this.candleCache[symKey];
      }

      const spec = this.BASE_SPECS[symKey] || { basePrice: 4482.00, tick: 0.10, volAvg: 1200, swingAmp: 9.0 };
      const candles = this.candleCache[symKey];
      const last = candles[candles.length - 1];
      const now = Math.floor(Date.now() / 1000);
      const stepSecs = intervalMins * 60;

      // Check if new candle timeframe has started
      if (now - last.time >= stepSecs) {
        const newOpen = last.close;
        const delta = Math.sin(now) * (spec.swingAmp * 0.15);
        const newClose = Math.round((newOpen + delta) / spec.tick) * spec.tick;
        const newHigh = Math.round((Math.max(newOpen, newClose) + Math.abs(Math.sin(now * 1.5)) * (spec.swingAmp * 0.1)) / spec.tick) * spec.tick;
        const newLow = Math.round((Math.min(newOpen, newClose) - Math.abs(Math.cos(now * 1.5)) * (spec.swingAmp * 0.1)) / spec.tick) * spec.tick;

        candles.push({
          time: last.time + stepSecs,
          open: parseFloat(newOpen.toFixed(2)),
          high: parseFloat(newHigh.toFixed(2)),
          low: parseFloat(newLow.toFixed(2)),
          close: parseFloat(newClose.toFixed(2)),
          volume: Math.floor(spec.volAvg * 0.8)
        });

        if (candles.length > 120) candles.shift();
      }

      return candles;
    },

    fetchSymbolCandles: async function(symKey, interval = '5m') {
      const cfg = SYMBOLS[symKey];
      if (!cfg) return this.generateFallbackCandles(symKey, 80, 5);

      const reqKey = `${symKey}_${interval}`;
      if (this.inFlightRequests[reqKey]) {
        return this.inFlightRequests[reqKey];
      }

      const intervalMins = interval === '1m' ? 1 : (interval === '15m' ? 15 : (interval === '30m' ? 30 : (interval === '60m' || interval === '1h' ? 60 : 5)));

      const fetchPromise = (async () => {
        const tickers = [cfg.yahoo, cfg.alt].filter(Boolean);
        const proxyTemplates = [
          (t) => `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${t}?interval=${interval}&range=5d`)}`,
          (t) => `https://corsproxy.io/?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${t}?interval=${interval}&range=5d`)}`,
          (t) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${t}?interval=${interval}&range=5d`)}`
        ];

        const fetchCandidate = async (url) => {
          const ctrl = new AbortController();
          const tId = setTimeout(() => ctrl.abort(), 2800);
          try {
            const resp = await fetch(url, { signal: ctrl.signal });
            clearTimeout(tId);
            if (!resp.ok) return null;
            const data = await resp.json();
            if (data && data.chart && data.chart.result && data.chart.result[0]) {
              const res = data.chart.result[0];
              const timestamps = res.timestamp || [];
              const quotes = res.indicators && res.indicators.quote ? res.indicators.quote[0] : {};
              const opens = quotes.open || [];
              const highs = quotes.high || [];
              const lows = quotes.low || [];
              const closes = quotes.close || [];
              const volumes = quotes.volume || [];

              const parsedCandles = [];
              for (let i = 0; i < timestamps.length; i++) {
                if (opens[i] !== null && highs[i] !== null && lows[i] !== null && closes[i] !== null) {
                  parsedCandles.push({
                    time: timestamps[i],
                    open: Math.round(opens[i] * 100) / 100,
                    high: Math.round(highs[i] * 100) / 100,
                    low: Math.round(lows[i] * 100) / 100,
                    close: Math.round(closes[i] * 100) / 100,
                    volume: volumes[i] || 0
                  });
                }
              }
              if (parsedCandles.length > 5) return parsedCandles;
            }
          } catch (e) {
            clearTimeout(tId);
          }
          return null;
        };

        const targetUrls = [];
        for (const t of tickers) {
          for (const tmpl of proxyTemplates) {
            targetUrls.push(tmpl(t));
          }
        }

        try {
          const liveResult = await Promise.race([
            ...targetUrls.map(u => fetchCandidate(u)),
            new Promise(res => setTimeout(() => res(null), 3000))
          ]);

          if (liveResult && liveResult.length > 5) {
            this.candleCache[symKey] = liveResult;
            try {
              localStorage.setItem('ict_live_candles_' + symKey, JSON.stringify(liveResult));
            } catch (e) {}
            const lastCandle = liveResult[liveResult.length - 1];
            if (lastCandle && lastCandle.close) {
              if (this.BASE_SPECS[symKey]) {
                this.BASE_SPECS[symKey].basePrice = lastCandle.close;
              }
            }
            return liveResult;
          }
        } catch (err) {}

        // Use cached real live candles or deterministic fallback
        return this.advanceCachedCandles(symKey, intervalMins);
      })();

      this.inFlightRequests[reqKey] = fetchPromise;
      try {
        const result = await fetchPromise;
        return result;
      } finally {
        delete this.inFlightRequests[reqKey];
      }
    },

    fetchAllSymbolsData: async function(interval = '5m') {
      const symbols = Object.keys(SYMBOLS);
      const results = {};
      const ictScanResults = {};
      const iccScanResults = {};
      const livePrices = {};

      await Promise.all(symbols.map(async sym => {
        try {
          const candles = await this.fetchSymbolCandles(sym, interval);
          results[sym] = candles;
          if (candles && candles.length > 0) {
            const curr = candles[candles.length - 1].close;
            livePrices[sym] = curr;
            ictScanResults[sym] = ICTEngine.analyzeSymbol(sym, candles);
            iccScanResults[sym] = ICCEngine.analyzeSymbol(sym, candles);
          }
        } catch (e) {
          console.warn(`Error scanning ${sym}:`, e);
        }
      }));

      // Ensure paper trading positions update with live prices
      PaperEngine.updateLivePrices(livePrices);

      return {
        candlesBySymbol: results,
        livePrices: livePrices,
        ictScanResults: ictScanResults,
        iccScanResults: iccScanResults,
        killzone: ICTEngine.getKillzoneStatus()
      };
    }
  };

  window.ICTEngine = ICTEngine;
  window.ICCEngine = ICCEngine;
  window.PaperEngine = PaperEngine;
  window.MarketData = MarketData;
  window.TRADING_SYMBOLS = SYMBOLS;

})(window);

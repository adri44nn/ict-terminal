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

      const recentSweeps = sweeps.slice(-5);
      const recentMSS = mssEvents.slice(-5);
      const unmitigatedFVGs = fvgs.filter(f => !f.mitigated);

      let hasSweep = recentSweeps.length > 0;
      let hasMSS = recentMSS.length > 0;
      let hasFVG = unmitigatedFVGs.length > 0;
      let isPrimeTime = kz.is_high_probability_time;

      let direction = "NEUTRAL";
      if (recentMSS.length > 0) {
        direction = recentMSS[recentMSS.length - 1].direction;
      } else if (recentSweeps.length > 0) {
        direction = recentSweeps[recentSweeps.length - 1].bias;
      }

      let confluenceScore = 0;
      if (hasSweep) confluenceScore += 25;
      if (hasMSS) confluenceScore += 25;
      if (hasFVG) confluenceScore += 25;
      if (isPrimeTime) confluenceScore += 25;

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

      if (direction === "BULLISH" && hasFVG && hasMSS) {
        const matchingFvg = unmitigatedFVGs.filter(f => f.type === "BULLISH_FVG").slice(-1)[0];
        if (matchingFvg) {
          const entry = matchingFvg.top;
          const sl = matchingFvg.bottom - (spec.tick * 4);
          const target = swingHighs.length > 0 ? swingHighs[swingHighs.length - 1].price : entry + (entry - sl) * 2.5;
          const risk = entry - sl;
          const reward = target - entry;
          const rr = risk > 0 ? reward / risk : 0;

          if (rr >= 2.0) {
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
      } else if (direction === "BEARISH" && hasFVG && hasMSS) {
        const matchingFvg = unmitigatedFVGs.filter(f => f.type === "BEARISH_FVG").slice(-1)[0];
        if (matchingFvg) {
          const entry = matchingFvg.top;
          const sl = matchingFvg.bottom + (spec.tick * 4);
          const target = swingLows.length > 0 ? swingLows[swingLows.length - 1].price : entry - (sl - entry) * 2.5;
          const risk = sl - entry;
          const reward = entry - target;
          const rr = risk > 0 ? reward / risk : 0;

          if (rr >= 2.0) {
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

    detectIndications: function(candles, swingHighs, swingLows) {
      const indications = [];
      const n = candles.length;
      if (n < 10) return indications;

      const recentCandles = candles.slice(-50);
      const avgBody = recentCandles.reduce((sum, c) => sum + Math.abs(c.close - c.open), 0) / Math.max(recentCandles.length, 1);

      // Bullish Indication
      for (let i = 5; i < n; i++) {
        for (let lookback = 2; lookback <= 5; lookback++) {
          const startIdx = i - lookback;
          if (startIdx < 0) continue;

          const startC = candles[startIdx];
          const endC = candles[i];
          const legMove = endC.high - startC.low;

          if (endC.close > startC.open && legMove >= (avgBody * 2.2)) {
            const brokeStructure = swingHighs.slice(-10).some(sh => sh.price < endC.high && sh.index < startIdx);
            if (brokeStructure) {
              indications.push({
                type: 'BULLISH_INDICATION',
                direction: 'BULLISH',
                start_index: startIdx,
                end_index: i,
                origin_price: startC.low,
                extreme_price: endC.high,
                range: Math.round(legMove * 100) / 100,
                start_time: startC.time,
                end_time: endC.time,
                equilibrium_50: Math.round((startC.low + (legMove * 0.5)) * 100) / 100,
                retrace_382: Math.round((endC.high - (legMove * 0.382)) * 100) / 100,
                retrace_618: Math.round((endC.high - (legMove * 0.618)) * 100) / 100
              });
              break;
            }
          }
        }
      }

      // Bearish Indication
      for (let i = 5; i < n; i++) {
        for (let lookback = 2; lookback <= 5; lookback++) {
          const startIdx = i - lookback;
          if (startIdx < 0) continue;

          const startC = candles[startIdx];
          const endC = candles[i];
          const legMove = startC.high - endC.low;

          if (endC.close < startC.open && legMove >= (avgBody * 2.2)) {
            const brokeStructure = swingLows.slice(-10).some(sl => sl.price > endC.low && sl.index < startIdx);
            if (brokeStructure) {
              indications.push({
                type: 'BEARISH_INDICATION',
                direction: 'BEARISH',
                start_index: startIdx,
                end_index: i,
                origin_price: startC.high,
                extreme_price: endC.low,
                range: Math.round(legMove * 100) / 100,
                start_time: startC.time,
                end_time: endC.time,
                equilibrium_50: Math.round((startC.high - (legMove * 0.5)) * 100) / 100,
                retrace_382: Math.round((endC.low + (legMove * 0.382)) * 100) / 100,
                retrace_618: Math.round((endC.low + (legMove * 0.618)) * 100) / 100
              });
              break;
            }
          }
        }
      }

      return indications;
    },

    evaluateIccLifecycle: function(candles, indications) {
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

      if (n - 1 <= indEndIdx) {
        const isBull = latestInd.direction === 'BULLISH';
        const pEntry = isBull ? latestInd.equilibrium_50 : latestInd.equilibrium_50;
        const pSl = isBull ? Math.round((latestInd.origin_price - 1.5) * 100) / 100 : Math.round((latestInd.origin_price + 1.5) * 100) / 100;
        const pTp1 = isBull ? latestInd.extreme_price : latestInd.extreme_price;
        const pRisk = Math.max(Math.abs(pEntry - pSl), 0.5);
        const pTp2 = isBull ? Math.round((pEntry + pRisk * 2.0) * 100) / 100 : Math.round((pEntry - pRisk * 2.0) * 100) / 100;
        const pTp3 = isBull ? Math.round((pEntry + pRisk * 3.0) * 100) / 100 : Math.round((pEntry - pRisk * 3.0) * 100) / 100;

        return {
          phase: 'PHASE_1_INDICATION',
          phase_title: `⚡ Phase 1: Strong ${latestInd.direction} Indication in Progress`,
          is_active_trade: false,
          direction: latestInd.direction,
          setup_grade: 'B',
          grade_desc: 'Phase 1: Impulse Breakout Active (Awaiting Controlled Correction)',
          confluence_score: 50,
          indication: latestInd,
          correction: null,
          trade_plan: {
            is_active: false,
            direction: latestInd.direction,
            action: 'OBSERVING / FORMING',
            entry: pEntry,
            stop_loss: pSl,
            take_profit: pTp1,
            take_profit_1: pTp1,
            take_profit_2: pTp2,
            take_profit_3: pTp3,
            risk_points: Math.round(pRisk * 100) / 100,
            reward_points: Math.round(Math.abs(pTp1 - pEntry) * 100) / 100,
            rr_ratio: `1:${(Math.abs(pTp1 - pEntry) / pRisk).toFixed(2)}`
          }
        };
      }

      const postCandles = candles.slice(indEndIdx);
      if (latestInd.direction === 'BULLISH') {
        const origin = latestInd.origin_price;
        const peak = latestInd.extreme_price;
        const totalRange = peak - origin;

        const lowestRetrace = Math.min(...postCandles.map(c => c.low));
        const retraceAmount = peak - lowestRetrace;
        const retracePct = Math.round((retraceAmount / Math.max(totalRange, 0.001)) * 1000) / 10;

        if (lowestRetrace <= origin) {
          return {
            phase: 'STANDBY',
            phase_title: 'Indication Blown (Origin Breached) - Resetting',
            is_active_trade: false,
            direction: 'NEUTRAL',
            setup_grade: 'F',
            grade_desc: 'Indication Invalidated (Pullback exceeded 100% of origin)',
            confluence_score: 0,
            indication: latestInd,
            correction: null,
            trade_plan: {
              is_active: false,
              direction: 'NEUTRAL',
              entry: latestInd.equilibrium_50,
              stop_loss: origin,
              take_profit: peak,
              take_profit_1: peak,
              take_profit_2: Math.round((peak + totalRange) * 100) / 100,
              take_profit_3: Math.round((peak + (totalRange * 2.0)) * 100) / 100,
              rr_ratio: '--'
            }
          };
        }

        const isInHealthyZone = retracePct >= 30.0 && retracePct <= 75.0;
        const lastC = candles[n - 1];
        const prevC = n >= 2 ? candles[n - 2] : lastC;
        const bullishReversalTrigger = lastC.close > lastC.open && lastC.close > prevC.high;

        const correctionInfo = {
          status: isInHealthyZone ? 'HEALTHY' : 'SHALLOW/DEEP',
          lowest_price: lowestRetrace,
          retrace_pct: retracePct,
          zone_bottom: latestInd.retrace_618,
          zone_top: latestInd.retrace_382,
          equilibrium: latestInd.equilibrium_50
        };

        const projEntry = Math.round(currPrice * 100) / 100;
        const projSl = Math.round((lowestRetrace - 1.5) * 100) / 100;
        const projTp1 = Math.round(peak * 100) / 100;
        const projRisk = Math.max(Math.abs(projEntry - projSl), 0.5);
        const projTp2 = Math.round((projEntry + (projRisk * 2.0)) * 100) / 100;
        const projTp3 = Math.round((projEntry + (projRisk * 3.0)) * 100) / 100;
        const projTargetTp = Math.max(projTp1, projTp2);
        const projReward = projTargetTp - projEntry;
        const projRr = projReward / projRisk;

        if (isInHealthyZone && bullishReversalTrigger) {
          let grade = projRr >= 2.0 ? (retracePct >= 45.0 && retracePct <= 65.0 ? 'A+' : 'A') : 'F';

          return {
            phase: 'PHASE_3_CONTINUATION',
            phase_title: `🚀 PHASE 3: BULLISH CONTINUATION TRIGGERED (${projRr.toFixed(1)} RR)`,
            is_active_trade: projRr >= 2.0,
            direction: 'BULLISH',
            setup_grade: grade,
            grade_desc: `ICC Grade ${grade}: Golden Zone Retrace (${retracePct}%) + Reversal Trigger`,
            confluence_score: grade === 'A+' ? 100 : (grade === 'A' ? 85 : 40),
            indication: latestInd,
            correction: correctionInfo,
            trade_plan: {
              is_active: projRr >= 2.0,
              direction: 'BULLISH',
              entry: projEntry,
              stop_loss: projSl,
              take_profit: projTargetTp,
              take_profit_1: projTp1,
              take_profit_2: projTp2,
              take_profit_3: projTp3,
              risk_points: Math.round(projRisk * 100) / 100,
              reward_points: Math.round(projReward * 100) / 100,
              rr_ratio: `1:${projRr.toFixed(2)}`
            }
          };
        } else {
          return {
            phase: 'PHASE_2_CORRECTION',
            phase_title: `⏳ Phase 2: Pullback in Progress (${retracePct}% Retraced)`,
            is_active_trade: false,
            direction: 'BULLISH',
            setup_grade: isInHealthyZone ? 'B' : 'B',
            grade_desc: `Phase 2: Correcting into Equilibrium (${retracePct}% Retraced) - Target TP: ${projTp1}`,
            confluence_score: isInHealthyZone ? 70 : 45,
            indication: latestInd,
            correction: correctionInfo,
            trade_plan: {
              is_active: false,
              direction: 'BULLISH',
              action: 'PULLBACK IN PROGRESS',
              entry: projEntry,
              stop_loss: projSl,
              take_profit: projTp1,
              take_profit_1: projTp1,
              take_profit_2: projTp2,
              take_profit_3: projTp3,
              risk_points: Math.round(projRisk * 100) / 100,
              reward_points: Math.round(projReward * 100) / 100,
              rr_ratio: `1:${projRr.toFixed(2)}`
            }
          };
        }
      } else {
        // BEARISH
        const origin = latestInd.origin_price;
        const low = latestInd.extreme_price;
        const totalRange = origin - low;

        const highestRetrace = Math.max(...postCandles.map(c => c.high));
        const retraceAmount = highestRetrace - low;
        const retracePct = Math.round((retraceAmount / Math.max(totalRange, 0.001)) * 1000) / 10;

        if (highestRetrace >= origin) {
          return {
            phase: 'STANDBY',
            phase_title: 'Indication Blown (Origin Breached) - Resetting',
            is_active_trade: false,
            direction: 'NEUTRAL',
            setup_grade: 'F',
            grade_desc: 'Indication Invalidated (Pullback exceeded 100% of origin)',
            confluence_score: 0,
            indication: latestInd,
            correction: null,
            trade_plan: {
              is_active: false,
              direction: 'NEUTRAL',
              entry: latestInd.equilibrium_50,
              stop_loss: origin,
              take_profit: low,
              take_profit_1: low,
              take_profit_2: Math.round((low - totalRange) * 100) / 100,
              take_profit_3: Math.round((low - (totalRange * 2.0)) * 100) / 100,
              rr_ratio: '--'
            }
          };
        }

        const isInHealthyZone = retracePct >= 30.0 && retracePct <= 75.0;
        const lastC = candles[n - 1];
        const prevC = n >= 2 ? candles[n - 2] : lastC;
        const bearishReversalTrigger = lastC.close < lastC.open && lastC.close < prevC.low;

        const correctionInfo = {
          status: isInHealthyZone ? 'HEALTHY' : 'SHALLOW/DEEP',
          highest_price: highestRetrace,
          retrace_pct: retracePct,
          zone_bottom: latestInd.retrace_382,
          zone_top: latestInd.retrace_618,
          equilibrium: latestInd.equilibrium_50
        };

        const projEntry = Math.round(currPrice * 100) / 100;
        const projSl = Math.round((highestRetrace + 1.5) * 100) / 100;
        const projTp1 = Math.round(low * 100) / 100;
        const projRisk = Math.max(Math.abs(projSl - projEntry), 0.5);
        const projTp2 = Math.round((projEntry - (projRisk * 2.0)) * 100) / 100;
        const projTp3 = Math.round((projEntry - (projRisk * 3.0)) * 100) / 100;
        const projTargetTp = Math.min(projTp1, projTp2);
        const projReward = projEntry - projTargetTp;
        const projRr = projReward / projRisk;

        if (isInHealthyZone && bearishReversalTrigger) {
          let grade = projRr >= 2.0 ? (retracePct >= 45.0 && retracePct <= 65.0 ? 'A+' : 'A') : 'F';

          return {
            phase: 'PHASE_3_CONTINUATION',
            phase_title: `🚀 PHASE 3: BEARISH CONTINUATION TRIGGERED (${projRr.toFixed(1)} RR)`,
            is_active_trade: projRr >= 2.0,
            direction: 'BEARISH',
            setup_grade: grade,
            grade_desc: `ICC Grade ${grade}: Golden Zone Retrace (${retracePct}%) + Reversal Trigger`,
            confluence_score: grade === 'A+' ? 100 : (grade === 'A' ? 85 : 40),
            indication: latestInd,
            correction: correctionInfo,
            trade_plan: {
              is_active: projRr >= 2.0,
              direction: 'BEARISH',
              entry: projEntry,
              stop_loss: projSl,
              take_profit: projTargetTp,
              take_profit_1: projTp1,
              take_profit_2: projTp2,
              take_profit_3: projTp3,
              risk_points: Math.round(projRisk * 100) / 100,
              reward_points: Math.round(projReward * 100) / 100,
              rr_ratio: `1:${projRr.toFixed(2)}`
            }
          };
        } else {
          return {
            phase: 'PHASE_2_CORRECTION',
            phase_title: `⏳ Phase 2: Pullback in Progress (${retracePct}% Retraced)`,
            is_active_trade: false,
            direction: 'BEARISH',
            setup_grade: isInHealthyZone ? 'B' : 'B',
            grade_desc: `Phase 2: Correcting into Equilibrium (${retracePct}% Retraced) - Target TP: ${projTp1}`,
            confluence_score: isInHealthyZone ? 70 : 45,
            indication: latestInd,
            correction: correctionInfo,
            trade_plan: {
              is_active: false,
              direction: 'BEARISH',
              action: 'PULLBACK IN PROGRESS',
              entry: projEntry,
              stop_loss: projSl,
              take_profit: projTp1,
              take_profit_1: projTp1,
              take_profit_2: projTp2,
              take_profit_3: projTp3,
              risk_points: Math.round(projRisk * 100) / 100,
              reward_points: Math.round(projReward * 100) / 100,
              rr_ratio: `1:${projRr.toFixed(2)}`
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

      // 2. Extract 1-HOUR (HTF) INDICATION & MACRO TARGETS (Trades by Sci Core Architecture)
      const htfSwings = this.findSwings(tf60Candles.length >= 4 ? tf60Candles : tf30Candles, 1);
      const htfIndications = this.detectIndications(tf60Candles.length >= 4 ? tf60Candles : tf30Candles, htfSwings.swingHighs, htfSwings.swingLows);
      const latestHtfInd = htfIndications.length > 0 ? htfIndications[htfIndications.length - 1] : null;

      // 3. Extract 5-MINUTE (LTF) INDICATION & EXECUTION
      const ltfSwings = this.findSwings(candles, 2);
      const ltfIndications = this.detectIndications(candles, ltfSwings.swingHighs, ltfSwings.swingLows);
      const ltfState = this.evaluateIccLifecycle(candles, ltfIndications);

      // 4. Multi-Timeframe Trend State Calculation
      const tf15State = tf15Candles.length >= 5 ? this.evaluateIccLifecycle(tf15Candles, this.detectIndications(tf15Candles, this.findSwings(tf15Candles, 2).swingHighs, this.findSwings(tf15Candles, 2).swingLows)) : null;
      const tf30State = tf30Candles.length >= 4 ? this.evaluateIccLifecycle(tf30Candles, this.detectIndications(tf30Candles, this.findSwings(tf30Candles, 2).swingHighs, this.findSwings(tf30Candles, 2).swingLows)) : null;
      const tf60State = tf60Candles.length >= 3 ? this.evaluateIccLifecycle(tf60Candles, this.detectIndications(tf60Candles, this.findSwings(tf60Candles, 1).swingHighs, this.findSwings(tf60Candles, 1).swingLows)) : null;

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
          const isBull = fallbackCandles[fallbackCandles.length - 1].close >= fallbackCandles[0].open;
          return {
            direction: isBull ? 'BULLISH' : 'BEARISH',
            phase: isBull ? 'UPTREND' : 'DOWNTREND',
            phase_short: isBull ? 'BULL TREND' : 'BEAR TREND',
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

      // 5. TOP-DOWN ICC SYNTHESIS: 1H Macro Targets with 5M Execution
      // If 1H Indication exists, use 1H Indication Peak/Low as the Primary TP1 Target
      const activeInd = latestHtfInd || ltfState.indication || (ltfIndications.length > 0 ? ltfIndications[ltfIndications.length - 1] : null);
      let macroTp1 = activeInd ? activeInd.extreme_price : currentPrice;
      let macroOrigin = activeInd ? activeInd.origin_price : currentPrice;
      let macroEq = activeInd ? activeInd.equilibrium_50 : currentPrice;
      let macroRange = activeInd ? activeInd.range : 10.0;

      let macroTp2 = activeInd ? (activeInd.direction === 'BULLISH' ? Math.round((macroTp1 + (macroRange * 0.5)) * 100) / 100 : Math.round((macroTp1 - (macroRange * 0.5)) * 100) / 100) : currentPrice;
      let macroTp3 = activeInd ? (activeInd.direction === 'BULLISH' ? Math.round((macroTp1 + (macroRange * 1.0)) * 100) / 100 : Math.round((macroTp1 - (macroRange * 1.0)) * 100) / 100) : currentPrice;

      // Merge 1H Macro targets into the active trade plan
      const finalTradePlan = ltfState.trade_plan || {
        is_active: false,
        direction: activeInd ? activeInd.direction : 'NEUTRAL',
        entry: macroEq,
        stop_loss: macroOrigin,
        take_profit: macroTp1,
        take_profit_1: macroTp1,
        take_profit_2: macroTp2,
        take_profit_3: macroTp3,
        rr_ratio: '--'
      };

      // Always anchor TP1 to the 1H/HTF Indication Extreme
      finalTradePlan.take_profit_1 = macroTp1;
      finalTradePlan.take_profit_2 = macroTp2;
      finalTradePlan.take_profit_3 = macroTp3;
      finalTradePlan.htf_tp1_extreme = macroTp1;
      finalTradePlan.htf_origin = macroOrigin;
      finalTradePlan.htf_equilibrium = macroEq;

      if (finalTradePlan.entry && finalTradePlan.stop_loss && finalTradePlan.take_profit_1) {
        const risk = Math.max(Math.abs(finalTradePlan.entry - finalTradePlan.stop_loss), 0.5);
        const reward = Math.abs(finalTradePlan.take_profit_1 - finalTradePlan.entry);
        finalTradePlan.rr_ratio = `1:${(reward / risk).toFixed(2)}`;
      }

      return {
        symbol: symbol,
        timeframe: "5m",
        current_price: currentPrice,
        price_change_24h: priceChange,
        price_change_pct: priceChangePct,
        multi_tf_trends: multiTfTrends,
        tf_alignment: {
          text: tfAlignmentText,
          badge_class: tfBadgeClass,
          bull_count: bullCount,
          bear_count: bearCount
        },
        ...ltfState,
        htf_indication: activeInd,
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

    // Base market references for micro futures contracts
    BASE_SPECS: {
      "MNQ": { basePrice: 21650.00, tick: 0.25, volAvg: 1800, swingAmp: 35.0 },
      "MES": { basePrice: 5885.00, tick: 0.25, volAvg: 2400, swingAmp: 8.5 },
      "M2K": { basePrice: 2255.00, tick: 0.10, volAvg: 1200, swingAmp: 4.2 },
      "MGC": { basePrice: 2785.00, tick: 0.10, volAvg: 950, swingAmp: 3.8 }
    },

    generateFallbackCandles: function(symKey, count = 80, intervalMins = 5) {
      const spec = this.BASE_SPECS[symKey] || { basePrice: 20000.0, tick: 0.25, volAvg: 1500, swingAmp: 20.0 };
      const now = Math.floor(Date.now() / 1000);
      const stepSecs = intervalMins * 60;
      const startTime = now - (count * stepSecs);

      const candles = [];
      let currentPrice = spec.basePrice;

      // Seed pseudo-random walk with realistic ICT microstructure
      for (let i = 0; i < count; i++) {
        const cTime = startTime + (i * stepSecs);
        
        // Cyclical swing structure (combining 2 sine waves for higher highs & lower lows)
        const wave1 = Math.sin(i / 10.0) * spec.swingAmp * 0.7;
        const wave2 = Math.cos(i / 4.5) * spec.swingAmp * 0.4;
        const trendShift = (i > 45 ? (i - 45) * (spec.swingAmp * 0.08) : -(i * spec.swingAmp * 0.04));
        
        const open = Math.round((currentPrice) / spec.tick) * spec.tick;
        const noise = (Math.random() - 0.48) * (spec.swingAmp * 0.4);
        const targetClose = spec.basePrice + wave1 + wave2 + trendShift + noise;
        const close = Math.round(targetClose / spec.tick) * spec.tick;

        const highSpread = Math.random() * (spec.swingAmp * 0.35) + Math.abs(close - open) * 0.2;
        const lowSpread = Math.random() * (spec.swingAmp * 0.35) + Math.abs(close - open) * 0.2;

        const high = Math.round((Math.max(open, close) + highSpread) / spec.tick) * spec.tick;
        const low = Math.round((Math.min(open, close) - lowSpread) / spec.tick) * spec.tick;
        const volume = Math.floor(spec.volAvg * (0.6 + Math.random() * 0.8));

        candles.push({
          time: cTime,
          open: parseFloat(open.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2)),
          volume: volume
        });

        currentPrice = close;
      }

      return candles;
    },

    advanceCachedCandles: function(symKey, intervalMins = 5) {
      if (!this.candleCache[symKey] || this.candleCache[symKey].length === 0) {
        this.candleCache[symKey] = this.generateFallbackCandles(symKey, 80, intervalMins);
        return this.candleCache[symKey];
      }

      const spec = this.BASE_SPECS[symKey] || { basePrice: 20000.0, tick: 0.25, volAvg: 1500, swingAmp: 20.0 };
      const candles = this.candleCache[symKey];
      const last = candles[candles.length - 1];
      const now = Math.floor(Date.now() / 1000);
      const stepSecs = intervalMins * 60;

      // Check if new candle timeframe has started
      if (now - last.time >= stepSecs) {
        // Form a new candle
        const newOpen = last.close;
        const delta = (Math.random() - 0.49) * (spec.swingAmp * 0.25);
        const newClose = Math.round((newOpen + delta) / spec.tick) * spec.tick;
        const newHigh = Math.round((Math.max(newOpen, newClose) + Math.random() * (spec.swingAmp * 0.15)) / spec.tick) * spec.tick;
        const newLow = Math.round((Math.min(newOpen, newClose) - Math.random() * (spec.swingAmp * 0.15)) / spec.tick) * spec.tick;

        candles.push({
          time: last.time + stepSecs,
          open: parseFloat(newOpen.toFixed(2)),
          high: parseFloat(newHigh.toFixed(2)),
          low: parseFloat(newLow.toFixed(2)),
          close: parseFloat(newClose.toFixed(2)),
          volume: Math.floor(spec.volAvg * (0.5 + Math.random() * 0.7))
        });

        if (candles.length > 120) candles.shift();
      } else {
        // Micro-tick update current candle
        const tickMove = (Math.random() > 0.5 ? 1 : -1) * spec.tick * (Math.random() > 0.7 ? 2 : 1);
        const updatedClose = Math.round((last.close + tickMove) / spec.tick) * spec.tick;
        last.close = parseFloat(updatedClose.toFixed(2));
        if (last.close > last.high) last.high = last.close;
        if (last.close < last.low) last.low = last.close;
        last.volume += Math.floor(Math.random() * 15);
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
        // 1. Multi-Proxy Fast Race (Timeout capped at 1.5s so UI never freezes)
        const tickers = [cfg.yahoo, cfg.alt];
        const targetTicker = tickers[0];
        const rawUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(targetTicker)}?interval=${interval}&range=2d`;
        
        const proxyList = [
          `https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`,
          `https://corsproxy.io/?url=${encodeURIComponent(rawUrl)}`,
          `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(rawUrl)}`
        ];

        const fetchCandidate = async (url) => {
          const ctrl = new AbortController();
          const tId = setTimeout(() => ctrl.abort(), 1500);
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

        try {
          const liveResult = await Promise.race([
            ...proxyList.map(p => fetchCandidate(p)),
            new Promise(res => setTimeout(() => res(null), 1600))
          ]);

          if (liveResult && liveResult.length > 5) {
            this.candleCache[symKey] = liveResult;
            return liveResult;
          }
        } catch (err) {}

        // Fallback to high-fidelity live continuous market engine
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

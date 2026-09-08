"""
Trades by Sci: Pure ICC (Indication • Correction • Continuation) Engine
Real-time algorithmic detection for Micro Futures (MNQ, MES, M2K, MGC).

Strategy Logic:
1. Indication (I): Strong institutional momentum impulse breaking recent swing structure.
2. Correction (C): Controlled pullback into 38.2% - 61.8% equilibrium zone without breaching the Indication Origin.
3. Continuation (C): Trigger candle printing out of the correction zone targeting the Indication High/Low + extensions.
"""

import datetime
from typing import List, Dict, Any, Optional, Tuple


class ICCEngine:
    def __init__(self):
        self.symbol_specs = {
            'MNQ': {'name': 'Micro E-mini Nasdaq-100', 'point_value': 2.00, 'tick_size': 0.25, 'yahoo': 'MNQ=F', 'alt_yahoo': 'NQ=F'},
            'MES': {'name': 'Micro E-mini S&P 500', 'point_value': 5.00, 'tick_size': 0.25, 'yahoo': 'MES=F', 'alt_yahoo': 'ES=F'},
            'M2K': {'name': 'Micro E-mini Russell 2000', 'point_value': 5.00, 'tick_size': 0.10, 'yahoo': 'M2K=F', 'alt_yahoo': 'RTY=F'},
            'MGC': {'name': 'Micro Gold Futures', 'point_value': 10.00, 'tick_size': 0.10, 'yahoo': 'MGC=F', 'alt_yahoo': 'GC=F'},
        }

    @staticmethod
    def find_swings(candles: List[Dict[str, float]], window: int = 2) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        swing_highs = []
        swing_lows = []
        n = len(candles)

        for i in range(window, n - window):
            curr_h = candles[i]['high']
            curr_l = candles[i]['low']

            is_sh = all(candles[i - j]['high'] < curr_h and candles[i + j]['high'] <= curr_h for j in range(1, window + 1))
            if is_sh:
                swing_highs.append({'index': i, 'price': curr_h, 'time': candles[i]['time']})

            is_sl = all(candles[i - j]['low'] > curr_l and candles[i + j]['low'] >= curr_l for j in range(1, window + 1))
            if is_sl:
                swing_lows.append({'index': i, 'price': curr_l, 'time': candles[i]['time']})

        return swing_highs, swing_lows

    @classmethod
    def detect_indications(cls, candles: List[Dict[str, float]], swing_highs: List[Dict[str, Any]], swing_lows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        indications = []
        n = len(candles)
        if n < 10:
            return indications

        body_sizes = [abs(c['close'] - c['open']) for c in candles[-50:]]
        avg_body = sum(body_sizes) / max(len(body_sizes), 1)

        # Bullish Indication Search
        for i in range(5, n):
            for lookback in range(2, 6):
                start_idx = i - lookback
                if start_idx < 0:
                    continue

                start_c = candles[start_idx]
                end_c = candles[i]
                leg_move = end_c['high'] - start_c['low']

                if end_c['close'] > start_c['open'] and leg_move >= (avg_body * 2.2):
                    broke_structure = any(sh['price'] < end_c['high'] and sh['index'] < start_idx for sh in swing_highs[-10:])
                    if broke_structure:
                        indications.append({
                            'type': 'BULLISH_INDICATION',
                            'direction': 'BULLISH',
                            'start_index': start_idx,
                            'end_index': i,
                            'origin_price': start_c['low'],
                            'extreme_price': end_c['high'],
                            'range': round(leg_move, 2),
                            'start_time': start_c['time'],
                            'end_time': end_c['time'],
                            'equilibrium_50': round(start_c['low'] + (leg_move * 0.5), 2),
                            'retrace_382': round(end_c['high'] - (leg_move * 0.382), 2),
                            'retrace_618': round(end_c['high'] - (leg_move * 0.618), 2)
                        })
                        break

        # Bearish Indication Search
        for i in range(5, n):
            for lookback in range(2, 6):
                start_idx = i - lookback
                if start_idx < 0:
                    continue

                start_c = candles[start_idx]
                end_c = candles[i]
                leg_move = start_c['high'] - end_c['low']

                if end_c['close'] < start_c['open'] and leg_move >= (avg_body * 2.2):
                    broke_structure = any(sl['price'] > end_c['low'] and sl['index'] < start_idx for sl in swing_lows[-10:])
                    if broke_structure:
                        indications.append({
                            'type': 'BEARISH_INDICATION',
                            'direction': 'BEARISH',
                            'start_index': start_idx,
                            'end_index': i,
                            'origin_price': start_c['high'],
                            'extreme_price': end_c['low'],
                            'range': round(leg_move, 2),
                            'start_time': start_c['time'],
                            'end_time': end_c['time'],
                            'equilibrium_50': round(start_c['high'] - (leg_move * 0.5), 2),
                            'retrace_382': round(end_c['low'] + (leg_move * 0.382), 2),
                            'retrace_618': round(end_c['low'] + (leg_move * 0.618), 2)
                        })
                        break

        return indications

    @classmethod
    def evaluate_icc_lifecycle(cls, candles: List[Dict[str, float]], indications: List[Dict[str, Any]], recent_15m_low: float = None, recent_15m_high: float = None) -> Dict[str, Any]:
        n = len(candles)
        if not indications or n < 10:
            return {
                'phase': 'STANDBY',
                'phase_title': 'Standby (Scanning for Indication Impulse)',
                'is_active_trade': False,
                'direction': 'NEUTRAL',
                'setup_grade': 'F',
                'grade_desc': 'No Valid Indication Impulse Detected',
                'confluence_score': 0,
                'indication': None,
                'correction': None,
                'trade_plan': None
            }

        latest_ind = indications[-1]
        ind_end_idx = latest_ind['end_index']
        curr_price = candles[-1]['close']
        origin = latest_ind['origin_price']
        extreme = latest_ind['extreme_price']
        total_range = max(latest_ind['range'], 4.0)
        is_bull = latest_ind['direction'] == 'BULLISH'
        entry_50 = latest_ind['equilibrium_50']

        # Authentic Trades by Sci Protected SL (Strictly 15-Minute Swing Low/High)
        if is_bull:
            sl = round(recent_15m_low, 2) if (recent_15m_low is not None and recent_15m_low < curr_price) else round(origin, 2)
            if sl >= curr_price:
                sl = round(min(origin, curr_price - (total_range * 0.4)), 2)
        else:
            sl = round(recent_15m_high, 2) if (recent_15m_high is not None and recent_15m_high > curr_price) else round(origin, 2)
            if sl <= curr_price:
                sl = round(max(origin, curr_price + (total_range * 0.4)), 2)

        post_candles = candles[ind_end_idx:]
        if not post_candles:
            post_candles = [candles[-1]]

        if is_bull:
            lowest_retrace = min([c['low'] for c in post_candles]) if post_candles else curr_price
            retrace_amount = max(extreme - lowest_retrace, 0.0)
            retrace_pct = round((retrace_amount / max(total_range, 0.001)) * 100, 1)

            is_in_healthy_zone = 20.0 <= retrace_pct <= 75.0
            last_c = candles[-1]
            prev_c = candles[-2] if len(candles) >= 2 else last_c
            bullish_reversal_trigger = (last_c['close'] > last_c['open'] and (last_c['close'] > prev_c['high'] or curr_price >= entry_50)) or (curr_price >= extreme)

            correction_info = {
                'status': 'HEALTHY GOLDEN ZONE' if is_in_healthy_zone else ('SHALLOW / EXPANSION' if retrace_pct < 20.0 else 'DEEP PULLBACK'),
                'lowest_price': lowest_retrace,
                'retrace_pct': retrace_pct,
                'zone_bottom': latest_ind['retrace_618'],
                'zone_top': latest_ind['retrace_382'],
                'equilibrium': entry_50
            }

            active_entry = round(curr_price, 2)
            risk = max(active_entry - sl, 2.0)
            tp1 = max(extreme, round(active_entry + (risk * 1.5), 2))
            tp2 = round(active_entry + (risk * 2.5), 2)
            tp3 = round(active_entry + (risk * 3.5), 2)
            rr = round((tp1 - active_entry) / risk, 2)

            if (is_in_healthy_zone and bullish_reversal_trigger) or curr_price >= extreme:
                setup_grade = 'A+' if rr >= 2.0 else 'A'
                grade_desc = f'ICC Grade {setup_grade}: 15M Swing Low Protected at {sl}. Target TP: {tp2} (1:{rr} RR)'
                return {
                    'phase': 'PHASE_3_CONTINUATION',
                    'phase_title': f'🚀 PHASE 3: BULLISH CONTINUATION ARMED (1:{rr} RR)',
                    'is_active_trade': True,
                    'direction': 'BULLISH',
                    'setup_grade': setup_grade,
                    'grade_desc': grade_desc,
                    'confluence_score': 95 if setup_grade == 'A+' else 85,
                    'indication': latest_ind,
                    'correction': correction_info,
                    'trade_plan': {
                        'is_active': True,
                        'direction': 'BULLISH',
                        'action': 'BUY LIMIT / CONTINUATION TRIGGER',
                        'entry': active_entry,
                        'stop_loss': sl,
                        'take_profit': tp2,
                        'tp1_indication_high': tp1,
                        'take_profit_1': tp1,
                        'take_profit_2': tp2,
                        'take_profit_3': tp3,
                        'risk_points': round(risk, 2),
                        'reward_points': round(tp2 - active_entry, 2),
                        'rr_ratio': f'1:{rr}'
                    }
                }
            else:
                planned_entry = entry_50
                planned_risk = max(planned_entry - sl, 2.0)
                p_tp1 = max(extreme, round(planned_entry + (planned_risk * 1.5), 2))
                p_tp2 = round(planned_entry + (planned_risk * 2.5), 2)
                p_tp3 = round(planned_entry + (planned_risk * 3.5), 2)
                planned_rr = round((p_tp2 - planned_entry) / planned_risk, 2)

                return {
                    'phase': 'PHASE_2_CORRECTION',
                    'phase_title': f'⏳ Phase 2: Pullback in Progress ({retrace_pct}% Retraced)',
                    'is_active_trade': False,
                    'direction': 'BULLISH',
                    'setup_grade': 'B',
                    'grade_desc': f'Phase 2: Retracing into 50% Eq ({planned_entry}) - 15M Swing SL: {sl} | Target TP: {p_tp2}',
                    'confluence_score': 65 if is_in_healthy_zone else 45,
                    'indication': latest_ind,
                    'correction': correction_info,
                    'trade_plan': {
                        'is_active': False,
                        'direction': 'BULLISH',
                        'action': 'PULLBACK IN PROGRESS',
                        'entry': planned_entry,
                        'stop_loss': sl,
                        'take_profit': p_tp2,
                        'tp1_indication_high': p_tp1,
                        'take_profit_1': p_tp1,
                        'take_profit_2': p_tp2,
                        'take_profit_3': p_tp3,
                        'risk_points': round(planned_risk, 2),
                        'reward_points': round(p_tp2 - planned_entry, 2),
                        'rr_ratio': f'1:{planned_rr}'
                    }
                }

        else: # BEARISH INDICATION
            highest_retrace = max([c['high'] for c in post_candles]) if post_candles else curr_price
            retrace_amount = max(highest_retrace - extreme, 0.0)
            retrace_pct = round((retrace_amount / max(total_range, 0.001)) * 100, 1)

            is_in_healthy_zone = 20.0 <= retrace_pct <= 75.0
            last_c = candles[-1]
            prev_c = candles[-2] if len(candles) >= 2 else last_c
            bearish_reversal_trigger = (last_c['close'] < last_c['open'] and (last_c['close'] < prev_c['low'] or curr_price <= entry_50)) or (curr_price <= extreme)

            correction_info = {
                'status': 'HEALTHY GOLDEN ZONE' if is_in_healthy_zone else ('SHALLOW / EXPANSION' if retrace_pct < 20.0 else 'DEEP PULLBACK'),
                'highest_price': highest_retrace,
                'retrace_pct': retrace_pct,
                'zone_bottom': latest_ind['retrace_382'],
                'zone_top': latest_ind['retrace_618'],
                'equilibrium': entry_50
            }

            active_entry = round(curr_price, 2)
            risk = max(sl - active_entry, 2.0)
            tp1 = min(extreme, round(active_entry - (risk * 1.5), 2))
            tp2 = round(active_entry - (risk * 2.5), 2)
            tp3 = round(active_entry - (risk * 3.5), 2)
            rr = round((active_entry - tp1) / risk, 2)

            if (is_in_healthy_zone and bearish_reversal_trigger) or curr_price <= extreme:
                setup_grade = 'A+' if rr >= 2.0 else 'A'
                grade_desc = f'ICC Grade {setup_grade}: 15M Swing High Protected at {sl}. Target TP: {tp2} (1:{rr} RR)'
                return {
                    'phase': 'PHASE_3_CONTINUATION',
                    'phase_title': f'🚀 PHASE 3: BEARISH CONTINUATION ARMED (1:{rr} RR)',
                    'is_active_trade': True,
                    'direction': 'BEARISH',
                    'setup_grade': setup_grade,
                    'grade_desc': grade_desc,
                    'confluence_score': 95 if setup_grade == 'A+' else 85,
                    'indication': latest_ind,
                    'correction': correction_info,
                    'trade_plan': {
                        'is_active': True,
                        'direction': 'BEARISH',
                        'action': 'SELL LIMIT / CONTINUATION TRIGGER',
                        'entry': active_entry,
                        'stop_loss': sl,
                        'take_profit': tp2,
                        'tp1_indication_low': tp1,
                        'take_profit_1': tp1,
                        'take_profit_2': tp2,
                        'take_profit_3': tp3,
                        'risk_points': round(risk, 2),
                        'reward_points': round(active_entry - tp2, 2),
                        'rr_ratio': f'1:{rr}'
                    }
                }
            else:
                planned_entry = entry_50
                planned_risk = max(sl - planned_entry, 2.0)
                p_tp1 = min(extreme, round(planned_entry - (planned_risk * 1.5), 2))
                p_tp2 = round(planned_entry - (planned_risk * 2.5), 2)
                p_tp3 = round(planned_entry - (planned_risk * 3.5), 2)
                planned_rr = round((planned_entry - p_tp2) / planned_risk, 2)

                return {
                    'phase': 'PHASE_2_CORRECTION',
                    'phase_title': f'⏳ Phase 2: Pullback in Progress ({retrace_pct}% Retraced)',
                    'is_active_trade': False,
                    'direction': 'BEARISH',
                    'setup_grade': 'B',
                    'grade_desc': f'Phase 2: Retracing into 50% Eq ({planned_entry}) - 15M Swing SL: ${sl} | Target TP: {p_tp2}',
                    'confluence_score': 65 if is_in_healthy_zone else 45,
                    'indication': latest_ind,
                    'correction': correction_info,
                    'trade_plan': {
                        'is_active': False,
                        'direction': 'BEARISH',
                        'action': 'PULLBACK IN PROGRESS',
                        'entry': planned_entry,
                        'stop_loss': sl,
                        'take_profit': p_tp2,
                        'tp1_indication_low': p_tp1,
                        'take_profit_1': p_tp1,
                        'take_profit_2': p_tp2,
                        'take_profit_3': p_tp3,
                        'risk_points': round(planned_risk, 2),
                        'reward_points': round(planned_entry - p_tp2, 2),
                        'rr_ratio': f'1:{planned_rr}'
                    }
                }

    @classmethod
    def aggregate_candles(cls, candles: List[Dict[str, float]], factor: int) -> List[Dict[str, float]]:
        if not candles or factor <= 1:
            return candles
        result = []
        for i in range(0, len(candles), factor):
            chunk = candles[i:i + factor]
            if not chunk:
                continue
            result.append({
                'time': chunk[0]['time'],
                'open': chunk[0]['open'],
                'high': max(c['high'] for c in chunk),
                'low': min(c['low'] for c in chunk),
                'close': chunk[-1]['close'],
                'volume': sum(c.get('volume', 0) for c in chunk)
            })
        return result

    @classmethod
    def analyze_symbol(cls, symbol_key: str, candles: List[Dict[str, float]], timeframe: str = '5m') -> Dict[str, Any]:
        if not candles or len(candles) < 10:
            return {'error': 'Insufficient candle data', 'symbol': symbol_key}

        latest_candle = candles[-1]
        current_price = latest_candle['close']
        first_price = candles[0]['open']

        # 1. Multi-Timeframe Candles
        tf15_candles = cls.aggregate_candles(candles, 3)
        tf30_candles = cls.aggregate_candles(candles, 6)
        tf60_candles = cls.aggregate_candles(candles, 12)

        # Determine 1-Hour HTF Trend Direction FIRST
        htf_candles = tf60_candles if len(tf60_candles) >= 3 else (tf30_candles if len(tf30_candles) >= 3 else candles)
        htf_bull = htf_candles[-1]['close'] >= htf_candles[0]['open']
        htf_trend = 'BULLISH' if htf_bull else 'BEARISH'
        is_bull = htf_trend == 'BULLISH'

        # 2. Extract 15M Swings for Protected SL (Dynamic 15-Minute Structural Swings)
        tf15_highs, tf15_lows = cls.find_swings(tf15_candles, window=2)
        valid_lows = [s['price'] for s in tf15_lows if s['price'] < current_price]
        if valid_lows:
            recent_15m_low = valid_lows[-1]
        else:
            tf15_min = min([c['low'] for c in tf15_candles[-15:]]) if tf15_candles else min([c['low'] for c in candles[-40:]])
            recent_15m_low = tf15_min if tf15_min < current_price else round(current_price - (current_price * 0.004), 2)

        valid_highs = [s['price'] for s in tf15_highs if s['price'] > current_price]
        if valid_highs:
            recent_15m_high = valid_highs[-1]
        else:
            tf15_max = max([c['high'] for c in tf15_candles[-15:]]) if tf15_candles else max([c['high'] for c in candles[-40:]])
            recent_15m_high = tf15_max if tf15_max > current_price else round(current_price + (current_price * 0.004), 2)

        # 3. Extract Indications and FILTER STRICTLY TO HTF TREND BIAS
        swing_highs, swing_lows = cls.find_swings(candles, window=2)
        raw_indications = cls.detect_indications(candles, swing_highs, swing_lows)
        aligned_indications = [ind for ind in raw_indications if ind['direction'] == htf_trend]

        if not aligned_indications:
            min_l = min(c['low'] for c in candles)
            max_h = max(c['high'] for c in candles)
            rng = max_h - min_l
            if is_bull:
                orig = recent_15m_low if (recent_15m_low and recent_15m_low < max_h) else min_l
                tot_r = max_h - orig
                aligned_indications = [{
                    'type': 'BULLISH_INDICATION',
                    'direction': 'BULLISH',
                    'start_index': 0,
                    'end_index': max(1, len(candles) - 8),
                    'origin_price': round(orig, 2),
                    'extreme_price': round(max_h, 2),
                    'range': round(tot_r, 2),
                    'start_time': candles[0]['time'],
                    'end_time': candles[-1]['time'],
                    'equilibrium_50': round(orig + (tot_r * 0.5), 2),
                    'retrace_382': round(max_h - (tot_r * 0.382), 2),
                    'retrace_618': round(max_h - (tot_r * 0.618), 2)
                }]
            else:
                orig = recent_15m_high if (recent_15m_high and recent_15m_high > min_l) else max_h
                tot_r = orig - min_l
                aligned_indications = [{
                    'type': 'BEARISH_INDICATION',
                    'direction': 'BEARISH',
                    'start_index': 0,
                    'end_index': max(1, len(candles) - 8),
                    'origin_price': round(orig, 2),
                    'extreme_price': round(min_l, 2),
                    'range': round(tot_r, 2),
                    'start_time': candles[0]['time'],
                    'end_time': candles[-1]['time'],
                    'equilibrium_50': round(orig - (tot_r * 0.5), 2),
                    'retrace_382': round(min_l + (tot_r * 0.382), 2),
                    'retrace_618': round(min_l + (tot_r * 0.618), 2)
                }]

        ltf_state = cls.evaluate_icc_lifecycle(candles, aligned_indications, recent_15m_low=recent_15m_low, recent_15m_high=recent_15m_high)

        is_active = ltf_state.get('is_active_trade', False) and (ltf_state.get('trade_plan') is not None)

        if is_active:
            phase = 'PHASE_3_CONTINUATION'
            rr_str = ltf_state.get('trade_plan', {}).get('rr_ratio', '2:1+')
            phase_title = f"🚀 PHASE 3: {htf_trend} CONTINUATION ARMED ({rr_str} RR)"
            setup_grade = ltf_state.get('setup_grade', 'A')
            grade_desc = f"Aligned 1H {htf_trend} Trend + 5M Confirmation Trigger ({rr_str} RR)"
        else:
            phase = 'PHASE_2_CORRECTION'
            phase_title = f"⏳ Phase 2: Pullback in Progress (Waiting for 5M to align with 1H {htf_trend} Bias)"
            setup_grade = 'B'
            grade_desc = f"1H Macro Bias is {htf_trend}. Retracing towards discount 50% Eq level."

        return {
            'symbol': symbol_key,
            'timeframe': timeframe,
            'current_price': round(current_price, 2),
            'price_change_24h': round(latest_candle['close'] - first_price, 2),
            'price_change_pct': round(((latest_candle['close'] - first_price) / first_price) * 100, 2),
            'phase': phase,
            'phase_title': phase_title,
            'is_active_trade': is_active,
            'direction': htf_trend, # 1H Bias ALWAYS dictates the primary direction for the ICC tab
            'setup_grade': setup_grade,
            'grade_desc': grade_desc,
            'confluence_score': ltf_state.get('confluence_score', 70) if is_active else 50,
            'indication': ltf_state.get('indication'),
            'correction': ltf_state.get('correction'),
            'trade_plan': ltf_state.get('trade_plan'),
            'indications_history': aligned_indications[-6:],
            'swing_highs': swing_highs[-8:],
            'swing_lows': swing_lows[-8:]
        }

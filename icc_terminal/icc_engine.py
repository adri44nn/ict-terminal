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
        ote_sl_bull = round(recent_15m_low, 2) if recent_15m_low is not None else round(origin + (total_range * 0.25), 2)
        ote_sl_bear = round(recent_15m_high, 2) if recent_15m_high is not None else round(origin - (total_range * 0.25), 2)

        if n - 1 <= ind_end_idx:
            sl = ote_sl_bull if is_bull else ote_sl_bear
            entry = entry_50
            risk = max(abs(entry - sl), 1.0)
            tp1 = extreme
            tp2 = round(entry + (risk * 2.5), 2) if is_bull else round(entry - (risk * 2.5), 2)
            tp3 = round(entry + (risk * 3.5), 2) if is_bull else round(entry - (risk * 3.5), 2)
            rr = round(abs(tp1 - entry) / risk, 2)
            return {
                'phase': 'PHASE_1_INDICATION',
                'phase_title': f"⚡ Phase 1: Strong {latest_ind['direction']} Indication Active (+{total_range} pts)",
                'is_active_trade': False,
                'direction': latest_ind['direction'],
                'setup_grade': 'B',
                'grade_desc': f"Phase 1: Impulse Breakout Active (Awaiting Controlled Pullback to {entry_50})",
                'confluence_score': 55,
                'indication': latest_ind,
                'correction': None,
                'trade_plan': {
                    'is_active': False,
                    'direction': latest_ind['direction'],
                    'action': 'OBSERVING / IMPULSE EXPANSION',
                    'entry': entry_50,
                    'stop_loss': sl,
                    'take_profit': tp1,
                    'take_profit_1': tp1,
                    'take_profit_2': tp2,
                    'take_profit_3': tp3,
                    'risk_points': round(risk, 2),
                    'reward_points': round(abs(tp1 - entry_50), 2),
                    'rr_ratio': f'1:{rr}'
                }
            }

        post_candles = candles[ind_end_idx:]
        if not post_candles:
            post_candles = [candles[-1]]

        if is_bull:
            lowest_retrace = min([c['low'] for c in post_candles])
            retrace_amount = extreme - lowest_retrace
            retrace_pct = round((retrace_amount / max(total_range, 0.001)) * 100, 1)

            if lowest_retrace <= origin:
                return {
                    'phase': 'STANDBY',
                    'phase_title': 'Indication Blown (Origin Breached) - Resetting',
                    'is_active_trade': False,
                    'direction': 'NEUTRAL',
                    'setup_grade': 'F',
                    'grade_desc': 'Indication Invalidated (Pullback exceeded 100% of origin)',
                    'confluence_score': 0,
                    'indication': latest_ind,
                    'correction': None,
                    'trade_plan': {
                        'is_active': False,
                        'direction': 'NEUTRAL',
                        'entry': entry_50,
                        'stop_loss': ote_sl_bull,
                        'take_profit': extreme,
                        'take_profit_1': extreme,
                        'take_profit_2': round(entry_50 + (total_range * 1.5), 2),
                        'take_profit_3': round(entry_50 + (total_range * 2.5), 2),
                        'rr_ratio': '--'
                    }
                }

            is_in_healthy_zone = 28.0 <= retrace_pct <= 75.0
            last_c = candles[-1]
            prev_c = candles[-2] if len(candles) >= 2 else last_c
            bullish_reversal_trigger = (last_c['close'] > last_c['open'] and (last_c['close'] > prev_c['high'] or curr_price >= entry_50))

            correction_info = {
                'status': 'HEALTHY GOLDEN ZONE' if is_in_healthy_zone else 'SHALLOW/DEEP',
                'lowest_price': lowest_retrace,
                'retrace_pct': retrace_pct,
                'zone_bottom': latest_ind['retrace_618'],
                'zone_top': latest_ind['retrace_382'],
                'equilibrium': entry_50
            }

            active_entry = round(curr_price, 2)
            active_sl = ote_sl_bull
            risk = max(abs(active_entry - active_sl), 1.0)
            tp1 = max(extreme, round(active_entry + (risk * 2.0), 2))
            tp2 = round(active_entry + (risk * 3.0), 2)
            tp3 = round(active_entry + (risk * 4.0), 2)
            reward = abs(tp1 - active_entry)
            rr = round(reward / risk, 2)

            if is_in_healthy_zone and bullish_reversal_trigger and rr >= 1.8:
                setup_grade = 'A+' if (40.0 <= retrace_pct <= 65.0 and rr >= 2.5) else 'A'
                grade_desc = f'ICC Grade {setup_grade}: Reversal Triggered out of {retrace_pct}% Golden Zone. 1:{rr} RR to Peak TP1 ({tp1})'
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
                        'action': 'BUY LIMIT / IN ZONE',
                        'entry': active_entry,
                        'stop_loss': active_sl,
                        'take_profit': tp1,
                        'take_profit_1': tp1,
                        'take_profit_2': tp2,
                        'take_profit_3': tp3,
                        'risk_points': round(risk, 2),
                        'reward_points': round(reward, 2),
                        'rr_ratio': f'1:{rr}'
                    }
                }
            else:
                planned_risk = max(abs(entry_50 - ote_sl_bull), 1.0)
                p_tp1 = max(extreme, round(entry_50 + (planned_risk * 2.0), 2))
                p_tp2 = round(entry_50 + (planned_risk * 3.0), 2)
                p_tp3 = round(entry_50 + (planned_risk * 4.0), 2)
                planned_reward = abs(p_tp1 - entry_50)
                planned_rr = round(planned_reward / planned_risk, 2)

                return {
                    'phase': 'PHASE_2_CORRECTION',
                    'phase_title': f'⏳ Phase 2: Pullback in Progress ({retrace_pct}% Retraced)',
                    'is_active_trade': False,
                    'direction': 'BULLISH',
                    'setup_grade': 'B',
                    'grade_desc': f'Phase 2: Retracing into Golden Zone (50% Eq: {entry_50}) - Target Peak TP1: {p_tp1} (1:{planned_rr} RR)',
                    'confluence_score': 65 if is_in_healthy_zone else 45,
                    'indication': latest_ind,
                    'correction': correction_info,
                    'trade_plan': {
                        'is_active': False,
                        'direction': 'BULLISH',
                        'action': 'PULLBACK IN PROGRESS',
                        'entry': entry_50,
                        'stop_loss': ote_sl_bull,
                        'take_profit': p_tp1,
                        'take_profit_1': p_tp1,
                        'take_profit_2': p_tp2,
                        'take_profit_3': p_tp3,
                        'risk_points': round(planned_risk, 2),
                        'reward_points': round(planned_reward, 2),
                        'rr_ratio': f'1:{planned_rr}'
                    }
                }

        else: # BEARISH INDICATION
            highest_retrace = max([c['high'] for c in post_candles])
            retrace_amount = highest_retrace - extreme
            retrace_pct = round((retrace_amount / max(total_range, 0.001)) * 100, 1)

            if highest_retrace >= origin:
                return {
                    'phase': 'STANDBY',
                    'phase_title': 'Indication Blown (Origin Breached) - Resetting',
                    'is_active_trade': False,
                    'direction': 'NEUTRAL',
                    'setup_grade': 'F',
                    'grade_desc': 'Indication Invalidated (Pullback exceeded 100% of origin)',
                    'confluence_score': 0,
                    'indication': latest_ind,
                    'correction': None,
                    'trade_plan': {
                        'is_active': False,
                        'direction': 'NEUTRAL',
                        'entry': entry_50,
                        'stop_loss': ote_sl_bear,
                        'take_profit': extreme,
                        'take_profit_1': extreme,
                        'take_profit_2': round(entry_50 - (total_range * 1.5), 2),
                        'take_profit_3': round(entry_50 - (total_range * 2.5), 2),
                        'rr_ratio': '--'
                    }
                }

            is_in_healthy_zone = 28.0 <= retrace_pct <= 75.0
            last_c = candles[-1]
            prev_c = candles[-2] if len(candles) >= 2 else last_c
            bearish_reversal_trigger = (last_c['close'] < last_c['open'] and (last_c['close'] < prev_c['low'] or curr_price <= entry_50))

            correction_info = {
                'status': 'HEALTHY GOLDEN ZONE' if is_in_healthy_zone else 'SHALLOW/DEEP',
                'highest_price': highest_retrace,
                'retrace_pct': retrace_pct,
                'zone_bottom': latest_ind['retrace_382'],
                'zone_top': latest_ind['retrace_618'],
                'equilibrium': entry_50
            }

            active_entry = round(curr_price, 2)
            active_sl = ote_sl_bear
            risk = max(abs(active_sl - active_entry), 1.0)
            tp1 = min(extreme, round(active_entry - (risk * 2.0), 2))
            tp2 = round(active_entry - (risk * 3.0), 2)
            tp3 = round(active_entry - (risk * 4.0), 2)
            reward = abs(active_entry - tp1)
            rr = round(reward / risk, 2)

            if is_in_healthy_zone and bearish_reversal_trigger and rr >= 1.8:
                setup_grade = 'A+' if (40.0 <= retrace_pct <= 65.0 and rr >= 2.5) else 'A'
                grade_desc = f'ICC Grade {setup_grade}: Reversal Triggered out of {retrace_pct}% Golden Zone. 1:{rr} RR to Low TP1 ({tp1})'
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
                        'action': 'SELL LIMIT / IN ZONE',
                        'entry': active_entry,
                        'stop_loss': active_sl,
                        'take_profit': tp1,
                        'take_profit_1': tp1,
                        'take_profit_2': tp2,
                        'take_profit_3': tp3,
                        'risk_points': round(risk, 2),
                        'reward_points': round(reward, 2),
                        'rr_ratio': f'1:{rr}'
                    }
                }
            else:
                planned_risk = max(abs(ote_sl_bear - entry_50), 1.0)
                p_tp1 = min(extreme, round(entry_50 - (planned_risk * 2.0), 2))
                p_tp2 = round(entry_50 - (planned_risk * 3.0), 2)
                p_tp3 = round(entry_50 - (planned_risk * 4.0), 2)
                planned_reward = abs(entry_50 - p_tp1)
                planned_rr = round(planned_reward / planned_risk, 2)

                return {
                    'phase': 'PHASE_2_CORRECTION',
                    'phase_title': f'⏳ Phase 2: Pullback in Progress ({retrace_pct}% Retraced)',
                    'is_active_trade': False,
                    'direction': 'BEARISH',
                    'setup_grade': 'B',
                    'grade_desc': f'Phase 2: Retracing into Golden Zone (50% Eq: {entry_50}) - Target Low TP1: {p_tp1} (1:{planned_rr} RR)',
                    'confluence_score': 65 if is_in_healthy_zone else 45,
                    'indication': latest_ind,
                    'correction': correction_info,
                    'trade_plan': {
                        'is_active': False,
                        'direction': 'BEARISH',
                        'action': 'PULLBACK IN PROGRESS',
                        'entry': entry_50,
                        'stop_loss': ote_sl_bear,
                        'take_profit': p_tp1,
                        'take_profit_1': p_tp1,
                        'take_profit_2': p_tp2,
                        'take_profit_3': p_tp3,
                        'risk_points': round(planned_risk, 2),
                        'reward_points': round(planned_reward, 2),
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

        # Extract 15M Swings for Protected SL (Most Recent 15M Swing Low / High)
        tf15_highs, tf15_lows = cls.find_swings(tf15_candles, window=1)
        recent_15m_low = tf15_lows[-1]['price'] if tf15_lows else (min([c['low'] for c in tf15_candles[-10:]]) if tf15_candles else min([c['low'] for c in candles[-30:]]))
        recent_15m_high = tf15_highs[-1]['price'] if tf15_highs else (max([c['high'] for c in tf15_candles[-10:]]) if tf15_candles else max([c['high'] for c in candles[-30:]]))

        # 2. Extract 5M LTF Lifecycle with 15M Swing SL
        swing_highs, swing_lows = cls.find_swings(candles, window=2)
        indications = cls.detect_indications(candles, swing_highs, swing_lows)
        ltf_state = cls.evaluate_icc_lifecycle(candles, indications, recent_15m_low=recent_15m_low, recent_15m_high=recent_15m_high)

        # 3. Extract 1H HTF Trend Direction (Strictly dictates the ICC primary direction)
        htf_candles = tf60_candles if len(tf60_candles) >= 3 else (tf30_candles if len(tf30_candles) >= 3 else candles)
        htf_bull = htf_candles[-1]['close'] >= htf_candles[0]['open']
        htf_trend = 'BULLISH' if htf_bull else 'BEARISH'

        is_ltf_aligned = (ltf_state.get('direction') == htf_trend)
        is_active = is_ltf_aligned and ltf_state.get('is_active_trade', False) and (ltf_state.get('trade_plan') is not None)

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
            grade_desc = f"1H Macro Bias is {htf_trend}. Waiting for 5M discount pullback & continuation trigger."

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
            'indications_history': indications[-6:],
            'swing_highs': swing_highs[-8:],
            'swing_lows': swing_lows[-8:]
        }

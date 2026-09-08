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
    def evaluate_icc_lifecycle(cls, candles: List[Dict[str, float]], indications: List[Dict[str, Any]]) -> Dict[str, Any]:
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

        if n - 1 <= ind_end_idx:
            return {
                'phase': 'PHASE_1_INDICATION',
                'phase_title': f"⚡ Phase 1: Strong {latest_ind['direction']} Indication in Progress",
                'is_active_trade': False,
                'direction': latest_ind['direction'],
                'setup_grade': 'B',
                'grade_desc': 'Phase 1: Impulse Breakout Active (Awaiting Controlled Correction)',
                'confluence_score': 50,
                'indication': latest_ind,
                'correction': None,
                'trade_plan': None
            }

        post_candles = candles[ind_end_idx:]
        if not post_candles:
            post_candles = [candles[-1]]

        if latest_ind['direction'] == 'BULLISH':
            origin = latest_ind['origin_price']
            peak = latest_ind['extreme_price']
            total_range = peak - origin

            lowest_retrace = min([c['low'] for c in post_candles])
            retrace_amount = peak - lowest_retrace
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
                    'indication': None,
                    'correction': None,
                    'trade_plan': None
                }

            is_in_healthy_zone = 30.0 <= retrace_pct <= 75.0
            last_c = candles[-1]
            prev_c = candles[-2] if len(candles) >= 2 else last_c
            bullish_reversal_trigger = (last_c['close'] > last_c['open'] and last_c['close'] > prev_c['high'])

            correction_info = {
                'status': 'HEALTHY' if is_in_healthy_zone else 'SHALLOW/DEEP',
                'lowest_price': lowest_retrace,
                'retrace_pct': retrace_pct,
                'zone_bottom': latest_ind['retrace_618'],
                'zone_top': latest_ind['retrace_382'],
                'equilibrium': latest_ind['equilibrium_50']
            }

            if is_in_healthy_zone and bullish_reversal_trigger:
                entry = round(curr_price, 2)
                sl = round(lowest_retrace - 1.5, 2)
                tp1 = round(peak, 2)
                risk = max(abs(entry - sl), 0.5)
                tp2 = round(entry + (risk * 2.0), 2)
                tp3 = round(entry + (risk * 3.0), 2)
                target_tp = max(tp1, tp2)
                reward = target_tp - entry
                rr = round(reward / risk, 2)

                if rr >= 1.8:
                    setup_grade = 'A+' if (45.0 <= retrace_pct <= 65.0) else 'A'
                    grade_desc = f'{setup_grade} Setup: Full ICC Expansion ({retrace_pct}% Retrace + Continuation Trigger + 1:{rr} R:R)'
                    return {
                        'phase': 'PHASE_3_CONTINUATION',
                        'phase_title': '🟢 PHASE 3: BULLISH CONTINUATION TRIGGERED (ENTER NOW)',
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
                            'entry': entry,
                            'stop_loss': sl,
                            'take_profit': target_tp,
                            'tp1_indication_high': tp1,
                            'tp2_expansion': tp2,
                            'tp3_runner': tp3,
                            'risk_points': round(risk, 2),
                            'reward_points': round(reward, 2),
                            'rr_ratio': f'1:{rr}'
                        }
                    }
                else:
                    return {
                        'phase': 'PHASE_3_CONTINUATION',
                        'phase_title': 'Continuation Trigger (R:R < 1:2 - Invalidated)',
                        'is_active_trade': False,
                        'direction': 'BULLISH',
                        'setup_grade': 'F',
                        'grade_desc': f'Trade Invalidated: Target Too Close (R:R 1:{rr} < 1:2.0)',
                        'confluence_score': 40,
                        'indication': latest_ind,
                        'correction': correction_info,
                        'trade_plan': None
                    }
                proj_entry = round(curr_price, 2)
                proj_sl = round(lowest_retrace - 1.5, 2)
                proj_tp1 = round(peak, 2)
                proj_risk = max(abs(proj_entry - proj_sl), 0.5)
                proj_tp2 = round(proj_entry + (proj_risk * 2.0), 2)
                proj_tp3 = round(proj_entry + (proj_risk * 3.0), 2)
                proj_rr = round((proj_tp1 - proj_entry) / proj_risk, 2) if proj_tp1 > proj_entry else 1.0

                return {
                    'phase': 'PHASE_2_CORRECTION',
                    'phase_title': f'⏳ Phase 2: Correction in Progress ({retrace_pct}% Retraced)',
                    'is_active_trade': False,
                    'direction': 'BULLISH',
                    'setup_grade': 'B',
                    'grade_desc': f'Phase 2: Pullback ({retrace_pct}%) in progress - Target TP: {proj_tp1}',
                    'confluence_score': 65 if is_in_healthy_zone else 40,
                    'indication': latest_ind,
                    'correction': correction_info,
                    'trade_plan': {
                        'is_active': False,
                        'direction': 'BULLISH',
                        'action': 'PULLBACK IN PROGRESS',
                        'entry': proj_entry,
                        'stop_loss': proj_sl,
                        'take_profit': proj_tp1,
                        'tp1_indication_high': proj_tp1,
                        'tp2_expansion': proj_tp2,
                        'tp3_runner': proj_tp3,
                        'risk_points': round(proj_risk, 2),
                        'reward_points': round(abs(proj_tp1 - proj_entry), 2),
                        'rr_ratio': f'1:{proj_rr}'
                    }
                }

        else: # BEARISH INDICATION
            origin = latest_ind['origin_price']
            trough = latest_ind['extreme_price']
            total_range = origin - trough

            highest_retrace = max([c['high'] for c in post_candles])
            retrace_amount = highest_retrace - trough
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
                        'entry': latest_ind['equilibrium_50'],
                        'stop_loss': origin,
                        'take_profit': trough,
                        'tp1_indication_low': trough,
                        'tp2_expansion': round(trough - total_range, 2),
                        'rr_ratio': '--'
                    }
                }

            is_in_healthy_zone = 30.0 <= retrace_pct <= 75.0
            last_c = candles[-1]
            prev_c = candles[-2] if len(candles) >= 2 else last_c
            bearish_reversal_trigger = (last_c['close'] < last_c['open'] and last_c['close'] < prev_c['low'])

            correction_info = {
                'status': 'HEALTHY' if is_in_healthy_zone else 'SHALLOW/DEEP',
                'highest_price': highest_retrace,
                'retrace_pct': retrace_pct,
                'zone_bottom': latest_ind['retrace_382'],
                'zone_top': latest_ind['retrace_618'],
                'equilibrium': latest_ind['equilibrium_50']
            }

            proj_entry = round(curr_price, 2)
            proj_sl = round(highest_retrace + 1.5, 2)
            proj_tp1 = round(trough, 2)
            proj_risk = max(abs(proj_sl - proj_entry), 0.5)
            proj_tp2 = round(proj_entry - (proj_risk * 2.0), 2)
            proj_tp3 = round(proj_entry - (proj_risk * 3.0), 2)
            proj_rr = round((proj_entry - proj_tp1) / proj_risk, 2) if proj_entry > proj_tp1 else 1.0

            if is_in_healthy_zone and bearish_reversal_trigger:
                entry = round(curr_price, 2)
                sl = round(highest_retrace + 1.5, 2)
                tp1 = round(trough, 2)
                risk = max(abs(sl - entry), 0.5)
                tp2 = round(entry - (risk * 2.0), 2)
                tp3 = round(entry - (risk * 3.0), 2)
                target_tp = min(tp1, tp2)
                reward = entry - target_tp
                rr = round(reward / risk, 2)

                if rr >= 1.8:
                    setup_grade = 'A+' if (45.0 <= retrace_pct <= 65.0) else 'A'
                    grade_desc = f'{setup_grade} Setup: Full Bearish ICC Expansion ({retrace_pct}% Retrace + Continuation Trigger + 1:{rr} R:R)'
                    return {
                        'phase': 'PHASE_3_CONTINUATION',
                        'phase_title': '🔴 PHASE 3: BEARISH CONTINUATION TRIGGERED (ENTER NOW)',
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
                            'entry': entry,
                            'stop_loss': sl,
                            'take_profit': target_tp,
                            'tp1_indication_low': tp1,
                            'tp2_expansion': tp2,
                            'tp3_runner': tp3,
                            'risk_points': round(risk, 2),
                            'reward_points': round(reward, 2),
                            'rr_ratio': f'1:{rr}'
                        }
                    }
                else:
                    return {
                        'phase': 'PHASE_3_CONTINUATION',
                        'phase_title': 'Continuation Trigger (R:R < 1:2 - Invalidated)',
                        'is_active_trade': False,
                        'direction': 'BEARISH',
                        'setup_grade': 'F',
                        'grade_desc': f'Trade Invalidated: Target Too Close (R:R 1:{rr} < 1:2.0)',
                        'confluence_score': 40,
                        'indication': latest_ind,
                        'correction': correction_info,
                        'trade_plan': {
                            'is_active': False,
                            'direction': 'BEARISH',
                            'entry': proj_entry,
                            'stop_loss': proj_sl,
                            'take_profit': proj_tp1,
                            'tp1_indication_low': proj_tp1,
                            'tp2_expansion': proj_tp2,
                            'tp3_runner': proj_tp3,
                            'rr_ratio': f'1:{rr}'
                        }
                    }
            else:
                return {
                    'phase': 'PHASE_2_CORRECTION',
                    'phase_title': f'⏳ Phase 2: Correction in Progress ({retrace_pct}% Retraced)',
                    'is_active_trade': False,
                    'direction': 'BEARISH',
                    'setup_grade': 'B',
                    'grade_desc': f'Phase 2: Pullback ({retrace_pct}%) in progress - Target TP: {proj_tp1}',
                    'confluence_score': 65 if is_in_healthy_zone else 40,
                    'indication': latest_ind,
                    'correction': correction_info,
                    'trade_plan': {
                        'is_active': False,
                        'direction': 'BEARISH',
                        'action': 'PULLBACK IN PROGRESS',
                        'entry': proj_entry,
                        'stop_loss': proj_sl,
                        'take_profit': proj_tp1,
                        'tp1_indication_low': proj_tp1,
                        'tp2_expansion': proj_tp2,
                        'tp3_runner': proj_tp3,
                        'risk_points': round(proj_risk, 2),
                        'reward_points': round(abs(proj_entry - proj_tp1), 2),
                        'rr_ratio': f'1:{proj_rr}'
                    }
                }

    @classmethod
    def analyze_symbol(cls, symbol_key: str, candles: List[Dict[str, float]], timeframe: str = '5m') -> Dict[str, Any]:
        if not candles or len(candles) < 10:
            return {'error': 'Insufficient candle data', 'symbol': symbol_key}

        latest_candle = candles[-1]
        current_price = latest_candle['close']

        swing_highs, swing_lows = cls.find_swings(candles, window=2)
        indications = cls.detect_indications(candles, swing_highs, swing_lows)
        icc_state = cls.evaluate_icc_lifecycle(candles, indications)

        return {
            'symbol': symbol_key,
            'timeframe': timeframe,
            'current_price': round(current_price, 2),
            'price_change_24h': round(latest_candle['close'] - candles[0]['open'], 2),
            'price_change_pct': round(((latest_candle['close'] - candles[0]['open']) / candles[0]['open']) * 100, 2),
            'phase': icc_state.get('phase', 'STANDBY'),
            'phase_title': icc_state.get('phase_title', 'Standby'),
            'is_active_trade': icc_state.get('is_active_trade', False),
            'direction': icc_state.get('direction', 'NEUTRAL'),
            'setup_grade': icc_state.get('setup_grade', 'F'),
            'grade_desc': icc_state.get('grade_desc', ''),
            'confluence_score': icc_state.get('confluence_score', 0),
            'indication': icc_state.get('indication'),
            'correction': icc_state.get('correction'),
            'trade_plan': icc_state.get('trade_plan'),
            'indications_history': indications[-6:],
            'swing_highs': swing_highs[-8:],
            'swing_lows': swing_lows[-8:]
        }

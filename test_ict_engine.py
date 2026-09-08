"""
Unit and Integration Tests for ICT Algorithmic Engine
"""

import unittest
import time
from ict_engine import ICTEngine


class TestICTEngine(unittest.TestCase):
    def setUp(self):
        self.engine = ICTEngine()

    def test_killzone_time_calculation(self):
        kz = self.engine.get_killzone_status()
        self.assertIn("ny_time_str", kz)
        self.assertIn("active_killzone", kz)
        self.assertIn("is_high_probability_time", kz)
        self.assertIn("minutes_to_next_event", kz)

    def test_bullish_fvg_detection(self):
        # Create synthetic 3 candles forming a Bullish FVG
        # C1 High = 100
        # C2 Displacement = Open 99, Close 110
        # C3 Low = 104 (Gap between C1 High 100 and C3 Low 104)
        t = int(time.time())
        candles = [
            {"time": t, "open": 98.0, "high": 100.0, "low": 97.0, "close": 99.0},
            {"time": t + 60, "open": 99.0, "high": 110.0, "low": 98.5, "close": 109.0},
            {"time": t + 120, "open": 109.0, "high": 112.0, "low": 104.0, "close": 111.0}
        ]
        fvgs = self.engine.detect_fvgs(candles, min_gap_ticks=1.0, tick_size=0.25)
        self.assertEqual(len(fvgs), 1)
        self.assertEqual(fvgs[0]['type'], "BULLISH_FVG")
        self.assertEqual(fvgs[0]['top'], 104.0)
        self.assertEqual(fvgs[0]['bottom'], 100.0)
        self.assertEqual(fvgs[0]['consequent_encroachment'], 102.0)

    def test_bearish_fvg_detection(self):
        t = int(time.time())
        candles = [
            {"time": t, "open": 110.0, "high": 111.0, "low": 105.0, "close": 106.0},
            {"time": t + 60, "open": 106.0, "high": 106.5, "low": 90.0, "close": 91.0},
            {"time": t + 120, "open": 91.0, "high": 98.0, "low": 88.0, "close": 89.0}
        ]
        fvgs = self.engine.detect_fvgs(candles, min_gap_ticks=1.0, tick_size=0.25)
        self.assertEqual(len(fvgs), 1)
        self.assertEqual(fvgs[0]['type'], "BEARISH_FVG")
        self.assertEqual(fvgs[0]['top'], 105.0)
        self.assertEqual(fvgs[0]['bottom'], 98.0)
        self.assertEqual(fvgs[0]['consequent_encroachment'], 101.5)

    def test_ote_calculation(self):
        ote_bull = self.engine.calculate_ote(100.0, 200.0, "BULLISH")
        self.assertEqual(ote_bull['equilibrium_50'], 150.0)
        self.assertEqual(ote_bull['ote_62'], 138.0)
        self.assertEqual(ote_bull['ote_705'], 129.5)
        self.assertEqual(ote_bull['ote_79'], 121.0)

    def test_symbol_analysis(self):
        t = int(time.time())
        # Generate 30 candles
        candles = []
        base = 20000.0
        for i in range(30):
            c_open = base + i * 2
            c_close = c_open + (3 if i % 2 == 0 else -1)
            c_high = max(c_open, c_close) + 2
            c_low = min(c_open, c_close) - 2
            candles.append({
                "time": t + i * 300,
                "open": c_open,
                "high": c_high,
                "low": c_low,
                "close": c_close,
                "volume": 1000
            })
        
        analysis = self.engine.analyze_symbol("MNQ", candles, "5m")
        self.assertEqual(analysis['symbol'], "MNQ")
        self.assertIn("confluence_score", analysis)
        self.assertIn("trade_plan", analysis)


if __name__ == "__main__":
    unittest.main()

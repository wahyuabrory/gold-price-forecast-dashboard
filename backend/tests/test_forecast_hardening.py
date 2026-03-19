import os
import sys
import unittest

import pandas as pd

# Ensure backend package imports work when running from repository root.
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from routes.api import _parse_csv
from services.predictor import GoldPredictor


class ForecastHardeningTests(unittest.TestCase):
    def test_parse_csv_mixed_dates_indonesian_style(self):
        df = pd.DataFrame({
            'Tanggal': ['31/12/2025', '01/01/2026', '02/01/2026'],
            'Harga': [2100000, 2105000, 2103000],
        })

        parsed = _parse_csv(df)

        self.assertEqual(len(parsed), 3)
        self.assertEqual(parsed['date'].iloc[0], '2025-12-31')
        self.assertEqual(parsed['date'].iloc[-1], '2026-01-02')
        self.assertIn('usd_idr', parsed.columns)
        self.assertIn('inflation', parsed.columns)
        self.assertIn('interest_rate', parsed.columns)

    def test_exogenous_projection_uses_trend(self):
        predictor = GoldPredictor()
        predictor.feature_ranges = {
            'usd_idr': (12000.0, 17000.0),
            'inflation': (0.0, 0.2),
            'interest_rate': (0.0, 0.2),
        }

        working_data = pd.DataFrame({
            'date': pd.date_range('2025-01-01', periods=20).strftime('%Y-%m-%d'),
            'gold_price': [2000000 + i * 1000 for i in range(20)],
            'usd_idr': [15500 + i * 10 for i in range(20)],
            'inflation': [0.030 + i * 0.0001 for i in range(20)],
            'interest_rate': [0.060 - i * 0.0001 for i in range(20)],
        })

        projections = predictor._project_exogenous_features(working_data, steps=7)

        self.assertEqual(len(projections), 7)
        self.assertNotAlmostEqual(
            float(projections['usd_idr'].iloc[0]),
            float(working_data['usd_idr'].iloc[-1]),
            places=6,
        )

    def test_price_clipping_guardrail(self):
        predictor = GoldPredictor()
        predictor.price_range = [100.0, 200.0]

        # 20% margin => upper bound should be 220
        clipped = predictor._clip_price_prediction(1000.0)
        self.assertLessEqual(clipped, 220.0)

    def test_fallback_payload_contract(self):
        predictor = GoldPredictor()
        data = pd.DataFrame({
            'date': pd.date_range('2025-01-01', periods=60).strftime('%Y-%m-%d'),
            'gold_price': [2000000 + i * 500 for i in range(60)],
            'usd_idr': [15000] * 60,
            'inflation': [0.03] * 60,
            'interest_rate': [0.05] * 60,
        })

        result = predictor._fallback_predict(data, days=30)

        self.assertTrue(result['success'])
        self.assertTrue(result['fallback'])
        self.assertEqual(len(result['predictions']), 30)
        self.assertIn('chart_data', result)
        self.assertIn('metrics', result)

    def test_prediction_path_calibration_reduces_large_level_gap(self):
        predictor = GoldPredictor()
        observed_prices = pd.Series([2200000 + i * 500 for i in range(60)], dtype=float)
        raw_predictions = [2100000.0 + i * 200.0 for i in range(20)]

        calibrated = predictor._calibrate_prediction_path(raw_predictions, observed_prices)

        # Day-1 should be pulled closer to last observed price when gap is large.
        last_price = float(observed_prices.iloc[-1])
        raw_gap = abs(last_price - raw_predictions[0])
        calibrated_gap = abs(last_price - float(calibrated[0]))
        self.assertLess(calibrated_gap, raw_gap)

    def test_prediction_path_calibration_keeps_length(self):
        predictor = GoldPredictor()
        observed_prices = pd.Series([2000000 + i * 1000 for i in range(80)], dtype=float)
        raw_predictions = [2050000.0] * 30

        calibrated = predictor._calibrate_prediction_path(raw_predictions, observed_prices)

        self.assertEqual(len(calibrated), len(raw_predictions))

    def test_dynamic_metrics_estimation_returns_mode(self):
        predictor = GoldPredictor()
        predictor.sequence_length = 5

        data = pd.DataFrame({
            'date': pd.date_range('2025-01-01', periods=140).strftime('%Y-%m-%d'),
            'gold_price': [2000000 + i * 1500 for i in range(140)],
            'usd_idr': [15500 + i * 2 for i in range(140)],
            'inflation': [0.03 + i * 0.00001 for i in range(140)],
            'interest_rate': [0.055 - i * 0.00001 for i in range(140)],
        })

        def fake_forecast(seed_data, days, exogenous_future=None, enable_logging=False):
            start = len(seed_data)
            future = data.iloc[start:start + days]
            return (future['gold_price'].values.astype(float) * 1.01)

        predictor._generate_recursive_forecast = fake_forecast

        metrics = predictor._estimate_metrics_for_request(data, days=7)

        self.assertEqual(metrics.get('metric_mode'), 'rolling_backtest_estimate')
        self.assertGreater(metrics.get('mape', 0), 0)
        self.assertIn('evaluation_samples', metrics)

    def test_dynamic_metrics_fallback_for_small_dataset(self):
        predictor = GoldPredictor()
        predictor.sequence_length = 60

        small_data = pd.DataFrame({
            'date': pd.date_range('2025-01-01', periods=70).strftime('%Y-%m-%d'),
            'gold_price': [2000000 + i * 1000 for i in range(70)],
            'usd_idr': [15500] * 70,
            'inflation': [0.03] * 70,
            'interest_rate': [0.05] * 70,
        })

        metrics = predictor._estimate_metrics_for_request(small_data, days=30)
        self.assertEqual(metrics, predictor._default_metrics())


if __name__ == '__main__':
    unittest.main()

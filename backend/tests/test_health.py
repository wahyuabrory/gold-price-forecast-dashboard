import os
import sys
import unittest
import json

# Ensure backend package imports work when running from repository root.
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import create_app


class HealthEndpointTests(unittest.TestCase):
    def setUp(self):
        """Set up test client before each test."""
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()

    def test_health_endpoint_exists(self):
        """Test that /api/health endpoint exists."""
        response = self.client.get('/api/health')
        self.assertIn(response.status_code, [200, 503])

    def test_health_response_structure(self):
        """Test that health response has required fields."""
        response = self.client.get('/api/health')
        data = response.json

        self.assertIn('status', data)
        self.assertIn('timestamp', data)
        self.assertIn('model', data)
        self.assertIn('dataset', data)
        self.assertIn('version', data)

    def test_health_model_info(self):
        """Test that model info is included in health response."""
        response = self.client.get('/api/health')
        data = response.json

        # Model should be loaded (GRU artifacts exist)
        self.assertTrue(data['model']['loaded'])
        self.assertEqual(data['model']['lookback'], 60)
        self.assertEqual(data['model']['features'], 19)

    def test_health_status_healthy_when_model_loaded(self):
        """Test that status is 'healthy' when model is loaded."""
        response = self.client.get('/api/health')
        data = response.json

        if data['model']['loaded']:
            self.assertEqual(data['status'], 'healthy')
            self.assertEqual(response.status_code, 200)

    def test_health_dataset_not_loaded_initially(self):
        """Test that dataset is not loaded before upload."""
        response = self.client.get('/api/health')
        data = response.json

        # Dataset should not be loaded in new session
        self.assertFalse(data['dataset']['loaded'])

    def test_health_with_dataset_in_session(self):
        """Test that dataset info is included after loading sample data."""
        # Load sample data first (will store in session)
        sample_response = self.client.get('/api/sample-data')
        self.assertTrue(sample_response.json['success'])

        # Now check health (same session should have dataset)
        health_response = self.client.get('/api/health')
        data = health_response.json

        # Dataset should now be loaded
        self.assertTrue(data['dataset']['loaded'])
        self.assertEqual(data['dataset']['records'], 3926)
        self.assertIn('filename', data['dataset'])

    def test_health_timestamp_format(self):
        """Test that timestamp is in ISO format."""
        response = self.client.get('/api/health')
        data = response.json

        # ISO format: 2026-03-27T15:04:26.570590
        timestamp = data['timestamp']
        self.assertIn('T', timestamp)  # Contains ISO datetime separator
        self.assertIn('-', timestamp)  # Contains date separator

    def test_health_version_present(self):
        """Test that version is present in response."""
        response = self.client.get('/api/health')
        data = response.json

        self.assertIsNotNone(data['version'])
        self.assertTrue(len(data['version']) > 0)


if __name__ == '__main__':
    unittest.main()

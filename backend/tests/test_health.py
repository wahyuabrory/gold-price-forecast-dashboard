import os
import sys
import unittest

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import create_app


class HealthEndpointTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()

    def test_health_endpoint_exists(self):
        response = self.client.get('/api/health')
        self.assertIn(response.status_code, [200, 503])

    def test_health_response_structure(self):
        response = self.client.get('/api/health')
        data = response.json

        self.assertIn('status', data)
        self.assertIn('timestamp', data)
        self.assertIn('model', data)
        self.assertIn('dataset', data)
        self.assertIn('version', data)

    def test_health_model_info(self):
        response = self.client.get('/api/health')
        data = response.json

        self.assertTrue(data['model']['loaded'])
        self.assertEqual(data['model']['lookback'], 60)
        self.assertEqual(data['model']['features'], 19)

    def test_health_status_healthy_when_model_loaded(self):
        response = self.client.get('/api/health')
        data = response.json

        if data['model']['loaded']:
            self.assertEqual(data['status'], 'healthy')
            self.assertEqual(response.status_code, 200)

    def test_health_dataset_not_loaded_initially(self):
        response = self.client.get('/api/health')
        data = response.json

        self.assertFalse(data['dataset']['loaded'])

    def test_health_with_dataset_in_session(self):
        sample_response = self.client.get('/api/sample-data')
        self.assertTrue(sample_response.json['success'])

        health_response = self.client.get('/api/health')
        data = health_response.json

        self.assertTrue(data['dataset']['loaded'])
        self.assertEqual(data['dataset']['records'], 3926)
        self.assertIn('filename', data['dataset'])

    def test_health_timestamp_format(self):
        response = self.client.get('/api/health')
        data = response.json

        timestamp = data['timestamp']
        self.assertIn('T', timestamp)
        self.assertIn('-', timestamp)

    def test_health_version_present(self):
        response = self.client.get('/api/health')
        data = response.json

        self.assertIsNotNone(data['version'])
        self.assertTrue(len(data['version']) > 0)


if __name__ == '__main__':
    unittest.main()

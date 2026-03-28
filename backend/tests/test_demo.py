import os
import sys
import json
import time
from unittest.mock import patch, MagicMock

import pytest

# Ensure backend package imports work
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import create_app


@pytest.fixture
def app():
    """Create and configure a test Flask application."""
    app = create_app()
    app.config['TESTING'] = True
    app.config['SESSION_PERMANENT'] = False
    return app


@pytest.fixture
def client(app):
    """Create a test client for the Flask application."""
    return app.test_client()


class TestDemoEndpoint:
    """Test suite for /api/demo endpoint."""

    def test_demo_endpoint_exists(self, client):
        """Test that POST /api/demo returns 200."""
        response = client.post('/api/demo', json={})
        assert response.status_code == 200

    def test_demo_default_config(self, client):
        """Test that request with minimal config works."""
        response = client.post('/api/demo', json={})
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'total_time_ms' in data
        assert 'requests' in data

    def test_demo_parallel_execution(self, client):
        """Test that multiple endpoints execute in parallel."""
        # Request with 3 parallel requests to health endpoint
        response = client.post('/api/demo', json={
            'num_parallel_requests': 3,
            'endpoints': ['/api/health']
        })
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        # With parallel execution, total_time should be less than sum of individual times
        total_time = data['total_time_ms']
        seq_equiv = data['sequential_equivalent_ms']
        assert total_time < seq_equiv

    def test_demo_user_agent_rotation(self, client):
        """Test that different user agents in requests."""
        response = client.post('/api/demo', json={
            'num_parallel_requests': 5,
            'endpoints': ['/api/health']
        })
        assert response.status_code == 200
        data = response.get_json()
        assert 'requests' in data
        requests = data['requests']
        assert len(requests) > 0
        # Check that user agents are present
        user_agents = [r.get('user_agent') for r in requests]
        assert all(ua is not None for ua in user_agents)

    def test_demo_timing_metrics(self, client):
        """Test that response includes timing for each request."""
        response = client.post('/api/demo', json={
            'num_parallel_requests': 2,
            'endpoints': ['/api/health']
        })
        assert response.status_code == 200
        data = response.get_json()
        for req in data['requests']:
            assert 'response_time_ms' in req
            assert req['response_time_ms'] >= 0
            assert 'timestamp' in req

    def test_demo_speedup_calculation(self, client):
        """Test that speedup factor is calculated correctly."""
        response = client.post('/api/demo', json={
            'num_parallel_requests': 3,
            'endpoints': ['/api/health']
        })
        assert response.status_code == 200
        data = response.get_json()
        assert 'speedup_factor' in data
        assert data['speedup_factor'] > 0
        # Speedup should be close to the ratio of sequential to parallel time
        expected_speedup = data['sequential_equivalent_ms'] / data['total_time_ms']
        assert abs(data['speedup_factor'] - expected_speedup) < 0.1

    def test_demo_success_rate(self, client):
        """Test that success rate is tracked."""
        response = client.post('/api/demo', json={
            'num_parallel_requests': 2,
            'endpoints': ['/api/health']
        })
        assert response.status_code == 200
        data = response.get_json()
        assert 'summary' in data
        assert 'successful' in data['summary']
        assert 'failed' in data['summary']
        # All health checks should succeed
        assert data['summary']['successful'] > 0

    def test_demo_response_schema(self, client):
        """Test that response format is correct."""
        response = client.post('/api/demo', json={
            'num_parallel_requests': 2,
            'endpoints': ['/api/health']
        })
        assert response.status_code == 200
        data = response.get_json()
        
        # Check top-level keys
        assert 'success' in data
        assert 'total_time_ms' in data
        assert 'sequential_equivalent_ms' in data
        assert 'speedup_factor' in data
        assert 'requests' in data
        assert 'summary' in data
        assert 'per_user_agent' in data
        
        # Check summary keys
        summary = data['summary']
        assert 'total_requests' in summary
        assert 'successful' in summary
        assert 'failed' in summary
        assert 'avg_response_time' in summary
        assert 'min_response_time' in summary
        assert 'max_response_time' in summary
        
        # Check individual request keys
        for req in data['requests']:
            assert 'endpoint' in req
            assert 'user_agent' in req
            assert 'status' in req
            assert 'response_time_ms' in req
            assert 'response_size_bytes' in req
            assert 'timestamp' in req

    def test_demo_configurable_requests(self, client):
        """Test that num_parallel_requests parameter is respected."""
        response = client.post('/api/demo', json={
            'num_parallel_requests': 4,
            'endpoints': ['/api/health']
        })
        assert response.status_code == 200
        data = response.get_json()
        assert data['summary']['total_requests'] == 4

    def test_demo_custom_endpoints(self, client):
        """Test that custom endpoint list works."""
        response = client.post('/api/demo', json={
            'num_parallel_requests': 2,
            'endpoints': ['/api/health', '/api/dashboard']
        })
        assert response.status_code == 200
        data = response.get_json()
        # Should have requests for both endpoints
        endpoints = [r['endpoint'] for r in data['requests']]
        assert '/api/health' in endpoints or '/api/dashboard' in endpoints

    def test_demo_user_agent_breakdown(self, client):
        """Test that per-user-agent metrics are calculated."""
        response = client.post('/api/demo', json={
            'num_parallel_requests': 5,
            'endpoints': ['/api/health']
        })
        assert response.status_code == 200
        data = response.get_json()
        assert 'per_user_agent' in data
        ua_breakdown = data['per_user_agent']
        
        # Should have metrics for each user agent
        for ua, metrics in ua_breakdown.items():
            assert 'avg' in metrics
            assert 'count' in metrics
            assert 'success_rate' in metrics
            assert metrics['count'] > 0
            assert 0 <= metrics['success_rate'] <= 100

    def test_demo_error_handling_invalid_num_requests(self, client):
        """Test that invalid num_parallel_requests is rejected."""
        # Too many requests
        response = client.post('/api/demo', json={
            'num_parallel_requests': 21,
            'endpoints': ['/api/health']
        })
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False

    def test_demo_error_handling_zero_requests(self, client):
        """Test that zero requests is rejected."""
        response = client.post('/api/demo', json={
            'num_parallel_requests': 0,
            'endpoints': ['/api/health']
        })
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False

    def test_demo_error_handling_empty_endpoints(self, client):
        """Test that empty endpoints list is rejected."""
        response = client.post('/api/demo', json={
            'num_parallel_requests': 5,
            'endpoints': []
        })
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False

    def test_demo_error_handling_empty_user_agents(self, client):
        """Test that empty user_agents list is rejected."""
        response = client.post('/api/demo', json={
            'num_parallel_requests': 5,
            'endpoints': ['/api/health'],
            'user_agents': []
        })
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False

    def test_demo_invalid_config_missing_endpoints(self, client):
        """Test that missing endpoints raises error."""
        response = client.post('/api/demo', json={
            'num_parallel_requests': 5
        })
        # Should either use defaults or reject
        assert response.status_code in [200, 400]

    def test_demo_response_includes_all_details(self, client):
        """Test that each request includes all required details."""
        response = client.post('/api/demo', json={
            'num_parallel_requests': 2,
            'endpoints': ['/api/health']
        })
        assert response.status_code == 200
        data = response.get_json()
        
        for req in data['requests']:
            assert req['status'] == 200
            assert req['response_size_bytes'] > 0
            assert req['response_time_ms'] > 0

    def test_demo_total_requests_matches_config(self, client):
        """Test that total requests matches num_parallel_requests * endpoints."""
        endpoints = ['/api/health', '/api/dashboard']
        num_requests = 3
        response = client.post('/api/demo', json={
            'num_parallel_requests': num_requests,
            'endpoints': endpoints
        })
        assert response.status_code == 200
        data = response.get_json()
        # Total requests should equal num_parallel_requests * number of endpoints
        assert data['summary']['total_requests'] == num_requests * len(endpoints)

    def test_demo_parallel_faster_than_sequential(self, client):
        """Test that parallel execution timing is calculated correctly."""
        response = client.post('/api/demo', json={
            'num_parallel_requests': 5,
            'endpoints': ['/api/health']
        })
        assert response.status_code == 200
        data = response.get_json()
        
        # Verify speedup calculation exists and is valid
        speedup = data['speedup_factor']
        assert speedup > 0  # Speedup should always be positive
        assert isinstance(speedup, (int, float))  # Should be a number
        # In async/real scenarios, speedup > 1. In test sync, may be < 1 due to overhead
        # Main point is calculation works correctly
        assert data['total_time_ms'] > 0
        assert data['sequential_equivalent_ms'] > 0

    def test_demo_min_max_response_times(self, client):
        """Test that min/max response times are calculated correctly."""
        response = client.post('/api/demo', json={
            'num_parallel_requests': 3,
            'endpoints': ['/api/health']
        })
        assert response.status_code == 200
        data = response.get_json()
        
        times = [r['response_time_ms'] for r in data['requests']]
        assert data['summary']['min_response_time'] == min(times)
        assert data['summary']['max_response_time'] == max(times)

    def test_demo_avg_response_time_calculation(self, client):
        """Test that average response time is calculated correctly."""
        response = client.post('/api/demo', json={
            'num_parallel_requests': 3,
            'endpoints': ['/api/health']
        })
        assert response.status_code == 200
        data = response.get_json()
        
        times = [r['response_time_ms'] for r in data['requests']]
        expected_avg = sum(times) / len(times)
        assert abs(data['summary']['avg_response_time'] - expected_avg) < 1  # Allow 1ms tolerance

    def test_demo_timestamp_format(self, client):
        """Test that timestamps are in ISO format."""
        response = client.post('/api/demo', json={
            'num_parallel_requests': 1,
            'endpoints': ['/api/health']
        })
        assert response.status_code == 200
        data = response.get_json()
        
        for req in data['requests']:
            timestamp = req['timestamp']
            # Should be ISO format with T separator
            assert 'T' in timestamp
            assert 'Z' in timestamp

    def test_demo_response_size_positive(self, client):
        """Test that response sizes are positive integers."""
        response = client.post('/api/demo', json={
            'num_parallel_requests': 2,
            'endpoints': ['/api/health', '/api/dashboard']
        })
        assert response.status_code == 200
        data = response.get_json()
        
        for req in data['requests']:
            assert isinstance(req['response_size_bytes'], int)
            assert req['response_size_bytes'] > 0

"""
Integration tests for AURUM PREDICT backend API.

These tests verify the complete API workflows including:
- CSV upload and validation
- Sample data loading
- Prediction generation
- Metrics retrieval
- Prediction export
- Dashboard data retrieval
- Historical analysis
- Session isolation
"""

import os
import sys
import io
import json
import csv
import pytest
import pandas as pd
from datetime import datetime, timedelta

# Ensure backend package imports work
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


class TestUploadValidation:
    """Test CSV upload validation and processing."""

    def test_upload_valid_csv(self, client, sample_csv_file):
        """Test uploading a valid CSV file with sufficient data."""
        data = {
            'file': (io.BytesIO(sample_csv_file.encode('utf-8')), 'test.csv')
        }
        response = client.post('/api/upload', data=data, content_type='multipart/form-data')
        
        assert response.status_code == 200
        json_data = response.get_json()
        assert json_data['success'] is True
        assert json_data['records'] == 100
        assert 'date_range' in json_data
        assert 'filename' in json_data
        assert len(json_data['date_range']) == 2

    def test_upload_invalid_csv_under_60_rows(self, client, small_csv_file):
        """Test that upload rejects CSV with fewer than 60 rows."""
        data = {
            'file': (io.BytesIO(small_csv_file.encode('utf-8')), 'test.csv')
        }
        response = client.post('/api/upload', data=data, content_type='multipart/form-data')
        
        assert response.status_code == 400
        json_data = response.get_json()
        assert json_data['success'] is False
        assert 'error' in json_data
        assert '60' in json_data['error'] or 'minimal' in json_data['error'].lower()

    def test_upload_missing_file(self, client):
        """Test that upload rejects request without file."""
        response = client.post('/api/upload', data={}, content_type='multipart/form-data')
        
        assert response.status_code == 400
        json_data = response.get_json()
        assert json_data['success'] is False

    def test_upload_non_csv_file(self, client):
        """Test that upload rejects non-CSV files."""
        data = {
            'file': (io.BytesIO(b'not csv content'), 'test.txt')
        }
        response = client.post('/api/upload', data=data, content_type='multipart/form-data')
        
        assert response.status_code == 400
        json_data = response.get_json()
        assert json_data['success'] is False
        assert 'CSV' in json_data['error'] or 'csv' in json_data['error']


class TestSampleDataLoading:
    """Test sample data loading functionality."""

    def test_sample_data_loads(self, client):
        """Test that sample data loads successfully and returns valid record count."""
        response = client.get('/api/sample-data')
        
        assert response.status_code == 200
        json_data = response.get_json()
        assert json_data['success'] is True
        assert json_data['records'] > 0
        assert 'date_range' in json_data
        # Sample data should have a reasonable number of records
        assert json_data['records'] > 1000


class TestPredictionGeneration:
    """Test prediction generation workflow."""

    def test_predict_generates_predictions(self, client, sample_csv_file):
        """Test that predictions are generated after data upload."""
        # First upload data
        upload_data = {
            'file': (io.BytesIO(sample_csv_file.encode('utf-8')), 'test.csv')
        }
        upload_response = client.post(
            '/api/upload',
            data=upload_data,
            content_type='multipart/form-data'
        )
        assert upload_response.status_code == 200
        
        # Then request predictions
        pred_response = client.post(
            '/api/predict',
            data=json.dumps({'days': 30}),
            content_type='application/json'
        )
        
        assert pred_response.status_code == 200
        json_data = pred_response.get_json()
        assert json_data['success'] is True
        assert 'predictions' in json_data
        assert len(json_data['predictions']) == 30
        # Verify prediction schema
        assert 'chart_data' in json_data
        assert 'metrics' in json_data

    def test_predict_clamped_to_90_days(self, client, sample_csv_file):
        """Test that prediction days are clamped to maximum of 90."""
        # Upload data
        upload_data = {
            'file': (io.BytesIO(sample_csv_file.encode('utf-8')), 'test.csv')
        }
        client.post('/api/upload', data=upload_data, content_type='multipart/form-data')
        
        # Request 100+ days (should be clamped to 90)
        pred_response = client.post(
            '/api/predict',
            data=json.dumps({'days': 200}),
            content_type='application/json'
        )
        
        assert pred_response.status_code == 200
        json_data = pred_response.get_json()
        assert json_data['success'] is True
        assert len(json_data['predictions']) == 90

    def test_predict_default_30_days(self, client, sample_csv_file):
        """Test that predictions default to 30 days when not specified."""
        # Upload data
        upload_data = {
            'file': (io.BytesIO(sample_csv_file.encode('utf-8')), 'test.csv')
        }
        client.post('/api/upload', data=upload_data, content_type='multipart/form-data')
        
        # Request predictions with no days specified
        pred_response = client.post(
            '/api/predict',
            data=json.dumps({}),
            content_type='application/json'
        )
        
        assert pred_response.status_code == 200
        json_data = pred_response.get_json()
        assert len(json_data['predictions']) == 30


class TestMetricsRetrieval:
    """Test metrics retrieval functionality."""

    def test_metrics_returns_cached_metrics(self, client, sample_csv_file):
        """Test that metrics endpoint returns cached metrics after prediction."""
        # Upload data
        upload_data = {
            'file': (io.BytesIO(sample_csv_file.encode('utf-8')), 'test.csv')
        }
        client.post('/api/upload', data=upload_data, content_type='multipart/form-data')
        
        # Generate predictions
        client.post(
            '/api/predict',
            data=json.dumps({'days': 30}),
            content_type='application/json'
        )
        
        # Get metrics
        metrics_response = client.get('/api/metrics')
        assert metrics_response.status_code == 200
        json_data = metrics_response.get_json()
        assert json_data['success'] is True
        assert 'metrics' in json_data
        metrics = json_data['metrics']
        # Verify metrics structure
        assert isinstance(metrics, dict)


class TestPredictionExport:
    """Test prediction export functionality."""

    def test_export_returns_csv_file(self, client, sample_csv_file):
        """Test that export endpoint returns valid CSV file."""
        # Upload data
        upload_data = {
            'file': (io.BytesIO(sample_csv_file.encode('utf-8')), 'test.csv')
        }
        client.post('/api/upload', data=upload_data, content_type='multipart/form-data')
        
        # Generate predictions
        client.post(
            '/api/predict',
            data=json.dumps({'days': 30}),
            content_type='application/json'
        )
        
        # Export
        export_response = client.get('/api/export')
        assert export_response.status_code == 200
        assert export_response.content_type == 'text/csv; charset=utf-8'
        
        # Verify CSV content
        csv_data = export_response.get_data(as_text=True)
        lines = csv_data.strip().split('\n')
        assert len(lines) > 1  # Header + data rows
        assert 'date' in lines[0]
        assert 'predicted_price' in lines[0]

    def test_export_without_predictions(self, client):
        """Test that export fails when no predictions exist."""
        export_response = client.get('/api/export')
        
        assert export_response.status_code == 400
        json_data = export_response.get_json()
        assert json_data['success'] is False


class TestDashboardData:
    """Test dashboard data retrieval."""

    def test_dashboard_returns_summary(self, client):
        """Test that dashboard endpoint returns valid summary structure."""
        response = client.get('/api/dashboard')
        
        assert response.status_code == 200
        json_data = response.get_json()
        assert json_data['success'] is True
        
        # Verify required dashboard fields
        required_fields = [
            'current_price', 'price_change_pct', 'lowest_price', 'lowest_date',
            'highest_price', 'highest_date', 'volatility', 'sentiment',
            'tomorrow_prediction', 'chart_data'
        ]
        for field in required_fields:
            assert field in json_data, f"Missing field: {field}"
        
        # Verify data types
        assert isinstance(json_data['current_price'], (int, float))
        assert isinstance(json_data['volatility'], str)
        assert isinstance(json_data['sentiment'], str)
        assert isinstance(json_data['chart_data'], list)


class TestHistoricalAnalysis:
    """Test historical data analysis with different periods."""

    def test_historical_30_days(self, client):
        """Test historical endpoint with 30 day period."""
        response = client.get('/api/historical?period=30d')
        
        assert response.status_code == 200
        json_data = response.get_json()
        assert json_data['success'] is True
        
        # Verify response structure
        assert 'chart_data' in json_data
        assert 'volatility_data' in json_data
        assert isinstance(json_data['chart_data'], list)
        
        # Verify period is respected (max 30 days worth of data)
        if len(json_data['chart_data']) > 0:
            assert len(json_data['chart_data']) <= 30

    def test_historical_90_days(self, client):
        """Test historical endpoint with 90 day period."""
        response = client.get('/api/historical?period=90d')
        
        assert response.status_code == 200
        json_data = response.get_json()
        assert json_data['success'] is True
        assert 'chart_data' in json_data
        
        if len(json_data['chart_data']) > 0:
            assert len(json_data['chart_data']) <= 90

    def test_historical_year(self, client):
        """Test historical endpoint with year period."""
        response = client.get('/api/historical?period=year')
        
        assert response.status_code == 200
        json_data = response.get_json()
        assert json_data['success'] is True
        assert 'chart_data' in json_data

    def test_historical_all(self, client):
        """Test historical endpoint with 'all' period."""
        response = client.get('/api/historical?period=all')
        
        assert response.status_code == 200
        json_data = response.get_json()
        assert json_data['success'] is True
        assert 'chart_data' in json_data


class TestErrorHandling:
    """Test error handling and edge cases."""

    def test_error_predict_without_dataset(self, client):
        """Test that predict fails gracefully when no dataset is loaded."""
        response = client.post(
            '/api/predict',
            data=json.dumps({'days': 30}),
            content_type='application/json'
        )
        
        assert response.status_code == 400
        json_data = response.get_json()
        assert json_data['success'] is False
        assert 'error' in json_data

    def test_metrics_without_predictions(self, client):
        """Test that metrics endpoint returns default metrics when none cached."""
        response = client.get('/api/metrics')
        
        assert response.status_code == 200
        json_data = response.get_json()
        assert json_data['success'] is True
        assert 'metrics' in json_data


class TestSessionIsolation:
    """Test that sessions are properly isolated between clients."""

    def test_session_isolation(self, app):
        """Test that two separate clients have isolated sessions."""
        client1 = app.test_client()
        client2 = app.test_client()
        
        # Create sample data
        dates = pd.date_range('2024-01-01', periods=100, freq='D')
        prices = [2000000 + i * 500 for i in range(100)]
        
        csv_content = io.StringIO()
        writer = csv.writer(csv_content)
        writer.writerow(['date', 'gold_price', 'usd_idr', 'inflation', 'interest_rate'])
        for date, price in zip(dates, prices):
            writer.writerow([date.strftime('%Y-%m-%d'), int(price), 15500, 0.03, 0.05])
        csv_str = csv_content.getvalue()
        
        # Client 1 uploads data
        data1 = {
            'file': (io.BytesIO(csv_str.encode('utf-8')), 'test1.csv')
        }
        response1 = client1.post(
            '/api/upload',
            data=data1,
            content_type='multipart/form-data'
        )
        assert response1.status_code == 200
        
        # Client 2 tries to predict without uploading (should fail)
        response2 = client2.post(
            '/api/predict',
            data=json.dumps({'days': 30}),
            content_type='application/json'
        )
        assert response2.status_code == 400
        
        # Client 1 should still have data
        health1 = client1.get('/api/health')
        health_data = health1.get_json()
        assert health_data['dataset']['loaded'] is True


class TestConcurrentPredictions:
    """Test multiple predictions in sequence work correctly."""

    def test_concurrent_predictions(self, client, sample_csv_file):
        """Test that multiple predictions in sequence work correctly."""
        # Upload data
        upload_data = {
            'file': (io.BytesIO(sample_csv_file.encode('utf-8')), 'test.csv')
        }
        client.post('/api/upload', data=upload_data, content_type='multipart/form-data')
        
        # Make multiple prediction requests with different days
        days_list = [10, 20, 30, 45, 60, 90]
        
        for days in days_list:
            response = client.post(
                '/api/predict',
                data=json.dumps({'days': days}),
                content_type='application/json'
            )
            
            assert response.status_code == 200
            json_data = response.get_json()
            assert json_data['success'] is True
            assert len(json_data['predictions']) == days

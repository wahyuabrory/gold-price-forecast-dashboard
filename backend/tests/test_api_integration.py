
import os
import sys
import io
import json
import csv
import time
import pandas as pd

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


def wait_for_job_completion(client, job_id, timeout_seconds=30):
    deadline = time.time() + timeout_seconds
    last_payload = None

    while time.time() < deadline:
        response = client.get(f'/api/job/{job_id}/status')
        assert response.status_code == 200
        payload = response.get_json()
        last_payload = payload

        if payload.get('status') in {'complete', 'failed'}:
            return payload

        time.sleep(0.15)

    raise AssertionError(f'Prediction job did not finish in time. Last payload: {last_payload}')


class TestUploadValidation:

    def test_upload_valid_csv(self, client, sample_csv_file):
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
        response = client.post('/api/upload', data={}, content_type='multipart/form-data')

        assert response.status_code == 400
        json_data = response.get_json()
        assert json_data['success'] is False

    def test_upload_non_csv_file(self, client):
        data = {
            'file': (io.BytesIO(b'not csv content'), 'test.txt')
        }
        response = client.post('/api/upload', data=data, content_type='multipart/form-data')

        assert response.status_code == 400
        json_data = response.get_json()
        assert json_data['success'] is False
        assert 'CSV' in json_data['error'] or 'csv' in json_data['error']


class TestSampleDataLoading:

    def test_sample_data_loads(self, client):
        response = client.get('/api/sample-data')

        assert response.status_code == 200
        json_data = response.get_json()
        assert json_data['success'] is True
        assert json_data['records'] > 0
        assert 'date_range' in json_data
        assert json_data['records'] > 1000


class TestPredictionGeneration:

    def test_predict_generates_predictions(self, client, sample_csv_file):
        upload_data = {
            'file': (io.BytesIO(sample_csv_file.encode('utf-8')), 'test.csv')
        }
        upload_response = client.post(
            '/api/upload',
            data=upload_data,
            content_type='multipart/form-data'
        )
        assert upload_response.status_code == 200

        pred_response = client.post(
            '/api/predict',
            data=json.dumps({'days': 30}),
            content_type='application/json'
        )

        assert pred_response.status_code == 202
        json_data = pred_response.get_json()
        assert json_data['success'] is True
        assert 'job_id' in json_data

        result_payload = wait_for_job_completion(client, json_data['job_id'])
        assert result_payload['status'] == 'complete'
        result = result_payload['result']
        assert 'predictions' in result
        assert len(result['predictions']) == 30
        assert 'chart_data' in result
        assert 'metrics' in result

    def test_predict_clamped_to_90_days(self, client, sample_csv_file):
        upload_data = {
            'file': (io.BytesIO(sample_csv_file.encode('utf-8')), 'test.csv')
        }
        client.post('/api/upload', data=upload_data, content_type='multipart/form-data')

        pred_response = client.post(
            '/api/predict',
            data=json.dumps({'days': 200}),
            content_type='application/json'
        )

        assert pred_response.status_code == 202
        json_data = pred_response.get_json()
        assert json_data['success'] is True
        result_payload = wait_for_job_completion(client, json_data['job_id'])
        assert result_payload['status'] == 'complete'
        assert len(result_payload['result']['predictions']) == 90

    def test_predict_default_30_days(self, client, sample_csv_file):
        upload_data = {
            'file': (io.BytesIO(sample_csv_file.encode('utf-8')), 'test.csv')
        }
        client.post('/api/upload', data=upload_data, content_type='multipart/form-data')

        pred_response = client.post(
            '/api/predict',
            data=json.dumps({}),
            content_type='application/json'
        )

        assert pred_response.status_code == 202
        json_data = pred_response.get_json()
        result_payload = wait_for_job_completion(client, json_data['job_id'])
        assert result_payload['status'] == 'complete'
        assert len(result_payload['result']['predictions']) == 30

    def test_second_predict_request_returns_conflict_while_active(self, client, sample_csv_file):
        upload_data = {
            'file': (io.BytesIO(sample_csv_file.encode('utf-8')), 'test.csv')
        }
        client.post('/api/upload', data=upload_data, content_type='multipart/form-data')

        first = client.post(
            '/api/predict',
            data=json.dumps({'days': 30}),
            content_type='application/json'
        )
        assert first.status_code == 202
        first_job_id = first.get_json()['job_id']

        second = client.post(
            '/api/predict',
            data=json.dumps({'days': 15}),
            content_type='application/json'
        )
        assert second.status_code == 409

        wait_for_job_completion(client, first_job_id)


class TestMetricsRetrieval:

    def test_metrics_returns_cached_metrics(self, client, sample_csv_file):
        upload_data = {
            'file': (io.BytesIO(sample_csv_file.encode('utf-8')), 'test.csv')
        }
        client.post('/api/upload', data=upload_data, content_type='multipart/form-data')

        prediction_response = client.post(
            '/api/predict',
            data=json.dumps({'days': 30}),
            content_type='application/json'
        )
        assert prediction_response.status_code == 202

        job_id = prediction_response.get_json()['job_id']
        final_payload = wait_for_job_completion(client, job_id)
        assert final_payload['status'] == 'complete'

        metrics_response = client.get('/api/metrics')
        assert metrics_response.status_code == 200
        json_data = metrics_response.get_json()
        assert json_data['success'] is True
        assert 'metrics' in json_data
        metrics = json_data['metrics']
        assert isinstance(metrics, dict)


class TestPredictionExport:

    def test_export_returns_csv_file(self, client, sample_csv_file):
        upload_data = {
            'file': (io.BytesIO(sample_csv_file.encode('utf-8')), 'test.csv')
        }
        client.post('/api/upload', data=upload_data, content_type='multipart/form-data')

        prediction_response = client.post(
            '/api/predict',
            data=json.dumps({'days': 30}),
            content_type='application/json'
        )
        assert prediction_response.status_code == 202

        job_id = prediction_response.get_json()['job_id']
        final_payload = wait_for_job_completion(client, job_id)
        assert final_payload['status'] == 'complete'

        export_response = client.get('/api/export')
        assert export_response.status_code == 200
        assert export_response.content_type == 'text/csv; charset=utf-8'

        csv_data = export_response.get_data(as_text=True)
        lines = csv_data.strip().split('\n')
        assert len(lines) > 1
        assert 'date' in lines[0]
        assert 'predicted_price' in lines[0]

    def test_export_without_predictions(self, client):
        export_response = client.get('/api/export')

        assert export_response.status_code == 400
        json_data = export_response.get_json()
        assert json_data['success'] is False


class TestDashboardData:

    def test_dashboard_returns_summary(self, client):
        response = client.get('/api/dashboard')

        assert response.status_code == 200
        json_data = response.get_json()
        assert json_data['success'] is True

        required_fields = [
            'current_price', 'price_change_pct', 'lowest_price', 'lowest_date',
            'highest_price', 'highest_date', 'volatility', 'sentiment',
            'tomorrow_prediction', 'chart_data'
        ]
        for field in required_fields:
            assert field in json_data, f"Missing field: {field}"

        assert isinstance(json_data['current_price'], (int, float))
        assert isinstance(json_data['volatility'], str)
        assert isinstance(json_data['sentiment'], str)
        assert isinstance(json_data['chart_data'], list)


class TestHistoricalAnalysis:

    def test_historical_30_days(self, client):
        response = client.get('/api/historical?period=30d')

        assert response.status_code == 200
        json_data = response.get_json()
        assert json_data['success'] is True

        assert 'chart_data' in json_data
        assert 'volatility_data' in json_data
        assert 'biggest_gain_date' in json_data
        assert 'biggest_loss_date' in json_data
        assert isinstance(json_data['chart_data'], list)

        if len(json_data['chart_data']) > 0:
            assert len(json_data['chart_data']) <= 30

    def test_historical_90_days(self, client):
        response = client.get('/api/historical?period=90d')

        assert response.status_code == 200
        json_data = response.get_json()
        assert json_data['success'] is True
        assert 'chart_data' in json_data

        if len(json_data['chart_data']) > 0:
            assert len(json_data['chart_data']) <= 90

    def test_historical_year(self, client):
        response = client.get('/api/historical?period=year')

        assert response.status_code == 200
        json_data = response.get_json()
        assert json_data['success'] is True
        assert 'chart_data' in json_data

    def test_historical_all(self, client):
        response = client.get('/api/historical?period=all')

        assert response.status_code == 200
        json_data = response.get_json()
        assert json_data['success'] is True
        assert 'chart_data' in json_data


class TestErrorHandling:

    def test_error_predict_without_dataset(self, client):
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
        response = client.get('/api/metrics')

        assert response.status_code == 200
        json_data = response.get_json()
        assert json_data['success'] is True
        assert 'metrics' in json_data


class TestSessionIsolation:

    def test_session_isolation(self, app):
        client1 = app.test_client()
        client2 = app.test_client()

        dates = pd.date_range('2024-01-01', periods=100, freq='D')
        prices = [2000000 + i * 500 for i in range(100)]

        csv_content = io.StringIO()
        writer = csv.writer(csv_content)
        writer.writerow(['date', 'gold_price', 'usd_idr', 'inflation', 'interest_rate'])
        for date, price in zip(dates, prices):
            writer.writerow([date.strftime('%Y-%m-%d'), int(price), 15500, 0.03, 0.05])
        csv_str = csv_content.getvalue()

        data1 = {
            'file': (io.BytesIO(csv_str.encode('utf-8')), 'test1.csv')
        }
        response1 = client1.post(
            '/api/upload',
            data=data1,
            content_type='multipart/form-data'
        )
        assert response1.status_code == 200

        response2 = client2.post(
            '/api/predict',
            data=json.dumps({'days': 30}),
            content_type='application/json'
        )
        assert response2.status_code == 400

        health1 = client1.get('/api/health')
        health_data = health1.get_json()
        assert health_data['dataset']['loaded'] is True


class TestConcurrentPredictions:

    def test_concurrent_predictions(self, client, sample_csv_file):
        upload_data = {
            'file': (io.BytesIO(sample_csv_file.encode('utf-8')), 'test.csv')
        }
        client.post('/api/upload', data=upload_data, content_type='multipart/form-data')

        days_list = [10, 20, 30, 45, 60, 90]

        for days in days_list:
            response = client.post(
                '/api/predict',
                data=json.dumps({'days': days}),
                content_type='application/json'
            )

            assert response.status_code == 202
            json_data = response.get_json()
            assert json_data['success'] is True
            final_payload = wait_for_job_completion(client, json_data['job_id'])
            assert final_payload['status'] == 'complete'
            assert len(final_payload['result']['predictions']) == days

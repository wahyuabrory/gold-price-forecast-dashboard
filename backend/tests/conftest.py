import os
import sys
import io
import csv
import pytest
import pandas as pd

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import create_app


@pytest.fixture
def app():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SESSION_PERMANENT'] = False

    return app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def runner(app):
    return app.test_cli_runner()


@pytest.fixture
def sample_csv_file():
    dates = pd.date_range('2024-01-01', periods=100, freq='D')
    prices = [2000000 + i * 500 + (i % 10) * 100 for i in range(100)]
    usd_idr = [15500 + i * 2 for i in range(100)]
    inflation = [0.030] * 100
    interest_rate = [0.055] * 100

    csv_content = io.StringIO()
    writer = csv.writer(csv_content)
    writer.writerow(['date', 'gold_price', 'usd_idr', 'inflation', 'interest_rate'])

    for date, price, usd, infl, rate in zip(dates, prices, usd_idr, inflation, interest_rate):
        writer.writerow([
            date.strftime('%Y-%m-%d'),
            int(price),
            usd,
            infl,
            rate
        ])

    return csv_content.getvalue()


@pytest.fixture
def small_csv_file():
    dates = pd.date_range('2024-01-01', periods=50, freq='D')
    prices = [2000000 + i * 500 for i in range(50)]

    csv_content = io.StringIO()
    writer = csv.writer(csv_content)
    writer.writerow(['date', 'gold_price', 'usd_idr', 'inflation', 'interest_rate'])

    for date, price in zip(dates, prices):
        writer.writerow([
            date.strftime('%Y-%m-%d'),
            int(price),
            15500,
            0.03,
            0.05
        ])

    return csv_content.getvalue()


@pytest.fixture
def invalid_csv_file():
    csv_content = io.StringIO()
    writer = csv.writer(csv_content)
    writer.writerow(['date', 'gold_price'])
    writer.writerow(['invalid-date', 'not-a-number'])
    writer.writerow(['2024-01-01', ''])

    return csv_content.getvalue()


def csv_to_file(csv_content):
    file_obj = io.BytesIO(csv_content.encode('utf-8'))
    file_obj.name = 'test.csv'
    return file_obj


@pytest.fixture
def upload_sample_data(client):
    def _upload(csv_content):
        data = {
            'file': (io.BytesIO(csv_content.encode('utf-8')), 'test.csv')
        }
        return client.post('/api/upload', data=data, content_type='multipart/form-data')

    return _upload

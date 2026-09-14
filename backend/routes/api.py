import os
import io
import csv
import uuid
import threading
import logging
from datetime import datetime

import pandas as pd
import numpy as np
from flask import Blueprint, request, jsonify, session, send_file

from services.predictor import predictor

logger = logging.getLogger(__name__)

api_bp = Blueprint('api', __name__, url_prefix='/api')

SAMPLE_DATA_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), '..', 'backend/models', 'dataset_final.csv'
)

PREDICTION_JOBS = {}
PREDICTION_JOBS_LOCK = threading.Lock()
ACTIVE_JOB_ID = None


def _set_active_job(job_id):
    global ACTIVE_JOB_ID
    ACTIVE_JOB_ID = job_id


def _clear_active_job_if_matches(job_id):
    global ACTIVE_JOB_ID
    if ACTIVE_JOB_ID == job_id:
        ACTIVE_JOB_ID = None


def _is_job_active(job):
    return bool(job) and job.get('status') in {'pending', 'running'}


def _run_prediction_job(job_id, dataset_json, days):
    try:
        with PREDICTION_JOBS_LOCK:
            job = PREDICTION_JOBS.get(job_id)
            if not job:
                return
            job['status'] = 'running'
            job['started_at'] = datetime.now().isoformat()

        df = pd.read_json(io.StringIO(dataset_json), orient='records')
        if pd.api.types.is_datetime64_any_dtype(df['date']):
            df['date'] = df['date'].dt.strftime('%Y-%m-%d')

        model_loaded = predictor.load_model()
        if not model_loaded:
            logger.warning('Model failed to load in async prediction job. Predictor may use fallback mode.')

        result = predictor.predict(df, days=days)

        with PREDICTION_JOBS_LOCK:
            job = PREDICTION_JOBS.get(job_id)
            if not job:
                return

            if result.get('success'):
                prediction_count = len(result.get('predictions', []))
                prediction_dates = [
                    (pd.to_datetime(df['date'].iloc[-1]) + pd.Timedelta(days=i + 1)).strftime('%Y-%m-%d')
                    for i in range(prediction_count)
                ]
                job['status'] = 'complete'
                job['result'] = result
                job['prediction_dates'] = prediction_dates
            else:
                job['status'] = 'failed'
                job['error'] = result.get('error', 'Prediction failed')
                job['result'] = result

            job['finished_at'] = datetime.now().isoformat()
            _clear_active_job_if_matches(job_id)
    except Exception as e:
        logger.error('Async prediction job failed: %s', e)
        with PREDICTION_JOBS_LOCK:
            job = PREDICTION_JOBS.get(job_id)
            if job is not None:
                job['status'] = 'failed'
                job['error'] = str(e)
                job['finished_at'] = datetime.now().isoformat()
            _clear_active_job_if_matches(job_id)


@api_bp.route('/health', methods=['GET'])
def health():
    model_loaded = predictor._loaded
    if not model_loaded:
        model_loaded = predictor.load_model()

    dataset_loaded = 'dataset' in session

    dataset_info = None
    if dataset_loaded:
        try:
            records = session.get('records', 0)
            filename = session.get('filename', 'unknown')
            dataset_info = {
                'loaded': True,
                'records': records,
                'filename': filename,
            }
        except Exception as e:
            logger.error(f"Error reading dataset from session: {e}")
            dataset_info = {'loaded': False}

    is_healthy = model_loaded

    response = {
        'status': 'healthy' if is_healthy else 'degraded',
        'timestamp': datetime.now().isoformat(),
        'model': {
            'loaded': model_loaded,
            'lookback': predictor.sequence_length if model_loaded else None,
            'features': len(predictor.feature_names) if model_loaded and predictor.feature_names else None,
        },
        'dataset': dataset_info or {'loaded': False},
        'version': '1.0.0',
    }

    status_code = 200 if is_healthy else 503
    return jsonify(response), status_code


def _parse_csv(df):
    df.columns = [c.strip().lower().replace(' ', '_') for c in df.columns]

    date_col = None
    for col in ['date', 'tanggal', 'dates']:
        if col in df.columns:
            date_col = col
            break
    if date_col is None:
        date_col = df.columns[0]

    price_col = None
    for col in ['gold_price', 'close', 'price', 'harga', 'close_price']:
        if col in df.columns:
            price_col = col
            break
    if price_col is None:
        price_col = df.columns[1]

    usd_idr_col = None
    inflation_col = None
    interest_rate_col = None

    for col in df.columns:
        col_lower = col.lower()
        if 'usd' in col_lower or 'idr' in col_lower:
            usd_idr_col = col
        elif 'inflation' in col_lower:
            inflation_col = col
        elif 'interest' in col_lower or 'rate' in col_lower:
            interest_rate_col = col

    raw_dates = df[date_col].astype(str).str.strip()

    parsed_dates_dayfirst_false = pd.to_datetime(raw_dates, format='mixed', dayfirst=False, errors='coerce')
    parsed_dates_dayfirst_true = pd.to_datetime(raw_dates, format='mixed', dayfirst=True, errors='coerce')

    nat_false = int(parsed_dates_dayfirst_false.isna().sum())
    nat_true = int(parsed_dates_dayfirst_true.isna().sum())

    preferred_dayfirst = date_col in ('tanggal',)
    if nat_true < nat_false:
        df[date_col] = parsed_dates_dayfirst_true
    elif nat_false < nat_true:
        df[date_col] = parsed_dates_dayfirst_false
    else:
        df[date_col] = parsed_dates_dayfirst_true if preferred_dayfirst else parsed_dates_dayfirst_false

    if df[date_col].isna().all():
        raise ValueError('Kolom tanggal tidak dapat diparse. Gunakan format tanggal yang valid.')

    df = df.sort_values(date_col).reset_index(drop=True)

    result = {
        'date': df[date_col].dt.strftime('%Y-%m-%d'),
        'gold_price': pd.to_numeric(df[price_col], errors='coerce'),
    }

    if usd_idr_col:
        result['usd_idr'] = pd.to_numeric(df[usd_idr_col], errors='coerce')
    else:
        logger.warning('Kolom usd_idr tidak ditemukan. Menggunakan default 13000.0')
        result['usd_idr'] = 13000.0

    if inflation_col:
        result['inflation'] = pd.to_numeric(df[inflation_col], errors='coerce')
    else:
        logger.warning('Kolom inflation tidak ditemukan. Menggunakan default 0.03')
        result['inflation'] = 0.03

    if interest_rate_col:
        result['interest_rate'] = pd.to_numeric(df[interest_rate_col], errors='coerce')
    else:
        logger.warning('Kolom interest_rate tidak ditemukan. Menggunakan default 0.05')
        result['interest_rate'] = 0.05

    result_df = pd.DataFrame(result)

    for col in ['usd_idr', 'inflation', 'interest_rate']:
        result_df[col] = pd.to_numeric(result_df[col], errors='coerce')
        if result_df[col].isna().any():
            result_df[col] = result_df[col].ffill().bfill()

    result_df = result_df.dropna(subset=['date', 'gold_price'])

    result_df = result_df.drop_duplicates(subset=['date'], keep='last').reset_index(drop=True)

    return result_df


@api_bp.route('/upload', methods=['POST'])
def upload_csv():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'File tidak ditemukan'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'Nama file kosong'}), 400

    if not file.filename.lower().endswith('.csv'):
        return jsonify({'success': False, 'error': 'Format file harus CSV'}), 400

    try:
        df = pd.read_csv(file)
        parsed = _parse_csv(df)

        if len(parsed) < 60:
            return jsonify({
                'success': False,
                'error': 'Dataset minimal harus 60 baris data'
            }), 400

        session['dataset'] = parsed.to_json(orient='records')
        session['filename'] = file.filename
        session['uploaded_at'] = datetime.now().isoformat()
        session['records'] = len(parsed)

        return jsonify({
            'success': True,
            'records': len(parsed),
            'date_range': [parsed['date'].iloc[0], parsed['date'].iloc[-1]],
            'filename': file.filename,
        })

    except Exception as e:
        logger.error(f"Upload error: {e}")
        return jsonify({'success': False, 'error': f'Gagal memproses file: {str(e)}'}), 400


@api_bp.route('/sample-data', methods=['GET'])
def sample_data():
    try:
        df = pd.read_csv(SAMPLE_DATA_PATH)
        parsed = _parse_csv(df)

        session['dataset'] = parsed.to_json(orient='records')
        session['filename'] = 'dataset_final.csv (Sample)'
        session['uploaded_at'] = datetime.now().isoformat()
        session['records'] = len(parsed)

        return jsonify({
            'success': True,
            'records': len(parsed),
            'date_range': [parsed['date'].iloc[0], parsed['date'].iloc[-1]],
            'filename': 'dataset_final.csv (Sample)',
        })

    except Exception as e:
        logger.error(f"Sample data error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/predict', methods=['POST'])
def predict():
    dataset_json = session.get('dataset')
    if not dataset_json:
        return jsonify({'success': False, 'error': 'Upload dataset terlebih dahulu'}), 400

    data = request.get_json(silent=True) or {}
    try:
        days = min(max(int(data.get('days', 30)), 1), 90)
    except (TypeError, ValueError):
        days = 30

    with PREDICTION_JOBS_LOCK:
        active_job = PREDICTION_JOBS.get(ACTIVE_JOB_ID) if ACTIVE_JOB_ID else None
        if _is_job_active(active_job):
            return jsonify({
                'success': False,
                'error': 'Prediction job already in progress',
                'active_job_id': ACTIVE_JOB_ID,
            }), 409

        job_id = str(uuid.uuid4())
        PREDICTION_JOBS[job_id] = {
            'id': job_id,
            'status': 'pending',
            'created_at': datetime.now().isoformat(),
            'days': days,
            'result': None,
            'error': None,
        }
        _set_active_job(job_id)

    worker = threading.Thread(
        target=_run_prediction_job,
        args=(job_id, dataset_json, days),
        daemon=True,
    )
    worker.start()

    logger.info('Prediction job created: job_id=%s, days=%s', job_id, days)
    return jsonify({'success': True, 'job_id': job_id, 'status': 'pending'}), 202


@api_bp.route('/job/<job_id>/status', methods=['GET'])
def job_status(job_id):
    with PREDICTION_JOBS_LOCK:
        job = PREDICTION_JOBS.get(job_id)
        if not job:
            return jsonify({'success': False, 'error': 'Job not found'}), 404

        status = job.get('status', 'pending')
        response = {
            'success': True,
            'job_id': job_id,
            'status': status,
        }

        if status == 'complete':
            result = job.get('result') or {}
            response['result'] = result

            session['predictions'] = result.get('predictions', [])
            session['prediction_dates'] = job.get('prediction_dates', [])
            session['metrics'] = result.get('metrics', {})
            session['model_mode'] = 'fallback' if result.get('fallback') else 'gru'
        elif status == 'failed':
            response['error'] = job.get('error', 'Prediction job failed')

    return jsonify(response)


@api_bp.route('/metrics', methods=['GET'])
def metrics():
    cached_metrics = session.get('metrics')
    if cached_metrics:
        return jsonify({'success': True, 'metrics': cached_metrics})
    return jsonify({'success': True, 'metrics': predictor._default_metrics()})


@api_bp.route('/export', methods=['GET'])
def export_predictions():
    predictions = session.get('predictions')
    pred_dates = session.get('prediction_dates')

    if not predictions or not pred_dates:
        return jsonify({'success': False, 'error': 'Tidak ada prediksi untuk diekspor'}), 400

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['date', 'predicted_price', 'model'])

    for date, pred in zip(pred_dates, predictions):
        writer.writerow([date, round(pred), 'GRU'])

    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'gold_predictions_{datetime.now().strftime("%Y%m%d")}.csv'
    )


@api_bp.route('/dashboard', methods=['GET'])
def dashboard():
    dataset_json = session.get('dataset')

    if not dataset_json:
        try:
            df = pd.read_csv(SAMPLE_DATA_PATH)
            parsed = _parse_csv(df)
            session['dataset'] = parsed.to_json(orient='records')
            session['filename'] = 'dataset_final.csv (Auto)'
            dataset_json = session['dataset']
        except Exception:
            return jsonify({
                'success': True,
                'current_price': 0,
                'price_change_pct': 0,
                'lowest_price': 0,
                'lowest_date': '',
                'highest_price': 0,
                'highest_date': '',
                'volatility': '—',
                'sentiment': '—',
                'tomorrow_prediction': 0,
                'chart_data': [],
            })

    try:
        df = pd.read_json(io.StringIO(dataset_json), orient='records')
        if pd.api.types.is_datetime64_any_dtype(df['date']):
            df['date'] = df['date'].dt.strftime('%Y-%m-%d')
        prices = df['gold_price'].values

        current_price = float(prices[-1])
        prev_price = float(prices[-2]) if len(prices) > 1 else current_price
        price_change_pct = round((current_price - prev_price) / prev_price * 100, 2)

        lowest_idx = np.argmin(prices)
        highest_idx = np.argmax(prices)

        last_30 = prices[-30:] if len(prices) >= 30 else prices
        std_30 = np.std(last_30)
        mean_30 = np.mean(last_30)
        volatility_pct = round(std_30 / mean_30 * 100, 1) if mean_30 > 0 else 0

        if volatility_pct < 2:
            volatility_label = f'Rendah ({volatility_pct}%)'
        elif volatility_pct < 5:
            volatility_label = f'Sedang ({volatility_pct}%)'
        else:
            volatility_label = f'Tinggi ({volatility_pct}%)'

        if len(prices) >= 7:
            week_change = (prices[-1] - prices[-7]) / prices[-7] * 100
            sentiment = 'Bullish' if week_change > 0.5 else ('Bearish' if week_change < -0.5 else 'Neutral')
        else:
            sentiment = 'Neutral'

        if len(prices) >= 7:
            avg_change = np.mean(np.diff(prices[-7:]))
            tomorrow = current_price + avg_change
        else:
            tomorrow = current_price

        chart_data = [
            {'date': row['date'], 'price': float(row['gold_price'])}
            for _, row in df.iterrows()
        ]

        return jsonify({
            'success': True,
            'current_price': current_price,
            'price_change_pct': price_change_pct,
            'lowest_price': float(prices[lowest_idx]),
            'lowest_date': str(df['date'].iloc[lowest_idx]),
            'highest_price': float(prices[highest_idx]),
            'highest_date': str(df['date'].iloc[highest_idx]),
            'volatility': volatility_label,
            'sentiment': sentiment,
            'tomorrow_prediction': round(float(tomorrow)),
            'chart_data': chart_data,
        })

    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/historical', methods=['GET'])
def historical():
    dataset_json = session.get('dataset')
    period = request.args.get('period', '30d')

    if not dataset_json:
        try:
            df = pd.read_csv(SAMPLE_DATA_PATH)
            parsed = _parse_csv(df)
            session['dataset'] = parsed.to_json(orient='records')
            dataset_json = session['dataset']
        except Exception:
            return jsonify({'success': True, 'chart_data': [], 'volatility_data': []})

    try:
        df = pd.read_json(io.StringIO(dataset_json), orient='records')
        if pd.api.types.is_datetime64_any_dtype(df['date']):
            df['date'] = df['date'].dt.strftime('%Y-%m-%d')

        if period == '30d':
            df_filtered = df.tail(30)
        elif period == '90d':
            df_filtered = df.tail(90)
        elif period == 'year':
            df_filtered = df.tail(365)
        else:
            df_filtered = df

        prices = df_filtered['gold_price'].values
        current_price = float(prices[-1])
        first_price = float(prices[0])

        price_change_pct = round((current_price - first_price) / first_price * 100, 2)

        daily_changes = np.diff(prices)
        avg_change = round(float(np.mean(daily_changes)), 0) if len(daily_changes) > 0 else 0
        avg_price = round(float(np.mean(prices)), 0)

        daily_returns = daily_changes / prices[:-1] * 100 if len(prices) > 1 else []
        std_dev = round(float(np.std(daily_returns)), 2) if len(daily_returns) > 0 else 0

        biggest_gain = round(float(np.max(daily_changes)), 0) if len(daily_changes) > 0 else 0
        biggest_loss = round(float(np.min(daily_changes)), 0) if len(daily_changes) > 0 else 0

        if len(daily_changes) > 0:
            biggest_gain_idx = int(np.argmax(daily_changes)) + 1
            biggest_loss_idx = int(np.argmin(daily_changes)) + 1
            biggest_gain_date = str(df_filtered['date'].iloc[biggest_gain_idx])
            biggest_loss_date = str(df_filtered['date'].iloc[biggest_loss_idx])
        else:
            biggest_gain_date = None
            biggest_loss_date = None

        chart_data = [
            {'date': row['date'], 'price': float(row['gold_price'])}
            for _, row in df_filtered.iterrows()
        ]

        chunk_size = max(1, len(daily_returns) // 10)
        volatility_data = []
        for i in range(0, len(daily_returns), chunk_size):
            chunk = daily_returns[i:i + chunk_size]
            variance = float(np.std(chunk)) if len(chunk) > 0 else 0
            max_var = float(np.max(np.abs(chunk))) if len(chunk) > 0 else 0
            volatility_data.append({
                'period': i // chunk_size,
                'variance': round(variance * 100, 1),
                'highlight': bool(max_var > np.mean(np.abs(daily_returns))) if len(daily_returns) > 0 else False,
            })

        return jsonify({
            'success': True,
            'current_price': current_price,
            'price_change_pct': price_change_pct,
            'avg_daily_change': avg_change,
            'avg_price': avg_price,
            'std_dev': std_dev,
            'biggest_gain': biggest_gain,
            'biggest_loss': biggest_loss,
            'biggest_gain_date': biggest_gain_date,
            'biggest_loss_date': biggest_loss_date,
            'chart_data': chart_data,
            'volatility_data': volatility_data,
        })

    except Exception as e:
        logger.error(f"Historical data error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

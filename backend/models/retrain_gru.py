import os
import shutil
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
import sklearn
import tensorflow as tf
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.callbacks import EarlyStopping
from tensorflow.keras.layers import GRU, Dense, Dropout
from tensorflow.keras.models import Sequential
from tensorflow.keras.optimizers import Adam

SEED = 42
np.random.seed(SEED)
tf.random.set_seed(SEED)

LOOKBACK = 60
FEATURES = [
    'usd_idr', 'inflation', 'interest_rate',
    'gold_price_lag_1', 'gold_price_lag_7', 'gold_price_lag_14',
    'usd_idr_lag_1', 'usd_idr_lag_7',
    'gold_price_ma_7', 'gold_price_ma_14', 'gold_price_ma_30', 'usd_idr_ma_7',
    'gold_price_std_7', 'gold_price_std_14', 'usd_idr_std_7',
    'gold_price_pct_1', 'gold_price_pct_7', 'usd_idr_pct_1', 'usd_idr_pct_7',
]

MODEL_FILE = 'gru_90-10.keras'
SCALER_FILE = 'scalers_90-10.joblib'
META_FILE = 'meta_90-10.joblib'
DATA_FILE = 'dataset_final.csv'


def parse_dates_robust(date_series: pd.Series) -> pd.Series:
    raw = date_series.astype(str).str.strip()
    d1 = pd.to_datetime(raw, format='mixed', dayfirst=False, errors='coerce')
    d2 = pd.to_datetime(raw, format='mixed', dayfirst=True, errors='coerce')
    return d2 if d2.isna().sum() < d1.isna().sum() else d1


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()

    out['gold_price_lag_1'] = out['gold_price'].shift(1)
    out['gold_price_lag_7'] = out['gold_price'].shift(7)
    out['gold_price_lag_14'] = out['gold_price'].shift(14)
    out['usd_idr_lag_1'] = out['usd_idr'].shift(1)
    out['usd_idr_lag_7'] = out['usd_idr'].shift(7)

    out['gold_price_ma_7'] = out['gold_price'].rolling(window=7, min_periods=1).mean()
    out['gold_price_ma_14'] = out['gold_price'].rolling(window=14, min_periods=1).mean()
    out['gold_price_ma_30'] = out['gold_price'].rolling(window=30, min_periods=1).mean()
    out['usd_idr_ma_7'] = out['usd_idr'].rolling(window=7, min_periods=1).mean()

    out['gold_price_std_7'] = out['gold_price'].rolling(window=7, min_periods=1).std().fillna(0)
    out['gold_price_std_14'] = out['gold_price'].rolling(window=14, min_periods=1).std().fillna(0)
    out['usd_idr_std_7'] = out['usd_idr'].rolling(window=7, min_periods=1).std().fillna(0)

    out['gold_price_pct_1'] = out['gold_price'].pct_change(1).fillna(0)
    out['gold_price_pct_7'] = out['gold_price'].pct_change(7).fillna(0)
    out['usd_idr_pct_1'] = out['usd_idr'].pct_change(1).fillna(0)
    out['usd_idr_pct_7'] = out['usd_idr'].pct_change(7).fillna(0)

    out = out.ffill(limit=30).bfill()
    return out


def create_sequences(X: np.ndarray, y: np.ndarray, lookback: int):
    xs, ys = [], []
    for i in range(lookback, len(X)):
        xs.append(X[i - lookback:i])
        ys.append(y[i, 0])
    return np.array(xs), np.array(ys)


def build_gru(input_shape, units=256, dropout_rate=0.0, learning_rate=0.001):
    model = Sequential([
        GRU(units, return_sequences=True, input_shape=input_shape),
        Dropout(dropout_rate),
        GRU(units, return_sequences=False),
        Dropout(dropout_rate),
        Dense(32, activation='relu'),
        Dense(1),
    ])
    model.compile(optimizer=Adam(learning_rate=learning_rate), loss='mse')
    return model


def backup_existing_artifacts(base_dir: str):
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_dir = os.path.join(base_dir, 'backups', timestamp)
    os.makedirs(backup_dir, exist_ok=True)

    for file_name in (MODEL_FILE, SCALER_FILE, META_FILE):
        src = os.path.join(base_dir, file_name)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(backup_dir, file_name))
    return backup_dir


def main():
    base_dir = os.path.dirname(__file__)
    data_path = os.path.join(base_dir, DATA_FILE)

    print('Loading dataset:', data_path)
    df = pd.read_csv(data_path)

    required_cols = ['date', 'gold_price', 'usd_idr', 'inflation', 'interest_rate']
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(f'Missing required columns: {missing}')

    df = df.copy()
    df['date'] = parse_dates_robust(df['date'])
    df = df.dropna(subset=['date']).sort_values('date').reset_index(drop=True)

    for c in ['gold_price', 'usd_idr', 'inflation', 'interest_rate']:
        df[c] = pd.to_numeric(df[c], errors='coerce')

    df = df.dropna(subset=['gold_price']).ffill().bfill()

    engineered = engineer_features(df)
    X = engineered[FEATURES].values.astype(np.float32)
    y = engineered[['gold_price']].values.astype(np.float32)

    scaler_X = MinMaxScaler(feature_range=(0, 1))
    scaler_y = MinMaxScaler(feature_range=(0, 1))

    X_scaled = scaler_X.fit_transform(X)
    y_scaled = scaler_y.fit_transform(y)

    X_seq, y_seq = create_sequences(X_scaled, y_scaled, LOOKBACK)
    if len(X_seq) < 100:
        raise ValueError(f'Not enough sequence samples after lookback={LOOKBACK}: {len(X_seq)}')

    split_idx = int(len(X_seq) * 0.95)
    split_idx = min(max(split_idx, 1), len(X_seq) - 1)

    X_train, y_train = X_seq[:split_idx], y_seq[:split_idx]
    X_val, y_val = X_seq[split_idx:], y_seq[split_idx:]

    print('Samples:', len(X_seq), '| train:', len(X_train), '| val:', len(X_val))
    print('Target range full data:', float(y.min()), '->', float(y.max()))

    model = build_gru((LOOKBACK, len(FEATURES)), units=256, dropout_rate=0.0, learning_rate=0.001)

    callbacks = [
        EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True, verbose=1)
    ]

    history = model.fit(
        X_train,
        y_train,
        validation_data=(X_val, y_val),
        epochs=120,
        batch_size=32,
        callbacks=callbacks,
        verbose=1,
    )

    backup_dir = backup_existing_artifacts(base_dir)
    print('Backup saved to:', backup_dir)

    model_path = os.path.join(base_dir, MODEL_FILE)
    scaler_path = os.path.join(base_dir, SCALER_FILE)
    meta_path = os.path.join(base_dir, META_FILE)

    model.save(model_path)
    joblib.dump({'scaler_X': scaler_X, 'scaler_y': scaler_y}, scaler_path)

    meta = {
        'model': 'GRU',
        'features': FEATURES,
        'target': 'gold_price',
        'lookback': LOOKBACK,
        'split': 'deploy-full-scale_95-5-val',
        'best_params': {
            'units': 256,
            'dropout_rate': 0.0,
            'learning_rate': 0.001,
            'epochs_trained': len(history.history.get('loss', [])),
            'batch_size': 32,
        },
        'price_range': [float(y.min()), float(y.max())],
        'target_range': [float(y.min()), float(y.max())],
        'y_range': [float(y.min()), float(y.max())],
        'train_rows': int(len(df)),
        'sequence_count': int(len(X_seq)),
        'validation_count': int(len(X_val)),
        'dataset_start': str(df['date'].iloc[0].date()),
        'dataset_end': str(df['date'].iloc[-1].date()),
        'exported_at': datetime.now().isoformat(),
        'tensorflow_version': tf.__version__,
        'sklearn_version': sklearn.__version__,
    }
    joblib.dump(meta, meta_path)

    print('Saved model :', model_path)
    print('Saved scaler:', scaler_path)
    print('Saved meta  :', meta_path)


if __name__ == '__main__':
    main()

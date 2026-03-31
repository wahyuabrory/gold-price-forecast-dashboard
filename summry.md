# AURUM PREDICT - Project Summary

## Overview
Gold price forecasting dashboard for the Indonesian market (IDR) using a GRU model.

## Architecture

- **Frontend:** React + Vite + Tailwind, served on port `5173`
- **Backend:** Flask API, served on port `5000`
- **ML:** GRU inference service with saved model artifacts in `backend/models/`

## Backend

Main files:

- `backend/app.py` - Flask app factory, CORS, sessions, blueprint registration
- `backend/routes/api.py` - REST endpoints for upload, prediction, dashboard, history
- `backend/services/predictor.py` - Model loading, feature engineering, recursive prediction

Key endpoints:

- `POST /api/upload` - Upload CSV dataset
- `GET /api/sample-data` - Load the built-in dataset
- `POST /api/predict` - Generate 1-90 day forecasts
- `GET /api/metrics` - Return cached or default metrics
- `GET /api/export` - Export predictions as CSV
- `GET /api/dashboard` - Summary cards and chart data
- `GET /api/historical` - Historical analysis by period

## Frontend

Main files:

- `frontend/src/App.jsx` - Router setup
- `frontend/src/pages/Dashboard.jsx` - Dashboard cards, chart, quick analysis
- `frontend/src/pages/Predict.jsx` - Upload, sample data, forecast flow
- `frontend/src/pages/History.jsx` - Historical price views
- `frontend/src/services/api.js` - Axios client for backend calls

## Model and Retraining

Training script:

- `backend/models/retrain_gru.py`

Retraining flow:

1. Load `dataset_final.csv`
2. Clean and parse dates
3. Engineer 19 features
4. Build 60-day sequences
5. Train a 2-layer GRU model with early stopping
6. Save the new model, scalers, and metadata
7. Back up old artifacts into `backend/models/backups/`

Saved artifacts:

- `gru_90-10.keras`
- `scalers_90-10.joblib`
- `meta_90-10.joblib`

## Prediction Flow

1. User uploads CSV or loads sample data
2. Backend stores dataset in session
3. Predictor loads model and scalers if needed
4. Features are engineered and scaled
5. Predictions are generated recursively for the requested horizon
6. Results are returned to the frontend and optionally exported

## Notes

- The app is designed as a single-user local research tool.
- Session storage is used instead of authentication.
- The model supports fallback behavior if the GRU cannot load.

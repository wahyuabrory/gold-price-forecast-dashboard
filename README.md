# Aurum Predict

Local dashboard for forecasting Indonesian gold prices in IDR with a GRU model. It is a single-user research tool with no authentication.

## Features

- Upload a CSV dataset.
- Load the built-in sample dataset.
- Generate forecasts for 1 to 90 days.
- View dashboard and historical analysis.
- Export prediction results as CSV.
- Benchmark parallel requests through the demo endpoint.

## Run locally

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Checks

```bash
# Backend tests
cd backend
python -m pytest tests/ -v

# Frontend checks
cd frontend
npm run build
npm run lint
npm test
```

## CSV format

The app expects a CSV with at least these columns:

```csv
date,gold_price,usd_idr,inflation,interest_rate
2015-01-01,549000,12385,0.0696,0.0775
```

- Minimum 60 rows.
- `date` and `gold_price` are required.
- The built-in sample data lives in `backend/models/dataset_final.csv`.
- Keep the root `demo_dataset.csv` artifact unchanged.

## API

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/health` | GET | Health and model status |
| `/api/upload` | POST | Upload CSV dataset |
| `/api/sample-data` | GET | Load sample dataset |
| `/api/predict` | POST | Start async prediction job |
| `/api/job/<job_id>/status` | GET | Poll prediction job status |
| `/api/metrics` | GET | Model metrics |
| `/api/export` | GET | Download predictions CSV |
| `/api/dashboard` | GET | Dashboard summary |
| `/api/historical` | GET | Historical analysis |
| `/api/demo` | POST | Parallel execution demo

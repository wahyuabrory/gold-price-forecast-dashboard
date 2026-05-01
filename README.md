# AURUM PREDICT

Gold price forecasting dashboard for Indonesian gold prices (IDR) using a GRU model. This is a local, single-user research tool with no authentication.

## What It Does

- Upload a CSV dataset.
- Load the built-in sample dataset.
- Generate 1-90 day forecasts.
- View dashboard and historical analysis.
- Export prediction results as CSV.
- Run a parallel demo endpoint for request benchmarking.

## Quick Start

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

## Main Commands

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

## CSV Format

The app expects a CSV with at least these columns:

```csv
date,gold_price,usd_idr,inflation,interest_rate
2015-01-01,549000,12385,0.0696,0.0775
```

- Minimum 60 rows.
- `date` and `gold_price` are required.
- The built-in sample data lives in `backend/models/dataset_final.csv`.
- The preserved root artifact is `demo_dataset.csv`.

## API Summary

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
| `/api/demo` | POST | Parallel execution demo |

## Docs

- [AGENTS.md](AGENTS.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [CONTINUITY.md](CONTINUITY.md)

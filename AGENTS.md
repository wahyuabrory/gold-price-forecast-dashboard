# Agent instructions

## Environment

- Python (Windows): `C:\Users\abrory\anaconda3\python.exe`
- Python (WSL): `/home/abrory/miniconda3/bin/python`
- Use the listed Python installation. Create `.venv` only when the user asks.
- Backend env file: `backend/.env`
- Frontend dev server: `http://localhost:5173`
- Backend dev server: `http://localhost:5000`

## Run and verify

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
python -m pytest tests/ -v
python -m pytest tests/test_forecast_hardening.py -v
```

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run build
npm run lint
npm test
```

Start the backend before the frontend. The frontend proxies `/api` to port `5000` through `frontend/vite.config.js`.

## Code map

- `backend/app.py` - Flask app factory, CORS/session setup, blueprint registration.
- `backend/routes/api.py` - Core API routes for upload, sample data, predict, metrics, export, dashboard, historical, and job status.
- `backend/routes/demo.py` - Parallel demo endpoint.
- `backend/services/predictor.py` - GRU model loading, feature engineering, inference, fallback forecasting.
- `backend/models/dataset_final.csv` - Built-in sample dataset used by `/api/sample-data`.
- `demo_dataset.csv` - Root dataset artifact the user wants preserved.
- `frontend/src/App.tsx` - Router and providers.
- `frontend/src/components/Layout.jsx` - App shell and navigation.
- `frontend/src/context/PredictionContext.jsx` - Async prediction state and polling.
- `frontend/src/services/api.js` - Axios client for the backend API.

## Change rules

- Make the smallest complete change and preserve existing patterns.
- Prefer patches to rewrites.
- Keep `demo_dataset.csv` unchanged unless the user explicitly asks otherwise.
- Do not touch unrelated working-tree changes.
- Use the local repo files as the source of truth.
- Inspect relevant code before editing.
- Verify markdown links and endpoint names after doc changes.
- Keep root documentation in `README.md` and `AGENTS.md` only.
- Create test files, helpers, fixtures, or other documentation only when the user asks.

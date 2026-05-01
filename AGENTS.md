# AGENTS.md

## Environment

- Python (Windows): `C:\Users\abrory\anaconda3\python.exe`
- Python (WSL): `/home/abrory/miniconda3/bin/python`
- Do not create `.venv` unless explicitly requested.
- Backend env file: `backend/.env`
- Frontend dev server: `http://localhost:5173`
- Backend dev server: `http://localhost:5000`

## Run

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

### Both

- Start backend first on port `5000`.
- Start frontend second on port `5173`.
- Frontend proxies `/api` to backend through `frontend/vite.config.js`.

## Structure

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

## Conventions

- Keep changes small and scoped.
- Preserve existing backend/frontend patterns.
- Prefer patch-style edits over rewrites.
- Keep `demo_dataset.csv` unchanged unless the user explicitly asks otherwise.
- Do not touch unrelated working-tree changes.
- Root docs should stay concise: user-facing summary in `README.md`, system map in `ARCHITECTURE.md`, live state in `CONTINUITY.md`.

## Tool Rules

- Use the local repo files as the source of truth.
- Prefer read-only inspection before edits.
- Verify markdown links and endpoint names after doc changes.
- Do not delete `demo_dataset.csv`.
- Do not create new docs outside the four root files unless explicitly requested.

## File Schemas

### `README.md`

- Purpose and short description
- Quick start
- Main features
- Run commands
- CSV format
- Endpoint summary
- Links to `AGENTS.md`, `ARCHITECTURE.md`, and `CONTINUITY.md`

### `ARCHITECTURE.md`

- System overview
- Backend flow
- Frontend flow
- Async prediction flow
- Data and storage model
- Dataset artifact distinction

### `CONTINUITY.md`

- `[PLANS]`
- `[DECISIONS]`
- `[PROGRESS]`
- `[DISCOVERIES]`
- `[OUTCOMES]`
- Current goal
- Working set
- Open questions
- Next actions

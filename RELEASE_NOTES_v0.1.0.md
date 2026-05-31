# AURUM PREDICT v0.1.0 — Initial Open-Source Release

AURUM PREDICT is a local, single-user research dashboard for forecasting
Indonesian gold prices in IDR using a GRU-based inference pipeline.

## Included in this release

- React/Vite dashboard for prediction and historical analysis.
- Flask API backend for dataset loading, prediction, metrics, export, and
  dashboard data.
- CSV dataset upload and built-in sample dataset workflow.
- Asynchronous 1–90 day prediction jobs with frontend polling.
- CSV export of generated predictions.
- GRU model inference workflow with fallback forecasting behavior.
- Backend tests and frontend build/lint/test commands documented in the README.
- Architecture and contributor-agent documentation.

## Security and deployment scope

This release is intended for local research and educational use. It does not
include authentication and is not intended for direct public deployment or
multi-user operation. See `SECURITY.md` for reporting instructions and current
security boundaries.

## Verification before publishing this release

Run the documented checks before creating the tag:

```bash
cd backend
python -m pytest tests/ -v

cd ../frontend
npm install
npm run build
npm run lint
npm test
```

After the checks pass, publish this release as tag `v0.1.0`.

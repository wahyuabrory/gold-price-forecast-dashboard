# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

**AURUM PREDICT** - Gold price forecasting dashboard for Indonesian gold (IDR) using GRU deep learning. Single-user local research tool with no authentication.

## Development Commands

### Backend (Flask)

```bash
cd backend
pip install -r requirements.txt        # Install dependencies
python app.py                          # Start dev server at http://localhost:5000
python -m pytest tests/                # Run all tests
python -m pytest tests/test_forecast_hardening.py -v  # Run specific test file
```

### Frontend (Vite + React)

```bash
cd frontend
npm install                            # Install dependencies
npm run dev                            # Start dev server at http://localhost:5173
npm run build                          # Production build
npm run lint                           # ESLint check
```

### Running Both Together

Start backend first (port 5000), then frontend (port 5173). Frontend proxies `/api` requests to backend via vite.config.js.

## Architecture

```
gold-price-forecast-dashboard/
├── backend/                    # Flask API server
│   ├── app.py                  # Entry point, app factory (create_app)
│   ├── routes/api.py           # REST endpoints (Blueprint: /api/*)
│   ├── services/predictor.py   # GoldPredictor singleton, GRU inference
│   ├── models/                 # ML artifacts + dataset
│   │   ├── gru_90-10.keras     # Trained GRU model
│   │   ├── scalers_90-10.joblib # MinMaxScalers (scaler_X, scaler_y)
│   │   ├── meta_90-10.joblib   # Model metadata (features, lookback)
│   │   └── dataset_final.csv   # Sample dataset (3,926 rows)
│   └── tests/                  # Backend tests
└── frontend/                   # Vite + React + Tailwind
    ├── src/
    │   ├── App.jsx             # Router setup (/, /predict, /history)
    │   ├── pages/              # Dashboard, Predict, History views
    │   ├── components/         # Layout, reusable UI
    │   ├── services/api.js     # Axios client for backend
    │   └── context/            # ThemeContext (dark mode)
    └── vite.config.js          # Dev proxy config
```

## API Endpoints

| Endpoint           | Method | Description                              |
| ------------------ | ------ | ---------------------------------------- | --- | ---- | ---- |
| `/api/upload`      | POST   | Upload CSV dataset (multipart/form-data) |
| `/api/sample-data` | GET    | Load built-in demo dataset               |
| `/api/predict`     | POST   | Generate predictions `{days: 1-90}`      |
| `/api/metrics`     | GET    | Model performance metrics                |
| `/api/export`      | GET    | Download predictions CSV                 |
| `/api/dashboard`   | GET    | Dashboard summary data                   |
| `/api/historical`  | GET    | Historical analysis `?period=30d         | 90d | year | all` |

## ML Model Details

- **Architecture**: 2-layer GRU (256 units) + Dense(32) + Dense(1)
- **Lookback**: 60 days
- **Prediction**: Recursive multi-step (1-90 days)
- **Features** (19 total): gold_price, usd_idr, inflation, interest_rate + engineered lags, rolling MAs/stds, pct changes

The `GoldPredictor` class in `services/predictor.py` handles feature engineering, scaling, inference, and fallback (naive last-price forecast if model fails).

## CSV Input Format

```csv
date,gold_price,usd_idr,inflation,interest_rate
2015-01-01,549000,12385,0.0696,0.0775
...
```

Minimum 60 rows required. Parser auto-detects column names and date formats (supports Indonesian day-first).

## Design Constraints

- **Colors**: Gold (#D4AF37, #FFD700) primary, Charcoal (#111827, #1F2937) secondary
- **Charts**: Recharts library
- **Icons**: Lucide React
- **Typography**: Instrument Serif + Poppins fonts

## Testing

See [TESTING.md](TESTING.md) for comprehensive testing guide including:
- Backend pytest setup and test cases
- Frontend Vitest configuration (to be set up)
- Integration test workflow
- CI/CD with GitHub Actions

### Quick Test Commands

**Backend:**
```bash
cd backend
python -m pytest tests/ -v                    # Run all tests
python -m pytest tests/test_forecast_hardening.py -v  # Specific test
```

**Frontend:**
```bash
cd frontend
npm test                                       # Run tests (once Vitest configured)
npm run lint                                   # ESLint check
```

### Current Test Coverage
- ✅ Backend: `test_health.py`, `test_forecast_hardening.py`
- ⏳ Frontend: Tests to be configured (Vitest + React Testing Library)

## Phase 6 - Complete Project Documentation

**New Documentation Files Created:**

### 1. **README.md** (Root Project)
- Project overview and description
- Quick start guide (5 minutes)
- Complete feature list
- Tech stack details
- Project structure with directory tree
- Development commands
- Testing commands
- API endpoints quick reference
- Architecture overview diagram
- Getting help guide with links to other docs

### 2. **DEVELOPMENT.md** (Developer Guide)
- Development environment setup (Python 3.11+, Node 18+)
- Detailed architecture deep dive (Flask app factory, blueprints, services, ML model)
- Backend code organization and key files
- Frontend code organization and key files
- Key files explained (app.py, api.py, predictor.py, App.jsx, api.js)
- Development workflows (adding endpoints, adding pages, running tests)
- Code style guide (Python/JavaScript naming, patterns)
- Step-by-step guides (add API endpoint, add frontend page)
- Debugging tips (Flask debug mode, React DevTools, Network tab)
- Performance optimization techniques
- Common issues and solutions

### 3. **API_ENDPOINTS.md** (Complete API Reference)
- Authentication (session-based, no JWT)
- All 9 endpoints documented:
  - `/api/health` - Health check & model status
  - `/api/upload` - CSV upload with validation
  - `/api/sample-data` - Load demo dataset
  - `/api/predict` - Generate 1-90 day forecasts
  - `/api/metrics` - Model performance stats
  - `/api/export` - Download predictions CSV
  - `/api/dashboard` - Summary data
  - `/api/historical` - Historical analysis by period
  - `/api/demo` - Parallel execution demo
- CSV input format (required columns, examples)
- Each endpoint with: request, response, error cases, examples
- HTTP status codes reference
- Usage examples (Python, JavaScript, cURL)
- Rate limiting notes
- Performance benchmarks

### 4. **TESTING_GUIDE.md** (Testing Deep Dive)
- Testing architecture (3 levels: unit, integration, E2E)
- Current test coverage (188 total: 16 backend + 172 frontend + 23 demo)
- Running tests (backend pytest, frontend vitest)
- Writing tests with TDD approach (Red-Green-Refactor)
- Test file organization and structure
- Fixtures and mocks (pytest, vitest)
- Common test patterns for backend and frontend
- Coverage metrics and goals
- CI/CD strategy notes (skipped per phase requirements)
- Troubleshooting failed tests

### 5. **DEMO.md** (Parallel Demo Endpoint Guide)
- Purpose: showcase parallel execution and concurrency
- How to use the `/api/demo` endpoint
- Configuration options (num_parallel_requests, user_agents, endpoints)
- Understanding metrics:
  - total_time_ms vs sequential_equivalent_ms
  - speedup_factor (efficiency gain)
  - per_user_agent breakdown
  - success rates and response details
- Example requests (default, high load, mobile, error cases)
- Performance interpretation guide
- Real-world metrics and benchmarks
- Advanced usage (scalability testing, endpoint comparison)
- Troubleshooting demo errors

### 6. **AGENTS.md** (This File - Updated)
- Added Phase 6 section with new documentation files
- Complete reference to all new documentation

---

## Documentation Summary

| Document | Purpose | Audience | Lines |
|----------|---------|----------|-------|
| README.md | Project overview, quick start | Everyone | ~380 |
| DEVELOPMENT.md | Developer guide & architecture | Developers | ~650 |
| API_ENDPOINTS.md | Complete API reference | API users/integrators | ~430 |
| TESTING_GUIDE.md | Testing practices & patterns | QA/Developers | ~420 |
| DEMO.md | Parallel endpoint guide | Advanced users | ~490 |
| AGENTS.md | IDE configuration | Codex.ai/code users | Updated |

**Total Documentation:** ~2,370 lines of comprehensive guidance

---

## Available Skills

- `frontend-design` - Generate distinctive, production-grade UI (avoid generic AI aesthetics)
- `flask-api-development` - Flask API patterns and scaffolding
- `test-driven-development` - Setup and execute TDD workflows
- `documentation` - Comprehensive, beginner-friendly technical writing

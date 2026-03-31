# AURUM PREDICT - Gold Price Forecast Dashboard

![Status](https://img.shields.io/badge/status-research%20grade-blue) ![License](https://img.shields.io/badge/license-MIT-green)

A research-grade local application for forecasting Indonesian gold prices (IDR) using deep learning (GRU neural network). Analyze historical data, generate predictions, and explore market trends with an interactive dashboard.

## Quick Start (5 minutes)

### Prerequisites
- Python 3.11+
- Node.js 18+
- pip and npm

### Setup & Run

```bash
# 1. Backend setup (Terminal 1)
cd backend
pip install -r requirements.txt
python app.py
# Server running at http://localhost:5000

# 2. Frontend setup (Terminal 2)
cd frontend
npm install
npm run dev
# Dashboard at http://localhost:5173
```

**Done!** Open http://localhost:5173 in your browser. Load sample data to see predictions.

## Features

✅ **Upload Data** - Import CSV with gold price and market data  
✅ **Auto-Load Samples** - Built-in historical dataset  
✅ **Predict Prices** - Generate 1-90 day forecasts  
✅ **Export Results** - Download predictions as CSV  
✅ **View History** - Analyze trends by period (30d, 90d, year, all)  
✅ **Dashboard** - Real-time metrics and charts  
✅ **Parallel Demo** - Performance benchmarking endpoint  

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend** | Flask (Python 3.11) + Flask-CORS + Flask-Session |
| **Frontend** | React + Vite + Tailwind CSS |
| **ML Model** | GRU (Gated Recurrent Unit) - 2 layers, 60-day lookback |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Storage** | CSV + Session-based |

## Project Structure

```
gold-price-forecast-dashboard/
├── README.md                    # This file
├── DEVELOPMENT.md               # Development guide & architecture
├── API_ENDPOINTS.md             # Complete API reference
├── TESTING_GUIDE.md             # Testing practices & coverage
├── DEMO.md                      # Parallel demo endpoint guide
├── CLAUDE.md                    # Claude IDE configuration
├── ANALYSIS.md                  # Project analysis notes
├── TESTING.md                   # Testing framework details
│
├── backend/                     # Flask API server
│   ├── app.py                   # App factory & startup
│   ├── requirements.txt          # Python dependencies
│   ├── routes/
│   │   ├── api.py               # Core API endpoints
│   │   └── demo.py              # Parallel demo endpoint
│   ├── services/
│   │   └── predictor.py         # GRU inference engine
│   ├── models/
│   │   ├── gru_90-10.keras      # Trained GRU model
│   │   ├── scalers_90-10.joblib # Feature scalers
│   │   ├── meta_90-10.joblib    # Model metadata
│   │   └── dataset_final.csv    # Sample dataset (3,926 rows)
│   └── tests/
│       ├── test_health.py       # Health check tests
│       ├── test_forecast_hardening.py  # Model robustness
│       ├── test_api_integration.py     # API integration
│       ├── test_demo.py         # Demo endpoint tests
│       └── conftest.py          # Test fixtures
│
├── frontend/                    # Vite + React
│   ├── src/
│   │   ├── App.jsx              # Router & main layout
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx    # Summary & charts
│   │   │   ├── Predict.jsx      # Upload & prediction
│   │   │   └── History.jsx      # Historical analysis
│   │   ├── components/          # Reusable UI components
│   │   ├── services/
│   │   │   └── api.js           # Axios backend client
│   │   ├── context/
│   │   │   └── ThemeContext.jsx # Dark mode toggle
│   │   └── __tests__/           # Component tests
│   ├── vite.config.js           # Vite + proxy config
│   ├── package.json             # Node dependencies
│   └── tailwind.config.js       # Tailwind configuration
│
└── gold-frontend/               # Alternative frontend (legacy)
```

## Development Commands

### Backend (Flask)

```bash
cd backend

# Start development server
python app.py                           # http://localhost:5000

# Run tests
python -m pytest tests/ -v              # All tests verbose
python -m pytest tests/ -k health       # Specific test filter
python -m pytest tests/ --cov=.         # With coverage report

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt     # Dev tools
```

### Frontend (React + Vite)

```bash
cd frontend

# Start dev server
npm run dev                             # http://localhost:5173

# Build for production
npm run build                           # Creates dist/ folder
npm run preview                         # Preview production build

# Lint code
npm run lint                            # ESLint check

# Install dependencies
npm install
```

### Running Together

1. **Terminal 1** (Backend):
   ```bash
   cd backend && python app.py
   ```

2. **Terminal 2** (Frontend):
   ```bash
   cd frontend && npm run dev
   ```

Frontend automatically proxies `/api` requests to backend (see `vite.config.js`).

## API Endpoints

Complete API reference available in [API_ENDPOINTS.md](API_ENDPOINTS.md)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check & model status |
| `/api/upload` | POST | Upload CSV dataset |
| `/api/sample-data` | GET | Load built-in dataset |
| `/api/predict` | POST | Generate predictions (1-90 days) |
| `/api/metrics` | GET | Model performance metrics |
| `/api/export` | GET | Download predictions as CSV |
| `/api/dashboard` | GET | Dashboard summary data |
| `/api/historical` | GET | Historical analysis by period |
| `/api/demo` | POST | Parallel execution demo |

## CSV Input Format

Upload a CSV with these columns (at minimum):

```csv
date,gold_price,usd_idr,inflation,interest_rate
2015-01-01,549000,12385,0.0696,0.0775
2015-01-02,550000,12400,0.0700,0.0775
```

**Requirements:**
- Minimum 60 rows (lookback period)
- Date formats: ISO (2015-01-01), Indonesian (01-01-2015), or auto-detected
- Required columns: `date`, `gold_price`
- Optional columns: `usd_idr`, `inflation`, `interest_rate`

See [API_ENDPOINTS.md](API_ENDPOINTS.md#csv-input-format) for full format details.

## ML Model

**GRU Neural Network (Gated Recurrent Unit)**
- **Architecture**: 2-layer GRU (256 units each) + Dense(32) + Dense(1)
- **Lookback Period**: 60 days
- **Predictions**: Recursive multi-step (1-90 days ahead)
- **Features**: 19 engineered features (prices, lags, rolling statistics, % changes)
- **Scalers**: MinMaxScaler (0-1 range) for normalization
- **Fallback**: Naive last-price forecast if model inference fails

### Feature Engineering

The predictor generates 19 features from 4 input columns:
1. Gold price (raw, lagged, rolling stats)
2. USD/IDR rate (raw, lagged, rolling stats)
3. Inflation rate (raw, lagged, rolling stats)
4. Interest rate (raw, lagged, rolling stats)

See [DEVELOPMENT.md](DEVELOPMENT.md#feature-engineering) for implementation details.

## Testing

**Backend:** 16+ pytest tests covering health, forecasting, integration, and demo endpoint  
**Frontend:** 172+ component tests with Vitest + React Testing Library  
**Demo:** 23 integration tests for parallel execution

```bash
# Run all tests
cd backend && python -m pytest tests/ -v
cd frontend && npm test

# View coverage
cd backend && python -m pytest tests/ --cov=. --cov-report=html
cd frontend && npm test -- --coverage
```

See [TESTING_GUIDE.md](TESTING_GUIDE.md) for complete testing documentation.

## Demo Endpoint

Parallel execution demo showcasing concurrent requests and performance metrics:

```bash
curl -X POST http://localhost:5000/api/demo \
  -H "Content-Type: application/json" \
  -d '{
    "num_parallel_requests": 5,
    "user_agents": ["Chrome", "Firefox", "Safari"],
    "endpoints": ["/api/health", "/api/dashboard"]
  }'
```

**Response includes:**
- Total execution time
- Speedup factor (parallel vs sequential)
- Per-user-agent metrics
- Individual request details

See [DEMO.md](DEMO.md) for full documentation and examples.

## Architecture Overview

```
                    Browser (localhost:5173)
                           |
                    ┌──────▼────────┐
                    │   Frontend    │
                    │  React+Vite   │
                    └──────┬────────┘
                           |
                    [Vite Proxy /api]
                           |
        ┌──────────────────▼──────────────────┐
        │       Backend (localhost:5000)      │
        │          Flask + Blueprint          │
        ├─────────────────────────────────────┤
        │  Routes (api.py, demo.py)          │
        │    ├─ /api/upload                  │
        │    ├─ /api/predict                 │
        │    ├─ /api/export                  │
        │    ├─ /api/demo (parallel)         │
        │    └─ 7 more endpoints             │
        ├─────────────────────────────────────┤
        │  Services (predictor.py)            │
        │    ├─ Feature Engineering          │
        │    ├─ Model Inference (GRU)        │
        │    └─ Fallback Forecasting         │
        ├─────────────────────────────────────┤
        │  Models (./models/)                │
        │    ├─ gru_90-10.keras              │
        │    ├─ scalers_90-10.joblib         │
        │    ├─ meta_90-10.joblib            │
        │    └─ dataset_final.csv            │
        ├─────────────────────────────────────┤
        │  Storage                            │
        │    └─ Flask Session (filesystem)    │
        └──────────────────────────────────────┘
```

## Getting Help

- **Setup Issues?** → See [DEVELOPMENT.md](DEVELOPMENT.md#development-environment-setup)
- **How to develop?** → See [DEVELOPMENT.md](DEVELOPMENT.md)
- **API questions?** → See [API_ENDPOINTS.md](API_ENDPOINTS.md)
- **Testing?** → See [TESTING_GUIDE.md](TESTING_GUIDE.md)
- **Demo endpoint?** → See [DEMO.md](DEMO.md)
- **IDE setup?** → See [CLAUDE.md](CLAUDE.md)
- **Project analysis?** → See [ANALYSIS.md](ANALYSIS.md)

## Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
SECRET_KEY=your-secret-key-here
CORS_ALLOWED_ORIGINS=http://localhost:5173
FLASK_ENV=development
```

See `backend/.env.example` for full template.

### Frontend Proxy

Set in `frontend/vite.config.js`:

```javascript
proxy: {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true
  }
}
```

## Performance Notes

- **Model inference**: ~50-100ms per prediction
- **Parallel demo**: 5 concurrent requests complete in ~200-300ms (10x speedup)
- **CSV upload**: < 100ms for 3,926 row dataset
- **Session storage**: Filesystem-based, 4-hour TTL

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT License - See LICENSE file for details

## Status

**Research-grade local application** - Intended for analysis and learning purposes. Not for production trading or financial advice.

---

**Last Updated:** Phase 6 (Documentation)  
**Test Coverage:** 188 total tests (16 backend + 172 frontend + 23 demo integration)  
**Version:** 1.0.0

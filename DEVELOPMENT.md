# Development Guide - AURUM PREDICT

**TL;DR:** Backend runs on port 5000 (Flask), frontend on 5173 (Vite). Frontend proxies `/api` to backend. Follow code structure conventions. See sections below for detailed workflows.

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Architecture Deep Dive](#architecture-deep-dive)
3. [Code Organization](#code-organization)
4. [Key Files Explained](#key-files-explained)
5. [Development Workflows](#development-workflows)
6. [Code Style & Patterns](#code-style--patterns)
7. [Adding New Features](#adding-new-features)
8. [Debugging Tips](#debugging-tips)
9. [Common Issues](#common-issues)

---

## Development Environment Setup

### Prerequisites

- **Python 3.11+** - Check: `python --version`
- **Node.js 18+** - Check: `node --version`
- **npm 9+** - Check: `npm --version`
- **Git** (optional but recommended)

### Backend Setup

```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate          # Linux/Mac
# or
venv\Scripts\activate             # Windows

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env and set SECRET_KEY if needed

# Start development server
python app.py
# Runs at http://localhost:5000
# Logs to console in debug mode
```

**What's installed:**
- `flask` - Web framework
- `flask-cors` - Cross-origin requests
- `flask-session` - Session management
- `pandas` - CSV parsing
- `numpy` - Numerical operations
- `tensorflow/keras` - GRU model loading
- `joblib` - Scalers serialization
- `python-dotenv` - Environment variables

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# Runs at http://localhost:5173
# Hot reload enabled (changes auto-refresh)

# Optional: Start in different port
npm run dev -- --port 3000
```

**What's installed:**
- `react` - UI library
- `vite` - Build tool (fast, ES modules)
- `tailwindcss` - CSS framework
- `recharts` - Charting library
- `lucide-react` - Icon library
- `axios` - HTTP client

### Running Both Together

**Terminal 1:**
```bash
cd backend
python app.py
```

**Terminal 2:**
```bash
cd frontend
npm run dev
```

**Terminal 3 (Optional - for tests):**
```bash
cd backend
python -m pytest tests/ -v --watch
```

The frontend's `vite.config.js` automatically proxies `/api` requests to the backend.

---

## Architecture Deep Dive

### Application Flow

```
User Browser (localhost:5173)
        ↓
    React App (App.jsx)
        ↓
    Router (3 pages: Dashboard, Predict, History)
        ↓
    Service Layer (services/api.js)
        ↓
Axios Client (async HTTP)
        ↓
    Vite Proxy Config
        ↓ (transparently routes to backend)
    Backend API (localhost:5000)
        ↓
Flask App (app.py)
        ↓
    Blueprints (routes/api.py, routes/demo.py)
        ↓
    Services (services/predictor.py)
        ↓
    ML Model Loading & Inference
        ↓
    Response JSON (or CSV)
        ↓ (back through the chain)
    Browser receives data
        ↓
React updates UI + Charts
```

### Backend Architecture (Flask)

**App Factory Pattern** (`app.py`):
```python
def create_app():
    # 1. Configure Flask instance
    # 2. Setup CORS with allowed origins
    # 3. Setup session storage (filesystem)
    # 4. Load model on startup
    # 5. Register blueprints
    # 6. Return configured app
```

**Benefits:** Testable app creation, multiple instances, environment-specific config.

**Blueprints Structure:**

```
routes/
├── api.py (api_bp)          # Core endpoints: /api/health, /api/predict, etc.
└── demo.py (demo_bp)       # Demo endpoint: /api/demo (parallel execution)
```

**Service Layer** (`services/predictor.py`):
- Singleton pattern: `predictor = GoldPredictor()`
- Lazy loading: Model loads on first health check or predict call
- Feature engineering: Transforms raw data to 19 features
- Inference: GRU prediction + fallback mode

### Frontend Architecture (React + Vite)

**Component Hierarchy:**

```
App.jsx (Router)
├── Dashboard.jsx
│   ├── SummaryCard (displays key metrics)
│   ├── LineChart (Recharts)
│   └── Alert/Loading states
├── Predict.jsx
│   ├── FileUpload (CSV file input)
│   ├── SampleDataButton
│   ├── PredictionForm (days input)
│   └── ResultsTable + ExportButton
├── History.jsx
│   ├── PeriodTabs (30d, 90d, year, all)
│   ├── LineChart (historical trends)
│   └── VolatilityAnalysis
└── Layout.jsx (navbar, sidebar, theme toggle)
```

**State Management:**
- React hooks (`useState`, `useContext`, `useEffect`)
- Theme context (`ThemeContext.jsx`) - Dark mode toggle
- API service (`services/api.js`) - Centralized Axios client

**Styling:**
- Tailwind CSS utility-first approach
- Dark mode with class strategy: `.dark` pseudo-class
- Responsive breakpoints: sm, md, lg, xl, 2xl

---

## Code Organization

### Backend Directory Structure

```
backend/
├── app.py                       # Entry point, app factory
├── requirements.txt              # Python dependencies
├── requirements-dev.txt          # Dev/test dependencies
├── .env.example                  # Environment template
│
├── routes/                      # API blueprints
│   ├── __init__.py
│   ├── api.py                   # Core endpoints (10+ routes)
│   └── demo.py                  # Parallel demo endpoint
│
├── services/                    # Business logic
│   ├── __init__.py
│   └── predictor.py             # GoldPredictor singleton class
│
├── models/                      # ML artifacts
│   ├── gru_90-10.keras          # Trained GRU model (binary)
│   ├── scalers_90-10.joblib     # MinMaxScaler (X, y)
│   ├── meta_90-10.joblib        # Metadata (features, lookback)
│   └── dataset_final.csv        # Sample dataset (3,926 rows)
│
├── tests/                       # Test suite
│   ├── conftest.py              # Pytest fixtures & config
│   ├── test_health.py           # Health endpoint tests
│   ├── test_forecast_hardening.py  # Model robustness
│   ├── test_api_integration.py  # API integration flow
│   └── test_demo.py             # Demo endpoint tests
│
├── flask_session/               # Runtime: session storage
├── .coverage                    # Runtime: coverage data
└── .pytest_cache/               # Runtime: pytest cache
```

### Frontend Directory Structure

```
frontend/
├── src/
│   ├── App.jsx                  # Router & page layout
│   ├── main.jsx                 # React entry point
│   ├── index.css                # Global styles
│   │
│   ├── pages/                   # Page components
│   │   ├── Dashboard.jsx        # Summary view
│   │   ├── Predict.jsx          # Predict & upload
│   │   └── History.jsx          # Historical analysis
│   │
│   ├── components/              # Reusable UI components
│   │   ├── Layout.jsx           # Navbar + Sidebar
│   │   ├── Card.jsx             # Card wrapper
│   │   ├── Button.jsx           # Button variants
│   │   └── ... (other components)
│   │
│   ├── services/
│   │   └── api.js               # Axios client & endpoints
│   │
│   ├── context/
│   │   └── ThemeContext.jsx     # Dark mode context
│   │
│   ├── utils/                   # Utility functions
│   │   └── formatters.js        # Number/date formatting
│   │
│   ├── assets/                  # Static files
│   │   └── fonts/               # Custom fonts
│   │
│   └── __tests__/               # Component tests
│       ├── pages/
│       ├── components/
│       └── services/
│
├── public/                      # Static root files
│   └── index.html               # Main HTML
│
├── vite.config.js               # Vite configuration (dev proxy)
├── tailwind.config.js           # Tailwind theme config
├── package.json                 # Node dependencies
└── package-lock.json            # Locked versions
```

---

## Key Files Explained

### Backend Key Files

#### `app.py` - Application Factory

**What it does:**
- Validates environment variables (SECRET_KEY)
- Creates Flask app instance
- Configures CORS for frontend (localhost:5173)
- Sets up session storage (filesystem-based, 4-hour TTL)
- Registers route blueprints
- Sets up logging

**Key functions:**
```python
def create_app():
    # App factory - creates and configures Flask instance
    # Called at module level: app = create_app()
    # Returns configured Flask app
```

**Session Configuration:**
```python
SESSION_TYPE = 'filesystem'              # Store sessions on disk
SESSION_FILE_DIR = 'backend/flask_session'
PERMANENT_SESSION_LIFETIME = 4 hours     # TTL per session
SESSION_FILE_THRESHOLD = 100             # Max files before cleanup
```

#### `routes/api.py` - Core API Endpoints

**Main endpoints:**
- `GET /api/health` - Health check, model status
- `POST /api/upload` - Upload CSV dataset
- `GET /api/sample-data` - Load built-in dataset
- `POST /api/predict` - Generate predictions
- `GET /api/metrics` - Model performance stats
- `GET /api/export` - Download predictions CSV
- `GET /api/dashboard` - Summary data
- `GET /api/historical` - Historical analysis by period

**Session pattern:**
```python
session['dataset'] = df               # Store in Flask session
session['records'] = len(df)
session['filename'] = 'dataset.csv'

# Later: retrieve from session
if 'dataset' in session:
    df = session['dataset']
```

#### `services/predictor.py` - ML Inference Engine

**GoldPredictor class (singleton):**
```python
predictor = GoldPredictor()  # Single instance, lazy-loaded

# Loading model (lazy):
predictor.load_model()

# Making predictions:
predictions = predictor.predict(df, days=30)
# Returns: {
#   'dates': [...],
#   'values': [...],
#   'confidence': score,
#   'metrics': { mae, rmse, ... }
# }
```

**Feature engineering (19 features):**
```python
def _engineer_features(self, data):
    # Raw features: gold_price, usd_idr, inflation, interest_rate
    # Lagged features: lag 1-7 days
    # Rolling statistics: 5-day and 20-day MA, std dev
    # Percentage changes
    # Total: 19 input features to GRU
```

**Fallback mode:**
```python
# If GRU inference fails (exception or NaN):
# Falls back to naive last-price forecast:
predictions = last_price * np.ones(days)
```

#### `routes/demo.py` - Parallel Execution Demo

**Demo endpoint** (`POST /api/demo`):
```python
@demo_bp.route('/demo', methods=['POST'])
def demo():
    # 1. Parse configuration (num_parallel_requests, user_agents, endpoints)
    # 2. Validate configuration
    # 3. Create list of concurrent tasks
    # 4. Execute with ThreadPoolExecutor (parallel)
    # 5. Collect metrics (timing, response sizes, etc.)
    # 6. Return analysis
```

**Configuration options:**
```python
{
    "num_parallel_requests": 5,
    "user_agents": ["Chrome", "Firefox", "Safari"],
    "endpoints": ["/api/health", "/api/dashboard"]
}
```

**Metrics returned:**
```python
{
    'total_time_ms': 250,                    # Actual parallel execution time
    'sequential_equivalent_ms': 1500,        # Sum of individual times
    'speedup_factor': 6.0,                   # Efficiency gain
    'per_user_agent': { 'Chrome': {...}, ... },
    'all_requests': [ {...}, ... ]           # Individual request details
}
```

### Frontend Key Files

#### `App.jsx` - Router & Main Layout

**What it does:**
- Defines routes (Dashboard, Predict, History)
- Sets up Layout wrapper
- Manages overall page structure
- Integrates ThemeContext

**Routes:**
```javascript
/ → Dashboard (summary view)
/predict → Predict (upload, generate predictions)
/history → History (historical analysis)
```

#### `services/api.js` - Axios API Client

**Centralized API calls:**
```javascript
// Example functions:
const uploadCSV = (file) => api.post('/upload', formData)
const generatePrediction = (days) => api.post('/predict', { days })
const getDashboardData = () => api.get('/dashboard')
const exportPredictions = () => api.get('/export')
// ... 7 more functions
```

**Configuration:**
```javascript
const api = axios.create({
    baseURL: '/api',           // Proxied by Vite
    timeout: 120000,           // 2 minute timeout
    withCredentials: true      // Send cookies/session
})
```

#### `context/ThemeContext.jsx` - Dark Mode Management

**What it provides:**
```javascript
const { theme, toggleTheme } = useContext(ThemeContext)
// theme: 'light' or 'dark'
// toggleTheme: () => toggles theme
// Stores in localStorage for persistence
```

**Applied via:**
```javascript
<html className={theme === 'dark' ? 'dark' : ''}>
// Tailwind applies dark mode styles via .dark pseudo-class
```

#### `pages/Predict.jsx` - Upload & Prediction Page

**User workflow:**
1. Choose CSV file or load sample data
2. Enter prediction days (1-90)
3. Click "Generate Prediction"
4. View results table
5. Export as CSV

**Component state:**
```javascript
const [file, setFile] = useState(null)
const [loading, setLoading] = useState(false)
const [predictions, setPredictions] = useState(null)
const [error, setError] = useState(null)
```

---

## Development Workflows

### Backend Development Workflow

**1. Add a new API endpoint:**

Create or edit `routes/api.py`:

```python
@api_bp.route('/api/newfeature', methods=['POST'])
def new_feature():
    """New feature endpoint with docstring."""
    try:
        data = request.get_json()
        
        # Validate input
        if not 'required_field' in data:
            return jsonify({'error': 'Missing field'}), 400
        
        # Call service
        result = predictor.do_something(data['required_field'])
        
        # Return response
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        logger.error(f"Error: {e}")
        return jsonify({'error': str(e)}), 500
```

**2. Debug with Flask:**

```bash
cd backend
export FLASK_DEBUG=1
python app.py
# App reloads on code change
# Error stack traces in browser
```

**3. Test your endpoint:**

```bash
# Quick test with curl
curl -X POST http://localhost:5000/api/newfeature \
  -H "Content-Type: application/json" \
  -d '{"required_field": "value"}'

# Or use tests (see next section)
```

**4. Add tests:**

Create `backend/tests/test_newfeature.py`:

```python
import pytest
from app import create_app

@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    return app.test_client()

def test_new_feature_success(client):
    response = client.post('/api/newfeature', json={'required_field': 'test'})
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] == True

def test_new_feature_missing_field(client):
    response = client.post('/api/newfeature', json={})
    assert response.status_code == 400
```

### Frontend Development Workflow

**1. Add a new page:**

Create `frontend/src/pages/NewPage.jsx`:

```javascript
import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import Layout from '../components/Layout'

export default function NewPage() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get('/some-endpoint')
                setData(response.data)
            } catch (error) {
                console.error('Error:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    return (
        <Layout>
            <div className="p-6">
                <h1 className="text-3xl font-bold mb-6">New Page</h1>
                {loading ? (
                    <div>Loading...</div>
                ) : (
                    <div>{/* Render data */}</div>
                )}
            </div>
        </Layout>
    )
}
```

**2. Register in router:**

Update `App.jsx`:

```javascript
import NewPage from './pages/NewPage'

// In routes:
<Route path="/newpage" element={<NewPage />} />
```

**3. Add to navigation:**

Edit `components/Layout.jsx` and add link to nav.

**4. Add component tests:**

Create `frontend/src/__tests__/pages/NewPage.test.jsx`:

```javascript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import NewPage from '../../pages/NewPage'

describe('NewPage', () => {
    it('renders page title', () => {
        render(<NewPage />)
        expect(screen.getByText(/new page/i)).toBeInTheDocument()
    })
})
```

**5. Test with hot reload:**

```bash
cd frontend
npm run dev
# Edit file → browser auto-refreshes → see changes immediately
```

### Running Tests Locally

**Backend:**

```bash
cd backend

# All tests verbose
python -m pytest tests/ -v

# Specific test file
python -m pytest tests/test_health.py -v

# Specific test function
python -m pytest tests/test_health.py::test_health_check -v

# Watch mode (re-run on file change)
python -m pytest tests/ -v --tb=short --looponfail

# With coverage
python -m pytest tests/ --cov=. --cov-report=html
# Open htmlcov/index.html to view
```

**Frontend:**

```bash
cd frontend

# All tests
npm test

# Watch mode
npm test -- --watch

# Specific file
npm test -- Dashboard.test

# With coverage
npm test -- --coverage
```

---

## Code Style & Patterns

### Python (Backend)

**Naming Conventions:**
- Functions: `snake_case` - `def get_predictions()`
- Classes: `PascalCase` - `class GoldPredictor`
- Constants: `UPPER_SNAKE_CASE` - `MAX_PREDICTION_DAYS = 90`
- Private methods: `_leading_underscore` - `def _parse_csv()`

**Patterns:**
```python
# Error handling: Always use try/except with logging
try:
    result = risky_operation()
except SpecificError as e:
    logger.error(f"Context: {e}")
    raise
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    return None, 500

# API responses: Consistent JSON structure
return jsonify({
    'success': True,
    'data': {...},
    'error': None
}), 200

# Validation: Check early, fail fast
if not param:
    return jsonify({'error': 'Missing param'}), 400

# Logging: Include context
logger.info(f"Processing dataset: {filename}, rows: {len(df)}")
logger.error(f"Model inference failed: {error}")
```

### JavaScript (Frontend)

**Naming Conventions:**
- Functions: `camelCase` - `const handleSubmit = () => {}`
- Components: `PascalCase` - `function MyComponent() {}`
- Constants: `UPPER_SNAKE_CASE` - `const MAX_DAYS = 90`
- Private functions: `_leading_underscore` - `const _format = () => {}`

**Patterns:**
```javascript
// Async/await with error handling
const fetchData = async () => {
    try {
        setLoading(true)
        const response = await api.get('/endpoint')
        setData(response.data)
    } catch (error) {
        console.error('Error:', error)
        setError(error.message)
    } finally {
        setLoading(false)
    }
}

// Component with hooks
function MyComponent() {
    const [state, setState] = useState(initial)
    
    useEffect(() => {
        // Side effect
        return () => {
            // Cleanup
        }
    }, [dependency])
    
    return <div>{state}</div>
}

// Conditional rendering
{loading && <Spinner />}
{error && <Alert>{error}</Alert>}
{data && <Display data={data} />}
```

---

## Adding New Features

### Example: Add a "Statistics" endpoint

**Step 1: Backend service (services/predictor.py)**

```python
def calculate_statistics(self, df):
    """Calculate statistical metrics from data."""
    return {
        'mean': float(df['gold_price'].mean()),
        'std': float(df['gold_price'].std()),
        'min': float(df['gold_price'].min()),
        'max': float(df['gold_price'].max()),
        'variance': float(df['gold_price'].var())
    }
```

**Step 2: API endpoint (routes/api.py)**

```python
@api_bp.route('/statistics', methods=['GET'])
def statistics():
    """Get statistical summary of loaded dataset."""
    if 'dataset' not in session:
        return jsonify({'error': 'No dataset loaded'}), 400
    
    try:
        df = session['dataset']
        stats = predictor.calculate_statistics(df)
        return jsonify({'success': True, 'statistics': stats})
    except Exception as e:
        logger.error(f"Statistics error: {e}")
        return jsonify({'error': str(e)}), 500
```

**Step 3: Frontend service (services/api.js)**

```javascript
export const getStatistics = async () => {
    const response = await api.get('/statistics')
    return response.data.statistics
}
```

**Step 4: Frontend component (pages/Statistics.jsx)**

```javascript
import React, { useState, useEffect } from 'react'
import { getStatistics } from '../services/api'

export default function Statistics() {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getStatistics()
                setStats(data)
            } catch (error) {
                console.error('Error:', error)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    if (loading) return <div>Loading...</div>
    if (!stats) return <div>No data</div>

    return (
        <div className="grid grid-cols-2 gap-4">
            <div>Mean: {stats.mean.toFixed(2)}</div>
            <div>Std Dev: {stats.std.toFixed(2)}</div>
            <div>Min: {stats.min.toFixed(2)}</div>
            <div>Max: {stats.max.toFixed(2)}</div>
        </div>
    )
}
```

**Step 5: Tests (backend/tests/test_statistics.py)**

```python
def test_statistics_endpoint(client):
    # Load sample data first
    client.get('/api/sample-data')
    
    # Get statistics
    response = client.get('/api/statistics')
    assert response.status_code == 200
    
    stats = response.get_json()['statistics']
    assert 'mean' in stats
    assert 'std' in stats
    assert stats['mean'] > 0
```

---

## Debugging Tips

### Backend Debugging

**1. Enable Flask debug mode:**

```bash
export FLASK_DEBUG=1
python app.py
# Auto-reloads on code change
# Better error pages in browser
```

**2. Add print statements (visible in console):**

```python
print(f"DEBUG: Predictions = {predictions}")
logger.debug(f"Dataset shape: {df.shape}")
```

**3. Use pdb (Python debugger):**

```python
import pdb

def my_function():
    result = expensive_operation()
    pdb.set_trace()  # Execution stops here
    # Enter commands: p variable, n (next), c (continue)
    return result
```

**4. Check logs:**

```bash
# Logs appear in terminal running `python app.py`
# Look for ERROR, WARNING, DEBUG messages
tail -f flask.log  # if file logging is enabled
```

### Frontend Debugging

**1. Browser DevTools:**

```javascript
// Open Chrome DevTools (F12 or Cmd+Opt+I)
// Go to "Console" tab to see console.log output
console.log('Debug:', variable)
console.error('Error:', error)
```

**2. React Developer Tools Extension:**

```bash
# Install: Chrome/Firefox extension "React Developer Tools"
# Inspect component tree and props
# View state and hooks for each component
```

**3. Network tab:**

```
DevTools → Network tab
1. Perform action
2. See HTTP requests to backend
3. Click request to view headers, body, response
4. Check status codes and response times
```

**4. Vite HMR (Hot Module Replacement):**

```bash
npm run dev
# Edit file → changes appear instantly in browser
# Preserves component state during update
```

---

## Common Issues

### Backend Issues

**Issue:** `ModuleNotFoundError: No module named 'flask'`

**Solution:**
```bash
cd backend
pip install -r requirements.txt
```

**Issue:** `SECRET_KEY not found` error

**Solution:**
```bash
cd backend
cp .env.example .env
# Edit .env and set a value for SECRET_KEY
# e.g., SECRET_KEY=dev-secret-key-12345
```

**Issue:** Port 5000 already in use

**Solution:**
```bash
# Kill process using port 5000
lsof -i :5000  # Find PID
kill -9 <PID>

# Or run on different port
export FLASK_ENV=development
python -c "from app import create_app; app = create_app(); app.run(port=5001)"
```

**Issue:** Tests fail with `AssertionError`

**Solution:**
```bash
# Run with verbose output
python -m pytest tests/ -v -s

# Run single test with full traceback
python -m pytest tests/test_health.py::test_health_check -v --tb=long

# Check that backend is NOT already running
# (Tests use test client, not real server)
```

### Frontend Issues

**Issue:** `npm: command not found`

**Solution:**
```bash
# Install Node.js from nodejs.org
node --version   # Verify
npm --version
```

**Issue:** Port 5173 already in use

**Solution:**
```bash
cd frontend
npm run dev -- --port 3000  # Use different port
```

**Issue:** API calls failing with CORS error

**Solution:**
```
# Make sure backend is running:
cd backend && python app.py

# Check vite.config.js has correct proxy:
proxy: {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true
  }
}

# Reload frontend
```

**Issue:** Hot reload not working

**Solution:**
```bash
# Kill and restart dev server
npm run dev

# Check that you're editing src/ files
# (public/ files require manual refresh)
```

### Integration Issues

**Issue:** Frontend can't connect to backend

**Solution:**
```bash
# 1. Backend running?
curl http://localhost:5000/api/health

# 2. Frontend proxy configured?
cat frontend/vite.config.js | grep proxy

# 3. Ports correct?
Backend: 5000
Frontend: 5173

# 4. CORS enabled in backend?
Check app.py for CORS configuration
```

---

## Performance Optimization

### Backend Optimization

**1. Model caching:**
```python
# Model loads once on first use, then cached
predictor.load_model()  # Subsequent calls use cached model
```

**2. Feature engineering efficiency:**
```python
# Vectorized NumPy operations (fast)
rolling_mean = np.convolve(data, np.ones(5)/5, mode='valid')

# Avoid Python loops (slow)
# for i in range(len(data)):
#     result[i] = ...
```

**3. Session cleanup:**
```python
# Flask automatically cleans up old sessions
# Manually: clear session if not needed
session.clear()
```

### Frontend Optimization

**1. Memoization (avoid unnecessary re-renders):**
```javascript
import { memo } from 'react'

const MyComponent = memo(function MyComponent(props) {
    // Component only re-renders if props change
})
```

**2. Code splitting (lazy loading):**
```javascript
import { lazy, Suspense } from 'react'
const HeavyComponent = lazy(() => import('./HeavyComponent'))

<Suspense fallback={<div>Loading...</div>}>
    <HeavyComponent />
</Suspense>
```

**3. Image optimization:**
```javascript
// Use correct size images
// Use WebP format for smaller files
// Lazy load images with loading="lazy"
<img src="image.webp" loading="lazy" alt="desc" />
```

---

**Last Updated:** Phase 6  
**Status:** Complete development guide for AURUM PREDICT

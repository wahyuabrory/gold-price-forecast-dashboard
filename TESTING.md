# Testing Strategy - Gold Price Forecast Dashboard

## Overview
Comprehensive testing framework for the AURUM PREDICT dashboard covering backend (Flask) and frontend (React + Vite) with integration tests.

## Backend Testing (Flask + Pytest)

### Current Test Files
- `backend/tests/test_health.py` - Health check endpoint tests
- `backend/tests/test_forecast_hardening.py` - Prediction model robustness tests

### Test Setup
- **Framework**: pytest
- **Dependencies**: pytest (in requirements.txt if needed)
- **Configuration**: Standard pytest discovery (test_*.py)
- **Session Storage**: Flask session (filesystem-based, 4-hour TTL)

### Running Backend Tests
```bash
cd backend
python -m pytest tests/ -v              # Run all tests verbose
python -m pytest tests/test_forecast_hardening.py -v  # Specific test file
python -m pytest tests/ --tb=short      # Short traceback
python -m pytest tests/ -s              # Show print statements
```

### Test Coverage Areas

#### 1. Health Check (`/api/health`)
- Verify endpoint returns 200 status
- Check response schema (status, timestamp, model, dataset, version)
- Validate model loaded state
- Validate dataset loaded state

#### 2. Forecast Hardening (`test_forecast_hardening.py`)
- Model loading and inference
- Feature engineering pipeline
- Edge cases (missing values, small datasets, invalid inputs)
- Fallback mode (naive forecast when model fails)
- Prediction accuracy within acceptable bounds

#### 3. API Endpoints to Test
- `POST /api/upload` - CSV upload with validation
- `GET /api/sample-data` - Built-in dataset loading
- `POST /api/predict` - Prediction generation (1-90 days)
- `GET /api/metrics` - Metrics retrieval
- `GET /api/export` - CSV export
- `GET /api/dashboard` - Dashboard summary
- `GET /api/historical` - Historical analysis by period

#### 4. Edge Cases & Error Handling
- Empty dataset upload
- Dataset < 60 rows (minimum requirement)
- Invalid date formats
- Missing required columns
- Out-of-range prediction days (clamped to 1-90)
- Session expiration (4-hour TTL)
- Concurrent requests
- Model loading failures

### Backend Test Template
```python
import pytest
from flask import Flask
from app import create_app

@pytest.fixture
def app():
    app = create_app()
    app.config['TESTING'] = True
    return app

@pytest.fixture
def client(app):
    return app.test_client()

def test_endpoint_name(client):
    response = client.get('/api/endpoint')
    assert response.status_code == 200
    assert 'expected_field' in response.get_json()
```

---

## Frontend Testing (React + Vite)

### Current Test Setup
- **Framework**: None currently configured (Jest or Vitest recommended)
- **Testing Library**: React Testing Library recommended
- **Coverage**: Component tests, integration tests

### Recommended Test Framework
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jsdom": "^23.0.0"
  }
}
```

### Setup Instructions
```bash
cd frontend
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
```

### Frontend Test Structure
```
frontend/src/
├── __tests__/
│   ├── setup.js               # Test configuration
│   ├── components/
│   │   ├── Dashboard.test.jsx
│   │   ├── Predict.test.jsx
│   │   └── History.test.jsx
│   ├── services/
│   │   └── api.test.js
│   └── pages/
│       └── App.test.jsx
```

### Running Frontend Tests
```bash
cd frontend
npm test                        # Run all tests
npm test -- --watch            # Watch mode
npm test -- --coverage         # With coverage
npm test -- Dashboard.test     # Specific test file
npm test -- --ui               # UI mode
```

### Test Coverage Areas

#### 1. Components
- **Dashboard.jsx** - Renders summary cards, charts, data loading
- **Predict.jsx** - CSV upload, sample data loading, prediction generation, export
- **History.jsx** - Historical period filtering, volatility analysis
- **App.jsx** - Routing, navigation, page transitions

#### 2. Services (API Client)
- `api.js` functions:
  - `uploadCSV()` - File upload validation
  - `loadSampleData()` - Sample data loading
  - `generatePrediction()` - Prediction request
  - `getMetrics()` - Metrics retrieval
  - `exportPredictions()` - CSV download
  - `getDashboardData()` - Dashboard data
  - `getHistoricalData()` - Historical data by period
- Error handling and retry logic
- Request timeout (120s)
- CORS and credentials

#### 3. Integration Tests
- Component → API → Backend flow
- Multi-step user workflows (upload → predict → export)
- Error boundaries and fallback UI
- Loading states and spinners

#### 4. UI/UX Tests
- Responsive design (mobile, tablet, desktop)
- Dark mode toggle
- Form validation
- Data visualization (charts rendering)
- Accessibility (ARIA labels, keyboard navigation)

### Frontend Test Template
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '../pages/Dashboard';

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard with data', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/current price/i)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock API error
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

---

## Integration Testing

### End-to-End Workflow Tests
1. **Data Upload & Processing**
   - Upload CSV file → Validate parsing → Store in session
   - Load sample data → Verify records count

2. **Prediction Generation**
   - Load data → Generate prediction for N days
   - Verify prediction results and metrics
   - Check confidence score and error bounds

3. **Export & Download**
   - Generate predictions → Export to CSV → Verify file format
   - Check CSV headers and data integrity

4. **Multi-User Scenario**
   - Session isolation (separate session per browser)
   - Concurrent predictions
   - Session expiration handling

### Integration Test Example
```python
# backend/tests/test_integration.py
def test_upload_and_predict_flow(client):
    # 1. Upload CSV
    with open('backend/models/dataset_final.csv', 'rb') as f:
        response = client.post('/api/upload', data={'file': f})
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] == True
    
    # 2. Generate prediction
    response = client.post('/api/predict', json={'days': 30})
    assert response.status_code == 200
    assert 'predictions' in response.get_json()
    
    # 3. Export predictions
    response = client.get('/api/export')
    assert response.status_code == 200
    assert response.content_type == 'text/csv'
```

---

## Continuous Integration

### GitHub Actions Workflow (.github/workflows/test.yml)
```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r backend/requirements.txt pytest
      - run: cd backend && python -m pytest tests/ -v

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm install
      - run: cd frontend && npm test
      - run: cd frontend && npm run lint
```

---

## Test Running Checklist

### Before Each Test Run
- [ ] Backend dependencies installed: `pip install -r requirements.txt`
- [ ] Frontend dependencies installed: `npm install` (from frontend/)
- [ ] Backend service running: `python app.py` (port 5000)
- [ ] Frontend dev server running: `npm run dev` (port 5173)
- [ ] No port conflicts with existing services

### Running Full Test Suite
```bash
# Terminal 1: Backend
cd backend
python -m pytest tests/ -v

# Terminal 2: Frontend
cd frontend
npm test

# Terminal 3: Linting
cd frontend
npm run lint
```

### Expected Results
- ✅ Backend: All pytest tests pass
- ✅ Frontend: All component tests pass (once Vitest configured)
- ✅ Frontend: ESLint with zero errors

---

## Test Metrics

### Coverage Goals
- Backend: Minimum 80% code coverage
- Frontend: Minimum 75% component coverage
- Critical paths: 100% coverage (upload, predict, export)

### Metrics Commands
```bash
# Backend coverage
cd backend
pip install pytest-cov
python -m pytest tests/ --cov=. --cov-report=html

# Frontend coverage
cd frontend
npm test -- --coverage
```

---

## Known Limitations & Future Improvements

### Current Gaps
- ❌ Frontend tests not yet configured (Vitest/Jest setup needed)
- ❌ No E2E tests (Cypress/Playwright recommended)
- ❌ No performance/load testing
- ❌ Limited edge case coverage for API endpoints
- ❌ No visual regression testing

### Recommendations
1. **Phase 1**: Set up Vitest + React Testing Library for frontend
2. **Phase 2**: Add E2E tests with Cypress for critical workflows
3. **Phase 3**: Expand backend test coverage to 80%+
4. **Phase 4**: Add performance benchmarks and load tests
5. **Phase 5**: Integrate GitHub Actions for automated CI/CD

---

## References
- Backend: [Pytest Documentation](https://docs.pytest.org/)
- Frontend: [Vitest Documentation](https://vitest.dev/)
- Testing Library: [React Testing Library](https://testing-library.com/react)
- CI/CD: [GitHub Actions](https://docs.github.com/en/actions)

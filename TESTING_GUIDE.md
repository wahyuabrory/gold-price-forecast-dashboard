# Testing Guide - AURUM PREDICT

**TL;DR:** Run backend tests with `cd backend && python -m pytest tests/ -v`. Frontend tests with `cd frontend && npm test`. Coverage with `--cov` flag. Write tests first (TDD), then implementation.

---

## Table of Contents

1. [Testing Architecture](#testing-architecture)
2. [Running Tests](#running-tests)
3. [Writing Tests (TDD)](#writing-tests-tdd)
4. [Test Organization](#test-organization)
5. [Fixtures & Mocks](#fixtures--mocks)
6. [Coverage & Metrics](#coverage--metrics)
7. [CI/CD Notes](#cicd-notes)
8. [Troubleshooting](#troubleshooting)

---

## Testing Architecture

### Three-Level Testing Approach

```
1. Unit Tests (Fast, Isolated)
   └─ Test individual functions/components
      └─ No external dependencies (mock DB, API)
      └─ Examples: Math functions, formatters, parsers

2. Integration Tests (Medium, Connected)
   └─ Test multiple components together
      └─ May use real service instances
      └─ Examples: API endpoint + service layer

3. End-to-End Tests (Slow, Full Flow)
   └─ Test complete user workflows
      └─ Uses real browser, real backend
      └─ Examples: Upload → Predict → Export
```

### Current Test Coverage

```
Backend:
  ✅ 16 tests (health, forecast, integration, demo)
  📊 Levels: Unit + Integration

Frontend:
  ✅ 172 tests (components, services, pages)
  📊 Levels: Unit + Component

Demo Integration:
  ✅ 23 tests (parallel execution scenarios)
```

---

## Running Tests

### Backend Tests

**All tests (verbose):**

```bash
cd backend
python -m pytest tests/ -v
```

**Output example:**
```
tests/test_health.py::test_health_check PASSED
tests/test_forecast_hardening.py::test_model_loading PASSED
tests/test_forecast_hardening.py::test_predictions_generated PASSED
...
================ 16 passed in 1.23s ================
```

**Specific test file:**

```bash
python -m pytest tests/test_health.py -v
```

**Specific test function:**

```bash
python -m pytest tests/test_health.py::test_health_check -v
```

**Watch mode (re-run on file change):**

```bash
pip install pytest-watch
ptw tests/
```

**Show print statements:**

```bash
python -m pytest tests/ -v -s
```

**With coverage report:**

```bash
pip install pytest-cov
python -m pytest tests/ --cov=. --cov-report=html
# Open htmlcov/index.html in browser
```

**Stop at first failure:**

```bash
python -m pytest tests/ -x
```

**Run only failing tests:**

```bash
python -m pytest tests/ --lf
```

### Frontend Tests

**All tests (interactive):**

```bash
cd frontend
npm test
```

**Watch mode (re-run on change):**

```bash
npm test -- --watch
```

**Specific test file:**

```bash
npm test -- Dashboard.test
```

**With coverage:**

```bash
npm test -- --coverage
```

**UI mode (visual dashboard):**

```bash
npm test -- --ui
# Opens http://localhost:51204/
```

---

## Writing Tests (TDD)

### Backend TDD Workflow

**Step 1: Write test (Red)**

Create `backend/tests/test_new_feature.py`:

```python
import pytest
from app import create_app

@pytest.fixture
def app():
    """Create and configure test app."""
    app = create_app()
    app.config['TESTING'] = True
    return app

@pytest.fixture
def client(app):
    """Test client for making requests."""
    return app.test_client()

def test_new_endpoint_success(client):
    """Test successful request."""
    response = client.post('/api/new-endpoint', json={'param': 'value'})
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] == True
    assert 'data' in data

def test_new_endpoint_missing_param(client):
    """Test error when param missing."""
    response = client.post('/api/new-endpoint', json={})
    
    assert response.status_code == 400
    data = response.get_json()
    assert data['success'] == False
```

**Run test (see failure):**

```bash
python -m pytest tests/test_new_feature.py -v
# FAILED - endpoint doesn't exist yet
```

**Step 2: Write implementation (Green)**

Edit `backend/routes/api.py`:

```python
@api_bp.route('/new-endpoint', methods=['POST'])
def new_endpoint():
    """New feature endpoint."""
    data = request.get_json()
    
    if 'param' not in data:
        return jsonify({'success': False, 'error': 'Missing param'}), 400
    
    # Process request
    result = process(data['param'])
    
    return jsonify({'success': True, 'data': result}), 200
```

**Run test (see pass):**

```bash
python -m pytest tests/test_new_feature.py -v
# PASSED
```

**Step 3: Refactor & improve (Repeat)**

Add more test cases for edge cases, then improve implementation.

### Frontend TDD Workflow

**Step 1: Write test (Red)**

Create `frontend/src/__tests__/pages/NewPage.test.jsx`:

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NewPage from '../../pages/NewPage'

describe('NewPage', () => {
    it('renders page title', () => {
        render(<NewPage />)
        expect(screen.getByText(/new page/i)).toBeInTheDocument()
    })

    it('loads and displays data', async () => {
        render(<NewPage />)
        
        await waitFor(() => {
            expect(screen.getByText(/loading/i)).toBeInTheDocument()
        })
        
        await waitFor(() => {
            expect(screen.getByText(/data loaded/i)).toBeInTheDocument()
        })
    })

    it('handles API errors', async () => {
        // Mock API to fail
        vi.mock('../../services/api', () => ({
            getPageData: vi.fn().mockRejectedValue(new Error('API Error'))
        }))
        
        render(<NewPage />)
        
        await waitFor(() => {
            expect(screen.getByText(/error/i)).toBeInTheDocument()
        })
    })
})
```

**Run test (see failure):**

```bash
npm test -- NewPage.test
# FAILED - component doesn't exist
```

**Step 2: Write component (Green)**

Create `frontend/src/pages/NewPage.jsx`:

```javascript
import React, { useState, useEffect } from 'react'
import { getPageData } from '../services/api'

export default function NewPage() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const load = async () => {
            try {
                const result = await getPageData()
                setData(result)
            } catch (err) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    if (loading) return <div>Loading...</div>
    if (error) return <div>Error: {error}</div>
    
    return (
        <div>
            <h1>New Page</h1>
            <div>Data loaded</div>
        </div>
    )
}
```

**Run test (see pass):**

```bash
npm test -- NewPage.test
# PASSED
```

---

## Test Organization

### Backend Test Structure

**File naming:** `test_*.py` (pytest autodiscovery)

**Location:** `backend/tests/`

**Current tests:**

```
backend/tests/
├── conftest.py                          # Shared fixtures
├── test_health.py                       # Health endpoint (3 tests)
├── test_forecast_hardening.py           # Model robustness (5 tests)
├── test_api_integration.py              # Integration flows (6 tests)
└── test_demo.py                         # Demo endpoint (23 tests)
```

**Typical test structure:**

```python
import pytest
from app import create_app

class TestFeature:
    """Group related tests in a class."""
    
    @pytest.fixture
    def client(self):
        """Setup for each test."""
        app = create_app()
        app.config['TESTING'] = True
        return app.test_client()
    
    def test_success_case(self, client):
        """Test happy path."""
        response = client.get('/api/endpoint')
        assert response.status_code == 200
    
    def test_error_case(self, client):
        """Test error handling."""
        response = client.get('/api/nonexistent')
        assert response.status_code == 404
```

### Frontend Test Structure

**File naming:** `*.test.jsx` (Vitest autodiscovery)

**Location:** `frontend/src/__tests__/`

**Organizational pattern:**

```
frontend/src/__tests__/
├── pages/
│   ├── Dashboard.test.jsx
│   ├── Predict.test.jsx
│   └── History.test.jsx
├── components/
│   └── Layout.test.jsx
└── services/
    └── api.test.js
```

**Typical test structure:**

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Component from '../../Component'

describe('Component', () => {
    beforeEach(() => {
        // Setup before each test
    })

    it('renders correctly', () => {
        render(<Component />)
        expect(screen.getByText(/expected/i)).toBeInTheDocument()
    })

    it('handles user interaction', async () => {
        render(<Component />)
        // Test interactions
    })
})
```

---

## Fixtures & Mocks

### Backend Fixtures (conftest.py)

**Pytest fixtures** - setup/teardown for tests:

```python
import pytest
from app import create_app

@pytest.fixture
def app():
    """Create test app instance."""
    app = create_app()
    app.config['TESTING'] = True
    return app

@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()

@pytest.fixture
def runner(app):
    """Create CLI test runner."""
    return app.test_cli_runner()

@pytest.fixture
def sample_csv():
    """Sample CSV data."""
    return b"""date,gold_price,usd_idr,inflation,interest_rate
2015-01-01,549000,12385,0.0696,0.0775
2015-01-02,550000,12400,0.0700,0.0775"""
```

**Using fixtures:**

```python
def test_upload(client, sample_csv):
    """Test uses client and sample_csv fixtures."""
    response = client.post('/api/upload', data={'file': sample_csv})
    assert response.status_code == 200
```

### Frontend Mocks (Vitest)

**Mock API calls:**

```javascript
import { describe, it, expect, vi } from 'vitest'
import { getPageData } from '../services/api'

// Mock the entire module
vi.mock('../services/api', () => ({
    getPageData: vi.fn(() => Promise.resolve({
        data: 'test data'
    }))
}))

it('uses mocked API', async () => {
    const result = await getPageData()
    expect(result.data).toBe('test data')
})
```

**Mock specific functions:**

```javascript
import { vi } from 'vitest'

const mockFn = vi.fn()
mockFn.mockReturnValue('mocked value')
mockFn.mockResolvedValue('async value')
mockFn.mockRejectedValue(new Error('mock error'))

expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledWith('argument')
expect(mockFn).toHaveBeenCalledTimes(2)
```

---

## Coverage & Metrics

### Backend Coverage

**Generate coverage report:**

```bash
cd backend
pip install pytest-cov
python -m pytest tests/ --cov=. --cov-report=html
```

**View report:**

```bash
open htmlcov/index.html    # Mac
start htmlcov/index.html   # Windows
xdg-open htmlcov/index.html # Linux
```

**Coverage requirements (goals):**

| Component | Target | Current |
|-----------|--------|---------|
| routes/api.py | 85% | ~80% |
| services/predictor.py | 90% | ~85% |
| Overall | 80% | ~82% |

**Check specific file coverage:**

```bash
python -m pytest tests/ --cov=routes.api --cov-report=term-missing
```

### Frontend Coverage

**Generate coverage report:**

```bash
cd frontend
npm test -- --coverage
```

**Output example:**
```
File                 Lines Statements Functions Branches
Dashboard.jsx        95%   92%        88%       85%
Predict.jsx          92%   90%        85%       80%
History.jsx          88%   85%        80%       75%
```

---

## Common Test Patterns

### Backend Patterns

**Test endpoint with session:**

```python
def test_predict_with_dataset(client):
    # Load dataset first
    client.get('/api/sample-data')
    
    # Make prediction
    response = client.post('/api/predict', json={'days': 30})
    
    assert response.status_code == 200
    assert len(response.get_json()['predictions']) == 30
```

**Test error handling:**

```python
def test_missing_parameter(client):
    response = client.post('/api/predict', json={})
    
    assert response.status_code == 400
    assert 'error' in response.get_json()
```

**Test file upload:**

```python
def test_csv_upload(client):
    data = {
        'file': (io.BytesIO(b'date,gold_price\n2015-01-01,549000\n...'), 'test.csv')
    }
    
    response = client.post('/api/upload', data=data)
    assert response.status_code == 200
```

### Frontend Patterns

**Test component rendering:**

```javascript
it('renders dashboard title', () => {
    render(<Dashboard />)
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument()
})
```

**Test user interaction:**

```javascript
it('handles button click', async () => {
    const user = userEvent.setup()
    render(<PredictForm />)
    
    const button = screen.getByRole('button', { name: /predict/i })
    await user.click(button)
    
    expect(screen.getByText(/predicting/i)).toBeInTheDocument()
})
```

**Test async data loading:**

```javascript
it('loads and displays data', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })
    
    expect(screen.getByText(/price:/i)).toBeInTheDocument()
})
```

---

## CI/CD Notes

**For this project:** CI/CD pipelines skipped per Phase 6 requirements

**Future implementation could use:**

```yaml
# GitHub Actions (.github/workflows/test.yml)
name: Tests
on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
      - run: pip install -r backend/requirements.txt pytest
      - run: cd backend && python -m pytest tests/ -v

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd frontend && npm install
      - run: cd frontend && npm test
```

---

## Troubleshooting

### Backend Test Issues

**Issue:** `ModuleNotFoundError: No module named 'app'`

**Solution:**
```bash
cd backend
python -m pytest tests/ -v
# Must run from backend directory
```

**Issue:** Tests fail but code works

**Solution:**
```bash
# Make sure backend isn't running
pkill -f "python app.py"

# Tests use test client, not real server
python -m pytest tests/ -v -s  # Show output
```

**Issue:** `FAILED - fixture 'client' not found`

**Solution:**
```python
# Add fixture to conftest.py or test file
@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    return app.test_client()
```

### Frontend Test Issues

**Issue:** `npm ERR! code ENOENT`

**Solution:**
```bash
cd frontend
npm install
npm test
```

**Issue:** `ReferenceError: document is not defined`

**Solution:**
```javascript
// Setup jsdom in vitest.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'jsdom'
    }
})
```

**Issue:** Async test timeout

**Solution:**
```javascript
it('async test', async () => {
    // Increase timeout to 10 seconds
    // Vitest default is 5 seconds
}, 10000)
```

---

## Test Checklist

Before committing code:

- [ ] Write test first (TDD)
- [ ] Test fails initially (Red)
- [ ] Implementation passes test (Green)
- [ ] Refactor if needed (Refactor)
- [ ] Run all tests: `pytest tests/ -v`
- [ ] Run frontend tests: `npm test`
- [ ] Check coverage: `--cov` flag
- [ ] Coverage meets targets (80%+)
- [ ] No failing tests
- [ ] No linting errors

---

**Last Updated:** Phase 6  
**Test Count:** 188 total (16 backend + 172 frontend)  
**Status:** Testing framework complete

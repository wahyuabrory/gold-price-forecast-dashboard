# API Endpoints - AURUM PREDICT

**Base URL:** `http://localhost:5000`  
**Authentication:** Session-based (no JWT)  
**Content-Type:** `application/json` (except file uploads)  
**Session Timeout:** 4 hours

---

## Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check & model status |
| `/api/upload` | POST | Upload CSV dataset |
| `/api/sample-data` | GET | Load built-in dataset |
| `/api/predict` | POST | Generate predictions |
| `/api/metrics` | GET | Performance metrics |
| `/api/export` | GET | Download predictions CSV |
| `/api/dashboard` | GET | Dashboard summary |
| `/api/historical` | GET | Historical analysis |
| `/api/demo` | POST | Parallel execution demo |

---

## Endpoints Detail

### 1. Health Check

**Endpoint:** `GET /api/health`

**Purpose:** Monitor application and model status

**Request:**
```bash
curl http://localhost:5000/api/health
```

**Response (200 - Healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2024-03-28T10:30:45.123456",
  "model": {
    "loaded": true,
    "lookback": 60,
    "features": 19
  },
  "dataset": {
    "loaded": true,
    "records": 3926,
    "filename": "dataset_final.csv"
  },
  "version": "1.0.0"
}
```

**Response (503 - Model Not Loaded):**
```json
{
  "status": "degraded",
  "timestamp": "2024-03-28T10:30:45.123456",
  "model": {
    "loaded": false,
    "lookback": null,
    "features": null
  },
  "dataset": {
    "loaded": false
  },
  "version": "1.0.0"
}
```

---

### 2. Upload Dataset

**Endpoint:** `POST /api/upload`

**Purpose:** Upload a CSV file with historical data

**Request:**
```bash
curl -X POST http://localhost:5000/api/upload \
  -F "file=@data.csv"
```

**Form Data:**
- `file` (required) - CSV file, multipart/form-data

**CSV Format (Required Columns):**

Minimum columns: `date`, `gold_price`

```csv
date,gold_price,usd_idr,inflation,interest_rate
2015-01-01,549000,12385,0.0696,0.0775
2015-01-02,550000,12400,0.0700,0.0775
2015-01-03,548500,12395,0.0705,0.0775
```

**Column Details:**

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `date` | String | ✓ | ISO format (2015-01-01) or Indonesian (01-01-2015) |
| `gold_price` | Float | ✓ | Price in IDR |
| `usd_idr` | Float | ✗ | Exchange rate (optional) |
| `inflation` | Float | ✗ | Rate as decimal (0.07 = 7%) |
| `interest_rate` | Float | ✗ | Rate as decimal |

**Minimum Requirements:**
- At least 60 rows (lookback period)
- Valid date format
- Numeric gold_price column

**Response (200 - Success):**
```json
{
  "success": true,
  "records": 3926,
  "filename": "data.csv",
  "date_range": {
    "start": "2015-01-01",
    "end": "2024-03-28"
  },
  "columns": ["date", "gold_price", "usd_idr", "inflation", "interest_rate"]
}
```

**Response (400 - Invalid CSV):**
```json
{
  "success": false,
  "error": "Dataset must have at least 60 rows"
}
```

**Error Cases:**
- `error: "No file provided"` - Missing file parameter
- `error: "Dataset must have at least 60 rows"` - Too few rows
- `error: "Missing required column: date"` - Missing date column
- `error: "Missing required column: gold_price"` - Missing price column

---

### 3. Load Sample Data

**Endpoint:** `GET /api/sample-data`

**Purpose:** Load built-in demo dataset

**Request:**
```bash
curl http://localhost:5000/api/sample-data
```

**Response (200):**
```json
{
  "success": true,
  "records": 3926,
  "filename": "dataset_final.csv",
  "date_range": {
    "start": "2015-01-01",
    "end": "2024-03-28"
  },
  "columns": ["date", "gold_price", "usd_idr", "inflation", "interest_rate"]
}
```

---

### 4. Generate Predictions

**Endpoint:** `POST /api/predict`

**Purpose:** Generate price forecasts for N days

**Request:**
```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"days": 30}'
```

**Parameters:**

| Parameter | Type | Required | Range | Notes |
|-----------|------|----------|-------|-------|
| `days` | Integer | ✓ | 1-90 | Number of days to forecast |

**Response (200 - Success):**
```json
{
  "success": true,
  "days": 30,
  "predictions": [
    {
      "date": "2024-03-29",
      "predicted_price": 652000,
      "upper_bound": 665000,
      "lower_bound": 639000
    },
    {
      "date": "2024-03-30",
      "predicted_price": 653500,
      "upper_bound": 670000,
      "lower_bound": 637000
    }
    // ... 28 more days
  ],
  "metrics": {
    "mae": 1500,
    "rmse": 2000,
    "mape": 0.23,
    "confidence": 0.85
  },
  "model_info": {
    "type": "GRU",
    "lookback": 60,
    "features": 19
  }
}
```

**Response (400 - No Dataset):**
```json
{
  "success": false,
  "error": "No dataset loaded. Upload CSV or load sample data first."
}
```

**Response (400 - Invalid Days):**
```json
{
  "success": false,
  "error": "Days must be between 1 and 90"
}
```

**Error Cases:**
- `error: "No dataset loaded"` - Call /api/sample-data first
- `error: "Days must be between 1 and 90"` - Invalid day range
- `error: "Insufficient data for prediction"` - Dataset too small

---

### 5. Get Metrics

**Endpoint:** `GET /api/metrics`

**Purpose:** Retrieve model performance metrics

**Request:**
```bash
curl http://localhost:5000/api/metrics
```

**Response (200):**
```json
{
  "success": true,
  "model_metrics": {
    "mae": 1234.56,
    "rmse": 1678.90,
    "mape": 0.19,
    "confidence": 0.87,
    "training_accuracy": 0.92
  },
  "dataset_metrics": {
    "records": 3926,
    "date_range_years": 9.25,
    "price_volatility": 0.15,
    "price_range": {
      "min": 500000,
      "max": 750000,
      "mean": 625000
    }
  }
}
```

---

### 6. Export Predictions

**Endpoint:** `GET /api/export`

**Purpose:** Download predictions as CSV file

**Request:**
```bash
curl http://localhost:5000/api/export > predictions.csv
```

**Response:**

Returns CSV file with headers:
```
date,predicted_price,upper_bound,lower_bound,confidence
2024-03-29,652000,665000,639000,0.85
2024-03-30,653500,670000,637000,0.85
```

**Response Headers:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="predictions_2024-03-28.csv"
```

**Error (400 - No Predictions):**
```json
{
  "success": false,
  "error": "No predictions to export. Generate predictions first."
}
```

---

### 7. Dashboard Summary

**Endpoint:** `GET /api/dashboard`

**Purpose:** Get summary data for dashboard

**Request:**
```bash
curl http://localhost:5000/api/dashboard
```

**Response (200):**
```json
{
  "success": true,
  "current_price": 625000,
  "latest_date": "2024-03-28",
  "last_30_days": {
    "change": 12000,
    "percent": 1.95,
    "high": 638000,
    "low": 605000,
    "avg": 620500
  },
  "last_90_days": {
    "change": 35000,
    "percent": 5.93,
    "high": 665000,
    "low": 580000,
    "avg": 612000
  },
  "predictions": {
    "next_7_days": 630000,
    "next_30_days": 640000,
    "confidence": 0.85
  },
  "dataset_status": {
    "records": 3926,
    "date_range": {
      "start": "2015-01-01",
      "end": "2024-03-28"
    }
  }
}
```

---

### 8. Historical Analysis

**Endpoint:** `GET /api/historical?period={period}`

**Purpose:** Get historical analysis by time period

**Parameters:**

| Parameter | Values | Default | Notes |
|-----------|--------|---------|-------|
| `period` | `30d`, `90d`, `year`, `all` | `90d` | Time period for analysis |

**Requests:**
```bash
# Last 30 days
curl "http://localhost:5000/api/historical?period=30d"

# Last 90 days
curl "http://localhost:5000/api/historical?period=90d"

# Last year
curl "http://localhost:5000/api/historical?period=year"

# All available data
curl "http://localhost:5000/api/historical?period=all"
```

**Response (200):**
```json
{
  "success": true,
  "period": "30d",
  "records": 30,
  "data": [
    {
      "date": "2024-02-27",
      "gold_price": 613000,
      "usd_idr": 15500,
      "volatility": 0.12
    },
    {
      "date": "2024-02-28",
      "gold_price": 615000,
      "usd_idr": 15510,
      "volatility": 0.13
    }
    // ... 28 more days
  ],
  "summary": {
    "min_price": 605000,
    "max_price": 638000,
    "avg_price": 620500,
    "volatility": 0.15,
    "trend": "upward"
  }
}
```

---

### 9. Parallel Demo Endpoint

**Endpoint:** `POST /api/demo`

**Purpose:** Execute concurrent requests and measure performance

**See:** [DEMO.md](DEMO.md) for detailed documentation

**Quick Example:**

```bash
curl -X POST http://localhost:5000/api/demo \
  -H "Content-Type: application/json" \
  -d '{
    "num_parallel_requests": 5,
    "user_agents": ["Chrome", "Firefox", "Safari"],
    "endpoints": ["/api/health", "/api/dashboard"]
  }'
```

**Response (200):**
```json
{
  "success": true,
  "total_time_ms": 285.5,
  "sequential_equivalent_ms": 2150.0,
  "speedup_factor": 7.53,
  "per_user_agent": {
    "Chrome": {
      "avg": 280.2,
      "count": 2,
      "success_rate": 100.0
    },
    "Firefox": {
      "avg": 290.5,
      "count": 2,
      "success_rate": 100.0
    },
    "Safari": {
      "avg": 275.0,
      "count": 1,
      "success_rate": 100.0
    }
  },
  "all_requests": [
    {
      "endpoint": "/api/health",
      "user_agent": "Chrome",
      "status": 200,
      "response_time_ms": 280.2,
      "response_size_bytes": 285,
      "timestamp": "2024-03-28T10:30:45.000Z",
      "success": true
    }
    // ... more requests
  ]
}
```

---

## Common Response Patterns

### Success Response

```json
{
  "success": true,
  "data": {},
  "message": "Optional message"
}
```

### Error Response (400)

```json
{
  "success": false,
  "error": "Description of what went wrong"
}
```

### Error Response (500)

```json
{
  "success": false,
  "error": "Internal server error. Check backend logs."
}
```

---

## HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Endpoint works, data returned |
| 400 | Bad Request | Missing/invalid parameters |
| 500 | Server Error | Model inference failed |
| 503 | Service Unavailable | Model not loaded |

---

## Authentication & Session

**Session-based (no JWT):**

- First request creates session cookie
- Cookie automatically included in subsequent requests
- Session persists for 4 hours
- Session data stored in `backend/flask_session/`

**From Frontend:**

```javascript
// Axios automatically handles cookies
const api = axios.create({
    baseURL: '/api',
    withCredentials: true  // Include cookies
})
```

---

## Usage Examples

### Python Client

```python
import requests
import json

BASE_URL = 'http://localhost:5000'

# Load sample data
response = requests.get(f'{BASE_URL}/api/sample-data')
print(response.json())

# Generate predictions
response = requests.post(
    f'{BASE_URL}/api/predict',
    json={'days': 30}
)
predictions = response.json()
print(f"Next 30-day prediction: {predictions['predictions']}")

# Export to CSV
response = requests.get(f'{BASE_URL}/api/export')
with open('predictions.csv', 'wb') as f:
    f.write(response.content)
```

### JavaScript Client

```javascript
import axios from 'axios'

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    withCredentials: true
})

// Load sample data
const loadSampleData = async () => {
    const response = await api.get('/sample-data')
    console.log(response.data)
}

// Generate predictions
const generatePredictions = async (days) => {
    const response = await api.post('/predict', { days })
    return response.data.predictions
}

// Download predictions
const downloadPredictions = async () => {
    const response = await api.get('/export')
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'predictions.csv')
    link.click()
}

// Usage
loadSampleData()
const predictions = await generatePredictions(30)
downloadPredictions()
```

### cURL Examples

```bash
# Health check
curl http://localhost:5000/api/health

# Upload CSV
curl -X POST http://localhost:5000/api/upload \
  -F "file=@data.csv"

# Generate 30-day prediction
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"days": 30}'

# Get dashboard data
curl http://localhost:5000/api/dashboard

# Export predictions
curl http://localhost:5000/api/export > predictions.csv

# Historical analysis - last 30 days
curl "http://localhost:5000/api/historical?period=30d"

# Run demo with 5 parallel requests
curl -X POST http://localhost:5000/api/demo \
  -H "Content-Type: application/json" \
  -d '{
    "num_parallel_requests": 5,
    "user_agents": ["Chrome", "Firefox"],
    "endpoints": ["/api/health", "/api/dashboard"]
  }'
```

---

## Rate Limiting

Currently: **No rate limiting** (research-grade application)

Future enhancement: Could add rate limiting via Flask-Limiter if needed.

---

## CSV Input Format Details

### Column Name Flexibility

The parser auto-detects columns (case-insensitive, spaces normalized):

```csv
# Supported variations for date:
date, Date, DATE, tanggal, TANGGAL

# Supported variations for price:
gold_price, price, close, harga, close_price

# Supported variations for exchange:
usd_idr, USD_IDR, usd/idr, exchange_rate

# Supported variations for inflation:
inflation, inflation_rate, inflation%

# Supported variations for interest:
interest_rate, interest, rate, interest%
```

### Date Format Examples

Supported date formats (auto-detected):

```csv
# ISO format (recommended)
2015-01-01

# Indonesian format (day-first)
01-01-2015

# Slash separator
01/01/2015

# Month name
01 Jan 2015
```

### Minimum Dataset

```csv
date,gold_price
2015-01-01,549000
2015-01-02,550000
...
2015-03-01,580000
```

Requires minimum 60 rows (60-day lookback period).

---

## Error Handling Best Practices

**Always check success field:**

```javascript
try {
    const response = await api.post('/predict', { days: 30 })
    if (response.data.success) {
        // Process predictions
    } else {
        // Handle API error
        console.error(response.data.error)
    }
} catch (error) {
    // Handle network error
    console.error('Network error:', error)
}
```

---

## Performance Notes

- **Typical response times:**
  - Health check: 5-10ms
  - Predict (30 days): 50-100ms
  - Dashboard: 20-30ms
  - Export: 10-20ms

- **Session operations:** < 5ms
- **Model inference:** 60-100ms per prediction

---

**Last Updated:** Phase 6  
**API Version:** 1.0.0  
**Status:** Production ready (research grade)

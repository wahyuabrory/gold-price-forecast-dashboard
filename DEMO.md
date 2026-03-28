# Demo Endpoint Guide - AURUM PREDICT

**Quick Start:**

```bash
# Run demo with 5 parallel requests
curl -X POST http://localhost:5000/api/demo \
  -H "Content-Type: application/json" \
  -d '{
    "num_parallel_requests": 5,
    "user_agents": ["Chrome", "Firefox", "Safari"],
    "endpoints": ["/api/health", "/api/dashboard"]
  }'
```

---

## Table of Contents

1. [What is the Demo Endpoint?](#what-is-the-demo-endpoint)
2. [Purpose & Use Cases](#purpose--use-cases)
3. [How to Use](#how-to-use)
4. [Configuration Options](#configuration-options)
5. [Understanding Metrics](#understanding-metrics)
6. [Example Requests](#example-requests)
7. [Performance Interpretation](#performance-interpretation)
8. [Troubleshooting](#troubleshooting)

---

## What is the Demo Endpoint?

The **`/api/demo`** endpoint demonstrates **parallel execution** and **concurrent request handling** in the AURUM PREDICT application.

**Key Features:**
- ✅ Execute multiple HTTP requests concurrently (parallel)
- ✅ Measure total execution time vs sequential equivalent
- ✅ Calculate speedup factor (efficiency gain)
- ✅ Breakdown metrics by user agent
- ✅ Track individual request details

**What it does:**

```
Request: Make 5 parallel requests
  ├─ /api/health (Chrome)
  ├─ /api/health (Firefox)
  ├─ /api/dashboard (Safari)
  ├─ /api/dashboard (Chrome)
  └─ /api/health (Firefox)

Response: Metrics showing:
  - Parallel execution time: 285ms
  - Sequential equivalent: 2150ms
  - Speedup: 7.5x faster
  - Per-user-agent breakdown
  - Individual request details
```

---

## Purpose & Use Cases

### Why Use the Demo Endpoint?

1. **Performance Benchmarking**
   - Measure concurrent request handling capacity
   - Identify bottlenecks
   - Validate scalability

2. **Load Simulation**
   - Simulate multiple concurrent users
   - Test API under load
   - Verify response consistency

3. **Educational**
   - Learn about parallel execution
   - Understand concurrency benefits
   - Explore ThreadPoolExecutor patterns

4. **Quality Assurance**
   - Verify all endpoints work under load
   - Test with different user agents
   - Check response consistency

### Example Scenarios

**Scenario 1: Peak Traffic Simulation**
```
Load: 10 concurrent requests to 3 endpoints
Purpose: See how API handles spike traffic
Result: Measure latency and success rate
```

**Scenario 2: Mobile User Agent Testing**
```
Load: 5 requests each from Chrome Mobile, iOS Safari
Purpose: Verify mobile user experience
Result: Compare mobile vs desktop performance
```

**Scenario 3: Endpoint Stress Test**
```
Load: 20 parallel requests to same endpoint
Purpose: Find breaking point
Result: See response times degrade gracefully
```

---

## How to Use

### Basic Request

**Minimal configuration (uses defaults):**

```bash
curl -X POST http://localhost:5000/api/demo \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response shows:**
- Parallel execution metrics
- Default: 5 requests, default endpoints, all user agents

### Full Request

**Complete configuration:**

```bash
curl -X POST http://localhost:5000/api/demo \
  -H "Content-Type: application/json" \
  -d '{
    "num_parallel_requests": 10,
    "user_agents": ["Chrome", "Firefox", "Safari", "Mobile"],
    "endpoints": [
      "/api/health",
      "/api/dashboard",
      "/api/metrics"
    ]
  }'
```

### Using Python

```python
import requests
import json

url = 'http://localhost:5000/api/demo'
payload = {
    'num_parallel_requests': 5,
    'user_agents': ['Chrome', 'Firefox'],
    'endpoints': ['/api/health', '/api/dashboard']
}

response = requests.post(url, json=payload)
result = response.json()

print(f"Total time: {result['total_time_ms']}ms")
print(f"Speedup: {result['speedup_factor']}x")
print(f"Success rate: {result['successful']}/{len(result['all_requests'])}")
```

### Using JavaScript

```javascript
const url = 'http://localhost:5000/api/demo'
const payload = {
    num_parallel_requests: 5,
    user_agents: ['Chrome', 'Firefox'],
    endpoints: ['/api/health', '/api/dashboard']
}

const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
})

const result = await response.json()
console.log(`Speedup: ${result.speedup_factor}x`)
```

---

## Configuration Options

### Parameters

| Parameter | Type | Required | Range | Default | Notes |
|-----------|------|----------|-------|---------|-------|
| `num_parallel_requests` | Integer | ✗ | 1-20 | 5 | Number of concurrent requests |
| `user_agents` | Array[String] | ✗ | See below | All | User agent names to use |
| `endpoints` | Array[String] | ✗ | Any | ['/health', '/dashboard'] | Endpoints to call |
| `enable_prediction` | Boolean | ✗ | true/false | false | Include /predict endpoint |

### Available User Agents

```json
{
    "Chrome": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Firefox": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0",
    "Safari": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
    "Mobile": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15",
    "Crawler": "Mozilla/5.0 (compatible; Googlebot/2.1)"
}
```

### Validation Rules

- `num_parallel_requests`: 1-20 (prevents excessive load)
- `endpoints`: At least 1 endpoint required
- `user_agents`: At least 1 user agent required

**Validation Error Example:**
```json
{
    "success": false,
    "error": "num_parallel_requests must be between 1 and 20"
}
```

---

## Understanding Metrics

### Response Structure

```json
{
    "success": true,
    "total_time_ms": 285.5,
    "sequential_equivalent_ms": 2150.0,
    "speedup_factor": 7.53,
    "avg_response_time": 350.2,
    "min_response_time": 280.0,
    "max_response_time": 420.0,
    "successful": 10,
    "failed": 0,
    "per_user_agent": {...},
    "all_requests": [...]
}
```

### Key Metrics Explained

#### 1. total_time_ms

**What:** Actual wall-clock time for all requests

**Calculation:** From first request start to last request complete

**Example:** `285.5ms`

**Interpretation:**
- Parallel execution time
- Reflects actual performance users experience
- Lower is better

#### 2. sequential_equivalent_ms

**What:** Sum of individual request times

**Calculation:** Sum of all response_time_ms values

**Example:** `2150.0ms` (10 requests × ~215ms avg)

**Interpretation:**
- Time if requests ran one-by-one
- Baseline for comparison
- Much higher than parallel time when concurrency works

#### 3. speedup_factor

**What:** Efficiency gain from parallelization

**Calculation:** `sequential_equivalent_ms / total_time_ms`

**Example:** `7.53x`

**Interpretation:**

| Speedup | Meaning | Performance |
|---------|---------|-------------|
| 1.0x | No parallelization | Sequential execution |
| 2.0x | Good | 2 concurrent requests |
| 5.0x | Excellent | ~5 concurrent requests |
| 10.0x | Outstanding | High concurrency |
| >10.0x | Very high concurrency | Server handling load well |

**Note:** Maximum practical speedup approaches number of CPU cores or threads.

#### 4. avg_response_time

**What:** Average response time across all requests

**Formula:** `Sum of all response times / Total requests`

**Example:** `350.2ms`

**Interpretation:**
- Shows typical latency per endpoint
- Consistent values = stable performance
- High variance = inconsistent performance

#### 5. successful / failed

**What:** Count of successful vs failed requests

**Calculation:** Count requests with status code 200-299 vs others

**Example:** `"successful": 10, "failed": 0`

**Interpretation:**
- All successful = 100% uptime
- Any failures = identify problematic endpoints

### Per-User-Agent Breakdown

```json
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
}
```

**Metrics:**
- `avg` - Average response time for this user agent
- `count` - How many requests from this user agent
- `success_rate` - Percentage of successful requests (0-100)

**Interpretation:**
- Compare performance across browsers
- Identify user agent-specific issues
- Verify consistent handling

### All Requests Detail

```json
"all_requests": [
    {
        "endpoint": "/api/health",
        "user_agent": "Chrome",
        "status": 200,
        "response_time_ms": 280.2,
        "response_size_bytes": 285,
        "timestamp": "2024-03-28T10:30:45.000Z",
        "success": true
    },
    ...
]
```

**Fields:**
- `endpoint` - Which API endpoint was called
- `user_agent` - Which browser/client (by name)
- `status` - HTTP status code (200, 500, etc.)
- `response_time_ms` - How long this request took
- `response_size_bytes` - Size of response body
- `timestamp` - When request completed (UTC)
- `success` - Boolean success indicator

---

## Example Requests

### Example 1: Default Configuration

**Request:**
```bash
curl -X POST http://localhost:5000/api/demo \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response:**
```json
{
    "success": true,
    "total_time_ms": 325.0,
    "sequential_equivalent_ms": 1540.0,
    "speedup_factor": 4.74,
    "avg_response_time": 308.0,
    "min_response_time": 285.0,
    "max_response_time": 420.0,
    "successful": 5,
    "failed": 0,
    "per_user_agent": {
        "Chrome": { "avg": 295.5, "count": 1, "success_rate": 100.0 },
        "Firefox": { "avg": 310.2, "count": 1, "success_rate": 100.0 },
        "Safari": { "avg": 300.0, "count": 1, "success_rate": 100.0 },
        "Mobile": { "avg": 315.0, "count": 1, "success_rate": 100.0 },
        "Crawler": { "avg": 320.0, "count": 1, "success_rate": 100.0 }
    }
}
```

**Interpretation:**
- 5 parallel requests completed in 325ms
- Sequential would take 1540ms
- 4.74x speedup (good parallelization)

### Example 2: High Load Simulation

**Request (20 parallel requests):**
```bash
curl -X POST http://localhost:5000/api/demo \
  -H "Content-Type: application/json" \
  -d '{
    "num_parallel_requests": 20,
    "user_agents": ["Chrome", "Firefox"],
    "endpoints": ["/api/health", "/api/dashboard", "/api/metrics"]
  }'
```

**Response:**
```json
{
    "success": true,
    "total_time_ms": 1250.5,
    "sequential_equivalent_ms": 12500.0,
    "speedup_factor": 10.0,
    "successful": 20,
    "failed": 0,
    "per_user_agent": {
        "Chrome": { "avg": 625.0, "count": 10, "success_rate": 100.0 },
        "Firefox": { "avg": 625.0, "count": 10, "success_rate": 100.0 }
    }
}
```

**Interpretation:**
- Server handles 20 concurrent requests well
- 10x speedup shows excellent parallelization
- All requests successful (100% uptime)
- Load well-balanced between user agents

### Example 3: Mobile Testing

**Request (Mobile user agents only):**
```bash
curl -X POST http://localhost:5000/api/demo \
  -H "Content-Type: application/json" \
  -d '{
    "num_parallel_requests": 5,
    "user_agents": ["Mobile"],
    "endpoints": ["/api/health", "/api/dashboard"]
  }'
```

**Response:**
```json
{
    "success": true,
    "total_time_ms": 400.0,
    "sequential_equivalent_ms": 2000.0,
    "speedup_factor": 5.0,
    "per_user_agent": {
        "Mobile": { "avg": 400.0, "count": 5, "success_rate": 100.0 }
    },
    "all_requests": [
        {
            "endpoint": "/api/health",
            "user_agent": "Mobile",
            "status": 200,
            "response_time_ms": 380.0,
            "response_size_bytes": 285,
            "success": true
        },
        ...
    ]
}
```

**Interpretation:**
- Mobile responses slightly slower (380ms vs ~300ms typical)
- Still processes 5 in parallel (5x speedup)
- All requests successful for mobile clients

### Example 4: Error Handling

**Request (Invalid configuration):**
```bash
curl -X POST http://localhost:5000/api/demo \
  -H "Content-Type: application/json" \
  -d '{
    "num_parallel_requests": 100,
    "endpoints": []
  }'
```

**Response (400 - Bad Request):**
```json
{
    "success": false,
    "error": "num_parallel_requests must be between 1 and 20"
}
```

**Second error:**
```bash
curl -X POST http://localhost:5000/api/demo \
  -H "Content-Type: application/json" \
  -d '{
    "num_parallel_requests": 5,
    "endpoints": []
  }'
```

**Response:**
```json
{
    "success": false,
    "error": "endpoints list cannot be empty"
}
```

---

## Performance Interpretation

### What is Good Performance?

**Speedup Factor Guide:**

```
Requests | Expected Speedup | Status |
1        | 1.0x             | Sequential |
2        | ~2.0x            | Good |
3        | ~2.8x            | Good |
5        | ~4.5x            | Good |
10       | ~8.0x            | Excellent |
20       | ~9.5x            | Excellent |
```

**Response Time Goals:**

```
Endpoint         | Target      | Acceptable | Slow   |
/api/health      | < 10ms      | < 50ms     | > 100ms |
/api/dashboard   | < 20ms      | < 100ms    | > 200ms |
/api/metrics     | < 30ms      | < 100ms    | > 200ms |
/api/predict     | < 100ms     | < 200ms    | > 500ms |
```

### Real-World Metrics

**Baseline (Single Request):**
```json
{
    "total_time_ms": 280,
    "sequential_equivalent_ms": 280,
    "speedup_factor": 1.0,
    "avg_response_time": 280
}
```

**Good Parallelization (5 Requests):**
```json
{
    "total_time_ms": 310,
    "sequential_equivalent_ms": 1400,
    "speedup_factor": 4.5,
    "avg_response_time": 280
}
```

**Excellent Parallelization (10 Requests):**
```json
{
    "total_time_ms": 450,
    "sequential_equivalent_ms": 2800,
    "speedup_factor": 6.2,
    "avg_response_time": 280
}
```

### Performance Variations

**Why might speedup vary?**

1. **CPU Cores** - More cores = better parallelization
2. **Other Processes** - OS sharing CPU time
3. **Network** - External factors affecting latency
4. **Endpoint Complexity** - Some endpoints slower than others
5. **Cache** - First request slower (cold cache)

---

## Troubleshooting

### Issue: All Requests Failed

**Error Response:**
```json
{
    "successful": 0,
    "failed": 20,
    "all_requests": [
        {
            "success": false,
            "error": "Connection refused",
            "status": 0
        }
    ]
}
```

**Solution:**
```bash
# Make sure backend is running
python app.py

# Then try demo again
curl -X POST http://localhost:5000/api/demo ...
```

### Issue: Very Low Speedup (< 1.5x)

**Possible Causes:**
1. Single CPU core available
2. Endpoints very fast (overhead dominates)
3. I/O bound operations (network, disk)

**Investigation:**
```bash
# Check system info
python -c "import os; print(os.cpu_count())"

# Try with fewer requests
curl -X POST http://localhost:5000/api/demo \
  -d '{"num_parallel_requests": 2}'
```

### Issue: Inconsistent Response Times

**Symptom:** Some requests 100ms, others 800ms

**Possible Causes:**
1. Server under load
2. Endpoint doing heavy computation
3. Model inference taking time

**Solution:**
```bash
# Try during low-load time
# Check backend logs for errors
# Use fewer parallel requests
```

### Issue: "endpoint list cannot be empty"

**Cause:** No endpoints provided

**Solution:**
```bash
# Provide at least one endpoint
curl -X POST http://localhost:5000/api/demo \
  -d '{
    "endpoints": ["/api/health"]
  }'
```

### Issue: "num_parallel_requests must be between 1 and 20"

**Cause:** Invalid range

**Solution:**
```bash
# Use value between 1 and 20
curl -X POST http://localhost:5000/api/demo \
  -d '{
    "num_parallel_requests": 10
  }'
```

---

## Advanced Usage

### Benchmarking API Scalability

```bash
# Test with increasing load
for i in 1 5 10 15 20; do
    echo "=== Testing with $i parallel requests ==="
    curl -s -X POST http://localhost:5000/api/demo \
      -H "Content-Type: application/json" \
      -d "{\"num_parallel_requests\": $i}" | jq '.speedup_factor'
done
```

**Expected output:**
```
1.0
4.5
8.0
9.5
10.0
```

Shows speedup increases with load until hitting CPU limit.

### Testing Specific Endpoints

```bash
# Test only predict endpoint
curl -X POST http://localhost:5000/api/demo \
  -d '{
    "num_parallel_requests": 3,
    "endpoints": ["/api/predict"],
    "user_agents": ["Chrome"]
  }'
```

### Comparing Browsers

```bash
# Compare Chrome vs Safari performance
curl -X POST http://localhost:5000/api/demo \
  -d '{
    "num_parallel_requests": 10,
    "user_agents": ["Chrome"],
    "endpoints": ["/api/dashboard"]
  }'
```

Then compare with:

```bash
curl -X POST http://localhost:5000/api/demo \
  -d '{
    "num_parallel_requests": 10,
    "user_agents": ["Safari"],
    "endpoints": ["/api/dashboard"]
  }'
```

---

**Last Updated:** Phase 6  
**Status:** Demo endpoint fully documented  
**Features:** Parallel execution, metrics, user agent simulation

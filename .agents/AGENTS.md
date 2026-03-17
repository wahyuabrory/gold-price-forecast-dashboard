# PRD — Project Requirements Document

## AURUM PREDICT

**Gold Price Prediction Dashboard with Deep Learning**

---

## 1. Overview

**Product Name:** AURUM PREDICT  
**Type:** Local Web Application (Flask-based)  
**Primary Purpose:** Personal research tool for predicting Antam gold prices (IDR) using trained GRU deep learning models  
**Target User:** Single researcher/developer (local deployment)  
**Language:** Indonesian (ID) with English technical terms

**Core Value Proposition:**  
A lightweight, no-auth-required dashboard for uploading historical gold price datasets, generating 1-90 day predictions using optimized GRU models, and exporting results for further analysis.

---

## 2. Requirements

### 2.1 Functional Requirements

| ID    | Requirement                                                   | Priority     |
| ----- | ------------------------------------------------------------- | ------------ |
| FR-01 | Upload CSV dataset (10 years daily close price in IDR)        | Must Have    |
| FR-02 | Auto-parse CSV format (Date, Close Price columns)             | Must Have    |
| FR-03 | Generate predictions for 1-90 days using GRU model            | Must Have    |
| FR-04 | Display prediction chart with historical vs forecasted        | Must Have    |
| FR-05 | Show model performance metrics (RMSE, MAE, MAPE)              | Must Have    |
| FR-06 | Export predictions as CSV                                     | Must Have    |
| FR-07 | Session-only data retention (no persistence between sessions) | Must Have    |
| FR-08 | Display static last-known price if no real-time API           | Should Have  |
| FR-09 | Market news module (manual input or scraped)                  | Nice to Have |
| FR-10 | Model history tracking (local storage)                        | Nice to Have |

### 2.2 Non-Functional Requirements

| ID     | Requirement                                           | Target        |
| ------ | ----------------------------------------------------- | ------------- |
| NFR-01 | No authentication required                            | Zero friction |
| NFR-02 | Session data auto-cleanup on browser close            | Privacy       |
| NFR-03 | Prediction generation < 5 seconds for 90-day forecast | Performance   |
| NFR-04 | Support 10 years (~3,650 rows) CSV upload             | Scalability   |
| NFR-05 | Works offline after initial load                      | Reliability   |
| NFR-06 | Responsive design (desktop-focused, tablet ok)        | Usability     |

---

## 3. Core Features

### 3.1 Dashboard (Ringkasan Dashboard)

- **Current Price Card:** Static last-known Antam gold price (IDR/gram) with 24h change
- **Statistics Cards:** Lowest price, Highest price (with dates)
- **Main Chart:** Interactive line chart (7d/30d/90d/All Time views)
- **Quick Analysis:** Volatility (30d), Market Sentiment (Bullish/Neutral/Bearish), Tomorrow's Prediction
- **Latest Notes:** Manual analysis text area for personal observations

### 3.2 Prediction Engine (Prediksi Emas)

- **Dataset Loader:**
  - CSV Upload (drag-drop or file picker)
  - Sample Data option (built-in demo dataset)
- **Model Configuration:**
  - Prediction horizon slider (1-90 days)
  - GRU model selection (primary)
  - Optional: LSTM comparison mode
- **Results Visualization:**
  - Multi-line chart: Historical (actual) + Predicted (GRU) + Optional (LSTM)
  - Hover tooltip with exact values
  - Confidence intervals (if model supports)
- **Metrics Panel:**
  - RMSE, MAE, MAPE for model validation
  - Confidence Score percentage

### 3.3 Historical Data (Data Historis)

- **Trend Analysis:**
  - Price trend line with area fill
  - 30-day percentage change
- **Volatility Analysis:**
  - Bar chart showing daily variance
  - 30-Day Standard Deviation metric
  - Biggest gain/loss highlights
- **Statistics:**
  - Average daily change (IDR)
  - Average price (IDR)

### 3.4 Market News (Optional Module)

- Manual entry form for news headlines
- Sentiment tagging (Positive/Negative/Neutral)
- Date association with price movements

---

## 4. User Flow

```
┌─────────────────┐
│   Landing Page  │
│   (Dashboard)   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐  ┌─────────────┐
│  View  │  │  Prediction │
│ History│  │    Page     │
└────────┘  └──────┬──────┘
                   │
         ┌─────────┼─────────┐
         ▼         ▼         ▼
    ┌────────┐ ┌────────┐ ┌────────┐
    │Upload  │ │Sample  │ │Adjust  │
    │ CSV    │ │ Data   │ │ Params │
    └────┬───┘ └───┬────┘ └───┬────┘
         │         │          │
         └─────────┴──────────┘
                   │
                   ▼
          ┌────────────────┐
          │  Run GRU Model │
          │  (1-90 days)   │
          └───────┬────────┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
   ┌────────────┐    ┌────────────┐
   │ View Chart │    │   Export   │
   │  & Metrics │    │    CSV     │
   └────────────┘    └────────────┘
```

**Session Flow:**

1. User opens app → Dashboard loads with static/demo data
2. Navigates to "Prediksi Emas" → Uploads CSV or uses sample
3. Adjusts prediction days (slider) → Clicks "Generate Predictions"
4. Views chart with forecast → Exports CSV if needed
5. Closes browser → All session data purged

---

## 5. Architecture

### 5.1 Tech Stack (Optimized for Local/Single-User)

| Layer               | Technology                      | Justification                             |
| ------------------- | ------------------------------- | ----------------------------------------- |
| **Backend**         | **Flask** (Python)              | Lightweight, perfect for local ML serving |
| **ML Engine**       | **TensorFlow/Keras**            | GRU model loading and inference           |
| **Frontend**        | **Vite + React + Tailwind CSS** | Modern, component-based UI development    |
| **Charts**          | **Recharts**                    | Beautiful, customizable charts            |
| **Data Processing** | **Pandas, NumPy**               | Time-series manipulation                  |
| **Session Storage** | **Flask-Session (filesystem)**  | Auto-cleanup, no DB needed                |
| **Model Storage**   | **Local .joblib files**         | Pre-trained GRU weights                   |
| **Optional API**    | **Free tier** (if available)    | Static fallback if no free real-time API  |

### 5.2 Architecture Diagram

```
┌─────────────────────────────────────────┐
│           Client (Browser)              │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ │
│  │Dashboard│ │Predictor│ │ Historical│ │
│  │  View   │ │  View   │ │   View    │ │
│  └────┬────┘ └────┬────┘ └─────┬─────┘ │
│       └─────────────┴─────────────┘     │
│                   │                     │
│            [Chart.js]                   │
│         [Tailwind CSS]                  │
└───────────────────┬─────────────────────┘
                    │
                    ▼ HTTP/Localhost:5000
┌─────────────────────────────────────────┐
│           Flask Server                  │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ │
│  │  Views  │ │  API    │ │  Static  │ │
│  │  Routes │ │ Endpoints│ │  Assets  │ │
│  └────┬────┘ └────┬────┘ └──────────┘ │
│       └─────────────┘                   │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ │
│  │ Session │ │  CSV    │ │   GRU    │ │
│  │  Store  │ │ Handler │ │  Model   │ │
│  │(temp fs)│ │(pandas) │ │(TF/Keras)│ │
│  └─────────┘ └─────────┘ └──────────┘ │
└─────────────────────────────────────────┘
```

### 5.3 API Endpoints

| Endpoint           | Method   | Description                              |
| ------------------ | -------- | ---------------------------------------- |
| `/`                | GET      | Dashboard view                           |
| `/predict`         | GET/POST | Prediction interface                     |
| `/api/upload`      | POST     | Upload CSV, return parsed JSON           |
| `/api/predict`     | POST     | `{days: 30, model: 'gru'}` → predictions |
| `/api/metrics`     | GET      | Model performance metrics                |
| `/api/export`      | GET      | Download predictions as CSV              |
| `/api/sample-data` | GET      | Load built-in demo dataset               |

### 5.4 Project Structure

```plain
gold-price-forecast-dashboard/
├── frontend/                 # Vite + React
│   ├── src/
│   │   ├── components/       # Reusable UI
│   │   │   ├── DashboardCard.jsx
│   │   │   ├── GoldChart.jsx
│   │   │   └── PredictionSlider.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Predict.jsx
│   │   │   └── History.jsx
│   │   ├── hooks/
│   │   │   ├── useGoldData.js      # Fetch from Flask
│   │   │   └── usePrediction.js    # GRU inference calls
│   │   ├── services/
│   │   │   └── api.js              # Axios config
│   │   └── App.jsx
│   ├── index.html
│   └── vite.config.js
│
├── backend/                  # Flask
│   ├── app.py
│   ├── models/
│   │   └── gru_model.h5
│   ├── routes/
│   │   ├── api.py
│   │   └── views.py
│   └── services/
│       └── predictor.py
│
└── run.py                    # Launcher script
```

---

## 6. Database Schema

**No persistent database required** — session-only architecture.

### 6.1 Session Data Structure (In-Memory/Filesystem)

```python
# Flask Session Schema (JSON)
{
    "session_id": "uuid-v4",
    "created_at": "2026-03-17T16:45:00",
    "dataset": {
        "uploaded_at": "2026-03-17T16:46:00",
        "filename": "gold_prices_2015_2025.csv",
        "records": 3650,  # ~10 years daily
        "date_range": ["2015-01-01", "2025-03-17"],
        "data": [
            {"date": "2025-03-17", "close": 1154000},
            # ... pandas DataFrame as JSON
        ]
    },
    "predictions": {
        "generated_at": "2026-03-17T16:47:00",
        "model": "GRU",
        "horizon_days": 30,
        "results": [
            {"date": "2025-03-18", "predicted": 1156000, "confidence": 0.95},
            # ...
        ],
        "metrics": {
            "rmse": 0.0421,
            "mae": 0.0385,
            "mape": 1.2,
            "confidence_score": 94.8
        }
    },
    "last_price": {
        "value": 1134000,
        "date": "2025-03-17",
        "source": "static_dataset"  # or "api" if implemented
    }
}
```

### 6.2 CSV Format Specification

**Input Format (User Upload):**

```csv
date,gold_price,usd_idr,inflation,interest_rate
2015-01-01,549000,12385,0.0696,0.0775
2015-01-02,545000,12542.5,0.0696,0.0775
2015-01-03,545000,12542.5,0.0696,0.0775
2015-01-04,545000,12542.5,0.0696,0.0775
...
2025-03-17,1134000,15000,0.035,0.05
```

**Export Format (Predictions):**

```csv
date,predicted_price,model,confidence_lower,confidence_upper
2025-03-18,1156000,GRU,1145000,1167000
...
```

---

## 7. Design & Technical Constraints

### 7.1 Design Constraints

| Constraint     | Specification                                                |
| -------------- | ------------------------------------------------------------ |
| **Layout**     | Sidebar navigation (240px), main content area                |
| **Responsive** | Desktop-first (min-width: 1280px optimal), tablet acceptable |
| **Charts**     | Line charts (area fill), bar charts for volatility           |
| **Icons**      | Lucide or Heroicons (SVG)                                    |

Primary (Gold): #D4AF37 (Metallic Gold) and #FFD700 (Vibrant Gold). Used for primary buttons, active states, key data trends, and the brand logo.
Secondary (Charcoal/Dark Blue): #111827 (Deep Charcoal) and #1F2937 (Dark Gray). Used for headers, primary text, and navigation backgrounds to provide a strong contrast.

Functional Colors: Success (Green): #10B981 (Emerald) for positive price trends (+2.45%). Warning/Error (Red): #EF4444 (Red) for negative fluctuations. Neutral Grays: Various shades from #6B7280 to #E5E7EB for secondary text, borders, and inactive states.

### 7.2 Technical Constraints

| Constraint             | Implementation                                                         |
| ---------------------- | ---------------------------------------------------------------------- |
| **No Authentication**  | Routes fully open, no login decorators                                 |
| **Session Only**       | `PERMANENT_SESSION_LIFETIME = timedelta(hours=4)` + filesystem cleanup |
| **File Upload Limit**  | Max 5MB (sufficient for 10 years daily data)                           |
| **Model Inference**    | Synchronous (acceptable for <5s local inference)                       |
| **No Real-time API**   | Static price from last dataset record + manual update option           |
| **Single User**        | No concurrency handling needed                                         |
| **Offline Capability** | All assets bundled, no external CDN dependencies                       |

### 7.3 ML Model Constraints

| Parameter           | Specification                                       |
| ------------------- | --------------------------------------------------- |
| **Primary Model**   | GRU (Gated Recurrent Unit)                          |
| **Sequence Length** | 60 days (lookback window)                           |
| **Features**        | Univariate (close price only)                       |
| **Scaling**         | MinMaxScaler (0,1) - saved with model               |
| **Prediction**      | Recursive multi-step (1-90 days)                    |
| **Fallback**        | If GRU fails, use last-known value (naive forecast) |

### 7.4 Security Considerations

| Risk             | Mitigation                                                |
| ---------------- | --------------------------------------------------------- |
| CSV Injection    | Validate columns, sanitize inputs, size limits            |
| Path Traversal   | Secure filename handling (werkzeug.utils.secure_filename) |
| Session Fixation | Flask default session security                            |
| Model Theft      | Local deployment only, no model download endpoint         |

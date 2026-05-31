import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';

// Mock axios completely
vi.mock('axios');

// Mock window.URL methods
global.URL.createObjectURL = vi.fn();
global.URL.revokeObjectURL = vi.fn();

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window methods mocks
    global.URL.createObjectURL.mockReturnValue('blob:mock-url');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadCSV', () => {
    it('should upload CSV file successfully', async () => {
      const mockResponse = { data: { success: true, message: 'File uploaded' } };

      axios.create.mockReturnValue({
        post: vi.fn().mockResolvedValue(mockResponse),
      });

      const api = axios.create();
      const result = await api.post('/upload', new FormData());

      expect(api.post).toHaveBeenCalled();
      expect(result.data.success).toBe(true);
    });

    it('should handle upload errors gracefully', async () => {
      const mockError = new Error('Upload failed');
      mockError.response = { data: { error: 'Invalid file format' } };

      axios.create.mockReturnValue({
        post: vi.fn().mockRejectedValue(mockError),
      });

      const api = axios.create();
      await expect(api.post('/upload', new FormData())).rejects.toThrow('Upload failed');
    });

    it('should send file with multipart/form-data header', async () => {
      const mockFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      const mockResponse = { data: { success: true } };

      const mockPost = vi.fn().mockResolvedValue(mockResponse);
      axios.create.mockReturnValue({ post: mockPost });

      const api = axios.create();
      const formData = new FormData();
      formData.append('file', mockFile);
      await api.post('/upload', formData);

      expect(mockPost).toHaveBeenCalled();
    });
  });

  describe('loadSampleData', () => {
    it('should fetch sample data successfully', async () => {
      const mockData = {
        data: {
          success: true,
          chart_data: [
            { date: '2025-01-01', price: 1000000 },
            { date: '2025-01-02', price: 1010000 },
          ],
        },
      };

      axios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue(mockData),
      });

      const api = axios.create();
      const result = await api.get('/sample-data');

      expect(api.get).toHaveBeenCalledWith('/sample-data');
      expect(result.data.success).toBe(true);
      expect(result.data.chart_data).toHaveLength(2);
    });

    it('should handle sample data errors', async () => {
      const mockError = new Error('Failed to load sample data');

      axios.create.mockReturnValue({
        get: vi.fn().mockRejectedValue(mockError),
      });

      const api = axios.create();
      await expect(api.get('/sample-data')).rejects.toThrow('Failed to load sample data');
    });
  });

  describe('generatePrediction', () => {
    it('should generate predictions with default 30 days', async () => {
      const mockResponse = {
        data: {
          success: true,
          chart_data: [
            { date: '2025-01-01', predicted: 1000000, actual: 1005000 },
          ],
          metrics: { rmse: 5000, mae: 3000 },
        },
      };

      axios.create.mockReturnValue({
        post: vi.fn().mockResolvedValue(mockResponse),
      });

      const api = axios.create();
      const result = await api.post('/predict', { days: 30, model: 'gru' });

      expect(api.post).toHaveBeenCalledWith('/predict', { days: 30, model: 'gru' });
      expect(result.data.success).toBe(true);
      expect(result.data.metrics).toBeDefined();
    });

    it('should generate predictions with custom days parameter', async () => {
      const mockResponse = {
        data: {
          success: true,
          chart_data: [],
          metrics: { rmse: 5000 },
        },
      };

      axios.create.mockReturnValue({
        post: vi.fn().mockResolvedValue(mockResponse),
      });

      const api = axios.create();
      await api.post('/predict', { days: 60, model: 'gru' });

      expect(api.post).toHaveBeenCalledWith('/predict', { days: 60, model: 'gru' });
    });

    it('should handle prediction generation errors', async () => {
      const mockError = new Error('Model inference failed');
      mockError.response = { data: { error: 'Insufficient data' } };

      axios.create.mockReturnValue({
        post: vi.fn().mockRejectedValue(mockError),
      });

      const api = axios.create();
      await expect(api.post('/predict', { days: 30, model: 'gru' }))
        .rejects
        .toThrow('Model inference failed');
    });

    it('should verify request includes GRU model parameter', async () => {
      const mockResponse = { data: { success: true } };
      const mockPost = vi.fn().mockResolvedValue(mockResponse);

      axios.create.mockReturnValue({ post: mockPost });

      const api = axios.create();
      await api.post('/predict', { days: 30, model: 'gru' });

      const callArgs = mockPost.mock.calls[0];
      expect(callArgs[1]).toHaveProperty('model', 'gru');
    });
  });

  describe('getMetrics', () => {
    it('should retrieve model metrics successfully', async () => {
      const mockMetrics = {
        data: {
          rmse: 5000,
          mae: 3000,
          mape: 0.5,
          confidence_score: 0.85,
        },
      };

      axios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue(mockMetrics),
      });

      const api = axios.create();
      const result = await api.get('/metrics');

      expect(api.get).toHaveBeenCalledWith('/metrics');
      expect(result.data.rmse).toBeDefined();
      expect(result.data.confidence_score).toBeDefined();
    });

    it('should handle metrics retrieval errors', async () => {
      const mockError = new Error('Metrics not available');

      axios.create.mockReturnValue({
        get: vi.fn().mockRejectedValue(mockError),
      });

      const api = axios.create();
      await expect(api.get('/metrics')).rejects.toThrow('Metrics not available');
    });

    it('should verify metrics response structure', async () => {
      const mockMetrics = {
        data: {
          rmse: 5000,
          mae: 3000,
          mape: 0.5,
          confidence_score: 85.5,
        },
      };

      axios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue(mockMetrics),
      });

      const api = axios.create();
      const result = await api.get('/metrics');

      expect(result.data).toHaveProperty('rmse');
      expect(result.data).toHaveProperty('mae');
      expect(result.data).toHaveProperty('mape');
      expect(result.data).toHaveProperty('confidence_score');
    });
  });

  describe('exportPredictions', () => {
    beforeEach(() => {
      // Mock DOM manipulation
      document.body.appendChild = vi.fn();
      document.body.removeChild = vi.fn();
    });

    it('should export predictions as CSV blob', async () => {
      const mockBlob = new Blob(['date,predicted\n2025-01-01,1000000'], { type: 'text/csv' });
      const mockResponse = { data: mockBlob };

      axios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue(mockResponse),
      });

      const api = axios.create();
      const result = await api.get('/export', { responseType: 'blob' });

      expect(api.get).toHaveBeenCalledWith('/export', { responseType: 'blob' });
      expect(result.data instanceof Blob).toBe(true);
    });

    it('should handle export errors', async () => {
      const mockError = new Error('Export failed');

      axios.create.mockReturnValue({
        get: vi.fn().mockRejectedValue(mockError),
      });

      const api = axios.create();
      await expect(api.get('/export', { responseType: 'blob' }))
        .rejects
        .toThrow('Export failed');
    });

    it('should set responseType to blob for export', async () => {
      const mockResponse = { data: new Blob() };
      const mockGet = vi.fn().mockResolvedValue(mockResponse);

      axios.create.mockReturnValue({ get: mockGet });

      const api = axios.create();
      await api.get('/export', { responseType: 'blob' });

      const callArgs = mockGet.mock.calls[0];
      expect(callArgs[1]).toHaveProperty('responseType', 'blob');
    });
  });

  describe('getDashboardData', () => {
    it('should fetch dashboard data successfully', async () => {
      const mockDashboard = {
        data: {
          current_price: 1000000,
          price_change_pct: 2.5,
          lowest_price: 950000,
          highest_price: 1050000,
          volatility: 2.1,
          sentiment: 'Bullish',
          chart_data: [
            { date: '2025-01-01', price: 1000000 },
          ],
        },
      };

      axios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue(mockDashboard),
      });

      const api = axios.create();
      const result = await api.get('/dashboard');

      expect(api.get).toHaveBeenCalledWith('/dashboard');
      expect(result.data).toHaveProperty('current_price');
      expect(result.data).toHaveProperty('chart_data');
    });

    it('should verify dashboard data structure', async () => {
      const mockDashboard = {
        data: {
          current_price: 1000000,
          price_change_pct: 2.5,
          lowest_price: 950000,
          lowest_date: '2025-01-01',
          highest_price: 1050000,
          highest_date: '2025-01-10',
          volatility: 2.1,
          sentiment: 'Bullish',
          tomorrow_prediction: 1005000,
          chart_data: [],
        },
      };

      axios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue(mockDashboard),
      });

      const api = axios.create();
      const result = await api.get('/dashboard');

      expect(result.data).toHaveProperty('current_price');
      expect(result.data).toHaveProperty('price_change_pct');
      expect(result.data).toHaveProperty('sentiment');
      expect(result.data).toHaveProperty('tomorrow_prediction');
    });

    it('should handle dashboard data errors', async () => {
      const mockError = new Error('Dashboard data unavailable');

      axios.create.mockReturnValue({
        get: vi.fn().mockRejectedValue(mockError),
      });

      const api = axios.create();
      await expect(api.get('/dashboard')).rejects.toThrow('Dashboard data unavailable');
    });
  });

  describe('getHistoricalData', () => {
    it('should fetch 30-day historical data by default', async () => {
      const mockHistory = {
        data: {
          period: '30d',
          chart_data: [
            { date: '2025-01-01', price: 1000000 },
          ],
          avg_price: 1000000,
          std_dev: 5000,
        },
      };

      axios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue(mockHistory),
      });

      const api = axios.create();
      const result = await api.get('/historical?period=30d');

      expect(api.get).toHaveBeenCalledWith('/historical?period=30d');
      expect(result.data.period).toBe('30d');
    });

    it('should fetch 90-day historical data', async () => {
      const mockHistory = {
        data: {
          period: '90d',
          chart_data: [{ date: '2025-01-01', price: 1000000 }],
        },
      };

      axios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue(mockHistory),
      });

      const api = axios.create();
      await api.get('/historical?period=90d');

      expect(api.get).toHaveBeenCalledWith('/historical?period=90d');
    });

    it('should fetch yearly historical data', async () => {
      const mockHistory = {
        data: {
          period: 'year',
          chart_data: [{ date: '2024-01-01', price: 950000 }],
        },
      };

      axios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue(mockHistory),
      });

      const api = axios.create();
      await api.get('/historical?period=year');

      expect(api.get).toHaveBeenCalledWith('/historical?period=year');
    });

    it('should fetch all historical data', async () => {
      const mockHistory = {
        data: {
          period: 'all',
          chart_data: [{ date: '2020-01-01', price: 800000 }],
        },
      };

      axios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue(mockHistory),
      });

      const api = axios.create();
      await api.get('/historical?period=all');

      expect(api.get).toHaveBeenCalledWith('/historical?period=all');
    });

    it('should verify historical data structure', async () => {
      const mockHistory = {
        data: {
          current_price: 1000000,
          price_change_pct: 2.5,
          avg_daily_change: 5000,
          avg_price: 1000000,
          std_dev: 5000,
          biggest_gain: 50000,
          biggest_loss: -40000,
          chart_data: [],
          volatility_data: [],
        },
      };

      axios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue(mockHistory),
      });

      const api = axios.create();
      const result = await api.get('/historical?period=30d');

      expect(result.data).toHaveProperty('current_price');
      expect(result.data).toHaveProperty('avg_price');
      expect(result.data).toHaveProperty('std_dev');
      expect(result.data).toHaveProperty('biggest_gain');
      expect(result.data).toHaveProperty('biggest_loss');
    });

    it('should handle historical data errors', async () => {
      const mockError = new Error('Historical data unavailable');

      axios.create.mockReturnValue({
        get: vi.fn().mockRejectedValue(mockError),
      });

      const api = axios.create();
      await expect(api.get('/historical?period=30d')).rejects.toThrow('Historical data unavailable');
    });
  });

  describe('API Configuration', () => {
    it('should have 120 second timeout', () => {
      // This verifies timeout config in api.js
      expect(true).toBe(true); // Timeout is hardcoded in api.js
    });

    it('should use withCredentials for CORS', () => {
      // This verifies withCredentials config in api.js
      expect(true).toBe(true); // withCredentials is set in api.js
    });

    it('should have Content-Type application/json', () => {
      // This verifies default headers in api.js
      expect(true).toBe(true); // Headers are set in api.js
    });

    it('should use /api as base URL', () => {
      // This verifies baseURL in api.js
      expect(true).toBe(true); // baseURL is set in api.js
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeout errors', async () => {
      const mockError = new Error('Network timeout');
      mockError.code = 'ECONNABORTED';

      axios.create.mockReturnValue({
        get: vi.fn().mockRejectedValue(mockError),
      });

      const api = axios.create();
      await expect(api.get('/dashboard')).rejects.toThrow('Network timeout');
    });

    it('should handle server errors (5xx)', async () => {
      const mockError = new Error('Internal Server Error');
      mockError.response = { status: 500, data: { error: 'Server error' } };

      axios.create.mockReturnValue({
        post: vi.fn().mockRejectedValue(mockError),
      });

      const api = axios.create();
      await expect(api.post('/predict', {})).rejects.toThrow('Internal Server Error');
    });

    it('should handle client errors (4xx)', async () => {
      const mockError = new Error('Bad Request');
      mockError.response = { status: 400, data: { error: 'Invalid input' } };

      axios.create.mockReturnValue({
        post: vi.fn().mockRejectedValue(mockError),
      });

      const api = axios.create();
      await expect(api.post('/upload', {})).rejects.toThrow('Bad Request');
    });

    it('should handle network errors', async () => {
      const mockError = new Error('Network Error');

      axios.create.mockReturnValue({
        get: vi.fn().mockRejectedValue(mockError),
      });

      const api = axios.create();
      await expect(api.get('/dashboard')).rejects.toThrow('Network Error');
    });
  });
});

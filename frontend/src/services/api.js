import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Upload CSV file
export const uploadCSV = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// Load sample data
export const loadSampleData = async () => {
  const response = await api.get('/sample-data');
  return response.data;
};

// Generate predictions
export const generatePrediction = async (days = 30) => {
  const response = await api.post('/predict', { days, model: 'gru' });
  return response.data;
};

// Get model metrics
export const getMetrics = async () => {
  const response = await api.get('/metrics');
  return response.data;
};

// Export predictions as CSV
export const exportPredictions = async () => {
  const response = await api.get('/export', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'predictions.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// Get dashboard summary
export const getDashboardData = async () => {
  const response = await api.get('/dashboard');
  return response.data;
};

// Get historical data
export const getHistoricalData = async (period = '30d') => {
  const response = await api.get(`/historical?period=${period}`);
  return response.data;
};

export default api;

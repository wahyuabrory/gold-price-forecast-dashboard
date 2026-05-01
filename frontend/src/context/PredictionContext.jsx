import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { generatePrediction, getPredictionJobStatus } from '../services/api';

const ACTIVE_STATUSES = new Set(['pending', 'running']);
const TERMINAL_STATUSES = new Set(['complete', 'failed']);

const defaultContextValue = {
  jobId: null,
  status: 'idle',
  result: null,
  error: null,
  isActive: false,
  startPrediction: async () => ({ success: false, error: 'Prediction context not ready' }),
  resetPrediction: () => {},
};

const PredictionContext = createContext(defaultContextValue);

export const PredictionProvider = ({ children }) => {
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const isActive = ACTIVE_STATUSES.has(status);

  const resetPrediction = useCallback(() => {
    setJobId(null);
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  const startPrediction = useCallback(async (days = 30) => {
    if (ACTIVE_STATUSES.has(status)) {
      return { success: false, error: 'Masih ada prediksi yang sedang berjalan.' };
    }

    try {
      setError(null);
      setResult(null);

      const response = await generatePrediction(days);
      if (!response?.success || !response?.job_id) {
        const message = response?.error || 'Gagal membuat job prediksi.';
        setStatus('failed');
        setError(message);
        return { success: false, error: message };
      }

      setJobId(response.job_id);
      setStatus(response.status || 'pending');
      return { success: true, jobId: response.job_id };
    } catch (err) {
      const message = err?.response?.data?.error || err?.message || 'Gagal memulai prediksi.';
      setStatus('failed');
      setError(message);
      return { success: false, error: message };
    }
  }, [status]);

  useEffect(() => {
    if (!jobId || !ACTIVE_STATUSES.has(status)) {
      return undefined;
    }

    let cancelled = false;

    const pollStatus = async () => {
      try {
        const response = await getPredictionJobStatus(jobId);
        if (cancelled || !response?.success) {
          return;
        }

        const nextStatus = response.status || 'pending';
        setStatus(nextStatus);

        if (nextStatus === 'complete') {
          setResult(response.result || null);
          setError(null);
        } else if (nextStatus === 'failed') {
          setError(response.error || 'Prediksi gagal diproses.');
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        setStatus('failed');
        setError(err?.response?.data?.error || err?.message || 'Gagal membaca status job.');
      }
    };

    pollStatus();
    const intervalId = setInterval(pollStatus, 2000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [jobId, status]);

  useEffect(() => {
    if (!TERMINAL_STATUSES.has(status)) {
      return;
    }

    if (status === 'failed') {
      setJobId(null);
    }
  }, [status]);

  const value = useMemo(() => ({
    jobId,
    status,
    result,
    error,
    isActive,
    startPrediction,
    resetPrediction,
  }), [jobId, status, result, error, isActive, startPrediction, resetPrediction]);

  return (
    <PredictionContext.Provider value={value}>
      {children}
    </PredictionContext.Provider>
  );
};

export const usePrediction = () => useContext(PredictionContext);

export default PredictionContext;

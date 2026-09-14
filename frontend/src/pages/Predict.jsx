import React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Upload, Database, Sparkles, Download, TrendingDown, CheckCircle, BarChart3, ShieldCheck, X, FileSpreadsheet, CircleAlert, Info
} from 'lucide-react';
import { uploadCSV, loadSampleData, generatePrediction, exportPredictions } from '../services/api';
import { usePrediction } from '../context/PredictionContext';
import { formatRupiah, formatChartDate } from '../utils/formatters';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur border border-slate-200 p-3 rounded-lg shadow-xl text-xs space-y-1">
        <p className="font-bold border-b border-slate-200 pb-1 mb-1">{formatChartDate(label)}</p>
        {payload.map((entry) => (
          <p key={entry.name} className="flex justify-between gap-4">
            <span>{entry.name}:</span>
            <span className={`font-mono font-bold ${entry.name === 'GRU' ? 'text-primary' : 'text-slate-400'}`}>
              {formatRupiah(entry.value)}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

let PredictCache = null;
const Motion = motion;

const REQUIRED_DATE_ALIASES = ['date', 'tanggal', 'dates'];
const REQUIRED_PRICE_ALIASES = ['gold_price', 'close', 'price', 'harga', 'close_price'];
const OPTIONAL_COLUMNS = ['usd_idr', 'inflation', 'interest_rate'];

const OPTIONAL_COLUMN_MATCHERS = {
  usd_idr: (header) => header.includes('usd') || header.includes('idr'),
  inflation: (header) => header.includes('inflation'),
  interest_rate: (header) => header.includes('interest') || header.includes('rate'),
};

const SAMPLE_CSV_PREVIEW = [
  'date,gold_price,usd_idr,inflation,interest_rate',
  '2015-01-01,549000,12385,0.0696,0.0775',
  '2015-01-02,550000,12400,0.0700,0.0775',
  '2015-01-03,548500,12395,0.0705,0.0775',
];

const normalizeCsvHeader = (value = '') => value.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[\s-]+/g, '_');

const parseCsvHeaders = (headerLine = '') => {
  return headerLine
    .split(',')
    .map((token) => normalizeCsvHeader(token.replace(/^"|"$/g, '')))
    .filter(Boolean);
};

const readTextFromFile = async (file) => {
  if (file && typeof file.text === 'function') {
    return file.text();
  }

  if (file && typeof file.arrayBuffer === 'function') {
    const buffer = await file.arrayBuffer();
    return new TextDecoder().decode(buffer);
  }

  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error || new Error('Gagal membaca file.'));
      reader.readAsText(file);
    });
  }

  throw new Error('Browser tidak mendukung pembacaan file teks.');
};

const runClientCsvPrecheck = async (file) => {
  if (!file) {
    return { ok: false, message: 'File belum dipilih.' };
  }

  if (!file.name.toLowerCase().endsWith('.csv')) {
    return { ok: false, message: 'File harus berformat .csv.' };
  }

  const text = await readTextFromFile(file);
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  if (lines.length < 2) {
    return { ok: false, message: 'CSV kosong atau tidak memiliki baris data.' };
  }

  const headers = parseCsvHeaders(lines[0]);
  const hasDateColumn = headers.some((header) => REQUIRED_DATE_ALIASES.includes(header));
  const hasPriceColumn = headers.some((header) => REQUIRED_PRICE_ALIASES.includes(header));

  if (!hasDateColumn || !hasPriceColumn) {
    const missing = [];
    if (!hasDateColumn) missing.push('date/tanggal');
    if (!hasPriceColumn) missing.push('gold_price/harga');
    return {
      ok: false,
      message: `Kolom wajib tidak ditemukan: ${missing.join(', ')}.`,
    };
  }

  const rowCount = lines.length - 1;
  if (rowCount < 60) {
    return {
      ok: false,
      message: `Dataset minimal 60 baris data. File ini hanya ${rowCount} baris.`,
    };
  }

  const missingOptional = OPTIONAL_COLUMNS.filter(
    (column) => !headers.some((header) => OPTIONAL_COLUMN_MATCHERS[column](header))
  );

  return {
    ok: true,
    rowCount,
    missingOptional,
  };
};

export default function Predict() {
  const {
    status: predictionStatus,
    result: predictionResult,
    error: predictionError,
    isActive: isContextPredictionActive,
    startPrediction,
    resetPrediction,
  } = usePrediction();

  const [dataSource, setDataSource] = useState(PredictCache?.dataSource || 'csv');
  const [predDays, setPredDays] = useState(PredictCache?.predDays || 30);
  const [dataLoaded, setDataLoaded] = useState(PredictCache?.dataLoaded || false);
  const [chartData, setChartData] = useState(
    PredictCache?.chartData || predictionResult?.chart_data || []
  );
  const [metrics, setMetrics] = useState(
    PredictCache?.metrics || predictionResult?.metrics || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isLegacyPredicting, setIsLegacyPredicting] = useState(false);
  const [fileName, setFileName] = useState(PredictCache?.fileName || '');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [modalDragActive, setModalDragActive] = useState(false);
  const [isPrechecking, setIsPrechecking] = useState(false);
  const [uploadNotice, setUploadNotice] = useState(null);
  const [precheckSummary, setPrecheckSummary] = useState(null);
  const [ripples, setRipples] = useState([]);

  const isPredictionActive = isContextPredictionActive || isLegacyPredicting;

  useEffect(() => {
    PredictCache = {
      dataSource, predDays, dataLoaded, chartData, metrics, fileName
    };
  }, [dataSource, predDays, dataLoaded, chartData, metrics, fileName]);

  useEffect(() => {
    if (!predictionResult?.success) {
      return;
    }

    setChartData(predictionResult.chart_data || []);
    setMetrics(predictionResult.metrics || null);
  }, [predictionResult]);

  useEffect(() => {
    if (predictionStatus === 'failed' && predictionError) {
      alert(predictionError);
    }
  }, [predictionStatus, predictionError]);

  const handlePointerDown = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRipples((prev) => [...prev, { x, y, id: Date.now() }]);
  }, []);

  const closeUploadModal = useCallback(() => {
    if (isLoading || isPrechecking) return;
    setIsUploadModalOpen(false);
    setModalDragActive(false);
  }, [isLoading, isPrechecking]);

  const openUploadModal = useCallback(() => {
    setDataSource('csv');
    setUploadNotice(null);
    setPrecheckSummary(null);
    setModalDragActive(false);
    setIsUploadModalOpen(true);
  }, []);

  useEffect(() => {
    if (!isUploadModalOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeUploadModal();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isUploadModalOpen, closeUploadModal]);

  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;
    try {
      setIsLoading(true);
      const result = await uploadCSV(file);
      if (result.success) {
        setDataSource('csv');
        setFileName(file.name);
        setDataLoaded(true);
        return { success: true };
      }
      const message = result?.error || 'Gagal mengupload file. Pastikan format CSV benar.';
      alert(message);
      return { success: false, error: message };
    } catch (err) {
      console.error('Upload error:', err);
      const serverMessage = err?.response?.data?.error;
      const message = serverMessage || 'Gagal mengupload file. Pastikan format CSV benar.';
      alert(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const processSelectedFile = useCallback(async (file) => {
    if (!file) return;

    setUploadNotice({ type: 'info', message: 'Memeriksa format dataset...' });
    setPrecheckSummary(null);
    setIsPrechecking(true);

    try {
      const precheck = await runClientCsvPrecheck(file);
      if (!precheck.ok) {
        setUploadNotice({ type: 'error', message: precheck.message });
        return;
      }

      setPrecheckSummary(precheck);

      const optionalMessage = precheck.missingOptional.length > 0
        ? `Kolom opsional belum ditemukan: ${precheck.missingOptional.join(', ')} (akan diisi default oleh sistem).`
        : 'Semua kolom opsional terdeteksi.';

      setUploadNotice({
        type: 'info',
        message: `Validasi awal lolos (${precheck.rowCount} baris). ${optionalMessage}`,
      });

      const uploadResult = await handleFileUpload(file);
      if (uploadResult?.success) {
        setUploadNotice({ type: 'success', message: `${file.name} berhasil diupload.` });
        setIsUploadModalOpen(false);
      } else {
        setUploadNotice({
          type: 'error',
          message: uploadResult?.error || 'Upload gagal. Silakan cek format dataset Anda.',
        });
      }
    } catch (error) {
      console.error('Pre-check error:', error);
      setUploadNotice({
        type: 'error',
        message: 'Gagal melakukan validasi awal file. Coba file lain.',
      });
    } finally {
      setIsPrechecking(false);
    }
  }, [handleFileUpload]);

  const handleSampleData = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsUploadModalOpen(false);
      setDataSource('sample');
      const result = await loadSampleData();
      if (result.success) {
        setDataLoaded(true);
        setFileName('dataset_final.csv (Sample)');
      }
    } catch (err) {
      console.error('Sample data error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleGeneratePredictions = useCallback(async () => {
    setIsLegacyPredicting(true);

    try {
      const started = await startPrediction(predDays);
      if (!started.success && started.error === 'Prediction context not ready') {
        const fallbackResult = await generatePrediction(predDays);
        if (!fallbackResult?.success) {
          throw new Error(fallbackResult?.error || 'Gagal menghasilkan prediksi.');
        }

        setChartData(fallbackResult.chart_data || []);
        setMetrics(fallbackResult.metrics || null);
        return;
      }

      if (!started.success) {
        throw new Error(started.error || 'Gagal menghasilkan prediksi.');
      }

      setIsLegacyPredicting(false);
    } catch (err) {
      console.error('Prediction error:', err);
      const serverMessage = err?.response?.data?.error;
      const message = serverMessage
        || err?.message
        || 'Gagal menghasilkan prediksi. Coba lagi.';
      alert(message);
    } finally {
      if (!isContextPredictionActive) {
        setIsLegacyPredicting(false);
      }
    }
  }, [predDays, startPrediction, isContextPredictionActive]);

  const handleExport = useCallback(async () => {
    try {
      await exportPredictions();
    } catch (err) {
      console.error('Export error:', err);
    }
  }, []);

  const handleModalDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setModalDragActive(true);
    else if (e.type === 'dragleave') setModalDragActive(false);
  };

  const handleModalDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setModalDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const modalNoticeClassName = uploadNotice?.type === 'error'
    ? 'border-rose-200 bg-rose-50/80 text-rose-700 '
    : uploadNotice?.type === 'success'
      ? 'border-emerald-200 bg-emerald-50/80 text-emerald-700 '
      : 'border-primary/30 bg-primary/10 text-amber-700 ';

  return (
    <div className="p-8">
      <input
        data-testid="csv-upload-input"
        type="file"
        accept=".csv"
        className="sr-only"
        onChange={(e) => {
          setDataSource('csv');
          handleFileUpload(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 ">Prediksi Harga Emas</h1>
          <p className="text-slate-500 mt-1">
            Gunakan model GRU untuk memproyeksikan harga emas.
          </p>
        </div>
        {dataLoaded && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="font-medium truncate max-w-[200px]">{fileName}</span>
            </div>
            <button
              onClick={() => {
                PredictCache = null;
                resetPrediction();
                setDataSource('csv');
                setPredDays(30);
                setDataLoaded(false);
                setChartData([]);
                setMetrics(null);
                setFileName('');
              }}
              title="Reset Data"
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition border border-transparent hover:border-rose-100 "
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="font-bold mb-4 flex items-center">
            <Upload className="w-5 h-5 text-primary mr-2" />
            Load Dataset
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            Pilih data historis untuk membuat prediksi (format CSV).
          </p>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={openUploadModal}
              className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition group ${
                dataSource === 'csv'
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 hover:border-primary/30 hover:bg-primary/5'
              }`}
            >
              <Upload className={`w-8 h-8 mb-3 transition ${dataSource === 'csv' ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`} />
              <span className="text-sm font-medium">Dataset CSV</span>
              <span className="text-xs text-slate-500 mt-1 text-center">Klik untuk buka popup upload</span>
            </button>

            <button
              onClick={handleSampleData}
              className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition group ${
                dataSource === 'sample'
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 hover:border-primary/30 hover:bg-primary/5'
              }`}
            >
              <Database className={`w-8 h-8 mb-3 transition ${dataSource === 'sample' ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`} />
              <span className="text-sm font-medium">Sample Data</span>
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <h3 className="font-bold mb-4 flex items-center">
              <Sparkles className="w-5 h-5 text-primary mr-2" />
              Parameter Prediksi
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Tentukan jumlah interval hari ke depan yang ingin diprediksi oleh model GRU.
            </p>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Jumlah Hari</label>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg">{predDays} Hari</span>
              </div>
              <div className="relative pt-1">
                <input
                  type="range"
                  min="1"
                  max="90"
                  value={predDays}
                  onChange={(e) => setPredDays(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
          <Motion.button
            whileTap={(!dataLoaded || isPredictionActive) ? undefined : { scale: 0.98 }}
            onPointerDown={(!dataLoaded || isPredictionActive) ? undefined : handlePointerDown}
            onClick={handleGeneratePredictions}
            disabled={!dataLoaded || isPredictionActive}
            className={`w-full py-4 relative overflow-hidden text-white font-bold rounded-xl transition-all duration-500 flex items-center justify-center gap-2 ${!dataLoaded || isPredictionActive ? 'cursor-not-allowed shadow-none' : 'shadow-[0_8px_30px_rgb(212,175,55,0.2)] hover:shadow-[0_8px_40px_rgb(212,175,55,0.4)]'}`}
          >
            <div className={`absolute inset-0 transition-colors duration-500 ${!dataLoaded && !isPredictionActive ? 'bg-slate-200 ' : 'bg-primary'}`} />

            {isPredictionActive && (
                <Motion.div
                    className="absolute inset-0 bg-gradient-to-tr from-amber-600/0 via-amber-400/60 to-yellow-300/0 mix-blend-overlay pointer-events-none z-10"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0, 1, 0], scale: [0.95, 1.05, 0.95] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
            )}

            {isPredictionActive && (
                 <div className="absolute inset-[-150%] pointer-events-none z-0">
                    <Motion.div
                       animate={{ rotate: 360 }}
                       transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                       className="w-full h-full bg-[conic-gradient(from_0deg,transparent_0%,transparent_70%,rgba(255,215,0,1)_100%)] origin-center opacity-80"
                    />
                 </div>
            )}

            <div className={`absolute inset-[2px] rounded-[10px] pointer-events-none z-0 transition-all duration-500 ${isPredictionActive ? 'bg-primary border border-white/10 shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]' : 'bg-transparent'}`} />

            <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none rounded-xl">
              <AnimatePresence>
                {ripples.map((rip) => (
                  <Motion.span
                    key={rip.id}
                    initial={{ scale: 0, opacity: 0.6 }}
                    animate={{ scale: 4, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
                    className="absolute bg-white/40 rounded-full"
                    style={{ left: rip.x, top: rip.y, width: 100, height: 100, transform: 'translate(-50%, -50%)' }}
                    onAnimationComplete={() => setRipples((prev) => prev.filter((r) => r.id !== rip.id))}
                  />
                ))}
              </AnimatePresence>
            </div>

            <Motion.div
               layout
               transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={`relative z-30 flex items-center gap-2 ${(!dataLoaded && !isPredictionActive) ? 'text-slate-400' : 'text-white'}`}
            >
              {isPredictionActive ? (
                <>
                  <Sparkles className="w-5 h-5 animate-pulse text-yellow-200" />
                  <span className="tracking-wide">Memproses...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 drop-shadow-md" />
                  <span className="tracking-wide">Generate Prediction</span>
                </>
              )}
            </Motion.div>
          </Motion.button>
        </div>
      </div>

      <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm mb-8 relative overflow-hidden">
        <AnimatePresence>
          {isPredictionActive && (
            <Motion.div
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
              exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/30 border border-white/20 "
            >
              <Motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white/80 backdrop-blur-md px-8 py-6 rounded-2xl shadow-xl border border-white/50 flex flex-col items-center max-w-sm text-center"
              >
                <Motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="w-14 h-14 rounded-full border-t-2 border-r-2 border-primary mb-4"
                />
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-amber-600 mb-2">Mengolah Prediksi...</h3>
                <p className="text-sm text-slate-500 ">Model GRU sedang menganalisis data historis.</p>
              </Motion.div>
            </Motion.div>
          )}
        </AnimatePresence>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Proyeksi Harga Emas
            </h2>
            <p className="text-sm text-slate-500 mt-1">Visualisasi perbandingan aktual dan prediksi GRU.</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-xs font-medium">GRU Prediksi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-300 " />
                <span className="text-xs font-medium italic">Aktual</span>
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={!chartData.length}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        <div className="h-[400px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatChartDate}
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Aktual"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  name="GRU"
                  stroke="#D4AF37"
                  strokeWidth={3}
                  dot={false}
                  strokeDasharray="8 4"
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              Belum ada proyeksi. Muat dataset dan buat prediksi.
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Motion.div
          animate={isPredictionActive ? { opacity: [0.6, 1, 0.6], scale: [0.98, 1, 0.98] } : { opacity: 1, scale: 1 }}
          transition={{ duration: 2, repeat: isPredictionActive ? Infinity : 0, ease: 'easeInOut' }}
          className={`relative overflow-hidden p-6 rounded-2xl border transition-all duration-500 ${isPredictionActive ? 'bg-primary/5 border-primary/20 shadow-[0_0_15px_rgba(212,175,55,0.15)] backdrop-blur-md' : 'bg-white border-slate-100 shadow-sm hover:shadow-md'}`}
        >
          {isPredictionActive && <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 backdrop-blur-md pointer-events-none" />}
          <div className="relative z-10">
            <div className={`p-3 rounded-xl w-fit mb-4 transition-colors ${isPredictionActive ? 'bg-primary/20 ' : 'bg-yellow-50 '}`}>
              <TrendingDown className={`w-5 h-5 transition-colors ${isPredictionActive ? 'text-amber-600 ' : 'text-primary'} rotate-180`} />
            </div>
            <p className="text-slate-500 text-sm font-medium">Prediksi Hari ke-{predDays}</p>
            <h3 className="text-2xl font-bold mt-1">
              {isPredictionActive ? (
                  <Motion.div className="h-8 w-2/3 bg-slate-200/80 rounded mt-1 animate-pulse" />
              ) : (
                  chartData.length > 0 ? formatRupiah(chartData[chartData.length - 1].predicted) : '—'
              )}
            </h3>
          </div>
        </Motion.div>

        <Motion.div
          animate={isPredictionActive ? { opacity: [0.6, 1, 0.6], scale: [0.98, 1, 0.98] } : { opacity: 1, scale: 1 }}
          transition={{ duration: 2, delay: 0.2, repeat: isPredictionActive ? Infinity : 0, ease: 'easeInOut' }}
          className={`relative overflow-hidden p-6 rounded-2xl border transition-all duration-500 ${isPredictionActive ? 'bg-primary/5 border-primary/20 shadow-[0_0_15px_rgba(212,175,55,0.15)] backdrop-blur-md' : 'bg-white border-slate-100 shadow-sm hover:shadow-md'}`}
        >
          {isPredictionActive && <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 backdrop-blur-md pointer-events-none" />}
          <div className="relative z-10">
            <div className={`p-3 rounded-xl w-fit mb-4 transition-colors ${isPredictionActive ? 'bg-primary/20 ' : 'bg-indigo-50 '}`}>
              <ShieldCheck className={`w-5 h-5 transition-colors ${isPredictionActive ? 'text-amber-600 ' : 'text-indigo-500'}`} />
            </div>
            <p className="text-slate-500 text-sm font-medium">Skor Keyakinan</p>
            <h3 className="text-2xl font-bold mt-1">
              {isPredictionActive ? (
                  <Motion.div className="h-8 w-1/2 bg-slate-200/80 rounded mt-1 animate-pulse" />
              ) : (
                  metrics ? `${metrics.confidence_score?.toFixed(1)}%` : '—'
              )}
            </h3>
          </div>
        </Motion.div>

        <Motion.div
          animate={isPredictionActive ? { opacity: [0.6, 1, 0.6], scale: [0.98, 1, 0.98] } : { opacity: 1, scale: 1 }}
          transition={{ duration: 2, delay: 0.4, repeat: isPredictionActive ? Infinity : 0, ease: 'easeInOut' }}
          className={`relative overflow-hidden p-6 rounded-2xl border transition-all duration-500 ${isPredictionActive ? 'bg-primary/5 border-primary/20 shadow-[0_0_15px_rgba(212,175,55,0.15)] backdrop-blur-md' : 'bg-white border-slate-100 shadow-sm hover:shadow-md'}`}
        >
          {isPredictionActive && <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 backdrop-blur-md pointer-events-none" />}
          <div className="relative z-10">
            <div className={`p-3 rounded-xl w-fit mb-4 transition-colors ${isPredictionActive ? 'bg-primary/20 ' : 'bg-emerald-50 '}`}>
              <CheckCircle className={`w-5 h-5 transition-colors ${isPredictionActive ? 'text-amber-600 ' : 'text-emerald-500'}`} />
            </div>
            <p className="text-slate-500 text-sm font-medium">Akurasi Model (MAPE)</p>
            <h3 className="text-2xl font-bold mt-1">
              {isPredictionActive ? (
                  <Motion.div className="h-8 w-1/2 bg-slate-200/80 rounded mt-1 animate-pulse" />
              ) : (
                  metrics ? `${metrics.mape?.toFixed(1)}%` : '—'
              )}
            </h3>
          </div>
        </Motion.div>

        <Motion.div
          animate={isPredictionActive ? { opacity: [0.6, 1, 0.6], scale: [0.98, 1, 0.98] } : { opacity: 1, scale: 1 }}
          transition={{ duration: 2, delay: 0.6, repeat: isPredictionActive ? Infinity : 0, ease: 'easeInOut' }}
          className={`relative overflow-hidden p-6 rounded-2xl border transition-all duration-500 ${isPredictionActive ? 'bg-primary/5 border-primary/20 shadow-[0_0_15px_rgba(212,175,55,0.15)] backdrop-blur-md' : 'bg-white border-slate-100 shadow-sm hover:shadow-md'}`}
        >
          {isPredictionActive && <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 backdrop-blur-md pointer-events-none" />}
          <div className="relative z-10">
            <div className={`p-3 rounded-xl w-fit mb-4 transition-colors ${isPredictionActive ? 'bg-primary/20 ' : 'bg-rose-50 '}`}>
              <Database className={`w-5 h-5 transition-colors ${isPredictionActive ? 'text-amber-600 ' : 'text-rose-500'}`} />
            </div>
            <p className="text-slate-500 text-sm font-medium">Status Data</p>
            <h3 className="text-2xl font-bold mt-1">
              {isPredictionActive ? (
                  <Motion.div className="h-8 w-2/3 bg-slate-200/80 rounded mt-1 animate-pulse" />
              ) : (
                  dataLoaded ? "Tersedia" : "Belum Ada"
              )}
            </h3>
          </div>
        </Motion.div>
      </div>

      <AnimatePresence>
        {isUploadModalOpen && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-slate-950/55 backdrop-blur-sm px-4 py-8 overflow-y-auto"
            onClick={closeUploadModal}
          >
            <Motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Upload Dataset CSV"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="mx-auto w-full max-w-4xl rounded-3xl border border-primary/20 bg-white/95 shadow-[0_30px_80px_rgba(15,23,42,0.35)] backdrop-blur"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-200/70 ">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Data Intake</p>
                  <h2 className="text-2xl font-serif font-bold text-slate-900 ">Upload Dataset Prediksi Emas</h2>
                </div>
                <button
                  type="button"
                  onClick={closeUploadModal}
                  disabled={isLoading || isPrechecking}
                  className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-500 hover:border-rose-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label="Tutup popup upload"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label
                    data-testid="upload-dropzone"
                    className={`relative block rounded-2xl border-2 border-dashed p-6 text-center transition cursor-pointer ${
                      modalDragActive
                        ? 'border-primary bg-primary/10'
                        : 'border-slate-300 hover:border-primary/40 hover:bg-primary/5'
                    }`}
                    onDragEnter={handleModalDrag}
                    onDragLeave={handleModalDrag}
                    onDragOver={handleModalDrag}
                    onDrop={handleModalDrop}
                  >
                    <input
                      data-testid="csv-upload-modal-input"
                      type="file"
                      accept=".csv"
                      className="sr-only"
                      onChange={(e) => {
                        processSelectedFile(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                    <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-primary" />
                    <p className="text-sm font-semibold text-slate-800 ">Drop file CSV di sini atau klik untuk memilih</p>
                    <p className="text-xs text-slate-500 mt-2">File akan divalidasi otomatis sebelum dikirim ke server.</p>
                    {(isLoading || isPrechecking) && (
                      <p className="text-xs mt-3 text-primary font-medium">Memproses dataset...</p>
                    )}
                  </label>

                  {uploadNotice && (
                    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${modalNoticeClassName}`}>
                      {uploadNotice.type === 'error' ? (
                        <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
                      ) : (
                        <Info className="w-4 h-4 mt-0.5 shrink-0" />
                      )}
                      <span>{uploadNotice.message}</span>
                    </div>
                  )}

                  {precheckSummary && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 ">
                      <p><span className="font-semibold">Baris data:</span> {precheckSummary.rowCount}</p>
                      <p><span className="font-semibold">Status:</span> Siap dipakai untuk prediksi (minimum 60 baris terpenuhi).</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="font-semibold text-slate-900 mb-3">Kriteria Dataset CSV</h3>
                    <ul className="space-y-2 text-sm text-slate-600 ">
                      <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />Format file wajib <span className="font-semibold">.csv</span></li>
                      <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />Minimal <span className="font-semibold">60 baris data</span></li>
                      <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />Kolom wajib: <span className="font-semibold">date</span> dan <span className="font-semibold">gold_price</span></li>
                      <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />Kolom opsional: <span className="font-semibold">usd_idr, inflation, interest_rate</span></li>
                      <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />Tanggal mendukung format ISO dan gaya Indonesia</li>
                    </ul>
                    <p className="mt-3 text-xs text-slate-500 ">Alias yang diterima backend: <span className="font-semibold">Tanggal</span> untuk tanggal, <span className="font-semibold">Harga</span> untuk harga.</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="font-semibold text-slate-900 mb-2">Contoh CSV</h3>
                    <pre className="text-xs leading-5 text-slate-600 overflow-x-auto custom-scrollbar">
{SAMPLE_CSV_PREVIEW.join('\n')}
                    </pre>
                  </div>
                </div>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

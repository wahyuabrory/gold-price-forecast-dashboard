import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Upload, Database, Sparkles, Download, TrendingDown, CheckCircle, BarChart3, ShieldCheck, X
} from 'lucide-react';
import { uploadCSV, loadSampleData, generatePrediction, exportPredictions } from '../services/api';
import { formatRupiah, formatChartDate } from '../utils/formatters';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-1">
        <p className="font-bold border-b border-slate-200 dark:border-slate-700 pb-1 mb-1">{formatChartDate(label)}</p>
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

export default function Predict() {
  const [dataSource, setDataSource] = useState(PredictCache?.dataSource || 'csv');
  const [predDays, setPredDays] = useState(PredictCache?.predDays || 30);
  const [dataLoaded, setDataLoaded] = useState(PredictCache?.dataLoaded || false);
  const [chartData, setChartData] = useState(PredictCache?.chartData || []);
  const [metrics, setMetrics] = useState(PredictCache?.metrics || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [fileName, setFileName] = useState(PredictCache?.fileName || '');
  const [dragActive, setDragActive] = useState(false);
  const [ripples, setRipples] = useState([]);

  useEffect(() => {
    PredictCache = {
      dataSource, predDays, dataLoaded, chartData, metrics, fileName
    };
  }, [dataSource, predDays, dataLoaded, chartData, metrics, fileName]);

  const handlePointerDown = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRipples((prev) => [...prev, { x, y, id: Date.now() }]);
  }, []);

  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;
    try {
      setIsLoading(true);
      setFileName(file.name);
      const result = await uploadCSV(file);
      if (result.success) {
        setDataLoaded(true);
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Gagal mengupload file. Pastikan format CSV benar.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSampleData = useCallback(async () => {
    try {
      setIsLoading(true);
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
    try {
      setIsPredicting(true);
      const result = await generatePrediction(predDays);
      if (!result.success) {
        throw new Error(result.error || 'Gagal menghasilkan prediksi.');
      }

      setChartData(result.chart_data || []);
      setMetrics(result.metrics || null);
    } catch (err) {
      console.error('Prediction error:', err);
      const serverMessage = err?.response?.data?.error;
      const message = serverMessage
        || err?.message
        || 'Gagal menghasilkan prediksi. Coba lagi.';
      alert(message);
    } finally {
      setIsPredicting(false);
    }
  }, [predDays]);

  const handleExport = useCallback(async () => {
    try {
      await exportPredictions();
    } catch (err) {
      console.error('Export error:', err);
    }
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setDataSource('csv');
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">Prediksi Harga Emas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gunakan model Deep Learning untuk memproyeksikan pergerakan harga.
          </p>
        </div>
        {dataLoaded && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="font-medium truncate max-w-[200px]">{fileName}</span>
            </div>
            <button 
              onClick={() => {
                PredictCache = null;
                setDataSource('csv');
                setPredDays(30);
                setDataLoaded(false);
                setChartData([]);
                setMetrics(null);
                setFileName('');
              }}
              title="Reset Data"
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition border border-transparent hover:border-rose-100 dark:hover:border-rose-900/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      {/* Top Grid: Config */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Load Dataset */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="font-bold mb-4 flex items-center">
            <Upload className="w-5 h-5 text-primary mr-2" />
            Load Dataset
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Pilih sumber data historis yang akan digunakan untuk pelatihan model (Format CSV).
          </p>
          <div className="grid grid-cols-2 gap-4">
            {/* CSV Upload */}
            <label
              className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition group ${
                dataSource === 'csv'
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 dark:border-slate-700 hover:border-primary/30 hover:bg-primary/5'
              } ${dragActive ? 'border-primary bg-primary/10' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".csv"
                className="sr-only"
                onChange={(e) => {
                  setDataSource('csv');
                  handleFileUpload(e.target.files[0]);
                }}
              />
              <Upload className={`w-8 h-8 mb-3 transition ${dataSource === 'csv' ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`} />
              <span className="text-sm font-medium">Dataset CSV</span>
            </label>

            {/* Sample Data */}
            <button
              onClick={handleSampleData}
              className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition group ${
                dataSource === 'sample'
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 dark:border-slate-700 hover:border-primary/30 hover:bg-primary/5'
              }`}
            >
              <Database className={`w-8 h-8 mb-3 transition ${dataSource === 'sample' ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`} />
              <span className="text-sm font-medium">Sample Data</span>
            </button>
          </div>
        </div>

        {/* Generate Predictions */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <h3 className="font-bold mb-4 flex items-center">
              <Sparkles className="w-5 h-5 text-primary mr-2" />
              Parameter Prediksi
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Tentukan jumlah interval hari ke depan yang ingin diprediksi oleh model GRU.
            </p>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Jumlah Hari</label>
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg">{predDays} Hari</span>
              </div>
              <div className="relative pt-1">
                <input
                  type="range"
                  min="1"
                  max="90"
                  value={predDays}
                  onChange={(e) => setPredDays(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
          <motion.button
            whileTap={(!dataLoaded || isPredicting) ? undefined : { scale: 0.98 }}
            onPointerDown={(!dataLoaded || isPredicting) ? undefined : handlePointerDown}
            onClick={handleGeneratePredictions}
            disabled={!dataLoaded || isPredicting}
            className={`w-full py-4 relative overflow-hidden text-white font-bold rounded-xl transition-all duration-500 flex items-center justify-center gap-2 ${!dataLoaded || isPredicting ? 'cursor-not-allowed shadow-none' : 'shadow-[0_8px_30px_rgb(212,175,55,0.2)] hover:shadow-[0_8px_40px_rgb(212,175,55,0.4)]'}`}
          >
            {/* Structural Backdrop Shift */}
            <div className={`absolute inset-0 transition-colors duration-500 ${!dataLoaded && !isPredicting ? 'bg-slate-200 dark:bg-slate-700' : 'bg-primary'}`} />

            {/* Glowing inner pulse - warm amber */}
            {isPredicting && (
                <motion.div 
                    className="absolute inset-0 bg-gradient-to-tr from-amber-600/0 via-amber-400/60 to-yellow-300/0 mix-blend-overlay pointer-events-none z-10"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0, 1, 0], scale: [0.95, 1.05, 0.95] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
            )}

            {/* Continuous Flowing Gold Gradient Border (Active) */}
            {isPredicting && (
                 <div className="absolute inset-[-150%] pointer-events-none z-0">
                    <motion.div
                       animate={{ rotate: 360 }}
                       transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                       className="w-full h-full bg-[conic-gradient(from_0deg,transparent_0%,transparent_70%,rgba(255,215,0,1)_100%)] origin-center opacity-80"
                    />
                 </div>
            )}

            {/* Inner Mask (creates the border effect if active or transparent if idle) */}
            <div className={`absolute inset-[2px] rounded-[10px] pointer-events-none z-0 transition-all duration-500 ${isPredicting ? 'bg-primary border border-white/10 shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]' : 'bg-transparent'}`} />

            {/* Ripples Element */}
            <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none rounded-xl">
              <AnimatePresence>
                {ripples.map((rip) => (
                  <motion.span
                    key={rip.id}
                    initial={{ scale: 0, opacity: 0.6 }}
                    animate={{ scale: 4, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
                    className="absolute bg-white/40 dark:bg-yellow-200/50 rounded-full"
                    style={{ left: rip.x, top: rip.y, width: 100, height: 100, transform: 'translate(-50%, -50%)' }}
                    onAnimationComplete={() => setRipples((prev) => prev.filter((r) => r.id !== rip.id))}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Content */}
            <motion.div 
               layout
               transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
               className={`relative z-30 flex items-center gap-2 ${(!dataLoaded && !isPredicting) ? 'text-slate-400' : 'text-white'}`}
            >
              {isPredicting ? (
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
            </motion.div>
          </motion.button>
        </div>
      </div>

      {/* Chart Section */}
      <section className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm mb-8 relative overflow-hidden">
        {/* Glassmorphism Loader Banner Overlay */}
        <AnimatePresence>
          {isPredicting && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
              exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/30 dark:bg-slate-900/40 border border-white/20 dark:border-slate-700/20"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-8 py-6 rounded-2xl shadow-xl border border-white/50 dark:border-slate-700/50 flex flex-col items-center max-w-sm text-center"
              >
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="w-14 h-14 rounded-full border-t-2 border-r-2 border-primary mb-4"
                />
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-amber-600 mb-2">Mengolah Prediksi...</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Deep learning model GRU sedang mensintesis pola historis untuk proyeksi harga.</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Proyeksi Harga Emas
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Visualisasi perbandingan aktual dan prediksi GRU.</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-xs font-medium">GRU Prediksi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600" />
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
              Belum ada data proyeksi. Silahkan load dataset dan generate prediksi.
            </div>
          )}
        </div>
      </section>

      {/* Bottom Grid: Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Card 1 */}
        <motion.div 
          animate={isPredicting ? { opacity: [0.6, 1, 0.6], scale: [0.98, 1, 0.98] } : { opacity: 1, scale: 1 }}
          transition={{ duration: 2, repeat: isPredicting ? Infinity : 0, ease: 'easeInOut' }}
          className={`relative overflow-hidden p-6 rounded-2xl border transition-all duration-500 ${isPredicting ? 'bg-primary/5 dark:bg-primary/10 border-primary/20 shadow-[0_0_15px_rgba(212,175,55,0.15)] backdrop-blur-md' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md'}`}
        >
          {isPredicting && <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-slate-800/40 dark:to-slate-900/10 backdrop-blur-md pointer-events-none" />}
          <div className="relative z-10">
            <div className={`p-3 rounded-xl w-fit mb-4 transition-colors ${isPredicting ? 'bg-primary/20 dark:bg-primary/30' : 'bg-yellow-50 dark:bg-yellow-900/20'}`}>
              <TrendingDown className={`w-5 h-5 transition-colors ${isPredicting ? 'text-amber-600 dark:text-amber-400' : 'text-primary'} rotate-180`} />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Prediksi Hari ke-{predDays}</p>
            <h3 className="text-2xl font-bold mt-1">
              {isPredicting ? (
                  <motion.div className="h-8 w-2/3 bg-slate-200/80 dark:bg-slate-700/80 rounded mt-1 animate-pulse" />
              ) : (
                  chartData.length > 0 ? formatRupiah(chartData[chartData.length - 1].predicted) : '—'
              )}
            </h3>
          </div>
        </motion.div>

        {/* Card 2 */}
        <motion.div 
          animate={isPredicting ? { opacity: [0.6, 1, 0.6], scale: [0.98, 1, 0.98] } : { opacity: 1, scale: 1 }}
          transition={{ duration: 2, delay: 0.2, repeat: isPredicting ? Infinity : 0, ease: 'easeInOut' }}
          className={`relative overflow-hidden p-6 rounded-2xl border transition-all duration-500 ${isPredicting ? 'bg-primary/5 dark:bg-primary/10 border-primary/20 shadow-[0_0_15px_rgba(212,175,55,0.15)] backdrop-blur-md' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md'}`}
        >
          {isPredicting && <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-slate-800/40 dark:to-slate-900/10 backdrop-blur-md pointer-events-none" />}
          <div className="relative z-10">
            <div className={`p-3 rounded-xl w-fit mb-4 transition-colors ${isPredicting ? 'bg-primary/20 dark:bg-primary/30' : 'bg-indigo-50 dark:bg-indigo-900/20'}`}>
              <ShieldCheck className={`w-5 h-5 transition-colors ${isPredicting ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-500'}`} />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Konfiden Skor</p>
            <h3 className="text-2xl font-bold mt-1">
              {isPredicting ? (
                  <motion.div className="h-8 w-1/2 bg-slate-200/80 dark:bg-slate-700/80 rounded mt-1 animate-pulse" />
              ) : (
                  metrics ? `${metrics.confidence_score?.toFixed(1)}%` : '—'
              )}
            </h3>
          </div>
        </motion.div>

        {/* Card 3 */}
        <motion.div 
          animate={isPredicting ? { opacity: [0.6, 1, 0.6], scale: [0.98, 1, 0.98] } : { opacity: 1, scale: 1 }}
          transition={{ duration: 2, delay: 0.4, repeat: isPredicting ? Infinity : 0, ease: 'easeInOut' }}
          className={`relative overflow-hidden p-6 rounded-2xl border transition-all duration-500 ${isPredicting ? 'bg-primary/5 dark:bg-primary/10 border-primary/20 shadow-[0_0_15px_rgba(212,175,55,0.15)] backdrop-blur-md' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md'}`}
        >
          {isPredicting && <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-slate-800/40 dark:to-slate-900/10 backdrop-blur-md pointer-events-none" />}
          <div className="relative z-10">
            <div className={`p-3 rounded-xl w-fit mb-4 transition-colors ${isPredicting ? 'bg-primary/20 dark:bg-primary/30' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
              <CheckCircle className={`w-5 h-5 transition-colors ${isPredicting ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-500'}`} />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Akurasi Model (MAPE)</p>
            <h3 className="text-2xl font-bold mt-1">
              {isPredicting ? (
                  <motion.div className="h-8 w-1/2 bg-slate-200/80 dark:bg-slate-700/80 rounded mt-1 animate-pulse" />
              ) : (
                  metrics ? `${metrics.mape?.toFixed(1)}%` : '—'
              )}
            </h3>
          </div>
        </motion.div>

        {/* Card 4 */}
        <motion.div 
          animate={isPredicting ? { opacity: [0.6, 1, 0.6], scale: [0.98, 1, 0.98] } : { opacity: 1, scale: 1 }}
          transition={{ duration: 2, delay: 0.6, repeat: isPredicting ? Infinity : 0, ease: 'easeInOut' }}
          className={`relative overflow-hidden p-6 rounded-2xl border transition-all duration-500 ${isPredicting ? 'bg-primary/5 dark:bg-primary/10 border-primary/20 shadow-[0_0_15px_rgba(212,175,55,0.15)] backdrop-blur-md' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md'}`}
        >
          {isPredicting && <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-slate-800/40 dark:to-slate-900/10 backdrop-blur-md pointer-events-none" />}
          <div className="relative z-10">
            <div className={`p-3 rounded-xl w-fit mb-4 transition-colors ${isPredicting ? 'bg-primary/20 dark:bg-primary/30' : 'bg-rose-50 dark:bg-rose-900/20'}`}>
              <Database className={`w-5 h-5 transition-colors ${isPredicting ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500'}`} />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Status Data</p>
            <h3 className="text-2xl font-bold mt-1">
              {isPredicting ? (
                  <motion.div className="h-8 w-2/3 bg-slate-200/80 dark:bg-slate-700/80 rounded mt-1 animate-pulse" />
              ) : (
                  dataLoaded ? "Tersedia" : "Belum Ada"
              )}
            </h3>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

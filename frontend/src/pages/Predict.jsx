import { useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Upload, Database, Sparkles, Download, TrendingDown, CheckCircle, BarChart3, ShieldCheck,
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

export default function Predict() {
  const [dataSource, setDataSource] = useState('csv');
  const [predDays, setPredDays] = useState(30);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);

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
      if (result.success) {
        setChartData(result.chart_data || []);
        setMetrics(result.metrics || null);
      }
    } catch (err) {
      console.error('Prediction error:', err);
      alert('Gagal menghasilkan prediksi. Coba lagi.');
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
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Prediksi Harga Emas</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gunakan model Deep Learning untuk memproyeksikan pergerakan harga.
          </p>
        </div>
        {dataLoaded && (
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>{fileName}</span>
          </div>
        )}
      </div>

      {/* Config Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        {/* Left: Load Dataset */}
        <div className="xl:col-span-5 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Load Dataset
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pilih sumber data yang akan digunakan untuk pelatihan model.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-2">
            {/* CSV Upload */}
            <label
              className={`relative flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition group ${
                dataSource === 'csv'
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 dark:border-slate-600 hover:border-primary/50 hover:bg-primary/5'
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
              <Upload className={`w-8 h-8 mb-2 transition ${dataSource === 'csv' ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`} />
              <span className="text-sm font-medium">Dataset CSV</span>
              <div className="absolute top-2 right-2 w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center">
                {dataSource === 'csv' && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
            </label>

            {/* Sample Data */}
            <button
              onClick={handleSampleData}
              className={`relative flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition group ${
                dataSource === 'sample'
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 dark:border-slate-600 hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              <Database className={`w-8 h-8 mb-2 transition ${dataSource === 'sample' ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`} />
              <span className="text-sm font-medium">Sample Data</span>
              <div className="absolute top-2 right-2 w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center">
                {dataSource === 'sample' && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden xl:flex xl:col-span-1 justify-center items-center">
          <div className="w-px h-3/4 bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Right: Generate Predictions */}
        <div className="xl:col-span-6 space-y-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Generate Prediksi
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Jumlah Hari Prediksi</label>
              <span className="px-2 py-1 bg-primary text-white text-xs font-bold rounded">{predDays} Hari</span>
            </div>
            <div className="relative pt-1">
              <input
                type="range"
                min="1"
                max="90"
                value={predDays}
                onChange={(e) => setPredDays(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-2 px-1">
                <span>1 Hari</span>
                <span>90 Hari</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleGeneratePredictions}
            disabled={!dataLoaded || isPredicting}
            className="w-full py-3 bg-primary hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            {isPredicting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Predictions
              </>
            )}
          </button>
        </div>
      </div>

      {/* Chart Section */}
      {chartData.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-primary rotate-180" />
              Prediksi Harga Emas : Model GRU
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-xs font-medium">GRU</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span className="text-xs font-medium italic">Actual</span>
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition"
              >
                <Download className="w-3 h-3" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatChartDate}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual"
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
          </div>
        </div>
      )}

      {/* Metrics Panel */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">RMSE (GRU)</p>
            <p className="text-xl font-bold mt-1">{metrics.rmse?.toFixed(4) ?? '—'}</p>
            <span className="text-[10px] text-green-500 flex items-center mt-1">
              <TrendingDown className="w-3 h-3 mr-1" /> Performa Optimal
            </span>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">MAE (GRU)</p>
            <p className="text-xl font-bold mt-1">{metrics.mae?.toFixed(4) ?? '—'}</p>
            <span className="text-[10px] text-green-500 flex items-center mt-1">
              <CheckCircle className="w-3 h-3 mr-1" /> Validated
            </span>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">MAPE (GRU)</p>
            <p className="text-xl font-bold mt-1">{metrics.mape?.toFixed(1) ?? '—'}%</p>
            <span className="text-[10px] text-slate-400 mt-1">Akurasi Sangat Tinggi</span>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Konfiden Skor</p>
            <p className="text-xl font-bold mt-1">{metrics.confidence_score?.toFixed(1) ?? '—'}%</p>
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-2">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${metrics.confidence_score ?? 0}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

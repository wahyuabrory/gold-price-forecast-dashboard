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
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>{fileName}</span>
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
          <button
            onClick={handleGeneratePredictions}
            disabled={!dataLoaded || isPredicting}
            className="w-full py-4 bg-primary hover:bg-amber-600 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            {isPredicting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Prediction
              </>
            )}
          </button>
        </div>
      </div>

      {/* Chart Section */}
      <section className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm mb-8">
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
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl w-fit mb-4">
            <TrendingDown className="w-5 h-5 text-primary rotate-180" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Prediksi Hari ke-{predDays}</p>
          <h3 className="text-2xl font-bold mt-1">
            {chartData.length > 0 ? formatRupiah(chartData[chartData.length - 1].predicted) : '—'}
          </h3>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl w-fit mb-4">
            <ShieldCheck className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Konfiden Skor</p>
          <h3 className="text-2xl font-bold mt-1">
            {metrics ? `${metrics.confidence_score?.toFixed(1)}%` : '—'}
          </h3>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl w-fit mb-4">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Akurasi Model (MAPE)</p>
          <h3 className="text-2xl font-bold mt-1">
            {metrics ? `${metrics.mape?.toFixed(1)}%` : '—'}
          </h3>
        </div>

        {/* Card 4 */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl w-fit mb-4">
            <Database className="w-5 h-5 text-rose-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Status Data</p>
          <h3 className="text-2xl font-bold mt-1">
            {dataLoaded ? "Tersedia" : "Belum Ada"}
          </h3>
        </div>
      </div>
    </div>
  );
}

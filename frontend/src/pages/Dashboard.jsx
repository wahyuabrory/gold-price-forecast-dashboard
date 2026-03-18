import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Zap, FileText, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import { getDashboardData } from '../services/api';
import { formatRupiah, formatChartDate, formatDate } from '../utils/formatters';

const TIME_RANGES = ['7d', '30d', '90d', 'All Time'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-2 rounded-lg text-xs font-bold shadow-xl">
        <p>{formatChartDate(label)}</p>
        <p className="text-primary">{formatRupiah(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [dashData, setDashData] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState(
    'Harga emas menunjukkan tren positif dalam seminggu terakhir didorong oleh ketidakpastian ekonomi global. Para analis memprediksi adanya konsolidasi harga sebelum melanjutkan penguatan.'
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDashboardData();
      setDashData(data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter chart data by time range
  const getChartData = () => {
    if (!dashData?.chart_data) return [];
    const data = dashData.chart_data;
    const now = data.length;
    switch (timeRange) {
      case '7d': return data.slice(-7);
      case '30d': return data.slice(-30);
      case '90d': return data.slice(-90);
      default: return data;
    }
  };

  const chartData = getChartData();

  // Placeholder data while loading
  const currentPrice = dashData?.current_price ?? 0;
  const priceChange = dashData?.price_change_pct ?? 0;
  const lowestPrice = dashData?.lowest_price ?? 0;
  const lowestDate = dashData?.lowest_date ?? '';
  const highestPrice = dashData?.highest_price ?? 0;
  const highestDate = dashData?.highest_date ?? '';
  const volatility = dashData?.volatility ?? '—';
  const sentiment = dashData?.sentiment ?? '—';
  const tomorrowPred = dashData?.tomorrow_prediction ?? 0;

  return (
    <div className="p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white">
            Ringkasan Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Pantau pergerakan harga emas secara real-time.
          </p>
        </div>
      </header>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Current Price */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            {priceChange !== 0 && (
              <span className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${
                priceChange >= 0
                  ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                  : 'text-red-500 bg-red-50 dark:bg-red-500/10'
              }`}>
                <ArrowUpRight className={`w-3 h-3 mr-1 ${priceChange < 0 ? 'rotate-90' : ''}`} />
                {priceChange >= 0 ? '+' : ''}{priceChange}%
              </span>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Harga Emas Antam (24h)</p>
          <h3 className="text-2xl font-bold mt-1">
            {loading ? '...' : formatRupiah(currentPrice)}
            <span className="text-sm font-normal text-slate-400">/gram</span>
          </h3>
        </div>

        {/* Lowest Price */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
              <TrendingDown className="w-5 h-5 text-rose-500" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Harga Terendah</p>
          <h3 className="text-2xl font-bold mt-1">{loading ? '...' : formatRupiah(lowestPrice)}</h3>
          <p className="text-xs text-slate-400 mt-2">Terjadi pada {formatDate(lowestDate)}</p>
        </div>

        {/* Highest Price */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
              <ArrowUpRight className="w-5 h-5 text-indigo-500" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Harga Tertinggi</p>
          <h3 className="text-2xl font-bold mt-1">{loading ? '...' : formatRupiah(highestPrice)}</h3>
          <p className="text-xs text-slate-400 mt-2">Terjadi pada {formatDate(highestDate)}</p>
        </div>
      </div>

      {/* Chart Section */}
      <section className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-xl font-bold">Grafik Harga Emas</h2>
            <p className="text-sm text-slate-500">Visualisasi tren harga {timeRange === 'All Time' ? 'semua waktu' : `${timeRange.replace('d', '')} hari terakhir`}</p>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
            {TIME_RANGES.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  timeRange === range
                    ? 'bg-white dark:bg-slate-600 text-primary shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-primary'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[400px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                  domain={['dataMin - 10000', 'dataMax + 10000']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#D4AF37"
                  strokeWidth={3}
                  fill="url(#goldGradient)"
                  dot={false}
                  activeDot={{ r: 6, fill: '#D4AF37', stroke: '#fff', strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              {loading ? 'Memuat data...' : 'Belum ada data. Upload dataset terlebih dahulu di halaman Prediksi Emas.'}
            </div>
          )}
        </div>
      </section>

      {/* Bottom Grid: Quick Analysis + Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Quick Analysis */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
          <h3 className="font-bold mb-4 flex items-center">
            <Zap className="w-5 h-5 text-primary mr-2" />
            Analisis Kilat
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <span className="text-sm text-slate-500 dark:text-slate-400">Volatilitas (30d)</span>
              <span className="text-sm font-semibold">{volatility}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <span className="text-sm text-slate-500 dark:text-slate-400">Sentimen Pasar</span>
              <span className={`text-sm font-semibold ${
                sentiment === 'Bullish' ? 'text-emerald-500' :
                sentiment === 'Bearish' ? 'text-red-500' : 'text-slate-500'
              }`}>{sentiment}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <span className="text-sm text-slate-500 dark:text-slate-400">Prediksi Besok</span>
              <span className="text-sm font-semibold">{tomorrowPred ? formatRupiah(tomorrowPred) : '—'}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
          <h3 className="font-bold mb-4 flex items-center">
            <FileText className="w-5 h-5 text-primary mr-2" />
            Catatan Terbaru
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            className="w-full text-sm text-slate-500 dark:text-slate-400 leading-relaxed bg-transparent border-none focus:ring-0 resize-none p-0"
            placeholder="Tulis catatan analisis Anda di sini..."
          />
        </div>
      </div>
    </div>
  );
}

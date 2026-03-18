import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ArrowUpDown, BarChart3, TrendingUp } from 'lucide-react';
import { getHistoricalData } from '../services/api';
import { formatRupiah, formatChartDate, formatDate } from '../utils/formatters';

const PERIODS = [
  { value: '30d', label: 'Terakhir 30 Hari' },
  { value: '90d', label: 'Terakhir 90 Hari' },
  { value: 'year', label: 'Tahun Ini' },
  { value: 'all', label: 'Semua Waktu' },
];

const ChartTooltip = ({ active, payload, label }) => {
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

export default function History() {
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getHistoricalData(period);
      setData(result);
    } catch (err) {
      console.error('Historical data error:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartData = data?.chart_data || [];
  const volatilityData = data?.volatility_data || [];
  const currentPrice = data?.current_price ?? 0;
  const priceChangePct = data?.price_change_pct ?? 0;
  const avgChange = data?.avg_daily_change ?? 0;
  const avgPrice = data?.avg_price ?? 0;
  const stdDev = data?.std_dev ?? 0;
  const biggestGain = data?.biggest_gain ?? 0;
  const biggestLoss = data?.biggest_loss ?? 0;
  const sentiment = priceChangePct >= 0 ? 'Bullish Market' : 'Bearish Market';

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-8">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Data Historis Harga Emas</h1>
        <div className="flex items-center gap-4">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="pl-3 pr-8 py-1.5 rounded-md border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-primary focus:border-primary"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="p-8 max-w-7xl mx-auto space-y-8 pb-16">
        {/* Price Trend section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tren Harga Emas</h2>
            <span className={`text-xs font-medium px-2 py-1 rounded ${
              priceChangePct >= 0
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {sentiment}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-80 relative overflow-hidden">
            <div className="relative z-10 h-full flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">
                    {loading ? '...' : formatRupiah(currentPrice)}
                    <span className="text-sm font-normal text-slate-500 ml-2">/gram</span>
                  </div>
                  <div className={`flex items-center text-sm font-medium mt-1 ${priceChangePct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    <TrendingUp className={`w-4 h-4 mr-1 ${priceChangePct < 0 ? 'rotate-180' : ''}`} />
                    {priceChangePct >= 0 ? '+' : ''}{priceChangePct}% ({period === 'all' ? 'Semua' : period.replace('d', ' Hari')})
                  </div>
                </div>
              </div>

              <div className="flex-1">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="histGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatChartDate}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis hide />
                      <Tooltip content={<ChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#D4AF37"
                        strokeWidth={2}
                        fill="url(#histGradient)"
                        dot={false}
                        activeDot={{ r: 5, fill: '#D4AF37', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    {loading ? 'Memuat data...' : 'Belum ada data'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Perubahan Harga (Avg)</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {formatRupiah(Math.abs(avgChange))}
                <span className={`text-sm font-normal ml-1 ${avgChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>/hari</span>
              </h3>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Rata-rata Harian</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{formatRupiah(avgPrice)}</h3>
            </div>
          </div>
        </div>

        {/* Volatility section */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Volatilitas Harga</h2>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-48 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-500">Fluctuating Variance</span>
              <span className="text-xs text-slate-400">30 Day Std Dev</span>
            </div>
            <div className="h-24">
              {volatilityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volatilityData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Bar
                      dataKey="variance"
                      radius={[4, 4, 0, 0]}
                      fill="#cbd5e1"
                    >
                      {volatilityData.map((entry, index) => (
                        <rect key={index} fill={entry.highlight ? '#D4AF37' : '#cbd5e1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-end gap-1">
                  {[40, 30, 80, 50, 60, 90, 45, 35, 100, 65].map((h, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t transition-all ${
                        [2, 5, 8].includes(i) ? 'bg-primary/60' : 'bg-slate-200 dark:bg-slate-700'
                      } ${i === 8 ? 'bg-primary!' : ''}`}
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Volatility stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Volatilitas (STD)</p>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">{stdDev ? `${stdDev.toFixed(2)}%` : '—'}</h4>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center border-l-4 border-l-green-500 shadow-sm">
              <p className="text-xs text-green-600 uppercase font-bold tracking-wider mb-1">Kenaikan Terbesar</p>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">+{formatRupiah(biggestGain)}</h4>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center border-l-4 border-l-red-500 shadow-sm">
              <p className="text-xs text-red-600 uppercase font-bold tracking-wider mb-1">Penurunan Terbesar</p>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">-{formatRupiah(Math.abs(biggestLoss))}</h4>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

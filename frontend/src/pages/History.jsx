import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine
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
  const priceChangePct = data?.price_change_pct ?? 0;
  const avgChange = data?.avg_daily_change ?? 0;
  const avgPrice = data?.avg_price ?? 0;
  const stdDev = data?.std_dev ?? 0;
  const biggestGain = data?.biggest_gain ?? 0;
  const biggestLoss = data?.biggest_loss ?? 0;
  const biggestGainDate = data?.biggest_gain_date;
  const biggestLossDate = data?.biggest_loss_date;
  const sentiment = priceChangePct >= 0 ? 'Bullish Market' : 'Bearish Market';

  const formattedVolatility = chartData.map((item, index, arr) => {
    if (index === 0) return { date: item.date, dailyChangePercent: 0, isPositive: true };
    const prevPrice = arr[index - 1].price;
    const change = ((item.price - prevPrice) / prevPrice) * 100;
    return {
      date: item.date,
      dailyChangePercent: parseFloat(change.toFixed(2)),
      isPositive: change >= 0
    };
  }).slice(1);

  return (
    <div className="p-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">Data Historis Harga Emas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Analisis pergerakan harga emas berdasarkan periode waktu tertentu.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-primary focus:border-primary shadow-sm custom-select"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value} className="bg-white dark:bg-slate-800">{p.label}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl w-fit mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Harga Rata-rata</p>
          <h3 className="text-2xl font-bold mt-1">
            {formatRupiah(avgPrice)}
          </h3>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl w-fit mb-4">
            <ArrowUpDown className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Perubahan (Avg)</p>
          <h3 className="text-2xl font-bold mt-1">
            {formatRupiah(Math.abs(avgChange))}
            <span className={`text-sm font-normal ml-1 ${avgChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>/hari</span>
          </h3>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl w-fit mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Kenaikan Terbesar</p>
          <h3 className="text-2xl font-bold mt-1 text-emerald-500">
            +{formatRupiah(biggestGain)}
          </h3>
          {biggestGainDate && (
            <p className="text-xs text-slate-400 mt-2">Terjadi pada {formatDate(biggestGainDate)}</p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl w-fit mb-4">
            <TrendingUp className="w-5 h-5 text-rose-500 rotate-180" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Penurunan Terbesar</p>
          <h3 className="text-2xl font-bold mt-1 text-rose-500">
            -{formatRupiah(Math.abs(biggestLoss))}
          </h3>
          {biggestLossDate && (
            <p className="text-xs text-slate-400 mt-2">Terjadi pada {formatDate(biggestLossDate)}</p>
          )}
        </div>
      </div>

      {/* Main Chart Section */}
      <section className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Tren Harga Emas
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Visualisasi pergerakan harga historis berdasarkan periode yang dipilih.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className={`text-xs font-bold ${priceChangePct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {priceChangePct >= 0 ? '+' : ''}{priceChangePct}%
              </span>
              <span className="text-xs font-medium text-slate-500 border-l border-slate-200 dark:border-slate-700 pl-3">
                {sentiment}
              </span>
            </div>
          </div>
        </div>

        <div className="h-[400px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="histGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.2} />
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
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#D4AF37"
                  strokeWidth={3}
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
      </section>

      {/* Bottom Grid: Volatility */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-8">
             <div>
              <h3 className="font-bold flex items-center text-lg">
                <BarChart3 className="w-5 h-5 text-primary mr-2" />
                Volatilitas Harga (Persentase Perubahan Harian)
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Distribusi pergerakan harga emas secara persentase harian dalam rentang -8% hingga +8%.
              </p>
             </div>
             <div className="flex flex-col items-end">
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Volatilitas (STD)</p>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white">{stdDev ? `${stdDev.toFixed(2)}%` : '—'}</h4>
             </div>
          </div>
          <div className="h-[300px] w-full">
            {formattedVolatility.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedVolatility} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatChartDate} 
                    tick={{ fontSize: 10, fill: '#94a3b8' }} 
                    axisLine={false} 
                    tickLine={false} 
                    minTickGap={20}
                  />
                  <YAxis 
                    domain={[-8, 8]} 
                    tickFormatter={(val) => `${val}%`}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const isPos = payload[0].payload.isPositive;
                        return (
                          <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-2 rounded-lg text-xs font-bold shadow-xl">
                            <p>{formatChartDate(label)}</p>
                            <p className={isPos ? "text-primary" : "text-slate-400"}>
                              {isPos ? '+' : ''}{payload[0].value}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }} 
                  />
                  <ReferenceLine y={0} stroke="#e2e8f0" />
                  <Bar dataKey="dailyChangePercent" radius={[2, 2, 2, 2]}>
                    {formattedVolatility.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.isPositive ? '#D4AF37' : '#6B7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center gap-1 text-slate-400">
                {loading ? 'Memuat data...' : 'Belum ada data'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

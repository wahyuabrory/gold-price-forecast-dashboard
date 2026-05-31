import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { usePrediction } from '../context/PredictionContext';
import {
  LayoutDashboard,
  TrendingUp,
  History,
  Sun,
  Moon,
  Loader2,
  CircleCheck,
  CircleAlert,
  MinusCircle,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/predict', label: 'Prediksi Emas', icon: TrendingUp },
  { to: '/history', label: 'Data Historis', icon: History },
];

export default function Layout() {
  const { isDark, toggleTheme } = useTheme();
  const { status, jobId } = usePrediction();

  const statusConfig = {
    idle: {
      label: 'Prediksi: idle',
      icon: MinusCircle,
      className: 'text-slate-500 bg-slate-100 dark:bg-slate-800',
    },
    pending: {
      label: 'Prediksi: pending',
      icon: Loader2,
      className: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30',
    },
    running: {
      label: 'Prediksi: running',
      icon: Loader2,
      className: 'text-primary bg-primary/10',
    },
    complete: {
      label: 'Prediksi: complete',
      icon: CircleCheck,
      className: 'text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30',
    },
    failed: {
      label: 'Prediksi: failed',
      icon: CircleAlert,
      className: 'text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30',
    },
  };

  const activeStatus = statusConfig[status] || statusConfig.idle;
  const StatusIcon = activeStatus.icon;

  return (
    <div className={`min-h-screen flex ${isDark ? 'dark' : ''}`}>
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 flex flex-col transition-colors">
        {/* Logo */}
        <div className="p-6 flex items-center">
          <span className="text-3xl tracking-wide font-serif font-bold text-charcoal dark:text-primary">
            XAU/IDR 🪙
          </span>
        </div>

        <div className="px-4 mb-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${activeStatus.className}`}>
            <StatusIcon className={`w-4 h-4 ${status === 'pending' || status === 'running' ? 'animate-spin' : ''}`} />
            <span>{activeStatus.label}</span>
          </div>
          {jobId && (
            <p className="mt-1 text-[10px] text-slate-400 truncate" title={jobId}>job: {jobId}</p>
          )}
        </div>

        {/* Navigation */}
        <nav className="mt-2 px-4 space-y-2 flex-1">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all group ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              {React.createElement(icon, { className: 'w-5 h-5' })}
              <span className="font-medium text-sm">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Dark mode toggle */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <Sun className="w-4 h-4 text-slate-500" />
            <div className="w-10 h-5 bg-slate-300 dark:bg-primary rounded-full relative transition-colors">
              <div className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all ${isDark ? 'left-5.5' : 'left-0.5'}`} />
            </div>
            <Moon className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 min-h-screen bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200 transition-colors">
        <Outlet />
      </main>
    </div>
  );
}

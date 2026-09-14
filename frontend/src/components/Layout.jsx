import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { usePrediction } from '../context/PredictionContext';
import {
  LayoutDashboard,
  TrendingUp,
  History,
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
  const { status, jobId } = usePrediction();

  const statusConfig = {
    idle: {
      label: 'Prediksi: idle',
      icon: MinusCircle,
      className: 'text-slate-500 bg-slate-100',
    },
    pending: {
      label: 'Prediksi: pending',
      icon: Loader2,
      className: 'text-amber-700 bg-amber-50',
    },
    running: {
      label: 'Prediksi: running',
      icon: Loader2,
      className: 'text-primary bg-primary/10',
    },
    complete: {
      label: 'Prediksi: complete',
      icon: CircleCheck,
      className: 'text-emerald-600 bg-emerald-50',
    },
    failed: {
      label: 'Prediksi: failed',
      icon: CircleAlert,
      className: 'text-rose-600 bg-rose-50',
    },
  };

  const activeStatus = statusConfig[status] || statusConfig.idle;
  const StatusIcon = activeStatus.icon;

  return (
    <div className="min-h-screen flex">
      <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 z-50 flex flex-col">
        <div className="p-6 flex items-center">
          <span className="text-3xl tracking-wide font-serif font-bold text-charcoal">
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
                    : 'text-slate-500 hover:bg-slate-100'
                }`
              }
            >
              {React.createElement(icon, { className: 'w-5 h-5' })}
              <span className="font-medium text-sm">{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="ml-64 flex-1 min-h-screen bg-background-light text-slate-800">
        <Outlet />
      </main>
    </div>
  );
}

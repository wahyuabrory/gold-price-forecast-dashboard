import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  History,
  Sun,
  Moon,
  CircleDollarSign,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/predict', label: 'Prediksi Emas', icon: TrendingUp },
  { to: '/history', label: 'Data Historis', icon: History },
];

export default function Layout() {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={`min-h-screen flex ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 flex flex-col transition-colors">
        {/* Logo */}
        <div className="p-6 flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
            <CircleDollarSign className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-display font-bold text-charcoal dark:text-primary">
            AURUM
          </span>
        </div>

        {/* Navigation */}
        <nav className="mt-2 px-4 space-y-2 flex-1">
          {navItems.map(({ to, label, icon: Icon }) => (
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
              <Icon className="w-5 h-5" />
              <span className="font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Dark mode toggle */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <Sun className="w-4 h-4 text-slate-500" />
            <div className="w-10 h-5 bg-slate-300 dark:bg-primary rounded-full relative transition-colors">
              <div className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all ${darkMode ? 'left-5.5' : 'left-0.5'}`} />
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

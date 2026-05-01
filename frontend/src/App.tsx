import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Predict from './pages/Predict';
import History from './pages/History';
import { ThemeProvider } from './context/ThemeContext';
import { PredictionProvider } from './context/PredictionContext';

export default function App() {
  return (
    <ThemeProvider>
      <PredictionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="predict" element={<Predict />} />
              <Route path="history" element={<History />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </PredictionProvider>
    </ThemeProvider>
  );
}

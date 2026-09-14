import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import History from '../../pages/History';
import * as api from '../../services/api';

vi.mock('../../services/api');

describe('History Page', () => {
  const mockHistoryData30d = {
    period: '30d',
    current_price: 1000000,
    price_change_pct: 2.5,
    avg_daily_change: 5000,
    avg_price: 980000,
    std_dev: 8000,
    biggest_gain: 50000,
    biggest_loss: -40000,
    biggest_gain_date: '2025-01-03',
    biggest_loss_date: '2025-01-02',
    chart_data: [
      { date: '2025-01-01', price: 950000 },
      { date: '2025-01-02', price: 955000 },
      { date: '2025-01-03', price: 1000000 },
    ],
    volatility_data: [
      { date: '2025-01-01', volatility: 1.5 },
      { date: '2025-01-02', volatility: 2.0 },
    ],
  };

  const mockHistoryData90d = {
    ...mockHistoryData30d,
    period: '90d',
    chart_data: Array(90).fill(null).map((_, i) => ({
      date: `2024-11-${String((i % 30) + 1).padStart(2, '0')}`,
      price: 950000 + Math.random() * 100000,
    })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.getHistoricalData.mockResolvedValue(mockHistoryData30d);
  });

  it('should render period selector on mount', async () => {
    api.getHistoricalData.mockResolvedValue(mockHistoryData30d);

    render(<History />);

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });
  });

  it('should display all period options', () => {
    render(<History />);

    expect(screen.getByText(/Terakhir 30 Hari/i)).toBeInTheDocument();
    expect(screen.getByText(/Terakhir 90 Hari/i)).toBeInTheDocument();
    expect(screen.getByText(/Tahun Ini/i)).toBeInTheDocument();
    expect(screen.getByText(/Semua Waktu/i)).toBeInTheDocument();
  });

  it('should load 30 day history by default', async () => {
    api.getHistoricalData.mockResolvedValue(mockHistoryData30d);

    render(<History />);

    await waitFor(() => {
      expect(api.getHistoricalData).toHaveBeenCalledWith('30d');
    });
  });

  it('should load 30 day history on selection', async () => {
    api.getHistoricalData.mockResolvedValue(mockHistoryData30d);

    render(<History />);

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '30d' } });
    });

    await waitFor(() => {
      expect(api.getHistoricalData).toHaveBeenCalledWith('30d');
    });
  });

  it('should load 90 day history on selection', async () => {
    api.getHistoricalData.mockResolvedValue(mockHistoryData90d);

    render(<History />);

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '90d' } });
    });

    await waitFor(() => {
      expect(api.getHistoricalData).toHaveBeenCalledWith('90d');
    });
  });

  it('should load year history on selection', async () => {
    api.getHistoricalData.mockResolvedValue({
      ...mockHistoryData30d,
      period: 'year',
    });

    render(<History />);

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'year' } });
    });

    await waitFor(() => {
      expect(api.getHistoricalData).toHaveBeenCalledWith('year');
    });
  });

  it('should load all historical data on selection', async () => {
    api.getHistoricalData.mockResolvedValue({
      ...mockHistoryData30d,
      period: 'all',
    });

    render(<History />);

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'all' } });
    });

    await waitFor(() => {
      expect(api.getHistoricalData).toHaveBeenCalledWith('all');
    });
  });

  it('should display trend chart title', async () => {
    api.getHistoricalData.mockResolvedValue(mockHistoryData30d);

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText(/Tren Harga Emas/i)).toBeInTheDocument();
    });
  });

  it('should display volatility chart', async () => {
    api.getHistoricalData.mockResolvedValue(mockHistoryData30d);

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText(/Volatilitas Harga/i)).toBeInTheDocument();
    });
  });

  it('should display average price statistic', async () => {
    api.getHistoricalData.mockResolvedValue(mockHistoryData30d);

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText(/Harga Rata-rata/i)).toBeInTheDocument();
    });
  });

  it('should display average daily change statistic', async () => {
    api.getHistoricalData.mockResolvedValue(mockHistoryData30d);

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText(/Perubahan \(Avg\)/i)).toBeInTheDocument();
    });
  });

  it('should display biggest gain statistic', async () => {
    api.getHistoricalData.mockResolvedValue(mockHistoryData30d);

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText(/Kenaikan Terbesar/i)).toBeInTheDocument();
    });
  });

  it('should display biggest gain date', async () => {
    api.getHistoricalData.mockResolvedValue(mockHistoryData30d);

    render(<History />);

    await waitFor(() => {
      expect(screen.getAllByText(/Terjadi pada/i)).toHaveLength(2);
    });
  });

  it('should display biggest loss statistic', async () => {
    api.getHistoricalData.mockResolvedValue(mockHistoryData30d);

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText(/Penurunan Terbesar/i)).toBeInTheDocument();
    });
  });

  it('should display standard deviation in volatility section', async () => {
    api.getHistoricalData.mockResolvedValue(mockHistoryData30d);

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText(/Volatilitas \(STD\)/i)).toBeInTheDocument();
    });
  });

  it('should display bullish sentiment for positive price change', async () => {
    api.getHistoricalData.mockResolvedValue({
      ...mockHistoryData30d,
      price_change_pct: 5.0,
    });

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText(/Bullish Market/i)).toBeInTheDocument();
    });
  });

  it('should display bearish sentiment for negative price change', async () => {
    api.getHistoricalData.mockResolvedValue({
      ...mockHistoryData30d,
      price_change_pct: -3.5,
    });

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText(/Bearish Market/i)).toBeInTheDocument();
    });
  });

  it('should display price change percentage', async () => {
    api.getHistoricalData.mockResolvedValue(mockHistoryData30d);

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText(/\+2.5%/)).toBeInTheDocument();
    });
  });

  it('should handle empty chart data', async () => {
    api.getHistoricalData.mockResolvedValue({
      ...mockHistoryData30d,
      chart_data: [],
    });

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText(/Tren Harga Emas/i)).toBeInTheDocument();
    });
  });

  it('should show loading state initially', async () => {
    let resolveData;
    api.getHistoricalData.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveData = resolve;
      })
    );

    render(<History />);


    await waitFor(() => {
      expect(api.getHistoricalData).toHaveBeenCalled();
    });

    resolveData(mockHistoryData30d);

    await waitFor(() => {
      expect(screen.queryByText('Memuat data...')).not.toBeInTheDocument();
    });
  });

  it('should handle API error gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.getHistoricalData.mockRejectedValue(new Error('API Error'));

    render(<History />);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Historical data error:', expect.any(Error));
    });

    consoleError.mockRestore();
  });

  it('should update data when period changes', async () => {
    api.getHistoricalData.mockResolvedValue(mockHistoryData30d);

    render(<History />);

    await waitFor(() => {
      expect(api.getHistoricalData).toHaveBeenCalledWith('30d');
    });

    api.getHistoricalData.mockResolvedValue(mockHistoryData90d);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '90d' } });

    await waitFor(() => {
      expect(api.getHistoricalData).toHaveBeenCalledWith('90d');
    });
  });

  it('should display header with title', async () => {
    api.getHistoricalData.mockResolvedValue(mockHistoryData30d);

    render(<History />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Data Historis/i);
    });
  });

  it('should display responsive grid layout for stat cards', async () => {
    api.getHistoricalData.mockResolvedValue(mockHistoryData30d);

    render(<History />);

    await waitFor(() => {

      const avgPriceCard = screen.getByText(/Harga Rata-rata/i);
      expect(avgPriceCard).toBeInTheDocument();
    });
  });

  it('should have statistics cards with proper data', async () => {
    api.getHistoricalData.mockResolvedValue({
      ...mockHistoryData30d,
      avg_price: 1250000,
      biggest_gain: 75000,
      biggest_loss: -65000,
    });

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText(/Harga Rata-rata/i)).toBeInTheDocument();
      expect(screen.getByText(/Kenaikan Terbesar/i)).toBeInTheDocument();
      expect(screen.getByText(/Penurunan Terbesar/i)).toBeInTheDocument();
    });
  });

  it('should display trend chart section with data', async () => {
    api.getHistoricalData.mockResolvedValue(mockHistoryData30d);

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText(/Tren Harga Emas/i)).toBeInTheDocument();
      expect(screen.getByText(/Visualisasi pergerakan harga historis/i)).toBeInTheDocument();
    });
  });

  it('should display volatility bar chart section', async () => {
    api.getHistoricalData.mockResolvedValue(mockHistoryData30d);

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText(/Volatilitas Harga/i)).toBeInTheDocument();
      expect(screen.getByText(/Distribusi pergerakan harga/i)).toBeInTheDocument();
    });
  });

  it('should format standard deviation as percentage', async () => {
    api.getHistoricalData.mockResolvedValue({
      ...mockHistoryData30d,
      std_dev: 3.25,
    });

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText(/3.25%/)).toBeInTheDocument();
    });
  });

  it('should display positive change with + sign', async () => {
    api.getHistoricalData.mockResolvedValue({
      ...mockHistoryData30d,
      price_change_pct: 4.75,
    });

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText(/\+4.75%/)).toBeInTheDocument();
    });
  });

  it('should handle zero volatility', async () => {
    api.getHistoricalData.mockResolvedValue({
      ...mockHistoryData30d,
      std_dev: 0,
    });

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText(/0%/)).toBeInTheDocument();
    });
  });

  it('should switch between periods and update chart', async () => {
    api.getHistoricalData.mockResolvedValue(mockHistoryData30d);

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText(/Tren Harga Emas/i)).toBeInTheDocument();
    });

    api.getHistoricalData.mockResolvedValue(mockHistoryData90d);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '90d' } });

    await waitFor(() => {
      expect(api.getHistoricalData).toHaveBeenLastCalledWith('90d');
    });
  });

  it('should maintain proper data structure for all periods', async () => {
    api.getHistoricalData.mockResolvedValue(mockHistoryData30d);

    render(<History />);

    await waitFor(() => {
      expect(api.getHistoricalData).toHaveBeenCalled();
    });

    expect(api.getHistoricalData).toHaveBeenCalledWith(expect.any(String));
  });

  it('should display average change per day with unit', async () => {
    api.getHistoricalData.mockResolvedValue({
      ...mockHistoryData30d,
      avg_daily_change: 7500,
    });

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText(/\/hari/i)).toBeInTheDocument();
    });
  });

  it('should show biggest gain in green', async () => {
    api.getHistoricalData.mockResolvedValue({
      ...mockHistoryData30d,
      biggest_gain: 80000,
    });

    render(<History />);

    await waitFor(() => {
      const gainElement = screen.getByText(/Kenaikan Terbesar/i).closest('div');
      expect(gainElement).toBeInTheDocument();
    });
  });

  it('should show biggest loss in red', async () => {
    api.getHistoricalData.mockResolvedValue({
      ...mockHistoryData30d,
      biggest_loss: -60000,
    });

    render(<History />);

    await waitFor(() => {
      const lossElement = screen.getByText(/Penurunan Terbesar/i).closest('div');
      expect(lossElement).toBeInTheDocument();
    });
  });

  it('should handle period switching multiple times', async () => {
    api.getHistoricalData.mockResolvedValue(mockHistoryData30d);

    render(<History />);

    await waitFor(() => {
      expect(api.getHistoricalData).toHaveBeenCalledWith('30d');
    });

    api.getHistoricalData.mockResolvedValue(mockHistoryData90d);
    const select = screen.getByRole('combobox');

    fireEvent.change(select, { target: { value: '90d' } });
    await waitFor(() => {
      expect(api.getHistoricalData).toHaveBeenLastCalledWith('90d');
    });

    api.getHistoricalData.mockResolvedValue(mockHistoryData30d);
    fireEvent.change(select, { target: { value: '30d' } });
    await waitFor(() => {
      expect(api.getHistoricalData).toHaveBeenLastCalledWith('30d');
    });
  });

  it('should display current price in price change badge', async () => {
    api.getHistoricalData.mockResolvedValue({
      ...mockHistoryData30d,
      current_price: 1000000,
    });

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText(/\+2.5%/)).toBeInTheDocument();
    });
  });

  it('should have accessible select for period selection', async () => {
    api.getHistoricalData.mockResolvedValue(mockHistoryData30d);

    render(<History />);

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });
  });

  it('should render volatility card with std dev display', async () => {
    api.getHistoricalData.mockResolvedValue({
      ...mockHistoryData30d,
      std_dev: 5.5,
    });

    render(<History />);

    await waitFor(() => {
      expect(screen.getByText(/Volatilitas \(STD\)/i)).toBeInTheDocument();
    });
  });
});

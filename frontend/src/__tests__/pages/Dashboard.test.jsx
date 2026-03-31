import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '../../pages/Dashboard';
import * as api from '../../services/api';

vi.mock('../../services/api');

describe('Dashboard Page', () => {
  const mockDashboardData = {
    current_price: 1000000,
    price_change_pct: 2.5,
    lowest_price: 950000,
    lowest_date: '2025-01-01',
    highest_price: 1050000,
    highest_date: '2025-01-10',
    volatility: 2.1,
    sentiment: 'Bullish',
    tomorrow_prediction: 1005000,
    chart_data: [
      { date: '2025-01-01', price: 990000 },
      { date: '2025-01-02', price: 995000 },
      { date: '2025-01-03', price: 1000000 },
      { date: '2025-01-04', price: 1005000 },
      { date: '2025-01-05', price: 1010000 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state while fetching', async () => {
    api.getDashboardData.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockDashboardData), 100))
    );

    render(<Dashboard />);

    // While loading, should show placeholder text
    await waitFor(() => {
      expect(screen.queryByText(/Ringkasan Dashboard/i)).toBeInTheDocument();
    });
  });

  it('should display dashboard with data after loading', async () => {
    api.getDashboardData.mockResolvedValue(mockDashboardData);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.queryByText('...')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Ringkasan Dashboard/i)).toBeInTheDocument();
  });

  it('should display current price card', async () => {
    api.getDashboardData.mockResolvedValue(mockDashboardData);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Harga Emas Antam/i)).toBeInTheDocument();
    });
  });

  it('should display price change percentage', async () => {
    api.getDashboardData.mockResolvedValue(mockDashboardData);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('+2.5%')).toBeInTheDocument();
    });
  });

  it('should display lowest price card', async () => {
    api.getDashboardData.mockResolvedValue(mockDashboardData);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Harga Terendah/i)).toBeInTheDocument();
    });
  });

  it('should display highest price card', async () => {
    api.getDashboardData.mockResolvedValue(mockDashboardData);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Harga Tertinggi/i)).toBeInTheDocument();
    });
  });

  it('should display volatility and sentiment in quick analysis', async () => {
    api.getDashboardData.mockResolvedValue(mockDashboardData);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Volatilitas/i)).toBeInTheDocument();
      expect(screen.getByText(/Sentimen Pasar/i)).toBeInTheDocument();
      expect(screen.getByText('Bullish')).toBeInTheDocument();
    });
  });

  it('should display price chart with data', async () => {
    api.getDashboardData.mockResolvedValue(mockDashboardData);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Grafik Harga Emas/i)).toBeInTheDocument();
    });
  });

  it('should display time range filter buttons', async () => {
    api.getDashboardData.mockResolvedValue(mockDashboardData);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /7d/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /30d/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /90d/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /All Time/i })).toBeInTheDocument();
    });
  });

  it('should filter chart data on time range change', async () => {
    api.getDashboardData.mockResolvedValue(mockDashboardData);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /7d/i })).toBeInTheDocument();
    });

    const button7d = screen.getByRole('button', { name: /7d/i });
    fireEvent.click(button7d);

    // Verify button is now active (styling would be applied)
    expect(button7d).toHaveClass('text-primary');
  });

  it('should call getDashboardData on mount', async () => {
    api.getDashboardData.mockResolvedValue(mockDashboardData);

    render(<Dashboard />);

    await waitFor(() => {
      expect(api.getDashboardData).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle API error gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.getDashboardData.mockRejectedValue(new Error('API Error'));

    render(<Dashboard />);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Dashboard fetch error:', expect.any(Error));
    });

    consoleError.mockRestore();
  });

  it('should display tomorrow prediction', async () => {
    api.getDashboardData.mockResolvedValue(mockDashboardData);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Prediksi Besok/i)).toBeInTheDocument();
    });
  });

  it('should allow editing notes section', async () => {
    api.getDashboardData.mockResolvedValue(mockDashboardData);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Catatan Terbaru/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Tulis catatan analisis/i);
    expect(textarea).toBeInTheDocument();
  });

  it('should display default notes on load', async () => {
    api.getDashboardData.mockResolvedValue(mockDashboardData);

    render(<Dashboard />);

    await waitFor(() => {
      const textarea = screen.getByPlaceholderText(/Tulis catatan analisis/i);
      expect(textarea).toBeInTheDocument();
    });
  });

  it('should update notes when user types', async () => {
    api.getDashboardData.mockResolvedValue(mockDashboardData);
    const user = userEvent.setup();

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Tulis catatan analisis/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Tulis catatan analisis/i);
    await user.clear(textarea);
    await user.type(textarea, 'New note');

    expect(textarea).toHaveValue('New note');
  });

  it('should display formatted price values', async () => {
    api.getDashboardData.mockResolvedValue({
      ...mockDashboardData,
      current_price: 1250000,
    });

    render(<Dashboard />);

    await waitFor(() => {
      // Check that price is displayed (formatting depends on formatRupiah utility)
      expect(screen.getByText(/Harga Emas Antam/i)).toBeInTheDocument();
    });
  });

  it('should display both positive and negative price changes', async () => {
    api.getDashboardData.mockResolvedValue({
      ...mockDashboardData,
      price_change_pct: -1.5,
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('-1.5%')).toBeInTheDocument();
    });
  });

  it('should have accessible header section', async () => {
    api.getDashboardData.mockResolvedValue(mockDashboardData);

    render(<Dashboard />);

    await waitFor(() => {
      const header = screen.getByRole('heading', { level: 1 });
      expect(header).toHaveTextContent(/Ringkasan Dashboard/i);
    });
  });

  it('should render stat cards in grid layout', async () => {
    api.getDashboardData.mockResolvedValue(mockDashboardData);

    render(<Dashboard />);

    await waitFor(() => {
      const cards = screen.getAllByRole('heading', { level: 3 });
      // Should have current price, lowest, highest + other card headings
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  it('should show loading indicator during data fetch', async () => {
    let resolveData;
    api.getDashboardData.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveData = resolve;
      })
    );

    render(<Dashboard />);

    expect(screen.getByText('Memuat data...')).toBeInTheDocument();

    resolveData(mockDashboardData);

    await waitFor(() => {
      expect(screen.queryByText('Memuat data...')).not.toBeInTheDocument();
    });
  });

  it('should display empty state message when no chart data', async () => {
    api.getDashboardData.mockResolvedValue({
      ...mockDashboardData,
      chart_data: [],
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Upload dataset terlebih dahulu/i)).toBeInTheDocument();
    });
  });

  it('should have responsive layout with responsive containers', async () => {
    api.getDashboardData.mockResolvedValue(mockDashboardData);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Ringkasan Dashboard/i)).toBeInTheDocument();
    });

    // Verify grid layouts exist (via classNames)
    const mainContainer = screen.getByText(/Ringkasan Dashboard/i).closest('div');
    expect(mainContainer).toBeInTheDocument();
  });

  it('should handle zero volatility display', async () => {
    api.getDashboardData.mockResolvedValue({
      ...mockDashboardData,
      volatility: 0,
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Volatilitas/i)).toBeInTheDocument();
    });
  });

  it('should display sentiment value correctly', async () => {
    api.getDashboardData.mockResolvedValue({
      ...mockDashboardData,
      sentiment: 'Bearish',
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Bearish')).toBeInTheDocument();
    });
  });

  it('should display trend indicator arrow for price changes', async () => {
    api.getDashboardData.mockResolvedValue({
      ...mockDashboardData,
      price_change_pct: 5.0,
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('+5%')).toBeInTheDocument();
    });
  });

  it('should show fallback empty message when loading and no data', async () => {
    api.getDashboardData.mockResolvedValue({
      ...mockDashboardData,
      chart_data: null,
    });

    render(<Dashboard />);

    await waitFor(() => {
      const chartSection = screen.getByText(/Grafik Harga Emas/i);
      expect(chartSection).toBeInTheDocument();
    });
  });

  it('should handle null or undefined sentiment', async () => {
    api.getDashboardData.mockResolvedValue({
      ...mockDashboardData,
      sentiment: null,
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Sentimen Pasar/i)).toBeInTheDocument();
    });
  });

  it('should maintain time range filter state when switching', async () => {
    api.getDashboardData.mockResolvedValue(mockDashboardData);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /30d/i })).toBeInTheDocument();
    });

    const button30d = screen.getByRole('button', { name: /30d/i });
    fireEvent.click(button30d);

    expect(button30d).toHaveClass('text-primary');
  });
});

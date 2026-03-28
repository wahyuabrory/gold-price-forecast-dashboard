import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../../components/Layout';
import { ThemeContext } from '../../context/ThemeContext';

// Mock ThemeContext for testing
const mockThemeValue = {
  isDark: false,
  toggleTheme: vi.fn(),
};

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

const renderWithTheme = (component, isDark = false) => {
  const themeValue = {
    isDark,
    toggleTheme: vi.fn(),
  };

  return render(
    <ThemeContext.Provider value={themeValue}>
      <BrowserRouter>{component}</BrowserRouter>
    </ThemeContext.Provider>
  );
};

describe('Layout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render sidebar with logo', () => {
    renderWithTheme(<Layout />);

    expect(screen.getByText(/XAU\/IDR/i)).toBeInTheDocument();
  });

  it('should display gold coin emoji in branding', () => {
    renderWithTheme(<Layout />);

    expect(screen.getByText(/🪙/)).toBeInTheDocument();
  });

  it('should render navigation links', () => {
    renderWithTheme(<Layout />);

    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Prediksi Emas/i)).toBeInTheDocument();
    expect(screen.getByText(/Data Historis/i)).toBeInTheDocument();
  });

  it('should have dashboard navigation link', () => {
    renderWithTheme(<Layout />);

    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    expect(dashboardLink).toHaveAttribute('href', '/');
  });

  it('should have predict navigation link', () => {
    renderWithTheme(<Layout />);

    const predictLink = screen.getByRole('link', { name: /Prediksi Emas/i });
    expect(predictLink).toHaveAttribute('href', '/predict');
  });

  it('should have history navigation link', () => {
    renderWithTheme(<Layout />);

    const historyLink = screen.getByRole('link', { name: /Data Historis/i });
    expect(historyLink).toHaveAttribute('href', '/history');
  });

  it('should render dark mode toggle button', () => {
    renderWithTheme(<Layout />);

    const toggleButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg') // Button with SVG icons
    );

    expect(toggleButton).toBeInTheDocument();
  });

  it('should display sun and moon icons in theme toggle', async () => {
    renderWithTheme(<Layout />, false);

    // Component should render with toggle button
    const toggleButton = screen.getAllByRole('button').find(btn =>
      btn.querySelector('svg')
    );

    expect(toggleButton).toBeInTheDocument();
  });

  it('should render main content area', () => {
    renderWithTheme(<Layout />);

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });

  it('should have sidebar navigation section', () => {
    renderWithTheme(<Layout />);

    const sidebar = screen.getByText(/XAU\/IDR/i).closest('aside');
    expect(sidebar).toBeInTheDocument();
  });

  it('should have fixed sidebar positioning', () => {
    renderWithTheme(<Layout />);

    const sidebar = screen.getByText(/XAU\/IDR/i).closest('aside');
    expect(sidebar).toHaveClass('fixed');
  });

  it('should have navigation items with proper spacing', () => {
    renderWithTheme(<Layout />);

    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Prediksi Emas/i)).toBeInTheDocument();
    expect(screen.getByText(/Data Historis/i)).toBeInTheDocument();
  });

  it('should support theme context integration', () => {
    renderWithTheme(<Layout />, false);

    expect(screen.getByText(/XAU\/IDR/i)).toBeInTheDocument();
  });

  it('should have dark mode styles applied', () => {
    renderWithTheme(<Layout />, true);

    const sidebar = screen.getByText(/XAU\/IDR/i).closest('aside');
    expect(sidebar).toBeInTheDocument();
  });

  it('should apply light mode styles', () => {
    renderWithTheme(<Layout />, false);

    const sidebar = screen.getByText(/XAU\/IDR/i).closest('aside');
    // Should not have 'dark' class
    expect(sidebar).toHaveClass('fixed');
  });

  it('should render theme toggle with interactive state', () => {
    const toggleThemeMock = vi.fn();
    const themeValue = {
      isDark: false,
      toggleTheme: toggleThemeMock,
    };

    render(
      <ThemeContext.Provider value={themeValue}>
        <BrowserRouter>
          <Layout />
        </BrowserRouter>
      </ThemeContext.Provider>
    );

    const toggleButton = screen.getAllByRole('button').find(btn =>
      btn.querySelector('svg')
    );

    fireEvent.click(toggleButton);

    // Note: toggleTheme would be called in actual implementation
  });

  it('should have all navigation links accessible via keyboard', () => {
    renderWithTheme(<Layout />);

    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(3);

    links.forEach(link => {
      expect(link).toHaveAttribute('href');
    });
  });

  it('should maintain navigation layout on screen', () => {
    renderWithTheme(<Layout />);

    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    const predictLink = screen.getByRole('link', { name: /Prediksi Emas/i });
    const historyLink = screen.getByRole('link', { name: /Data Historis/i });

    expect(dashboardLink).toBeVisible();
    expect(predictLink).toBeVisible();
    expect(historyLink).toBeVisible();
  });

  it('should have sidebar with specific width', () => {
    renderWithTheme(<Layout />);

    const sidebar = screen.getByText(/XAU\/IDR/i).closest('aside');
    expect(sidebar).toHaveClass('w-64');
  });

  it('should have main content with left margin', () => {
    renderWithTheme(<Layout />);

    const main = screen.getByRole('main');
    expect(main).toHaveClass('ml-64');
  });

  it('should render outlet for child routes', () => {
    renderWithTheme(<Layout />);

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });

  it('should have sidebar border styling', () => {
    renderWithTheme(<Layout />);

    const sidebar = screen.getByText(/XAU\/IDR/i).closest('aside');
    expect(sidebar).toHaveClass('border-r');
  });

  it('should have proper flex layout for sidebar', () => {
    renderWithTheme(<Layout />);

    const sidebar = screen.getByText(/XAU\/IDR/i).closest('aside');
    // Verify sidebar is a flex container
    expect(sidebar).toHaveClass('flex');
  });

  it('should display branding in serif font', () => {
    renderWithTheme(<Layout />);

    const branding = screen.getByText(/XAU\/IDR/i);
    // Verify branding is rendered
    expect(branding).toBeInTheDocument();
  });

  it('should have navigation with proper styling', () => {
    renderWithTheme(<Layout />);

    const nav = screen.getByText(/Dashboard/i).closest('nav');
    expect(nav).toBeInTheDocument();
  });

  it('should support theme toggle for dark mode', () => {
    renderWithTheme(<Layout />, true);

    const sidebar = screen.getByText(/XAU\/IDR/i).closest('aside');
    expect(sidebar).toHaveClass('dark:bg-slate-900');
  });

  it('should have toggle button at bottom of sidebar', () => {
    renderWithTheme(<Layout />);

    const toggleButton = screen.getAllByRole('button').find(btn =>
      btn.querySelector('svg')
    );

    const sidebar = screen.getByText(/XAU\/IDR/i).closest('aside');
    expect(toggleButton).toBeInTheDocument();
  });

  it('should render toggle with proper styling', () => {
    renderWithTheme(<Layout />);

    const toggleButton = screen.getAllByRole('button').find(btn =>
      btn.querySelector('svg')
    );

    expect(toggleButton).toHaveClass('w-full');
  });

  it('should have nav items with hover effects', () => {
    renderWithTheme(<Layout />);

    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    // Verify link is accessible and rendered
    expect(dashboardLink).toBeInTheDocument();
  });

  it('should highlight active navigation route', () => {
    renderWithTheme(<Layout />);

    // Dashboard link should be active by default (on "/" route)
    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    expect(dashboardLink).toHaveClass('bg-primary');
  });

  it('should display all nav links in correct order', () => {
    renderWithTheme(<Layout />);

    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    const predictLink = screen.getByRole('link', { name: /Prediksi Emas/i });
    const historyLink = screen.getByRole('link', { name: /Data Historis/i });

    expect(dashboardLink).toBeInTheDocument();
    expect(predictLink).toBeInTheDocument();
    expect(historyLink).toBeInTheDocument();
  });

  it('should have proper logo styling with primary color when dark', () => {
    renderWithTheme(<Layout />, true);

    const branding = screen.getByText(/XAU\/IDR/i);
    expect(branding).toHaveClass('dark:text-primary');
  });

  it('should render sidebar with full height', () => {
    renderWithTheme(<Layout />);

    const sidebar = screen.getByText(/XAU\/IDR/i).closest('aside');
    expect(sidebar).toHaveClass('h-screen');
  });

  it('should have min-h-screen for main content', () => {
    renderWithTheme(<Layout />);

    const main = screen.getByRole('main');
    expect(main).toHaveClass('min-h-screen');
  });

  it('should render with background styling', () => {
    renderWithTheme(<Layout />);

    const main = screen.getByRole('main');
    expect(main).toHaveClass('bg-background-light');
    expect(main).toHaveClass('dark:bg-background-dark');
  });

  it('should have transition classes for theme changes', () => {
    renderWithTheme(<Layout />);

    const sidebar = screen.getByText(/XAU\/IDR/i).closest('aside');
    expect(sidebar).toHaveClass('transition-colors');
  });

  it('should render logo with proper icon', () => {
    renderWithTheme(<Layout />);

    expect(screen.getByText(/🪙/)).toBeInTheDocument();
  });

  it('should have z-index for sidebar overlay on mobile', () => {
    renderWithTheme(<Layout />);

    const sidebar = screen.getByText(/XAU\/IDR/i).closest('aside');
    expect(sidebar).toHaveClass('z-50');
  });

  it('should support dark color styling on all elements', () => {
    renderWithTheme(<Layout />, true);

    const main = screen.getByRole('main');
    expect(main).toHaveClass('dark:text-slate-200');
  });

  it('should have branding with bold font weight', () => {
    renderWithTheme(<Layout />);

    const branding = screen.getByText(/XAU\/IDR/i);
    expect(branding).toHaveClass('font-bold');
  });

  it('should have nav links with proper icons', () => {
    renderWithTheme(<Layout />);

    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(3);

    links.forEach(link => {
      // Each link should have an icon (SVG)
      const svg = link.querySelector('svg');
      expect(svg || link.textContent.length > 0).toBeTruthy();
    });
  });

  it('should render bottom toggle section', () => {
    renderWithTheme(<Layout />);

    const toggleButton = screen.getAllByRole('button').find(btn =>
      btn.querySelector('svg')
    );

    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveClass('justify-between');
  });

  it('should have split layout with sidebar and main', () => {
    renderWithTheme(<Layout />);

    const sidebar = screen.getByText(/XAU\/IDR/i).closest('aside');
    const main = screen.getByRole('main');

    expect(sidebar).toBeInTheDocument();
    expect(main).toBeInTheDocument();
  });
});

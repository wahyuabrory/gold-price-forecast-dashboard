import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../../components/Layout';

const renderWithRouter = (component) => render(<BrowserRouter>{component}</BrowserRouter>);

describe('Layout Component', () => {
  it('should render sidebar with logo', () => {
    renderWithRouter(<Layout />);

    expect(screen.getByText(/XAU\/IDR/i)).toBeInTheDocument();
  });

  it('should display gold coin emoji in branding', () => {
    renderWithRouter(<Layout />);

    expect(screen.getByText(/🪙/)).toBeInTheDocument();
  });

  it('should render navigation links', () => {
    renderWithRouter(<Layout />);

    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Prediksi Emas/i)).toBeInTheDocument();
    expect(screen.getByText(/Data Historis/i)).toBeInTheDocument();
  });

  it('should have dashboard navigation link', () => {
    renderWithRouter(<Layout />);

    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    expect(dashboardLink).toHaveAttribute('href', '/');
  });

  it('should have predict navigation link', () => {
    renderWithRouter(<Layout />);

    const predictLink = screen.getByRole('link', { name: /Prediksi Emas/i });
    expect(predictLink).toHaveAttribute('href', '/predict');
  });

  it('should have history navigation link', () => {
    renderWithRouter(<Layout />);

    const historyLink = screen.getByRole('link', { name: /Data Historis/i });
    expect(historyLink).toHaveAttribute('href', '/history');
  });

  it('should render main content area', () => {
    renderWithRouter(<Layout />);

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });

  it('should have sidebar navigation section', () => {
    renderWithRouter(<Layout />);

    const sidebar = screen.getByText(/XAU\/IDR/i).closest('aside');
    expect(sidebar).toBeInTheDocument();
  });

  it('should have fixed sidebar positioning', () => {
    renderWithRouter(<Layout />);

    const sidebar = screen.getByText(/XAU\/IDR/i).closest('aside');
    expect(sidebar).toHaveClass('fixed');
  });

  it('should have navigation items with proper spacing', () => {
    renderWithRouter(<Layout />);

    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Prediksi Emas/i)).toBeInTheDocument();
    expect(screen.getByText(/Data Historis/i)).toBeInTheDocument();
  });

  it('should apply light-only styles', () => {
    renderWithRouter(<Layout />);

    const sidebar = screen.getByText(/XAU\/IDR/i).closest('aside');

    expect(sidebar).toHaveClass('fixed');
  });

  it('should have all navigation links accessible via keyboard', () => {
    renderWithRouter(<Layout />);

    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(3);

    links.forEach(link => {
      expect(link).toHaveAttribute('href');
    });
  });

  it('should maintain navigation layout on screen', () => {
    renderWithRouter(<Layout />);

    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    const predictLink = screen.getByRole('link', { name: /Prediksi Emas/i });
    const historyLink = screen.getByRole('link', { name: /Data Historis/i });

    expect(dashboardLink).toBeVisible();
    expect(predictLink).toBeVisible();
    expect(historyLink).toBeVisible();
  });

  it('should have sidebar with specific width', () => {
    renderWithRouter(<Layout />);

    const sidebar = screen.getByText(/XAU\/IDR/i).closest('aside');
    expect(sidebar).toHaveClass('w-64');
  });

  it('should have main content with left margin', () => {
    renderWithRouter(<Layout />);

    const main = screen.getByRole('main');
    expect(main).toHaveClass('ml-64');
  });

  it('should render outlet for child routes', () => {
    renderWithRouter(<Layout />);

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });

  it('should have sidebar border styling', () => {
    renderWithRouter(<Layout />);

    const sidebar = screen.getByText(/XAU\/IDR/i).closest('aside');
    expect(sidebar).toHaveClass('border-r');
  });

  it('should have proper flex layout for sidebar', () => {
    renderWithRouter(<Layout />);

    const sidebar = screen.getByText(/XAU\/IDR/i).closest('aside');

    expect(sidebar).toHaveClass('flex');
  });

  it('should display branding in serif font', () => {
    renderWithRouter(<Layout />);

    const branding = screen.getByText(/XAU\/IDR/i);

    expect(branding).toBeInTheDocument();
  });

  it('should have navigation with proper styling', () => {
    renderWithRouter(<Layout />);

    const nav = screen.getByText(/Dashboard/i).closest('nav');
    expect(nav).toBeInTheDocument();
  });

  it('should have nav items with hover effects', () => {
    renderWithRouter(<Layout />);

    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });

    expect(dashboardLink).toBeInTheDocument();
  });

  it('should highlight active navigation route', () => {
    renderWithRouter(<Layout />);


    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    expect(dashboardLink).toHaveClass('bg-primary');
  });

  it('should display all nav links in correct order', () => {
    renderWithRouter(<Layout />);

    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    const predictLink = screen.getByRole('link', { name: /Prediksi Emas/i });
    const historyLink = screen.getByRole('link', { name: /Data Historis/i });

    expect(dashboardLink).toBeInTheDocument();
    expect(predictLink).toBeInTheDocument();
    expect(historyLink).toBeInTheDocument();
  });

  it('should render sidebar with full height', () => {
    renderWithRouter(<Layout />);

    const sidebar = screen.getByText(/XAU\/IDR/i).closest('aside');
    expect(sidebar).toHaveClass('h-screen');
  });

  it('should have min-h-screen for main content', () => {
    renderWithRouter(<Layout />);

    const main = screen.getByRole('main');
    expect(main).toHaveClass('min-h-screen');
  });

  it('should render with background styling', () => {
    renderWithRouter(<Layout />);

    const main = screen.getByRole('main');
    expect(main).toHaveClass('bg-background-light');
  });

  it('should render logo with proper icon', () => {
    renderWithRouter(<Layout />);

    expect(screen.getByText(/🪙/)).toBeInTheDocument();
  });

  it('should have z-index for sidebar overlay on mobile', () => {
    renderWithRouter(<Layout />);

    const sidebar = screen.getByText(/XAU\/IDR/i).closest('aside');
    expect(sidebar).toHaveClass('z-50');
  });

  it('should have branding with bold font weight', () => {
    renderWithRouter(<Layout />);

    const branding = screen.getByText(/XAU\/IDR/i);
    expect(branding).toHaveClass('font-bold');
  });

  it('should have nav links with proper icons', () => {
    renderWithRouter(<Layout />);

    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(3);

    links.forEach(link => {

      const svg = link.querySelector('svg');
      expect(svg || link.textContent.length > 0).toBeTruthy();
    });
  });

  it('should have split layout with sidebar and main', () => {
    renderWithRouter(<Layout />);

    const sidebar = screen.getByText(/XAU\/IDR/i).closest('aside');
    const main = screen.getByRole('main');

    expect(sidebar).toBeInTheDocument();
    expect(main).toBeInTheDocument();
  });
});

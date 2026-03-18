/**
 * Format number as Indonesian Rupiah
 */
export const formatRupiah = (number) => {
  if (number == null || isNaN(number)) return 'Rp 0';
  return `Rp ${Math.round(number).toLocaleString('id-ID')}`;
};

/**
 * Format date string to Indonesian locale
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format date for chart axis
 */
export const formatChartDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
};

/**
 * Calculate percentage change
 */
export const calcPercentChange = (current, previous) => {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous * 100).toFixed(2);
};

/**
 * Utility functions for formatting data display
 */

/**
 * Format currency values with proper USDT symbol and decimal places
 */
export const formatCurrency = (amount: number): string => {
  if (amount === 0) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format date values for display
 */
export const formatDate = (date: any): string => {
  if (!date) return 'N/A';
  
  let dateObj: Date;
  
  // Handle Firestore Timestamp
  if (date && typeof date.toDate === 'function') {
    dateObj = date.toDate();
  } 
  // Handle regular Date object
  else if (date instanceof Date) {
    dateObj = date;
  }
  // Handle timestamp number
  else if (typeof date === 'number') {
    dateObj = new Date(date);
  }
  // Handle string dates
  else if (typeof date === 'string') {
    dateObj = new Date(date);
  }
  else {
    return 'Invalid Date';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
};

/**
 * Format date for short display (just date, no time)
 */
export const formatDateShort = (date: any): string => {
  if (!date) return 'N/A';
  
  let dateObj: Date;
  
  // Handle Firestore Timestamp
  if (date && typeof date.toDate === 'function') {
    dateObj = date.toDate();
  } 
  // Handle regular Date object
  else if (date instanceof Date) {
    dateObj = date;
  }
  // Handle timestamp number
  else if (typeof date === 'number') {
    dateObj = new Date(date);
  }
  // Handle string dates
  else if (typeof date === 'string') {
    dateObj = new Date(date);
  }
  else {
    return 'Invalid Date';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj);
};

/**
 * Format percentage values
 */
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

/**
 * Format large numbers with K, M, B suffixes
 */
export const formatNumber = (num: number): string => {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Format transaction status for display
 */
export const formatStatus = (status: string): string => {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};
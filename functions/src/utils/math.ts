/**
 * Math utilities for MLM calculations
 */

import { mlmConfig } from '../config';

/**
 * Calculate referral income (50% of activation amount)
 */
export const calculateReferralIncome = (activationAmount: number): number => {
  const percentage = mlmConfig.incomes.referral.percentage;
  return roundToTwoDecimals((activationAmount * percentage) / 100);
};

/**
 * Calculate level income based on level and activation amount
 */
export const calculateLevelIncome = (level: number, activationAmount: number): number => {
  const levelPercentages = mlmConfig.incomes.level;
  let percentage = 0;

  switch (level) {
    case 1:
      percentage = levelPercentages.L1;
      break;
    case 2:
      percentage = levelPercentages.L2;
      break;
    case 3:
      percentage = levelPercentages.L3;
      break;
    case 4:
      percentage = levelPercentages.L4;
      break;
    case 5:
      percentage = levelPercentages.L5;
      break;
    case 6:
      percentage = levelPercentages.L6;
      break;
    default:
      percentage = 0;
  }

  return roundToTwoDecimals((activationAmount * percentage) / 100);
};

/**
 * Calculate global income distribution
 */
export const calculateGlobalIncome = (
  totalAmount: number,
  level: number,
  totalLevels: number = 10
): number => {
  if (level < 1 || level > totalLevels) {
    return 0;
  }

  // Equal distribution across all levels
  const amountPerLevel = totalAmount / totalLevels;
  return roundToTwoDecimals(amountPerLevel);
};

/**
 * Calculate re-topup income (same as referral income)
 */
export const calculateReTopupIncome = (activationAmount: number): number => {
  return calculateReferralIncome(activationAmount);
};

/**
 * Calculate withdrawal deductions based on method
 */
export const calculateWithdrawalDeductions = (
  amount: number,
  method: 'bank' | 'usdt' | 'p2p' | 'fund'
): { netAmount: number; deduction: number; deductionPercentage: number } => {
  let deductionPercentage = 0;

  switch (method) {
    case 'bank':
      deductionPercentage = mlmConfig.withdrawal.bankDeduction;
      break;
    case 'usdt':
      deductionPercentage = mlmConfig.withdrawal.usdtFee;
      break;
    case 'p2p':
      deductionPercentage = mlmConfig.withdrawal.p2pFee;
      break;
    case 'fund':
      deductionPercentage = mlmConfig.withdrawal.fundConversion;
      break;
  }

  const deduction = roundToTwoDecimals((amount * deductionPercentage) / 100);
  const netAmount = roundToTwoDecimals(amount - deduction);

  return {
    netAmount,
    deduction,
    deductionPercentage
  };
};

/**
 * Calculate next rank activation amount
 */
export const getNextRankActivationAmount = (currentRank: string): number | null => {
  const ranks = Object.keys(mlmConfig.ranks);
  const currentIndex = ranks.indexOf(currentRank);
  
  if (currentIndex === -1 || currentIndex === ranks.length - 1) {
    return null; // Invalid rank or already at highest rank
  }

  const nextRank = ranks[currentIndex + 1];
  return mlmConfig.ranks[nextRank as keyof typeof mlmConfig.ranks].activationAmount;
};

/**
 * Calculate global cycle completion requirements
 */
export const calculateGlobalCycleRequirements = (rank: string): {
  cycleSize: number;
  requiredUsers: number;
  payoutAmount: number;
} => {
  const rankConfig = mlmConfig.ranks[rank as keyof typeof mlmConfig.ranks];
  const activationAmount = rankConfig?.activationAmount || 0;
  
  // Cycle size is 2^10 = 1024 for all ranks
  const cycleSize = mlmConfig.incomes.global.cycleSize;
  
  // Required users to complete cycle (all positions filled)
  const requiredUsers = cycleSize;
  
  // Payout amount is 10% of activation amount
  const payoutAmount = roundToTwoDecimals(
    (activationAmount * mlmConfig.incomes.global.percentage) / 100
  );

  return {
    cycleSize,
    requiredUsers,
    payoutAmount
  };
};

/**
 * Calculate binary tree position
 */
export const calculateBinaryPosition = (
  parentPosition: number,
  side: 'left' | 'right'
): number => {
  if (side === 'left') {
    return parentPosition * 2;
  } else {
    return (parentPosition * 2) + 1;
  }
};

/**
 * Get parent position in binary tree
 */
export const getParentPosition = (position: number): number => {
  return Math.floor(position / 2);
};

/**
 * Check if position is left or right child
 */
export const getPositionSide = (position: number): 'left' | 'right' => {
  return position % 2 === 0 ? 'left' : 'right';
};

/**
 * Calculate level in binary tree from position
 */
export const calculateTreeLevel = (position: number): number => {
  if (position <= 0) return 0;
  return Math.floor(Math.log2(position)) + 1;
};

/**
 * Get all positions at a specific level
 */
export const getPositionsAtLevel = (level: number): number[] => {
  if (level <= 0) return [];
  
  const startPosition = Math.pow(2, level - 1);
  const endPosition = Math.pow(2, level) - 1;
  
  const positions: number[] = [];
  for (let i = startPosition; i <= endPosition; i++) {
    positions.push(i);
  }
  
  return positions;
};

/**
 * Calculate compound interest for investment projections
 */
export const calculateCompoundInterest = (
  principal: number,
  rate: number,
  time: number,
  compoundingFrequency: number = 1
): number => {
  const amount = principal * Math.pow(
    (1 + rate / compoundingFrequency),
    compoundingFrequency * time
  );
  return roundToTwoDecimals(amount);
};

/**
 * Calculate ROI (Return on Investment)
 */
export const calculateROI = (
  initialInvestment: number,
  currentValue: number
): number => {
  if (initialInvestment <= 0) return 0;
  
  const roi = ((currentValue - initialInvestment) / initialInvestment) * 100;
  return roundToTwoDecimals(roi);
};

/**
 * Calculate average income per day/week/month
 */
export const calculateAverageIncome = (
  totalIncome: number,
  days: number
): {
  daily: number;
  weekly: number;
  monthly: number;
} => {
  if (days <= 0) {
    return { daily: 0, weekly: 0, monthly: 0 };
  }

  const daily = roundToTwoDecimals(totalIncome / days);
  const weekly = roundToTwoDecimals(daily * 7);
  const monthly = roundToTwoDecimals(daily * 30);

  return { daily, weekly, monthly };
};

/**
 * Calculate income distribution for team building
 */
export const calculateTeamIncomeDistribution = (
  totalTeamIncome: number,
  teamSize: number,
  leadershipBonus: number = 0
): {
  averagePerMember: number;
  leaderBonus: number;
  totalDistributed: number;
} => {
  if (teamSize <= 0) {
    return {
      averagePerMember: 0,
      leaderBonus: 0,
      totalDistributed: 0
    };
  }

  const averagePerMember = roundToTwoDecimals(totalTeamIncome / teamSize);
  const leaderBonus = roundToTwoDecimals(
    (totalTeamIncome * leadershipBonus) / 100
  );
  const totalDistributed = roundToTwoDecimals(totalTeamIncome + leaderBonus);

  return {
    averagePerMember,
    leaderBonus,
    totalDistributed
  };
};

/**
 * Validate amount precision (max 2 decimal places)
 */
export const validateAmountPrecision = (amount: number): boolean => {
  return Number.isFinite(amount) && Math.round(amount * 100) / 100 === amount;
};

/**
 * Round number to two decimal places
 */
export const roundToTwoDecimals = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

/**
 * Convert amount to cents for precise calculations
 */
export const toCents = (amount: number): number => {
  return Math.round(amount * 100);
};

/**
 * Convert cents back to dollars
 */
export const fromCents = (cents: number): number => {
  return roundToTwoDecimals(cents / 100);
};

/**
 * Safe addition for monetary calculations
 */
export const safeAdd = (...amounts: number[]): number => {
  const totalCents = amounts.reduce((sum, amount) => sum + toCents(amount), 0);
  return fromCents(totalCents);
};

/**
 * Safe subtraction for monetary calculations
 */
export const safeSubtract = (minuend: number, subtrahend: number): number => {
  const resultCents = toCents(minuend) - toCents(subtrahend);
  return fromCents(resultCents);
};

/**
 * Safe multiplication for monetary calculations
 */
export const safeMultiply = (amount: number, multiplier: number): number => {
  const resultCents = Math.round(toCents(amount) * multiplier);
  return fromCents(resultCents);
};

/**
 * Safe division for monetary calculations
 */
export const safeDivide = (dividend: number, divisor: number): number => {
  if (divisor === 0) return 0;
  const resultCents = Math.round(toCents(dividend) / divisor);
  return fromCents(resultCents);
};

/**
 * Format currency for display
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Parse currency string to number
 */
export const parseCurrency = (currencyString: string): number => {
  const numericString = currencyString.replace(/[^0-9.-]+/g, '');
  const amount = parseFloat(numericString);
  return isNaN(amount) ? 0 : roundToTwoDecimals(amount);
};
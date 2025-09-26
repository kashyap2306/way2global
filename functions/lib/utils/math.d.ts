/**
 * Math utilities for MLM calculations
 */
/**
 * Calculate referral income (50% of activation amount)
 */
export declare const calculateReferralIncome: (activationAmount: number) => number;
/**
 * Calculate level income based on level and activation amount
 */
export declare const calculateLevelIncome: (level: number, activationAmount: number) => number;
/**
 * Calculate global income distribution
 */
export declare const calculateGlobalIncome: (totalAmount: number, level: number, totalLevels?: number) => number;
/**
 * Calculate re-topup income (same as referral income)
 */
export declare const calculateReTopupIncome: (activationAmount: number) => number;
/**
 * Calculate withdrawal deductions based on method
 */
export declare const calculateWithdrawalDeductions: (amount: number, method: "bank" | "usdt" | "p2p" | "fund") => {
    netAmount: number;
    deduction: number;
    deductionPercentage: number;
};
/**
 * Calculate next rank activation amount
 */
export declare const getNextRankActivationAmount: (currentRank: string) => number | null;
/**
 * Calculate global cycle completion requirements
 */
export declare const calculateGlobalCycleRequirements: (rank: string) => {
    cycleSize: number;
    requiredUsers: number;
    payoutAmount: number;
};
/**
 * Calculate binary tree position
 */
export declare const calculateBinaryPosition: (parentPosition: number, side: "left" | "right") => number;
/**
 * Get parent position in binary tree
 */
export declare const getParentPosition: (position: number) => number;
/**
 * Check if position is left or right child
 */
export declare const getPositionSide: (position: number) => "left" | "right";
/**
 * Calculate level in binary tree from position
 */
export declare const calculateTreeLevel: (position: number) => number;
/**
 * Get all positions at a specific level
 */
export declare const getPositionsAtLevel: (level: number) => number[];
/**
 * Calculate compound interest for investment projections
 */
export declare const calculateCompoundInterest: (principal: number, rate: number, time: number, compoundingFrequency?: number) => number;
/**
 * Calculate ROI (Return on Investment)
 */
export declare const calculateROI: (initialInvestment: number, currentValue: number) => number;
/**
 * Calculate average income per day/week/month
 */
export declare const calculateAverageIncome: (totalIncome: number, days: number) => {
    daily: number;
    weekly: number;
    monthly: number;
};
/**
 * Calculate income distribution for team building
 */
export declare const calculateTeamIncomeDistribution: (totalTeamIncome: number, teamSize: number, leadershipBonus?: number) => {
    averagePerMember: number;
    leaderBonus: number;
    totalDistributed: number;
};
/**
 * Validate amount precision (max 2 decimal places)
 */
export declare const validateAmountPrecision: (amount: number) => boolean;
/**
 * Round number to two decimal places
 */
export declare const roundToTwoDecimals: (num: number) => number;
/**
 * Convert amount to cents for precise calculations
 */
export declare const toCents: (amount: number) => number;
/**
 * Convert cents back to dollars
 */
export declare const fromCents: (cents: number) => number;
/**
 * Safe addition for monetary calculations
 */
export declare const safeAdd: (...amounts: number[]) => number;
/**
 * Safe subtraction for monetary calculations
 */
export declare const safeSubtract: (minuend: number, subtrahend: number) => number;
/**
 * Safe multiplication for monetary calculations
 */
export declare const safeMultiply: (amount: number, multiplier: number) => number;
/**
 * Safe division for monetary calculations
 */
export declare const safeDivide: (dividend: number, divisor: number) => number;
/**
 * Format currency for display
 */
export declare const formatCurrency: (amount: number, currency?: string, locale?: string) => string;
/**
 * Parse currency string to number
 */
export declare const parseCurrency: (currencyString: string) => number;
//# sourceMappingURL=math.d.ts.map
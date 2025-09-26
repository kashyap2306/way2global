"use strict";
/**
 * Math utilities for MLM calculations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCurrency = exports.formatCurrency = exports.safeDivide = exports.safeMultiply = exports.safeSubtract = exports.safeAdd = exports.fromCents = exports.toCents = exports.roundToTwoDecimals = exports.validateAmountPrecision = exports.calculateTeamIncomeDistribution = exports.calculateAverageIncome = exports.calculateROI = exports.calculateCompoundInterest = exports.getPositionsAtLevel = exports.calculateTreeLevel = exports.getPositionSide = exports.getParentPosition = exports.calculateBinaryPosition = exports.calculateGlobalCycleRequirements = exports.getNextRankActivationAmount = exports.calculateWithdrawalDeductions = exports.calculateReTopupIncome = exports.calculateGlobalIncome = exports.calculateLevelIncome = exports.calculateReferralIncome = void 0;
const config_1 = require("../config");
/**
 * Calculate referral income (50% of activation amount)
 */
const calculateReferralIncome = (activationAmount) => {
    const percentage = config_1.mlmConfig.incomes.referral.percentage;
    return (0, exports.roundToTwoDecimals)((activationAmount * percentage) / 100);
};
exports.calculateReferralIncome = calculateReferralIncome;
/**
 * Calculate level income based on level and activation amount
 */
const calculateLevelIncome = (level, activationAmount) => {
    const levelPercentages = config_1.mlmConfig.incomes.level;
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
    return (0, exports.roundToTwoDecimals)((activationAmount * percentage) / 100);
};
exports.calculateLevelIncome = calculateLevelIncome;
/**
 * Calculate global income distribution
 */
const calculateGlobalIncome = (totalAmount, level, totalLevels = 10) => {
    if (level < 1 || level > totalLevels) {
        return 0;
    }
    // Equal distribution across all levels
    const amountPerLevel = totalAmount / totalLevels;
    return (0, exports.roundToTwoDecimals)(amountPerLevel);
};
exports.calculateGlobalIncome = calculateGlobalIncome;
/**
 * Calculate re-topup income (same as referral income)
 */
const calculateReTopupIncome = (activationAmount) => {
    return (0, exports.calculateReferralIncome)(activationAmount);
};
exports.calculateReTopupIncome = calculateReTopupIncome;
/**
 * Calculate withdrawal deductions based on method
 */
const calculateWithdrawalDeductions = (amount, method) => {
    let deductionPercentage = 0;
    switch (method) {
        case 'bank':
            deductionPercentage = config_1.mlmConfig.withdrawal.bankDeduction;
            break;
        case 'usdt':
            deductionPercentage = config_1.mlmConfig.withdrawal.usdtFee;
            break;
        case 'p2p':
            deductionPercentage = config_1.mlmConfig.withdrawal.p2pFee;
            break;
        case 'fund':
            deductionPercentage = config_1.mlmConfig.withdrawal.fundConversion;
            break;
    }
    const deduction = (0, exports.roundToTwoDecimals)((amount * deductionPercentage) / 100);
    const netAmount = (0, exports.roundToTwoDecimals)(amount - deduction);
    return {
        netAmount,
        deduction,
        deductionPercentage
    };
};
exports.calculateWithdrawalDeductions = calculateWithdrawalDeductions;
/**
 * Calculate next rank activation amount
 */
const getNextRankActivationAmount = (currentRank) => {
    const ranks = Object.keys(config_1.mlmConfig.ranks);
    const currentIndex = ranks.indexOf(currentRank);
    if (currentIndex === -1 || currentIndex === ranks.length - 1) {
        return null; // Invalid rank or already at highest rank
    }
    const nextRank = ranks[currentIndex + 1];
    return config_1.mlmConfig.ranks[nextRank].activationAmount;
};
exports.getNextRankActivationAmount = getNextRankActivationAmount;
/**
 * Calculate global cycle completion requirements
 */
const calculateGlobalCycleRequirements = (rank) => {
    const rankConfig = config_1.mlmConfig.ranks[rank];
    const activationAmount = (rankConfig === null || rankConfig === void 0 ? void 0 : rankConfig.activationAmount) || 0;
    // Cycle size is 2^10 = 1024 for all ranks
    const cycleSize = config_1.mlmConfig.incomes.global.cycleSize;
    // Required users to complete cycle (all positions filled)
    const requiredUsers = cycleSize;
    // Payout amount is 10% of activation amount
    const payoutAmount = (0, exports.roundToTwoDecimals)((activationAmount * config_1.mlmConfig.incomes.global.percentage) / 100);
    return {
        cycleSize,
        requiredUsers,
        payoutAmount
    };
};
exports.calculateGlobalCycleRequirements = calculateGlobalCycleRequirements;
/**
 * Calculate binary tree position
 */
const calculateBinaryPosition = (parentPosition, side) => {
    if (side === 'left') {
        return parentPosition * 2;
    }
    else {
        return (parentPosition * 2) + 1;
    }
};
exports.calculateBinaryPosition = calculateBinaryPosition;
/**
 * Get parent position in binary tree
 */
const getParentPosition = (position) => {
    return Math.floor(position / 2);
};
exports.getParentPosition = getParentPosition;
/**
 * Check if position is left or right child
 */
const getPositionSide = (position) => {
    return position % 2 === 0 ? 'left' : 'right';
};
exports.getPositionSide = getPositionSide;
/**
 * Calculate level in binary tree from position
 */
const calculateTreeLevel = (position) => {
    if (position <= 0)
        return 0;
    return Math.floor(Math.log2(position)) + 1;
};
exports.calculateTreeLevel = calculateTreeLevel;
/**
 * Get all positions at a specific level
 */
const getPositionsAtLevel = (level) => {
    if (level <= 0)
        return [];
    const startPosition = Math.pow(2, level - 1);
    const endPosition = Math.pow(2, level) - 1;
    const positions = [];
    for (let i = startPosition; i <= endPosition; i++) {
        positions.push(i);
    }
    return positions;
};
exports.getPositionsAtLevel = getPositionsAtLevel;
/**
 * Calculate compound interest for investment projections
 */
const calculateCompoundInterest = (principal, rate, time, compoundingFrequency = 1) => {
    const amount = principal * Math.pow((1 + rate / compoundingFrequency), compoundingFrequency * time);
    return (0, exports.roundToTwoDecimals)(amount);
};
exports.calculateCompoundInterest = calculateCompoundInterest;
/**
 * Calculate ROI (Return on Investment)
 */
const calculateROI = (initialInvestment, currentValue) => {
    if (initialInvestment <= 0)
        return 0;
    const roi = ((currentValue - initialInvestment) / initialInvestment) * 100;
    return (0, exports.roundToTwoDecimals)(roi);
};
exports.calculateROI = calculateROI;
/**
 * Calculate average income per day/week/month
 */
const calculateAverageIncome = (totalIncome, days) => {
    if (days <= 0) {
        return { daily: 0, weekly: 0, monthly: 0 };
    }
    const daily = (0, exports.roundToTwoDecimals)(totalIncome / days);
    const weekly = (0, exports.roundToTwoDecimals)(daily * 7);
    const monthly = (0, exports.roundToTwoDecimals)(daily * 30);
    return { daily, weekly, monthly };
};
exports.calculateAverageIncome = calculateAverageIncome;
/**
 * Calculate income distribution for team building
 */
const calculateTeamIncomeDistribution = (totalTeamIncome, teamSize, leadershipBonus = 0) => {
    if (teamSize <= 0) {
        return {
            averagePerMember: 0,
            leaderBonus: 0,
            totalDistributed: 0
        };
    }
    const averagePerMember = (0, exports.roundToTwoDecimals)(totalTeamIncome / teamSize);
    const leaderBonus = (0, exports.roundToTwoDecimals)((totalTeamIncome * leadershipBonus) / 100);
    const totalDistributed = (0, exports.roundToTwoDecimals)(totalTeamIncome + leaderBonus);
    return {
        averagePerMember,
        leaderBonus,
        totalDistributed
    };
};
exports.calculateTeamIncomeDistribution = calculateTeamIncomeDistribution;
/**
 * Validate amount precision (max 2 decimal places)
 */
const validateAmountPrecision = (amount) => {
    return Number.isFinite(amount) && Math.round(amount * 100) / 100 === amount;
};
exports.validateAmountPrecision = validateAmountPrecision;
/**
 * Round number to two decimal places
 */
const roundToTwoDecimals = (num) => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
};
exports.roundToTwoDecimals = roundToTwoDecimals;
/**
 * Convert amount to cents for precise calculations
 */
const toCents = (amount) => {
    return Math.round(amount * 100);
};
exports.toCents = toCents;
/**
 * Convert cents back to dollars
 */
const fromCents = (cents) => {
    return (0, exports.roundToTwoDecimals)(cents / 100);
};
exports.fromCents = fromCents;
/**
 * Safe addition for monetary calculations
 */
const safeAdd = (...amounts) => {
    const totalCents = amounts.reduce((sum, amount) => sum + (0, exports.toCents)(amount), 0);
    return (0, exports.fromCents)(totalCents);
};
exports.safeAdd = safeAdd;
/**
 * Safe subtraction for monetary calculations
 */
const safeSubtract = (minuend, subtrahend) => {
    const resultCents = (0, exports.toCents)(minuend) - (0, exports.toCents)(subtrahend);
    return (0, exports.fromCents)(resultCents);
};
exports.safeSubtract = safeSubtract;
/**
 * Safe multiplication for monetary calculations
 */
const safeMultiply = (amount, multiplier) => {
    const resultCents = Math.round((0, exports.toCents)(amount) * multiplier);
    return (0, exports.fromCents)(resultCents);
};
exports.safeMultiply = safeMultiply;
/**
 * Safe division for monetary calculations
 */
const safeDivide = (dividend, divisor) => {
    if (divisor === 0)
        return 0;
    const resultCents = Math.round((0, exports.toCents)(dividend) / divisor);
    return (0, exports.fromCents)(resultCents);
};
exports.safeDivide = safeDivide;
/**
 * Format currency for display
 */
const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};
exports.formatCurrency = formatCurrency;
/**
 * Parse currency string to number
 */
const parseCurrency = (currencyString) => {
    const numericString = currencyString.replace(/[^0-9.-]+/g, '');
    const amount = parseFloat(numericString);
    return isNaN(amount) ? 0 : (0, exports.roundToTwoDecimals)(amount);
};
exports.parseCurrency = parseCurrency;
//# sourceMappingURL=math.js.map
"use strict";
/**
 * MLM Income Engine - Core service for calculating and distributing incomes
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.incomeEngine = exports.IncomeEngine = void 0;
const admin = __importStar(require("firebase-admin"));
const math_1 = require("../utils/math");
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
const logger = (0, logger_1.createLogger)('IncomeEngine');
class IncomeEngine {
    constructor() {
        this.db = admin.firestore();
    }
    /**
     * Process referral income when a user activates
     */
    async processReferralIncome(activatorUID, sponsorUID, activationAmount, transactionId, rank) {
        try {
            const incomeAmount = (0, math_1.calculateReferralIncome)(activationAmount);
            if (incomeAmount <= 0) {
                await logger.warn(logger_1.LogCategory.MLM, 'Referral income calculation resulted in zero amount', sponsorUID, { activatorUID, activationAmount, rank });
                return;
            }
            // Create income record
            const incomeData = {
                uid: sponsorUID,
                type: 'referral',
                amount: incomeAmount,
                sourceUID: activatorUID,
                sourceTransactionId: transactionId,
                rank,
                status: 'pending',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                processedAt: null,
                metadata: {
                    activationAmount,
                    referralPercentage: config_1.mlmConfig.incomes.referral.percentage
                }
            };
            const incomeRef = await this.db.collection(config_1.collections.INCOMES).add(incomeData);
            // Update user's available balance
            await this.updateUserBalance(sponsorUID, incomeAmount, 'add');
            // Create income transaction
            await this.createIncomeTransaction(sponsorUID, incomeAmount, 'referral', incomeRef.id, `Referral income from ${activatorUID}`);
            await logger.info(logger_1.LogCategory.MLM, 'Referral income processed successfully', sponsorUID, {
                activatorUID,
                incomeAmount,
                activationAmount,
                rank,
                incomeId: incomeRef.id
            });
        }
        catch (error) {
            await logger.error(logger_1.LogCategory.MLM, 'Failed to process referral income', error, sponsorUID, { activatorUID, activationAmount, transactionId, rank });
            throw error;
        }
    }
    /**
     * Process level income distribution
     */
    async processLevelIncome(activatorUID, activationAmount, transactionId, rank) {
        try {
            // Get upline chain (6 levels)
            const uplineChain = await this.getUplineChain(activatorUID, 6);
            for (let i = 0; i < uplineChain.length; i++) {
                const level = i + 1;
                const uplineUID = uplineChain[i];
                const incomeAmount = (0, math_1.calculateLevelIncome)(level, activationAmount);
                if (incomeAmount <= 0)
                    continue;
                // Check if upline user is eligible for level income
                const isEligible = await this.checkLevelIncomeEligibility(uplineUID, rank);
                if (!isEligible)
                    continue;
                // Create income record
                const incomeData = {
                    uid: uplineUID,
                    type: 'level',
                    amount: incomeAmount,
                    sourceUID: activatorUID,
                    sourceTransactionId: transactionId,
                    level,
                    rank,
                    status: 'pending',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    processedAt: null,
                    metadata: {
                        activationAmount,
                        levelPercentage: this.getLevelPercentage(level)
                    }
                };
                const incomeRef = await this.db.collection(config_1.collections.INCOMES).add(incomeData);
                // Update user's available balance
                await this.updateUserBalance(uplineUID, incomeAmount, 'add');
                // Create income transaction
                await this.createIncomeTransaction(uplineUID, incomeAmount, 'level', incomeRef.id, `Level ${level} income from ${activatorUID}`);
                await logger.info(logger_1.LogCategory.MLM, `Level ${level} income processed`, uplineUID, {
                    activatorUID,
                    incomeAmount,
                    level,
                    rank,
                    incomeId: incomeRef.id
                });
            }
        }
        catch (error) {
            await logger.error(logger_1.LogCategory.MLM, 'Failed to process level income', error, activatorUID, { activationAmount, transactionId, rank });
            throw error;
        }
    }
    /**
     * Process global income cycles
     */
    async processGlobalIncome(activatorUID, activationAmount, transactionId, rank) {
        try {
            // Check if user is eligible for global income
            const isEligible = await this.checkGlobalIncomeEligibility(activatorUID, rank);
            if (!isEligible) {
                await logger.info(logger_1.LogCategory.MLM, 'User not eligible for global income', activatorUID, { rank });
                return;
            }
            // Add user to global cycle
            const cycleData = await this.addToGlobalCycle(activatorUID, rank);
            if (cycleData.isComplete) {
                // Process global cycle payout
                await this.processGlobalCyclePayout(cycleData);
            }
            await logger.info(logger_1.LogCategory.MLM, 'User added to global cycle', activatorUID, {
                rank,
                cycleId: cycleData.cycleId,
                position: cycleData.position,
                isComplete: cycleData.isComplete
            });
        }
        catch (error) {
            await logger.error(logger_1.LogCategory.MLM, 'Failed to process global income', error, activatorUID, { activationAmount, transactionId, rank });
            throw error;
        }
    }
    /**
     * Process re-topup income
     */
    async processReTopupIncome(activatorUID, sponsorUID, activationAmount, transactionId, rank) {
        try {
            const incomeAmount = (0, math_1.calculateReTopupIncome)(activationAmount);
            if (incomeAmount <= 0) {
                await logger.warn(logger_1.LogCategory.MLM, 'Re-topup income calculation resulted in zero amount', sponsorUID, { activatorUID, activationAmount, rank });
                return;
            }
            // Create income record
            const incomeData = {
                uid: sponsorUID,
                type: 'retopup',
                amount: incomeAmount,
                sourceUID: activatorUID,
                sourceTransactionId: transactionId,
                rank,
                status: 'pending',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                processedAt: null,
                metadata: {
                    activationAmount,
                    retopupPercentage: config_1.mlmConfig.incomes.referral.percentage
                }
            };
            const incomeRef = await this.db.collection(config_1.collections.INCOMES).add(incomeData);
            // Update user's available balance
            await this.updateUserBalance(sponsorUID, incomeAmount, 'add');
            // Create income transaction
            await this.createIncomeTransaction(sponsorUID, incomeAmount, 'retopup', incomeRef.id, `Re-topup income from ${activatorUID}`);
            await logger.info(logger_1.LogCategory.MLM, 'Re-topup income processed successfully', sponsorUID, {
                activatorUID,
                incomeAmount,
                activationAmount,
                rank,
                incomeId: incomeRef.id
            });
        }
        catch (error) {
            await logger.error(logger_1.LogCategory.MLM, 'Failed to process re-topup income', error, sponsorUID, { activatorUID, activationAmount, transactionId, rank });
            throw error;
        }
    }
    /**
     * Get upline chain for level income calculation
     */
    async getUplineChain(userUID, levels) {
        const uplineChain = [];
        let currentUID = userUID;
        for (let i = 0; i < levels; i++) {
            const userDoc = await this.db.collection(config_1.collections.USERS).doc(currentUID).get();
            if (!userDoc.exists)
                break;
            const userData = userDoc.data();
            const sponsorUID = userData === null || userData === void 0 ? void 0 : userData.sponsorUID;
            if (!sponsorUID)
                break;
            uplineChain.push(sponsorUID);
            currentUID = sponsorUID;
        }
        return uplineChain;
    }
    /**
     * Check if user is eligible for level income
     */
    async checkLevelIncomeEligibility(userUID, rank) {
        const userDoc = await this.db.collection(config_1.collections.USERS).doc(userUID).get();
        if (!userDoc.exists)
            return false;
        const userData = userDoc.data();
        return (userData === null || userData === void 0 ? void 0 : userData.isActive) === true && (userData === null || userData === void 0 ? void 0 : userData.currentRank);
    }
    /**
     * Check if user is eligible for global income
     */
    async checkGlobalIncomeEligibility(userUID, rank) {
        var _a;
        const rankConfig = config_1.mlmConfig.ranks[rank];
        return ((_a = rankConfig === null || rankConfig === void 0 ? void 0 : rankConfig.benefits) === null || _a === void 0 ? void 0 : _a.globalIncome) === true;
    }
    /**
     * Add user to global cycle
     */
    async addToGlobalCycle(userUID, rank) {
        // Find or create active cycle for this rank
        const activeCycleQuery = await this.db
            .collection(config_1.collections.GLOBAL_CYCLES)
            .where('rank', '==', rank)
            .where('isComplete', '==', false)
            .orderBy('createdAt', 'asc')
            .limit(1)
            .get();
        let cycleDoc;
        let cycleData;
        if (activeCycleQuery.empty) {
            // Create new cycle
            const newCycleData = {
                rank,
                participants: [userUID],
                totalAmount: 0,
                isComplete: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                completedAt: null
            };
            cycleDoc = await this.db.collection(config_1.collections.GLOBAL_CYCLES).add(newCycleData);
            cycleData = Object.assign(Object.assign({}, newCycleData), { id: cycleDoc.id });
        }
        else {
            // Add to existing cycle
            cycleDoc = activeCycleQuery.docs[0];
            cycleData = Object.assign(Object.assign({}, cycleDoc.data()), { id: cycleDoc.id });
            // Add user to participants
            await cycleDoc.ref.update({
                participants: admin.firestore.FieldValue.arrayUnion(userUID)
            });
            cycleData.participants.push(userUID);
        }
        const position = cycleData.participants.length;
        const cycleSize = config_1.mlmConfig.incomes.global.cycleSize;
        const isComplete = position >= cycleSize;
        if (isComplete) {
            await cycleDoc.ref.update({
                isComplete: true,
                completedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        return {
            cycleId: cycleData.id,
            rank,
            position,
            level: Math.ceil(position / Math.pow(2, Math.floor(Math.log2(position)))),
            participants: cycleData.participants,
            totalAmount: cycleData.totalAmount,
            isComplete
        };
    }
    /**
     * Process global cycle payout
     */
    async processGlobalCyclePayout(cycleData) {
        const rankConfig = config_1.mlmConfig.ranks[cycleData.rank];
        const payoutAmount = (0, math_1.roundToTwoDecimals)((rankConfig.activationAmount * config_1.mlmConfig.incomes.global.percentage) / 100);
        // Distribute payout across 10 levels
        const totalLevels = config_1.mlmConfig.incomes.global.levels;
        for (let level = 1; level <= totalLevels; level++) {
            const levelParticipants = this.getParticipantsAtLevel(cycleData.participants, level);
            for (const participantUID of levelParticipants) {
                const incomeAmount = (0, math_1.calculateGlobalIncome)(payoutAmount, level, totalLevels);
                if (incomeAmount <= 0)
                    continue;
                // Create income record
                const incomeData = {
                    uid: participantUID,
                    type: 'global',
                    amount: incomeAmount,
                    sourceUID: cycleData.cycleId,
                    sourceTransactionId: cycleData.cycleId,
                    level,
                    rank: cycleData.rank,
                    status: 'pending',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    processedAt: null,
                    metadata: {
                        cycleId: cycleData.cycleId,
                        globalLevel: level,
                        totalParticipants: cycleData.participants.length
                    }
                };
                const incomeRef = await this.db.collection(config_1.collections.INCOMES).add(incomeData);
                // Update user's available balance
                await this.updateUserBalance(participantUID, incomeAmount, 'add');
                // Create income transaction
                await this.createIncomeTransaction(participantUID, incomeAmount, 'global', incomeRef.id, `Global cycle payout - Level ${level}`);
            }
        }
        // Check for auto top-up and RE-ID generation
        await this.processAutoTopUpAndREID(cycleData);
        await logger.info(logger_1.LogCategory.MLM, 'Global cycle payout processed', undefined, {
            cycleId: cycleData.cycleId,
            rank: cycleData.rank,
            participants: cycleData.participants.length,
            payoutAmount
        });
    }
    /**
     * Get participants at specific level in binary tree
     */
    getParticipantsAtLevel(participants, level) {
        const startIndex = Math.pow(2, level - 1) - 1;
        const endIndex = Math.pow(2, level) - 2;
        return participants.slice(startIndex, endIndex + 1);
    }
    /**
     * Process auto top-up and RE-ID generation
     */
    async processAutoTopUpAndREID(cycleData) {
        if (!config_1.mlmConfig.globalCycle.autoTopupEnabled)
            return;
        const firstParticipant = cycleData.participants[0];
        const currentRank = cycleData.rank;
        // Get next rank
        const ranks = Object.keys(config_1.mlmConfig.ranks);
        const currentIndex = ranks.indexOf(currentRank);
        if (currentIndex < ranks.length - 1) {
            const nextRank = ranks[currentIndex + 1];
            const nextRankConfig = config_1.mlmConfig.ranks[nextRank];
            // Auto top-up to next rank
            await this.processAutoTopUp(firstParticipant, nextRank, nextRankConfig.activationAmount);
        }
        else if (config_1.mlmConfig.globalCycle.reidGenerationEnabled) {
            // Generate RE-ID for infinite cycles
            await this.generateREID(firstParticipant, currentRank);
        }
    }
    /**
     * Process auto top-up to next rank
     */
    async processAutoTopUp(userUID, nextRank, amount) {
        try {
            // Create auto top-up transaction
            const transactionData = {
                uid: userUID,
                type: 'auto_topup',
                amount,
                rank: nextRank,
                status: 'completed',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                metadata: {
                    autoGenerated: true,
                    previousRank: nextRank
                }
            };
            const transactionRef = await this.db.collection(config_1.collections.TRANSACTIONS).add(transactionData);
            // Update user rank
            await this.db.collection(config_1.collections.USERS).doc(userUID).update({
                currentRank: nextRank,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // Process incomes for auto top-up
            await this.processAllIncomes(userUID, amount, transactionRef.id, nextRank, true);
            await logger.info(logger_1.LogCategory.MLM, 'Auto top-up processed successfully', userUID, { nextRank, amount, transactionId: transactionRef.id });
        }
        catch (error) {
            await logger.error(logger_1.LogCategory.MLM, 'Failed to process auto top-up', error, userUID, { nextRank, amount });
        }
    }
    /**
     * Generate RE-ID for infinite cycles
     */
    async generateREID(userUID, rank) {
        try {
            const reidData = {
                originalUID: userUID,
                rank,
                isActive: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                cycleCount: 1,
                totalEarnings: 0
            };
            const reidRef = await this.db.collection(config_1.collections.REIDS).add(reidData);
            await logger.info(logger_1.LogCategory.MLM, 'RE-ID generated successfully', userUID, { rank, reidId: reidRef.id });
        }
        catch (error) {
            await logger.error(logger_1.LogCategory.MLM, 'Failed to generate RE-ID', error, userUID, { rank });
        }
    }
    /**
     * Process all income types for a transaction
     */
    async processAllIncomes(activatorUID, activationAmount, transactionId, rank, isReTopup = false) {
        try {
            // Get user's sponsor
            const userDoc = await this.db.collection(config_1.collections.USERS).doc(activatorUID).get();
            const userData = userDoc.data();
            const sponsorUID = userData === null || userData === void 0 ? void 0 : userData.sponsorUID;
            // Process referral/re-topup income
            if (sponsorUID) {
                if (isReTopup) {
                    await this.processReTopupIncome(activatorUID, sponsorUID, activationAmount, transactionId, rank);
                }
                else {
                    await this.processReferralIncome(activatorUID, sponsorUID, activationAmount, transactionId, rank);
                }
            }
            // Process level income
            await this.processLevelIncome(activatorUID, activationAmount, transactionId, rank);
            // Process global income (if eligible)
            await this.processGlobalIncome(activatorUID, activationAmount, transactionId, rank);
            await logger.info(logger_1.LogCategory.MLM, 'All incomes processed successfully', activatorUID, {
                activationAmount,
                transactionId,
                rank,
                isReTopup,
                sponsorUID
            });
        }
        catch (error) {
            await logger.error(logger_1.LogCategory.MLM, 'Failed to process all incomes', error, activatorUID, { activationAmount, transactionId, rank, isReTopup });
            throw error;
        }
    }
    /**
     * Update user balance
     */
    async updateUserBalance(userUID, amount, operation) {
        const userRef = this.db.collection(config_1.collections.USERS).doc(userUID);
        await this.db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new Error(`User ${userUID} not found`);
            }
            const userData = userDoc.data();
            const currentBalance = (userData === null || userData === void 0 ? void 0 : userData.availableBalance) || 0;
            const totalEarnings = (userData === null || userData === void 0 ? void 0 : userData.totalEarnings) || 0;
            let newBalance;
            let newTotalEarnings;
            if (operation === 'add') {
                newBalance = (0, math_1.safeAdd)(currentBalance, amount);
                newTotalEarnings = (0, math_1.safeAdd)(totalEarnings, amount);
            }
            else {
                newBalance = Math.max(0, currentBalance - amount);
                newTotalEarnings = totalEarnings; // Don't change total earnings on subtract
            }
            transaction.update(userRef, {
                availableBalance: newBalance,
                totalEarnings: newTotalEarnings,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
    }
    /**
     * Create income transaction record
     */
    async createIncomeTransaction(userUID, amount, type, incomeId, description) {
        const transactionData = {
            uid: userUID,
            type: 'income',
            subType: type,
            amount,
            status: 'completed',
            description,
            incomeId,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await this.db.collection(config_1.collections.INCOME_TRANSACTIONS).add(transactionData);
    }
    /**
     * Get level percentage for level income calculation
     */
    getLevelPercentage(level) {
        const levelPercentages = config_1.mlmConfig.incomes.level;
        switch (level) {
            case 1: return levelPercentages.L1;
            case 2: return levelPercentages.L2;
            case 3: return levelPercentages.L3;
            case 4: return levelPercentages.L4;
            case 5: return levelPercentages.L5;
            case 6: return levelPercentages.L6;
            default: return 0;
        }
    }
}
exports.IncomeEngine = IncomeEngine;
// Export singleton instance
exports.incomeEngine = new IncomeEngine();
//# sourceMappingURL=incomeEngine.js.map
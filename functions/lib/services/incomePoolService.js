"use strict";
/**
 * Income Pool Service - Manages user-centric income pools for each rank
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
exports.incomePoolService = exports.IncomePoolService = void 0;
const admin = __importStar(require("firebase-admin"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class IncomePoolService {
    constructor() {
        this.db = admin.firestore();
    }
    /**
     * Create income pool for user when they activate a rank
     */
    async createIncomePool(userId, rank, directReferralsCount = 0) {
        try {
            // Get platform settings for direct referral requirement
            const settings = await this.getPlatformSettings();
            const requiredDirectReferrals = settings?.directReferralRequirement || 2;
            const poolData = {
                rank,
                userId,
                poolIncome: 0,
                isLocked: true,
                canClaim: directReferralsCount >= requiredDirectReferrals,
                directReferralsCount,
                requiredDirectReferrals,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            const poolRef = await this.db.collection(config_1.collections.INCOME_POOLS).add(poolData);
            await logger_1.logger.info(logger_1.LogCategory.INCOME, 'Income pool created successfully', userId, { rank, poolId: poolRef.id, requiredDirectReferrals });
            return poolRef.id;
        }
        catch (error) {
            await logger_1.logger.error(logger_1.LogCategory.INCOME, 'Failed to create income pool', error, userId, { rank });
            throw error;
        }
    }
    /**
     * Add income to user's pool for specific rank
     */
    async addIncomeToPool(userId, rank, amount) {
        try {
            // Find user's income pool for this rank
            const poolQuery = await this.db
                .collection(config_1.collections.INCOME_POOLS)
                .where('userId', '==', userId)
                .where('rank', '==', rank)
                .limit(1)
                .get();
            if (poolQuery.empty) {
                // Create new pool if doesn't exist
                await this.createIncomePool(userId, rank);
                return this.addIncomeToPool(userId, rank, amount);
            }
            const poolDoc = poolQuery.docs[0];
            const currentIncome = poolDoc.data().poolIncome || 0;
            await poolDoc.ref.update({
                poolIncome: currentIncome + amount,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            await logger_1.logger.info(logger_1.LogCategory.INCOME, 'Income added to pool', userId, { rank, amount, newTotal: currentIncome + amount });
        }
        catch (error) {
            await logger_1.logger.error(logger_1.LogCategory.INCOME, 'Failed to add income to pool', error, userId, { rank, amount });
            throw error;
        }
    }
    /**
     * Update direct referrals count and check if user can claim
     */
    async updateDirectReferrals(userId, newCount) {
        try {
            const settings = await this.getPlatformSettings();
            const requiredDirectReferrals = settings?.directReferralRequirement || 2;
            // Update all user's income pools
            const poolsQuery = await this.db
                .collection(config_1.collections.INCOME_POOLS)
                .where('userId', '==', userId)
                .get();
            const batch = this.db.batch();
            poolsQuery.docs.forEach(doc => {
                const canClaim = newCount >= requiredDirectReferrals;
                batch.update(doc.ref, {
                    directReferralsCount: newCount,
                    canClaim,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            });
            await batch.commit();
            await logger_1.logger.info(logger_1.LogCategory.INCOME, 'Direct referrals count updated', userId, { newCount, requiredDirectReferrals, canClaim: newCount >= requiredDirectReferrals });
        }
        catch (error) {
            await logger_1.logger.error(logger_1.LogCategory.INCOME, 'Failed to update direct referrals', error, userId, { newCount });
            throw error;
        }
    }
    /**
     * Claim income from pool (move from locked to available balance)
     */
    async claimPoolIncome(userId, rank) {
        try {
            // Find user's income pool for this rank
            const poolQuery = await this.db
                .collection(config_1.collections.INCOME_POOLS)
                .where('userId', '==', userId)
                .where('rank', '==', rank)
                .where('canClaim', '==', true)
                .where('isLocked', '==', true)
                .limit(1)
                .get();
            if (poolQuery.empty) {
                throw new Error('No claimable income pool found for this rank');
            }
            const poolDoc = poolQuery.docs[0];
            const poolData = poolDoc.data();
            const claimAmount = poolData.poolIncome;
            if (claimAmount <= 0) {
                throw new Error('No income available to claim');
            }
            // Start transaction to update pool and user balance
            const result = await this.db.runTransaction(async (transaction) => {
                // Update pool status
                transaction.update(poolDoc.ref, {
                    isLocked: false,
                    claimedAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                // Update user's available balance
                const userRef = this.db.collection(config_1.collections.USERS).doc(userId);
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists) {
                    throw new Error('User not found');
                }
                const userData = userDoc.data();
                const currentAvailable = userData?.availableBalance || 0;
                const currentLocked = userData?.lockedBalance || 0;
                transaction.update(userRef, {
                    availableBalance: currentAvailable + claimAmount,
                    lockedBalance: Math.max(0, currentLocked - claimAmount),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                return claimAmount;
            });
            await logger_1.logger.info(logger_1.LogCategory.INCOME, 'Pool income claimed successfully', userId, { rank, claimAmount });
            return result;
        }
        catch (error) {
            await logger_1.logger.error(logger_1.LogCategory.INCOME, 'Failed to claim pool income', error, userId, { rank });
            throw error;
        }
    }
    /**
     * Get user's income pools
     */
    async getUserIncomePools(userId) {
        try {
            const poolsQuery = await this.db
                .collection(config_1.collections.INCOME_POOLS)
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .get();
            return poolsQuery.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        }
        catch (error) {
            await logger_1.logger.error(logger_1.LogCategory.INCOME, 'Failed to get user income pools', error, userId);
            throw error;
        }
    }
    /**
     * Get platform settings
     */
    async getPlatformSettings() {
        try {
            const settingsQuery = await this.db
                .collection(config_1.collections.SETTINGS)
                .limit(1)
                .get();
            if (settingsQuery.empty) {
                return null;
            }
            const doc = settingsQuery.docs[0];
            return {
                id: doc.id,
                ...doc.data()
            };
        }
        catch (error) {
            await logger_1.logger.error(logger_1.LogCategory.SYSTEM, 'Failed to get platform settings', error);
            return null;
        }
    }
    /**
     * Update platform settings
     */
    async updatePlatformSettings(settings) {
        try {
            const settingsQuery = await this.db
                .collection(config_1.collections.SETTINGS)
                .limit(1)
                .get();
            if (settingsQuery.empty) {
                // Create new settings document
                await this.db.collection(config_1.collections.SETTINGS).add({
                    ...settings,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            else {
                // Update existing settings
                const doc = settingsQuery.docs[0];
                await doc.ref.update({
                    ...settings,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            await logger_1.logger.info(logger_1.LogCategory.SYSTEM, 'Platform settings updated', undefined, settings);
        }
        catch (error) {
            await logger_1.logger.error(logger_1.LogCategory.SYSTEM, 'Failed to update platform settings', error, undefined, settings);
            throw error;
        }
    }
}
exports.IncomePoolService = IncomePoolService;
exports.incomePoolService = new IncomePoolService();
//# sourceMappingURL=incomePoolService.js.map
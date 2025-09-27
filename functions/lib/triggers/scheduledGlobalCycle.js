"use strict";
/**
 * Scheduled Function - Process global cycles and payouts
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
exports.triggerGlobalCycleProcessing = exports.scheduledGlobalCycle = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
const payoutProcessor_1 = require("../services/payoutProcessor");
const logger = (0, logger_1.createLogger)('ScheduledGlobalCycle');
/**
 * Scheduled function to process global cycles every 5 minutes
 */
exports.scheduledGlobalCycle = functions.pubsub
    .schedule('every 5 minutes')
    .onRun(async (context) => {
    try {
        await logger.info(logger_1.LogCategory.SYSTEM, 'Starting scheduled global cycle processing');
        // Process completed global cycles
        await processCompletedGlobalCycles();
        // Process payout queue
        await payoutProcessor_1.payoutProcessor.processPayoutQueue();
        // Clean up old data
        await cleanupOldData();
        await logger.info(logger_1.LogCategory.SYSTEM, 'Scheduled global cycle processing completed');
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.SYSTEM, 'Scheduled global cycle processing failed', error);
        throw error;
    }
});
/**
 * Process completed global cycles that haven't been processed yet
 */
async function processCompletedGlobalCycles() {
    const db = admin.firestore();
    try {
        // Get completed cycles that haven't been processed
        const completedCycles = await db
            .collection(config_1.collections.GLOBAL_CYCLES)
            .where('isComplete', '==', true)
            .where('processed', '==', false)
            .limit(10)
            .get();
        if (completedCycles.empty) {
            await logger.debug(logger_1.LogCategory.MLM, 'No completed cycles to process');
            return;
        }
        await logger.info(logger_1.LogCategory.MLM, `Processing ${completedCycles.size} completed global cycles`);
        for (const cycleDoc of completedCycles.docs) {
            try {
                await processSingleGlobalCycle(cycleDoc.id, cycleDoc.data());
            }
            catch (error) {
                await logger.error(logger_1.LogCategory.MLM, 'Failed to process single global cycle', error, undefined, { cycleId: cycleDoc.id });
                // Continue with other cycles
            }
        }
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.MLM, 'Failed to process completed global cycles', error);
        throw error;
    }
}
/**
 * Process a single global cycle
 */
async function processSingleGlobalCycle(cycleId, cycleData) {
    const db = admin.firestore();
    try {
        const { rank, participants } = cycleData;
        await logger.info(logger_1.LogCategory.MLM, 'Processing global cycle', undefined, {
            cycleId,
            rank,
            participantCount: participants.length
        });
        // Distribute global income to all participants
        await distributeGlobalIncome(cycleId, cycleData);
        // Handle auto top-up for the first participant
        await handleAutoTopUp(participants[0], rank);
        // Generate RE-ID if at highest rank
        await handleREIDGeneration(participants[0], rank);
        // Mark cycle as processed
        await db.collection(config_1.collections.GLOBAL_CYCLES).doc(cycleId).update({
            processed: true,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        await logger.info(logger_1.LogCategory.MLM, 'Global cycle processed successfully', undefined, { cycleId, rank });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.MLM, 'Failed to process global cycle', error, undefined, { cycleId });
        throw error;
    }
}
/**
 * Distribute global income to cycle participants
 */
async function distributeGlobalIncome(cycleId, cycleData) {
    const { rank, participants } = cycleData;
    const rankConfig = config_1.mlmConfig.ranks[rank];
    if (!rankConfig) {
        throw new Error(`Rank configuration not found for ${rank}`);
    }
    const totalPayout = (rankConfig.activationAmount * config_1.mlmConfig.incomes.global.percentage) / 100;
    const levels = config_1.mlmConfig.incomes.global.levels;
    const payoutPerLevel = totalPayout / levels;
    try {
        // Distribute across 10 levels
        for (let level = 1; level <= levels; level++) {
            const levelParticipants = getLevelParticipants(participants, level);
            for (const participantUID of levelParticipants) {
                await createGlobalIncome(participantUID, payoutPerLevel, level, rank, cycleId);
            }
        }
        await logger.info(logger_1.LogCategory.MLM, 'Global income distributed', undefined, {
            cycleId,
            rank,
            totalPayout,
            levels,
            participantCount: participants.length
        });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.MLM, 'Failed to distribute global income', error, undefined, { cycleId, rank });
        throw error;
    }
}
/**
 * Get participants at specific level in binary tree structure
 */
function getLevelParticipants(participants, level) {
    // Binary tree level calculation
    const startIndex = Math.pow(2, level - 1) - 1;
    const endIndex = Math.min(Math.pow(2, level) - 2, participants.length - 1);
    if (startIndex > participants.length - 1) {
        return [];
    }
    return participants.slice(startIndex, endIndex + 1);
}
/**
 * Create global income record
 */
async function createGlobalIncome(uid, amount, level, rank, cycleId) {
    const db = admin.firestore();
    try {
        // Create income record
        const incomeData = {
            uid,
            type: 'global',
            amount,
            sourceUID: cycleId,
            sourceTransactionId: cycleId,
            level,
            rank,
            status: 'completed',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            metadata: {
                cycleId,
                globalLevel: level,
                cycleRank: rank
            }
        };
        const incomeRef = await db.collection(config_1.collections.INCOMES).add(incomeData);
        // Update user's available balance
        await db.runTransaction(async (transaction) => {
            const userRef = db.collection(config_1.collections.USERS).doc(uid);
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new Error(`User ${uid} not found`);
            }
            const userData = userDoc.data();
            const currentBalance = userData?.availableBalance || 0;
            const totalEarnings = userData?.totalEarnings || 0;
            transaction.update(userRef, {
                availableBalance: currentBalance + amount,
                totalEarnings: totalEarnings + amount,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
        // Create income transaction
        const transactionData = {
            uid,
            type: 'income',
            subType: 'global',
            amount,
            status: 'completed',
            description: `Global cycle payout - Level ${level}`,
            incomeId: incomeRef.id,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await db.collection(config_1.collections.INCOME_TRANSACTIONS).add(transactionData);
        await logger.debug(logger_1.LogCategory.MLM, 'Global income created', uid, { amount, level, rank, cycleId });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.MLM, 'Failed to create global income', error, uid, { amount, level, rank, cycleId });
        throw error;
    }
}
/**
 * Handle auto top-up for cycle completion
 */
async function handleAutoTopUp(userUID, currentRank) {
    if (!config_1.mlmConfig.globalCycle.autoTopupEnabled) {
        return;
    }
    try {
        // Get next rank
        const ranks = Object.keys(config_1.mlmConfig.ranks);
        const currentIndex = ranks.indexOf(currentRank);
        if (currentIndex < ranks.length - 1) {
            const nextRank = ranks[currentIndex + 1];
            const nextRankConfig = config_1.mlmConfig.ranks[nextRank];
            // Create auto top-up transaction
            const transactionData = {
                uid: userUID,
                type: 'auto_topup',
                amount: nextRankConfig.activationAmount,
                rank: nextRank,
                status: 'completed',
                description: `Auto top-up to ${nextRank} rank`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
                metadata: {
                    autoGenerated: true,
                    previousRank: currentRank,
                    triggeredBy: 'global_cycle_completion'
                }
            };
            await admin.firestore()
                .collection(config_1.collections.TRANSACTIONS)
                .add(transactionData);
            await logger.info(logger_1.LogCategory.MLM, 'Auto top-up transaction created', userUID, {
                previousRank: currentRank,
                nextRank,
                amount: nextRankConfig.activationAmount
            });
        }
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.MLM, 'Failed to handle auto top-up', error, userUID, { currentRank });
        // Don't throw error, auto top-up failure shouldn't block cycle processing
    }
}
/**
 * Handle RE-ID generation for infinite cycles
 */
async function handleREIDGeneration(userUID, rank) {
    if (!config_1.mlmConfig.globalCycle.reidGenerationEnabled) {
        return;
    }
    try {
        // Check if this is the highest rank
        const ranks = Object.keys(config_1.mlmConfig.ranks);
        const isHighestRank = ranks.indexOf(rank) === ranks.length - 1;
        if (isHighestRank) {
            // Generate RE-ID
            const reidData = {
                originalUID: userUID,
                rank,
                isActive: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                cycleCount: 1,
                totalEarnings: 0,
                metadata: {
                    triggeredBy: 'global_cycle_completion',
                    parentCycleRank: rank
                }
            };
            await admin.firestore()
                .collection(config_1.collections.REIDS)
                .add(reidData);
            await logger.info(logger_1.LogCategory.MLM, 'RE-ID generated for infinite cycles', userUID, { rank });
        }
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.MLM, 'Failed to generate RE-ID', error, userUID, { rank });
        // Don't throw error, RE-ID generation failure shouldn't block cycle processing
    }
}
/**
 * Clean up old data
 */
async function cleanupOldData() {
    const db = admin.firestore();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    try {
        // Clean up old completed cycles
        const oldCycles = await db
            .collection(config_1.collections.GLOBAL_CYCLES)
            .where('isComplete', '==', true)
            .where('processed', '==', true)
            .where('completedAt', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
            .limit(50)
            .get();
        if (!oldCycles.empty) {
            const batch = db.batch();
            oldCycles.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            await logger.info(logger_1.LogCategory.SYSTEM, `Cleaned up ${oldCycles.size} old global cycles`);
        }
        // Clean up old processed income transactions
        const oldIncomeTransactions = await db
            .collection(config_1.collections.INCOME_TRANSACTIONS)
            .where('status', '==', 'completed')
            .where('createdAt', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
            .limit(100)
            .get();
        if (!oldIncomeTransactions.empty) {
            const batch = db.batch();
            oldIncomeTransactions.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            await logger.info(logger_1.LogCategory.SYSTEM, `Cleaned up ${oldIncomeTransactions.size} old income transactions`);
        }
    }
    catch (error) {
        await logger.warn(logger_1.LogCategory.SYSTEM, 'Failed to clean up old data', undefined, { error: error.message });
        // Don't throw error, cleanup failure shouldn't block main processing
    }
}
/**
 * Manual trigger for global cycle processing (for testing)
 */
exports.triggerGlobalCycleProcessing = functions.https.onCall(async (data, context) => {
    // Verify admin access
    if (!context.auth?.token?.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can trigger global cycle processing');
    }
    try {
        await logger.info(logger_1.LogCategory.SYSTEM, 'Manual global cycle processing triggered', context.auth.uid);
        await processCompletedGlobalCycles();
        await payoutProcessor_1.payoutProcessor.processPayoutQueue();
        return {
            success: true,
            message: 'Global cycle processing completed successfully',
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.SYSTEM, 'Manual global cycle processing failed', error, context.auth?.uid);
        throw new functions.https.HttpsError('internal', 'Failed to process global cycles', error);
    }
});
//# sourceMappingURL=scheduledGlobalCycle.js.map
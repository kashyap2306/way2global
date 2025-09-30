"use strict";
/**
 * API endpoint for rank activation
 * Creates income pools and processes user-centric income system
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
exports.activateRankHttp = exports.activateRank = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
const newIncomeEngine_1 = require("../services/newIncomeEngine");
const logger = (0, logger_1.createLogger)('ActivateRank');
exports.activateRank = functions.https.onCall(async (data, context) => {
    try {
        // Verify authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to activate ranks');
        }
        const userUID = context.auth.uid;
        const { rank, activateAllRanks = false, transactionHash, paymentMethod } = data;
        if (!rank) {
            throw new functions.https.HttpsError('invalid-argument', 'Rank is required');
        }
        const db = admin.firestore();
        // Get user data
        const userDoc = await db.collection(config_1.collections.USERS).doc(userUID).get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }
        const userData = userDoc.data();
        // Determine which ranks to activate
        const ranksToActivate = [];
        const rankKeys = Object.keys(config_1.mlmConfig.ranks);
        if (activateAllRanks) {
            // Activate all ranks from the specified rank onwards
            const startIndex = rankKeys.indexOf(rank);
            if (startIndex === -1) {
                throw new functions.https.HttpsError('invalid-argument', 'Invalid rank specified');
            }
            ranksToActivate.push(...rankKeys.slice(startIndex));
        }
        else {
            // Activate only the specified rank
            if (!config_1.mlmConfig.ranks[rank]) {
                throw new functions.https.HttpsError('invalid-argument', 'Invalid rank specified');
            }
            ranksToActivate.push(rank);
        }
        // Calculate total cost
        let totalCost = 0;
        const activationDetails = [];
        for (const rankKey of ranksToActivate) {
            const rankConfig = config_1.mlmConfig.ranks[rankKey];
            // Check if rank is already activated
            const isAlreadyActive = userData.rankActivations?.[rankKey]?.isActive;
            if (!isAlreadyActive) {
                totalCost += rankConfig.activationAmount;
                activationDetails.push({
                    rank: rankKey,
                    cost: rankConfig.activationAmount
                });
            }
        }
        if (totalCost === 0) {
            throw new functions.https.HttpsError('failed-precondition', 'All specified ranks are already activated');
        }
        // Verify user has sufficient balance if paying from wallet
        if (paymentMethod === 'wallet') {
            const availableBalance = userData.availableBalance || 0;
            if (availableBalance < totalCost) {
                throw new functions.https.HttpsError('failed-precondition', JSON.stringify({
                    error: 'insufficient_balance',
                    message: 'Insufficient balance for rank activation',
                    details: {
                        required: totalCost,
                        available: availableBalance,
                        shortfall: totalCost - availableBalance
                    }
                }));
            }
        }
        const poolIds = [];
        const activatedRanks = [];
        // Process activations in a transaction
        await db.runTransaction(async (transaction) => {
            // Re-check balance atomically within transaction
            if (paymentMethod === 'wallet') {
                const userDocSnapshot = await transaction.get(userDoc.ref);
                const currentUserData = userDocSnapshot.data();
                const currentAvailableBalance = currentUserData.availableBalance || 0;
                if (currentAvailableBalance < totalCost) {
                    throw new functions.https.HttpsError('failed-precondition', JSON.stringify({
                        error: 'insufficient_balance',
                        message: 'Insufficient balance for rank activation (atomic check)',
                        details: {
                            required: totalCost,
                            available: currentAvailableBalance,
                            shortfall: totalCost - currentAvailableBalance
                        }
                    }));
                }
                // Deduct from wallet
                transaction.update(userDoc.ref, {
                    availableBalance: admin.firestore.FieldValue.increment(-totalCost)
                });
            }
            // Create activation transaction record
            const activationTransactionRef = db.collection(config_1.collections.TRANSACTIONS).doc();
            transaction.set(activationTransactionRef, {
                uid: userUID,
                type: 'rank_activation',
                amount: totalCost,
                status: 'completed',
                description: `Rank activation: ${ranksToActivate.join(', ')}`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                metadata: {
                    ranks: ranksToActivate,
                    paymentMethod,
                    transactionHash: transactionHash || null,
                    activationDetails
                }
            });
            // Process each rank activation
            for (const detail of activationDetails) {
                const { rank: rankKey, cost } = detail;
                // Create income pool
                const poolRef = db.collection(config_1.collections.INCOME_POOLS).doc();
                const poolData = {
                    id: poolRef.id,
                    userUID,
                    rank: rankKey,
                    poolIncome: 0,
                    maxPoolIncome: cost * 100, // 100x activation amount
                    isLocked: true,
                    canClaim: false,
                    directReferralsCount: userData.directReferralsCount || 0,
                    requiredDirectReferrals: 2, // Default, will be updated from settings
                    activatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    lastIncomeAt: null,
                    claimedAt: null,
                    metadata: {
                        activationAmount: cost,
                        transactionId: activationTransactionRef.id
                    }
                };
                transaction.set(poolRef, poolData);
                poolIds.push(poolRef.id);
                // Update user's rank activation status
                transaction.update(userDoc.ref, {
                    [`rankActivations.${rankKey}`]: {
                        isActive: true,
                        activatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        poolId: poolRef.id
                    }
                });
                activatedRanks.push(rankKey);
            }
        });
        // Process referral income for sponsor (if user has a sponsor)
        if (userData.sponsorUID) {
            try {
                await newIncomeEngine_1.newIncomeEngine.processReferralIncome(userData.sponsorUID, userUID, totalCost, `activation_${Date.now()}`);
            }
            catch (error) {
                await logger.warn(logger_1.LogCategory.MLM, 'Failed to process referral income for sponsor', userUID, {
                    sponsorUID: userData.sponsorUID,
                    error: error instanceof Error ? error.message : String(error),
                    totalCost
                });
            }
        }
        // Update direct referral counts for all users
        try {
            await newIncomeEngine_1.newIncomeEngine.updateDirectReferralCount(userUID);
            if (userData.sponsorUID) {
                await newIncomeEngine_1.newIncomeEngine.updateDirectReferralCount(userData.sponsorUID);
            }
        }
        catch (error) {
            await logger.warn(logger_1.LogCategory.MLM, 'Failed to update direct referral counts', userUID, { error: error instanceof Error ? error.message : String(error) });
        }
        await logger.info(logger_1.LogCategory.MLM, `Rank activation successful: ${activatedRanks.join(', ')} for user ${userUID}`, userUID, {
            activatedRanks,
            totalCost,
            poolIds,
            paymentMethod,
            transactionHash
        });
        return {
            success: true,
            message: `Successfully activated ${activatedRanks.length} rank(s): ${activatedRanks.join(', ')}`,
            activatedRanks,
            totalCost,
            poolIds
        };
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.MLM, 'Failed to activate rank', context.auth?.uid || '', {
            error: error instanceof Error ? error.message : String(error),
            rank: data.rank,
            activateAllRanks: data.activateAllRanks,
            stack: error instanceof Error ? error.stack : undefined
        });
        // Re-throw HttpsError as-is, wrap others
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to activate rank. Please try again later.');
    }
});
/**
 * HTTP endpoint version for web requests
 */
exports.activateRankHttp = functions.https.onRequest(async (req, res) => {
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        // Verify authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
            return;
        }
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        // Create context object similar to callable function
        const context = {
            auth: {
                uid: decodedToken.uid,
                token: decodedToken
            }
        };
        // Call the main function
        const result = await (0, exports.activateRank)(req.body, context);
        res.status(200).json(result);
    }
    catch (error) {
        console.error('HTTP endpoint error:', error);
        if (error instanceof functions.https.HttpsError) {
            // Try to parse structured error message
            try {
                const errorData = JSON.parse(error.message);
                res.status(400).json({
                    success: false,
                    ...errorData
                });
            }
            catch {
                // Fallback to original error format
                res.status(400).json({
                    success: false,
                    message: error.message,
                    code: error.code
                });
            }
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
});
//# sourceMappingURL=activateRank.js.map
"use strict";
/**
 * API endpoint for claiming locked income from global income pools
 * Enforces 2 direct referral requirement before allowing claims
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
exports.claimLockedIncome = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
const logger = (0, logger_1.createLogger)('ClaimLockedIncome');
exports.claimLockedIncome = functions.https.onCall(async (data, context) => {
    try {
        // Verify authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to claim income');
        }
        const userUID = context.auth.uid;
        const { rank } = data;
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
        const lockedBalance = userData?.lockedBalance || 0;
        const directReferralsCount = userData?.directReferralsCount || 0;
        // Check if user has locked balance to claim
        if (lockedBalance <= 0) {
            throw new functions.https.HttpsError('failed-precondition', 'No locked income available to claim');
        }
        // Check if user meets the direct referral requirement (2 directs)
        const requiredDirectReferrals = 2;
        if (directReferralsCount < requiredDirectReferrals) {
            throw new functions.https.HttpsError('failed-precondition', `You need ${requiredDirectReferrals - directReferralsCount} more direct referrals to claim income. Current: ${directReferralsCount}, Required: ${requiredDirectReferrals}`);
        }
        // Check if user has the required rank activated
        if (userData?.rank !== rank) {
            throw new functions.https.HttpsError('failed-precondition', `You must have ${rank} rank activated to claim this income`);
        }
        const claimAmount = lockedBalance;
        // Use transaction to ensure atomicity
        const result = await db.runTransaction(async (transaction) => {
            // Get fresh user data
            const userRef = db.collection(config_1.collections.USERS).doc(userUID);
            const freshUserDoc = await transaction.get(userRef);
            if (!freshUserDoc.exists) {
                throw new Error('User not found');
            }
            const freshUserData = freshUserDoc.data();
            const currentAvailableBalance = freshUserData?.availableBalance || 0;
            const currentLockedBalance = freshUserData?.lockedBalance || 0;
            const currentTotalEarnings = freshUserData?.totalEarnings || 0;
            // Double-check locked balance
            if (currentLockedBalance <= 0) {
                throw new Error('No locked income available to claim');
            }
            const newAvailableBalance = currentAvailableBalance + currentLockedBalance;
            const newLockedBalance = 0;
            const newTotalEarnings = currentTotalEarnings + currentLockedBalance;
            // Update user balances
            transaction.update(userRef, {
                availableBalance: newAvailableBalance,
                lockedBalance: newLockedBalance,
                totalEarnings: newTotalEarnings,
                lastClaimedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // Create income transaction record
            const transactionRef = db.collection(config_1.collections.INCOME_TRANSACTIONS).doc();
            transaction.set(transactionRef, {
                uid: userUID,
                type: 'income',
                subType: 'locked_income_claim',
                amount: currentLockedBalance,
                status: 'completed',
                description: `Locked income claim for ${rank} rank`,
                rank,
                source: 'global_income_pool',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                metadata: {
                    rank,
                    claimedAmount: currentLockedBalance,
                    directReferralsCount,
                    claimMethod: 'manual'
                }
            });
            return {
                claimedAmount: currentLockedBalance,
                newAvailableBalance,
                newLockedBalance
            };
        });
        await logger.info(logger_1.LogCategory.MLM, `Locked income claimed successfully: ${result.claimedAmount} for ${rank} rank`, userUID, {
            rank,
            claimedAmount: result.claimedAmount,
            directReferralsCount,
            requiredDirectReferrals,
            newAvailableBalance: result.newAvailableBalance
        });
        return {
            success: true,
            message: `Successfully claimed ${result.claimedAmount.toFixed(2)} USD from your locked ${rank} income`,
            claimedAmount: result.claimedAmount,
            newAvailableBalance: result.newAvailableBalance,
            newLockedBalance: result.newLockedBalance
        };
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.MLM, 'Failed to claim locked income', context.auth?.uid || '', {
            rank: data.rank,
            errorMessage: error instanceof Error ? error.message : String(error)
        });
        // Re-throw HttpsError as-is, wrap others
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to claim locked income. Please try again later.');
    }
});
//# sourceMappingURL=claimLockedIncome.js.map
"use strict";
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
exports.manualPoolIncomeGeneration = exports.autoPoolIncomeGenerator = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/**
 * Scheduled function to generate pool income for all active users
 * Runs every hour to simulate continuous income generation
 */
exports.autoPoolIncomeGenerator = functions.pubsub
    .schedule('0 * * * *') // Run every hour
    .timeZone('UTC')
    .onRun(async (context) => {
    console.log('Starting auto pool income generation...');
    try {
        // Get platform settings for income rates
        const settingsDoc = await db.collection('settings').doc('platform').get();
        const settings = settingsDoc.data() || {};
        // Default income rates per hour (in USD)
        const incomeRates = {
            'Bronze': 0.10, // $0.10 per hour
            'Silver': 0.25, // $0.25 per hour
            'Gold': 0.50, // $0.50 per hour
            'Platinum': 1.00, // $1.00 per hour
            'Diamond': 2.00, // $2.00 per hour
            'Crown': 5.00 // $5.00 per hour
        };
        // Get all users with active ranks
        const usersSnapshot = await db.collection('users')
            .where('status', '==', 'active')
            .where('rank', '!=', 'Inactive')
            .get();
        const batch = db.batch();
        let processedUsers = 0;
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;
            const userRank = userData.rank;
            // Skip if user doesn't have a valid rank
            if (!incomeRates[userRank]) {
                continue;
            }
            const hourlyIncome = incomeRates[userRank];
            // Check direct referrals count
            const directReferralsCount = userData.directReferrals || 0;
            const requiredDirectReferrals = settings.directReferralRequirement || 2;
            // Determine if income goes to locked or available balance
            const canClaim = directReferralsCount >= requiredDirectReferrals;
            // Create income transaction
            const incomeTransactionRef = db.collection('users').doc(userId)
                .collection('incomeTransactions').doc();
            const incomeTransaction = {
                id: incomeTransactionRef.id,
                userId: userId,
                rank: userRank,
                amount: hourlyIncome,
                type: 'pool_income',
                status: canClaim ? 'available' : 'locked',
                lockedBalance: canClaim ? 0 : hourlyIncome,
                availableBalance: canClaim ? hourlyIncome : 0,
                directReferralsCount: directReferralsCount,
                requiredDirectReferrals: requiredDirectReferrals,
                canClaim: canClaim,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                claimedAt: null,
                metadata: {
                    generatedBy: 'autoPoolIncomeGenerator',
                    hourlyRate: hourlyIncome,
                    conditionMet: canClaim
                }
            };
            batch.set(incomeTransactionRef, incomeTransaction);
            // Update user's balance fields
            const userRef = db.collection('users').doc(userId);
            if (canClaim) {
                batch.update(userRef, {
                    availableBalance: admin.firestore.FieldValue.increment(hourlyIncome),
                    totalEarnings: admin.firestore.FieldValue.increment(hourlyIncome),
                    lastIncomeGenerated: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            else {
                batch.update(userRef, {
                    lockedBalance: admin.firestore.FieldValue.increment(hourlyIncome),
                    lastIncomeGenerated: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            processedUsers++;
            // Commit batch every 500 operations to avoid limits
            if (processedUsers % 500 === 0) {
                await batch.commit();
                console.log(`Processed ${processedUsers} users so far...`);
            }
        }
        // Commit remaining operations
        if (processedUsers % 500 !== 0) {
            await batch.commit();
        }
        console.log(`Auto pool income generation completed. Processed ${processedUsers} users.`);
        // Log the operation for audit
        await db.collection('systemLogs').add({
            type: 'auto_pool_income_generation',
            processedUsers: processedUsers,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'completed'
        });
    }
    catch (error) {
        console.error('Error in auto pool income generation:', error);
        // Log the error
        await db.collection('systemLogs').add({
            type: 'auto_pool_income_generation_error',
            error: error instanceof Error ? error.message : String(error),
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'failed'
        });
        throw error;
    }
});
/**
 * Manual trigger for pool income generation (for testing)
 */
exports.manualPoolIncomeGeneration = functions.https.onCall(async (data, context) => {
    // Verify admin authentication
    if (!context.auth || !context.auth.token.admin) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    try {
        // Trigger the same logic as the scheduled function
        console.log('Manual pool income generation triggered by admin');
        // Get platform settings for income rates
        const settingsDoc = await db.collection('settings').doc('platform').get();
        const settings = settingsDoc.data() || {};
        // Default income rates per manual trigger (can be different from hourly)
        const incomeRates = {
            'Bronze': 0.10,
            'Silver': 0.25,
            'Gold': 0.50,
            'Platinum': 1.00,
            'Diamond': 2.00,
            'Crown': 5.00
        };
        // Get all users with active ranks
        const usersSnapshot = await db.collection('users')
            .where('status', '==', 'active')
            .where('rank', '!=', 'Inactive')
            .get();
        const batch = db.batch();
        let processedUsers = 0;
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;
            const userRank = userData.rank;
            if (!incomeRates[userRank]) {
                continue;
            }
            const income = incomeRates[userRank];
            const directReferralsCount = userData.directReferrals || 0;
            const requiredDirectReferrals = settings.directReferralRequirement || 2;
            const canClaim = directReferralsCount >= requiredDirectReferrals;
            // Create income transaction
            const incomeTransactionRef = db.collection('users').doc(userId)
                .collection('incomeTransactions').doc();
            const incomeTransaction = {
                id: incomeTransactionRef.id,
                userId: userId,
                rank: userRank,
                amount: income,
                type: 'pool_income_manual',
                status: canClaim ? 'available' : 'locked',
                lockedBalance: canClaim ? 0 : income,
                availableBalance: canClaim ? income : 0,
                directReferralsCount: directReferralsCount,
                requiredDirectReferrals: requiredDirectReferrals,
                canClaim: canClaim,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                claimedAt: null,
                metadata: {
                    generatedBy: 'manualPoolIncomeGeneration',
                    triggeredBy: context.auth.uid,
                    manualTrigger: true
                }
            };
            batch.set(incomeTransactionRef, incomeTransaction);
            // Update user's balance fields
            const userRef = db.collection('users').doc(userId);
            if (canClaim) {
                batch.update(userRef, {
                    availableBalance: admin.firestore.FieldValue.increment(income),
                    totalEarnings: admin.firestore.FieldValue.increment(income),
                    lastIncomeGenerated: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            else {
                batch.update(userRef, {
                    lockedBalance: admin.firestore.FieldValue.increment(income),
                    lastIncomeGenerated: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            processedUsers++;
        }
        await batch.commit();
        return {
            success: true,
            processedUsers: processedUsers,
            message: `Manual pool income generation completed for ${processedUsers} users`
        };
    }
    catch (error) {
        console.error('Error in manual pool income generation:', error);
        throw new functions.https.HttpsError('internal', 'Failed to generate pool income');
    }
});
//# sourceMappingURL=autoPoolIncomeGenerator.js.map
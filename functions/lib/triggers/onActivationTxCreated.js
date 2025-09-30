"use strict";
/**
 * Firestore Trigger - Handle activation transaction completion and process Level Income
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
exports.onActivationTxCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
const logger = (0, logger_1.createLogger)('OnActivationTxCreated');
// Level and Re-Level Income processing removed - system now uses direct pool income only
/**
 * Trigger when a new transaction is created in the transactions collection
 */
exports.onActivationTxCreated = functions.firestore
    .document(`${config_1.collections.TRANSACTIONS}/{transactionId}`)
    .onCreate(async (snap, context) => {
    const transactionId = context.params.transactionId;
    const transactionData = snap.data();
    try {
        // Only process activation and topup transactions that are completed
        if (!['activation', 'topup'].includes(transactionData.type) ||
            transactionData.status !== 'completed') {
            return;
        }
        await logger.info(logger_1.LogCategory.MLM, 'Processing activation transaction for Level Income', transactionData.uid, {
            transactionId,
            type: transactionData.type,
            rank: transactionData.rank,
            amount: transactionData.amount
        });
        // Update user rank and activation status - immediate unlock
        await updateUserRank(transactionData.uid, transactionData.rank);
        // Process income using the new income engine
        const { incomeEngine } = await Promise.resolve().then(() => __importStar(require('../services/incomeEngine')));
        await incomeEngine.processAllIncomes(transactionData.uid, transactionData.amount, transactionId, transactionData.rank);
        await logger.info(logger_1.LogCategory.MLM, 'Activation transaction processed successfully', transactionData.uid, { transactionId });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.MLM, 'Failed to process activation transaction', error, transactionData.uid, { transactionId, transactionData });
        // Don't throw error to prevent transaction rollback
        // Log the error and continue
    }
});
/**
 * Update user rank and activation status - UPDATED for immediate rank unlock
 */
async function updateUserRank(uid, newRank) {
    const db = admin.firestore();
    try {
        const userRef = db.collection(config_1.collections.USERS).doc(uid);
        // For $5 activation, immediately unlock Azurite rank
        // Users can also unlock higher ranks at once if they pay more
        await userRef.update({
            rank: newRank,
            isActive: true,
            rankActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            // Initialize locked balance if not exists
            lockedBalance: admin.firestore.FieldValue.increment(0),
            // Track direct referrals count for claiming eligibility
            directReferralsCount: admin.firestore.FieldValue.increment(0)
        });
        await logger.info(logger_1.LogCategory.MLM, 'User rank updated with immediate unlock', uid, { newRank, immediateUnlock: true });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.MLM, 'Failed to update user rank', error, uid, { newRank });
        throw error;
    }
}
// Level and Re-Level Income processing removed - system now uses direct pool income only
//# sourceMappingURL=onActivationTxCreated.js.map
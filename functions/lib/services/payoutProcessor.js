"use strict";
/**
 * Payout Processor - Handles withdrawal requests and payment processing
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
exports.payoutProcessor = exports.PayoutProcessor = void 0;
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
const math_1 = require("../utils/math");
const logger = (0, logger_1.createLogger)('PayoutProcessor');
class PayoutProcessor {
    constructor() {
        this.db = admin.firestore();
    }
    /**
     * Process withdrawal request
     */
    async processWithdrawalRequest(uid, amount, method, walletAddress, bankDetails) {
        try {
            // Validate withdrawal request
            await this.validateWithdrawalRequest(uid, amount, method, walletAddress, bankDetails);
            // Calculate fees and net amount
            const fees = this.calculateWithdrawalFees(amount, method);
            const netAmount = (0, math_1.safeSubtract)(amount, fees);
            // Create withdrawal request
            const withdrawalData = {
                uid,
                amount,
                method,
                walletAddress,
                bankDetails,
                status: 'pending',
                fees,
                netAmount,
                requestedAt: admin.firestore.Timestamp.now(),
                metadata: {
                    userAgent: 'web',
                    ipAddress: 'unknown' // Should be passed from client
                }
            };
            const withdrawalRef = await this.db.collection(config_1.collections.WITHDRAWALS).add(withdrawalData);
            // Deduct amount from user's available balance
            await this.deductFromUserBalance(uid, amount);
            // Add to payout queue
            await this.addToPayoutQueue(withdrawalRef.id, uid, netAmount, method);
            await logger.info(logger_1.LogCategory.PAYMENT, 'Withdrawal request created successfully', uid, {
                withdrawalId: withdrawalRef.id,
                amount,
                method,
                fees,
                netAmount
            });
            return withdrawalRef.id;
        }
        catch (error) {
            await logger.error(logger_1.LogCategory.PAYMENT, 'Failed to process withdrawal request', error, uid, { amount, method });
            throw error;
        }
    }
    /**
     * Validate withdrawal request
     */
    async validateWithdrawalRequest(uid, amount, method, walletAddress, bankDetails) {
        // Check minimum withdrawal amount
        if (amount < config_1.mlmConfig.withdrawal.minimumAmount) {
            throw new Error(`Minimum withdrawal amount is $${config_1.mlmConfig.withdrawal.minimumAmount}`);
        }
        // Check user exists and is active
        const userDoc = await this.db.collection(config_1.collections.USERS).doc(uid).get();
        if (!userDoc.exists) {
            throw new Error('User not found');
        }
        const userData = userDoc.data();
        if (!(userData === null || userData === void 0 ? void 0 : userData.isActive)) {
            throw new Error('User account is not active');
        }
        // Check available balance
        const availableBalance = userData.availableBalance || 0;
        if (availableBalance < amount) {
            throw new Error('Insufficient balance');
        }
        // Validate withdrawal method specific requirements
        if (method === 'usdt_bep20') {
            if (!walletAddress) {
                throw new Error('Wallet address is required for USDT BEP20 withdrawal');
            }
            if (!this.isValidBEP20Address(walletAddress)) {
                throw new Error('Invalid BEP20 wallet address');
            }
        }
        if (method === 'fund_conversion' && !bankDetails) {
            throw new Error('Bank details are required for fund conversion');
        }
        // Check daily withdrawal limit
        await this.checkDailyWithdrawalLimit(uid, amount);
        // Check pending withdrawals
        await this.checkPendingWithdrawals(uid);
    }
    /**
     * Calculate withdrawal fees
     */
    calculateWithdrawalFees(amount, method) {
        let feePercentage = 0;
        switch (method) {
            case 'usdt_bep20':
                feePercentage = config_1.mlmConfig.withdrawal.usdtFee;
                break;
            case 'fund_conversion':
                feePercentage = config_1.mlmConfig.withdrawal.fundConversion;
                break;
            case 'p2p':
                feePercentage = config_1.mlmConfig.withdrawal.p2pFee;
                break;
            default:
                feePercentage = config_1.mlmConfig.withdrawal.processingFeePercentage;
        }
        return (0, math_1.roundToTwoDecimals)((amount * feePercentage) / 100);
    }
    /**
     * Deduct amount from user's available balance
     */
    async deductFromUserBalance(uid, amount) {
        const userRef = this.db.collection(config_1.collections.USERS).doc(uid);
        await this.db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new Error('User not found');
            }
            const userData = userDoc.data();
            const currentBalance = (userData === null || userData === void 0 ? void 0 : userData.availableBalance) || 0;
            if (currentBalance < amount) {
                throw new Error('Insufficient balance');
            }
            const newBalance = (0, math_1.safeSubtract)(currentBalance, amount);
            transaction.update(userRef, {
                availableBalance: newBalance,
                totalWithdrawn: admin.firestore.FieldValue.increment(amount),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
    }
    /**
     * Add withdrawal to payout queue
     */
    async addToPayoutQueue(withdrawalId, uid, amount, method) {
        const priority = this.getPayoutPriority(amount, method);
        const scheduledAt = this.getScheduledTime(method);
        const queueData = {
            withdrawalId,
            uid,
            amount,
            method,
            priority,
            scheduledAt,
            attempts: 0
        };
        await this.db.collection(config_1.collections.PAYOUT_QUEUE).add(queueData);
    }
    /**
     * Process payout queue
     */
    async processPayoutQueue() {
        try {
            // Get pending payouts ordered by priority and scheduled time
            const payoutQuery = await this.db
                .collection(config_1.collections.PAYOUT_QUEUE)
                .where('scheduledAt', '<=', admin.firestore.Timestamp.now())
                .orderBy('scheduledAt', 'asc')
                .limit(10)
                .get();
            if (payoutQuery.empty) {
                await logger.info(logger_1.LogCategory.PAYMENT, 'No pending payouts in queue');
                return;
            }
            for (const payoutDoc of payoutQuery.docs) {
                const payoutData = payoutDoc.data();
                try {
                    await this.processSinglePayout(payoutDoc.id, payoutData);
                }
                catch (error) {
                    await this.handlePayoutError(payoutDoc.id, payoutData, error);
                }
            }
        }
        catch (error) {
            await logger.error(logger_1.LogCategory.PAYMENT, 'Failed to process payout queue', error);
        }
    }
    /**
     * Process single payout
     */
    async processSinglePayout(queueId, payoutData) {
        const { withdrawalId, uid, amount, method } = payoutData;
        // Get withdrawal details
        const withdrawalDoc = await this.db.collection(config_1.collections.WITHDRAWALS).doc(withdrawalId).get();
        if (!withdrawalDoc.exists) {
            throw new Error(`Withdrawal ${withdrawalId} not found`);
        }
        const withdrawalData = withdrawalDoc.data();
        if (withdrawalData.status !== 'pending') {
            // Remove from queue if already processed
            await this.db.collection(config_1.collections.PAYOUT_QUEUE).doc(queueId).delete();
            return;
        }
        // Update withdrawal status to processing
        await withdrawalDoc.ref.update({
            status: 'processing',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Process payment based on method
        let transactionHash;
        let success = false;
        switch (method) {
            case 'usdt_bep20':
                transactionHash = await this.processUSDTPayment(withdrawalData);
                success = !!transactionHash;
                break;
            case 'fund_conversion':
                success = await this.processFundConversion(withdrawalData);
                break;
            case 'p2p':
                success = await this.processP2PTransfer(withdrawalData);
                break;
            default:
                throw new Error(`Unsupported payment method: ${method}`);
        }
        if (success) {
            // Update withdrawal as completed
            await withdrawalDoc.ref.update({
                status: 'completed',
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
                transactionHash,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // Remove from payout queue
            await this.db.collection(config_1.collections.PAYOUT_QUEUE).doc(queueId).delete();
            await logger.info(logger_1.LogCategory.PAYMENT, 'Payout processed successfully', uid, {
                withdrawalId,
                amount,
                method,
                transactionHash
            });
        }
        else {
            throw new Error('Payment processing failed');
        }
    }
    /**
     * Handle payout error
     */
    async handlePayoutError(queueId, payoutData, error) {
        const maxAttempts = 3;
        const newAttempts = payoutData.attempts + 1;
        if (newAttempts >= maxAttempts) {
            // Mark withdrawal as rejected
            await this.db.collection(config_1.collections.WITHDRAWALS).doc(payoutData.withdrawalId).update({
                status: 'rejected',
                rejectionReason: error.message,
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // Refund amount to user
            await this.refundToUserBalance(payoutData.uid, payoutData.amount);
            // Remove from queue
            await this.db.collection(config_1.collections.PAYOUT_QUEUE).doc(queueId).delete();
            await logger.error(logger_1.LogCategory.PAYMENT, 'Payout failed after maximum attempts', error, payoutData.uid, {
                withdrawalId: payoutData.withdrawalId,
                attempts: newAttempts
            });
        }
        else {
            // Retry later
            const retryDelay = Math.pow(2, newAttempts) * 60 * 1000; // Exponential backoff
            const nextScheduledAt = admin.firestore.Timestamp.fromMillis(Date.now() + retryDelay);
            await this.db.collection(config_1.collections.PAYOUT_QUEUE).doc(queueId).update({
                attempts: newAttempts,
                lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
                scheduledAt: nextScheduledAt,
                error: error.message
            });
            await logger.warn(logger_1.LogCategory.PAYMENT, `Payout attempt ${newAttempts} failed, retrying later`, payoutData.uid, {
                withdrawalId: payoutData.withdrawalId,
                error: error.message,
                nextRetry: nextScheduledAt.toDate()
            });
        }
    }
    /**
     * Process USDT BEP20 payment
     */
    async processUSDTPayment(withdrawalData) {
        // This would integrate with actual blockchain/payment service
        // For now, simulate the process
        await logger.info(logger_1.LogCategory.PAYMENT, 'Processing USDT BEP20 payment', withdrawalData.uid, {
            amount: withdrawalData.netAmount,
            walletAddress: withdrawalData.walletAddress
        });
        // Simulate blockchain transaction
        // In real implementation, this would call blockchain API
        const mockTransactionHash = `0x${Math.random().toString(16).substr(2, 64)}`;
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return mockTransactionHash;
    }
    /**
     * Process fund conversion
     */
    async processFundConversion(withdrawalData) {
        // This would integrate with banking/fund conversion service
        await logger.info(logger_1.LogCategory.PAYMENT, 'Processing fund conversion', withdrawalData.uid, {
            amount: withdrawalData.netAmount,
            bankDetails: withdrawalData.bankDetails
        });
        // Simulate bank transfer processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        return true;
    }
    /**
     * Process P2P transfer
     */
    async processP2PTransfer(withdrawalData) {
        // This would integrate with P2P platform
        await logger.info(logger_1.LogCategory.PAYMENT, 'Processing P2P transfer', withdrawalData.uid, {
            amount: withdrawalData.netAmount
        });
        // P2P transfers are typically manual, so mark as completed
        // In real implementation, this might create a task for manual processing
        return true;
    }
    /**
     * Refund amount to user balance
     */
    async refundToUserBalance(uid, amount) {
        const userRef = this.db.collection(config_1.collections.USERS).doc(uid);
        await this.db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new Error('User not found for refund');
            }
            const userData = userDoc.data();
            const currentBalance = (userData === null || userData === void 0 ? void 0 : userData.availableBalance) || 0;
            const newBalance = currentBalance + amount;
            transaction.update(userRef, {
                availableBalance: newBalance,
                totalWithdrawn: admin.firestore.FieldValue.increment(-amount),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
        await logger.info(logger_1.LogCategory.PAYMENT, 'Amount refunded to user balance', uid, { amount });
    }
    /**
     * Get payout priority based on amount and method
     */
    getPayoutPriority(amount, method) {
        if (amount >= 1000)
            return 'high';
        if (amount >= 100 || method === 'p2p')
            return 'medium';
        return 'low';
    }
    /**
     * Get scheduled time based on method
     */
    getScheduledTime(method) {
        const now = Date.now();
        let delayMinutes = 0;
        switch (method) {
            case 'p2p':
                delayMinutes = 0; // Immediate
                break;
            case 'usdt_bep20':
                delayMinutes = 30; // 30 minutes delay
                break;
            case 'fund_conversion':
                delayMinutes = 60; // 1 hour delay
                break;
            default:
                delayMinutes = 15;
        }
        return admin.firestore.Timestamp.fromMillis(now + (delayMinutes * 60 * 1000));
    }
    /**
     * Check daily withdrawal limit
     */
    async checkDailyWithdrawalLimit(uid, amount) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = admin.firestore.Timestamp.fromDate(today);
        const todayWithdrawals = await this.db
            .collection(config_1.collections.WITHDRAWALS)
            .where('uid', '==', uid)
            .where('requestedAt', '>=', todayTimestamp)
            .where('status', 'in', ['pending', 'processing', 'completed'])
            .get();
        const totalToday = todayWithdrawals.docs.reduce((sum, doc) => {
            return sum + (doc.data().amount || 0);
        }, 0);
        const dailyLimit = config_1.mlmConfig.withdrawal.dailyLimit;
        if (totalToday + amount > dailyLimit) {
            throw new Error(`Daily withdrawal limit of $${dailyLimit} exceeded`);
        }
    }
    /**
     * Check pending withdrawals
     */
    async checkPendingWithdrawals(uid) {
        const pendingWithdrawals = await this.db
            .collection(config_1.collections.WITHDRAWALS)
            .where('uid', '==', uid)
            .where('status', 'in', ['pending', 'processing'])
            .get();
        if (!pendingWithdrawals.empty) {
            throw new Error('You have pending withdrawal requests. Please wait for them to be processed.');
        }
    }
    /**
     * Validate BEP20 address
     */
    isValidBEP20Address(address) {
        // Basic validation for BEP20/BSC address
        const bep20Regex = /^0x[a-fA-F0-9]{40}$/;
        return bep20Regex.test(address);
    }
    /**
     * Get user withdrawal history
     */
    async getUserWithdrawalHistory(uid, limit = 20, startAfter) {
        let query = this.db
            .collection(config_1.collections.WITHDRAWALS)
            .where('uid', '==', uid)
            .orderBy('requestedAt', 'desc')
            .limit(limit);
        if (startAfter) {
            query = query.startAfter(startAfter);
        }
        const snapshot = await query.get();
        return snapshot.docs.map(doc => (Object.assign(Object.assign({}, doc.data()), { id: doc.id })));
    }
    /**
     * Get withdrawal statistics
     */
    async getWithdrawalStats(uid) {
        const baseQuery = uid
            ? this.db.collection(config_1.collections.WITHDRAWALS).where('uid', '==', uid)
            : this.db.collection(config_1.collections.WITHDRAWALS);
        const [totalQuery, completedQuery, pendingQuery] = await Promise.all([
            baseQuery.get(),
            baseQuery.where('status', '==', 'completed').get(),
            baseQuery.where('status', 'in', ['pending', 'processing']).get()
        ]);
        const totalAmount = totalQuery.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
        const completedAmount = completedQuery.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
        const pendingAmount = pendingQuery.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
        return {
            totalRequests: totalQuery.size,
            completedRequests: completedQuery.size,
            pendingRequests: pendingQuery.size,
            totalAmount: (0, math_1.roundToTwoDecimals)(totalAmount),
            completedAmount: (0, math_1.roundToTwoDecimals)(completedAmount),
            pendingAmount: (0, math_1.roundToTwoDecimals)(pendingAmount),
            averageAmount: totalQuery.size > 0 ? (0, math_1.roundToTwoDecimals)(totalAmount / totalQuery.size) : 0
        };
    }
}
exports.PayoutProcessor = PayoutProcessor;
// Export singleton instance
exports.payoutProcessor = new PayoutProcessor();
//# sourceMappingURL=payoutProcessor.js.map
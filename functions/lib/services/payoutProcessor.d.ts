/**
 * Payout Processor - Handles withdrawal requests and payment processing
 */
import * as admin from 'firebase-admin';
export interface WithdrawalRequest {
    uid: string;
    amount: number;
    method: 'usdt_bep20' | 'fund_conversion' | 'p2p';
    walletAddress?: string;
    bankDetails?: Record<string, any>;
    status: 'pending' | 'processing' | 'completed' | 'rejected';
    fees: number;
    netAmount: number;
    requestedAt: admin.firestore.Timestamp;
    processedAt?: admin.firestore.Timestamp;
    rejectionReason?: string;
    transactionHash?: string;
    metadata?: Record<string, any>;
}
export interface PayoutQueueItem {
    withdrawalId: string;
    uid: string;
    amount: number;
    method: string;
    priority: 'high' | 'medium' | 'low';
    scheduledAt: admin.firestore.Timestamp;
    attempts: number;
    lastAttemptAt?: admin.firestore.Timestamp;
    error?: string;
}
export declare class PayoutProcessor {
    private db;
    constructor();
    /**
     * Process withdrawal request
     */
    processWithdrawalRequest(uid: string, amount: number, method: 'usdt_bep20' | 'fund_conversion' | 'p2p', walletAddress?: string, bankDetails?: Record<string, any>): Promise<string>;
    /**
     * Validate withdrawal request
     */
    private validateWithdrawalRequest;
    /**
     * Calculate withdrawal fees
     */
    private calculateWithdrawalFees;
    /**
     * Deduct amount from user's available balance
     */
    private deductFromUserBalance;
    /**
     * Add withdrawal to payout queue
     */
    private addToPayoutQueue;
    /**
     * Process payout queue
     */
    processPayoutQueue(): Promise<void>;
    /**
     * Process single payout
     */
    private processSinglePayout;
    /**
     * Handle payout error
     */
    private handlePayoutError;
    /**
     * Process USDT BEP20 payment
     */
    private processUSDTPayment;
    /**
     * Process fund conversion
     */
    private processFundConversion;
    /**
     * Process P2P transfer
     */
    private processP2PTransfer;
    /**
     * Refund amount to user balance
     */
    private refundToUserBalance;
    /**
     * Get payout priority based on amount and method
     */
    private getPayoutPriority;
    /**
     * Get scheduled time based on method
     */
    private getScheduledTime;
    /**
     * Check daily withdrawal limit
     */
    private checkDailyWithdrawalLimit;
    /**
     * Check pending withdrawals
     */
    private checkPendingWithdrawals;
    /**
     * Validate BEP20 address
     */
    private isValidBEP20Address;
    /**
     * Get user withdrawal history
     */
    getUserWithdrawalHistory(uid: string, limit?: number, startAfter?: admin.firestore.DocumentSnapshot): Promise<WithdrawalRequest[]>;
    /**
     * Get withdrawal statistics
     */
    getWithdrawalStats(uid?: string): Promise<Record<string, any>>;
}
export declare const payoutProcessor: PayoutProcessor;
//# sourceMappingURL=payoutProcessor.d.ts.map
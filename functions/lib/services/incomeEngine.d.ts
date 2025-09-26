/**
 * MLM Income Engine - Core service for calculating and distributing incomes
 */
export interface IncomeCalculation {
    type: 'referral' | 'level' | 'global' | 'retopup';
    amount: number;
    recipientUID: string;
    sourceUID: string;
    sourceTransactionId: string;
    level?: number;
    rank: string;
    metadata?: Record<string, any>;
}
export interface GlobalCycleData {
    cycleId: string;
    rank: string;
    position: number;
    level: number;
    participants: string[];
    totalAmount: number;
    isComplete: boolean;
}
export declare class IncomeEngine {
    private db;
    constructor();
    /**
     * Process referral income when a user activates
     */
    processReferralIncome(activatorUID: string, sponsorUID: string, activationAmount: number, transactionId: string, rank: string): Promise<void>;
    /**
     * Process level income distribution
     */
    processLevelIncome(activatorUID: string, activationAmount: number, transactionId: string, rank: string): Promise<void>;
    /**
     * Process global income cycles
     */
    processGlobalIncome(activatorUID: string, activationAmount: number, transactionId: string, rank: string): Promise<void>;
    /**
     * Process re-topup income
     */
    processReTopupIncome(activatorUID: string, sponsorUID: string, activationAmount: number, transactionId: string, rank: string): Promise<void>;
    /**
     * Get upline chain for level income calculation
     */
    private getUplineChain;
    /**
     * Check if user is eligible for level income
     */
    private checkLevelIncomeEligibility;
    /**
     * Check if user is eligible for global income
     */
    private checkGlobalIncomeEligibility;
    /**
     * Add user to global cycle
     */
    private addToGlobalCycle;
    /**
     * Process global cycle payout
     */
    private processGlobalCyclePayout;
    /**
     * Get participants at specific level in binary tree
     */
    private getParticipantsAtLevel;
    /**
     * Process auto top-up and RE-ID generation
     */
    private processAutoTopUpAndREID;
    /**
     * Process auto top-up to next rank
     */
    private processAutoTopUp;
    /**
     * Generate RE-ID for infinite cycles
     */
    private generateREID;
    /**
     * Process all income types for a transaction
     */
    processAllIncomes(activatorUID: string, activationAmount: number, transactionId: string, rank: string, isReTopup?: boolean): Promise<void>;
    /**
     * Update user balance
     */
    private updateUserBalance;
    /**
     * Create income transaction record
     */
    private createIncomeTransaction;
    /**
     * Get level percentage for level income calculation
     */
    private getLevelPercentage;
}
export declare const incomeEngine: IncomeEngine;
//# sourceMappingURL=incomeEngine.d.ts.map
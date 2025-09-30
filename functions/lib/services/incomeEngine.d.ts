/**
 * MLM Income Engine - Core service for calculating and distributing incomes
 */
export interface IncomeCalculation {
    type: 'referral' | 'level' | 'global';
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
     * Process global income cycles - NEW LOGIC: Direct pool generation only
     */
    processGlobalIncome(activatorUID: string, activationAmount: number, transactionId: string, rank: string): Promise<void>;
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
    /**
     * Add user to global cycle
     */
    /**
     * Process global cycle payout
     */
    /**
     * Get participants at specific level in binary tree
     */
    private getParticipantsAtLevel;
    /**
     * Process all incomes for user activation - UPDATED for new workflow
     */
    processAllIncomes(activatorUID: string, activationAmount: number, transactionId: string, rank: string): Promise<void>;
    /**
     * Update user balance
     */
    private updateUserBalance;
    /**
     * Update user's locked balance
     */
    private updateUserLockedBalance;
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
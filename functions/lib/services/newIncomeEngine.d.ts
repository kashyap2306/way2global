/**
 * New Global Income Engine - User-centric pool-based income system
 * Replaces the old MLM income engine with a simplified user-centric approach
 */
import { IncomePool } from '../types';
export interface PoolIncomeCalculation {
    userUID: string;
    rank: string;
    amount: number;
    sourceTransactionId: string;
    metadata?: Record<string, any>;
}
export declare class NewIncomeEngine {
    private db;
    constructor();
    /**
     * Process rank activation and create income pool
     */
    processRankActivation(userUID: string, rank: string, activationAmount: number, transactionId: string): Promise<void>;
    /**
     * Start income accrual for a user's rank pool
     */
    private startIncomeAccrual;
    /**
     * Add income to a user's pool
     */
    addIncomeToPool(poolId: string, amount: number, source: string, sourceUID?: string): Promise<void>;
    /**
     * Update direct referral count for user's pools
     */
    updateDirectReferralCount(userUID: string): Promise<void>;
    /**
     * Claim income from pool to wallet
     */
    claimPoolIncome(userUID: string, poolId: string): Promise<number>;
    /**
     * Get user's income pools
     */
    getUserIncomePools(userUID: string): Promise<IncomePool[]>;
    /**
     * Process referral income when someone joins under a user
     */
    processReferralIncome(sponsorUID: string, newUserUID: string, activationAmount: number, transactionId: string): Promise<void>;
    private getMaxPoolIncome;
    private calculatePoolIncome;
    private getDirectReferralsCount;
    private getDirectReferralRequirement;
    private createPoolIncomeTransaction;
}
export declare const newIncomeEngine: NewIncomeEngine;
//# sourceMappingURL=newIncomeEngine.d.ts.map
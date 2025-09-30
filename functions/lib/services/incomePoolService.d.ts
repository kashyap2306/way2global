/**
 * Income Pool Service - Manages user-centric income pools for each rank
 */
import { IncomePool, PlatformSettings } from '../types';
export declare class IncomePoolService {
    private db;
    constructor();
    /**
     * Create income pool for user when they activate a rank
     */
    createIncomePool(userId: string, rank: string, directReferralsCount?: number): Promise<string>;
    /**
     * Add income to user's pool for specific rank
     */
    addIncomeToPool(userId: string, rank: string, amount: number): Promise<void>;
    /**
     * Update direct referrals count and check if user can claim
     */
    updateDirectReferrals(userId: string, newCount: number): Promise<void>;
    /**
     * Claim income from pool (move from locked to available balance)
     */
    claimPoolIncome(userId: string, rank: string): Promise<number>;
    /**
     * Get user's income pools
     */
    getUserIncomePools(userId: string): Promise<IncomePool[]>;
    /**
     * Get platform settings
     */
    getPlatformSettings(): Promise<PlatformSettings | null>;
    /**
     * Update platform settings
     */
    updatePlatformSettings(settings: Partial<Omit<PlatformSettings, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void>;
}
export declare const incomePoolService: IncomePoolService;
//# sourceMappingURL=incomePoolService.d.ts.map
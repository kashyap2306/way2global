/**
 * Seed Service - Initialize database with test data
 */
export declare class SeedService {
    /**
     * Seed all data (ranks, settings, test users, global cycles)
     */
    seedAll(): Promise<void>;
    /**
     * Seed rank system
     */
    seedRanks(): Promise<void>;
    /**
     * Seed system settings
     */
    seedSettings(): Promise<void>;
    /**
     * Seed test users with MLM structure
     */
    seedTestUsers(): Promise<void>;
    /**
     * Seed test transactions
     */
    private seedTestTransactions;
    /**
     * Seed global cycles
     */
    seedGlobalCycles(): Promise<void>;
    /**
     * Clear all data from collections
     */
    clearAllData(): Promise<void>;
    /**
     * Check if database is already seeded
     */
    isSeedComplete(): Promise<boolean>;
    /**
     * Get seed status information
     */
    getSeedStatus(): Promise<any>;
}
//# sourceMappingURL=seedService.d.ts.map
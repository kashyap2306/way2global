/**
 * Seed Service - Populate initial data for development and testing
 */
export interface SeedOptions {
    ranks?: boolean;
    settings?: boolean;
    testUsers?: boolean;
    globalCycles?: boolean;
    force?: boolean;
}
export declare class SeedService {
    private db;
    constructor();
    /**
     * Run all seed operations
     */
    seedAll(options?: SeedOptions): Promise<void>;
    /**
     * Seed ranks collection
     */
    seedRanks(force?: boolean): Promise<void>;
    /**
     * Seed settings collection
     */
    seedSettings(force?: boolean): Promise<void>;
    /**
     * Seed test users
     */
    seedTestUsers(force?: boolean): Promise<void>;
    /**
     * Seed test transactions
     */
    private seedTestTransactions;
    /**
     * Seed global cycles
     */
    seedGlobalCycles(force?: boolean): Promise<void>;
    /**
     * Clear all collections
     */
    clearAllData(): Promise<void>;
    /**
     * Get seed status
     */
    getSeedStatus(): Promise<Record<string, any>>;
}
export declare const seedService: SeedService;
//# sourceMappingURL=seed.d.ts.map
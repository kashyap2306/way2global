import * as functions from 'firebase-functions';
/**
 * Scheduled function to generate pool income for all active users
 * Runs every hour to simulate continuous income generation
 */
export declare const autoPoolIncomeGenerator: functions.CloudFunction<unknown>;
/**
 * Manual trigger for pool income generation (for testing)
 */
export declare const manualPoolIncomeGeneration: functions.HttpsFunction & functions.Runnable<any>;
//# sourceMappingURL=autoPoolIncomeGenerator.d.ts.map
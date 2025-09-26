/**
 * Scheduled Function - Process global cycles and payouts
 */
import * as functions from 'firebase-functions';
/**
 * Scheduled function to process global cycles every 5 minutes
 */
export declare const scheduledGlobalCycle: functions.CloudFunction<unknown>;
/**
 * Manual trigger for global cycle processing (for testing)
 */
export declare const triggerGlobalCycleProcessing: functions.HttpsFunction & functions.Runnable<any>;
//# sourceMappingURL=scheduledGlobalCycle.d.ts.map
/**
 * Callable Function - Claim Payout
 */
import * as functions from 'firebase-functions';
/**
 * Callable function for claiming payouts from the payout queue
 */
export declare const claimPayout: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Get user's available payouts (helper function)
 */
export declare const getUserPayouts: functions.HttpsFunction & functions.Runnable<any>;
//# sourceMappingURL=claimPayout.d.ts.map
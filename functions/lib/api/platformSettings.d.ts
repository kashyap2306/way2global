/**
 * API endpoint for managing platform settings
 * Allows admin to update direct referral requirements and other platform configurations
 */
import * as functions from 'firebase-functions';
/**
 * Get platform settings
 */
export declare const getPlatformSettings: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Update platform settings (Admin only)
 */
export declare const updatePlatformSettings: functions.HttpsFunction & functions.Runnable<any>;
/**
 * HTTP endpoint for getting platform settings
 */
export declare const getPlatformSettingsHttp: functions.HttpsFunction;
/**
 * HTTP endpoint for updating platform settings
 */
export declare const updatePlatformSettingsHttp: functions.HttpsFunction;
//# sourceMappingURL=platformSettings.d.ts.map
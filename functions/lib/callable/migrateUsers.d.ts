/**
 * User Migration Script
 * Migrates existing users to ensure they have all required collections
 */
import * as functions from 'firebase-functions';
/**
 * Callable function to migrate existing users
 */
export declare const migrateUsers: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Helper function to run migration for a specific user (for testing)
 */
export declare const migrateSpecificUser: functions.HttpsFunction & functions.Runnable<any>;
//# sourceMappingURL=migrateUsers.d.ts.map
/**
 * Callable Function - Seed Database
 */
import * as functions from 'firebase-functions';
/**
 * Seed Database Callable Function
 * Actions:
 * - seed: Initialize database with ranks, settings, test users
 * - clear: Clear all data from database
 * - status: Get current seed status
 * - reseed: Clear and then seed (force required)
 */
export declare const seedDatabase: functions.HttpsFunction & functions.Runnable<any>;
//# sourceMappingURL=seedDatabase.d.ts.map
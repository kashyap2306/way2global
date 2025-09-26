"use strict";
/**
 * Callable Function - Seed Database
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = void 0;
const functions = __importStar(require("firebase-functions"));
const Joi = __importStar(require("joi"));
const logger_1 = require("../utils/logger");
const seedService_1 = require("../services/seedService");
const logger = (0, logger_1.createLogger)('SeedDatabase');
const seedService = new seedService_1.SeedService();
// Validation schema
const seedSchema = Joi.object({
    action: Joi.string().valid('seed', 'clear', 'status', 'reseed').required(),
    force: Joi.boolean().default(false)
});
/**
 * Seed Database Callable Function
 * Actions:
 * - seed: Initialize database with ranks, settings, test users
 * - clear: Clear all data from database
 * - status: Get current seed status
 * - reseed: Clear and then seed (force required)
 */
exports.seedDatabase = functions.https.onCall(async (data, context) => {
    var _a;
    try {
        // Check authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
        }
        // Check if user is super admin
        const userClaims = context.auth.token;
        if (!userClaims.superAdmin) {
            throw new functions.https.HttpsError('permission-denied', 'Super admin access required');
        }
        // Validate input
        const { error, value } = seedSchema.validate(data);
        if (error) {
            throw new functions.https.HttpsError('invalid-argument', `Validation error: ${error.details[0].message}`);
        }
        const { action, force } = value;
        const uid = context.auth.uid;
        await logger.info(logger_1.LogCategory.SYSTEM, `Seed database action: ${action}`, uid, { action, force });
        switch (action) {
            case 'status':
                const status = await seedService.getSeedStatus();
                return {
                    success: true,
                    data: status
                };
            case 'seed':
                // Check if already seeded
                const isSeeded = await seedService.isSeedComplete();
                if (isSeeded && !force) {
                    return {
                        success: false,
                        error: 'Database is already seeded. Use force=true to override.',
                        data: await seedService.getSeedStatus()
                    };
                }
                await seedService.seedAll();
                await logger.info(logger_1.LogCategory.SYSTEM, 'Database seeded successfully', uid);
                return {
                    success: true,
                    message: 'Database seeded successfully',
                    data: await seedService.getSeedStatus()
                };
            case 'clear':
                if (!force) {
                    throw new functions.https.HttpsError('failed-precondition', 'Clear action requires force=true for safety');
                }
                await seedService.clearAllData();
                await logger.info(logger_1.LogCategory.SYSTEM, 'Database cleared successfully', uid);
                return {
                    success: true,
                    message: 'Database cleared successfully'
                };
            case 'reseed':
                if (!force) {
                    throw new functions.https.HttpsError('failed-precondition', 'Reseed action requires force=true for safety');
                }
                await seedService.clearAllData();
                await seedService.seedAll();
                await logger.info(logger_1.LogCategory.SYSTEM, 'Database reseeded successfully', uid);
                return {
                    success: true,
                    message: 'Database reseeded successfully',
                    data: await seedService.getSeedStatus()
                };
            default:
                throw new functions.https.HttpsError('invalid-argument', 'Invalid action specified');
        }
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.SYSTEM, 'Seed database operation failed', error, (_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid, { action: data === null || data === void 0 ? void 0 : data.action });
        // Re-throw HttpsError as-is
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        // Convert other errors to HttpsError
        throw new functions.https.HttpsError('internal', 'Seed operation failed');
    }
});
//# sourceMappingURL=seedDatabase.js.map
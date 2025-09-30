"use strict";
/**
 * API endpoint for managing platform settings
 * Allows admin to update direct referral requirements and other platform configurations
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
exports.updatePlatformSettingsHttp = exports.getPlatformSettingsHttp = exports.updatePlatformSettings = exports.getPlatformSettings = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
const logger = (0, logger_1.createLogger)('PlatformSettings');
/**
 * Get platform settings
 */
exports.getPlatformSettings = functions.https.onCall(async (data, context) => {
    try {
        // Verify authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const db = admin.firestore();
        // Get settings document
        const settingsDoc = await db.collection(config_1.collections.SETTINGS).doc('platform').get();
        let settings;
        if (!settingsDoc.exists) {
            // Create default settings if they don't exist
            settings = {
                directReferralRequirement: 2,
                maintenanceMode: false,
                registrationOpen: true,
                welcomeBonus: 0,
                maxRankLevel: 10,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedBy: context.auth.uid
            };
            await db.collection(config_1.collections.SETTINGS).doc('platform').set(settings);
        }
        else {
            settings = settingsDoc.data();
        }
        return {
            success: true,
            settings
        };
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.ADMIN, 'Failed to get platform settings', error instanceof Error ? error : new Error(String(error)), context.auth?.uid || '', {
            stack: error instanceof Error ? error.stack : undefined
        });
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to get platform settings');
    }
});
/**
 * Update platform settings (Admin only)
 */
exports.updatePlatformSettings = functions.https.onCall(async (data, context) => {
    try {
        // Verify authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const userUID = context.auth.uid;
        const db = admin.firestore();
        // Verify user is admin
        const userDoc = await db.collection(config_1.collections.USERS).doc(userUID).get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }
        const userData = userDoc.data();
        if (userData?.role !== 'admin') {
            throw new functions.https.HttpsError('permission-denied', 'Only administrators can update platform settings');
        }
        // Validate input
        const { directReferralRequirement, maintenanceMode, registrationOpen, welcomeBonus, maxRankLevel } = data;
        if (directReferralRequirement !== undefined) {
            if (!Number.isInteger(directReferralRequirement) || directReferralRequirement < 0 || directReferralRequirement > 10) {
                throw new functions.https.HttpsError('invalid-argument', 'Direct referral requirement must be an integer between 0 and 10');
            }
        }
        if (welcomeBonus !== undefined) {
            if (typeof welcomeBonus !== 'number' || welcomeBonus < 0) {
                throw new functions.https.HttpsError('invalid-argument', 'Welcome bonus must be a non-negative number');
            }
        }
        if (maxRankLevel !== undefined) {
            if (!Number.isInteger(maxRankLevel) || maxRankLevel < 1 || maxRankLevel > 20) {
                throw new functions.https.HttpsError('invalid-argument', 'Max rank level must be an integer between 1 and 20');
            }
        }
        // Get current settings
        const settingsDoc = await db.collection(config_1.collections.SETTINGS).doc('platform').get();
        let currentSettings;
        if (!settingsDoc.exists) {
            // Create default settings
            currentSettings = {
                directReferralRequirement: 2,
                maintenanceMode: false,
                registrationOpen: true,
                welcomeBonus: 0,
                maxRankLevel: 10,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedBy: userUID
            };
        }
        else {
            currentSettings = settingsDoc.data();
        }
        // Prepare updates
        const updates = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: userUID
        };
        if (directReferralRequirement !== undefined) {
            updates.directReferralRequirement = directReferralRequirement;
        }
        if (maintenanceMode !== undefined) {
            updates.maintenanceMode = maintenanceMode;
        }
        if (registrationOpen !== undefined) {
            updates.registrationOpen = registrationOpen;
        }
        if (welcomeBonus !== undefined) {
            updates.welcomeBonus = welcomeBonus;
        }
        if (maxRankLevel !== undefined) {
            updates.maxRankLevel = maxRankLevel;
        }
        // Update settings
        await db.collection(config_1.collections.SETTINGS).doc('platform').set({
            ...currentSettings,
            ...updates
        });
        // If direct referral requirement changed, update all income pools
        if (directReferralRequirement !== undefined && directReferralRequirement !== currentSettings.directReferralRequirement) {
            const batch = db.batch();
            // Get all income pools
            const poolsSnapshot = await db.collection(config_1.collections.INCOME_POOLS).get();
            poolsSnapshot.docs.forEach(doc => {
                batch.update(doc.ref, {
                    requiredDirectReferrals: directReferralRequirement
                });
            });
            await batch.commit();
            await logger.info(logger_1.LogCategory.ADMIN, `Updated direct referral requirement from ${currentSettings.directReferralRequirement} to ${directReferralRequirement}`, userUID, {
                oldValue: currentSettings.directReferralRequirement,
                newValue: directReferralRequirement,
                poolsUpdated: poolsSnapshot.size
            });
        }
        const updatedSettings = { ...currentSettings, ...updates };
        await logger.info(logger_1.LogCategory.ADMIN, 'Platform settings updated', userUID, {
            updates,
            previousSettings: currentSettings
        });
        return {
            success: true,
            message: 'Platform settings updated successfully',
            settings: updatedSettings
        };
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.ADMIN, 'Failed to update platform settings', error instanceof Error ? error : new Error(String(error)), context.auth?.uid || '', {
            data,
            stack: error instanceof Error ? error.stack : undefined
        });
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to update platform settings');
    }
});
/**
 * HTTP endpoint for getting platform settings
 */
exports.getPlatformSettingsHttp = functions.https.onRequest(async (req, res) => {
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        // Verify authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
            return;
        }
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        // Create context object
        const context = {
            auth: {
                uid: decodedToken.uid,
                token: decodedToken
            }
        };
        // Call the main function
        const result = await (0, exports.getPlatformSettings)({}, context);
        res.status(200).json(result);
    }
    catch (error) {
        console.error('HTTP endpoint error:', error);
        if (error instanceof functions.https.HttpsError) {
            res.status(400).json({
                success: false,
                message: error.message,
                code: error.code
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
});
/**
 * HTTP endpoint for updating platform settings
 */
exports.updatePlatformSettingsHttp = functions.https.onRequest(async (req, res) => {
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        // Verify authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
            return;
        }
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        // Create context object
        const context = {
            auth: {
                uid: decodedToken.uid,
                token: decodedToken
            }
        };
        // Call the main function
        const result = await (0, exports.updatePlatformSettings)(req.body, context);
        res.status(200).json(result);
    }
    catch (error) {
        console.error('HTTP endpoint error:', error);
        if (error instanceof functions.https.HttpsError) {
            res.status(400).json({
                success: false,
                message: error.message,
                code: error.code
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
});
//# sourceMappingURL=platformSettings.js.map
"use strict";
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
exports.getUserData = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
/**
 * Callable function to get current user's MLM data
 */
exports.getUserData = functions.https.onCall(async (data, context) => {
    try {
        // Check if user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to access this function');
        }
        const uid = context.auth.uid;
        await logger_1.logger.info(logger_1.LogCategory.AUTH, 'Fetching user data', uid);
        // Get user data from Firestore
        const userDoc = await admin.firestore()
            .collection(config_1.collections.USERS)
            .doc(uid)
            .get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User profile not found');
        }
        const userData = userDoc.data();
        await logger_1.logger.info(logger_1.LogCategory.AUTH, 'User data fetched successfully', uid);
        return {
            success: true,
            message: 'User data retrieved successfully',
            data: {
                uid: uid,
                displayName: userData?.displayName || '',
                email: userData?.email || '',
                userCode: userData?.userCode || '',
                rank: userData?.rank || 'Azurite',
                status: userData?.status || 'active',
                balance: userData?.balance || 0,
                totalEarnings: userData?.totalEarnings || 0,
                referrals: userData?.referrals || [],
                activationAmount: userData?.activationAmount || 0,
                cyclesCompleted: userData?.cyclesCompleted || 0,
                createdAt: userData?.createdAt,
                lastLoginAt: userData?.lastLoginAt
            }
        };
    }
    catch (error) {
        await logger_1.logger.error(logger_1.LogCategory.AUTH, 'Failed to fetch user data', error, context.auth?.uid);
        // Re-throw HttpsError as-is
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to retrieve user data');
    }
});
//# sourceMappingURL=getUserData.js.map
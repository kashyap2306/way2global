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
exports.login = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const Joi = __importStar(require("joi"));
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
// Validation schema for login
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});
/**
 * Callable function for user login
 */
exports.login = functions.https.onCall(async (data, context) => {
    try {
        // Validate input data
        const { error, value } = loginSchema.validate(data);
        if (error) {
            throw new functions.https.HttpsError('invalid-argument', `Validation error: ${error.details[0].message}`);
        }
        const { email } = value;
        await logger_1.logger.info(logger_1.LogCategory.AUTH, 'Login attempt via callable function', undefined, { email, ip: context.rawRequest?.ip });
        // Get user by email
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(email);
        }
        catch (authError) {
            if (authError.code === 'auth/user-not-found') {
                throw new functions.https.HttpsError('not-found', 'Invalid credentials');
            }
            throw authError;
        }
        // Get user data from Firestore
        const userDoc = await admin.firestore()
            .collection(config_1.collections.USERS)
            .doc(userRecord.uid)
            .get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User profile not found');
        }
        const userData = userDoc.data();
        // Check if account is disabled
        if (userRecord.disabled) {
            throw new functions.https.HttpsError('permission-denied', 'Account has been disabled');
        }
        // Fetch direct referrals
        const directReferralsSnapshot = await admin.firestore()
            .collection(config_1.collections.USERS)
            .where('sponsorId', '==', userRecord.uid)
            .get();
        const directReferrals = directReferralsSnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
        }));
        // Fetch income transactions
        const incomeTransactionsSnapshot = await admin.firestore()
            .collection(config_1.collections.USERS)
            .doc(userRecord.uid)
            .collection('incomeTransactions')
            .orderBy('createdAt', 'desc')
            .get();
        const incomeTransactions = incomeTransactionsSnapshot.docs
            .filter(doc => doc.id !== '_init')
            .map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        // Fetch transactions history
        const transactionsSnapshot = await admin.firestore()
            .collection('transactions')
            .where('userId', '==', userRecord.uid)
            .orderBy('createdAt', 'desc')
            .get();
        const transactions = transactionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        // Fetch withdrawals history
        const withdrawalsSnapshot = await admin.firestore()
            .collection('withdrawals')
            .where('userId', '==', userRecord.uid)
            .orderBy('createdAt', 'desc')
            .get();
        const withdrawals = withdrawalsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        // Create custom token with additional claims
        const customClaims = {
            role: userData?.isActive ? 'user' : 'inactive',
            status: userData?.isActive ? 'active' : 'inactive',
            rank: userData?.rank || 'Azurite'
        };
        // Update custom claims
        await admin.auth().setCustomUserClaims(userRecord.uid, customClaims);
        // Create custom token
        const customToken = await admin.auth().createCustomToken(userRecord.uid, customClaims);
        // Update last login time
        await admin.firestore()
            .collection(config_1.collections.USERS)
            .doc(userRecord.uid)
            .update({
            lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        await logger_1.logger.info(logger_1.LogCategory.AUTH, 'Login successful via callable function', userRecord.uid, { email });
        return {
            success: true,
            message: config_1.successMessages.LOGIN_SUCCESS,
            data: {
                uid: userRecord.uid,
                email: userRecord.email,
                customToken,
                user: {
                    uid: userRecord.uid,
                    displayName: userData?.displayName || '',
                    email: userData?.email || userRecord.email,
                    phone: userData?.phone || '',
                    rank: userData?.rank || 'Azurite',
                    isActive: userData?.isActive || false,
                    availableBalance: userData?.availableBalance || 0,
                    pendingBalance: userData?.pendingBalance || 0,
                    totalEarnings: userData?.totalEarnings || 0,
                    teamSize: userData?.teamSize || 1,
                    userCode: userData?.userCode || '',
                    walletAddress: userData?.walletAddress || '',
                    createdAt: userData?.createdAt,
                    updatedAt: userData?.updatedAt,
                    directReferrals,
                    incomeTransactions,
                    transactions,
                    withdrawals
                }
            }
        };
    }
    catch (error) {
        await logger_1.logger.error(logger_1.LogCategory.AUTH, 'Login failed via callable function', error, undefined, { email: data.email, ip: context.rawRequest?.ip });
        // Re-throw HttpsError as-is
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Login failed. Please try again.');
    }
});
//# sourceMappingURL=login.js.map
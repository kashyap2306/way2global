"use strict";
/**
 * Firestore Trigger - Handle user creation and MLM node setup
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
exports.onUserCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
const logger = (0, logger_1.createLogger)('OnUserCreated');
exports.onUserCreated = functions.firestore
    .document(`${config_1.collections.USERS}/{userId}`)
    .onCreate(async (snap, context) => {
    const userId = context.params.userId;
    const userData = snap.data();
    try {
        await logger.info(logger_1.LogCategory.AUTH, 'Processing new user creation', userId, { email: userData.email, fullName: userData.fullName });
        // Initialize user MLM data
        await initializeUserMLMData(userId, userData);
        // Update sponsor's referral count if sponsor exists
        if (userData.sponsorUID) {
            await updateSponsorReferralCount(userData.sponsorUID, userId);
        }
        // Create welcome income transaction (if applicable)
        await createWelcomeBonus(userId);
        await logger.info(logger_1.LogCategory.AUTH, 'User creation processing completed successfully', userId);
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.AUTH, 'Failed to process user creation', error, userId, { userData });
        // Don't throw error to prevent user creation failure
        // Log the error and continue
    }
});
/**
 * Initialize user MLM data
 */
async function initializeUserMLMData(userId, userData) {
    const db = admin.firestore();
    // Set default MLM values if not already set
    const mlmDefaults = {
        currentRank: userData.currentRank || null,
        isActive: userData.isActive || false,
        availableBalance: userData.availableBalance || 0,
        totalEarnings: userData.totalEarnings || 0,
        totalWithdrawn: userData.totalWithdrawn || 0,
        directReferrals: userData.directReferrals || 0,
        teamSize: userData.teamSize || 1, // User counts as 1
        totalBusiness: userData.totalBusiness || 0,
        joinedAt: userData.joinedAt || admin.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: userData.lastLoginAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    // Update user document with MLM defaults
    await db.collection(config_1.collections.USERS).doc(userId).update(mlmDefaults);
    await logger.info(logger_1.LogCategory.MLM, 'User MLM data initialized', userId, mlmDefaults);
}
/**
 * Update sponsor's referral count and team size
 */
async function updateSponsorReferralCount(sponsorUID, newUserUID) {
    const db = admin.firestore();
    try {
        // Update sponsor's direct referrals count
        await db.runTransaction(async (transaction) => {
            const sponsorRef = db.collection(config_1.collections.USERS).doc(sponsorUID);
            const sponsorDoc = await transaction.get(sponsorRef);
            if (!sponsorDoc.exists) {
                throw new Error(`Sponsor ${sponsorUID} not found`);
            }
            const sponsorData = sponsorDoc.data();
            const currentDirectReferrals = (sponsorData === null || sponsorData === void 0 ? void 0 : sponsorData.directReferrals) || 0;
            const currentTeamSize = (sponsorData === null || sponsorData === void 0 ? void 0 : sponsorData.teamSize) || 1;
            transaction.update(sponsorRef, {
                directReferrals: currentDirectReferrals + 1,
                teamSize: currentTeamSize + 1,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
        // Update upline team sizes
        await updateUplineTeamSizes(sponsorUID);
        await logger.info(logger_1.LogCategory.MLM, 'Sponsor referral count updated', sponsorUID, { newReferral: newUserUID });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.MLM, 'Failed to update sponsor referral count', error, sponsorUID, { newUserUID });
        throw error;
    }
}
/**
 * Update upline team sizes recursively
 */
async function updateUplineTeamSizes(userUID, levels = 10) {
    const db = admin.firestore();
    let currentUID = userUID;
    for (let i = 0; i < levels; i++) {
        try {
            const userDoc = await db.collection(config_1.collections.USERS).doc(currentUID).get();
            if (!userDoc.exists)
                break;
            const userData = userDoc.data();
            const sponsorUID = userData === null || userData === void 0 ? void 0 : userData.sponsorUID;
            if (!sponsorUID)
                break;
            // Update sponsor's team size
            await db.collection(config_1.collections.USERS).doc(sponsorUID).update({
                teamSize: admin.firestore.FieldValue.increment(1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            currentUID = sponsorUID;
        }
        catch (error) {
            await logger.warn(logger_1.LogCategory.MLM, `Failed to update upline team size at level ${i + 1}`, currentUID, { error: error.message });
            break;
        }
    }
}
/**
 * Create welcome bonus (if configured)
 */
async function createWelcomeBonus(userId) {
    var _a, _b;
    const db = admin.firestore();
    // Check if welcome bonus is enabled in settings
    const settingsDoc = await db.collection(config_1.collections.SETTINGS).doc('system').get();
    const systemSettings = settingsDoc.data();
    const welcomeBonusEnabled = ((_a = systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.settings) === null || _a === void 0 ? void 0 : _a.welcomeBonusEnabled) || false;
    const welcomeBonusAmount = ((_b = systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.settings) === null || _b === void 0 ? void 0 : _b.welcomeBonusAmount) || 0;
    if (!welcomeBonusEnabled || welcomeBonusAmount <= 0) {
        return;
    }
    try {
        // Create welcome bonus income
        const incomeData = {
            uid: userId,
            type: 'welcome_bonus',
            amount: welcomeBonusAmount,
            sourceUID: 'system',
            sourceTransactionId: 'welcome_bonus',
            status: 'completed',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            metadata: {
                description: 'Welcome bonus for new user registration'
            }
        };
        await db.collection(config_1.collections.INCOMES).add(incomeData);
        // Update user's available balance
        await db.collection(config_1.collections.USERS).doc(userId).update({
            availableBalance: admin.firestore.FieldValue.increment(welcomeBonusAmount),
            totalEarnings: admin.firestore.FieldValue.increment(welcomeBonusAmount),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Create income transaction
        const transactionData = {
            uid: userId,
            type: 'income',
            subType: 'welcome_bonus',
            amount: welcomeBonusAmount,
            status: 'completed',
            description: 'Welcome bonus',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await db.collection(config_1.collections.INCOME_TRANSACTIONS).add(transactionData);
        await logger.info(logger_1.LogCategory.MLM, 'Welcome bonus created', userId, { amount: welcomeBonusAmount });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.MLM, 'Failed to create welcome bonus', error, userId, { welcomeBonusAmount });
        // Don't throw error, welcome bonus failure shouldn't block user creation
    }
}
//# sourceMappingURL=onUserCreated.js.map
"use strict";
/**
 * Callable Function - User Signup
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
exports.signup = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const Joi = __importStar(require("joi"));
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
const logger = (0, logger_1.createLogger)('SignupCallable');
// Validation schema
const signupSchema = Joi.object({
    fullName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    contact: Joi.string().min(10).max(15).required(),
    password: Joi.string().min(6).max(128).required(),
    walletAddress: Joi.string().min(20).max(100).required(),
    sponsorUID: Joi.string().optional().allow(''),
    placement: Joi.string().valid('left', 'right').optional().default('left')
});
/**
 * Callable function for user signup
 */
exports.signup = functions.https.onCall(async (data, context) => {
    var _a;
    try {
        // Rate limiting check (basic implementation)
        await checkRateLimit(((_a = context.rawRequest) === null || _a === void 0 ? void 0 : _a.ip) || 'unknown');
        // Validate input data
        const { error, value } = signupSchema.validate(data);
        if (error) {
            throw new functions.https.HttpsError('invalid-argument', `Validation error: ${error.details[0].message}`);
        }
        const validatedData = value;
        await logger.info(logger_1.LogCategory.AUTH, 'User signup attempt', undefined, { email: validatedData.email, sponsorUID: validatedData.sponsorUID });
        // Check if user already exists
        await checkExistingUser(validatedData.email, validatedData.contact, validatedData.walletAddress);
        // Validate sponsor if provided
        let sponsorData = null;
        if (validatedData.sponsorUID) {
            sponsorData = await validateSponsor(validatedData.sponsorUID);
        }
        // Create Firebase Auth user
        const userRecord = await createAuthUser(validatedData);
        // Create user document in Firestore
        const userData = await createUserDocument(userRecord.uid, validatedData, sponsorData);
        // Generate custom token for immediate login
        const customToken = await admin.auth().createCustomToken(userRecord.uid);
        await logger.info(logger_1.LogCategory.AUTH, 'User signup successful', userRecord.uid, { email: validatedData.email, sponsorUID: validatedData.sponsorUID });
        return {
            success: true,
            message: config_1.successMessages.USER_CREATED,
            uid: userRecord.uid,
            customToken,
            userData: {
                fullName: userData.fullName,
                email: userData.email,
                rank: userData.rank,
                isActive: userData.isActive,
                sponsorUID: userData.sponsorUID
            }
        };
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.AUTH, 'User signup failed', error, undefined, { email: data.email });
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', config_1.errorCodes.SIGNUP_FAILED, error);
    }
});
/**
 * Check rate limiting for signup attempts
 */
async function checkRateLimit(ip) {
    const db = admin.firestore();
    const now = Date.now();
    const windowStart = now - (config_1.rateLimits.signup.windowMs);
    try {
        const rateLimitDoc = await db
            .collection('rateLimits')
            .doc(`signup_${ip}`)
            .get();
        if (rateLimitDoc.exists) {
            const data = rateLimitDoc.data();
            const attempts = (data === null || data === void 0 ? void 0 : data.attempts) || [];
            // Filter attempts within the current window
            const recentAttempts = attempts.filter((timestamp) => timestamp > windowStart);
            if (recentAttempts.length >= config_1.rateLimits.signup.max) {
                throw new functions.https.HttpsError('resource-exhausted', 'Too many signup attempts. Please try again later.');
            }
            // Update attempts
            await rateLimitDoc.ref.update({
                attempts: [...recentAttempts, now],
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        else {
            // Create new rate limit document
            await db.collection('rateLimits').doc(`signup_${ip}`).set({
                attempts: [now],
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        // Log error but don't block signup for rate limit check failures
        await logger.warn(logger_1.LogCategory.AUTH, 'Rate limit check failed', undefined, { ip, error: error.message });
    }
}
/**
 * Check if user already exists with email, contact, or wallet address
 */
async function checkExistingUser(email, contact, walletAddress) {
    const db = admin.firestore();
    try {
        // Check Firebase Auth for email
        try {
            await admin.auth().getUserByEmail(email);
            throw new functions.https.HttpsError('already-exists', 'User with this email already exists');
        }
        catch (error) {
            if (error.code !== 'auth/user-not-found') {
                throw error;
            }
        }
        // Check Firestore for contact and wallet address
        const [contactQuery, walletQuery] = await Promise.all([
            db.collection(config_1.collections.USERS).where('contact', '==', contact).limit(1).get(),
            db.collection(config_1.collections.USERS).where('walletAddress', '==', walletAddress).limit(1).get()
        ]);
        if (!contactQuery.empty) {
            throw new functions.https.HttpsError('already-exists', 'User with this contact number already exists');
        }
        if (!walletQuery.empty) {
            throw new functions.https.HttpsError('already-exists', 'User with this wallet address already exists');
        }
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to check existing user', error);
    }
}
/**
 * Validate sponsor UID and return sponsor data
 */
async function validateSponsor(sponsorUID) {
    const db = admin.firestore();
    try {
        const sponsorDoc = await db.collection(config_1.collections.USERS).doc(sponsorUID).get();
        if (!sponsorDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Sponsor not found');
        }
        const sponsorData = sponsorDoc.data();
        if (!(sponsorData === null || sponsorData === void 0 ? void 0 : sponsorData.isActive)) {
            throw new functions.https.HttpsError('failed-precondition', 'Sponsor account is not active');
        }
        return Object.assign({ uid: sponsorDoc.id }, sponsorData);
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to validate sponsor', error);
    }
}
/**
 * Create Firebase Auth user
 */
async function createAuthUser(userData) {
    try {
        const userRecord = await admin.auth().createUser({
            email: userData.email,
            password: userData.password,
            displayName: userData.fullName,
            emailVerified: false,
            disabled: false
        });
        // Set custom claims
        await admin.auth().setCustomUserClaims(userRecord.uid, {
            role: 'user',
            isActive: false,
            rank: 'Inactive'
        });
        return userRecord;
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', 'Failed to create user account', error);
    }
}
/**
 * Create user document in Firestore
 */
async function createUserDocument(uid, userData, sponsorData) {
    const db = admin.firestore();
    try {
        // Find placement position in binary tree
        const placement = await findPlacementPosition(sponsorData === null || sponsorData === void 0 ? void 0 : sponsorData.uid, userData.placement);
        const userDocData = {
            uid,
            fullName: userData.fullName,
            email: userData.email,
            contact: userData.contact,
            walletAddress: userData.walletAddress,
            sponsorUID: (sponsorData === null || sponsorData === void 0 ? void 0 : sponsorData.uid) || null,
            uplineUID: placement.uplineUID,
            position: placement.position,
            level: placement.level,
            // MLM Structure
            leftChild: null,
            rightChild: null,
            leftCount: 0,
            rightCount: 0,
            teamSize: 0,
            businessVolume: 0,
            // Status
            rank: 'Inactive',
            isActive: false,
            isVerified: false,
            // Balances
            availableBalance: 0,
            totalEarnings: 0,
            totalWithdrawals: 0,
            // Timestamps
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLoginAt: null,
            // Metadata
            signupIP: null, // Will be set by client
            referralCode: generateReferralCode(uid),
            metadata: {
                signupSource: 'web',
                hasCompletedProfile: false
            }
        };
        await db.collection(config_1.collections.USERS).doc(uid).set(userDocData);
        return Object.assign({}, userDocData);
    }
    catch (error) {
        // Clean up Auth user if Firestore creation fails
        try {
            await admin.auth().deleteUser(uid);
        }
        catch (cleanupError) {
            await logger.error(logger_1.LogCategory.AUTH, 'Failed to cleanup Auth user after Firestore error', cleanupError, uid);
        }
        throw new functions.https.HttpsError('internal', 'Failed to create user profile', error);
    }
}
/**
 * Find placement position in binary tree
 */
async function findPlacementPosition(sponsorUID, preferredPosition = 'left') {
    if (!sponsorUID) {
        return {
            uplineUID: null,
            position: null,
            level: 1
        };
    }
    const db = admin.firestore();
    try {
        // Get sponsor data
        const sponsorDoc = await db.collection(config_1.collections.USERS).doc(sponsorUID).get();
        if (!sponsorDoc.exists) {
            throw new Error('Sponsor not found');
        }
        const sponsorData = sponsorDoc.data();
        const sponsorLevel = (sponsorData === null || sponsorData === void 0 ? void 0 : sponsorData.level) || 1;
        // Check if sponsor has available positions
        if (!(sponsorData === null || sponsorData === void 0 ? void 0 : sponsorData.leftChild) && preferredPosition === 'left') {
            return {
                uplineUID: sponsorUID,
                position: 'left',
                level: sponsorLevel + 1
            };
        }
        if (!(sponsorData === null || sponsorData === void 0 ? void 0 : sponsorData.rightChild) && preferredPosition === 'right') {
            return {
                uplineUID: sponsorUID,
                position: 'right',
                level: sponsorLevel + 1
            };
        }
        if (!(sponsorData === null || sponsorData === void 0 ? void 0 : sponsorData.leftChild)) {
            return {
                uplineUID: sponsorUID,
                position: 'left',
                level: sponsorLevel + 1
            };
        }
        if (!(sponsorData === null || sponsorData === void 0 ? void 0 : sponsorData.rightChild)) {
            return {
                uplineUID: sponsorUID,
                position: 'right',
                level: sponsorLevel + 1
            };
        }
        // Both positions taken, find next available position in the tree
        return await findNextAvailablePosition(sponsorUID, sponsorLevel + 1);
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', 'Failed to find placement position', error);
    }
}
/**
 * Find next available position in the binary tree
 */
async function findNextAvailablePosition(rootUID, startLevel) {
    const db = admin.firestore();
    // BFS to find next available position
    const queue = [{ uid: rootUID, level: startLevel - 1 }];
    while (queue.length > 0) {
        const current = queue.shift();
        const userDoc = await db.collection(config_1.collections.USERS).doc(current.uid).get();
        if (!userDoc.exists)
            continue;
        const userData = userDoc.data();
        // Check if this user has available positions
        if (!(userData === null || userData === void 0 ? void 0 : userData.leftChild)) {
            return {
                uplineUID: current.uid,
                position: 'left',
                level: current.level + 1
            };
        }
        if (!(userData === null || userData === void 0 ? void 0 : userData.rightChild)) {
            return {
                uplineUID: current.uid,
                position: 'right',
                level: current.level + 1
            };
        }
        // Add children to queue for next level search
        if (userData.leftChild) {
            queue.push({ uid: userData.leftChild, level: current.level + 1 });
        }
        if (userData.rightChild) {
            queue.push({ uid: userData.rightChild, level: current.level + 1 });
        }
    }
    // Fallback - should not reach here in normal circumstances
    return {
        uplineUID: rootUID,
        position: 'left',
        level: startLevel
    };
}
/**
 * Generate unique referral code
 */
function generateReferralCode(uid) {
    const prefix = 'WG';
    const suffix = uid.substring(0, 6).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${suffix}${random}`;
}
//# sourceMappingURL=signup.js.map
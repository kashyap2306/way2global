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
const collectionInitializer_1 = require("../services/collectionInitializer");
const userSignupService_1 = require("../services/userSignupService");
// Enhanced validation schema for MLM platform
const signupSchema = Joi.object({
    email: Joi.string().email().pattern(/^[a-zA-Z0-9._%+-]+@gmail\.com$/).required()
        .messages({
        'string.pattern.base': 'Only Gmail addresses are allowed'
    }),
    password: Joi.string().min(6).max(128).required(),
    displayName: Joi.string().min(2).max(50).required(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required()
        .messages({
        'string.pattern.base': 'Invalid phone number format'
    }),
    walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
        .messages({
        'string.pattern.base': 'Invalid USDT BEP20 wallet address'
    }),
    sponsorId: Joi.string().optional().allow('', null)
});
/**
 * Callable function for user signup
 */
exports.signup = functions.https.onCall(async (data, context) => {
    try {
        // Rate limiting check (basic implementation)
        await checkRateLimit(context.rawRequest?.ip || 'unknown');
        // Validate input data
        const { error, value } = signupSchema.validate(data);
        if (error) {
            throw new functions.https.HttpsError('invalid-argument', `Validation error: ${error.details[0].message}`);
        }
        const validatedData = value;
        await logger_1.logger.info(logger_1.LogCategory.AUTH, 'User signup attempt', undefined, { email: validatedData.email, sponsorId: validatedData.sponsorId });
        // Check if user already exists
        await checkExistingUser(validatedData.email, validatedData.phone, validatedData.walletAddress);
        // Validate sponsor if provided
        let sponsorData = null;
        if (validatedData.sponsorId) {
            sponsorData = await validateSponsor(validatedData.sponsorId);
        }
        // Create Firebase Auth user
        const userRecord = await createAuthUser(validatedData);
        // Check if user documents already exist (prevent duplicates)
        const documentsExist = await (0, userSignupService_1.checkUserDocumentsExist)(userRecord.uid);
        if (documentsExist) {
            throw new functions.https.HttpsError('already-exists', 'User documents already exist');
        }
        // Create all user documents with comprehensive system
        await (0, userSignupService_1.createAllUserDocuments)(userRecord.uid, validatedData, validatedData.sponsorId);
        // Initialize global collections (if not already done)
        await (0, collectionInitializer_1.initializeGlobalCollections)();
        // Update sponsor's referrals array if sponsor exists
        if (sponsorData && validatedData.sponsorId) {
            await updateSponsorReferrals(validatedData.sponsorId, userRecord.uid);
        }
        // Generate custom token for immediate login
        const customToken = await admin.auth().createCustomToken(userRecord.uid);
        await logger_1.logger.info(logger_1.LogCategory.AUTH, 'User signup successful', userRecord.uid, { email: validatedData.email, sponsorId: validatedData.sponsorId });
        return {
            success: true,
            message: config_1.successMessages.USER_CREATED,
            uid: userRecord.uid,
            customToken,
            userData: {
                uid: userRecord.uid,
                displayName: validatedData.displayName,
                email: validatedData.email,
                rank: 'Azurite',
                status: 'active'
            }
        };
    }
    catch (error) {
        await logger_1.logger.error(logger_1.LogCategory.AUTH, 'User signup failed', error, undefined, { email: data.email, sponsorId: data.sponsorId });
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', config_1.errorCodes.SIGNUP_FAILED, error.message);
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
            const attempts = data?.attempts || [];
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
        await logger_1.logger.warn(logger_1.LogCategory.AUTH, 'Rate limit check failed', undefined, { ip, error: error.message });
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
 * Validate sponsor ID and return sponsor data
 */
async function validateSponsor(sponsorId) {
    const db = admin.firestore();
    try {
        const sponsorDoc = await db.collection(config_1.collections.USERS).doc(sponsorId).get();
        if (!sponsorDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Sponsor not found');
        }
        const sponsorData = sponsorDoc.data();
        if (sponsorData?.status !== 'active') {
            throw new functions.https.HttpsError('failed-precondition', 'Sponsor account is not active');
        }
        return {
            uid: sponsorDoc.id,
            ...sponsorData
        };
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
            displayName: userData.displayName,
            emailVerified: false,
            disabled: false
        });
        // Set custom claims for MLM platform
        await admin.auth().setCustomUserClaims(userRecord.uid, {
            role: 'user',
            status: 'active',
            rank: 'Azurite'
        });
        return userRecord;
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', 'Failed to create user account', error);
    }
}
/**
 * Update sponsor's referrals array
 */
async function updateSponsorReferrals(sponsorId, newUserId) {
    const db = admin.firestore();
    try {
        await db.collection(config_1.collections.USERS).doc(sponsorId).update({
            referrals: admin.firestore.FieldValue.arrayUnion(newUserId),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    catch (error) {
        await logger_1.logger.error(logger_1.LogCategory.SYSTEM, 'Failed to update sponsor referrals', error);
        // Don't throw error as this is not critical for signup
    }
}
//# sourceMappingURL=signup.js.map
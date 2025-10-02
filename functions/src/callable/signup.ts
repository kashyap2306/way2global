/**
 * Callable Function - User Signup
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();
import * as Joi from 'joi';

import { logger, LogCategory } from '../utils/logger';
import { collections, errorCodes, successMessages, rateLimits } from '../config';
import { initializeGlobalCollections } from '../services/collectionInitializer';
import { createAllUserDocuments, checkUserDocumentsExist } from '../services/userSignupService';

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

interface SignupData {
  email: string;
  password: string;
  displayName: string;
  phone: string;
  walletAddress: string;
  sponsorId?: string;
}

interface SignupResponse {
  success: boolean;
  message: string;
  uid?: string;
  customToken?: string;
  userData?: any;
}

/**
 * Callable function for user signup
 */
export const signup = functions.https.onCall(async (data: SignupData, context): Promise<SignupResponse> => {
  try {
    // Rate limiting check (basic implementation)
    await checkRateLimit(context.rawRequest?.ip || 'unknown');

    // Validate input data
    const { error, value } = signupSchema.validate(data);
    if (error) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Validation error: ${error.details[0].message}`
      );
    }

    const validatedData = value as SignupData;

    await logger.info(
      LogCategory.AUTH,
      'User signup attempt',
      undefined,
      { email: validatedData.email, sponsorId: validatedData.sponsorId }
    );

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
    const documentsExist = await checkUserDocumentsExist(userRecord.uid);
    if (documentsExist) {
      throw new functions.https.HttpsError(
        'already-exists',
        'User documents already exist'
      );
    }

    // Create all user documents with comprehensive system
    await createAllUserDocuments(userRecord.uid, validatedData, validatedData.sponsorId);

    // Initialize global collections (if not already done)
    await initializeGlobalCollections();

    // Update sponsor's referrals array if sponsor exists
    if (sponsorData && validatedData.sponsorId) {
      await updateSponsorReferrals(validatedData.sponsorId, userRecord.uid);
    }

    // Generate custom token for immediate login
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    await logger.info(
      LogCategory.AUTH,
      'User signup successful',
      userRecord.uid,
      { email: validatedData.email, sponsorId: validatedData.sponsorId }
    );

    return {
      success: true,
      message: successMessages.USER_CREATED,
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

  } catch (error: any) {
    await logger.error(
      LogCategory.AUTH,
      'User signup failed',
      error,
      undefined,
      { email: data.email, sponsorId: data.sponsorId }
    );

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      errorCodes.SIGNUP_FAILED,
      error.message
    );
  }
});

/**
 * Check rate limiting for signup attempts
 */
async function checkRateLimit(ip: string): Promise<void> {
  const db = admin.firestore();
  const now = Date.now();
  const windowStart = now - (rateLimits.signup.windowMs);

  try {
    const rateLimitDoc = await db
      .collection('rateLimits')
      .doc(`signup_${ip}`)
      .get();

    if (rateLimitDoc.exists) {
      const data = rateLimitDoc.data();
      const attempts = data?.attempts || [];
      
      // Filter attempts within the current window
      const recentAttempts = attempts.filter((timestamp: number) => timestamp > windowStart);

      if (recentAttempts.length >= rateLimits.signup.max) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'Too many signup attempts. Please try again later.'
        );
      }

      // Update attempts
      await rateLimitDoc.ref.update({
        attempts: [...recentAttempts, now],
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Create new rate limit document
      await db.collection('rateLimits').doc(`signup_${ip}`).set({
        attempts: [now],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    // Log error but don't block signup for rate limit check failures
    await logger.warn(
      LogCategory.AUTH,
      'Rate limit check failed',
      undefined,
      { ip, error: (error as Error).message }
    );
  }
}

/**
 * Check if user already exists with email, contact, or wallet address
 */
async function checkExistingUser(email: string, contact: string, walletAddress: string): Promise<void> {
  const db = admin.firestore();

  try {
    // Check Firebase Auth for email
    try {
      await admin.auth().getUserByEmail(email);
      throw new functions.https.HttpsError(
        'already-exists',
        'User with this email already exists'
      );
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Check Firestore for contact and wallet address
    const [contactQuery, walletQuery] = await Promise.all([
      db.collection(collections.USERS).where('contact', '==', contact).limit(1).get(),
      db.collection(collections.USERS).where('walletAddress', '==', walletAddress).limit(1).get()
    ]);

    if (!contactQuery.empty) {
      throw new functions.https.HttpsError(
        'already-exists',
        'User with this contact number already exists'
      );
    }

    if (!walletQuery.empty) {
      throw new functions.https.HttpsError(
        'already-exists',
        'User with this wallet address already exists'
      );
    }

  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      'internal',
      'Failed to check existing user',
      error
    );
  }
}

/**
 * Validate sponsor ID and return sponsor data
 */
async function validateSponsor(sponsorId: string): Promise<any> {
  const db = admin.firestore();

  try {
    const sponsorDoc = await db.collection(collections.USERS).doc(sponsorId).get();

    if (!sponsorDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Sponsor not found'
      );
    }

    const sponsorData = sponsorDoc.data();

    if (sponsorData?.status !== 'active') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Sponsor account is not active'
      );
    }

    return {
      uid: sponsorDoc.id,
      ...sponsorData
    };

  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      'internal',
      'Failed to validate sponsor',
      error
    );
  }
}

/**
 * Create Firebase Auth user
 */
async function createAuthUser(userData: SignupData): Promise<admin.auth.UserRecord> {
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

  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      'Failed to create user account',
      error
    );
  }
}



/**
 * Update sponsor's referrals array
 */
async function updateSponsorReferrals(sponsorId: string, newUserId: string): Promise<void> {
  const db = admin.firestore();
  
  try {
    // Get current sponsor data to check direct referrals count
    const sponsorDoc = await db.collection(collections.USERS).doc(sponsorId).get();
    const sponsorData = sponsorDoc.data();
    
    if (!sponsorData) {
      throw new Error('Sponsor not found');
    }
    
    const currentDirectReferrals = sponsorData.directReferrals || 0;
    const newDirectReferrals = currentDirectReferrals + 1;
    
    // Update sponsor with new referral and direct referral count
    const updateData: any = {
      referrals: admin.firestore.FieldValue.arrayUnion(newUserId),
      directReferrals: newDirectReferrals,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // If sponsor reaches 2 direct referrals, make them eligible to claim income
    if (newDirectReferrals >= 2 && !sponsorData.claimEligible) {
      updateData.claimEligible = true;
      
      // Mark all unclaimed income transactions as claimable
      const incomeQuery = await db.collection(collections.INCOME_TRANSACTIONS)
        .where('userId', '==', sponsorId)
        .where('claimed', '==', false)
        .get();
      
      const batch = db.batch();
      incomeQuery.docs.forEach(doc => {
        batch.update(doc.ref, { claimable: true });
      });
      
      if (!incomeQuery.empty) {
        await batch.commit();
      }
    }
    
    await db.collection(collections.USERS).doc(sponsorId).update(updateData);
    
  } catch (error) {
    await logger.error(LogCategory.SYSTEM, 'Failed to update sponsor referrals', error as Error);
    // Don't throw error as this is not critical for signup
  }
}
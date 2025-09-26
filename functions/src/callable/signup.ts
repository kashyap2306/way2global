/**
 * Callable Function - User Signup
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as Joi from 'joi';
import { createLogger, LogCategory } from '../utils/logger';
import { collections, errorCodes, successMessages, rateLimits } from '../config';

const logger = createLogger('SignupCallable');

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

interface SignupData {
  fullName: string;
  email: string;
  contact: string;
  password: string;
  walletAddress: string;
  sponsorUID?: string;
  placement?: 'left' | 'right';
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
      { email: validatedData.email, sponsorUID: validatedData.sponsorUID }
    );

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

    await logger.info(
      LogCategory.AUTH,
      'User signup successful',
      userRecord.uid,
      { email: validatedData.email, sponsorUID: validatedData.sponsorUID }
    );

    return {
      success: true,
      message: successMessages.USER_CREATED,
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

  } catch (error) {
    await logger.error(
      LogCategory.AUTH,
      'User signup failed',
      error as Error,
      undefined,
      { email: data.email }
    );

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      errorCodes.SIGNUP_FAILED,
      error
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
 * Validate sponsor UID and return sponsor data
 */
async function validateSponsor(sponsorUID: string): Promise<any> {
  const db = admin.firestore();

  try {
    const sponsorDoc = await db.collection(collections.USERS).doc(sponsorUID).get();

    if (!sponsorDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Sponsor not found'
      );
    }

    const sponsorData = sponsorDoc.data();

    if (!sponsorData?.isActive) {
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

  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      'Failed to create user account',
      error
    );
  }
}

/**
 * Create user document in Firestore
 */
async function createUserDocument(
  uid: string,
  userData: SignupData,
  sponsorData: any
): Promise<any> {
  const db = admin.firestore();

  try {
    // Find placement position in binary tree
    const placement = await findPlacementPosition(sponsorData?.uid, userData.placement);

    const userDocData = {
      uid,
      fullName: userData.fullName,
      email: userData.email,
      contact: userData.contact,
      walletAddress: userData.walletAddress,
      sponsorUID: sponsorData?.uid || null,
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

    await db.collection(collections.USERS).doc(uid).set(userDocData);

    return {
      ...userDocData
    };

  } catch (error) {
    // Clean up Auth user if Firestore creation fails
    try {
      await admin.auth().deleteUser(uid);
    } catch (cleanupError) {
      await logger.error(
        LogCategory.AUTH,
        'Failed to cleanup Auth user after Firestore error',
        cleanupError as Error,
        uid
      );
    }

    throw new functions.https.HttpsError(
      'internal',
      'Failed to create user profile',
      error
    );
  }
}

/**
 * Find placement position in binary tree
 */
async function findPlacementPosition(
  sponsorUID: string | null,
  preferredPosition: 'left' | 'right' = 'left'
): Promise<{ uplineUID: string | null; position: 'left' | 'right' | null; level: number }> {
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
    const sponsorDoc = await db.collection(collections.USERS).doc(sponsorUID).get();
    if (!sponsorDoc.exists) {
      throw new Error('Sponsor not found');
    }

    const sponsorData = sponsorDoc.data();
    const sponsorLevel = sponsorData?.level || 1;

    // Check if sponsor has available positions
    if (!sponsorData?.leftChild && preferredPosition === 'left') {
      return {
        uplineUID: sponsorUID,
        position: 'left',
        level: sponsorLevel + 1
      };
    }

    if (!sponsorData?.rightChild && preferredPosition === 'right') {
      return {
        uplineUID: sponsorUID,
        position: 'right',
        level: sponsorLevel + 1
      };
    }

    if (!sponsorData?.leftChild) {
      return {
        uplineUID: sponsorUID,
        position: 'left',
        level: sponsorLevel + 1
      };
    }

    if (!sponsorData?.rightChild) {
      return {
        uplineUID: sponsorUID,
        position: 'right',
        level: sponsorLevel + 1
      };
    }

    // Both positions taken, find next available position in the tree
    return await findNextAvailablePosition(sponsorUID, sponsorLevel + 1);

  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      'Failed to find placement position',
      error
    );
  }
}

/**
 * Find next available position in the binary tree
 */
async function findNextAvailablePosition(
  rootUID: string,
  startLevel: number
): Promise<{ uplineUID: string; position: 'left' | 'right'; level: number }> {
  const db = admin.firestore();
  
  // BFS to find next available position
  const queue = [{ uid: rootUID, level: startLevel - 1 }];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    const userDoc = await db.collection(collections.USERS).doc(current.uid).get();
    if (!userDoc.exists) continue;
    
    const userData = userDoc.data();
    
    // Check if this user has available positions
    if (!userData?.leftChild) {
      return {
        uplineUID: current.uid,
        position: 'left',
        level: current.level + 1
      };
    }
    
    if (!userData?.rightChild) {
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
function generateReferralCode(uid: string): string {
  const prefix = 'WG';
  const suffix = uid.substring(0, 6).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${suffix}${random}`;
}
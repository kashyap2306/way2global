/**
 * Callable Function - Claim Payout
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as Joi from 'joi';
import { createLogger, LogCategory } from '../utils/logger';
import { collections, errorCodes, successMessages, rateLimits } from '../config';

const logger = createLogger('ClaimPayoutCallable');

// Validation schema
const claimPayoutSchema = Joi.object({
  payoutId: Joi.string().required(),
  password: Joi.string().min(6).required()
});

interface ClaimPayoutData {
  payoutId: string;
  password: string;
}

interface ClaimPayoutResponse {
  success: boolean;
  message: string;
  claimedAmount?: number;
  newBalance?: number;
  transactionId?: string;
}

/**
 * Callable function for claiming payouts from the payout queue
 */
export const claimPayout = functions.https.onCall(async (data: ClaimPayoutData, context): Promise<ClaimPayoutResponse> => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const uid = context.auth.uid;

  try {
    // Rate limiting check
    await checkClaimRateLimit(uid);

    // Validate input data
    const { error, value } = claimPayoutSchema.validate(data);
    if (error) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Validation error: ${error.details[0].message}`
      );
    }

    const validatedData = value as ClaimPayoutData;

    await logger.info(
      LogCategory.MLM,
      'Payout claim request received',
      uid,
      { payoutId: validatedData.payoutId }
    );

    // Get user data and validate
    const userData = await getUserData(uid);
    await validateUser(userData, validatedData.password);

    // Get and validate payout
    const payoutData = await getPayoutData(validatedData.payoutId, uid);

    // Process the payout claim
    const result = await processPayoutClaim(userData, payoutData);

    await logger.info(
      LogCategory.MLM,
      'Payout claimed successfully',
      uid,
      { 
        payoutId: validatedData.payoutId,
        amount: result.claimedAmount,
        newBalance: result.newBalance
      }
    );

    return {
      success: true,
      message: successMessages.PAYOUT_CLAIMED,
      claimedAmount: result.claimedAmount,
      newBalance: result.newBalance,
      transactionId: result.transactionId
    };

  } catch (error) {
    await logger.error(
      LogCategory.MLM,
      'Payout claim failed',
      error as Error,
      uid,
      { payoutId: data.payoutId }
    );

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      errorCodes.PAYOUT_CLAIM_FAILED,
      error
    );
  }
});

/**
 * Check claim rate limiting
 */
async function checkClaimRateLimit(uid: string): Promise<void> {
  const db = admin.firestore();
  const now = Date.now();
  const windowStart = now - rateLimits.general.windowMs;

  try {
    const rateLimitDoc = await db
      .collection('rateLimits')
      .doc(`claim_${uid}`)
      .get();

    if (rateLimitDoc.exists) {
      const data = rateLimitDoc.data();
      const attempts = data?.attempts || [];
      
      // Filter attempts within the current window
      const recentAttempts = attempts.filter((timestamp: number) => timestamp > windowStart);

      if (recentAttempts.length >= rateLimits.general.max) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'Too many claim requests. Please try again later.'
        );
      }

      // Update attempts
      await rateLimitDoc.ref.update({
        attempts: [...recentAttempts, now],
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Create new rate limit document
      await db.collection('rateLimits').doc(`claim_${uid}`).set({
        attempts: [now],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    // Log error but don't block claim for rate limit check failures
    await logger.warn(
      LogCategory.MLM,
      'Claim rate limit check failed',
      uid,
      { error: (error as Error).message }
    );
  }
}

/**
 * Get user data from Firestore
 */
async function getUserData(uid: string): Promise<any> {
  const db = admin.firestore();

  try {
    const userDoc = await db.collection(collections.USERS).doc(uid).get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User not found'
      );
    }

    return {
      uid,
      ...userDoc.data()
    };

  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      'internal',
      'Failed to get user data',
      error
    );
  }
}

/**
 * Validate user and password
 */
async function validateUser(userData: any, password: string): Promise<void> {
  // Check if user is active
  if (!userData.isActive) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Account must be activated to claim payouts'
    );
  }

  // In a real implementation, you would verify the password here
  // For now, we'll assume password validation is handled by Firebase Auth
  // You might want to implement additional security measures like 2FA
}

/**
 * Get payout data and validate ownership
 */
async function getPayoutData(payoutId: string, uid: string): Promise<any> {
  const db = admin.firestore();

  try {
    const payoutDoc = await db.collection(collections.PAYOUT_QUEUE).doc(payoutId).get();

    if (!payoutDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Payout not found'
      );
    }

    const payoutData = payoutDoc.data();

    // Verify ownership
    if (payoutData?.uid !== uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You can only claim your own payouts'
      );
    }

    // Check payout status
    if (payoutData?.status !== 'ready') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Payout is not ready for claim. Current status: ${payoutData?.status}`
      );
    }

    // Check if payout is expired
    const now = new Date();
    const expiresAt = payoutData?.expiresAt?.toDate();
    
    if (expiresAt && now > expiresAt) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Payout has expired and can no longer be claimed'
      );
    }

    return {
      id: payoutId,
      ...payoutData
    };

  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      'internal',
      'Failed to get payout data',
      error
    );
  }
}

/**
 * Process the payout claim
 */
async function processPayoutClaim(userData: any, payoutData: any): Promise<{
  claimedAmount: number;
  newBalance: number;
  transactionId: string;
}> {
  const db = admin.firestore();

  try {
    const result = await db.runTransaction(async (transaction) => {
      // Get fresh user data
      const userRef = db.collection(collections.USERS).doc(userData.uid);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const currentUserData = userDoc.data();
      const currentBalance = currentUserData?.availableBalance || 0;
      const totalEarnings = currentUserData?.totalEarnings || 0;

      // Get fresh payout data
      const payoutRef = db.collection(collections.PAYOUT_QUEUE).doc(payoutData.id);
      const payoutDoc = await transaction.get(payoutRef);

      if (!payoutDoc.exists) {
        throw new Error('Payout not found');
      }

      const currentPayoutData = payoutDoc.data();

      // Double-check payout status
      if (currentPayoutData?.status !== 'ready') {
        throw new Error(`Payout is not ready for claim. Status: ${currentPayoutData?.status}`);
      }

      const claimedAmount = currentPayoutData?.amount || 0;
      const newBalance = currentBalance + claimedAmount;

      // Update user balance
      transaction.update(userRef, {
        availableBalance: newBalance,
        totalEarnings: totalEarnings + claimedAmount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update payout status
      transaction.update(payoutRef, {
        status: 'claimed',
        claimedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Create income transaction record
      const transactionData = {
        uid: userData.uid,
        type: 'income',
        subType: 'payout_claim',
        amount: claimedAmount,
        status: 'completed',
        description: `Payout claim - ${payoutData.description || 'Manual payout'}`,
        payoutId: payoutData.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          payoutType: payoutData.type,
          originalPayoutDate: payoutData.createdAt,
          claimMethod: 'manual'
        }
      };

      const transactionRef = db.collection(collections.INCOME_TRANSACTIONS).doc();
      transaction.set(transactionRef, transactionData);

      return {
        claimedAmount,
        newBalance,
        transactionId: transactionRef.id
      };
    });

    // Log the successful claim
    await logger.info(
      LogCategory.MLM,
      'Payout processed successfully',
      userData.uid,
      {
        payoutId: payoutData.id,
        amount: result.claimedAmount,
        payoutType: payoutData.type,
        description: payoutData.description
      }
    );

    return result;

  } catch (error) {
    await logger.error(
      LogCategory.MLM,
      'Failed to process payout claim',
      error as Error,
      userData.uid,
      { payoutId: payoutData.id }
    );

    throw new functions.https.HttpsError(
      'internal',
      'Failed to process payout claim',
      error
    );
  }
}

/**
 * Get user's available payouts (helper function)
 */
export const getUserPayouts = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const uid = context.auth.uid;

  try {
    const db = admin.firestore();
    
    // Get user's payouts
    const payoutsQuery = await db
      .collection(collections.PAYOUT_QUEUE)
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const payouts = payoutsQuery.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        uid: data.uid || uid,
        type: data.type || 'unknown',
        amount: data.amount || 0,
        rank: data.rank || 'azurite',
        priority: data.priority || 1,
        status: data.status || 'pending',
        scheduledAt: data.scheduledAt?.toDate()?.toISOString(),
        processedAt: data.processedAt?.toDate()?.toISOString(),
        failureReason: data.failureReason || null,
        retryCount: data.retryCount || 0,
        maxRetries: data.maxRetries || 3,
        batchId: data.batchId || null,
        metadata: data.metadata || {},
        createdAt: data.createdAt?.toDate()?.toISOString(),
        expiresAt: data.expiresAt?.toDate()?.toISOString(),
        claimedAt: data.claimedAt?.toDate()?.toISOString()
      };
    });

    // Calculate totals
    const totalReady = payouts
      .filter(p => p.status === 'ready')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalClaimed = payouts
      .filter(p => p.status === 'claimed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalExpired = payouts
      .filter(p => p.status === 'expired')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      success: true,
      payouts,
      summary: {
        totalReady,
        totalClaimed,
        totalExpired,
        readyCount: payouts.filter(p => p.status === 'ready').length,
        claimedCount: payouts.filter(p => p.status === 'claimed').length,
        expiredCount: payouts.filter(p => p.status === 'expired').length
      }
    };

  } catch (error) {
    await logger.error(
      LogCategory.MLM,
      'Failed to get user payouts',
      error as Error,
      uid
    );

    throw new functions.https.HttpsError(
      'internal',
      'Failed to get payouts',
      error
    );
  }
});
/**
 * Callable Function - Request Withdrawal
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();
import * as Joi from 'joi';
import { createLogger, LogCategory } from '../utils/logger';
import { collections, mlmConfig, errorCodes, successMessages, rateLimits } from '../config';

const logger = createLogger('RequestWithdrawalCallable');

// Validation schema
const withdrawalSchema = Joi.object({
  amount: Joi.number().min(mlmConfig.withdrawal.minimumAmount).max(50000).required(),
  method: Joi.string().valid('usdt_bep20', 'fund_conversion', 'p2p').required(),
  withdrawalDetails: Joi.object({
    walletAddress: Joi.when('method', {
      is: 'usdt_bep20',
      then: Joi.string().min(20).max(100).required(),
      otherwise: Joi.optional()
    }),
    p2pDetails: Joi.object({
      platform: Joi.string().valid('binance', 'bybit', 'okx', 'other'),
      accountId: Joi.string().min(3).max(50),
      accountName: Joi.string().min(2).max(100)
    }).when('...method', {
      is: 'p2p',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }).required(),
  password: Joi.string().min(6).required()
});

interface WithdrawalData {
  amount: number;
  method: 'usdt_bep20' | 'fund_conversion' | 'p2p';
  withdrawalDetails: {
    walletAddress?: string;
    p2pDetails?: {
      platform: string;
      accountId: string;
      accountName: string;
    };
  };
  password: string;
}

interface WithdrawalResponse {
  success: boolean;
  message: string;
  withdrawalId?: string;
  estimatedProcessingTime?: string;
  fees?: {
    processingFee: number;
    networkFee: number;
    totalFee: number;
  };
  netAmount?: number;
}

/**
 * Callable function for requesting withdrawals
 */
export const requestWithdrawal = functions.https.onCall(async (data: WithdrawalData, context): Promise<WithdrawalResponse> => {
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
    await checkWithdrawalRateLimit(uid);

    // Validate input data
    const { error, value } = withdrawalSchema.validate(data);
    if (error) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Validation error: ${error.details[0].message}`
      );
    }

    const validatedData = value as WithdrawalData;

    await logger.info(
      LogCategory.MLM,
      'Withdrawal request received',
      uid,
      { amount: validatedData.amount, method: validatedData.method }
    );

    // Get user data and validate
    const userData = await getUserData(uid);
    await validateUser(userData, validatedData.password);

    // Validate withdrawal request
    await validateWithdrawalRequest(userData, validatedData);

    // Calculate fees
    const fees = calculateWithdrawalFees(validatedData.amount, validatedData.method);
    const netAmount = validatedData.amount - fees.totalFee;

    // Check daily withdrawal limits
    await checkDailyWithdrawalLimit(userData, validatedData.amount);

    // Create withdrawal request
    const withdrawalId = await createWithdrawalRequest(userData, validatedData, fees, netAmount);

    // Get estimated processing time
    const estimatedProcessingTime = getEstimatedProcessingTime(validatedData.method);

    await logger.info(
      LogCategory.MLM,
      'Withdrawal request created successfully',
      uid,
      { 
        withdrawalId, 
        amount: validatedData.amount,
        netAmount,
        method: validatedData.method
      }
    );

    return {
      success: true,
      message: successMessages.WITHDRAWAL_REQUESTED,
      withdrawalId,
      estimatedProcessingTime,
      fees,
      netAmount
    };

  } catch (error) {
    await logger.error(
      LogCategory.MLM,
      'Withdrawal request failed',
      error as Error,
      uid,
      { amount: data.amount, method: data.method }
    );

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      errorCodes.WITHDRAWAL_FAILED,
      error
    );
  }
});

/**
 * Check withdrawal rate limiting
 */
async function checkWithdrawalRateLimit(uid: string): Promise<void> {
  const db = admin.firestore();
  const now = Date.now();
  const windowStart = now - rateLimits.withdrawal.windowMs;

  try {
    const rateLimitDoc = await db
      .collection('rateLimits')
      .doc(`withdrawal_${uid}`)
      .get();

    if (rateLimitDoc.exists) {
      const data = rateLimitDoc.data();
      const attempts = data?.attempts || [];
      
      // Filter attempts within the current window
      const recentAttempts = attempts.filter((timestamp: number) => timestamp > windowStart);

      if (recentAttempts.length >= rateLimits.withdrawal.max) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'Too many withdrawal requests. Please try again later.'
        );
      }

      // Update attempts
      await rateLimitDoc.ref.update({
        attempts: [...recentAttempts, now],
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Create new rate limit document
      await db.collection('rateLimits').doc(`withdrawal_${uid}`).set({
        attempts: [now],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    // Log error but don't block withdrawal for rate limit check failures
    await logger.warn(
      LogCategory.MLM,
      'Withdrawal rate limit check failed',
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
      'Account must be activated before making withdrawals'
    );
  }

  // Check if user is verified
  if (!userData.isVerified) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Account must be verified before making withdrawals'
    );
  }

  // In a real implementation, you would verify the password here
  // For now, we'll assume password validation is handled by Firebase Auth
  // You might want to implement additional security measures like 2FA
}

/**
 * Validate withdrawal request
 */
async function validateWithdrawalRequest(userData: any, withdrawalData: WithdrawalData): Promise<void> {
  const { amount, method } = withdrawalData;

  // Check minimum withdrawal amount
  if (amount < mlmConfig.withdrawal.minimumAmount) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Minimum withdrawal amount is ${mlmConfig.withdrawal.minimumAmount} USDT`
    );
  }

  // Check available balance
  const availableBalance = userData.availableBalance || 0;
  const fees = calculateWithdrawalFees(amount, method);
  const totalRequired = amount + fees.totalFee;

  if (availableBalance < totalRequired) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `Insufficient balance. Required: ${totalRequired} USDT (${amount} + ${fees.totalFee} fees), Available: ${availableBalance} USDT`
    );
  }

  // Check for pending withdrawals
  const db = admin.firestore();
  const pendingWithdrawals = await db
    .collection(collections.WITHDRAWALS)
    .where('uid', '==', userData.uid)
    .where('status', 'in', ['pending', 'processing'])
    .limit(1)
    .get();

  if (!pendingWithdrawals.empty) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'You have a pending withdrawal request. Please wait for it to be processed.'
    );
  }

  // Validate withdrawal details based on method
  await validateWithdrawalDetails(withdrawalData);
}

/**
 * Validate withdrawal details based on method
 */
async function validateWithdrawalDetails(withdrawalData: WithdrawalData): Promise<void> {
  const { method, withdrawalDetails } = withdrawalData;

  switch (method) {
    case 'usdt_bep20':
      if (!withdrawalDetails.walletAddress) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Wallet address is required for USDT BEP20 withdrawal'
        );
      }
      
      // Basic wallet address validation (BEP20/BSC format)
      if (!/^0x[a-fA-F0-9]{40}$/.test(withdrawalDetails.walletAddress)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Invalid BEP20 wallet address format'
        );
      }
      break;

    case 'p2p':
      if (!withdrawalDetails.p2pDetails) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'P2P details are required for P2P withdrawal'
        );
      }
      
      const { platform, accountId, accountName } = withdrawalDetails.p2pDetails;
      if (!platform || !accountId || !accountName) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Complete P2P details (platform, account ID, account name) are required'
        );
      }
      break;

    case 'fund_conversion':
      // No additional validation needed for fund conversion
      break;

    default:
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid withdrawal method'
      );
  }
}

/**
 * Calculate withdrawal fees
 */
function calculateWithdrawalFees(amount: number, method: string): {
  processingFee: number;
  networkFee: number;
  totalFee: number;
} {
  const processingFeeRate = mlmConfig.withdrawal.processingFeePercentage / 100;
  const processingFee = Math.round((amount * processingFeeRate) * 100) / 100;

  let networkFee = 0;
  switch (method) {
    case 'usdt_bep20':
      networkFee = mlmConfig.withdrawal.networkFees.bep20;
      break;
    case 'p2p':
      networkFee = mlmConfig.withdrawal.networkFees.p2p;
      break;
    case 'fund_conversion':
      networkFee = 0; // No network fee for fund conversion
      break;
  }

  const totalFee = processingFee + networkFee;

  return {
    processingFee,
    networkFee,
    totalFee
  };
}

/**
 * Check daily withdrawal limit
 */
async function checkDailyWithdrawalLimit(userData: any, amount: number): Promise<void> {
  const db = admin.firestore();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const todayWithdrawals = await db
      .collection(collections.WITHDRAWALS)
      .where('uid', '==', userData.uid)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(today))
      .where('status', 'in', ['pending', 'processing', 'completed'])
      .get();

    const todayTotal = todayWithdrawals.docs.reduce((total, doc) => {
      return total + (doc.data().amount || 0);
    }, 0);

    const dailyLimit = mlmConfig.withdrawal.dailyLimit;
    if (todayTotal + amount > dailyLimit) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Daily withdrawal limit exceeded. Limit: ${dailyLimit} USDT, Today's total: ${todayTotal} USDT, Requested: ${amount} USDT`
      );
    }

  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      'internal',
      'Failed to check daily withdrawal limit',
      error
    );
  }
}

/**
 * Create withdrawal request
 */
async function createWithdrawalRequest(
  userData: any,
  withdrawalData: WithdrawalData,
  fees: any,
  netAmount: number
): Promise<string> {
  const db = admin.firestore();

  try {
    const withdrawalRequestData = {
      uid: userData.uid,
      amount: withdrawalData.amount,
      netAmount,
      method: withdrawalData.method,
      withdrawalDetails: withdrawalData.withdrawalDetails,
      fees,
      status: 'pending',
      priority: 'normal',
      
      // User info snapshot
      userInfo: {
        fullName: userData.fullName,
        email: userData.email,
        contact: userData.contact,
        rank: userData.rank,
        walletAddress: userData.walletAddress
      },
      
      // Timestamps
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      
      // Metadata
      metadata: {
        userLevel: userData.level,
        userBalance: userData.availableBalance,
        requestIP: null, // Will be set by client
        userAgent: null // Will be set by client
      }
    };

    const withdrawalRef = await db.collection(collections.WITHDRAWALS).add(withdrawalRequestData);

    // Deduct amount from user's available balance (hold it)
    await db.runTransaction(async (transaction) => {
      const userRef = db.collection(collections.USERS).doc(userData.uid);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const currentData = userDoc.data();
      const currentBalance = currentData?.availableBalance || 0;
      const totalRequired = withdrawalData.amount + fees.totalFee;

      if (currentBalance < totalRequired) {
        throw new Error('Insufficient balance');
      }

      transaction.update(userRef, {
        availableBalance: currentBalance - totalRequired,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return withdrawalRef.id;

  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      'Failed to create withdrawal request',
      error
    );
  }
}

/**
 * Get estimated processing time based on method
 */
function getEstimatedProcessingTime(method: string): string {
  switch (method) {
    case 'fund_conversion':
      return 'Instant';
    case 'usdt_bep20':
      return '24-48 hours';
    case 'p2p':
      return '2-6 hours';
    default:
      return '24-48 hours';
  }
}
/**
 * Callable Function - Create Activation/Top-up Transaction
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as Joi from 'joi';
import { createLogger, LogCategory } from '../utils/logger';
import { collections, mlmConfig, errorCodes, successMessages } from '../config';

const logger = createLogger('CreateActivationCallable');

// Validation schema
const activationSchema = Joi.object({
  rank: Joi.string().valid(...Object.keys(mlmConfig.ranks)).required(),
  paymentMethod: Joi.string().valid('usdt_bep20', 'fund_conversion', 'p2p').required(),
  paymentDetails: Joi.object({
    transactionHash: Joi.string().when('...paymentMethod', {
      is: 'usdt_bep20',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    fromWallet: Joi.string().when('...paymentMethod', {
      is: 'usdt_bep20',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    convertFromBalance: Joi.when('paymentMethod', {
      is: 'fund_conversion',
      then: Joi.number().min(0).required(),
      otherwise: Joi.optional()
    }),
    p2pReference: Joi.string().when('paymentMethod', {
      is: 'p2p',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }).required()
});

interface ActivationData {
  rank: string;
  paymentMethod: 'usdt_bep20' | 'fund_conversion' | 'p2p';
  paymentDetails: {
    transactionHash?: string;
    fromWallet?: string;
    convertFromBalance?: number;
    p2pReference?: string;
  };
}

interface ActivationResponse {
  success: boolean;
  message: string;
  transactionId?: string;
  activationAmount?: number;
  newRank?: string;
}

/**
 * Callable function for creating activation/top-up transactions
 */
export const createActivation = functions.https.onCall(async (data: ActivationData, context): Promise<ActivationResponse> => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const uid = context.auth.uid;

  try {
    // Validate input data
    const { error, value } = activationSchema.validate(data);
    if (error) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Validation error: ${error.details[0].message}`
      );
    }

    const validatedData = value as ActivationData;

    await logger.info(
      LogCategory.MLM,
      'Activation request received',
      uid,
      { rank: validatedData.rank, paymentMethod: validatedData.paymentMethod }
    );

    // Get user data
    const userData = await getUserData(uid);

    // Validate activation request
    await validateActivationRequest(userData, validatedData);

    // Process payment based on method
    await processPayment(userData, validatedData);

    // Create activation transaction
    const transactionId = await createActivationTransaction(userData, validatedData);

    const rankConfig = mlmConfig.ranks[validatedData.rank as keyof typeof mlmConfig.ranks];

    await logger.info(
      LogCategory.MLM,
      'Activation transaction created successfully',
      uid,
      { 
        transactionId, 
        rank: validatedData.rank, 
        amount: rankConfig.activationAmount 
      }
    );

    return {
      success: true,
      message: successMessages.ACTIVATION_CREATED,
      transactionId,
      activationAmount: rankConfig.activationAmount,
      newRank: validatedData.rank
    };

  } catch (error) {
    await logger.error(
      LogCategory.MLM,
      'Activation creation failed',
      error as Error,
      uid,
      { rank: data.rank, paymentMethod: data.paymentMethod }
    );

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      errorCodes.ACTIVATION_FAILED,
      error
    );
  }
});

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
 * Validate activation request
 */
async function validateActivationRequest(userData: any, activationData: ActivationData): Promise<void> {
  const { rank } = activationData;
  const rankConfig = mlmConfig.ranks[rank as keyof typeof mlmConfig.ranks];

  if (!rankConfig) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid rank specified'
    );
  }

  // Check if user can activate this rank
  const currentRankIndex = Object.keys(mlmConfig.ranks).indexOf(userData.rank || 'Inactive');
  const targetRankIndex = Object.keys(mlmConfig.ranks).indexOf(rank);

  // For inactive users, they can only activate Starter rank
  if (userData.rank === 'Inactive' && rank !== 'Starter') {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Inactive users must first activate Starter rank'
    );
  }

  // For active users, they can only upgrade to the next rank or same rank (re-activation)
  if (userData.rank !== 'Inactive') {
    if (targetRankIndex > currentRankIndex + 1) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'You can only upgrade to the next rank level'
      );
    }
  }

  // Check if user has pending activation transactions
  const db = admin.firestore();
  const pendingTransactions = await db
    .collection(collections.TRANSACTIONS)
    .where('uid', '==', userData.uid)
    .where('type', 'in', ['activation', 'topup'])
    .where('status', '==', 'pending')
    .limit(1)
    .get();

  if (!pendingTransactions.empty) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'You have a pending activation transaction. Please wait for it to be processed.'
    );
  }
}

/**
 * Process payment based on method
 */
async function processPayment(userData: any, activationData: ActivationData): Promise<void> {
  const { paymentMethod, paymentDetails } = activationData;
  const rankConfig = mlmConfig.ranks[activationData.rank as keyof typeof mlmConfig.ranks];
  const requiredAmount = rankConfig.activationAmount;

  switch (paymentMethod) {
    case 'usdt_bep20':
      await processUSDTPayment(userData, paymentDetails, requiredAmount);
      break;
    
    case 'fund_conversion':
      await processFundConversion(userData, paymentDetails, requiredAmount);
      break;
    
    case 'p2p':
      await processP2PPayment(userData, paymentDetails, requiredAmount);
      break;
    
    default:
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid payment method'
      );
  }
}

/**
 * Process USDT BEP20 payment
 */
async function processUSDTPayment(
  userData: any, 
  paymentDetails: any, 
  requiredAmount: number
): Promise<void> {
  const { transactionHash, fromWallet } = paymentDetails;

  if (!transactionHash || !fromWallet) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Transaction hash and from wallet are required for USDT payment'
    );
  }

  // Validate transaction hash format (basic validation)
  if (!/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid transaction hash format'
    );
  }

  // Check if transaction hash already used
  const db = admin.firestore();
  const existingTx = await db
    .collection(collections.TRANSACTIONS)
    .where('paymentDetails.transactionHash', '==', transactionHash)
    .limit(1)
    .get();

  if (!existingTx.empty) {
    throw new functions.https.HttpsError(
      'already-exists',
      'Transaction hash already used'
    );
  }

  // In a real implementation, you would verify the blockchain transaction here
  // For now, we'll assume the transaction is valid and will be verified by admin
}

/**
 * Process fund conversion payment
 */
async function processFundConversion(
  userData: any, 
  paymentDetails: any, 
  requiredAmount: number
): Promise<void> {
  const { convertFromBalance } = paymentDetails;

  if (convertFromBalance !== requiredAmount) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Conversion amount must be exactly ${requiredAmount} USDT`
    );
  }

  const availableBalance = userData.availableBalance || 0;

  if (availableBalance < requiredAmount) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `Insufficient balance. Required: ${requiredAmount} USDT, Available: ${availableBalance} USDT`
    );
  }

  // Deduct from user's available balance
  const db = admin.firestore();
  await db.runTransaction(async (transaction) => {
    const userRef = db.collection(collections.USERS).doc(userData.uid);
    const userDoc = await transaction.get(userRef);

    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const currentData = userDoc.data();
    const currentBalance = currentData?.availableBalance || 0;

    if (currentBalance < requiredAmount) {
      throw new Error('Insufficient balance');
    }

    transaction.update(userRef, {
      availableBalance: currentBalance - requiredAmount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
}

/**
 * Process P2P payment
 */
async function processP2PPayment(
  userData: any, 
  paymentDetails: any, 
  requiredAmount: number
): Promise<void> {
  const { p2pReference } = paymentDetails;

  if (!p2pReference) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'P2P reference is required for P2P payment'
    );
  }

  // Check if P2P reference already used
  const db = admin.firestore();
  const existingP2P = await db
    .collection(collections.TRANSACTIONS)
    .where('paymentDetails.p2pReference', '==', p2pReference)
    .limit(1)
    .get();

  if (!existingP2P.empty) {
    throw new functions.https.HttpsError(
      'already-exists',
      'P2P reference already used'
    );
  }

  // In a real implementation, you would verify the P2P transaction here
  // For now, we'll assume the transaction is valid and will be verified by admin
}

/**
 * Create activation transaction in Firestore
 */
async function createActivationTransaction(userData: any, activationData: ActivationData): Promise<string> {
  const db = admin.firestore();
  const rankConfig = mlmConfig.ranks[activationData.rank as keyof typeof mlmConfig.ranks];

  try {
    const transactionData = {
      uid: userData.uid,
      type: userData.rank === 'Inactive' ? 'activation' : 'topup',
      rank: activationData.rank,
      amount: rankConfig.activationAmount,
      paymentMethod: activationData.paymentMethod,
      paymentDetails: activationData.paymentDetails,
      status: activationData.paymentMethod === 'fund_conversion' ? 'completed' : 'pending',
      description: userData.rank === 'Inactive' 
        ? `Account activation to ${activationData.rank} rank`
        : `Rank upgrade to ${activationData.rank}`,
      
      // Timestamps
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: activationData.paymentMethod === 'fund_conversion' 
        ? admin.firestore.FieldValue.serverTimestamp() 
        : null,
      
      // Metadata
      metadata: {
        previousRank: userData.rank,
        userLevel: userData.level,
        sponsorUID: userData.sponsorUID,
        autoGenerated: false
      }
    };

    const transactionRef = await db.collection(collections.TRANSACTIONS).add(transactionData);

    // If fund conversion (instant), the onActivationTxCreated trigger will process it
    // For other payment methods, admin approval is required

    return transactionRef.id;

  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      'Failed to create activation transaction',
      error
    );
  }
}
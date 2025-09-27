import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as Joi from 'joi';
import { logger, LogCategory } from '../utils/logger';
import { collections, successMessages } from '../config';

// Validation schema for login
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

interface LoginData {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    uid: string;
    email: string;
    customToken: string;
    user: {
      uid: string;
      displayName: string;
      email: string;
      phone: string;
      rank: string;
      isActive: boolean;
      availableBalance: number;
      pendingBalance: number;
      totalEarnings: number;
      teamSize: number;
      userCode: string;
      walletAddress: string;
      createdAt: any;
      updatedAt: any;
      directReferrals: any[];
      incomeTransactions: any[];
      transactions: any[];
      withdrawals: any[];
    };
  };
}

/**
 * Callable function for user login
 */
export const login = functions.https.onCall(async (data: LoginData, context): Promise<LoginResponse> => {
  try {
    // Validate input data
    const { error, value } = loginSchema.validate(data);
    if (error) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Validation error: ${error.details[0].message}`
      );
    }

    const { email } = value as LoginData;

    await logger.info(
      LogCategory.AUTH,
      'Login attempt via callable function',
      undefined,
      { email, ip: context.rawRequest?.ip }
    );

    // Get user by email
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (authError: any) {
      if (authError.code === 'auth/user-not-found') {
        throw new functions.https.HttpsError(
          'not-found',
          'Invalid credentials'
        );
      }
      throw authError;
    }

    // Get user data from Firestore
    const userDoc = await admin.firestore()
      .collection(collections.USERS)
      .doc(userRecord.uid)
      .get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User profile not found'
      );
    }

    const userData = userDoc.data();

    // Check if account is disabled
    if (userRecord.disabled) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Account has been disabled'
      );
    }

    // Fetch direct referrals
    const directReferralsSnapshot = await admin.firestore()
      .collection(collections.USERS)
      .where('sponsorId', '==', userRecord.uid)
      .get();

    const directReferrals = directReferralsSnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));

    // Fetch income transactions
    const incomeTransactionsSnapshot = await admin.firestore()
      .collection(collections.USERS)
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
      .collection(collections.USERS)
      .doc(userRecord.uid)
      .update({
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    await logger.info(
      LogCategory.AUTH,
      'Login successful via callable function',
      userRecord.uid,
      { email }
    );

    return {
      success: true,
      message: successMessages.LOGIN_SUCCESS,
      data: {
        uid: userRecord.uid,
        email: userRecord.email!,
        customToken,
        user: {
          uid: userRecord.uid,
          displayName: userData?.displayName || '',
          email: userData?.email || userRecord.email!,
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

  } catch (error) {
    await logger.error(
      LogCategory.AUTH,
      'Login failed via callable function',
      error as Error,
      undefined,
      { email: data.email, ip: context.rawRequest?.ip }
    );

    // Re-throw HttpsError as-is
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Login failed. Please try again.'
    );
  }
});
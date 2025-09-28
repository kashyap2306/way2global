import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { logger, LogCategory } from '../utils/logger';
import { collections } from '../config';

interface UserDataResponse {
  success: boolean;
  message: string;
  data?: {
    uid: string;
    displayName: string;
    email: string;
    rank: string;
    status: string;
    balance: number;
    totalEarnings: number;
    referrals: string[];
    activationAmount: number;
    cyclesCompleted: number;
    createdAt: any;
    lastLoginAt: any;
    userCode: string;
  };
}

/**
 * Callable function to get current user's MLM data
 */
export const getUserData = functions.https.onCall(async (data, context): Promise<UserDataResponse> => {
  try {
    // Check if user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to access this function'
      );
    }

    const uid = context.auth.uid;

    await logger.info(
      LogCategory.AUTH,
      'Fetching user data',
      uid
    );

    // Get user data from Firestore
    const userDoc = await admin.firestore()
      .collection(collections.USERS)
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User profile not found'
      );
    }

    const userData = userDoc.data();

    await logger.info(
      LogCategory.AUTH,
      'User data fetched successfully',
      uid
    );

    return {
      success: true,
      message: 'User data retrieved successfully',
      data: {
        uid: uid,
        displayName: userData?.displayName || '',
        email: userData?.email || '',
        userCode: userData?.userCode || '',
        rank: userData?.rank || 'Azurite',
        status: userData?.status || 'active',
        balance: userData?.balance || 0,
        totalEarnings: userData?.totalEarnings || 0,
        referrals: userData?.referrals || [],
        activationAmount: userData?.activationAmount || 0,
        cyclesCompleted: userData?.cyclesCompleted || 0,
        createdAt: userData?.createdAt,
        lastLoginAt: userData?.lastLoginAt
      }
    };

  } catch (error) {
    await logger.error(
      LogCategory.AUTH,
      'Failed to fetch user data',
      error as Error,
      context.auth?.uid
    );

    // Re-throw HttpsError as-is
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Failed to retrieve user data'
    );
  }
});
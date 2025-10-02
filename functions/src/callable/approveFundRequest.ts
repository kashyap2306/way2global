import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();
import { FieldValue } from 'firebase-admin/firestore';

export const approveFundRequest = functions.https.onCall(async (data, context) => {
  // Validate authentication and admin role
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Only authenticated administrators can approve fund requests'
    );
  }

  const { requestId, userId } = data;

  // Validate input
  if (typeof requestId !== 'string' || requestId.trim() === '') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The request ID is required'
    );
  }
  if (typeof userId !== 'string' || userId.trim() === '') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The user ID is required'
    );
  }

  const db = admin.firestore();
  const fundRequestRef = db.collection(`users/${userId}/fundingWalletRequests`).doc(requestId);
  const userWalletRef = db.collection('wallets').doc(userId);

  try {
    return await db.runTransaction(async (transaction) => {
      const fundRequestDoc = await transaction.get(fundRequestRef);

      if (!fundRequestDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Fund request not found');
      }

      const requestData = fundRequestDoc.data();

      if (requestData?.status !== 'pending') {
        throw new functions.https.HttpsError('failed-precondition', 'Fund request is not pending');
      }

      const amount = requestData.amount;
      const currency = requestData.currency;

      // Update fund request status to 'approved'
      transaction.update(fundRequestRef, {
        status: 'approved',
        updatedAt: FieldValue.serverTimestamp(),
        approvedBy: context.auth?.uid,
      });

      // Add amount to user's wallet
      transaction.update(userWalletRef, {
        lockedBalance: FieldValue.increment(amount),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { success: true, message: 'Fund request approved successfully' };
    });
  } catch (error: any) {
    console.error('Error approving fund request:', error);
    if (error.code === 'not-found' || error.code === 'failed-precondition' || error.code === 'unauthenticated') {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to approve fund request', error.message);
  }
});
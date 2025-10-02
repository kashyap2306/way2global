import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();
import { FieldValue } from 'firebase-admin/firestore';

export const rejectFundRequest = functions.https.onCall(async (data, context) => {
  // Validate authentication and admin role
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Only authenticated administrators can reject fund requests'
    );
  }

  const { requestId, userId, reason } = data;

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
  if (typeof reason !== 'string' || reason.trim() === '') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'A rejection reason is required'
    );
  }

  const db = admin.firestore();
  const fundRequestRef = db.collection(`users/${userId}/fundingWalletRequests`).doc(requestId);

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

      // Update fund request status to 'rejected'
      transaction.update(fundRequestRef, {
        status: 'rejected',
        reason,
        updatedAt: FieldValue.serverTimestamp(),
        rejectedBy: context.auth?.uid,
      });

      return { success: true, message: 'Fund request rejected successfully' };
    });
  } catch (error: any) {
    console.error('Error rejecting fund request:', error);
    if (error.code === 'not-found' || error.code === 'failed-precondition' || error.code === 'unauthenticated') {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to reject fund request', error.message);
  }
});
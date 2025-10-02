import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();
import { FieldValue } from 'firebase-admin/firestore';

export const createFundRequest = functions.https.onCall(async (data, context) => {
  // Validate authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Only authenticated users can create fund requests'
    );
  }

  const { amount, currency } = data;
  const userId = context.auth.uid;

  // Validate input
  if (typeof amount !== 'number' || amount <= 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Amount must be a positive number'
    );
  }

  if (currency !== 'USDT') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Only USDT currency is supported'
    );
  }

  try {
  console.log('Creating fund request for user:', userId, 'with amount:', amount, 'and currency:', currency);
    // Create the fund request document
    const fundRequestRef = admin
      .firestore()
      .collection(`users/${userId}/fundingWalletRequests`)
      .doc();

    await fundRequestRef.set({
      amount,
      currency,
      status: 'pending',
      requestedBy: userId,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true, requestId: fundRequestRef.id };
  } catch (error) {
    console.error('Error creating fund request:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to create fund request',
      error // Pass the original error for more details
    );
  }
});
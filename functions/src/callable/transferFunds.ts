import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';
admin.initializeApp();

const corsHandler = cors({ origin: true });

export const transferFunds = functions.https.onRequest(async (request, response) => {
  corsHandler(request, response, async () => {
    if (request.method === 'OPTIONS') {
      response.send(204);
      return;
    }

    if (!request.body.data) {
      response.status(400).send({ data: { message: 'Invalid request format.' } });
      return;
    }

    const { recipientUserCode, amount } = request.body.data;
    const authToken = request.headers.authorization?.split('Bearer ')[1];

    if (!authToken) {
      response.status(401).send({ data: { message: 'Unauthorized: No authentication token provided.' } });
      return;
    }

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(authToken);
    } catch (error) {
      response.status(401).send({ data: { message: 'Unauthorized: Invalid authentication token.' } });
      return;
    }

    const senderUid = decodedToken.uid;

    // Input validation
    if (typeof recipientUserCode !== 'string' || recipientUserCode.length === 0) {
      response.status(400).send({ data: { message: 'The recipientUserCode must be a non-empty string.' } });
      return;
    }
    if (typeof amount !== 'number' || amount <= 0) {
      response.status(400).send({ data: { message: 'The amount must be a positive number.' } });
      return;
    }

    const db = admin.firestore();

    try {
      const result = await db.runTransaction(async (transaction) => {
        const senderDocRef = db.collection('users').doc(senderUid);
        const senderDoc = await transaction.get(senderDocRef);

        if (!senderDoc.exists) {
          throw new functions.https.HttpsError('not-found', 'Sender user not found.');
        }

        const senderData = senderDoc.data() as { availableBalance: number; userCode: string; email: string; };

        if (senderData.availableBalance < amount) {
          throw new functions.https.HttpsError('failed-precondition', 'Insufficient balance.');
        }

        // Find recipient by userCode
        const recipientQuerySnapshot = await db.collection('users').where('userCode', '==', recipientUserCode).limit(1).get();

        if (recipientQuerySnapshot.empty) {
          throw new functions.https.HttpsError('not-found', 'Recipient user not found.');
        }

        const recipientDoc = recipientQuerySnapshot.docs[0];
        const recipientUid = recipientDoc.id;
        const recipientData = recipientDoc.data() as { availableBalance: number; userCode: string; email: string; };

        if (senderUid === recipientUid) {
          throw new functions.https.HttpsError('invalid-argument', 'Cannot transfer funds to yourself.');
        }

        // Update balances
        transaction.update(senderDocRef, {
          availableBalance: admin.firestore.FieldValue.increment(-amount),
        });
        transaction.update(recipientDoc.ref, {
          availableBalance: admin.firestore.FieldValue.increment(amount),
        });

        // Record transactions
        const timestamp = admin.firestore.FieldValue.serverTimestamp();

        // Sender transaction
        transaction.collection('incomeTransactions').add({
          userId: senderUid,
          type: 'fundTransfer',
          amount: -amount,
          timestamp: timestamp,
          description: `Transferred ${amount} to ${recipientUserCode}`,
          senderUserCode: senderData.userCode,
          recipientUserCode: recipientUserCode,
          status: 'completed',
          relatedUserId: recipientUid,
        });

        // Recipient transaction
        transaction.collection('incomeTransactions').add({
          userId: recipientUid,
          type: 'fundTransfer',
          amount: amount,
          timestamp: timestamp,
          description: `Received ${amount} from ${senderData.userCode}`,
          senderUserCode: senderData.userCode,
          recipientUserCode: recipientUserCode,
          status: 'completed',
          relatedUserId: senderUid,
        });

        return { success: true, message: 'Funds transferred successfully.' };
      });
      response.status(200).send({ data: result });
    } catch (error: any) {
      console.error('Error in transferFunds function:', error);
      if (error.code) {
        response.status(500).send({ data: { message: error.message, code: error.code } });
      } else {
        response.status(500).send({ data: { message: 'An unexpected error occurred.' } });
      }
    }
  });
});
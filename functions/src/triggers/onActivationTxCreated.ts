/**
 * Firestore Trigger - Handle activation transaction completion and process Level Income
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();
import { createLogger, LogCategory } from '../utils/logger';
import { collections } from '../config';

import { AutopoolService } from '../services/autopoolService';

const logger = createLogger('OnActivationTxCreated');
const autopoolService = new AutopoolService();

// Level and Re-Level Income processing removed - system now uses direct pool income only

/**
 * Trigger when a new transaction is created in the transactions collection
 */
export const onActivationTxCreated = functions.firestore
  .document(`${collections.TRANSACTIONS}/{transactionId}`)
  .onCreate(async (snap, context) => {
    const transactionId = context.params.transactionId;
    const transactionData = snap.data();

    try {
      // Only process activation and topup transactions that are completed
      if (!['activation', 'topup'].includes(transactionData.type) || 
          transactionData.status !== 'completed') {
        return;
      }

      await logger.info(
        LogCategory.MLM,
        'Processing activation transaction for Level Income',
        transactionData.uid,
        { 
          transactionId, 
          type: transactionData.type, 
          rank: transactionData.rank,
          amount: transactionData.amount 
        }
      );

      // Update user rank and activation status - immediate unlock
      // Only activate user and update rank if it's an activation transaction or a $5 topup
      if (transactionData.type === 'activation' || (transactionData.type === 'topup' && transactionData.amount === 5)) {
        await updateUserRank(transactionData.uid, transactionData.rank);
      }

      // Process income using the new income engine
      const { incomeEngine } = await import('../services/incomeEngine');
      await incomeEngine.processAllIncomes(
        transactionData.uid,
        transactionData.amount,
        transactionId,
        transactionData.rank
      );

      await logger.info(
        LogCategory.MLM,
        'Activation transaction processed successfully',
        transactionData.uid,
        { transactionId }
      );

    } catch (error) {
      await logger.error(
        LogCategory.MLM,
        'Failed to process activation transaction',
        error as Error,
        transactionData.uid,
        { transactionId, transactionData }
      );
      
      // Don't throw error to prevent transaction rollback
      // Log the error and continue
    }
  });

/**
 * Update user rank and activation status - UPDATED for immediate rank unlock
 */
async function updateUserRank(uid: string, newRank: string): Promise<void> {
  const db = admin.firestore();
  
  try {
    const userRef = db.collection(collections.USERS).doc(uid);
    
    // For $5 activation, immediately unlock Azurite rank
    // Users can also unlock higher ranks at once if they pay more
    await userRef.update({
      rank: newRank,
      isActive: true,
      rankActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      // Initialize locked balance if not exists
      lockedBalance: admin.firestore.FieldValue.increment(0),
      // Track direct referrals count for claiming eligibility
      directReferralsCount: admin.firestore.FieldValue.increment(0)
    });

    // Assign user to the global autopool for the new rank
    await autopoolService.assignToNextPosition(uid, newRank);

    await logger.info(
      LogCategory.MLM,
      'User rank updated with immediate unlock',
      uid,
      { newRank, immediateUnlock: true }
    );

  } catch (error) {
    await logger.error(
      LogCategory.MLM,
      'Failed to update user rank',
      error as Error,
      uid,
      { newRank }
    );
    throw error;
  }
}

// Level and Re-Level Income processing removed - system now uses direct pool income only
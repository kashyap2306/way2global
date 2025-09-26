/**
 * Scheduled Function - Process global cycles and payouts
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createLogger, LogCategory } from '../utils/logger';
import { collections, mlmConfig } from '../config';
import { payoutProcessor } from '../services/payoutProcessor';

const logger = createLogger('ScheduledGlobalCycle');

/**
 * Scheduled function to process global cycles every 5 minutes
 */
export const scheduledGlobalCycle = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    try {
      await logger.info(LogCategory.SYSTEM, 'Starting scheduled global cycle processing');

      // Process completed global cycles
      await processCompletedGlobalCycles();

      // Process payout queue
      await payoutProcessor.processPayoutQueue();

      // Clean up old data
      await cleanupOldData();

      await logger.info(LogCategory.SYSTEM, 'Scheduled global cycle processing completed');

    } catch (error) {
      await logger.error(
        LogCategory.SYSTEM,
        'Scheduled global cycle processing failed',
        error as Error
      );
      throw error;
    }
  });

/**
 * Process completed global cycles that haven't been processed yet
 */
async function processCompletedGlobalCycles(): Promise<void> {
  const db = admin.firestore();

  try {
    // Get completed cycles that haven't been processed
    const completedCycles = await db
      .collection(collections.GLOBAL_CYCLES)
      .where('isComplete', '==', true)
      .where('processed', '==', false)
      .limit(10)
      .get();

    if (completedCycles.empty) {
      await logger.debug(LogCategory.MLM, 'No completed cycles to process');
      return;
    }

    await logger.info(
      LogCategory.MLM,
      `Processing ${completedCycles.size} completed global cycles`
    );

    for (const cycleDoc of completedCycles.docs) {
      try {
        await processSingleGlobalCycle(cycleDoc.id, cycleDoc.data());
      } catch (error) {
        await logger.error(
          LogCategory.MLM,
          'Failed to process single global cycle',
          error as Error,
          undefined,
          { cycleId: cycleDoc.id }
        );
        // Continue with other cycles
      }
    }

  } catch (error) {
    await logger.error(
      LogCategory.MLM,
      'Failed to process completed global cycles',
      error as Error
    );
    throw error;
  }
}

/**
 * Process a single global cycle
 */
async function processSingleGlobalCycle(cycleId: string, cycleData: any): Promise<void> {
  const db = admin.firestore();

  try {
    const { rank, participants } = cycleData;
    
    await logger.info(
      LogCategory.MLM,
      'Processing global cycle',
      undefined,
      {
        cycleId,
        rank,
        participantCount: participants.length
      }
    );

    // Distribute global income to all participants
    await distributeGlobalIncome(cycleId, cycleData);

    // Handle auto top-up for the first participant
    await handleAutoTopUp(participants[0], rank);

    // Generate RE-ID if at highest rank
    await handleREIDGeneration(participants[0], rank);

    // Mark cycle as processed
    await db.collection(collections.GLOBAL_CYCLES).doc(cycleId).update({
      processed: true,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await logger.info(
      LogCategory.MLM,
      'Global cycle processed successfully',
      undefined,
      { cycleId, rank }
    );

  } catch (error) {
    await logger.error(
      LogCategory.MLM,
      'Failed to process global cycle',
      error as Error,
      undefined,
      { cycleId }
    );
    throw error;
  }
}

/**
 * Distribute global income to cycle participants
 */
async function distributeGlobalIncome(cycleId: string, cycleData: any): Promise<void> {
  const { rank, participants } = cycleData;
  const rankConfig = mlmConfig.ranks[rank as keyof typeof mlmConfig.ranks];
  
  if (!rankConfig) {
    throw new Error(`Rank configuration not found for ${rank}`);
  }

  const totalPayout = (rankConfig.activationAmount * mlmConfig.incomes.global.percentage) / 100;
  const levels = mlmConfig.incomes.global.levels;
  const payoutPerLevel = totalPayout / levels;

  try {
    // Distribute across 10 levels
    for (let level = 1; level <= levels; level++) {
      const levelParticipants = getLevelParticipants(participants, level);
      
      for (const participantUID of levelParticipants) {
        await createGlobalIncome(
          participantUID,
          payoutPerLevel,
          level,
          rank,
          cycleId
        );
      }
    }

    await logger.info(
      LogCategory.MLM,
      'Global income distributed',
      undefined,
      {
        cycleId,
        rank,
        totalPayout,
        levels,
        participantCount: participants.length
      }
    );

  } catch (error) {
    await logger.error(
      LogCategory.MLM,
      'Failed to distribute global income',
      error as Error,
      undefined,
      { cycleId, rank }
    );
    throw error;
  }
}

/**
 * Get participants at specific level in binary tree structure
 */
function getLevelParticipants(participants: string[], level: number): string[] {
  // Binary tree level calculation
  const startIndex = Math.pow(2, level - 1) - 1;
  const endIndex = Math.min(Math.pow(2, level) - 2, participants.length - 1);
  
  if (startIndex > participants.length - 1) {
    return [];
  }
  
  return participants.slice(startIndex, endIndex + 1);
}

/**
 * Create global income record
 */
async function createGlobalIncome(
  uid: string,
  amount: number,
  level: number,
  rank: string,
  cycleId: string
): Promise<void> {
  const db = admin.firestore();

  try {
    // Create income record
    const incomeData = {
      uid,
      type: 'global',
      amount,
      sourceUID: cycleId,
      sourceTransactionId: cycleId,
      level,
      rank,
      status: 'completed',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        cycleId,
        globalLevel: level,
        cycleRank: rank
      }
    };

    const incomeRef = await db.collection(collections.INCOMES).add(incomeData);

    // Update user's available balance
    await db.runTransaction(async (transaction) => {
      const userRef = db.collection(collections.USERS).doc(uid);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error(`User ${uid} not found`);
      }

      const userData = userDoc.data();
      const currentBalance = userData?.availableBalance || 0;
      const totalEarnings = userData?.totalEarnings || 0;

      transaction.update(userRef, {
        availableBalance: currentBalance + amount,
        totalEarnings: totalEarnings + amount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    // Create income transaction
    const transactionData = {
      uid,
      type: 'income',
      subType: 'global',
      amount,
      status: 'completed',
      description: `Global cycle payout - Level ${level}`,
      incomeId: incomeRef.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection(collections.INCOME_TRANSACTIONS).add(transactionData);

    await logger.debug(
      LogCategory.MLM,
      'Global income created',
      uid,
      { amount, level, rank, cycleId }
    );

  } catch (error) {
    await logger.error(
      LogCategory.MLM,
      'Failed to create global income',
      error as Error,
      uid,
      { amount, level, rank, cycleId }
    );
    throw error;
  }
}

/**
 * Handle auto top-up for cycle completion
 */
async function handleAutoTopUp(userUID: string, currentRank: string): Promise<void> {
  if (!mlmConfig.globalCycle.autoTopupEnabled) {
    return;
  }

  try {
    // Get next rank
    const ranks = Object.keys(mlmConfig.ranks);
    const currentIndex = ranks.indexOf(currentRank);
    
    if (currentIndex < ranks.length - 1) {
      const nextRank = ranks[currentIndex + 1];
      const nextRankConfig = mlmConfig.ranks[nextRank as keyof typeof mlmConfig.ranks];
      
      // Create auto top-up transaction
      const transactionData = {
        uid: userUID,
        type: 'auto_topup',
        amount: nextRankConfig.activationAmount,
        rank: nextRank,
        status: 'completed',
        description: `Auto top-up to ${nextRank} rank`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          autoGenerated: true,
          previousRank: currentRank,
          triggeredBy: 'global_cycle_completion'
        }
      };

      await admin.firestore()
        .collection(collections.TRANSACTIONS)
        .add(transactionData);

      await logger.info(
        LogCategory.MLM,
        'Auto top-up transaction created',
        userUID,
        {
          previousRank: currentRank,
          nextRank,
          amount: nextRankConfig.activationAmount
        }
      );
    }

  } catch (error) {
    await logger.error(
      LogCategory.MLM,
      'Failed to handle auto top-up',
      error as Error,
      userUID,
      { currentRank }
    );
    // Don't throw error, auto top-up failure shouldn't block cycle processing
  }
}

/**
 * Handle RE-ID generation for infinite cycles
 */
async function handleREIDGeneration(userUID: string, rank: string): Promise<void> {
  if (!mlmConfig.globalCycle.reidGenerationEnabled) {
    return;
  }

  try {
    // Check if this is the highest rank
    const ranks = Object.keys(mlmConfig.ranks);
    const isHighestRank = ranks.indexOf(rank) === ranks.length - 1;

    if (isHighestRank) {
      // Generate RE-ID
      const reidData = {
        originalUID: userUID,
        rank,
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        cycleCount: 1,
        totalEarnings: 0,
        metadata: {
          triggeredBy: 'global_cycle_completion',
          parentCycleRank: rank
        }
      };

      await admin.firestore()
        .collection(collections.REIDS)
        .add(reidData);

      await logger.info(
        LogCategory.MLM,
        'RE-ID generated for infinite cycles',
        userUID,
        { rank }
      );
    }

  } catch (error) {
    await logger.error(
      LogCategory.MLM,
      'Failed to generate RE-ID',
      error as Error,
      userUID,
      { rank }
    );
    // Don't throw error, RE-ID generation failure shouldn't block cycle processing
  }
}

/**
 * Clean up old data
 */
async function cleanupOldData(): Promise<void> {
  const db = admin.firestore();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    // Clean up old completed cycles
    const oldCycles = await db
      .collection(collections.GLOBAL_CYCLES)
      .where('isComplete', '==', true)
      .where('processed', '==', true)
      .where('completedAt', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .limit(50)
      .get();

    if (!oldCycles.empty) {
      const batch = db.batch();
      oldCycles.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      await logger.info(
        LogCategory.SYSTEM,
        `Cleaned up ${oldCycles.size} old global cycles`
      );
    }

    // Clean up old processed income transactions
    const oldIncomeTransactions = await db
      .collection(collections.INCOME_TRANSACTIONS)
      .where('status', '==', 'completed')
      .where('createdAt', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .limit(100)
      .get();

    if (!oldIncomeTransactions.empty) {
      const batch = db.batch();
      oldIncomeTransactions.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      await logger.info(
        LogCategory.SYSTEM,
        `Cleaned up ${oldIncomeTransactions.size} old income transactions`
      );
    }

  } catch (error) {
    await logger.warn(
      LogCategory.SYSTEM,
      'Failed to clean up old data',
      undefined,
      { error: (error as Error).message }
    );
    // Don't throw error, cleanup failure shouldn't block main processing
  }
}

/**
 * Manual trigger for global cycle processing (for testing)
 */
export const triggerGlobalCycleProcessing = functions.https.onCall(async (data, context) => {
  // Verify admin access
  if (!context.auth?.token?.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can trigger global cycle processing'
    );
  }

  try {
    await logger.info(
      LogCategory.SYSTEM,
      'Manual global cycle processing triggered',
      context.auth.uid
    );

    await processCompletedGlobalCycles();
    await payoutProcessor.processPayoutQueue();

    return {
      success: true,
      message: 'Global cycle processing completed successfully',
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    await logger.error(
      LogCategory.SYSTEM,
      'Manual global cycle processing failed',
      error as Error,
      context.auth?.uid
    );

    throw new functions.https.HttpsError(
      'internal',
      'Failed to process global cycles',
      error
    );
  }
});
/**
 * Firestore Trigger - Handle activation transaction completion and process Level Income
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createLogger, LogCategory } from '../utils/logger';
import { collections } from '../config';

const logger = createLogger('OnActivationTxCreated');

// Level Income percentages for each level (1-6)
const LEVEL_PERCENTAGES = {
  1: 50, // 50% for Level 1 (direct referral)
  2: 10, // 10% for Level 2
  3: 5,  // 5% for Level 3
  4: 3,  // 3% for Level 4
  5: 2,  // 2% for Level 5
  6: 1   // 1% for Level 6
};

interface UserData {
  uid: string;
  sponsorUID?: string;
  rank: string;
  isActive: boolean;
  level: number;
  fullName: string;
  email: string;
}

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

      // Update user rank and activation status
      await updateUserRank(transactionData.uid, transactionData.rank);

      // Process Level Income distribution
      await processLevelIncome(transactionData.uid, transactionData.amount, transactionData.rank);

      // Process Re-Level Income if it's a rank upgrade
      if (transactionData.type === 'topup' && transactionData.metadata?.previousRank) {
        await processReLevelIncome(
          transactionData.uid, 
          transactionData.amount, 
          transactionData.rank,
          transactionData.metadata.previousRank
        );
      }

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
 * Update user rank and activation status
 */
async function updateUserRank(uid: string, newRank: string): Promise<void> {
  const db = admin.firestore();
  
  try {
    const userRef = db.collection(collections.USERS).doc(uid);
    await userRef.update({
      rank: newRank,
      isActive: true,
      rankActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await logger.info(
      LogCategory.MLM,
      'User rank updated successfully',
      uid,
      { newRank }
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

/**
 * Process Level Income distribution to upline users
 */
async function processLevelIncome(
  activatorUID: string, 
  packageAmount: number, 
  activatorRank: string
): Promise<void> {
  const db = admin.firestore();
  
  try {
    // Get upline chain (6 levels)
    const uplineChain = await getUplineChain(activatorUID, 6);
    
    if (uplineChain.length === 0) {
      await logger.info(
        LogCategory.MLM,
        'No upline found for Level Income processing',
        activatorUID
      );
      return;
    }

    const batch = db.batch();
    let processedCount = 0;

    // Process each level
    for (let level = 1; level <= 6; level++) {
      const uplineIndex = level - 1;
      
      if (uplineIndex >= uplineChain.length) {
        break; // No more upline users
      }

      const uplineUser = uplineChain[uplineIndex];
      
      // Check if upline user is eligible for this level
      if (!uplineUser.isActive) {
        continue; // Skip inactive users
      }

      // Calculate income amount
      const percentage = LEVEL_PERCENTAGES[level as keyof typeof LEVEL_PERCENTAGES];
      const incomeAmount = (packageAmount * percentage) / 100;

      // Create income transaction
      const incomeTransactionRef = db.collection('incomeTransactions').doc();
      const incomeTransactionData = {
        userId: uplineUser.uid,
        type: 'level',
        level: level,
        amount: incomeAmount,
        currency: 'USDT',
        sourceUserId: activatorUID,
        sourceRank: activatorRank,
        packageAmount: packageAmount,
        percentage: percentage,
        status: 'completed',
        description: `Level ${level} Income from ${activatorRank} activation`,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      batch.set(incomeTransactionRef, incomeTransactionData);

      // Update user balance
      const userRef = db.collection(collections.USERS).doc(uplineUser.uid);
      batch.update(userRef, {
        availableBalance: admin.firestore.FieldValue.increment(incomeAmount),
        totalEarnings: admin.firestore.FieldValue.increment(incomeAmount),
        levelIncome: admin.firestore.FieldValue.increment(incomeAmount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      processedCount++;

      await logger.info(
        LogCategory.MLM,
        `Level ${level} Income processed`,
        uplineUser.uid,
        { 
          level, 
          amount: incomeAmount, 
          percentage, 
          activatorUID,
          activatorRank 
        }
      );
    }

    // Commit all transactions
    await batch.commit();

    await logger.info(
      LogCategory.MLM,
      'Level Income distribution completed',
      activatorUID,
      { 
        processedLevels: processedCount, 
        packageAmount,
        activatorRank 
      }
    );

  } catch (error) {
    await logger.error(
      LogCategory.MLM,
      'Failed to process Level Income',
      error as Error,
      activatorUID,
      { packageAmount, activatorRank }
    );
    throw error;
  }
}

/**
 * Process Re-Level Income for rank upgrades
 */
async function processReLevelIncome(
  upgraderUID: string,
  packageAmount: number,
  newRank: string,
  previousRank: string
): Promise<void> {
  const db = admin.firestore();
  
  try {
    // Get upline chain (6 levels)
    const uplineChain = await getUplineChain(upgraderUID, 6);
    
    if (uplineChain.length === 0) {
      await logger.info(
        LogCategory.MLM,
        'No upline found for Re-Level Income processing',
        upgraderUID
      );
      return;
    }

    const batch = db.batch();
    let processedCount = 0;

    // Process each level for Re-Level Income
    for (let level = 1; level <= 6; level++) {
      const uplineIndex = level - 1;
      
      if (uplineIndex >= uplineChain.length) {
        break; // No more upline users
      }

      const uplineUser = uplineChain[uplineIndex];
      
      // Check if upline user is eligible
      if (!uplineUser.isActive) {
        continue; // Skip inactive users
      }

      // Re-Level Income uses same percentages as Level Income
      const percentage = LEVEL_PERCENTAGES[level as keyof typeof LEVEL_PERCENTAGES];
      const incomeAmount = (packageAmount * percentage) / 100;

      // Create Re-Level income transaction
      const incomeTransactionRef = db.collection('incomeTransactions').doc();
      const incomeTransactionData = {
        userId: uplineUser.uid,
        type: 're-level',
        level: level,
        amount: incomeAmount,
        currency: 'USDT',
        sourceUserId: upgraderUID,
        sourceRank: newRank,
        previousRank: previousRank,
        packageAmount: packageAmount,
        percentage: percentage,
        status: 'completed',
        description: `Re-Level ${level} Income from ${previousRank} to ${newRank} upgrade`,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      batch.set(incomeTransactionRef, incomeTransactionData);

      // Update user balance
      const userRef = db.collection(collections.USERS).doc(uplineUser.uid);
      batch.update(userRef, {
        availableBalance: admin.firestore.FieldValue.increment(incomeAmount),
        totalEarnings: admin.firestore.FieldValue.increment(incomeAmount),
        reLevelIncome: admin.firestore.FieldValue.increment(incomeAmount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      processedCount++;

      await logger.info(
        LogCategory.MLM,
        `Re-Level ${level} Income processed`,
        uplineUser.uid,
        { 
          level, 
          amount: incomeAmount, 
          percentage, 
          upgraderUID,
          newRank,
          previousRank 
        }
      );
    }

    // Commit all transactions
    await batch.commit();

    await logger.info(
      LogCategory.MLM,
      'Re-Level Income distribution completed',
      upgraderUID,
      { 
        processedLevels: processedCount, 
        packageAmount,
        newRank,
        previousRank 
      }
    );

  } catch (error) {
    await logger.error(
      LogCategory.MLM,
      'Failed to process Re-Level Income',
      error as Error,
      upgraderUID,
      { packageAmount, newRank, previousRank }
    );
    throw error;
  }
}

/**
 * Get upline chain for a user up to specified levels
 */
async function getUplineChain(uid: string, maxLevels: number): Promise<UserData[]> {
  const db = admin.firestore();
  const uplineChain: UserData[] = [];
  
  try {
    let currentUID = uid;
    
    for (let level = 0; level < maxLevels; level++) {
      // Get current user data
      const userDoc = await db.collection(collections.USERS).doc(currentUID).get();
      
      if (!userDoc.exists) {
        break;
      }
      
      const userData = userDoc.data() as UserData;
      
      // Check if user has a sponsor
      if (!userData.sponsorUID) {
        break; // No more upline
      }
      
      // Get sponsor data
      const sponsorDoc = await db.collection(collections.USERS).doc(userData.sponsorUID).get();
      
      if (!sponsorDoc.exists) {
        break;
      }
      
      const sponsorData = { uid: userData.sponsorUID, ...sponsorDoc.data() } as UserData;
      uplineChain.push(sponsorData);
      
      // Move to next level
      currentUID = userData.sponsorUID;
    }
    
    return uplineChain;
    
  } catch (error) {
    await logger.error(
      LogCategory.MLM,
      'Failed to get upline chain',
      error as Error,
      uid,
      { maxLevels }
    );
    throw error;
  }
}
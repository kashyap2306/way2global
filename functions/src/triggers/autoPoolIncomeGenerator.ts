import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { AutopoolService, GlobalAutopoolPosition } from '../services/autopoolService';
import { User, PlatformSettings } from '../types';

const db = admin.firestore();

/**
 * Scheduled function to generate pool income for all active users
 * Runs every hour to simulate continuous income generation
 */
export const autoPoolIncomeGenerator = functions.pubsub
  .schedule('0 * * * *') // Run every hour
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('Starting auto pool income generation...');
    
    try {
      const autopoolService = new AutopoolService();

      // Get platform settings for income rates and direct referral requirement
      const platformSettingsSnap = await db.collection('platformSettings').doc('general').get();
      const platformSettings = platformSettingsSnap.data() as PlatformSettings;

      const incomeRates = {
        'Bronze': 0.10,    // $0.10 per hour
        'Silver': 0.25,    // $0.25 per hour
        'Gold': 0.50,      // $0.50 per hour
        'Platinum': 1.00,  // $1.00 per hour
        'Diamond': 2.00,   // $2.00 per hour
        'Crown': 5.00      // $5.00 per hour
      };
      const requiredDirectReferrals = platformSettings.directReferralRequirement || 2;
      
      let processedPositions = 0;
      let currentPosition: GlobalAutopoolPosition | null = null;

      // Loop to process positions sequentially
      while ((currentPosition = await autopoolService.getNextDistributionPosition()) !== null) {
        const userId = currentPosition.userId;
        const userRank = currentPosition.rank;
        const positionNumber = currentPosition.position;

        // Fetch user data to get directReferrals count
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
          console.warn(`User ${userId} not found for autopool position ${positionNumber}. Skipping.`);
          await autopoolService.updateNextDistributionPosition(positionNumber + 1);
          continue;
        }
        const userData = userDoc.data() as User;
        
        // Skip if user doesn't have a valid rank for income
        if (!incomeRates[userRank as keyof typeof incomeRates]) {
          console.warn(`User ${userId} has invalid rank ${userRank} for autopool position ${positionNumber}. Skipping income generation.`);
          await autopoolService.updateNextDistributionPosition(positionNumber + 1);
          continue;
        }
        
        const hourlyIncome = incomeRates[userRank as keyof typeof incomeRates];
        
        const directReferralsCount = userData.directReferrals || 0;
        
        // Determine if income goes to locked or available balance
        const canClaim = directReferralsCount >= requiredDirectReferrals;
        
        const batch = db.batch();

        // Create income transaction
        const incomeTransactionRef = db.collection('incomeTransactions').doc();
        
        const incomeTransaction = {
          id: incomeTransactionRef.id,
          userId: userId,
          rank: userRank,
          amount: hourlyIncome,
          type: 'autopool_income',
          status: canClaim ? 'available' : 'locked',
          lockedBalance: canClaim ? 0 : hourlyIncome,
          availableBalance: canClaim ? hourlyIncome : 0,
          directReferralsCount: directReferralsCount,
          requiredDirectReferrals: requiredDirectReferrals,
          canClaim: canClaim,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          metadata: {
            generatedBy: 'autoPoolIncomeGenerator',
            hourlyRate: hourlyIncome,
            conditionMet: canClaim,
            autopoolPosition: positionNumber
          }
        };
        
        batch.set(incomeTransactionRef, incomeTransaction);
        
        // Update user's balance fields
        const userRef = db.collection('users').doc(userId);
        if (canClaim) {
          batch.update(userRef, {
            availableBalance: admin.firestore.FieldValue.increment(hourlyIncome),
            totalEarnings: admin.firestore.FieldValue.increment(hourlyIncome),
            lastIncomeGenerated: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          batch.update(userRef, {
            lockedBalance: admin.firestore.FieldValue.increment(hourlyIncome),
            lastIncomeGenerated: admin.firestore.FieldValue.serverTimestamp()
          });
        }
        
        // Mark position as distributed and update next distribution pointer
        batch.update(db.collection('globalAutopool').doc(String(positionNumber)), {
          lastDistributedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await autopoolService.updateNextDistributionPosition(positionNumber + 1);

        await batch.commit();
        processedPositions++;
      }
      
      console.log(`Auto pool income generation completed. Processed ${processedPositions} autopool positions.`);
      
      // Log the operation for audit
      await db.collection('systemLogs').add({
        type: 'auto_pool_income_generation',
        processedEntries: processedPositions,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'completed'
      });
      
    } catch (error) {
      console.error('Error in auto pool income generation:', error);
      
      // Log the error
      await db.collection('systemLogs').add({
        type: 'auto_pool_income_generation_error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'failed'
      });
      
      throw error;
    }
  });

/**
 * Manual trigger for pool income generation (for testing)
 */
export const manualPoolIncomeGeneration = functions.https.onCall(async (data, context) => {
  // Verify admin authentication
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }
  
  try {
    // Trigger the same logic as the scheduled function
    console.log('Manual pool income generation triggered by admin');
    
    const autopoolService = new AutopoolService();

    // Get platform settings for income rates and direct referral requirement
    const platformSettingsSnap = await db.collection('platformSettings').doc('general').get();
    const platformSettings = platformSettingsSnap.data() as PlatformSettings;

    const incomeRates = {
      'Bronze': 0.10,
      'Silver': 0.25,
      'Gold': 0.50,
      'Platinum': 1.00,
      'Diamond': 2.00,
      'Crown': 5.00
    };
    const requiredDirectReferrals = platformSettings.directReferralRequirement || 2;
    
    let processedPositions = 0;
    let currentPosition: GlobalAutopoolPosition | null = null;

    // Loop to process positions sequentially
    while ((currentPosition = await autopoolService.getNextDistributionPosition()) !== null) {
      const userId = currentPosition.userId;
      const userRank = currentPosition.rank;
      const positionNumber = currentPosition.position;

      // Fetch user data to get directReferrals count
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        console.warn(`User ${userId} not found for autopool position ${positionNumber}. Skipping.`);
        await autopoolService.updateNextDistributionPosition(positionNumber + 1);
        continue;
      }
      const userData = userDoc.data() as User;
      
      if (!incomeRates[userRank as keyof typeof incomeRates]) {
        console.warn(`User ${userId} has invalid rank ${userRank} for autopool position ${positionNumber}. Skipping income generation.`);
        await autopoolService.updateNextDistributionPosition(positionNumber + 1);
        continue;
      }
      
      const income = incomeRates[userRank as keyof typeof incomeRates];
      const directReferralsCount = userData.directReferrals || 0;
      
      const canClaim = directReferralsCount >= requiredDirectReferrals;
      
      const batch = db.batch();

      // Create income transaction
      const incomeTransactionRef = db.collection('incomeTransactions').doc();
      
      const incomeTransaction = {
        id: incomeTransactionRef.id,
        userId: userId,
        rank: userRank,
        amount: income,
        type: 'autopool_income_manual',
        status: canClaim ? 'available' : 'locked',
        lockedBalance: canClaim ? 0 : income,
        availableBalance: canClaim ? income : 0,
        directReferralsCount: directReferralsCount,
        requiredDirectReferrals: requiredDirectReferrals,
        canClaim: canClaim,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          generatedBy: 'manualPoolIncomeGeneration',
          triggeredBy: context.auth.uid,
          manualTrigger: true,
          autopoolPosition: positionNumber
        }
      };
      
      batch.set(incomeTransactionRef, incomeTransaction);
      
      // Update user's balance fields
      const userRef = db.collection('users').doc(userId);
      if (canClaim) {
        batch.update(userRef, {
          availableBalance: admin.firestore.FieldValue.increment(income),
          totalEarnings: admin.firestore.FieldValue.increment(income),
          lastIncomeGenerated: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        batch.update(userRef, {
          lockedBalance: admin.firestore.FieldValue.increment(income),
          lastIncomeGenerated: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      // Mark position as distributed and update next distribution pointer
      batch.update(db.collection('globalAutopool').doc(String(positionNumber)), {
        lastDistributedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await autopoolService.updateNextDistributionPosition(positionNumber + 1);

      await batch.commit();
      processedPositions++;
    }
    
    return {
      success: true,
      processedUsers: processedPositions,
      message: `Manual pool income generation completed for ${processedPositions} users`
    };
    
  } catch (error) {
    console.error('Error in manual pool income generation:', error);
    throw new functions.https.HttpsError('internal', 'Failed to generate pool income');
  }
});
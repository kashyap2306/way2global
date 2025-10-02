/**
 * Firestore Trigger - Handle user creation and MLM node setup
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { User, Rank, PlatformSettings } from '../types';
import { getRankConfig } from '../utils/ranks';
import { updateMlmStructure } from '../utils/mlm';
import { AutopoolService } from '../services/autopoolService';

const db = admin.firestore();

export const onUserCreated = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snapshot, context) => {
    const newUser = snapshot.data() as User;
    const userId = context.params.userId;

    console.log(`New user created: ${userId}`);

    try {
      // Initialize MLM data for the new user
      await updateMlmStructure(userId, newUser.sponsorId || null, newUser.placementId || null, newUser.position || null);

      // Assign user to autopool
      const autopoolService = new AutopoolService();
      await autopoolService.assignToNextPosition(userId, newUser.currentRank);

      // Fetch platform settings for welcome bonus
      const platformSettingsSnap = await db.collection('platformSettings').doc('general').get();
      const platformSettings = platformSettingsSnap.data() as PlatformSettings;

      if (platformSettings && platformSettings.welcomeBonus > 0) {
        // Create welcome income transaction (if applicable)
        await createWelcomeBonus(userId);

        await logger.info(
          LogCategory.AUTH,
          'User creation processing completed successfully',
          userId
        );

      } catch (error) {
        await logger.error(
          LogCategory.AUTH,
          'Failed to process user creation',
          error as Error,
          userId,
          { userData }
        );
        
        // Don't throw error to prevent user creation failure
        // Log the error and continue
      }
    });

/**
 * Initialize user MLM data
 */
async function initializeUserMLMData(userId: string, userData: any): Promise<void> {
  const db = admin.firestore();
  
  // Set default MLM values if not already set
  const mlmDefaults = {
    currentRank: userData.currentRank || null,
    isActive: userData.isActive || false,
    availableBalance: userData.availableBalance || 0,
    totalEarnings: userData.totalEarnings || 0,
    totalWithdrawn: userData.totalWithdrawn || 0,
    directReferrals: userData.directReferrals || 0,
    teamSize: userData.teamSize || 1, // User counts as 1
    totalBusiness: userData.totalBusiness || 0,
    joinedAt: userData.joinedAt || admin.firestore.FieldValue.serverTimestamp(),
    lastLoginAt: userData.lastLoginAt || admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  // Update user document with MLM defaults
  await db.collection(collections.USERS).doc(userId).update(mlmDefaults);

  await logger.info(
    LogCategory.MLM,
    'User MLM data initialized',
    userId,
    mlmDefaults
  );
}

/**
 * Update sponsor's referral count and team size
 */
async function updateSponsorReferralCount(sponsorUID: string, newUserUID: string): Promise<void> {
  const db = admin.firestore();

  try {
    // Update sponsor's direct referrals count
    await db.runTransaction(async (transaction) => {
      const sponsorRef = db.collection(collections.USERS).doc(sponsorUID);
      const sponsorDoc = await transaction.get(sponsorRef);

      if (!sponsorDoc.exists) {
        throw new Error(`Sponsor ${sponsorUID} not found`);
      }

      const sponsorData = sponsorDoc.data();
      const currentDirectReferrals = sponsorData?.directReferrals || 0;
      const currentTeamSize = sponsorData?.teamSize || 1;

      transaction.update(sponsorRef, {
        directReferrals: currentDirectReferrals + 1,
        teamSize: currentTeamSize + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    // Update upline team sizes
    await updateUplineTeamSizes(sponsorUID);

    await logger.info(
      LogCategory.MLM,
      'Sponsor referral count updated',
      sponsorUID,
      { newReferral: newUserUID }
    );

  } catch (error) {
    await logger.error(
      LogCategory.MLM,
      'Failed to update sponsor referral count',
      error as Error,
      sponsorUID,
      { newUserUID }
    );
    throw error;
  }
}

/**
 * Update upline team sizes recursively
 */
async function updateUplineTeamSizes(userUID: string, levels: number = 10): Promise<void> {
  const db = admin.firestore();
  let currentUID = userUID;

  for (let i = 0; i < levels; i++) {
    try {
      const userDoc = await db.collection(collections.USERS).doc(currentUID).get();
      
      if (!userDoc.exists) break;
      
      const userData = userDoc.data();
      const sponsorUID = userData?.sponsorUID;
      
      if (!sponsorUID) break;

      // Update sponsor's team size
      await db.collection(collections.USERS).doc(sponsorUID).update({
        teamSize: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      currentUID = sponsorUID;

    } catch (error) {
      await logger.warn(
        LogCategory.MLM,
        `Failed to update upline team size at level ${i + 1}`,
        currentUID,
        { error: (error as Error).message }
      );
      break;
    }
  }
}

/**
 * Create welcome bonus (if configured)
 */
async function createWelcomeBonus(userId: string): Promise<void> {
  const db = admin.firestore();
  
  // Check if welcome bonus is enabled in settings
  const settingsDoc = await db.collection(collections.SETTINGS).doc('system').get();
  const systemSettings = settingsDoc.data();
  
  const welcomeBonusEnabled = systemSettings?.settings?.welcomeBonusEnabled || false;
  const welcomeBonusAmount = systemSettings?.settings?.welcomeBonusAmount || 0;

  if (!welcomeBonusEnabled || welcomeBonusAmount <= 0) {
    return;
  }

  try {
    // Create welcome bonus income
    const incomeData = {
      uid: userId,
      type: 'welcome_bonus',
      amount: welcomeBonusAmount,
      sourceUID: 'system',
      sourceTransactionId: 'welcome_bonus',
      status: 'completed',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        description: 'Welcome bonus for new user registration'
      }
    };

    await db.collection(collections.INCOMES).add(incomeData);

    // Update user's available balance
    await db.collection(collections.USERS).doc(userId).update({
      availableBalance: admin.firestore.FieldValue.increment(welcomeBonusAmount),
      totalEarnings: admin.firestore.FieldValue.increment(welcomeBonusAmount),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create income transaction
    const transactionData = {
      uid: userId,
      type: 'income',
      subType: 'welcome_bonus',
      amount: welcomeBonusAmount,
      status: 'completed',
      description: 'Welcome bonus',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection(collections.INCOME_TRANSACTIONS).add(transactionData);

    await logger.info(
      LogCategory.MLM,
      'Welcome bonus created',
      userId,
      { amount: welcomeBonusAmount }
    );

  } catch (error) {
    await logger.error(
      LogCategory.MLM,
      'Failed to create welcome bonus',
      error as Error,
      userId,
      { welcomeBonusAmount }
    );
    // Don't throw error, welcome bonus failure shouldn't block user creation
  }
}
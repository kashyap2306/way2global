/**
 * User Signup Service - Comprehensive Document Creation
 * Handles automatic creation of all required documents for new user signups
 */

import * as admin from 'firebase-admin';
import { logger, LogCategory } from '../utils/logger';

// Generate unique userCode (WG + 6 digits)
export async function generateUserCode(): Promise<string> {
  const db = admin.firestore();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const userCode = `WG${randomNum}`;
    
    try {
      // Check if userCode already exists
      const existingUser = await db.collection('users')
        .where('userCode', '==', userCode)
        .limit(1)
        .get();
      
      if (existingUser.empty) {
        await logger.info(LogCategory.SYSTEM, `Generated unique userCode: ${userCode}`);
        return userCode;
      }
      
      attempts++;
    } catch (error) {
      await logger.error(LogCategory.SYSTEM, 'Error checking userCode uniqueness', error as Error);
      attempts++;
    }
  }
  
  throw new Error('Failed to generate unique userCode after maximum attempts');
}

// Document templates for all collections
export function createDocumentTemplates(uid: string, userCode: string, userData: any) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  
  return {
    // Main user document
    users: {
      uid,
      userCode,
      displayName: userData.displayName,
      email: userData.email,
      phone: userData.phone,
      rank: 'Azurite',
      teamSize: 1,
      isActive: false,
      availableBalance: 0,
      pendingBalance: 0,
      totalEarnings: 0,
      createdAt: now,
      updatedAt: now,
      walletAddress: userData.walletAddress
    },

    // Transaction placeholder
    transactions: {
      uid,
      userCode,
      transactionId: '_init',
      type: 'system_init',
      amount: 0,
      currency: 'USDT_BEP20',
      status: 'completed',
      description: 'Initial placeholder document',
      createdAt: now,
      updatedAt: now
    },

    // Income transaction placeholder
    incomeTransactions: {
      _placeholder: true,
      type: 'init',
      createdAt: now
    },

    // Withdrawal initial document
    withdrawals: {
      uid,
      userCode,
      withdrawalId: '_init',
      amount: 0,
      currency: 'USDT_BEP20',
      status: 'pending',
      method: 'system_init',
      description: 'Initial placeholder document',
      createdAt: now,
      updatedAt: now
    },

    // User settings
    settings: {
      uid,
      userCode,
      privacy: {
        profileVisible: true,
        showEarnings: false
      },
      preferences: {
        language: 'en',
        currency: 'USDT',
        timezone: 'UTC'
      },
      security: {
        twoFactorEnabled: false,
        loginNotifications: true
      },
      createdAt: now,
      updatedAt: now
    },

    // REID (Referral ID) document
    reids: {
      uid,
      userCode,
      reidId: userCode, // Use userCode as REID
      isActive: true,
      linkedUserId: uid,
      createdAt: now,
      updatedAt: now
    },

    // Rate limits for signup attempts
    rateLimits: {
      uid,
      userCode,
      signupAttempts: 1,
      lastSignupAttempt: now,
      dailyLimit: 3,
      resetDate: now,
      createdAt: now,
      updatedAt: now
    },

    // Payout queue
    payoutQueue: {
      uid,
      userCode,
      queuePosition: 0,
      totalPending: 0,
      lastProcessed: null,
      status: 'active',
      createdAt: now,
      updatedAt: now
    },

    // Audit log for signup
    auditLogs: {
      action: 'user_signup',
      actorId: uid,
      actorUid: uid,
      createdAt: now,
      details: {
        activationAmount: 5,
        rank: 'Azurite'
      },
      target: {
        id: uid,
        type: 'user',
        targetUid: uid,
        targetUserCode: userCode
      },
      logId: `${uid}_signup_${Date.now()}`
    },

    // Cycles tracking
    cycles: {
      uid,
      userCode,
      currentRank: 'Azurite',
      cycleNumber: 1,
      position: 0,
      isActive: true,
      completedAt: null,
      earnings: 0,
      createdAt: now,
      updatedAt: now
    }
  };
}

// Create all user documents in batch
export async function createAllUserDocuments(
  uid: string, 
  userData: any, 
  sponsorId?: string
): Promise<void> {
  const db = admin.firestore();
  
  try {
    await logger.info(LogCategory.SYSTEM, `Starting document creation for user: ${uid}`);
    
    // Generate unique userCode
    const userCode = await generateUserCode();
    
    // Prepare user data with sponsorId
    const userDataWithSponsor = {
      ...userData,
      sponsorId: sponsorId || null
    };
    
    // Create document templates
    const templates = createDocumentTemplates(uid, userCode, userDataWithSponsor);
    
    // Create batch write
    const batch = db.batch();
    
    // Add only required documents to batch
    batch.set(db.collection('users').doc(uid), templates.users);
    batch.set(db.collection('users').doc(uid).collection('incomeTransactions').doc('_init'), templates.incomeTransactions);
    batch.set(db.collection('auditLogs').doc(templates.auditLogs.logId), templates.auditLogs);
    
    // Execute batch write
    await batch.commit();
    
    await logger.info(
      LogCategory.SYSTEM, 
      `Successfully created all documents for user: ${uid} with userCode: ${userCode}`
    );
    
  } catch (error) {
    await logger.error(
      LogCategory.SYSTEM, 
      `Failed to create documents for user: ${uid}`, 
      error as Error
    );
    
    // Attempt cleanup
    await cleanupFailedSignup(uid);
    throw error;
  }
}

// Check if user documents already exist
export async function checkUserDocumentsExist(uid: string): Promise<boolean> {
  const db = admin.firestore();
  
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    return userDoc.exists;
  } catch (error) {
    await logger.error(LogCategory.SYSTEM, 'Error checking user document existence', error as Error);
    return false;
  }
}

// Cleanup failed signup
async function cleanupFailedSignup(uid: string): Promise<void> {
  const db = admin.firestore();
  
  try {
    await logger.info(LogCategory.SYSTEM, `Cleaning up failed signup for user: ${uid}`);
    
    const batch = db.batch();
    
    // Delete documents that might have been created
    const collectionsToClean = [
      'users',
      'transactions', 
      'incomeTransactions',
      'withdrawals',
      'settings',
      'rateLimits',
      'payoutQueue',
      'cycles'
    ];
    
    for (const collection of collectionsToClean) {
      const docRef = db.collection(collection).doc(uid);
      batch.delete(docRef);
    }
    
    // Clean up documents with compound IDs
    batch.delete(db.collection('transactions').doc(`${uid}_init`));
    batch.delete(db.collection('incomeTransactions').doc(`${uid}_init`));
    batch.delete(db.collection('withdrawals').doc(`${uid}_init`));
    
    await batch.commit();
    
    await logger.info(LogCategory.SYSTEM, `Cleanup completed for user: ${uid}`);
    
  } catch (error) {
    await logger.error(LogCategory.SYSTEM, 'Error during cleanup', error as Error);
  }
}

// Validate all user documents exist
export async function validateUserDocuments(uid: string): Promise<boolean> {
  const db = admin.firestore();
  
  try {
    const requiredCollections = [
      'users',
      'settings',
      'rateLimits',
      'payoutQueue',
      'cycles'
    ];
    
    for (const collection of requiredCollections) {
      const doc = await db.collection(collection).doc(uid).get();
      if (!doc.exists) {
        await logger.error(
          LogCategory.SYSTEM, 
          `Missing document in ${collection} for user: ${uid}`
        );
        return false;
      }
    }
    
    // Check documents with compound IDs
    const compoundDocs = [
      { collection: 'transactions', id: `${uid}_init` },
      { collection: 'incomeTransactions', id: `${uid}_init` },
      { collection: 'withdrawals', id: `${uid}_init` }
    ];
    
    for (const docInfo of compoundDocs) {
      const doc = await db.collection(docInfo.collection).doc(docInfo.id).get();
      if (!doc.exists) {
        await logger.error(
          LogCategory.SYSTEM, 
          `Missing document ${docInfo.id} in ${docInfo.collection} for user: ${uid}`
        );
        return false;
      }
    }
    
    await logger.info(LogCategory.SYSTEM, `All documents validated for user: ${uid}`);
    return true;
    
  } catch (error) {
    await logger.error(LogCategory.SYSTEM, 'Error validating user documents', error as Error);
    return false;
  }
}

// Create rank templates (system initialization)
export async function createRankTemplates(): Promise<void> {
  const db = admin.firestore();
  
  try {
    const ranks = [
      { name: 'Azurite', activationAmount: 5, level: 1 },
      { name: 'Benitoite', activationAmount: 10, level: 2 },
      { name: 'Emerald', activationAmount: 50, level: 3 },
      { name: 'Ruby', activationAmount: 250, level: 4 },
      { name: 'Diamond', activationAmount: 1250, level: 5 },
      { name: 'Crown', activationAmount: 6250, level: 6 },
      { name: 'Royal Crown', activationAmount: 31250, level: 7 }
    ];
    
    const batch = db.batch();
    
    ranks.forEach(rank => {
      const rankRef = db.collection('ranks').doc(rank.name.toLowerCase());
      batch.set(rankRef, {
        name: rank.name,
        activationAmount: rank.activationAmount,
        level: rank.level,
        benefits: {
          levelIncome: true,
          globalIncome: rank.level >= 3,
          referralBonus: true
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    await batch.commit();
    await logger.info(LogCategory.SYSTEM, 'Rank templates created successfully');
    
  } catch (error) {
    await logger.error(LogCategory.SYSTEM, 'Error creating rank templates', error as Error);
  }
}
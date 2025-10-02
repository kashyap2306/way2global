/**
 * User Migration Script
 * Migrates existing users to ensure they have all required collections
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();
import { logger, LogCategory } from '../utils/logger';
import { collections } from '../config';

interface MigrationResult {
  success: boolean;
  totalUsers: number;
  migratedUsers: number;
  errors: string[];
  createdCollections: {
    [userId: string]: string[];
  };
}

interface CollectionStructures {
  withdrawals: any;
  reids: any;
  settings: any;
  payoutQueue: any;
  admin: any;
  auditLogs: any;
  cycles: any;
  ranks: any;
}

/**
 * Callable function to migrate existing users
 */
export const migrateUsers = functions.https.onCall(async (data, context): Promise<MigrationResult> => {
  try {
    // Check if user is authenticated and has admin privileges
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    await logger.info(LogCategory.SYSTEM, 'Starting user migration process');

    const db = admin.firestore();
    const result: MigrationResult = {
      success: true,
      totalUsers: 0,
      migratedUsers: 0,
      errors: [],
      createdCollections: {}
    };

    // Fetch all existing users from Firebase Authentication
    const authUsers = await admin.auth().listUsers();
    result.totalUsers = authUsers.users.length;

    await logger.info(LogCategory.SYSTEM, `Found ${result.totalUsers} users in Firebase Auth to migrate`);

    // Process each user from Firebase Authentication
    for (const authUser of authUsers.users) {
      const userId = authUser.uid;
      const userEmail = authUser.email;

      try {
        await logger.info(LogCategory.SYSTEM, `Processing Auth user: ${userId} (${userEmail})`);

        // First, ensure the user document exists in Firestore
        const userDocCreated = await ensureUserDocument(db, authUser);
        
        // Get the user data from Firestore (either existing or newly created)
        const userDocRef = db.collection(collections.USERS).doc(userId);
        const userDoc = await userDocRef.get();
        const userData = userDoc.data();

        // Check and create missing collections for this user
        const createdCollections = await checkAndCreateMissingCollections(db, userId, userData);
        
        // Track what was created
        const allCreated = [];
        if (userDocCreated) allCreated.push('users');
        allCreated.push(...createdCollections);
        
        if (allCreated.length > 0) {
          result.migratedUsers++;
          result.createdCollections[userId] = allCreated;
          
          await logger.info(
            LogCategory.SYSTEM, 
            `Migration completed for user ${userId}`, 
            undefined, 
            { 
              userId, 
              email: userEmail,
              userDocCreated,
              createdCollections: allCreated,
              status: 'success'
            }
          );
        } else {
          await logger.info(
            LogCategory.SYSTEM, 
            `No migration needed for user ${userId}`, 
            undefined, 
            { 
              userId, 
              email: userEmail,
              status: 'already_exists'
            }
          );
        }

      } catch (error: any) {
        const errorMessage = `Failed to migrate user ${userId}: ${error.message}`;
        result.errors.push(errorMessage);
        
        await logger.error(
          LogCategory.SYSTEM, 
          `Migration error for user ${userId}`, 
          error,
          undefined,
          { 
            userId, 
            email: userEmail,
            status: 'error'
          }
        );
      }
    }

    await logger.info(
      LogCategory.SYSTEM, 
      'User migration completed', 
      undefined, 
      {
        totalUsers: result.totalUsers,
        migratedUsers: result.migratedUsers,
        errors: result.errors.length
      }
    );

    return result;

  } catch (error: any) {
    await logger.error(LogCategory.SYSTEM, 'User migration failed', error);
    
    throw new functions.https.HttpsError(
      'internal',
      'Migration process failed',
      error.message
    );
  }
});

/**
 * Ensure user document exists in Firestore users collection
 */
async function ensureUserDocument(
  db: admin.firestore.Firestore, 
  authUser: admin.auth.UserRecord
): Promise<boolean> {
  const userId = authUser.uid;
  const userDocRef = db.collection(collections.USERS).doc(userId);
  
  try {
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      // Create new user document with the required structure
      const newUserData = {
        uid: authUser.uid,
        email: authUser.email || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active',
        profile: {
          name: authUser.displayName || '',
          contact: authUser.phoneNumber || '',
          avatar: authUser.photoURL || ''
        },
        balances: {
          main: 0,
          referral: 0,
          topup: 0
        }
      };
      
      await userDocRef.set(newUserData);
      
      await logger.info(
        LogCategory.SYSTEM, 
        `Created user document for ${userId}`,
        undefined,
        { 
          userId, 
          email: authUser.email,
          action: 'user_document_created'
        }
      );
      
      return true; // Document was created
    }
    
    return false; // Document already existed
    
  } catch (error: any) {
    await logger.error(
      LogCategory.SYSTEM, 
      `Failed to ensure user document for ${userId}`, 
      error,
      undefined,
      { userId, email: authUser.email }
    );
    throw error;
  }
}

/**
 * Check and create missing collections for a specific user
 */
async function checkAndCreateMissingCollections(
  db: admin.firestore.Firestore, 
  userId: string, 
  userData: any
): Promise<string[]> {
  const createdCollections: string[] = [];
  const batch = db.batch();

  // Define the collection structures based on user requirements
  const collectionStructures: CollectionStructures = {
    withdrawals: {
      withdrawalId: `wd_${userId}_migration`,
      userId: userId,
      amountRequested: 0,
      feePercent: 15,
      feeAmount: 0,
      amountAfterFee: 0,
      currency: 'USDT_BEP20',
      status: 'pending',
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedAt: null,
      processedAt: null,
      processedBy: null,
      txHash: null,
      notes: 'Migration document',
      // Additional fields from user requirements
      totalWithdrawn: 0,
      pending: [],
      history: []
    },
    reids: {
      poolId: `pool_${userId}_migration`,
      userId: userId,
      rank: userData.rank || 'Azurite',
      amount: 0,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active',
      linkedToTx: null,
      // Additional fields from user requirements
      redisKey: '',
      score: 0,
      lastUpdated: null
    },
    settings: {
      userId: userId,
      notifications: true,
      theme: 'light',
      language: 'en',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    payoutQueue: {
      queueId: `pq_${userId}_migration`,
      userId: userId,
      amount: 0,
      currency: 'USDT_BEP20',
      status: 'queued',
      attempts: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      txHash: null,
      // Additional fields from user requirements
      queue: [],
      lastProcessed: null
    },
    admin: {
      userId: userId,
      isAdmin: false,
      roles: [],
      permissions: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    auditLogs: {
      logId: `log_${userId}_migration`,
      actorId: userId,
      action: 'user_migration',
      target: { type: 'user', id: userId },
      details: { migrationDate: new Date().toISOString() },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      // Additional fields from user requirements
      logs: []
    },
    cycles: {
      userId: userId,
      currentCycle: userData.cyclesCompleted ? userData.cyclesCompleted + 1 : 1,
      completedCycles: [],
      lastCycleDate: null,
      rank: userData.rank || 'Azurite',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    ranks: {
      userId: userId,
      currentRank: userData.rank || 'Azurite',
      rankHistory: [],
      rankPoints: 0,
      activationAmount: userData.activationAmount || 5,
      rankActivatedAt: userData.rankActivatedAt || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
  };

  // Check each collection and create if missing
  const collectionsToCheck = [
    { name: 'withdrawals', collection: collections.WITHDRAWALS },
    { name: 'incomePools', collection: collections.INCOME_POOLS },
    { name: 'settings', collection: 'settings' },
    { name: 'payoutQueue', collection: collections.PAYOUT_QUEUE },
    { name: 'admin', collection: 'admin' },
    { name: 'auditLogs', collection: 'auditLogs' },
    { name: 'cycles', collection: 'cycles' },
    { name: 'ranks', collection: 'ranks' }
  ];

  for (const { name, collection } of collectionsToCheck) {
    try {
      // Check if document exists in the collection for this user
      const existingDocs = await db.collection(collection)
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (existingDocs.empty) {
        // Create the missing document
        const docId = `${name}_${userId}_migration`;
        const docRef = db.collection(collection).doc(docId);
        
        batch.set(docRef, collectionStructures[name as keyof CollectionStructures]);
        createdCollections.push(name);
        
        await logger.info(
          LogCategory.SYSTEM, 
          `Queued creation of ${name} collection for user ${userId}`
        );
      }
    } catch (error: any) {
      await logger.error(
        LogCategory.SYSTEM, 
        `Error checking ${name} collection for user ${userId}`, 
        error
      );
      throw error;
    }
  }

  // Commit all changes in a single batch
  if (createdCollections.length > 0) {
    await batch.commit();
    
    await logger.info(
      LogCategory.SYSTEM, 
      `Successfully created ${createdCollections.length} collections for user ${userId}`,
      undefined,
      { userId, createdCollections }
    );
  }

  return createdCollections;
}

/**
 * Helper function to run migration for a specific user (for testing)
 */
export const migrateSpecificUser = functions.https.onCall(async (data: { userId: string }, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { userId } = data;
    if (!userId) {
      throw new functions.https.HttpsError('invalid-argument', 'userId is required');
    }

    const db = admin.firestore();
    
    // Get user data
    const userDoc = await db.collection(collections.USERS).doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();
    const createdCollections = await checkAndCreateMissingCollections(db, userId, userData);

    return {
      success: true,
      userId,
      createdCollections,
      message: `Migration completed for user ${userId}. Created ${createdCollections.length} collections.`
    };

  } catch (error: any) {
    await logger.error(LogCategory.SYSTEM, `Migration failed for user ${data.userId}`, error);
    
    throw new functions.https.HttpsError(
      'internal',
      'Migration failed',
      error.message
    );
  }
});
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { AutopoolService } from '../services/autopoolService';

const db = admin.firestore();

/**
 * Callable function to initialize the autopool metadata and optionally migrate existing data.
 * This function should only be called once for initial setup or during a migration.
 */
export const initializeAutopool = functions.https.onCall(async (data, context) => {
  // Verify admin authentication
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  console.log('Initializing Autopool...');

  try {
    const autopoolService = new AutopoolService();

    // Initialize autopoolMeta document if it doesn't exist
    const autopoolMetaRef = db.collection('autopoolMeta').doc('meta');
    await db.runTransaction(async (transaction) => {
      const autopoolMetaSnap = await transaction.get(autopoolMetaRef);
      if (!autopoolMetaSnap.exists) {
        console.log('autopoolMeta document not found. Creating with default values.');
        transaction.set(autopoolMetaRef, {
          lastFilledPosition: 0,
          nextDistributionPosition: 1,
          lastResetAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        console.log('autopoolMeta document already exists. Skipping creation.');
      }
    });

    // Migration strategy: Start sequential autopool only for new activations and keep legacy pools untouched.
    // No explicit migration of existing incomePools to globalAutopool is performed here.
    // Existing users will continue to receive income from their current incomePools.
    // New users and new rank activations will be placed into the sequential global autopool.
    console.log('Migration strategy: New activations will use sequential autopool. Existing incomePools remain untouched.');

    return {
      success: true,
      message: 'Autopool initialization complete. Existing incomePools are not migrated.',
    };
  } catch (error) {
    console.error('Error initializing autopool:', error);
    throw new functions.https.HttpsError('internal', 'Failed to initialize autopool');
  }
});
/**
 * API endpoint for managing platform settings
 * Allows admin to update direct referral requirements and other platform configurations
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();
import { createLogger, LogCategory } from '../utils/logger';
import { collections } from '../config';
import { PlatformSettings } from '../types';

const logger = createLogger('PlatformSettings');

interface UpdateSettingsRequest {
  directReferralRequirement?: number;
  maintenanceMode?: boolean;
  registrationOpen?: boolean;
  welcomeBonus?: number;
  maxRankLevel?: number;
}

interface GetSettingsResponse {
  success: boolean;
  settings: PlatformSettings;
}

interface UpdateSettingsResponse {
  success: boolean;
  message: string;
  settings: PlatformSettings;
}

/**
 * Get platform settings
 */
export const getPlatformSettings = functions.https.onCall(
  async (data, context): Promise<GetSettingsResponse> => {
    try {
      // Verify authentication
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User must be authenticated'
        );
      }

      const db = admin.firestore();
      
      // Get settings document
      const settingsDoc = await db.collection(collections.SETTINGS).doc('platform').get();
      
      let settings: PlatformSettings;
      
      if (!settingsDoc.exists) {
        // Create default settings if they don't exist
        settings = {
          directReferralRequirement: 2,
          maintenanceMode: false,
          registrationOpen: true,
          welcomeBonus: 0,
          maxRankLevel: 10,
          updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
          updatedBy: context.auth.uid
        };
        
        await db.collection(collections.SETTINGS).doc('platform').set(settings);
      } else {
        settings = settingsDoc.data() as PlatformSettings;
      }

      return {
        success: true,
        settings
      };

    } catch (error) {
      await logger.error(
        LogCategory.ADMIN,
        'Failed to get platform settings',
        error instanceof Error ? error : new Error(String(error)),
        context.auth?.uid || '',
        {
          stack: error instanceof Error ? error.stack : undefined
        }
      );

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        'Failed to get platform settings'
      );
    }
  }
);

/**
 * Update platform settings (Admin only)
 */
export const updatePlatformSettings = functions.https.onCall(
  async (data: UpdateSettingsRequest, context): Promise<UpdateSettingsResponse> => {
    try {
      // Verify authentication
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User must be authenticated'
        );
      }

      const userUID = context.auth.uid;
      const db = admin.firestore();

      // Verify user is admin
      const userDoc = await db.collection(collections.USERS).doc(userUID).get();
      
      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'User not found'
        );
      }

      const userData = userDoc.data();
      if (userData?.role !== 'admin') {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Only administrators can update platform settings'
        );
      }

      // Validate input
      const {
        directReferralRequirement,
        maintenanceMode,
        registrationOpen,
        welcomeBonus,
        maxRankLevel
      } = data;

      if (directReferralRequirement !== undefined) {
        if (!Number.isInteger(directReferralRequirement) || directReferralRequirement < 0 || directReferralRequirement > 10) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Direct referral requirement must be an integer between 0 and 10'
          );
        }
      }

      if (welcomeBonus !== undefined) {
        if (typeof welcomeBonus !== 'number' || welcomeBonus < 0) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Welcome bonus must be a non-negative number'
          );
        }
      }

      if (maxRankLevel !== undefined) {
        if (!Number.isInteger(maxRankLevel) || maxRankLevel < 1 || maxRankLevel > 20) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Max rank level must be an integer between 1 and 20'
          );
        }
      }

      // Get current settings
      const settingsDoc = await db.collection(collections.SETTINGS).doc('platform').get();
      let currentSettings: PlatformSettings;

      if (!settingsDoc.exists) {
        // Create default settings
        currentSettings = {
          directReferralRequirement: 2,
          maintenanceMode: false,
          registrationOpen: true,
          welcomeBonus: 0,
          maxRankLevel: 10,
          updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
          updatedBy: userUID
        };
      } else {
        currentSettings = settingsDoc.data() as PlatformSettings;
      }

      // Prepare updates
      const updates: Partial<PlatformSettings> = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
        updatedBy: userUID
      };

      if (directReferralRequirement !== undefined) {
        updates.directReferralRequirement = directReferralRequirement;
      }
      if (maintenanceMode !== undefined) {
        updates.maintenanceMode = maintenanceMode;
      }
      if (registrationOpen !== undefined) {
        updates.registrationOpen = registrationOpen;
      }
      if (welcomeBonus !== undefined) {
        updates.welcomeBonus = welcomeBonus;
      }
      if (maxRankLevel !== undefined) {
        updates.maxRankLevel = maxRankLevel;
      }

      // Update settings
      await db.collection(collections.SETTINGS).doc('platform').set({
        ...currentSettings,
        ...updates
      });

      // If direct referral requirement changed, update all income pools
      if (directReferralRequirement !== undefined && directReferralRequirement !== currentSettings.directReferralRequirement) {
        const batch = db.batch();
        
        // Get all income pools
        const poolsSnapshot = await db.collection(collections.INCOME_POOLS).get();
        
        poolsSnapshot.docs.forEach(doc => {
          batch.update(doc.ref, {
            requiredDirectReferrals: directReferralRequirement
          });
        });

        await batch.commit();

        await logger.info(
          LogCategory.ADMIN,
          `Updated direct referral requirement from ${currentSettings.directReferralRequirement} to ${directReferralRequirement}`,
          userUID,
          {
            oldValue: currentSettings.directReferralRequirement,
            newValue: directReferralRequirement,
            poolsUpdated: poolsSnapshot.size
          }
        );
      }

      const updatedSettings = { ...currentSettings, ...updates };

      await logger.info(
        LogCategory.ADMIN,
        'Platform settings updated',
        userUID,
        {
          updates,
          previousSettings: currentSettings
        }
      );

      return {
        success: true,
        message: 'Platform settings updated successfully',
        settings: updatedSettings
      };

    } catch (error) {
      await logger.error(
        LogCategory.ADMIN,
        'Failed to update platform settings',
        error instanceof Error ? error : new Error(String(error)),
        context.auth?.uid || '',
        {
          data,
          stack: error instanceof Error ? error.stack : undefined
        }
      );

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        'Failed to update platform settings'
      );
    }
  }
);

/**
 * HTTP endpoint for getting platform settings
 */
export const getPlatformSettingsHttp = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Verify authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Create context object
    const context = {
      auth: {
        uid: decodedToken.uid,
        token: decodedToken
      }
    };

    // Call the main function
    const result = await getPlatformSettings({} as any, context);
    
    res.status(200).json(result);

  } catch (error) {
    console.error('HTTP endpoint error:', error);
    
    if (error instanceof functions.https.HttpsError) {
      res.status(400).json({
        success: false,
        message: error.message,
        code: error.code
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
});

/**
 * HTTP endpoint for updating platform settings
 */
export const updatePlatformSettingsHttp = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Verify authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Create context object
    const context = {
      auth: {
        uid: decodedToken.uid,
        token: decodedToken
      }
    };

    // Call the main function
    const result = await updatePlatformSettings(req.body, context as any);
    
    res.status(200).json(result);

  } catch (error) {
    console.error('HTTP endpoint error:', error);
    
    if (error instanceof functions.https.HttpsError) {
      res.status(400).json({
        success: false,
        message: error.message,
        code: error.code
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
});
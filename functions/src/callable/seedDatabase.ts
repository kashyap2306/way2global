/**
 * Callable Function - Seed Database
 */

import * as functions from 'firebase-functions';
import * as Joi from 'joi';
import { createLogger, LogCategory } from '../utils/logger';
import { SeedService } from '../services/seedService';

const logger = createLogger('SeedDatabase');
const seedService = new SeedService();

// Validation schema
const seedSchema = Joi.object({
  action: Joi.string().valid('seed', 'clear', 'status', 'reseed').required(),
  force: Joi.boolean().default(false)
});

/**
 * Seed Database Callable Function
 * Actions:
 * - seed: Initialize database with ranks, settings, test users
 * - clear: Clear all data from database
 * - status: Get current seed status
 * - reseed: Clear and then seed (force required)
 */
export const seedDatabase = functions.https.onCall(async (data, context) => {
  try {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication required'
      );
    }

    // Check if user is super admin
    const userClaims = context.auth.token;
    if (!userClaims.superAdmin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Super admin access required'
      );
    }

    // Validate input
    const { error, value } = seedSchema.validate(data);
    if (error) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Validation error: ${error.details[0].message}`
      );
    }

    const { action, force } = value;
    const uid = context.auth.uid;

    await logger.info(
      LogCategory.SYSTEM,
      `Seed database action: ${action}`,
      uid,
      { action, force }
    );

    switch (action) {
      case 'status':
        const status = await seedService.getSeedStatus();
        return {
          success: true,
          data: status
        };

      case 'seed':
        // Check if already seeded
        const isSeeded = await seedService.isSeedComplete();
        if (isSeeded && !force) {
          return {
            success: false,
            error: 'Database is already seeded. Use force=true to override.',
            data: await seedService.getSeedStatus()
          };
        }

        await seedService.seedAll();
        
        await logger.info(
          LogCategory.SYSTEM,
          'Database seeded successfully',
          uid
        );

        return {
          success: true,
          message: 'Database seeded successfully',
          data: await seedService.getSeedStatus()
        };

      case 'clear':
        if (!force) {
          throw new functions.https.HttpsError(
            'failed-precondition',
            'Clear action requires force=true for safety'
          );
        }

        await seedService.clearAllData();
        
        await logger.info(
          LogCategory.SYSTEM,
          'Database cleared successfully',
          uid
        );

        return {
          success: true,
          message: 'Database cleared successfully'
        };

      case 'reseed':
        if (!force) {
          throw new functions.https.HttpsError(
            'failed-precondition',
            'Reseed action requires force=true for safety'
          );
        }

        await seedService.clearAllData();
        await seedService.seedAll();
        
        await logger.info(
          LogCategory.SYSTEM,
          'Database reseeded successfully',
          uid
        );

        return {
          success: true,
          message: 'Database reseeded successfully',
          data: await seedService.getSeedStatus()
        };

      default:
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Invalid action specified'
        );
    }

  } catch (error) {
    await logger.error(
      LogCategory.SYSTEM,
      'Seed database operation failed',
      error as Error,
      context.auth?.uid,
      { action: data?.action }
    );

    // Re-throw HttpsError as-is
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Convert other errors to HttpsError
    throw new functions.https.HttpsError(
      'internal',
      'Seed operation failed'
    );
  }
});
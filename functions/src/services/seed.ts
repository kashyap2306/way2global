/**
 * Seed Service - Populate initial data for development and testing
 */

import * as admin from 'firebase-admin';
import { createLogger, LogCategory } from '../utils/logger';
import { collections, mlmConfig } from '../config';
import { roundToTwoDecimals } from '../utils/math';

const logger = createLogger('SeedService');

export interface SeedOptions {
  ranks?: boolean;
  settings?: boolean;
  testUsers?: boolean;
  globalCycles?: boolean;
  force?: boolean; // Override existing data
}

export class SeedService {
  private db: admin.firestore.Firestore;

  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Run all seed operations
   */
  async seedAll(options: SeedOptions = {}): Promise<void> {
    const {
      ranks = true,
      settings = true,
      testUsers = true,
      globalCycles = true,
      force = false
    } = options;

    try {
      await logger.info(LogCategory.SYSTEM, 'Starting seed operations');

      if (ranks) {
        await this.seedRanks(force);
      }

      if (settings) {
        await this.seedSettings(force);
      }

      if (testUsers) {
        await this.seedTestUsers(force);
      }

      if (globalCycles) {
        await this.seedGlobalCycles(force);
      }

      await logger.info(LogCategory.SYSTEM, 'All seed operations completed successfully');

    } catch (error) {
      await logger.error(
        LogCategory.SYSTEM,
        'Seed operations failed',
        error as Error
      );
      throw error;
    }
  }

  /**
   * Seed ranks collection
   */
  async seedRanks(force: boolean = false): Promise<void> {
    try {
      await logger.info(LogCategory.SYSTEM, 'Seeding ranks collection');

      // Check if ranks already exist
      if (!force) {
        const existingRanks = await this.db.collection(collections.RANKS).limit(1).get();
        if (!existingRanks.empty) {
          await logger.info(LogCategory.SYSTEM, 'Ranks already exist, skipping seed');
          return;
        }
      }

      const batch = this.db.batch();
      const ranksData = [
        {
          id: 'azurite',
          name: 'Azurite',
          activationAmount: 5,
          benefits: {
            referralIncome: true,
            levelIncome: true,
            globalIncome: false,
            retopupIncome: true
          },
          requirements: {
            directReferrals: 0,
            teamSize: 0,
            totalBusiness: 0
          },
          order: 1,
          isActive: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
          id: 'pearl',
          name: 'Pearl',
          activationAmount: 25,
          benefits: {
            referralIncome: true,
            levelIncome: true,
            globalIncome: true,
            retopupIncome: true
          },
          requirements: {
            directReferrals: 2,
            teamSize: 4,
            totalBusiness: 50
          },
          order: 2,
          isActive: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
          id: 'topaz',
          name: 'Topaz',
          activationAmount: 125,
          benefits: {
            referralIncome: true,
            levelIncome: true,
            globalIncome: true,
            retopupIncome: true
          },
          requirements: {
            directReferrals: 4,
            teamSize: 16,
            totalBusiness: 250
          },
          order: 3,
          isActive: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
          id: 'citrine',
          name: 'Citrine',
          activationAmount: 625,
          benefits: {
            referralIncome: true,
            levelIncome: true,
            globalIncome: true,
            retopupIncome: true
          },
          requirements: {
            directReferrals: 6,
            teamSize: 64,
            totalBusiness: 1250
          },
          order: 4,
          isActive: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
          id: 'garnet',
          name: 'Garnet',
          activationAmount: 3125,
          benefits: {
            referralIncome: true,
            levelIncome: true,
            globalIncome: true,
            retopupIncome: true
          },
          requirements: {
            directReferrals: 8,
            teamSize: 256,
            totalBusiness: 6250
          },
          order: 5,
          isActive: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
          id: 'amethyst',
          name: 'Amethyst',
          activationAmount: 15625,
          benefits: {
            referralIncome: true,
            levelIncome: true,
            globalIncome: true,
            retopupIncome: true
          },
          requirements: {
            directReferrals: 10,
            teamSize: 1024,
            totalBusiness: 31250
          },
          order: 6,
          isActive: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
          id: 'sapphire',
          name: 'Sapphire',
          activationAmount: 78125,
          benefits: {
            referralIncome: true,
            levelIncome: true,
            globalIncome: true,
            retopupIncome: true
          },
          requirements: {
            directReferrals: 12,
            teamSize: 4096,
            totalBusiness: 156250
          },
          order: 7,
          isActive: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
          id: 'ruby',
          name: 'Ruby',
          activationAmount: 390625,
          benefits: {
            referralIncome: true,
            levelIncome: true,
            globalIncome: true,
            retopupIncome: true
          },
          requirements: {
            directReferrals: 14,
            teamSize: 16384,
            totalBusiness: 781250
          },
          order: 8,
          isActive: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
          id: 'emerald',
          name: 'Emerald',
          activationAmount: 1953125,
          benefits: {
            referralIncome: true,
            levelIncome: true,
            globalIncome: true,
            retopupIncome: true
          },
          requirements: {
            directReferrals: 16,
            teamSize: 65536,
            totalBusiness: 3906250
          },
          order: 9,
          isActive: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
          id: 'diamond',
          name: 'Diamond',
          activationAmount: 9765625,
          benefits: {
            referralIncome: true,
            levelIncome: true,
            globalIncome: true,
            retopupIncome: true
          },
          requirements: {
            directReferrals: 18,
            teamSize: 262144,
            totalBusiness: 19531250
          },
          order: 10,
          isActive: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        }
      ];

      // Clear existing ranks if force is true
      if (force) {
        const existingRanks = await this.db.collection(collections.RANKS).get();
        existingRanks.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
      }

      // Add new ranks
      ranksData.forEach(rank => {
        const rankRef = this.db.collection(collections.RANKS).doc(rank.id);
        batch.set(rankRef, rank);
      });

      await batch.commit();

      await logger.info(
        LogCategory.SYSTEM,
        `Successfully seeded ${ranksData.length} ranks`
      );

    } catch (error) {
      await logger.error(
        LogCategory.SYSTEM,
        'Failed to seed ranks',
        error as Error
      );
      throw error;
    }
  }

  /**
   * Seed settings collection
   */
  async seedSettings(force: boolean = false): Promise<void> {
    try {
      await logger.info(LogCategory.SYSTEM, 'Seeding settings collection');

      // Check if settings already exist
      if (!force) {
        const existingSettings = await this.db.collection(collections.SETTINGS).limit(1).get();
        if (!existingSettings.empty) {
          await logger.info(LogCategory.SYSTEM, 'Settings already exist, skipping seed');
          return;
        }
      }

      const settingsData = [
        {
          id: 'withdrawal',
          category: 'withdrawal',
          settings: {
            minimumAmount: mlmConfig.withdrawal.minimumAmount,
            dailyLimit: mlmConfig.withdrawal.dailyLimit,
            fees: {
              usdt: mlmConfig.withdrawal.usdtFee,
              fundConversion: mlmConfig.withdrawal.fundConversion,
              p2p: mlmConfig.withdrawal.p2pFee,
              processing: mlmConfig.withdrawal.processingFeePercentage
            },
            methods: ['usdt_bep20', 'fund_conversion', 'p2p'],
            processingTime: {
              usdt_bep20: '30 minutes',
              fund_conversion: '1-2 hours',
              p2p: 'Instant'
            }
          },
          isActive: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
          id: 'income',
          category: 'income',
          settings: {
            referral: mlmConfig.incomes.referral,
            level: mlmConfig.incomes.level,
            global: mlmConfig.incomes.global,
            retopup: mlmConfig.incomes.referral // Same as referral
          },
          isActive: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
          id: 'global_cycle',
          category: 'global_cycle',
          settings: {
            cycleSize: mlmConfig.incomes.global.cycleSize,
            levels: mlmConfig.incomes.global.levels,
            percentage: mlmConfig.incomes.global.percentage,
            autoTopupEnabled: mlmConfig.globalCycle.autoTopupEnabled,
            reidGenerationEnabled: mlmConfig.globalCycle.reidGenerationEnabled
          },
          isActive: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
          id: 'system',
          category: 'system',
          settings: {
            maintenanceMode: false,
            registrationEnabled: true,
            withdrawalEnabled: true,
            supportEmail: 'support@wayglobe.com',
            supportPhone: '+1-234-567-8900',
            companyName: 'WayGlobe MLM',
            version: '1.0.0'
          },
          isActive: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        }
      ];

      const batch = this.db.batch();

      // Clear existing settings if force is true
      if (force) {
        const existingSettings = await this.db.collection(collections.SETTINGS).get();
        existingSettings.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
      }

      // Add new settings
      settingsData.forEach(setting => {
        const settingRef = this.db.collection(collections.SETTINGS).doc(setting.id);
        batch.set(settingRef, setting);
      });

      await batch.commit();

      await logger.info(
        LogCategory.SYSTEM,
        `Successfully seeded ${settingsData.length} settings`
      );

    } catch (error) {
      await logger.error(
        LogCategory.SYSTEM,
        'Failed to seed settings',
        error as Error
      );
      throw error;
    }
  }

  /**
   * Seed test users
   */
  async seedTestUsers(force: boolean = false): Promise<void> {
    try {
      await logger.info(LogCategory.SYSTEM, 'Seeding test users');

      // Check if test users already exist
      if (!force) {
        const existingUsers = await this.db.collection(collections.USERS).limit(1).get();
        if (!existingUsers.empty) {
          await logger.info(LogCategory.SYSTEM, 'Users already exist, skipping seed');
          return;
        }
      }

      const testUsers = [
        {
          uid: 'test-admin-001',
          email: 'admin@wayglobe.com',
          fullName: 'System Administrator',
          contact: '+1-234-567-8901',
          walletAddress: '0x1234567890123456789012345678901234567890',
          sponsorUID: null,
          currentRank: 'diamond',
          isActive: true,
          isAdmin: true,
          availableBalance: 10000,
          totalEarnings: 50000,
          totalWithdrawn: 40000,
          directReferrals: 20,
          teamSize: 1000,
          totalBusiness: 100000,
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
          uid: 'test-user-001',
          email: 'user1@test.com',
          fullName: 'Test User One',
          contact: '+1-234-567-8902',
          walletAddress: '0x2345678901234567890123456789012345678901',
          sponsorUID: 'test-admin-001',
          currentRank: 'pearl',
          isActive: true,
          isAdmin: false,
          availableBalance: 150,
          totalEarnings: 500,
          totalWithdrawn: 350,
          directReferrals: 3,
          teamSize: 15,
          totalBusiness: 1000,
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
          uid: 'test-user-002',
          email: 'user2@test.com',
          fullName: 'Test User Two',
          contact: '+1-234-567-8903',
          walletAddress: '0x3456789012345678901234567890123456789012',
          sponsorUID: 'test-user-001',
          currentRank: 'azurite',
          isActive: true,
          isAdmin: false,
          availableBalance: 25,
          totalEarnings: 75,
          totalWithdrawn: 50,
          directReferrals: 1,
          teamSize: 3,
          totalBusiness: 150,
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
          uid: 'test-user-003',
          email: 'user3@test.com',
          fullName: 'Test User Three',
          contact: '+1-234-567-8904',
          walletAddress: '0x4567890123456789012345678901234567890123',
          sponsorUID: 'test-user-001',
          currentRank: 'azurite',
          isActive: true,
          isAdmin: false,
          availableBalance: 15,
          totalEarnings: 45,
          totalWithdrawn: 30,
          directReferrals: 0,
          teamSize: 1,
          totalBusiness: 75,
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
          uid: 'test-user-004',
          email: 'user4@test.com',
          fullName: 'Test User Four',
          contact: '+1-234-567-8905',
          walletAddress: '0x5678901234567890123456789012345678901234',
          sponsorUID: 'test-user-002',
          currentRank: 'azurite',
          isActive: true,
          isAdmin: false,
          availableBalance: 8,
          totalEarnings: 25,
          totalWithdrawn: 17,
          directReferrals: 0,
          teamSize: 1,
          totalBusiness: 35,
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      ];

      const batch = this.db.batch();

      // Clear existing users if force is true
      if (force) {
        const existingUsers = await this.db.collection(collections.USERS).get();
        existingUsers.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
      }

      // Add test users
      testUsers.forEach(user => {
        const userRef = this.db.collection(collections.USERS).doc(user.uid);
        batch.set(userRef, user);
      });

      await batch.commit();

      // Create sample transactions for test users
      await this.seedTestTransactions(testUsers);

      await logger.info(
        LogCategory.SYSTEM,
        `Successfully seeded ${testUsers.length} test users`
      );

    } catch (error) {
      await logger.error(
        LogCategory.SYSTEM,
        'Failed to seed test users',
        error as Error
      );
      throw error;
    }
  }

  /**
   * Seed test transactions
   */
  private async seedTestTransactions(users: any[]): Promise<void> {
    const transactions = [];

    // Create activation transactions for each user
    for (const user of users) {
      if (user.uid === 'test-admin-001') continue; // Skip admin

      const rankConfig = mlmConfig.ranks[user.currentRank as keyof typeof mlmConfig.ranks];
      
      transactions.push({
        uid: user.uid,
        type: 'activation',
        amount: rankConfig.activationAmount,
        rank: user.currentRank,
        status: 'completed',
        description: `${user.currentRank} rank activation`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Add some income transactions
      if (user.totalEarnings > 0) {
        transactions.push({
          uid: user.uid,
          type: 'income',
          subType: 'referral',
          amount: roundToTwoDecimals(user.totalEarnings * 0.6),
          status: 'completed',
          description: 'Referral income',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        transactions.push({
          uid: user.uid,
          type: 'income',
          subType: 'level',
          amount: roundToTwoDecimals(user.totalEarnings * 0.4),
          status: 'completed',
          description: 'Level income',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      // Add withdrawal transactions
      if (user.totalWithdrawn > 0) {
        transactions.push({
          uid: user.uid,
          type: 'withdrawal',
          amount: user.totalWithdrawn,
          status: 'completed',
          description: 'USDT BEP20 withdrawal',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          completedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    // Batch write transactions
    const batch = this.db.batch();
    transactions.forEach(transaction => {
      const transactionRef = this.db.collection(collections.TRANSACTIONS).doc();
      batch.set(transactionRef, transaction);
    });

    await batch.commit();

    await logger.info(
      LogCategory.SYSTEM,
      `Successfully seeded ${transactions.length} test transactions`
    );
  }

  /**
   * Seed global cycles
   */
  async seedGlobalCycles(force: boolean = false): Promise<void> {
    try {
      await logger.info(LogCategory.SYSTEM, 'Seeding global cycles');

      // Check if global cycles already exist
      if (!force) {
        const existingCycles = await this.db.collection(collections.GLOBAL_CYCLES).limit(1).get();
        if (!existingCycles.empty) {
          await logger.info(LogCategory.SYSTEM, 'Global cycles already exist, skipping seed');
          return;
        }
      }

      const globalCycles = [
        {
          rank: 'pearl',
          participants: ['test-user-001', 'test-user-002'],
          totalAmount: 50,
          isComplete: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          completedAt: null
        },
        {
          rank: 'topaz',
          participants: ['test-admin-001'],
          totalAmount: 125,
          isComplete: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          completedAt: null
        }
      ];

      const batch = this.db.batch();

      // Clear existing cycles if force is true
      if (force) {
        const existingCycles = await this.db.collection(collections.GLOBAL_CYCLES).get();
        existingCycles.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
      }

      // Add global cycles
      globalCycles.forEach(cycle => {
        const cycleRef = this.db.collection(collections.GLOBAL_CYCLES).doc();
        batch.set(cycleRef, cycle);
      });

      await batch.commit();

      await logger.info(
        LogCategory.SYSTEM,
        `Successfully seeded ${globalCycles.length} global cycles`
      );

    } catch (error) {
      await logger.error(
        LogCategory.SYSTEM,
        'Failed to seed global cycles',
        error as Error
      );
      throw error;
    }
  }

  /**
   * Clear all collections
   */
  async clearAllData(): Promise<void> {
    try {
      await logger.warn(LogCategory.SYSTEM, 'Clearing all data - this is destructive!');

      const collectionsToClean = [
        collections.USERS,
        collections.TRANSACTIONS,
        collections.INCOMES,
        collections.RANKS,
        collections.INCOME_TRANSACTIONS,
        collections.WITHDRAWALS,
        collections.REIDS,
        collections.SETTINGS,
        collections.PAYOUT_QUEUE,
        collections.GLOBAL_CYCLES
      ];

      for (const collectionName of collectionsToClean) {
        const snapshot = await this.db.collection(collectionName).get();
        const batch = this.db.batch();

        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        if (!snapshot.empty) {
          await batch.commit();
          await logger.info(
            LogCategory.SYSTEM,
            `Cleared ${snapshot.size} documents from ${collectionName}`
          );
        }
      }

      await logger.info(LogCategory.SYSTEM, 'All data cleared successfully');

    } catch (error) {
      await logger.error(
        LogCategory.SYSTEM,
        'Failed to clear data',
        error as Error
      );
      throw error;
    }
  }

  /**
   * Get seed status
   */
  async getSeedStatus(): Promise<Record<string, any>> {
    try {
      const [
        ranksSnapshot,
        settingsSnapshot,
        usersSnapshot,
        cyclesSnapshot
      ] = await Promise.all([
        this.db.collection(collections.RANKS).get(),
        this.db.collection(collections.SETTINGS).get(),
        this.db.collection(collections.USERS).get(),
        this.db.collection(collections.GLOBAL_CYCLES).get()
      ]);

      return {
        ranks: {
          count: ranksSnapshot.size,
          seeded: ranksSnapshot.size > 0
        },
        settings: {
          count: settingsSnapshot.size,
          seeded: settingsSnapshot.size > 0
        },
        users: {
          count: usersSnapshot.size,
          seeded: usersSnapshot.size > 0
        },
        globalCycles: {
          count: cyclesSnapshot.size,
          seeded: cyclesSnapshot.size > 0
        },
        lastChecked: new Date().toISOString()
      };

    } catch (error) {
      await logger.error(
        LogCategory.SYSTEM,
        'Failed to get seed status',
        error as Error
      );
      throw error;
    }
  }
}

// Export singleton instance
export const seedService = new SeedService();
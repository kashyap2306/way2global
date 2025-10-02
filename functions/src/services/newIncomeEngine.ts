/**
 * New Global Income Engine - User-centric pool-based income system
 * Replaces the old MLM income engine with a simplified user-centric approach
 */

import * as admin from 'firebase-admin';
import { createLogger, LogCategory } from '../utils/logger';
import { collections, mlmConfig } from '../config';
import { IncomePool, User, PlatformSettings } from '../types';

const logger = createLogger('NewIncomeEngine');

export interface PoolIncomeCalculation {
  userUID: string;
  rank: string;
  amount: number;
  sourceTransactionId: string;
  metadata?: Record<string, any>;
}

export class NewIncomeEngine {
  private db: admin.firestore.Firestore;

  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Process rank activation and create income pool
   */
  async processRankActivation(
    userUID: string,
    rank: string,
    activationAmount: number,
    transactionId: string
  ): Promise<void> {
    try {
      const batch = this.db.batch();

      // Create income pool for the user's rank
      const poolRef = this.db.collection(collections.INCOME_POOLS).doc();
      const poolData: IncomePool = {
        id: poolRef.id,
        userUID,
        rank,
        poolIncome: 0,
        maxPoolIncome: this.getMaxPoolIncome(rank),
        isLocked: true,
        canClaim: false,
        directReferralsCount: 0,
        requiredDirectReferrals: await this.getDirectReferralRequirement(),
        activatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
        lastIncomeAt: null,
        claimedAt: null,
        metadata: {
          activationAmount,
          transactionId
        }
      };

      batch.set(poolRef, poolData);

      // Update user's rank activation status
      const userRef = this.db.collection(collections.USERS).doc(userUID);
      batch.update(userRef, {
        [`rankActivations.${rank}`]: {
          isActive: true,
          activatedAt: admin.firestore.FieldValue.serverTimestamp(),
          poolId: poolRef.id
        }
      });

      await batch.commit();

      // Start income accrual for this rank
      await this.startIncomeAccrual(userUID, rank, poolRef.id);

      await logger.info(
        LogCategory.MLM,
        `Rank activation processed: ${rank} for user ${userUID}`,
        userUID,
        { rank, activationAmount, poolId: poolRef.id }
      );

    } catch (error) {
      await logger.error(
        LogCategory.MLM,
        'Failed to process rank activation',
        userUID,
        { error: error.message, rank, activationAmount }
      );
      throw error;
    }
  }

  /**
   * Start income accrual for a user's rank pool
   */
  private async startIncomeAccrual(
    userUID: string,
    rank: string,
    poolId: string
  ): Promise<void> {
    try {
      // Income accrual logic - this would be triggered by global events
      // For now, we'll set up the structure for income to be added
      const incomeAmount = this.calculatePoolIncome(rank);
      
      if (incomeAmount > 0) {
        await this.addIncomeToPool(poolId, incomeAmount, 'pool_generation', userUID);
      }

    } catch (error) {
      await logger.error(
        LogCategory.MLM,
        'Failed to start income accrual',
        userUID,
        { error: error.message, rank, poolId }
      );
    }
  }

  /**
   * Add income to a user's pool
   */
  async addIncomeToPool(
    poolId: string,
    amount: number,
    source: string,
    sourceUID?: string
  ): Promise<void> {
    try {
      const poolRef = this.db.collection(collections.INCOME_POOLS).doc(poolId);
      const poolDoc = await poolRef.get();

      if (!poolDoc.exists) {
        throw new Error(`Income pool ${poolId} not found`);
      }

      const poolData = poolDoc.data() as IncomePool;
      const newPoolIncome = poolData.poolIncome + amount;

      // Check if pool income exceeds maximum
      if (newPoolIncome > poolData.maxPoolIncome) {
        const actualAmount = poolData.maxPoolIncome - poolData.poolIncome;
        if (actualAmount <= 0) {
          return; // Pool is already at maximum
        }
        amount = actualAmount;
      }

      // Update pool income
      await poolRef.update({
        poolIncome: admin.firestore.FieldValue.increment(amount),
        lastIncomeAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Create income transaction record
      await this.createPoolIncomeTransaction(
        poolData.userUID,
        amount,
        source,
        poolId,
        sourceUID
      );

      await logger.info(
        LogCategory.MLM,
        `Income added to pool: ${amount} for user ${poolData.userUID}`,
        poolData.userUID,
        { poolId, amount, source, rank: poolData.rank }
      );

    } catch (error) {
      await logger.error(
        LogCategory.MLM,
        'Failed to add income to pool',
        '',
        { error: error.message, poolId, amount, source }
      );
      throw error;
    }
  }

  /**
   * Update direct referral count for user's pools
   */
  async updateDirectReferralCount(userUID: string): Promise<void> {
    try {
      // Get user's direct referrals count
      const directReferralsCount = await this.getDirectReferralsCount(userUID);

      // Update all user's income pools
      const poolsQuery = await this.db
        .collection(collections.INCOME_POOLS)
        .where('userUID', '==', userUID)
        .get();

      const batch = this.db.batch();
      const requiredReferrals = await this.getDirectReferralRequirement();

      poolsQuery.docs.forEach(doc => {
        const poolData = doc.data() as IncomePool;
        const canClaim = directReferralsCount >= requiredReferrals && poolData.poolIncome > 0;
        
        batch.update(doc.ref, {
          directReferralsCount,
          canClaim
        });
      });

      await batch.commit();

      await logger.info(
        LogCategory.MLM,
        `Direct referral count updated: ${directReferralsCount} for user ${userUID}`,
        userUID,
        { directReferralsCount, requiredReferrals }
      );

    } catch (error) {
      await logger.error(
        LogCategory.MLM,
        'Failed to update direct referral count',
        userUID,
        { error: error.message }
      );
      throw error;
    }
  }

  /**
   * Claim income from pool to wallet
   */
  async claimPoolIncome(userUID: string, poolId: string): Promise<number> {
    try {
      const poolRef = this.db.collection(collections.INCOME_POOLS).doc(poolId);
      const poolDoc = await poolRef.get();

      if (!poolDoc.exists) {
        throw new Error(`Income pool ${poolId} not found`);
      }

      const poolData = poolDoc.data() as IncomePool;

      // Verify user owns this pool
      if (poolData.userUID !== userUID) {
        throw new Error('Unauthorized: User does not own this pool');
      }

      // Check if user can claim
      if (!poolData.canClaim || poolData.poolIncome <= 0) {
        throw new Error('Cannot claim income: Requirements not met or no income available');
      }

      const claimAmount = poolData.poolIncome;

      // Use transaction to ensure atomicity
      await this.db.runTransaction(async (transaction) => {
        // Reset pool income
        transaction.update(poolRef, {
          poolIncome: 0,
          claimedAt: admin.firestore.FieldValue.serverTimestamp(),
          canClaim: false
        });

        // Add to user's available balance
        const userRef = this.db.collection(collections.USERS).doc(userUID);
        transaction.update(userRef, {
          availableBalance: admin.firestore.FieldValue.increment(claimAmount)
        });

        // Create claim transaction
        const transactionRef = this.db.collection(collections.TRANSACTIONS).doc();
        transaction.set(transactionRef, {
          uid: userUID,
          type: 'income_claim',
          amount: claimAmount,
          status: 'completed',
          description: `Income claimed from ${poolData.rank} pool`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          metadata: {
            poolId,
            rank: poolData.rank
          }
        });
      });

      await logger.info(
        LogCategory.MLM,
        `Income claimed: ${claimAmount} from pool ${poolId}`,
        userUID,
        { poolId, claimAmount, rank: poolData.rank }
      );

      return claimAmount;

    } catch (error) {
      await logger.error(
        LogCategory.MLM,
        'Failed to claim pool income',
        userUID,
        { error: error.message, poolId }
      );
      throw error;
    }
  }

  /**
   * Get user's income pools
   */
  async getUserIncomePools(userUID: string): Promise<IncomePool[]> {
    try {
      const poolsQuery = await this.db
        .collection(collections.INCOME_POOLS)
        .where('userUID', '==', userUID)
        .orderBy('activatedAt', 'desc')
        .get();

      return poolsQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as IncomePool));

    } catch (error) {
      await logger.error(
        LogCategory.MLM,
        'Failed to get user income pools',
        userUID,
        { error: error.message }
      );
      throw error;
    }
  }

  /**
   * Process referral income when someone joins under a user
   */
  async processReferralIncome(
    sponsorUID: string,
    newUserUID: string,
    activationAmount: number,
    transactionId: string
  ): Promise<void> {
    try {
      const referralIncome = activationAmount * (mlmConfig.incomes.referral.percentage / 100);

      // Add to sponsor's available balance directly (no pool needed for referral income)
      const userRef = this.db.collection(collections.USERS).doc(sponsorUID);
      await userRef.update({
        availableBalance: admin.firestore.FieldValue.increment(referralIncome)
      });

      // Create referral income transaction
      const transactionRef = this.db.collection(collections.TRANSACTIONS).doc();
      await transactionRef.set({
        uid: sponsorUID,
        type: 'referral_income',
        amount: referralIncome,
        status: 'completed',
        description: `Referral income from ${newUserUID}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          referredUserUID: newUserUID,
          activationAmount,
          percentage: mlmConfig.incomes.referral.percentage
        }
      });

      // Update direct referral count
      await this.updateDirectReferralCount(sponsorUID);

      await logger.info(
        LogCategory.MLM,
        `Referral income processed: ${referralIncome} for sponsor ${sponsorUID}`,
        sponsorUID,
        { newUserUID, referralIncome, activationAmount }
      );

    } catch (error) {
      await logger.error(
        LogCategory.MLM,
        'Failed to process referral income',
        sponsorUID,
        { error: error.message, newUserUID, activationAmount }
      );
      throw error;
    }
  }

  /**
   * Distribute level income up the sponsor chain
   */
  async distributeLevelIncome(
    userUID: string,
    activationAmount: number,
    transaction: admin.firestore.Transaction
  ): Promise<void> {
    let currentSponsorUID = userUID;
    for (let level = 1; level <= 6; level++) {
      const userDoc = await transaction.get(this.db.collection(collections.USERS).doc(currentSponsorUID));
      const userData = userDoc.data() as User;

      if (!userData || !userData.sponsorUID) {
        break; // No more sponsors up the chain
      }

      const sponsorUID = userData.sponsorUID;
      const levelPercentage = mlmConfig.incomes.level.percentages[level - 1];

      if (levelPercentage === undefined || levelPercentage <= 0) {
        logger.warn(
          LogCategory.MLM,
          `Level income percentage not defined or zero for level ${level}`,
          sponsorUID,
          { level, userUID, activationAmount }
        );
        currentSponsorUID = sponsorUID;
        continue;
      }

      const levelIncome = activationAmount * (levelPercentage / 100);

      const sponsorDocRef = this.db.collection(collections.USERS).doc(sponsorUID);
      transaction.update(sponsorDocRef, {
        availableBalance: admin.firestore.FieldValue.increment(levelIncome)
      });

      const incomeTxRef = this.db.collection(collections.INCOME_TRANSACTIONS).doc();
      transaction.set(incomeTxRef, {
        userId: sponsorUID,
        type: 'level_income',
        amount: levelIncome,
        status: 'completed',
        description: `Level ${level} income from ${userUID}'s rank activation`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          sourceUserUID: userUID,
          activationAmount,
          level,
          percentage: levelPercentage
        }
      });

      await logger.info(
        LogCategory.MLM,
        `Level ${level} income processed: ${levelIncome} for sponsor ${sponsorUID}`,
        sponsorUID,
        { sourceUserUID: userUID, level, levelIncome, activationAmount }
      );

      currentSponsorUID = sponsorUID;
    }
  }

  // Helper methods
  private getMaxPoolIncome(rank: string): number {
    const rankConfig = mlmConfig.ranks[rank as keyof typeof mlmConfig.ranks];
    if (!rankConfig) return 0;
    
    // Calculate max pool income based on rank (example: 100x activation amount)
    return rankConfig.activationAmount * 100;
  }

  private calculatePoolIncome(rank: string): number {
    const rankConfig = mlmConfig.ranks[rank as keyof typeof mlmConfig.ranks];
    if (!rankConfig) return 0;
    
    // Example: 1% of activation amount per income cycle
    return rankConfig.activationAmount * 0.01;
  }

  private async getDirectReferralsCount(userUID: string): Promise<number> {
    try {
      const referralsQuery = await this.db
        .collection(collections.USERS)
        .where('sponsorUID', '==', userUID)
        .where('status', '==', 'active')
        .get();

      return referralsQuery.size;
    } catch (error) {
      return 0;
    }
  }

  private async getDirectReferralRequirement(): Promise<number> {
    try {
      const settingsDoc = await this.db
        .collection(collections.SETTINGS)
        .doc('platform')
        .get();

      if (settingsDoc.exists) {
        const settings = settingsDoc.data() as PlatformSettings;
        return settings.directReferralRequirement || 2;
      }

      return 2; // Default requirement
    } catch (error) {
      return 2; // Default requirement
    }
  }

  private async createPoolIncomeTransaction(
    userUID: string,
    amount: number,
    source: string,
    poolId: string,
    sourceUID?: string
  ): Promise<void> {
    const transactionRef = this.db.collection(collections.INCOME_TRANSACTIONS).doc();
    await transactionRef.set({
      uid: userUID,
      type: 'pool_income',
      amount,
      source,
      poolId,
      sourceUID,
      status: 'completed',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        poolId,
        source
      }
    });
  }
}

export const newIncomeEngine = new NewIncomeEngine();
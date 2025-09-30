/**
 * Income Pool Service - Manages user-centric income pools for each rank
 */

import * as admin from 'firebase-admin';
import { collections } from '../config';
import { IncomePool, PlatformSettings } from '../types';
import { logger, LogCategory } from '../utils/logger';

export class IncomePoolService {
  private db: admin.firestore.Firestore;

  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Create income pool for user when they activate a rank
   */
  async createIncomePool(
    userId: string,
    rank: string,
    directReferralsCount: number = 0
  ): Promise<string> {
    try {
      // Get platform settings for direct referral requirement
      const settings = await this.getPlatformSettings();
      const requiredDirectReferrals = settings?.directReferralRequirement || 2;

      const poolData: Omit<IncomePool, 'id'> = {
        rank,
        userId,
        poolIncome: 0,
        isLocked: true,
        canClaim: directReferralsCount >= requiredDirectReferrals,
        directReferralsCount,
        requiredDirectReferrals,
        createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
        updatedAt: admin.firestore.FieldValue.serverTimestamp() as any
      };

      const poolRef = await this.db.collection(collections.INCOME_POOLS).add(poolData);

      await logger.info(
        LogCategory.INCOME,
        'Income pool created successfully',
        userId,
        { rank, poolId: poolRef.id, requiredDirectReferrals }
      );

      return poolRef.id;
    } catch (error) {
      await logger.error(
        LogCategory.INCOME,
        'Failed to create income pool',
        error as Error,
        userId,
        { rank }
      );
      throw error;
    }
  }

  /**
   * Add income to user's pool for specific rank
   */
  async addIncomeToPool(
    userId: string,
    rank: string,
    amount: number
  ): Promise<void> {
    try {
      // Find user's income pool for this rank
      const poolQuery = await this.db
        .collection(collections.INCOME_POOLS)
        .where('userId', '==', userId)
        .where('rank', '==', rank)
        .limit(1)
        .get();

      if (poolQuery.empty) {
        // Create new pool if doesn't exist
        await this.createIncomePool(userId, rank);
        return this.addIncomeToPool(userId, rank, amount);
      }

      const poolDoc = poolQuery.docs[0];
      const currentIncome = poolDoc.data().poolIncome || 0;

      await poolDoc.ref.update({
        poolIncome: currentIncome + amount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      await logger.info(
        LogCategory.INCOME,
        'Income added to pool',
        userId,
        { rank, amount, newTotal: currentIncome + amount }
      );

    } catch (error) {
      await logger.error(
        LogCategory.INCOME,
        'Failed to add income to pool',
        error as Error,
        userId,
        { rank, amount }
      );
      throw error;
    }
  }

  /**
   * Update direct referrals count and check if user can claim
   */
  async updateDirectReferrals(
    userId: string,
    newCount: number
  ): Promise<void> {
    try {
      const settings = await this.getPlatformSettings();
      const requiredDirectReferrals = settings?.directReferralRequirement || 2;

      // Update all user's income pools
      const poolsQuery = await this.db
        .collection(collections.INCOME_POOLS)
        .where('userId', '==', userId)
        .get();

      const batch = this.db.batch();

      poolsQuery.docs.forEach(doc => {
        const canClaim = newCount >= requiredDirectReferrals;
        batch.update(doc.ref, {
          directReferralsCount: newCount,
          canClaim,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();

      await logger.info(
        LogCategory.INCOME,
        'Direct referrals count updated',
        userId,
        { newCount, requiredDirectReferrals, canClaim: newCount >= requiredDirectReferrals }
      );

    } catch (error) {
      await logger.error(
        LogCategory.INCOME,
        'Failed to update direct referrals',
        error as Error,
        userId,
        { newCount }
      );
      throw error;
    }
  }

  /**
   * Claim income from pool (move from locked to available balance)
   */
  async claimPoolIncome(
    userId: string,
    rank: string
  ): Promise<number> {
    try {
      // Find user's income pool for this rank
      const poolQuery = await this.db
        .collection(collections.INCOME_POOLS)
        .where('userId', '==', userId)
        .where('rank', '==', rank)
        .where('canClaim', '==', true)
        .where('isLocked', '==', true)
        .limit(1)
        .get();

      if (poolQuery.empty) {
        throw new Error('No claimable income pool found for this rank');
      }

      const poolDoc = poolQuery.docs[0];
      const poolData = poolDoc.data() as IncomePool;
      const claimAmount = poolData.poolIncome;

      if (claimAmount <= 0) {
        throw new Error('No income available to claim');
      }

      // Start transaction to update pool and user balance
      const result = await this.db.runTransaction(async (transaction) => {
        // Update pool status
        transaction.update(poolDoc.ref, {
          isLocked: false,
          claimedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update user's available balance
        const userRef = this.db.collection(collections.USERS).doc(userId);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        const currentAvailable = userData?.availableBalance || 0;
        const currentLocked = userData?.lockedBalance || 0;

        transaction.update(userRef, {
          availableBalance: currentAvailable + claimAmount,
          lockedBalance: Math.max(0, currentLocked - claimAmount),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return claimAmount;
      });

      await logger.info(
        LogCategory.INCOME,
        'Pool income claimed successfully',
        userId,
        { rank, claimAmount }
      );

      return result;

    } catch (error) {
      await logger.error(
        LogCategory.INCOME,
        'Failed to claim pool income',
        error as Error,
        userId,
        { rank }
      );
      throw error;
    }
  }

  /**
   * Get user's income pools
   */
  async getUserIncomePools(userId: string): Promise<IncomePool[]> {
    try {
      const poolsQuery = await this.db
        .collection(collections.INCOME_POOLS)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      return poolsQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as IncomePool));

    } catch (error) {
      await logger.error(
        LogCategory.INCOME,
        'Failed to get user income pools',
        error as Error,
        userId
      );
      throw error;
    }
  }

  /**
   * Get platform settings
   */
  async getPlatformSettings(): Promise<PlatformSettings | null> {
    try {
      const settingsQuery = await this.db
        .collection(collections.SETTINGS)
        .limit(1)
        .get();

      if (settingsQuery.empty) {
        return null;
      }

      const doc = settingsQuery.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as PlatformSettings;

    } catch (error) {
      await logger.error(
        LogCategory.SYSTEM,
        'Failed to get platform settings',
        error as Error
      );
      return null;
    }
  }

  /**
   * Update platform settings
   */
  async updatePlatformSettings(
    settings: Partial<Omit<PlatformSettings, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    try {
      const settingsQuery = await this.db
        .collection(collections.SETTINGS)
        .limit(1)
        .get();

      if (settingsQuery.empty) {
        // Create new settings document
        await this.db.collection(collections.SETTINGS).add({
          ...settings,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Update existing settings
        const doc = settingsQuery.docs[0];
        await doc.ref.update({
          ...settings,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      await logger.info(
        LogCategory.SYSTEM,
        'Platform settings updated',
        undefined,
        settings
      );

    } catch (error) {
      await logger.error(
        LogCategory.SYSTEM,
        'Failed to update platform settings',
        error as Error,
        undefined,
        settings
      );
      throw error;
    }
  }
}

export const incomePoolService = new IncomePoolService();
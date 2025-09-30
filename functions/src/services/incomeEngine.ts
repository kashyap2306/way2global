/**
 * MLM Income Engine - Core service for calculating and distributing incomes
 */

import * as admin from 'firebase-admin';
import { 
  calculateReferralIncome,
  calculateLevelIncome,
  calculateGlobalIncome,
  roundToTwoDecimals,
  safeAdd
} from '../utils/math';
import { createLogger, LogCategory } from '../utils/logger';
import { collections, mlmConfig } from '../config';

const logger = createLogger('IncomeEngine');

export interface IncomeCalculation {
  type: 'referral' | 'level' | 'global';
  amount: number;
  recipientUID: string;
  sourceUID: string;
  sourceTransactionId: string;
  level?: number;
  rank: string;
  metadata?: Record<string, any>;
}

export interface GlobalCycleData {
  cycleId: string;
  rank: string;
  position: number;
  level: number;
  participants: string[];
  totalAmount: number;
  isComplete: boolean;
}

export class IncomeEngine {
  private db: admin.firestore.Firestore;

  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Process referral income when a user activates
   */
  async processReferralIncome(
    activatorUID: string,
    sponsorUID: string,
    activationAmount: number,
    transactionId: string,
    rank: string
  ): Promise<void> {
    try {
      const incomeAmount = calculateReferralIncome(activationAmount);
      
      if (incomeAmount <= 0) {
        await logger.warn(
          LogCategory.MLM,
          'Referral income calculation resulted in zero amount',
          sponsorUID,
          { activatorUID, activationAmount, rank }
        );
        return;
      }

      // Create income record
      const incomeData = {
        uid: sponsorUID,
        type: 'referral',
        amount: incomeAmount,
        sourceUID: activatorUID,
        sourceTransactionId: transactionId,
        rank,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        processedAt: null,
        metadata: {
          activationAmount,
          referralPercentage: mlmConfig.incomes.referral.percentage
        }
      };

      const incomeRef = await this.db.collection(collections.INCOMES).add(incomeData);

      // Update user's available balance
      await this.updateUserBalance(sponsorUID, incomeAmount, 'add');

      // Create income transaction
      await this.createIncomeTransaction(
        sponsorUID,
        incomeAmount,
        'referral',
        incomeRef.id,
        `Referral income from ${activatorUID}`
      );

      await logger.info(
        LogCategory.MLM,
        'Referral income processed successfully',
        sponsorUID,
        { 
          activatorUID, 
          incomeAmount, 
          activationAmount, 
          rank,
          incomeId: incomeRef.id 
        }
      );

    } catch (error) {
      await logger.error(
        LogCategory.MLM,
        'Failed to process referral income',
        error instanceof Error ? error : new Error(String(error)),
        sponsorUID,
        { activatorUID, activationAmount, transactionId, rank }
      );
      throw error;
    }
  }

  /**
   * Process level income distribution
   */
  async processLevelIncome(
    activatorUID: string,
    activationAmount: number,
    transactionId: string,
    rank: string
  ): Promise<void> {
    try {
      // Get upline chain (6 levels)
      const uplineChain = await this.getUplineChain(activatorUID, 6);

      for (let i = 0; i < uplineChain.length; i++) {
        const level = i + 1;
        const uplineUID = uplineChain[i];
        const incomeAmount = calculateLevelIncome(level, activationAmount);

        if (incomeAmount <= 0) continue;

        // Check if upline user is eligible for level income
        const isEligible = await this.checkLevelIncomeEligibility(uplineUID, rank);
        if (!isEligible) continue;

        // Create income record
        const incomeData = {
          uid: uplineUID,
          type: 'level',
          amount: incomeAmount,
          sourceUID: activatorUID,
          sourceTransactionId: transactionId,
          level,
          rank,
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          processedAt: null,
          metadata: {
            activationAmount,
            levelPercentage: this.getLevelPercentage(level)
          }
        };

        const incomeRef = await this.db.collection(collections.INCOMES).add(incomeData);

        // Update user's available balance
        await this.updateUserBalance(uplineUID, incomeAmount, 'add');

        // Create income transaction
        await this.createIncomeTransaction(
          uplineUID,
          incomeAmount,
          'level',
          incomeRef.id,
          `Level ${level} income from ${activatorUID}`
        );

        await logger.info(
          LogCategory.MLM,
          `Level ${level} income processed`,
          uplineUID,
          { 
            activatorUID, 
            incomeAmount, 
            level, 
            rank,
            incomeId: incomeRef.id 
          }
        );
      }

    } catch (error) {
      await logger.error(
        LogCategory.MLM,
        'Failed to process level income',
        error instanceof Error ? error : new Error(String(error)),
        activatorUID,
        { activationAmount, transactionId, rank }
      );
      throw error;
    }
  }

  /**
   * Process global income cycles - NEW LOGIC: Direct pool generation only
   */
  async processGlobalIncome(
    activatorUID: string,
    activationAmount: number,
    transactionId: string,
    rank: string
  ): Promise<void> {
    try {
      // Calculate income amount for the specific rank pool
      // Remove unused variable
      // const rankConfig = mlmConfig.ranks[rank as keyof typeof mlmConfig.ranks];
      const poolIncomeAmount = roundToTwoDecimals(
        (activationAmount * mlmConfig.incomes.global.percentage) / 100
      );

      // Create income record directly for the activator's rank pool
      const incomeData = {
        uid: activatorUID,
        type: 'global',
        amount: poolIncomeAmount,
        sourceUID: activatorUID,
        sourceTransactionId: transactionId,
        rank,
        status: 'locked', // Locked until 2 direct referrals
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        processedAt: null,
        metadata: {
          poolType: 'direct_generation',
          activationAmount,
          requiresDirectReferrals: 2,
          canClaim: false
        }
      };

      const incomeRef = await this.db.collection(collections.INCOMES).add(incomeData);

      // Update user's locked balance instead of available balance
      await this.updateUserLockedBalance(activatorUID, poolIncomeAmount, 'add');

      // Create income transaction for tracking
      await this.createIncomeTransaction(
        activatorUID,
        poolIncomeAmount,
        'global',
        incomeRef.id,
        `Global pool income generated for ${rank} rank (Locked)`
      );

      await logger.info(
        LogCategory.MLM,
        'Global pool income generated directly',
        activatorUID,
        { 
          rank, 
          amount: poolIncomeAmount,
          status: 'locked',
          transactionId
        }
      );

    } catch (error) {
      await logger.error(
        LogCategory.MLM,
        'Failed to process global income',
        error as Error,
        activatorUID,
        { activationAmount, transactionId, rank }
      );
      throw error;
    }
  }



  /**
   * Get upline chain for level income calculation
   */
  private async getUplineChain(userUID: string, levels: number): Promise<string[]> {
    const uplineChain: string[] = [];
    let currentUID = userUID;

    for (let i = 0; i < levels; i++) {
      const userDoc = await this.db.collection(collections.USERS).doc(currentUID).get();
      
      if (!userDoc.exists) break;
      
      const userData = userDoc.data();
      const sponsorUID = userData?.sponsorUID;
      
      if (!sponsorUID) break;
      
      uplineChain.push(sponsorUID);
      currentUID = sponsorUID;
    }

    return uplineChain;
  }

  /**
   * Check if user is eligible for level income
   */
  private async checkLevelIncomeEligibility(userUID: string, rank: string): Promise<boolean> {
    const userDoc = await this.db.collection(collections.USERS).doc(userUID).get();
    
    if (!userDoc.exists) return false;
    
    const userData = userDoc.data();
    return userData?.isActive === true && userData?.currentRank;
  }

  /**
   * Check if user is eligible for global income
   */
  // Removed unused method - global income eligibility is now handled differently
  // private async checkGlobalIncomeEligibility(userUID: string, rank: string): Promise<boolean> {
  //   const rankConfig = mlmConfig.ranks[rank as keyof typeof mlmConfig.ranks];
  //   return rankConfig?.benefits?.globalIncome === true;
  // }

  /**
   * Add user to global cycle
   */
  // Removed unused method - global cycle management is now handled differently
  // private async addToGlobalCycle(userUID: string, rank: string): Promise<GlobalCycleData> {
  //   // Find or create active cycle for this rank
  //   const activeCycleQuery = await this.db
  //     .collection(collections.GLOBAL_CYCLES)
  //     .where('rank', '==', rank)
  //     .where('isComplete', '==', false)
  //     .orderBy('createdAt', 'asc')
  //     .limit(1)
  //     .get();

  //   let cycleDoc;
  //   let cycleData;

  //   if (activeCycleQuery.empty) {
  //     // Create new cycle
  //     const newCycleData = {
  //       rank,
  //       participants: [userUID],
  //       totalAmount: 0,
  //       isComplete: false,
  //       createdAt: admin.firestore.FieldValue.serverTimestamp(),
  //       completedAt: null
  //     };

  //     cycleDoc = await this.db.collection(collections.GLOBAL_CYCLES).add(newCycleData);
  //     cycleData = { ...newCycleData, id: cycleDoc.id };
  //   } else {
  //     // Add to existing cycle
  //     cycleDoc = activeCycleQuery.docs[0];
  //     cycleData = { ...cycleDoc.data(), id: cycleDoc.id };
      
  //     // Add user to participants
  //     await (cycleDoc as any).ref.update({
  //       participants: admin.firestore.FieldValue.arrayUnion(userUID)
  //     });
      
  //     (cycleData as any).participants.push(userUID);
  //   }

  //   const position = (cycleData as any).participants.length;
  //   const cycleSize = mlmConfig.incomes.global.cycleSize;
  //   const isComplete = position >= cycleSize;

  //   if (isComplete) {
  //     await (cycleDoc as any).ref.update({
  //       isComplete: true,
  //       completedAt: admin.firestore.FieldValue.serverTimestamp()
  //     });
  //   }

  //   return {
  //     cycleId: cycleData.id,
  //     rank,
  //     position,
  //     level: Math.ceil(position / Math.pow(2, Math.floor(Math.log2(position)))),
  //     participants: (cycleData as any).participants,
  //     totalAmount: (cycleData as any).totalAmount,
  //     isComplete
  //   };
  // }

  /**
   * Process global cycle payout
   */
  // Removed unused method - global cycle payout is now handled differently
  // private async processGlobalCyclePayout(cycleData: GlobalCycleData): Promise<void> {
  //   const rankConfig = mlmConfig.ranks[cycleData.rank as keyof typeof mlmConfig.ranks];
  //   const payoutAmount = roundToTwoDecimals(
  //     (rankConfig.activationAmount * mlmConfig.incomes.global.percentage) / 100
  //   );

  //   // Distribute payout across 10 levels
  //   const totalLevels = mlmConfig.incomes.global.levels;

  //   for (let level = 1; level <= totalLevels; level++) {
  //     const levelParticipants = this.getParticipantsAtLevel(cycleData.participants, level);
      
  //     for (const participantUID of levelParticipants) {
  //       const incomeAmount = calculateGlobalIncome(payoutAmount, level, totalLevels);
        
  //       if (incomeAmount <= 0) continue;

  //       // Create income record
  //       const incomeData = {
  //         uid: participantUID,
  //         type: 'global',
  //         amount: incomeAmount,
  //         sourceUID: cycleData.cycleId,
  //         sourceTransactionId: cycleData.cycleId,
  //         level,
  //         rank: cycleData.rank,
  //         status: 'pending',
  //         createdAt: admin.firestore.FieldValue.serverTimestamp(),
  //         processedAt: null,
  //         metadata: {
  //           cycleId: cycleData.cycleId,
  //           globalLevel: level,
  //           totalParticipants: cycleData.participants.length
  //         }
  //       };

  //       const incomeRef = await this.db.collection(collections.INCOMES).add(incomeData);

  //       // Update user's available balance
  //       await this.updateUserBalance(participantUID, incomeAmount, 'add');

  //       // Create income transaction
  //       await this.createIncomeTransaction(
  //         participantUID,
  //         incomeAmount,
  //         'global',
  //         incomeRef.id,
  //         `Global cycle payout - Level ${level}`
  //       );
  //     }
  //   }

  //   await logger.info(
  //     LogCategory.MLM,
  //     'Global cycle payout processed',
  //     undefined,
  //     { 
  //       cycleId: cycleData.cycleId,
  //       rank: cycleData.rank,
  //       participants: cycleData.participants.length,
  //       payoutAmount
  //     }
  //   );
  // }

  /**
   * Get participants at specific level in binary tree
   */
  private getParticipantsAtLevel(participants: string[], level: number): string[] {
    const startIndex = Math.pow(2, level - 1) - 1;
    const endIndex = Math.pow(2, level) - 2;
    
    return participants.slice(startIndex, endIndex + 1);
  }



  /**
   * Process all incomes for user activation - UPDATED for new workflow
   */
  async processAllIncomes(
    activatorUID: string,
    activationAmount: number,
    transactionId: string,
    rank: string
  ): Promise<void> {
    try {
      // Get user data to find sponsor
      const userDoc = await this.db.collection(collections.USERS).doc(activatorUID).get();
      
      if (!userDoc.exists) {
        throw new Error(`User ${activatorUID} not found`);
      }

      const userData = userDoc.data();
      const sponsorUID = userData?.sponsorUID;

      // Process referral income for sponsor (if exists)
      if (sponsorUID) {
        await this.processReferralIncome(
          activatorUID,
          sponsorUID,
          activationAmount,
          transactionId,
          rank
        );
      }

      // Process level income for upline (if exists)
      if (sponsorUID) {
        await this.processLevelIncome(
          activatorUID,
          activationAmount,
          transactionId,
          rank
        );
      }

      // Process global income - NEW: Direct pool generation only
      await this.processGlobalIncome(
        activatorUID,
        activationAmount,
        transactionId,
        rank
      );

      await logger.info(
        LogCategory.MLM,
        'All incomes processed successfully',
        activatorUID,
        { activationAmount, transactionId, rank }
      );

    } catch (error) {
      await logger.error(
        LogCategory.MLM,
        'Failed to process all incomes',
        error as Error,
        activatorUID,
        { activationAmount, transactionId, rank }
      );
      throw error;
    }
  }

  /**
   * Update user balance
   */
  private async updateUserBalance(
    userUID: string,
    amount: number,
    operation: 'add' | 'subtract'
  ): Promise<void> {
    const userRef = this.db.collection(collections.USERS).doc(userUID);
    
    await this.db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        throw new Error(`User ${userUID} not found`);
      }

      const userData = userDoc.data();
      const currentBalance = userData?.availableBalance || 0;
      const totalEarnings = userData?.totalEarnings || 0;

      let newBalance: number;
      let newTotalEarnings: number;

      if (operation === 'add') {
        newBalance = safeAdd(currentBalance, amount);
        newTotalEarnings = safeAdd(totalEarnings, amount);
      } else {
        newBalance = Math.max(0, currentBalance - amount);
        newTotalEarnings = totalEarnings; // Don't change total earnings on subtract
      }

      transaction.update(userRef, {
        availableBalance: newBalance,
        totalEarnings: newTotalEarnings,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
  }

  /**
   * Update user's locked balance
   */
  private async updateUserLockedBalance(
    userUID: string,
    amount: number,
    operation: 'add' | 'subtract'
  ): Promise<void> {
    const userRef = this.db.collection(collections.USERS).doc(userUID);
    
    await this.db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        throw new Error(`User ${userUID} not found`);
      }

      const userData = userDoc.data();
      const currentLockedBalance = userData?.lockedBalance || 0;
      
      let newLockedBalance: number;
      if (operation === 'add') {
        newLockedBalance = safeAdd(currentLockedBalance, amount);
      } else {
        newLockedBalance = Math.max(0, currentLockedBalance - amount);
      }

      transaction.update(userRef, {
        lockedBalance: roundToTwoDecimals(newLockedBalance),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await logger.info(
      LogCategory.MLM,
      `User locked balance ${operation}ed`,
      userUID,
      { amount, operation }
    );
  }

  /**
   * Create income transaction record
   */
  private async createIncomeTransaction(
    userUID: string,
    amount: number,
    type: string,
    incomeId: string,
    description: string
  ): Promise<void> {
    const transactionData = {
      uid: userUID,
      type: 'income',
      subType: type,
      amount,
      status: 'completed',
      description,
      incomeId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await this.db.collection(collections.INCOME_TRANSACTIONS).add(transactionData);
  }

  /**
   * Get level percentage for level income calculation
   */
  private getLevelPercentage(level: number): number {
    const levelPercentages = mlmConfig.incomes.level;
    
    switch (level) {
      case 1: return levelPercentages.L1;
      case 2: return levelPercentages.L2;
      case 3: return levelPercentages.L3;
      case 4: return levelPercentages.L4;
      case 5: return levelPercentages.L5;
      case 6: return levelPercentages.L6;
      default: return 0;
    }
  }
}

// Export singleton instance
export const incomeEngine = new IncomeEngine();
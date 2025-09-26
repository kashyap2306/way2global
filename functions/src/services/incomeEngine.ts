/**
 * MLM Income Engine - Core service for calculating and distributing incomes
 */

import * as admin from 'firebase-admin';
import { 
  calculateReferralIncome,
  calculateLevelIncome,
  calculateGlobalIncome,
  calculateReTopupIncome,
  roundToTwoDecimals,
  safeAdd
} from '../utils/math';
import { createLogger, LogCategory } from '../utils/logger';
import { collections, mlmConfig } from '../config';

const logger = createLogger('IncomeEngine');

export interface IncomeCalculation {
  type: 'referral' | 'level' | 'global' | 'retopup';
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
        error as Error,
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
        error as Error,
        activatorUID,
        { activationAmount, transactionId, rank }
      );
      throw error;
    }
  }

  /**
   * Process global income cycles
   */
  async processGlobalIncome(
    activatorUID: string,
    activationAmount: number,
    transactionId: string,
    rank: string
  ): Promise<void> {
    try {
      // Check if user is eligible for global income
      const isEligible = await this.checkGlobalIncomeEligibility(activatorUID, rank);
      if (!isEligible) {
        await logger.info(
          LogCategory.MLM,
          'User not eligible for global income',
          activatorUID,
          { rank }
        );
        return;
      }

      // Add user to global cycle
      const cycleData = await this.addToGlobalCycle(activatorUID, rank);
      
      if (cycleData.isComplete) {
        // Process global cycle payout
        await this.processGlobalCyclePayout(cycleData);
      }

      await logger.info(
        LogCategory.MLM,
        'User added to global cycle',
        activatorUID,
        { 
          rank, 
          cycleId: cycleData.cycleId,
          position: cycleData.position,
          isComplete: cycleData.isComplete 
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
   * Process re-topup income
   */
  async processReTopupIncome(
    activatorUID: string,
    sponsorUID: string,
    activationAmount: number,
    transactionId: string,
    rank: string
  ): Promise<void> {
    try {
      const incomeAmount = calculateReTopupIncome(activationAmount);
      
      if (incomeAmount <= 0) {
        await logger.warn(
          LogCategory.MLM,
          'Re-topup income calculation resulted in zero amount',
          sponsorUID,
          { activatorUID, activationAmount, rank }
        );
        return;
      }

      // Create income record
      const incomeData = {
        uid: sponsorUID,
        type: 'retopup',
        amount: incomeAmount,
        sourceUID: activatorUID,
        sourceTransactionId: transactionId,
        rank,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        processedAt: null,
        metadata: {
          activationAmount,
          retopupPercentage: mlmConfig.incomes.referral.percentage
        }
      };

      const incomeRef = await this.db.collection(collections.INCOMES).add(incomeData);

      // Update user's available balance
      await this.updateUserBalance(sponsorUID, incomeAmount, 'add');

      // Create income transaction
      await this.createIncomeTransaction(
        sponsorUID,
        incomeAmount,
        'retopup',
        incomeRef.id,
        `Re-topup income from ${activatorUID}`
      );

      await logger.info(
        LogCategory.MLM,
        'Re-topup income processed successfully',
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
        'Failed to process re-topup income',
        error as Error,
        sponsorUID,
        { activatorUID, activationAmount, transactionId, rank }
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
  private async checkGlobalIncomeEligibility(userUID: string, rank: string): Promise<boolean> {
    const rankConfig = mlmConfig.ranks[rank as keyof typeof mlmConfig.ranks];
    return rankConfig?.benefits?.globalIncome === true;
  }

  /**
   * Add user to global cycle
   */
  private async addToGlobalCycle(userUID: string, rank: string): Promise<GlobalCycleData> {
    // Find or create active cycle for this rank
    const activeCycleQuery = await this.db
      .collection(collections.GLOBAL_CYCLES)
      .where('rank', '==', rank)
      .where('isComplete', '==', false)
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get();

    let cycleDoc;
    let cycleData;

    if (activeCycleQuery.empty) {
      // Create new cycle
      const newCycleData = {
        rank,
        participants: [userUID],
        totalAmount: 0,
        isComplete: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        completedAt: null
      };

      cycleDoc = await this.db.collection(collections.GLOBAL_CYCLES).add(newCycleData);
      cycleData = { ...newCycleData, id: cycleDoc.id };
    } else {
      // Add to existing cycle
      cycleDoc = activeCycleQuery.docs[0];
      cycleData = { ...cycleDoc.data(), id: cycleDoc.id };
      
      // Add user to participants
      await (cycleDoc as any).ref.update({
        participants: admin.firestore.FieldValue.arrayUnion(userUID)
      });
      
      (cycleData as any).participants.push(userUID);
    }

    const position = (cycleData as any).participants.length;
    const cycleSize = mlmConfig.incomes.global.cycleSize;
    const isComplete = position >= cycleSize;

    if (isComplete) {
      await (cycleDoc as any).ref.update({
        isComplete: true,
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    return {
      cycleId: cycleData.id,
      rank,
      position,
      level: Math.ceil(position / Math.pow(2, Math.floor(Math.log2(position)))),
      participants: (cycleData as any).participants,
      totalAmount: (cycleData as any).totalAmount,
      isComplete
    };
  }

  /**
   * Process global cycle payout
   */
  private async processGlobalCyclePayout(cycleData: GlobalCycleData): Promise<void> {
    const rankConfig = mlmConfig.ranks[cycleData.rank as keyof typeof mlmConfig.ranks];
    const payoutAmount = roundToTwoDecimals(
      (rankConfig.activationAmount * mlmConfig.incomes.global.percentage) / 100
    );

    // Distribute payout across 10 levels
    const totalLevels = mlmConfig.incomes.global.levels;

    for (let level = 1; level <= totalLevels; level++) {
      const levelParticipants = this.getParticipantsAtLevel(cycleData.participants, level);
      
      for (const participantUID of levelParticipants) {
        const incomeAmount = calculateGlobalIncome(payoutAmount, level, totalLevels);
        
        if (incomeAmount <= 0) continue;

        // Create income record
        const incomeData = {
          uid: participantUID,
          type: 'global',
          amount: incomeAmount,
          sourceUID: cycleData.cycleId,
          sourceTransactionId: cycleData.cycleId,
          level,
          rank: cycleData.rank,
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          processedAt: null,
          metadata: {
            cycleId: cycleData.cycleId,
            globalLevel: level,
            totalParticipants: cycleData.participants.length
          }
        };

        const incomeRef = await this.db.collection(collections.INCOMES).add(incomeData);

        // Update user's available balance
        await this.updateUserBalance(participantUID, incomeAmount, 'add');

        // Create income transaction
        await this.createIncomeTransaction(
          participantUID,
          incomeAmount,
          'global',
          incomeRef.id,
          `Global cycle payout - Level ${level}`
        );
      }
    }

    // Check for auto top-up and RE-ID generation
    await this.processAutoTopUpAndREID(cycleData);

    await logger.info(
      LogCategory.MLM,
      'Global cycle payout processed',
      undefined,
      { 
        cycleId: cycleData.cycleId,
        rank: cycleData.rank,
        participants: cycleData.participants.length,
        payoutAmount
      }
    );
  }

  /**
   * Get participants at specific level in binary tree
   */
  private getParticipantsAtLevel(participants: string[], level: number): string[] {
    const startIndex = Math.pow(2, level - 1) - 1;
    const endIndex = Math.pow(2, level) - 2;
    
    return participants.slice(startIndex, endIndex + 1);
  }

  /**
   * Process auto top-up and RE-ID generation
   */
  private async processAutoTopUpAndREID(cycleData: GlobalCycleData): Promise<void> {
    if (!mlmConfig.globalCycle.autoTopupEnabled) return;

    const firstParticipant = cycleData.participants[0];
    const currentRank = cycleData.rank;
    
    // Get next rank
    const ranks = Object.keys(mlmConfig.ranks);
    const currentIndex = ranks.indexOf(currentRank);
    
    if (currentIndex < ranks.length - 1) {
      const nextRank = ranks[currentIndex + 1];
      const nextRankConfig = mlmConfig.ranks[nextRank as keyof typeof mlmConfig.ranks];
      
      // Auto top-up to next rank
      await this.processAutoTopUp(firstParticipant, nextRank, nextRankConfig.activationAmount);
    } else if (mlmConfig.globalCycle.reidGenerationEnabled) {
      // Generate RE-ID for infinite cycles
      await this.generateREID(firstParticipant, currentRank);
    }
  }

  /**
   * Process auto top-up to next rank
   */
  private async processAutoTopUp(userUID: string, nextRank: string, amount: number): Promise<void> {
    try {
      // Create auto top-up transaction
      const transactionData = {
        uid: userUID,
        type: 'auto_topup',
        amount,
        rank: nextRank,
        status: 'completed',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          autoGenerated: true,
          previousRank: nextRank
        }
      };

      const transactionRef = await this.db.collection(collections.TRANSACTIONS).add(transactionData);

      // Update user rank
      await this.db.collection(collections.USERS).doc(userUID).update({
        currentRank: nextRank,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Process incomes for auto top-up
      await this.processAllIncomes(userUID, amount, transactionRef.id, nextRank, true);

      await logger.info(
        LogCategory.MLM,
        'Auto top-up processed successfully',
        userUID,
        { nextRank, amount, transactionId: transactionRef.id }
      );

    } catch (error) {
      await logger.error(
        LogCategory.MLM,
        'Failed to process auto top-up',
        error as Error,
        userUID,
        { nextRank, amount }
      );
    }
  }

  /**
   * Generate RE-ID for infinite cycles
   */
  private async generateREID(userUID: string, rank: string): Promise<void> {
    try {
      const reidData = {
        originalUID: userUID,
        rank,
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        cycleCount: 1,
        totalEarnings: 0
      };

      const reidRef = await this.db.collection(collections.REIDS).add(reidData);

      await logger.info(
        LogCategory.MLM,
        'RE-ID generated successfully',
        userUID,
        { rank, reidId: reidRef.id }
      );

    } catch (error) {
      await logger.error(
        LogCategory.MLM,
        'Failed to generate RE-ID',
        error as Error,
        userUID,
        { rank }
      );
    }
  }

  /**
   * Process all income types for a transaction
   */
  async processAllIncomes(
    activatorUID: string,
    activationAmount: number,
    transactionId: string,
    rank: string,
    isReTopup: boolean = false
  ): Promise<void> {
    try {
      // Get user's sponsor
      const userDoc = await this.db.collection(collections.USERS).doc(activatorUID).get();
      const userData = userDoc.data();
      const sponsorUID = userData?.sponsorUID;

      // Process referral/re-topup income
      if (sponsorUID) {
        if (isReTopup) {
          await this.processReTopupIncome(activatorUID, sponsorUID, activationAmount, transactionId, rank);
        } else {
          await this.processReferralIncome(activatorUID, sponsorUID, activationAmount, transactionId, rank);
        }
      }

      // Process level income
      await this.processLevelIncome(activatorUID, activationAmount, transactionId, rank);

      // Process global income (if eligible)
      await this.processGlobalIncome(activatorUID, activationAmount, transactionId, rank);

      await logger.info(
        LogCategory.MLM,
        'All incomes processed successfully',
        activatorUID,
        { 
          activationAmount, 
          transactionId, 
          rank, 
          isReTopup,
          sponsorUID 
        }
      );

    } catch (error) {
      await logger.error(
        LogCategory.MLM,
        'Failed to process all incomes',
        error as Error,
        activatorUID,
        { activationAmount, transactionId, rank, isReTopup }
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
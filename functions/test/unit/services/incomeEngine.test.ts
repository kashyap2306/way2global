/**
 * Unit Tests - Income Engine Service
 */

import { IncomeEngine } from '../../../src/services/incomeEngine';
import { mockUserData, mockRankData, mockTransactionData, createMockUser, createMockRank } from '../../setup';
import * as admin from 'firebase-admin';

describe('IncomeEngine', () => {
  let incomeEngine: IncomeEngine;
  let mockDb: any;

  beforeEach(() => {
    incomeEngine = new IncomeEngine();
    
    // Mock Firestore
    mockDb = {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      add: jest.fn(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      runTransaction: jest.fn(),
    };

    // Mock admin.firestore()
    jest.spyOn(admin, 'firestore').mockReturnValue(mockDb as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateReferralIncome', () => {
    it('should calculate referral income correctly', async () => {
      const sponsorUser = createMockUser({ uid: 'sponsor-id' });
      const newUser = createMockUser({ sponsorId: 'sponsor-id' });
      const transaction = mockTransactionData;
      const rank = mockRankData;

      // Mock Firestore responses
      mockDb.get.mockResolvedValueOnce({
        exists: true,
        data: () => sponsorUser,
      });

      const result = await incomeEngine.calculateReferralIncome(
        newUser.uid,
        transaction.amount,
        rank.benefits.referralBonus
      );

      expect(result).toEqual({
        userId: sponsorUser.uid,
        amount: transaction.amount * (rank.benefits.referralBonus / 100),
        type: 'referral',
        sourceUserId: newUser.uid,
        sourceTransactionId: transaction.id,
        description: expect.stringContaining('Referral bonus'),
      });
    });

    it('should return null if user has no sponsor', async () => {
      const userWithoutSponsor = createMockUser({ sponsorId: undefined });

      const result = await incomeEngine.calculateReferralIncome(
        userWithoutSponsor.uid,
        100,
        10
      );

      expect(result).toBeNull();
    });

    it('should return null if sponsor does not exist', async () => {
      const user = createMockUser({ sponsorId: 'non-existent-sponsor' });

      // Mock Firestore response for non-existent sponsor
      mockDb.get.mockResolvedValueOnce({
        exists: false,
      });

      const result = await incomeEngine.calculateReferralIncome(
        user.uid,
        100,
        10
      );

      expect(result).toBeNull();
    });
  });

  describe('calculateLevelIncome', () => {
    it('should calculate level income for multiple levels', async () => {
      const user = createMockUser();
      const transaction = mockTransactionData;
      const rank = createMockRank({
        benefits: {
          ...mockRankData.benefits,
          levelBonus: [5, 3, 2, 1],
        },
      });

      // Mock upline chain
      const upline1 = createMockUser({ uid: 'upline-1' });
      const upline2 = createMockUser({ uid: 'upline-2', sponsorId: 'upline-1' });
      const upline3 = createMockUser({ uid: 'upline-3', sponsorId: 'upline-2' });

      // Mock Firestore responses for upline chain
      mockDb.get
        .mockResolvedValueOnce({ exists: true, data: () => upline1 })
        .mockResolvedValueOnce({ exists: true, data: () => upline2 })
        .mockResolvedValueOnce({ exists: true, data: () => upline3 })
        .mockResolvedValueOnce({ exists: false });

      const results = await incomeEngine.calculateLevelIncome(
        user.uid,
        transaction.amount,
        rank.benefits.levelBonus
      );

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({
        userId: upline1.uid,
        amount: transaction.amount * (rank.benefits.levelBonus[0] / 100),
        type: 'level',
        level: 1,
        sourceUserId: user.uid,
        sourceTransactionId: transaction.id,
        description: expect.stringContaining('Level 1 bonus'),
      });
    });

    it('should stop calculating when upline chain ends', async () => {
      const user = createMockUser({ sponsorId: 'upline-1' });
      const rank = createMockRank();

      // Mock single upline
      const upline1 = createMockUser({ uid: 'upline-1', sponsorId: undefined });

      mockDb.get.mockResolvedValueOnce({ exists: true, data: () => upline1 });

      const results = await incomeEngine.calculateLevelIncome(
        user.uid,
        100,
        rank.benefits.levelBonus
      );

      expect(results).toHaveLength(1);
    });
  });

  describe('calculateGlobalIncome', () => {
    it('should calculate global income for cycle participants', async () => {
      const participants = ['user-1', 'user-2', 'user-3'];
      const totalPool = 1000;
      const distribution = [50, 30, 20]; // percentages

      const results = await incomeEngine.calculateGlobalIncome(
        participants,
        totalPool,
        distribution,
        1
      );

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({
        userId: 'user-1',
        amount: 500, // 50% of 1000
        type: 'global',
        globalCycleId: expect.any(String),
        cycleNumber: 1,
        description: expect.stringContaining('Global cycle payout'),
      });
      expect(results[1].amount).toBe(300); // 30% of 1000
      expect(results[2].amount).toBe(200); // 20% of 1000
    });

    it('should handle empty participants array', async () => {
      const results = await incomeEngine.calculateGlobalIncome(
        [],
        1000,
        [50, 30, 20],
        1
      );

      expect(results).toHaveLength(0);
    });
  });

  describe('calculateReTopupIncome', () => {
    it('should calculate re-topup income for sponsor', async () => {
      const user = createMockUser({ sponsorId: 'sponsor-id' });
      const sponsor = createMockUser({ uid: 'sponsor-id' });
      const amount = 100;
      const bonusPercentage = 5;

      mockDb.get.mockResolvedValueOnce({
        exists: true,
        data: () => sponsor,
      });

      const result = await incomeEngine.calculateReTopupIncome(
        user.uid,
        amount,
        bonusPercentage
      );

      expect(result).toEqual({
        userId: sponsor.uid,
        amount: amount * (bonusPercentage / 100),
        type: 're_topup',
        sourceUserId: user.uid,
        description: expect.stringContaining('Re-topup bonus'),
      });
    });

    it('should return null if user has no sponsor', async () => {
      const userWithoutSponsor = createMockUser({ sponsorId: undefined });

      const result = await incomeEngine.calculateReTopupIncome(
        userWithoutSponsor.uid,
        100,
        5
      );

      expect(result).toBeNull();
    });
  });

  describe('processActivationIncome', () => {
    it('should process all income types for activation', async () => {
      const user = createMockUser({ sponsorId: 'sponsor-id' });
      const transaction = mockTransactionData;
      const rank = mockRankData;

      // Mock sponsor and upline
      const sponsor = createMockUser({ uid: 'sponsor-id' });
      
      mockDb.get
        .mockResolvedValueOnce({ exists: true, data: () => sponsor })
        .mockResolvedValueOnce({ exists: true, data: () => sponsor })
        .mockResolvedValueOnce({ exists: false });

      mockDb.add.mockResolvedValue({ id: 'income-id' });

      const results = await incomeEngine.processActivationIncome(
        user.uid,
        transaction.id,
        transaction.amount,
        rank
      );

      expect(results.referralIncome).toBeDefined();
      expect(results.levelIncomes).toHaveLength(1);
      expect(mockDb.add).toHaveBeenCalledTimes(2); // referral + level income
    });
  });

  describe('updateUserBalances', () => {
    it('should update user balances correctly', async () => {
      const incomes = [
        {
          userId: 'user-1',
          amount: 100,
          type: 'referral' as const,
          description: 'Test income',
        },
        {
          userId: 'user-2',
          amount: 50,
          type: 'level' as const,
          description: 'Test income',
        },
      ];

      mockDb.runTransaction.mockImplementation(async (callback: any) => {
        const transaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ availableBalance: 500, totalEarnings: 1000 }),
          }),
          update: jest.fn(),
        };
        return callback(transaction);
      });

      await incomeEngine.updateUserBalances(incomes);

      expect(mockDb.runTransaction).toHaveBeenCalled();
    });
  });

  describe('validateIncomeCalculation', () => {
    it('should validate income calculation parameters', () => {
      expect(() => {
        incomeEngine.validateIncomeCalculation('', 100, 10);
      }).toThrow('Invalid user ID');

      expect(() => {
        incomeEngine.validateIncomeCalculation('user-id', -100, 10);
      }).toThrow('Invalid amount');

      expect(() => {
        incomeEngine.validateIncomeCalculation('user-id', 100, -10);
      }).toThrow('Invalid percentage');

      expect(() => {
        incomeEngine.validateIncomeCalculation('user-id', 100, 150);
      }).toThrow('Invalid percentage');
    });

    it('should pass validation for valid parameters', () => {
      expect(() => {
        incomeEngine.validateIncomeCalculation('user-id', 100, 10);
      }).not.toThrow();
    });
  });
});
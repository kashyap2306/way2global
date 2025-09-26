/**
 * Test Helper Utilities
 */

import * as admin from 'firebase-admin';
import { testEnv } from '../setup';

export interface TestUser {
  uid: string;
  email: string;
  customToken: string;
  userData: any;
}

export interface TestRank {
  id: string;
  name: string;
  level: number;
  activationFee: number;
}

export interface TestTransaction {
  id: string;
  userId: string;
  type: string;
  amount: number;
  status: string;
}

/**
 * Create a test user with specified properties
 */
export async function createTestUser(
  overrides: Partial<{
    email: string;
    firstName: string;
    lastName: string;
    walletBalance: number;
    isActivated: boolean;
    status: string;
    rank: string;
    sponsorId: string;
    placementId: string;
  }> = {}
): Promise<TestUser> {
  const defaultData = {
    email: `test${Date.now()}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    walletBalance: 0,
    isActivated: false,
    status: 'pending',
    rank: null,
    sponsorId: null,
    placementId: null,
    ...overrides,
  };

  // Create user in Firebase Auth
  const userRecord = await admin.auth().createUser({
    email: defaultData.email,
    password: 'TestPassword123!',
    displayName: `${defaultData.firstName} ${defaultData.lastName}`,
  });

  // Create custom token
  const customToken = await admin.auth().createCustomToken(userRecord.uid);

  // Create user document in Firestore
  const userData = {
    uid: userRecord.uid,
    email: defaultData.email,
    firstName: defaultData.firstName,
    lastName: defaultData.lastName,
    walletBalance: defaultData.walletBalance,
    isActivated: defaultData.isActivated,
    status: defaultData.status,
    rank: defaultData.rank,
    sponsorId: defaultData.sponsorId,
    placementId: defaultData.placementId,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
  };

  await admin.firestore().collection('users').doc(userRecord.uid).set(userData);

  return {
    uid: userRecord.uid,
    email: defaultData.email,
    customToken,
    userData,
  };
}

/**
 * Create multiple test users with relationships
 */
export async function createTestUserHierarchy(levels: number = 3): Promise<TestUser[]> {
  const users: TestUser[] = [];
  
  // Create root user (sponsor)
  const rootUser = await createTestUser({
    email: 'root@example.com',
    firstName: 'Root',
    lastName: 'User',
    isActivated: true,
    status: 'active',
    rank: 'bronze',
  });
  users.push(rootUser);

  // Create users for each level
  for (let level = 1; level < levels; level++) {
    const levelUsers = Math.min(2 ** level, 8); // Limit to prevent too many users
    
    for (let i = 0; i < levelUsers; i++) {
      const sponsorIndex = Math.floor(i / 2) + (level === 1 ? 0 : 2 ** (level - 1) - 1);
      const sponsor = users[sponsorIndex];
      
      const user = await createTestUser({
        email: `level${level}user${i}@example.com`,
        firstName: `Level${level}`,
        lastName: `User${i}`,
        sponsorId: sponsor.uid,
        placementId: sponsor.uid,
        isActivated: level <= 2, // Only activate first 2 levels
        status: level <= 2 ? 'active' : 'pending',
        rank: level <= 2 ? 'starter' : null,
      });
      
      users.push(user);
    }
  }

  return users;
}

/**
 * Create test ranks
 */
export async function createTestRanks(): Promise<TestRank[]> {
  const ranks: TestRank[] = [
    { id: 'starter', name: 'Starter', level: 1, activationFee: 100 },
    { id: 'bronze', name: 'Bronze', level: 2, activationFee: 500 },
    { id: 'silver', name: 'Silver', level: 3, activationFee: 1000 },
    { id: 'gold', name: 'Gold', level: 4, activationFee: 2500 },
    { id: 'platinum', name: 'Platinum', level: 5, activationFee: 5000 },
  ];

  for (const rank of ranks) {
    await admin.firestore().collection('ranks').doc(rank.id).set({
      ...rank,
      benefits: [`${rank.name} rank benefits`],
      requirements: [`Activate with $${rank.activationFee}`],
      createdAt: admin.firestore.Timestamp.now(),
    });
  }

  return ranks;
}

/**
 * Create test transactions
 */
export async function createTestTransactions(
  userId: string,
  count: number = 5
): Promise<TestTransaction[]> {
  const transactions: TestTransaction[] = [];
  const types = ['activation', 'withdrawal', 'income', 'bonus'];
  const statuses = ['pending', 'completed', 'failed'];

  for (let i = 0; i < count; i++) {
    const transaction: TestTransaction = {
      id: `test-tx-${userId}-${i}`,
      userId,
      type: types[i % types.length],
      amount: Math.floor(Math.random() * 1000) + 100,
      status: statuses[i % statuses.length],
    };

    await admin.firestore().collection('transactions').doc(transaction.id).set({
      ...transaction,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    transactions.push(transaction);
  }

  return transactions;
}

/**
 * Create test income records
 */
export async function createTestIncomes(
  userId: string,
  fromUserId: string,
  count: number = 3
): Promise<any[]> {
  const incomes = [];
  const types = ['referral', 'level', 'global', 'retopup'];

  for (let i = 0; i < count; i++) {
    const income = {
      id: `test-income-${userId}-${i}`,
      userId,
      fromUserId,
      type: types[i % types.length],
      amount: Math.floor(Math.random() * 100) + 10,
      level: i + 1,
      createdAt: admin.firestore.Timestamp.now(),
    };

    await admin.firestore().collection('incomes').doc(income.id).set(income);
    incomes.push(income);
  }

  return incomes;
}

/**
 * Create test withdrawal records
 */
export async function createTestWithdrawals(
  userId: string,
  count: number = 2
): Promise<any[]> {
  const withdrawals = [];
  const statuses = ['pending', 'approved', 'completed', 'rejected'];
  const methods = ['bank_transfer', 'crypto', 'paypal'];

  for (let i = 0; i < count; i++) {
    const withdrawal = {
      id: `test-withdrawal-${userId}-${i}`,
      userId,
      amount: Math.floor(Math.random() * 500) + 50,
      method: methods[i % methods.length],
      status: statuses[i % statuses.length],
      requestedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await admin.firestore().collection('withdrawals').doc(withdrawal.id).set(withdrawal);
    withdrawals.push(withdrawal);
  }

  return withdrawals;
}

/**
 * Setup system settings for testing
 */
export async function setupSystemSettings(overrides: any = {}): Promise<void> {
  const defaultSettings = {
    registrationOpen: true,
    maintenanceMode: false,
    welcomeBonus: 50,
    maxRankLevel: 10,
    minWithdrawal: 50,
    maxWithdrawal: 10000,
    withdrawalFee: 5,
    referralBonus: 25,
    levelIncomePercentages: [10, 5, 3, 2, 1],
    globalIncomePercentage: 2,
    retopupIncomePercentage: 15,
    ...overrides,
  };

  await admin.firestore().collection('settings').doc('system').set({
    ...defaultSettings,
    updatedAt: admin.firestore.Timestamp.now(),
  });

  // Withdrawal settings
  await admin.firestore().collection('settings').doc('withdrawal').set({
    minAmount: defaultSettings.minWithdrawal,
    maxAmount: defaultSettings.maxWithdrawal,
    fee: defaultSettings.withdrawalFee,
    processingDays: 3,
    autoApprovalLimit: 1000,
    updatedAt: admin.firestore.Timestamp.now(),
  });
}

/**
 * Wait for a specified amount of time
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate random test data
 */
export class TestDataGenerator {
  static randomEmail(): string {
    return `test${Date.now()}${Math.random().toString(36).substr(2, 5)}@example.com`;
  }

  static randomString(length: number = 10): string {
    return Math.random().toString(36).substr(2, length);
  }

  static randomNumber(min: number = 1, max: number = 1000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static randomBoolean(): boolean {
    return Math.random() > 0.5;
  }

  static randomArrayElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
}

/**
 * Database assertion helpers
 */
export class DatabaseAssertions {
  static async assertUserExists(uid: string): Promise<any> {
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    expect(userDoc.exists).toBe(true);
    return userDoc.data();
  }

  static async assertUserNotExists(uid: string): Promise<void> {
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    expect(userDoc.exists).toBe(false);
  }

  static async assertTransactionExists(transactionId: string): Promise<any> {
    const txDoc = await admin.firestore().collection('transactions').doc(transactionId).get();
    expect(txDoc.exists).toBe(true);
    return txDoc.data();
  }

  static async assertIncomeRecorded(userId: string, expectedAmount: number): Promise<void> {
    const incomesSnapshot = await admin.firestore()
      .collection('incomes')
      .where('userId', '==', userId)
      .where('amount', '==', expectedAmount)
      .get();
    
    expect(incomesSnapshot.docs.length).toBeGreaterThan(0);
  }

  static async assertUserBalance(uid: string, expectedBalance: number): Promise<void> {
    const userData = await this.assertUserExists(uid);
    expect(userData.walletBalance).toBe(expectedBalance);
  }

  static async assertCollectionCount(collection: string, expectedCount: number): Promise<void> {
    const snapshot = await admin.firestore().collection(collection).get();
    expect(snapshot.docs.length).toBe(expectedCount);
  }
}

/**
 * Mock data factories
 */
export class MockDataFactory {
  static createUser(overrides: any = {}): any {
    return {
      uid: TestDataGenerator.randomString(28),
      email: TestDataGenerator.randomEmail(),
      firstName: 'Test',
      lastName: 'User',
      walletBalance: 0,
      isActivated: false,
      status: 'pending',
      rank: null,
      sponsorId: null,
      placementId: null,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      ...overrides,
    };
  }

  static createTransaction(overrides: any = {}): any {
    return {
      id: TestDataGenerator.randomString(20),
      userId: TestDataGenerator.randomString(28),
      type: TestDataGenerator.randomArrayElement(['activation', 'withdrawal', 'income']),
      amount: TestDataGenerator.randomNumber(10, 1000),
      status: TestDataGenerator.randomArrayElement(['pending', 'completed', 'failed']),
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      ...overrides,
    };
  }

  static createIncome(overrides: any = {}): any {
    return {
      id: TestDataGenerator.randomString(20),
      userId: TestDataGenerator.randomString(28),
      fromUserId: TestDataGenerator.randomString(28),
      type: TestDataGenerator.randomArrayElement(['referral', 'level', 'global']),
      amount: TestDataGenerator.randomNumber(5, 100),
      level: TestDataGenerator.randomNumber(1, 5),
      createdAt: admin.firestore.Timestamp.now(),
      ...overrides,
    };
  }

  static createWithdrawal(overrides: any = {}): any {
    return {
      id: TestDataGenerator.randomString(20),
      userId: TestDataGenerator.randomString(28),
      amount: TestDataGenerator.randomNumber(50, 500),
      method: TestDataGenerator.randomArrayElement(['bank_transfer', 'crypto', 'paypal']),
      status: TestDataGenerator.randomArrayElement(['pending', 'approved', 'completed']),
      requestedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      ...overrides,
    };
  }
}

/**
 * Performance measurement utilities
 */
export class PerformanceHelper {
  private static measurements: Map<string, number> = new Map();

  static startMeasurement(name: string): void {
    this.measurements.set(name, Date.now());
  }

  static endMeasurement(name: string): number {
    const startTime = this.measurements.get(name);
    if (!startTime) {
      throw new Error(`No measurement started for: ${name}`);
    }
    
    const duration = Date.now() - startTime;
    this.measurements.delete(name);
    return duration;
  }

  static async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    this.startMeasurement(name);
    const result = await fn();
    const duration = this.endMeasurement(name);
    return { result, duration };
  }

  static measure<T>(name: string, fn: () => T): { result: T; duration: number } {
    this.startMeasurement(name);
    const result = fn();
    const duration = this.endMeasurement(name);
    return { result, duration };
  }
}

/**
 * Error simulation utilities
 */
export class ErrorSimulator {
  static async simulateNetworkError(): Promise<never> {
    throw new Error('Network error: Connection timeout');
  }

  static async simulateDatabaseError(): Promise<never> {
    throw new Error('Database error: Connection lost');
  }

  static async simulateValidationError(field: string): Promise<never> {
    throw new Error(`Validation error: Invalid ${field}`);
  }

  static async simulateAuthError(): Promise<never> {
    throw new Error('Authentication error: Invalid token');
  }

  static async simulateRateLimitError(): Promise<never> {
    throw new Error('Rate limit exceeded');
  }
}

/**
 * Custom Jest matchers
 */
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
      toBeValidEmail(): R;
      toBeValidUid(): R;
      toHaveTimestamp(): R;
    }
  }
}

// Extend Jest matchers
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected.join(', ')}`,
        pass: false,
      };
    }
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },

  toBeValidUid(received: string) {
    const pass = typeof received === 'string' && received.length >= 20;
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UID`,
        pass: false,
      };
    }
  },

  toHaveTimestamp(received: any) {
    const pass = received && (
      received instanceof admin.firestore.Timestamp ||
      (received.seconds && received.nanoseconds !== undefined)
    );
    if (pass) {
      return {
        message: () => `expected ${received} not to have a timestamp`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have a timestamp`,
        pass: false,
      };
    }
  },
});
/**
 * Test Setup Configuration
 * Global setup for Jest tests
 */

import * as admin from 'firebase-admin';
import * as test from 'firebase-functions-test';

// Initialize Firebase Admin SDK for testing
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'wayglobe-mlm-test',
    databaseURL: 'https://wayglobe-mlm-test.firebaseio.com',
  });
}

// Initialize Firebase Functions Test SDK
export const testEnv = test({
  projectId: 'wayglobe-mlm-test',
});

// Mock Firebase Auth context for testing
export const mockAuthContext = {
  auth: {
    uid: 'test-user-id',
    token: {
      admin: false,
      superAdmin: false,
      rank: 'starter',
      status: 'active',
      isActivated: true,
    },
  },
};

export const mockAdminAuthContext = {
  auth: {
    uid: 'test-admin-id',
    token: {
      admin: true,
      superAdmin: false,
      rank: 'admin',
      status: 'active',
      isActivated: true,
    },
  },
};

export const mockSuperAdminAuthContext = {
  auth: {
    uid: 'test-super-admin-id',
    token: {
      admin: true,
      superAdmin: true,
      rank: 'super-admin',
      status: 'active',
      isActivated: true,
    },
  },
};

// Mock Firestore data
export const mockUserData = {
  uid: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  phone: '+1234567890',
  country: 'US',
  sponsorId: 'sponsor-id',
  placementId: 'placement-id',
  position: 'left',
  status: 'active',
  currentRank: 'starter',
  joinDate: admin.firestore.Timestamp.now(),
  lastActive: admin.firestore.Timestamp.now(),
  isActivated: true,
  activationDate: admin.firestore.Timestamp.now(),
  leftChild: null,
  rightChild: null,
  leftCount: 0,
  rightCount: 0,
  leftBV: 0,
  rightBV: 0,
  totalBV: 0,
  availableBalance: 1000,
  pendingBalance: 0,
  totalEarnings: 1000,
  totalWithdrawn: 0,
  directReferrals: 0,
  teamSize: 0,
  totalIncome: 1000,
  autoTopup: false,
  notifications: true,
  createdAt: admin.firestore.Timestamp.now(),
  updatedAt: admin.firestore.Timestamp.now(),
};

export const mockRankData = {
  id: 'starter',
  name: 'Starter',
  level: 1,
  activationFee: 100,
  requirements: {
    directReferrals: 0,
    teamBV: 0,
    personalBV: 0,
  },
  benefits: {
    referralBonus: 10,
    levelBonus: [5, 3, 2],
    globalPoolShare: 1,
    reTopupBonus: 5,
  },
  autoTopup: {
    enabled: false,
    amount: 0,
    maxCycles: 0,
  },
  isActive: true,
  createdAt: admin.firestore.Timestamp.now(),
  updatedAt: admin.firestore.Timestamp.now(),
};

export const mockTransactionData = {
  id: 'test-transaction-id',
  userId: 'test-user-id',
  type: 'activation',
  status: 'completed',
  amount: 100,
  fee: 5,
  netAmount: 95,
  paymentMethod: 'usdt_bep20',
  paymentDetails: {
    walletAddress: '0x1234567890123456789012345678901234567890',
    transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  },
  rankId: 'starter',
  rankName: 'Starter',
  description: 'Rank activation',
  createdAt: admin.firestore.Timestamp.now(),
  updatedAt: admin.firestore.Timestamp.now(),
};

// Helper functions for testing
export const createMockUser = (overrides: Partial<typeof mockUserData> = {}) => {
  return { ...mockUserData, ...overrides };
};

export const createMockRank = (overrides: Partial<typeof mockRankData> = {}) => {
  return { ...mockRankData, ...overrides };
};

export const createMockTransaction = (overrides: Partial<typeof mockTransactionData> = {}) => {
  return { ...mockTransactionData, ...overrides };
};

// Clean up function for tests
export const cleanupFirestore = async () => {
  const db = admin.firestore();
  const collections = ['users', 'ranks', 'transactions', 'incomes', 'withdrawals', 'payouts', 'globalCycles', 'settings', 'logs'];
  
  for (const collection of collections) {
    const snapshot = await db.collection(collection).get();
    const batch = db.batch();
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    if (snapshot.docs.length > 0) {
      await batch.commit();
    }
  }
};

// Global test timeout
jest.setTimeout(30000);

// Clean up after each test
afterEach(async () => {
  // Clean up Firestore data after each test
  await cleanupFirestore();
});

// Clean up after all tests
afterAll(async () => {
  // Clean up test environment
  testEnv.cleanup();
  
  // Delete all Firebase apps
  await Promise.all(admin.apps.map(app => app?.delete()));
});
/**
 * Integration Tests - Activation Callable Function
 */

import { activation } from '../../../src/callable/activation';
import { testEnv, mockAuthContext, cleanupFirestore, createMockUser, createMockRank, createMockTransaction } from '../../setup';
import * as admin from 'firebase-admin';

describe('Activation Callable Function', () => {
  let wrapped: any;

  beforeAll(() => {
    wrapped = testEnv.wrap(activation);
  });

  beforeEach(async () => {
    await cleanupFirestore();
    
    // Create default ranks
    const ranks = [
      createMockRank({ id: 'starter', name: 'Starter', level: 1, activationFee: 100, benefits: { directReferralBonus: 10 } }),
      createMockRank({ id: 'bronze', name: 'Bronze', level: 2, activationFee: 500, benefits: { directReferralBonus: 25 } }),
      createMockRank({ id: 'silver', name: 'Silver', level: 3, activationFee: 1000, benefits: { directReferralBonus: 50 } }),
    ];

    for (const rank of ranks) {
      await admin.firestore().collection('ranks').doc(rank.id).set(rank);
    }

    // Create system settings
    await admin.firestore().collection('settings').doc('system').set({
      registrationOpen: true,
      maintenanceMode: false,
      welcomeBonus: 0,
      maxRankLevel: 10,
    });
  });

  describe('successful activation', () => {
    it('should activate user to starter rank successfully', async () => {
      // Create inactive user
      const userData = createMockUser({ 
        uid: 'test-user', 
        email: 'test@example.com',
        status: 'inactive',
        isActivated: false,
        walletBalance: 150,
      });
      
      await admin.firestore().collection('users').doc('test-user').set(userData);
      await admin.auth().createUser({
        uid: 'test-user',
        email: 'test@example.com',
        password: 'Password123!',
      });

      const activationData = {
        rankId: 'starter',
        paymentMethod: 'wallet',
      };

      const result = await wrapped(activationData, { 
        auth: { uid: 'test-user', token: { uid: 'test-user' } } 
      });

      expect(result.success).toBe(true);
      expect(result.data.user.status).toBe('active');
      expect(result.data.user.isActivated).toBe(true);
      expect(result.data.user.currentRank).toBe('starter');
      expect(result.data.user.walletBalance).toBe(50); // 150 - 100 activation fee

      // Verify user document was updated
      const userDoc = await admin.firestore().collection('users').doc('test-user').get();
      const updatedUser = userDoc.data();
      expect(updatedUser?.status).toBe('active');
      expect(updatedUser?.isActivated).toBe(true);
      expect(updatedUser?.currentRank).toBe('starter');

      // Verify transaction was created
      const transactionsQuery = await admin.firestore()
        .collection('transactions')
        .where('userId', '==', 'test-user')
        .where('type', '==', 'activation')
        .get();
      
      expect(transactionsQuery.docs).toHaveLength(1);
      const transaction = transactionsQuery.docs[0].data();
      expect(transaction.amount).toBe(100);
      expect(transaction.status).toBe('completed');

      // Verify Firebase Auth custom claims were updated
      const userRecord = await admin.auth().getUser('test-user');
      expect(userRecord.customClaims?.status).toBe('active');
      expect(userRecord.customClaims?.isActivated).toBe(true);
      expect(userRecord.customClaims?.currentRank).toBe('starter');
    });

    it('should process sponsor income on activation', async () => {
      // Create sponsor user
      const sponsorData = createMockUser({ 
        uid: 'sponsor-user', 
        email: 'sponsor@example.com',
        status: 'active',
        isActivated: true,
        currentRank: 'bronze',
        walletBalance: 100,
      });
      
      await admin.firestore().collection('users').doc('sponsor-user').set(sponsorData);
      await admin.auth().createUser({
        uid: 'sponsor-user',
        email: 'sponsor@example.com',
        password: 'Password123!',
      });

      // Create user with sponsor
      const userData = createMockUser({ 
        uid: 'test-user', 
        email: 'test@example.com',
        status: 'inactive',
        isActivated: false,
        walletBalance: 150,
        sponsorId: 'sponsor-user',
      });
      
      await admin.firestore().collection('users').doc('test-user').set(userData);
      await admin.auth().createUser({
        uid: 'test-user',
        email: 'test@example.com',
        password: 'Password123!',
      });

      const activationData = {
        rankId: 'starter',
        paymentMethod: 'wallet',
      };

      const result = await wrapped(activationData, { 
        auth: { uid: 'test-user', token: { uid: 'test-user' } } 
      });

      expect(result.success).toBe(true);

      // Verify sponsor received income
      const sponsorDoc = await admin.firestore().collection('users').doc('sponsor-user').get();
      const updatedSponsor = sponsorDoc.data();
      expect(updatedSponsor?.walletBalance).toBeGreaterThan(100); // Should have received referral bonus

      // Verify income record was created
      const incomesQuery = await admin.firestore()
        .collection('incomes')
        .where('userId', '==', 'sponsor-user')
        .where('type', '==', 'referral')
        .get();
      
      expect(incomesQuery.docs.length).toBeGreaterThan(0);
      const income = incomesQuery.docs[0].data();
      expect(income.fromUserId).toBe('test-user');
      expect(income.amount).toBeGreaterThan(0);
    });

    it('should upgrade user rank successfully', async () => {
      // Create active user with starter rank
      const userData = createMockUser({ 
        uid: 'test-user', 
        email: 'test@example.com',
        status: 'active',
        isActivated: true,
        currentRank: 'starter',
        walletBalance: 600,
      });
      
      await admin.firestore().collection('users').doc('test-user').set(userData);
      await admin.auth().createUser({
        uid: 'test-user',
        email: 'test@example.com',
        password: 'Password123!',
      });

      const activationData = {
        rankId: 'bronze',
        paymentMethod: 'wallet',
      };

      const result = await wrapped(activationData, { 
        auth: { uid: 'test-user', token: { uid: 'test-user' } } 
      });

      expect(result.success).toBe(true);
      expect(result.data.user.currentRank).toBe('bronze');
      expect(result.data.user.walletBalance).toBe(100); // 600 - 500 upgrade fee

      // Verify rank history was updated
      const userDoc = await admin.firestore().collection('users').doc('test-user').get();
      const updatedUser = userDoc.data();
      expect(updatedUser?.rankHistory).toContainEqual(
        expect.objectContaining({
          rankId: 'bronze',
          achievedAt: expect.any(Object),
        })
      );
    });
  });

  describe('validation errors', () => {
    it('should reject invalid rank ID', async () => {
      const userData = createMockUser({ 
        uid: 'test-user', 
        walletBalance: 150,
      });
      
      await admin.firestore().collection('users').doc('test-user').set(userData);

      const activationData = {
        rankId: 'invalid-rank',
        paymentMethod: 'wallet',
      };

      const result = await wrapped(activationData, { 
        auth: { uid: 'test-user', token: { uid: 'test-user' } } 
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
    });

    it('should reject invalid payment method', async () => {
      const userData = createMockUser({ 
        uid: 'test-user', 
        walletBalance: 150,
      });
      
      await admin.firestore().collection('users').doc('test-user').set(userData);

      const activationData = {
        rankId: 'starter',
        paymentMethod: 'invalid-method',
      };

      const result = await wrapped(activationData, { 
        auth: { uid: 'test-user', token: { uid: 'test-user' } } 
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
    });

    it('should reject missing required fields', async () => {
      const userData = createMockUser({ 
        uid: 'test-user', 
        walletBalance: 150,
      });
      
      await admin.firestore().collection('users').doc('test-user').set(userData);

      const activationData = {
        // Missing rankId and paymentMethod
      };

      const result = await wrapped(activationData, { 
        auth: { uid: 'test-user', token: { uid: 'test-user' } } 
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
    });
  });

  describe('authentication errors', () => {
    it('should reject unauthenticated requests', async () => {
      const activationData = {
        rankId: 'starter',
        paymentMethod: 'wallet',
      };

      const result = await wrapped(activationData, { auth: null });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication required');
    });

    it('should reject requests from non-existent users', async () => {
      const activationData = {
        rankId: 'starter',
        paymentMethod: 'wallet',
      };

      const result = await wrapped(activationData, { 
        auth: { uid: 'non-existent-user', token: { uid: 'non-existent-user' } } 
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
    });
  });

  describe('business logic errors', () => {
    it('should reject activation for already active user to same rank', async () => {
      const userData = createMockUser({ 
        uid: 'test-user', 
        status: 'active',
        isActivated: true,
        currentRank: 'starter',
        walletBalance: 150,
      });
      
      await admin.firestore().collection('users').doc('test-user').set(userData);

      const activationData = {
        rankId: 'starter',
        paymentMethod: 'wallet',
      };

      const result = await wrapped(activationData, { 
        auth: { uid: 'test-user', token: { uid: 'test-user' } } 
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already activated to this rank');
    });

    it('should reject activation with insufficient wallet balance', async () => {
      const userData = createMockUser({ 
        uid: 'test-user', 
        status: 'inactive',
        isActivated: false,
        walletBalance: 50, // Less than starter activation fee (100)
      });
      
      await admin.firestore().collection('users').doc('test-user').set(userData);

      const activationData = {
        rankId: 'starter',
        paymentMethod: 'wallet',
      };

      const result = await wrapped(activationData, { 
        auth: { uid: 'test-user', token: { uid: 'test-user' } } 
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient wallet balance');
    });

    it('should reject downgrade to lower rank', async () => {
      const userData = createMockUser({ 
        uid: 'test-user', 
        status: 'active',
        isActivated: true,
        currentRank: 'bronze',
        walletBalance: 150,
      });
      
      await admin.firestore().collection('users').doc('test-user').set(userData);

      const activationData = {
        rankId: 'starter', // Lower than current bronze rank
        paymentMethod: 'wallet',
      };

      const result = await wrapped(activationData, { 
        auth: { uid: 'test-user', token: { uid: 'test-user' } } 
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot downgrade');
    });

    it('should reject activation for suspended user', async () => {
      const userData = createMockUser({ 
        uid: 'test-user', 
        status: 'suspended',
        isActivated: false,
        walletBalance: 150,
      });
      
      await admin.firestore().collection('users').doc('test-user').set(userData);

      const activationData = {
        rankId: 'starter',
        paymentMethod: 'wallet',
      };

      const result = await wrapped(activationData, { 
        auth: { uid: 'test-user', token: { uid: 'test-user' } } 
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Account is suspended');
    });

    it('should reject activation when rank does not exist', async () => {
      const userData = createMockUser({ 
        uid: 'test-user', 
        walletBalance: 150,
      });
      
      await admin.firestore().collection('users').doc('test-user').set(userData);

      const activationData = {
        rankId: 'non-existent-rank',
        paymentMethod: 'wallet',
      };

      const result = await wrapped(activationData, { 
        auth: { uid: 'test-user', token: { uid: 'test-user' } } 
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rank not found');
    });
  });

  describe('system settings', () => {
    it('should respect maintenance mode', async () => {
      // Set maintenance mode
      await admin.firestore().collection('settings').doc('system').set({
        registrationOpen: true,
        maintenanceMode: true,
        welcomeBonus: 0,
        maxRankLevel: 10,
      });

      const userData = createMockUser({ 
        uid: 'test-user', 
        walletBalance: 150,
      });
      
      await admin.firestore().collection('users').doc('test-user').set(userData);

      const activationData = {
        rankId: 'starter',
        paymentMethod: 'wallet',
      };

      const result = await wrapped(activationData, { 
        auth: { uid: 'test-user', token: { uid: 'test-user' } } 
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('System is under maintenance');
    });

    it('should respect max rank level setting', async () => {
      // Set max rank level to 1 (only starter allowed)
      await admin.firestore().collection('settings').doc('system').set({
        registrationOpen: true,
        maintenanceMode: false,
        welcomeBonus: 0,
        maxRankLevel: 1,
      });

      const userData = createMockUser({ 
        uid: 'test-user', 
        walletBalance: 600,
      });
      
      await admin.firestore().collection('users').doc('test-user').set(userData);

      const activationData = {
        rankId: 'bronze', // Level 2, above max allowed
        paymentMethod: 'wallet',
      };

      const result = await wrapped(activationData, { 
        auth: { uid: 'test-user', token: { uid: 'test-user' } } 
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rank level exceeds maximum allowed');
    });
  });

  describe('concurrent activation handling', () => {
    it('should handle concurrent activation attempts', async () => {
      const userData = createMockUser({ 
        uid: 'test-user', 
        status: 'inactive',
        isActivated: false,
        walletBalance: 150,
      });
      
      await admin.firestore().collection('users').doc('test-user').set(userData);

      const activationData = {
        rankId: 'starter',
        paymentMethod: 'wallet',
      };

      // Simulate concurrent activation attempts
      const promises = Array(3).fill(null).map(() => 
        wrapped(activationData, { 
          auth: { uid: 'test-user', token: { uid: 'test-user' } } 
        })
      );

      const results = await Promise.all(promises);
      
      // Only one should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBe(1);
      
      // Others should fail with appropriate error
      const failedResults = results.filter(r => !r.success);
      expect(failedResults.length).toBe(2);
    });
  });
});
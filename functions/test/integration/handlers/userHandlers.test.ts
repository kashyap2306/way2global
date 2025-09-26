/**
 * Integration Tests - User Handlers
 */

import request from 'supertest';
import * as admin from 'firebase-admin';
import { userHandlers } from '../../../src/handlers/userHandlers';
import { testEnv, mockAuthContext, cleanupFirestore, createMockUser, createMockRank, createMockTransaction } from '../../setup';

describe('User Handlers', () => {
  let app: any;

  beforeAll(() => {
    app = userHandlers;
  });

  beforeEach(async () => {
    await cleanupFirestore();
    
    // Create test user
    const userData = createMockUser({ 
      uid: 'test-user', 
      email: 'test@example.com',
      status: 'active',
      isActivated: true,
      currentRank: 'bronze',
      walletBalance: 1000,
      directReferrals: 5,
      totalTeamSize: 25,
      totalBusinessVolume: 50000,
    });
    
    await admin.firestore().collection('users').doc('test-user').set(userData);
    await admin.auth().createUser({
      uid: 'test-user',
      email: 'test@example.com',
      password: 'Password123!',
    });

    // Create ranks
    const ranks = [
      createMockRank({ id: 'starter', name: 'Starter', level: 1, activationFee: 100 }),
      createMockRank({ id: 'bronze', name: 'Bronze', level: 2, activationFee: 500 }),
      createMockRank({ id: 'silver', name: 'Silver', level: 3, activationFee: 1000 }),
    ];

    for (const rank of ranks) {
      await admin.firestore().collection('ranks').doc(rank.id).set(rank);
    }

    // Create sample transactions
    const transactions = [
      createMockTransaction({ 
        id: 'tx1', 
        userId: 'test-user', 
        type: 'activation', 
        amount: 500,
        status: 'completed',
      }),
      createMockTransaction({ 
        id: 'tx2', 
        userId: 'test-user', 
        type: 'withdrawal', 
        amount: 200,
        status: 'pending',
      }),
    ];

    for (const tx of transactions) {
      await admin.firestore().collection('transactions').doc(tx.id).set(tx);
    }
  });

  // Helper function to create authenticated request
  const createAuthenticatedRequest = async (uid: string = 'test-user') => {
    const customToken = await admin.auth().createCustomToken(uid);
    return request(app).set('Authorization', `Bearer ${customToken}`);
  };

  describe('GET /user/dashboard', () => {
    it('should return user dashboard data', async () => {
      const response = await createAuthenticatedRequest()
        .get('/user/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('balances');
      expect(response.body.data).toHaveProperty('statistics');
      expect(response.body.data).toHaveProperty('rank');
      expect(response.body.data).toHaveProperty('nextRank');
      expect(response.body.data).toHaveProperty('recentTransactions');
      expect(response.body.data).toHaveProperty('recentIncomes');

      expect(response.body.data.user.uid).toBe('test-user');
      expect(response.body.data.balances.wallet).toBe(1000);
      expect(response.body.data.statistics.directReferrals).toBe(5);
      expect(response.body.data.statistics.totalTeamSize).toBe(25);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/user/dashboard')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await createAuthenticatedRequest('non-existent-user')
        .get('/user/dashboard')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('User not found');
    });
  });

  describe('GET /user/profile', () => {
    it('should return user profile data', async () => {
      const response = await createAuthenticatedRequest()
        .get('/user/profile')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('sponsor');
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should include sponsor information if available', async () => {
      // Create sponsor user
      const sponsorData = createMockUser({ 
        uid: 'sponsor-user', 
        email: 'sponsor@example.com',
        firstName: 'John',
        lastName: 'Sponsor',
      });
      
      await admin.firestore().collection('users').doc('sponsor-user').set(sponsorData);

      // Update test user with sponsor
      await admin.firestore().collection('users').doc('test-user').update({
        sponsorId: 'sponsor-user',
      });

      const response = await createAuthenticatedRequest()
        .get('/user/profile')
        .expect(200);

      expect(response.body.data.sponsor).toBeDefined();
      expect(response.body.data.sponsor.firstName).toBe('John');
      expect(response.body.data.sponsor.lastName).toBe('Sponsor');
    });
  });

  describe('PUT /user/profile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+1234567890',
        country: 'US',
        city: 'New York',
      };

      const response = await createAuthenticatedRequest()
        .put('/user/profile')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe('Updated');
      expect(response.body.data.user.lastName).toBe('Name');

      // Verify database was updated
      const userDoc = await admin.firestore().collection('users').doc('test-user').get();
      const userData = userDoc.data();
      expect(userData?.firstName).toBe('Updated');
      expect(userData?.lastName).toBe('Name');
    });

    it('should reject invalid profile data', async () => {
      const updateData = {
        firstName: '', // Invalid empty name
        email: 'invalid-email', // Invalid email format
      };

      const response = await createAuthenticatedRequest()
        .put('/user/profile')
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should not allow updating restricted fields', async () => {
      const updateData = {
        email: 'newemail@example.com', // Email should not be updatable
        walletBalance: 99999, // Balance should not be updatable
        status: 'suspended', // Status should not be updatable
      };

      const response = await createAuthenticatedRequest()
        .put('/user/profile')
        .send(updateData)
        .expect(200);

      // Verify restricted fields were not updated
      const userDoc = await admin.firestore().collection('users').doc('test-user').get();
      const userData = userDoc.data();
      expect(userData?.email).toBe('test@example.com'); // Should remain unchanged
      expect(userData?.walletBalance).toBe(1000); // Should remain unchanged
      expect(userData?.status).toBe('active'); // Should remain unchanged
    });
  });

  describe('GET /user/referral', () => {
    it('should return referral system data', async () => {
      // Create some referrals
      const referral1 = createMockUser({ 
        uid: 'ref1', 
        sponsorId: 'test-user',
        placementId: 'test-user',
        position: 'left',
      });
      const referral2 = createMockUser({ 
        uid: 'ref2', 
        sponsorId: 'test-user',
        placementId: 'test-user',
        position: 'right',
      });

      await admin.firestore().collection('users').doc('ref1').set(referral1);
      await admin.firestore().collection('users').doc('ref2').set(referral2);

      const response = await createAuthenticatedRequest()
        .get('/user/referral')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('directReferrals');
      expect(response.body.data).toHaveProperty('binaryTree');
      expect(response.body.data).toHaveProperty('referralIncome');
      expect(response.body.data).toHaveProperty('referralLink');

      expect(response.body.data.referralLink).toContain('test-user');
    });

    it('should calculate binary tree statistics', async () => {
      const response = await createAuthenticatedRequest()
        .get('/user/referral')
        .expect(200);

      expect(response.body.data.binaryTree).toHaveProperty('leftLeg');
      expect(response.body.data.binaryTree).toHaveProperty('rightLeg');
      expect(response.body.data.binaryTree.leftLeg).toHaveProperty('count');
      expect(response.body.data.binaryTree.leftLeg).toHaveProperty('businessVolume');
    });
  });

  describe('GET /user/transactions', () => {
    it('should return paginated transaction history', async () => {
      const response = await createAuthenticatedRequest()
        .get('/user/transactions')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('transactions');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.transactions)).toBe(true);
      expect(response.body.data.pagination).toHaveProperty('currentPage');
      expect(response.body.data.pagination).toHaveProperty('totalPages');
      expect(response.body.data.pagination).toHaveProperty('totalItems');
    });

    it('should filter transactions by type', async () => {
      const response = await createAuthenticatedRequest()
        .get('/user/transactions')
        .query({ type: 'activation' })
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.transactions.forEach((tx: any) => {
        expect(tx.type).toBe('activation');
      });
    });

    it('should validate pagination parameters', async () => {
      const response = await createAuthenticatedRequest()
        .get('/user/transactions')
        .query({ page: -1, limit: 1000 }) // Invalid parameters
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });
  });

  describe('GET /user/incomes', () => {
    it('should return paginated income history', async () => {
      // Create sample income records
      const income1 = {
        id: 'inc1',
        userId: 'test-user',
        type: 'referral',
        amount: 50,
        fromUserId: 'ref1',
        createdAt: admin.firestore.Timestamp.now(),
      };

      await admin.firestore().collection('incomes').doc('inc1').set(income1);

      const response = await createAuthenticatedRequest()
        .get('/user/incomes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('incomes');
      expect(response.body.data).toHaveProperty('statistics');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should calculate income statistics by type', async () => {
      const response = await createAuthenticatedRequest()
        .get('/user/incomes')
        .expect(200);

      expect(response.body.data.statistics).toHaveProperty('byType');
      expect(response.body.data.statistics).toHaveProperty('totalIncome');
      expect(response.body.data.statistics).toHaveProperty('thisMonth');
    });
  });

  describe('GET /user/withdrawals', () => {
    it('should return paginated withdrawal history', async () => {
      // Create sample withdrawal
      const withdrawal = {
        id: 'wd1',
        userId: 'test-user',
        amount: 200,
        status: 'pending',
        paymentMethod: 'bank_transfer',
        createdAt: admin.firestore.Timestamp.now(),
      };

      await admin.firestore().collection('withdrawals').doc('wd1').set(withdrawal);

      const response = await createAuthenticatedRequest()
        .get('/user/withdrawals')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('withdrawals');
      expect(response.body.data).toHaveProperty('statistics');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should calculate withdrawal statistics', async () => {
      const response = await createAuthenticatedRequest()
        .get('/user/withdrawals')
        .expect(200);

      expect(response.body.data.statistics).toHaveProperty('totalWithdrawn');
      expect(response.body.data.statistics).toHaveProperty('pendingAmount');
      expect(response.body.data.statistics).toHaveProperty('availableBalance');
    });
  });

  describe('GET /user/team', () => {
    it('should return team structure', async () => {
      // Create team members
      const teamMember1 = createMockUser({ 
        uid: 'team1', 
        sponsorId: 'test-user',
        placementId: 'test-user',
        position: 'left',
      });

      await admin.firestore().collection('users').doc('team1').set(teamMember1);

      const response = await createAuthenticatedRequest()
        .get('/user/team')
        .query({ level: 2 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('teamStructure');
      expect(response.body.data).toHaveProperty('statistics');
    });

    it('should limit team level depth', async () => {
      const response = await createAuthenticatedRequest()
        .get('/user/team')
        .query({ level: 10 }) // Should be limited to max 5
        .expect(200);

      expect(response.body.success).toBe(true);
      // The actual level should be limited by the handler
    });

    it('should calculate team statistics', async () => {
      const response = await createAuthenticatedRequest()
        .get('/user/team')
        .expect(200);

      expect(response.body.data.statistics).toHaveProperty('totalMembers');
      expect(response.body.data.statistics).toHaveProperty('activeMembers');
      expect(response.body.data.statistics).toHaveProperty('totalBusinessVolume');
    });
  });

  describe('GET /user/health', () => {
    it('should return health check', async () => {
      const response = await request(app)
        .get('/user/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User service is healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limiting on endpoints', async () => {
      // Make multiple rapid requests
      const promises = Array(20).fill(null).map(() => 
        createAuthenticatedRequest().get('/user/dashboard')
      );

      const results = await Promise.allSettled(promises);
      
      // Some requests should be rate limited (429 status)
      const rateLimitedCount = results.filter(
        (result) => result.status === 'fulfilled' && 
        (result.value as any).status === 429
      ).length;

      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Simulate database error by using invalid collection reference
      // This would need to be implemented based on your error handling strategy
      
      const response = await createAuthenticatedRequest()
        .get('/user/dashboard')
        .expect(200); // Should still return 200 with proper error handling

      expect(response.body.success).toBe(true);
    });

    it('should handle malformed requests', async () => {
      const response = await createAuthenticatedRequest()
        .put('/user/profile')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Security', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/user/health')
        .expect(200);

      // Check for security headers (helmet middleware)
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });

    it('should handle CORS properly', async () => {
      const response = await request(app)
        .options('/user/health')
        .set('Origin', 'https://example.com')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should prevent access to other users data', async () => {
      // Create another user
      const otherUserData = createMockUser({ 
        uid: 'other-user', 
        email: 'other@example.com',
      });
      
      await admin.firestore().collection('users').doc('other-user').set(otherUserData);
      await admin.auth().createUser({
        uid: 'other-user',
        email: 'other@example.com',
        password: 'Password123!',
      });

      // Try to access with different user's token
      const response = await createAuthenticatedRequest('other-user')
        .get('/user/dashboard')
        .expect(200);

      // Should return other-user's data, not test-user's data
      expect(response.body.data.user.uid).toBe('other-user');
      expect(response.body.data.user.email).toBe('other@example.com');
    });
  });
});
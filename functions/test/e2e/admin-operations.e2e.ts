/**
 * End-to-End Tests - Admin Operations
 */

import request from 'supertest';
import * as admin from 'firebase-admin';
import { testEnv, cleanupFirestore, createMockUser, createMockRank } from '../setup';
import { seedDatabase } from '../../src/callable/seedDatabase';
import { adminHandlers } from '../../src/handlers/adminHandlers';

describe('Admin Operations E2E', () => {
  let seedWrapped: any;
  let adminApp: any;
  let superAdminToken: string;
  let adminToken: string;

  beforeAll(async () => {
    seedWrapped = testEnv.wrap(seedDatabase);
    adminApp = adminHandlers;

    // Create super admin user
    await admin.auth().createUser({
      uid: 'super-admin',
      email: 'superadmin@wayglobe.com',
      password: 'SuperAdmin123!',
    });

    await admin.auth().setCustomUserClaims('super-admin', {
      role: 'super_admin',
      permissions: ['all'],
    });

    superAdminToken = await admin.auth().createCustomToken('super-admin');

    // Create regular admin user
    await admin.auth().createUser({
      uid: 'admin-user',
      email: 'admin@wayglobe.com',
      password: 'Admin123!',
    });

    await admin.auth().setCustomUserClaims('admin-user', {
      role: 'admin',
      permissions: ['user_management', 'transaction_management'],
    });

    adminToken = await admin.auth().createCustomToken('admin-user');
  });

  beforeEach(async () => {
    await cleanupFirestore();
  });

  describe('Database Seeding Operations', () => {
    it('should complete full database seeding workflow', async () => {
      // Step 1: Check initial seed status
      let seedResult = await seedWrapped({ action: 'status' }, {
        auth: { uid: 'super-admin', token: { uid: 'super-admin' } }
      });

      expect(seedResult.success).toBe(true);
      expect(seedResult.data.isSeeded).toBe(false);

      // Step 2: Seed initial data
      seedResult = await seedWrapped({ action: 'seed' }, {
        auth: { uid: 'super-admin', token: { uid: 'super-admin' } }
      });

      expect(seedResult.success).toBe(true);
      expect(seedResult.message).toContain('Database seeded successfully');

      // Step 3: Verify seeding completed
      seedResult = await seedWrapped({ action: 'status' }, {
        auth: { uid: 'super-admin', token: { uid: 'super-admin' } }
      });

      expect(seedResult.success).toBe(true);
      expect(seedResult.data.isSeeded).toBe(true);
      expect(seedResult.data.details.ranks).toBeGreaterThan(0);
      expect(seedResult.data.details.testUsers).toBeGreaterThan(0);
      expect(seedResult.data.details.settings).toBeGreaterThan(0);

      // Step 4: Verify data exists in collections
      const ranksSnapshot = await admin.firestore().collection('ranks').get();
      expect(ranksSnapshot.docs.length).toBeGreaterThan(0);

      const usersSnapshot = await admin.firestore().collection('users').get();
      expect(usersSnapshot.docs.length).toBeGreaterThan(0);

      const settingsSnapshot = await admin.firestore().collection('settings').get();
      expect(settingsSnapshot.docs.length).toBeGreaterThan(0);

      // Step 5: Test re-seeding (should clear and re-seed)
      seedResult = await seedWrapped({ action: 'reseed' }, {
        auth: { uid: 'super-admin', token: { uid: 'super-admin' } }
      });

      expect(seedResult.success).toBe(true);
      expect(seedResult.message).toContain('Database re-seeded successfully');

      // Step 6: Clear all data
      seedResult = await seedWrapped({ action: 'clear' }, {
        auth: { uid: 'super-admin', token: { uid: 'super-admin' } }
      });

      expect(seedResult.success).toBe(true);
      expect(seedResult.message).toContain('Database cleared successfully');

      // Step 7: Verify data was cleared
      const clearedRanksSnapshot = await admin.firestore().collection('ranks').get();
      expect(clearedRanksSnapshot.docs.length).toBe(0);
    });

    it('should reject seeding operations from non-super-admin users', async () => {
      // Try with regular admin
      let seedResult = await seedWrapped({ action: 'seed' }, {
        auth: { uid: 'admin-user', token: { uid: 'admin-user' } }
      });

      expect(seedResult.success).toBe(false);
      expect(seedResult.error).toContain('Super admin access required');

      // Try with unauthenticated user
      seedResult = await seedWrapped({ action: 'seed' }, { auth: null });

      expect(seedResult.success).toBe(false);
      expect(seedResult.error).toContain('Authentication required');
    });
  });

  describe('User Management Operations', () => {
    beforeEach(async () => {
      // Seed basic data for user management tests
      await seedWrapped({ action: 'seed' }, {
        auth: { uid: 'super-admin', token: { uid: 'super-admin' } }
      });
    });

    it('should complete user lifecycle management', async () => {
      // Step 1: Get initial user list
      let usersResponse = await request(adminApp)
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(usersResponse.body.success).toBe(true);
      const initialUserCount = usersResponse.body.data.users.length;

      // Step 2: Get specific user details
      const testUser = usersResponse.body.data.users[0];
      const userDetailResponse = await request(adminApp)
        .get(`/admin/users/${testUser.uid}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(userDetailResponse.body.success).toBe(true);
      expect(userDetailResponse.body.data.user.uid).toBe(testUser.uid);

      // Step 3: Update user status
      const updateResponse = await request(adminApp)
        .put(`/admin/users/${testUser.uid}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'suspended',
          notes: 'Suspended for testing',
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.user.status).toBe('suspended');

      // Step 4: Verify user was updated
      const updatedUserResponse = await request(adminApp)
        .get(`/admin/users/${testUser.uid}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(updatedUserResponse.body.data.user.status).toBe('suspended');

      // Step 5: Search users by status
      const suspendedUsersResponse = await request(adminApp)
        .get('/admin/users')
        .query({ status: 'suspended' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(suspendedUsersResponse.body.data.users.length).toBeGreaterThan(0);
      expect(suspendedUsersResponse.body.data.users[0].status).toBe('suspended');

      // Step 6: Reactivate user
      const reactivateResponse = await request(adminApp)
        .put(`/admin/users/${testUser.uid}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'active',
          notes: 'Reactivated after testing',
        })
        .expect(200);

      expect(reactivateResponse.body.success).toBe(true);
      expect(reactivateResponse.body.data.user.status).toBe('active');
    });

    it('should handle user search and filtering', async () => {
      // Search by email
      const emailSearchResponse = await request(adminApp)
        .get('/admin/users')
        .query({ search: 'test' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(emailSearchResponse.body.success).toBe(true);

      // Filter by rank
      const rankFilterResponse = await request(adminApp)
        .get('/admin/users')
        .query({ rank: 'starter' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(rankFilterResponse.body.success).toBe(true);

      // Pagination test
      const paginatedResponse = await request(adminApp)
        .get('/admin/users')
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(paginatedResponse.body.data.pagination.currentPage).toBe(1);
      expect(paginatedResponse.body.data.pagination.limit).toBe(5);
    });
  });

  describe('Transaction Management Operations', () => {
    beforeEach(async () => {
      await seedWrapped({ action: 'seed' }, {
        auth: { uid: 'super-admin', token: { uid: 'super-admin' } }
      });
    });

    it('should manage transaction lifecycle', async () => {
      // Step 1: Get transaction list
      const transactionsResponse = await request(adminApp)
        .get('/admin/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(transactionsResponse.body.success).toBe(true);
      expect(Array.isArray(transactionsResponse.body.data.transactions)).toBe(true);

      if (transactionsResponse.body.data.transactions.length > 0) {
        const testTransaction = transactionsResponse.body.data.transactions[0];

        // Step 2: Get transaction details
        const transactionDetailResponse = await request(adminApp)
          .get(`/admin/transactions/${testTransaction.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(transactionDetailResponse.body.success).toBe(true);
        expect(transactionDetailResponse.body.data.transaction.id).toBe(testTransaction.id);

        // Step 3: Update transaction status (if pending)
        if (testTransaction.status === 'pending') {
          const updateResponse = await request(adminApp)
            .put(`/admin/transactions/${testTransaction.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              status: 'completed',
              notes: 'Manually approved by admin',
            })
            .expect(200);

          expect(updateResponse.body.success).toBe(true);
          expect(updateResponse.body.data.transaction.status).toBe('completed');
        }
      }

      // Step 4: Filter transactions by type
      const activationTxResponse = await request(adminApp)
        .get('/admin/transactions')
        .query({ type: 'activation' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(activationTxResponse.body.success).toBe(true);

      // Step 5: Filter by date range
      const dateFilterResponse = await request(adminApp)
        .get('/admin/transactions')
        .query({ 
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(dateFilterResponse.body.success).toBe(true);
    });
  });

  describe('Withdrawal Management Operations', () => {
    beforeEach(async () => {
      await seedWrapped({ action: 'seed' }, {
        auth: { uid: 'super-admin', token: { uid: 'super-admin' } }
      });

      // Create a test withdrawal
      const testWithdrawal = {
        id: 'test-withdrawal',
        userId: 'test-user-1',
        amount: 500,
        status: 'pending',
        paymentMethod: 'bank_transfer',
        bankDetails: {
          accountNumber: '1234567890',
          bankName: 'Test Bank',
          accountHolder: 'Test User',
        },
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      };

      await admin.firestore().collection('withdrawals').doc('test-withdrawal').set(testWithdrawal);
    });

    it('should manage withdrawal approval workflow', async () => {
      // Step 1: Get pending withdrawals
      const withdrawalsResponse = await request(adminApp)
        .get('/admin/withdrawals')
        .query({ status: 'pending' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(withdrawalsResponse.body.success).toBe(true);
      expect(withdrawalsResponse.body.data.withdrawals.length).toBeGreaterThan(0);

      const testWithdrawal = withdrawalsResponse.body.data.withdrawals.find(
        (w: any) => w.id === 'test-withdrawal'
      );
      expect(testWithdrawal).toBeDefined();

      // Step 2: Get withdrawal details
      const withdrawalDetailResponse = await request(adminApp)
        .get(`/admin/withdrawals/${testWithdrawal.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(withdrawalDetailResponse.body.success).toBe(true);
      expect(withdrawalDetailResponse.body.data.withdrawal.status).toBe('pending');

      // Step 3: Approve withdrawal
      const approveResponse = await request(adminApp)
        .put(`/admin/withdrawals/${testWithdrawal.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          notes: 'Approved after verification',
          transactionId: 'bank-tx-123',
        })
        .expect(200);

      expect(approveResponse.body.success).toBe(true);
      expect(approveResponse.body.data.withdrawal.status).toBe('approved');

      // Step 4: Mark as completed
      const completeResponse = await request(adminApp)
        .put(`/admin/withdrawals/${testWithdrawal.id}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          notes: 'Payment sent successfully',
          transactionId: 'bank-tx-123',
        })
        .expect(200);

      expect(completeResponse.body.success).toBe(true);
      expect(completeResponse.body.data.withdrawal.status).toBe('completed');

      // Step 5: Verify withdrawal history
      const completedWithdrawalsResponse = await request(adminApp)
        .get('/admin/withdrawals')
        .query({ status: 'completed' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const completedWithdrawal = completedWithdrawalsResponse.body.data.withdrawals.find(
        (w: any) => w.id === 'test-withdrawal'
      );
      expect(completedWithdrawal.status).toBe('completed');
    });

    it('should handle withdrawal rejection workflow', async () => {
      // Create another test withdrawal
      const rejectionWithdrawal = {
        id: 'rejection-withdrawal',
        userId: 'test-user-2',
        amount: 1000,
        status: 'pending',
        paymentMethod: 'crypto',
        cryptoDetails: {
          walletAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          currency: 'BTC',
        },
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      };

      await admin.firestore().collection('withdrawals').doc('rejection-withdrawal').set(rejectionWithdrawal);

      // Reject withdrawal
      const rejectResponse = await request(adminApp)
        .put('/admin/withdrawals/rejection-withdrawal/reject')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Insufficient verification documents',
          notes: 'User needs to provide additional KYC documents',
        })
        .expect(200);

      expect(rejectResponse.body.success).toBe(true);
      expect(rejectResponse.body.data.withdrawal.status).toBe('rejected');

      // Verify user balance was restored (this would be handled by the service)
      const userDoc = await admin.firestore().collection('users').doc('test-user-2').get();
      if (userDoc.exists) {
        // Balance should be restored after rejection
        expect(userDoc.data()?.walletBalance).toBeGreaterThanOrEqual(1000);
      }
    });
  });

  describe('System Settings Management', () => {
    beforeEach(async () => {
      await seedWrapped({ action: 'seed' }, {
        auth: { uid: 'super-admin', token: { uid: 'super-admin' } }
      });
    });

    it('should manage system settings', async () => {
      // Step 1: Get current settings
      const settingsResponse = await request(adminApp)
        .get('/admin/settings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(settingsResponse.body.success).toBe(true);
      expect(settingsResponse.body.data.settings).toHaveProperty('system');
      expect(settingsResponse.body.data.settings).toHaveProperty('withdrawal');

      // Step 2: Update system settings
      const updateSystemResponse = await request(adminApp)
        .put('/admin/settings/system')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          registrationOpen: false,
          maintenanceMode: true,
          welcomeBonus: 100,
          maxRankLevel: 8,
        })
        .expect(200);

      expect(updateSystemResponse.body.success).toBe(true);
      expect(updateSystemResponse.body.data.settings.registrationOpen).toBe(false);
      expect(updateSystemResponse.body.data.settings.maintenanceMode).toBe(true);

      // Step 3: Update withdrawal settings
      const updateWithdrawalResponse = await request(adminApp)
        .put('/admin/settings/withdrawal')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          minAmount: 50,
          maxAmount: 5000,
          processingFee: 5,
          processingTime: '24-48 hours',
        })
        .expect(200);

      expect(updateWithdrawalResponse.body.success).toBe(true);
      expect(updateWithdrawalResponse.body.data.settings.minAmount).toBe(50);

      // Step 4: Verify settings were updated
      const verifySettingsResponse = await request(adminApp)
        .get('/admin/settings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(verifySettingsResponse.body.data.settings.system.registrationOpen).toBe(false);
      expect(verifySettingsResponse.body.data.settings.withdrawal.minAmount).toBe(50);
    });

    it('should restrict settings access to super admins', async () => {
      // Regular admin should not be able to update settings
      const unauthorizedResponse = await request(adminApp)
        .put('/admin/settings/system')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          registrationOpen: false,
        })
        .expect(403);

      expect(unauthorizedResponse.body.success).toBe(false);
      expect(unauthorizedResponse.body.error).toContain('Super admin access required');
    });
  });

  describe('Dashboard and Analytics', () => {
    beforeEach(async () => {
      await seedWrapped({ action: 'seed' }, {
        auth: { uid: 'super-admin', token: { uid: 'super-admin' } }
      });
    });

    it('should provide comprehensive admin dashboard', async () => {
      const dashboardResponse = await request(adminApp)
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(dashboardResponse.body.success).toBe(true);
      expect(dashboardResponse.body.data).toHaveProperty('statistics');
      expect(dashboardResponse.body.data).toHaveProperty('recentActivities');
      expect(dashboardResponse.body.data).toHaveProperty('systemHealth');

      const stats = dashboardResponse.body.data.statistics;
      expect(stats).toHaveProperty('totalUsers');
      expect(stats).toHaveProperty('activeUsers');
      expect(stats).toHaveProperty('totalTransactions');
      expect(stats).toHaveProperty('pendingWithdrawals');
      expect(stats).toHaveProperty('totalRevenue');

      expect(typeof stats.totalUsers).toBe('number');
      expect(typeof stats.activeUsers).toBe('number');
      expect(typeof stats.totalTransactions).toBe('number');
    });

    it('should provide analytics data', async () => {
      const analyticsResponse = await request(adminApp)
        .get('/admin/analytics')
        .query({ 
          period: '30d',
          metrics: 'users,transactions,revenue',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(analyticsResponse.body.success).toBe(true);
      expect(analyticsResponse.body.data).toHaveProperty('userGrowth');
      expect(analyticsResponse.body.data).toHaveProperty('transactionVolume');
      expect(analyticsResponse.body.data).toHaveProperty('revenueAnalysis');
    });
  });

  describe('Audit and Logging', () => {
    beforeEach(async () => {
      await seedWrapped({ action: 'seed' }, {
        auth: { uid: 'super-admin', token: { uid: 'super-admin' } }
      });
    });

    it('should track admin actions in audit log', async () => {
      // Perform an admin action
      const usersResponse = await request(adminApp)
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const testUser = usersResponse.body.data.users[0];

      await request(adminApp)
        .put(`/admin/users/${testUser.uid}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'suspended',
          notes: 'Test suspension for audit',
        })
        .expect(200);

      // Check audit logs
      const auditResponse = await request(adminApp)
        .get('/admin/audit-logs')
        .query({ 
          adminId: 'admin-user',
          action: 'user_update',
        })
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(auditResponse.body.success).toBe(true);
      expect(auditResponse.body.data.logs.length).toBeGreaterThan(0);

      const suspensionLog = auditResponse.body.data.logs.find(
        (log: any) => log.targetId === testUser.uid && log.action === 'user_update'
      );
      expect(suspensionLog).toBeDefined();
      expect(suspensionLog.adminId).toBe('admin-user');
    });

    it('should provide system logs', async () => {
      const systemLogsResponse = await request(adminApp)
        .get('/admin/system-logs')
        .query({ 
          level: 'error',
          category: 'authentication',
        })
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(systemLogsResponse.body.success).toBe(true);
      expect(Array.isArray(systemLogsResponse.body.data.logs)).toBe(true);
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(async () => {
      await seedWrapped({ action: 'seed' }, {
        auth: { uid: 'super-admin', token: { uid: 'super-admin' } }
      });
    });

    it('should handle bulk user operations', async () => {
      // Get list of users for bulk operation
      const usersResponse = await request(adminApp)
        .get('/admin/users')
        .query({ limit: 5 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const userIds = usersResponse.body.data.users.map((user: any) => user.uid);

      // Bulk status update
      const bulkUpdateResponse = await request(adminApp)
        .post('/admin/users/bulk-update')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          userIds: userIds.slice(0, 3),
          updates: {
            status: 'suspended',
            notes: 'Bulk suspension for testing',
          },
        })
        .expect(200);

      expect(bulkUpdateResponse.body.success).toBe(true);
      expect(bulkUpdateResponse.body.data.updated).toBe(3);

      // Verify bulk update
      for (const userId of userIds.slice(0, 3)) {
        const userResponse = await request(adminApp)
          .get(`/admin/users/${userId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(userResponse.body.data.user.status).toBe('suspended');
      }
    });

    it('should export user data', async () => {
      const exportResponse = await request(adminApp)
        .post('/admin/export/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          format: 'csv',
          filters: {
            status: 'active',
            dateRange: {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              end: new Date().toISOString(),
            },
          },
        })
        .expect(200);

      expect(exportResponse.body.success).toBe(true);
      expect(exportResponse.body.data).toHaveProperty('downloadUrl');
      expect(exportResponse.body.data).toHaveProperty('expiresAt');
    });
  });
});
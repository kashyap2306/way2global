/**
 * Performance Tests - Load Testing
 */

import request from 'supertest';
import * as admin from 'firebase-admin';
import { testEnv, cleanupFirestore, createMockUser, createMockRank } from '../setup';
import { signup } from '../../src/callable/signup';
import { activation } from '../../src/callable/activation';
import { userHandlers } from '../../src/handlers/userHandlers';

describe('Performance and Load Tests', () => {
  let signupWrapped: any;
  let activationWrapped: any;
  let userApp: any;

  beforeAll(() => {
    signupWrapped = testEnv.wrap(signup);
    activationWrapped = testEnv.wrap(activation);
    userApp = userHandlers;
  });

  beforeEach(async () => {
    await cleanupFirestore();
    
    // Setup basic system data
    const ranks = [
      createMockRank({ id: 'starter', name: 'Starter', level: 1, activationFee: 100 }),
      createMockRank({ id: 'bronze', name: 'Bronze', level: 2, activationFee: 500 }),
    ];

    for (const rank of ranks) {
      await admin.firestore().collection('ranks').doc(rank.id).set(rank);
    }

    await admin.firestore().collection('settings').doc('system').set({
      registrationOpen: true,
      maintenanceMode: false,
      welcomeBonus: 50,
      maxRankLevel: 10,
    });
  });

  describe('Concurrent User Signups', () => {
    it('should handle multiple concurrent signups', async () => {
      const concurrentUsers = 20;
      const startTime = Date.now();

      const signupPromises = Array(concurrentUsers).fill(null).map((_, index) => 
        signupWrapped({
          email: `concurrent${index}@example.com`,
          password: 'Password123!',
          firstName: `User${index}`,
          lastName: 'Test',
          agreeToTerms: true,
        }, { auth: null })
      );

      const results = await Promise.all(signupPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All signups should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBe(concurrentUsers);

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(30000); // 30 seconds

      console.log(`Concurrent signups: ${concurrentUsers} users in ${duration}ms`);
      console.log(`Average time per signup: ${duration / concurrentUsers}ms`);

      // Verify all users were created
      const usersSnapshot = await admin.firestore().collection('users').get();
      expect(usersSnapshot.docs.length).toBe(concurrentUsers);
    });

    it('should handle signup rate limiting gracefully', async () => {
      const rapidSignups = 50;
      const startTime = Date.now();

      const signupPromises = Array(rapidSignups).fill(null).map((_, index) => 
        signupWrapped({
          email: `rapid${index}@example.com`,
          password: 'Password123!',
          firstName: `Rapid${index}`,
          lastName: 'Test',
          agreeToTerms: true,
        }, { auth: null })
      );

      const results = await Promise.allSettled(signupPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successCount = results.filter(
        r => r.status === 'fulfilled' && (r.value as any).success
      ).length;
      const failureCount = results.filter(
        r => r.status === 'fulfilled' && !(r.value as any).success
      ).length;

      console.log(`Rapid signups: ${successCount} succeeded, ${failureCount} failed in ${duration}ms`);

      // Should have some successes and potentially some rate-limited failures
      expect(successCount).toBeGreaterThan(0);
      expect(successCount + failureCount).toBe(rapidSignups);
    });
  });

  describe('Concurrent Activations', () => {
    it('should handle multiple concurrent activations', async () => {
      const concurrentActivations = 15;
      
      // First create users
      const users = [];
      for (let i = 0; i < concurrentActivations; i++) {
        const signupResult = await signupWrapped({
          email: `activation${i}@example.com`,
          password: 'Password123!',
          firstName: `Activation${i}`,
          lastName: 'Test',
          agreeToTerms: true,
        }, { auth: null });

        expect(signupResult.success).toBe(true);
        
        // Add wallet balance
        await admin.firestore().collection('users').doc(signupResult.data.uid).update({
          walletBalance: 200,
        });

        users.push(signupResult.data.uid);
      }

      // Now perform concurrent activations
      const startTime = Date.now();
      
      const activationPromises = users.map(userId => 
        activationWrapped({
          rankId: 'starter',
          paymentMethod: 'wallet',
        }, { auth: { uid: userId, token: { uid: userId } } })
      );

      const results = await Promise.all(activationPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All activations should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBe(concurrentActivations);

      console.log(`Concurrent activations: ${concurrentActivations} users in ${duration}ms`);
      console.log(`Average time per activation: ${duration / concurrentActivations}ms`);

      // Verify all users were activated
      for (const userId of users) {
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        const userData = userDoc.data();
        expect(userData?.status).toBe('active');
        expect(userData?.isActivated).toBe(true);
      }
    });

    it('should prevent double activation attempts', async () => {
      // Create and fund user
      const signupResult = await signupWrapped({
        email: 'doubleactivation@example.com',
        password: 'Password123!',
        firstName: 'Double',
        lastName: 'Activation',
        agreeToTerms: true,
      }, { auth: null });

      const userId = signupResult.data.uid;
      await admin.firestore().collection('users').doc(userId).update({
        walletBalance: 500,
      });

      // Attempt multiple concurrent activations for same user
      const activationPromises = Array(5).fill(null).map(() => 
        activationWrapped({
          rankId: 'starter',
          paymentMethod: 'wallet',
        }, { auth: { uid: userId, token: { uid: userId } } })
      );

      const results = await Promise.all(activationPromises);
      
      // Only one should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBe(1);

      // Others should fail with appropriate error
      const failedResults = results.filter(r => !r.success);
      expect(failedResults.length).toBe(4);
      
      // Verify user balance was only deducted once
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      const userData = userDoc.data();
      expect(userData?.walletBalance).toBe(450); // 500 - 100 + 50 welcome bonus
    });
  });

  describe('API Endpoint Performance', () => {
    let testUsers: string[] = [];
    let authTokens: string[] = [];

    beforeEach(async () => {
      // Create test users for API performance tests
      const userCount = 10;
      
      for (let i = 0; i < userCount; i++) {
        const signupResult = await signupWrapped({
          email: `apitest${i}@example.com`,
          password: 'Password123!',
          firstName: `ApiTest${i}`,
          lastName: 'User',
          agreeToTerms: true,
        }, { auth: null });

        testUsers.push(signupResult.data.uid);
        authTokens.push(signupResult.data.customToken);

        // Activate users
        await admin.firestore().collection('users').doc(signupResult.data.uid).update({
          walletBalance: 200,
        });

        await activationWrapped({
          rankId: 'starter',
          paymentMethod: 'wallet',
        }, { auth: { uid: signupResult.data.uid, token: { uid: signupResult.data.uid } } });
      }
    });

    it('should handle concurrent dashboard requests', async () => {
      const concurrentRequests = 50;
      const startTime = Date.now();

      const requestPromises = Array(concurrentRequests).fill(null).map((_, index) => {
        const tokenIndex = index % authTokens.length;
        return request(userApp)
          .get('/user/dashboard')
          .set('Authorization', `Bearer ${authTokens[tokenIndex]}`)
      });

      const results = await Promise.all(requestPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      const successCount = results.filter(r => r.status === 200).length;
      expect(successCount).toBe(concurrentRequests);

      console.log(`Concurrent dashboard requests: ${concurrentRequests} requests in ${duration}ms`);
      console.log(`Average response time: ${duration / concurrentRequests}ms`);

      // Response time should be reasonable
      expect(duration / concurrentRequests).toBeLessThan(1000); // Less than 1 second average
    });

    it('should handle mixed API endpoint load', async () => {
      const totalRequests = 100;
      const startTime = Date.now();

      const endpoints = [
        '/user/dashboard',
        '/user/profile',
        '/user/referral',
        '/user/transactions',
        '/user/incomes',
      ];

      const requestPromises = Array(totalRequests).fill(null).map((_, index) => {
        const tokenIndex = index % authTokens.length;
        const endpoint = endpoints[index % endpoints.length];
        
        return request(userApp)
          .get(endpoint)
          .set('Authorization', `Bearer ${authTokens[tokenIndex]}`)
      });

      const results = await Promise.all(requestPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Count successes by endpoint
      const endpointStats: { [key: string]: { success: number; total: number } } = {};
      
      results.forEach((result, index) => {
        const endpoint = endpoints[index % endpoints.length];
        if (!endpointStats[endpoint]) {
          endpointStats[endpoint] = { success: 0, total: 0 };
        }
        endpointStats[endpoint].total++;
        if (result.status === 200) {
          endpointStats[endpoint].success++;
        }
      });

      console.log(`Mixed API load: ${totalRequests} requests in ${duration}ms`);
      console.log('Endpoint statistics:', endpointStats);

      // All endpoints should have high success rate
      Object.values(endpointStats).forEach(stats => {
        expect(stats.success / stats.total).toBeGreaterThan(0.95); // 95% success rate
      });
    });

    it('should maintain performance with large datasets', async () => {
      // Create additional data for one user to test large dataset performance
      const testUserId = testUsers[0];
      const testToken = authTokens[0];

      // Create many transactions
      const transactionPromises = Array(100).fill(null).map((_, index) => {
        const transaction = {
          id: `perf-tx-${index}`,
          userId: testUserId,
          type: index % 2 === 0 ? 'activation' : 'withdrawal',
          amount: Math.floor(Math.random() * 1000) + 100,
          status: 'completed',
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        };
        
        return admin.firestore().collection('transactions').doc(transaction.id).set(transaction);
      });

      await Promise.all(transactionPromises);

      // Create many income records
      const incomePromises = Array(50).fill(null).map((_, index) => {
        const income = {
          id: `perf-income-${index}`,
          userId: testUserId,
          type: 'referral',
          amount: Math.floor(Math.random() * 100) + 10,
          fromUserId: testUsers[1],
          createdAt: admin.firestore.Timestamp.now(),
        };
        
        return admin.firestore().collection('incomes').doc(income.id).set(income);
      });

      await Promise.all(incomePromises);

      // Test performance with large dataset
      const startTime = Date.now();

      const responses = await Promise.all([
        request(userApp).get('/user/dashboard').set('Authorization', `Bearer ${testToken}`),
        request(userApp).get('/user/transactions').set('Authorization', `Bearer ${testToken}`),
        request(userApp).get('/user/incomes').set('Authorization', `Bearer ${testToken}`),
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      console.log(`Large dataset performance: 3 complex queries in ${duration}ms`);

      // Should complete within reasonable time even with large dataset
      expect(duration).toBeLessThan(5000); // 5 seconds
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should handle memory efficiently during bulk operations', async () => {
      const bulkSize = 100;
      
      // Monitor memory usage (basic check)
      const initialMemory = process.memoryUsage();
      
      // Create bulk users
      const signupPromises = Array(bulkSize).fill(null).map((_, index) => 
        signupWrapped({
          email: `bulk${index}@example.com`,
          password: 'Password123!',
          firstName: `Bulk${index}`,
          lastName: 'User',
          agreeToTerms: true,
        }, { auth: null })
      );

      const results = await Promise.all(signupPromises);
      
      // Check memory after bulk operations
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      console.log(`Memory increase for ${bulkSize} signups: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
      
      // All operations should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBe(bulkSize);
      
      // Memory increase should be reasonable (adjust threshold as needed)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });

    it('should handle database connection pooling efficiently', async () => {
      const connectionTestCount = 50;
      
      // Perform many database operations to test connection pooling
      const dbOperations = Array(connectionTestCount).fill(null).map(async (_, index) => {
        const testDoc = {
          id: `connection-test-${index}`,
          timestamp: admin.firestore.Timestamp.now(),
          data: `Test data ${index}`,
        };
        
        // Write and read operation
        await admin.firestore().collection('test-connections').doc(testDoc.id).set(testDoc);
        const doc = await admin.firestore().collection('test-connections').doc(testDoc.id).get();
        
        return doc.exists;
      });

      const startTime = Date.now();
      const results = await Promise.all(dbOperations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All operations should succeed
      expect(results.every(result => result)).toBe(true);
      
      console.log(`Database connection test: ${connectionTestCount} operations in ${duration}ms`);
      
      // Should complete efficiently
      expect(duration / connectionTestCount).toBeLessThan(100); // Less than 100ms per operation
      
      // Cleanup test documents
      const batch = admin.firestore().batch();
      for (let i = 0; i < connectionTestCount; i++) {
        batch.delete(admin.firestore().collection('test-connections').doc(`connection-test-${i}`));
      }
      await batch.commit();
    });
  });

  describe('Error Handling Under Load', () => {
    it('should handle errors gracefully under high load', async () => {
      const errorTestCount = 30;
      
      // Mix of valid and invalid operations
      const mixedOperations = Array(errorTestCount).fill(null).map((_, index) => {
        if (index % 3 === 0) {
          // Invalid signup (should fail)
          return signupWrapped({
            email: 'invalid-email', // Invalid email
            password: 'weak', // Weak password
            firstName: 'Test',
            lastName: 'User',
            agreeToTerms: false, // Not agreed
          }, { auth: null });
        } else {
          // Valid signup (should succeed)
          return signupWrapped({
            email: `errortest${index}@example.com`,
            password: 'Password123!',
            firstName: `ErrorTest${index}`,
            lastName: 'User',
            agreeToTerms: true,
          }, { auth: null });
        }
      });

      const results = await Promise.all(mixedOperations);
      
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      console.log(`Error handling test: ${successCount} succeeded, ${errorCount} failed`);
      
      // Should have both successes and expected failures
      expect(successCount).toBeGreaterThan(0);
      expect(errorCount).toBeGreaterThan(0);
      expect(successCount + errorCount).toBe(errorTestCount);
      
      // Errors should be handled gracefully (no crashes)
      results.forEach(result => {
        expect(result).toHaveProperty('success');
        if (!result.success) {
          expect(result).toHaveProperty('error');
          expect(typeof result.error).toBe('string');
        }
      });
    });
  });
});
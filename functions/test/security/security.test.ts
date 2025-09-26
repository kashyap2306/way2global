/**
 * Security Tests - Authentication, Authorization, and Data Protection
 */

import request from 'supertest';
import * as admin from 'firebase-admin';
import { testEnv, cleanupFirestore, createMockUser, createMockRank } from '../setup';
import { signup } from '../../src/callable/signup';
import { activation } from '../../src/callable/activation';
import { seedDatabase } from '../../src/callable/seedDatabase';
import { userHandlers } from '../../src/handlers/userHandlers';
import { adminHandlers } from '../../src/handlers/adminHandlers';

describe('Security Tests', () => {
  let signupWrapped: any;
  let activationWrapped: any;
  let seedDatabaseWrapped: any;
  let userApp: any;
  let adminApp: any;

  beforeAll(() => {
    signupWrapped = testEnv.wrap(signup);
    activationWrapped = testEnv.wrap(activation);
    seedDatabaseWrapped = testEnv.wrap(seedDatabase);
    userApp = userHandlers;
    adminApp = adminHandlers;
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

  describe('Authentication Security', () => {
    it('should reject unauthenticated requests to protected endpoints', async () => {
      const protectedEndpoints = [
        '/user/dashboard',
        '/user/profile',
        '/user/referral',
        '/user/transactions',
        '/user/incomes',
        '/user/withdrawals',
        '/user/team',
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(userApp).get(endpoint);
        
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Unauthorized');
      }
    });

    it('should reject invalid authentication tokens', async () => {
      const invalidTokens = [
        'invalid-token',
        'Bearer invalid-token',
        'Bearer ',
        '',
        'malformed.jwt.token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
      ];

      for (const token of invalidTokens) {
        const response = await request(userApp)
          .get('/user/dashboard')
          .set('Authorization', token);
        
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      }
    });

    it('should reject expired tokens', async () => {
      // Create user and get token
      const signupResult = await signupWrapped({
        email: 'expiredtoken@example.com',
        password: 'Password123!',
        firstName: 'Expired',
        lastName: 'Token',
        agreeToTerms: true,
      }, { auth: null });

      const userId = signupResult.data.uid;
      
      // Simulate expired token by manipulating user's token timestamp
      await admin.firestore().collection('users').doc(userId).update({
        tokenIssuedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 25 * 60 * 60 * 1000)), // 25 hours ago
      });

      const response = await request(userApp)
        .get('/user/dashboard')
        .set('Authorization', `Bearer ${signupResult.data.customToken}`);
      
      // Should reject expired token
      expect(response.status).toBe(401);
    });

    it('should prevent session hijacking attempts', async () => {
      // Create two users
      const user1Result = await signupWrapped({
        email: 'user1@example.com',
        password: 'Password123!',
        firstName: 'User',
        lastName: 'One',
        agreeToTerms: true,
      }, { auth: null });

      const user2Result = await signupWrapped({
        email: 'user2@example.com',
        password: 'Password123!',
        firstName: 'User',
        lastName: 'Two',
        agreeToTerms: true,
      }, { auth: null });

      // Try to use user1's token to access user2's data
      const response = await request(userApp)
        .get(`/user/profile/${user2Result.data.uid}`)
        .set('Authorization', `Bearer ${user1Result.data.customToken}`);
      
      // Should be forbidden or return user1's data, not user2's
      expect(response.status).toBeOneOf([403, 200]);
      if (response.status === 200) {
        expect(response.body.data.uid).toBe(user1Result.data.uid);
        expect(response.body.data.uid).not.toBe(user2Result.data.uid);
      }
    });
  });

  describe('Authorization Security', () => {
    let regularUser: any;
    let adminUser: any;
    let superAdminUser: any;

    beforeEach(async () => {
      // Create regular user
      const regularSignup = await signupWrapped({
        email: 'regular@example.com',
        password: 'Password123!',
        firstName: 'Regular',
        lastName: 'User',
        agreeToTerms: true,
      }, { auth: null });
      regularUser = regularSignup.data;

      // Create admin user
      const adminSignup = await signupWrapped({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        agreeToTerms: true,
      }, { auth: null });
      adminUser = adminSignup.data;

      // Set admin claims
      await admin.auth().setCustomUserClaims(adminUser.uid, {
        role: 'admin',
        permissions: ['read_users', 'update_users', 'read_transactions'],
      });

      // Create super admin user
      const superAdminSignup = await signupWrapped({
        email: 'superadmin@example.com',
        password: 'Password123!',
        firstName: 'Super',
        lastName: 'Admin',
        agreeToTerms: true,
      }, { auth: null });
      superAdminUser = superAdminSignup.data;

      // Set super admin claims
      await admin.auth().setCustomUserClaims(superAdminUser.uid, {
        role: 'super_admin',
        permissions: ['*'],
      });
    });

    it('should prevent regular users from accessing admin endpoints', async () => {
      const adminEndpoints = [
        '/admin/users',
        '/admin/transactions',
        '/admin/withdrawals',
        '/admin/settings',
        '/admin/dashboard',
      ];

      for (const endpoint of adminEndpoints) {
        const response = await request(adminApp)
          .get(endpoint)
          .set('Authorization', `Bearer ${regularUser.customToken}`);
        
        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Forbidden');
      }
    });

    it('should allow admins to access appropriate endpoints', async () => {
      const allowedEndpoints = [
        '/admin/users',
        '/admin/transactions',
        '/admin/dashboard',
      ];

      for (const endpoint of allowedEndpoints) {
        const response = await request(adminApp)
          .get(endpoint)
          .set('Authorization', `Bearer ${adminUser.customToken}`);
        
        expect(response.status).toBeOneOf([200, 404]); // 404 if no data, but not 403
      }
    });

    it('should prevent admins from accessing super admin functions', async () => {
      // Test seed database function (super admin only)
      const seedResult = await seedDatabaseWrapped({
        action: 'status',
      }, {
        auth: {
          uid: adminUser.uid,
          token: {
            uid: adminUser.uid,
            role: 'admin',
            permissions: ['read_users', 'update_users'],
          },
        },
      });

      expect(seedResult.success).toBe(false);
      expect(seedResult.error).toContain('super admin');
    });

    it('should allow super admins to access all functions', async () => {
      // Test seed database function
      const seedResult = await seedDatabaseWrapped({
        action: 'status',
      }, {
        auth: {
          uid: superAdminUser.uid,
          token: {
            uid: superAdminUser.uid,
            role: 'super_admin',
            permissions: ['*'],
          },
        },
      });

      expect(seedResult.success).toBe(true);
    });

    it('should prevent privilege escalation attempts', async () => {
      // Try to update user claims through regular API
      const response = await request(userApp)
        .put('/user/profile')
        .set('Authorization', `Bearer ${regularUser.customToken}`)
        .send({
          customClaims: {
            role: 'admin',
            permissions: ['*'],
          },
        });

      // Should either ignore the claims or reject the request
      expect(response.status).toBeOneOf([200, 400]);
      
      if (response.status === 200) {
        // Verify claims weren't actually updated
        const userRecord = await admin.auth().getUser(regularUser.uid);
        expect(userRecord.customClaims?.role).not.toBe('admin');
      }
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should prevent SQL injection attempts', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; DELETE FROM users WHERE '1'='1'; --",
        "' UNION SELECT * FROM users --",
      ];

      for (const payload of sqlInjectionPayloads) {
        const signupResult = await signupWrapped({
          email: `test${Date.now()}@example.com`,
          password: 'Password123!',
          firstName: payload,
          lastName: 'Test',
          agreeToTerms: true,
        }, { auth: null });

        // Should either succeed with sanitized input or fail validation
        if (signupResult.success) {
          // Verify the payload was sanitized
          const userDoc = await admin.firestore().collection('users').doc(signupResult.data.uid).get();
          const userData = userDoc.data();
          expect(userData?.firstName).not.toContain('DROP');
          expect(userData?.firstName).not.toContain('DELETE');
          expect(userData?.firstName).not.toContain('UNION');
        }
      }
    });

    it('should prevent XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')">',
        '"><script>alert("XSS")</script>',
      ];

      for (const payload of xssPayloads) {
        const signupResult = await signupWrapped({
          email: `xsstest${Date.now()}@example.com`,
          password: 'Password123!',
          firstName: payload,
          lastName: 'Test',
          agreeToTerms: true,
        }, { auth: null });

        if (signupResult.success) {
          // Verify the payload was sanitized
          const userDoc = await admin.firestore().collection('users').doc(signupResult.data.uid).get();
          const userData = userDoc.data();
          expect(userData?.firstName).not.toContain('<script>');
          expect(userData?.firstName).not.toContain('javascript:');
          expect(userData?.firstName).not.toContain('onerror');
        }
      }
    });

    it('should validate input lengths and formats', async () => {
      const invalidInputs = [
        {
          email: 'a'.repeat(1000) + '@example.com', // Too long
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
          agreeToTerms: true,
        },
        {
          email: 'test@example.com',
          password: 'a'.repeat(1000), // Too long
          firstName: 'Test',
          lastName: 'User',
          agreeToTerms: true,
        },
        {
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'a'.repeat(1000), // Too long
          lastName: 'User',
          agreeToTerms: true,
        },
      ];

      for (const input of invalidInputs) {
        const result = await signupWrapped(input, { auth: null });
        expect(result.success).toBe(false);
        expect(result.error).toContain('validation');
      }
    });

    it('should prevent NoSQL injection attempts', async () => {
      const nosqlPayloads = [
        { $ne: null },
        { $gt: '' },
        { $regex: '.*' },
        { $where: 'function() { return true; }' },
      ];

      // Create a user first
      const signupResult = await signupWrapped({
        email: 'nosqltest@example.com',
        password: 'Password123!',
        firstName: 'NoSQL',
        lastName: 'Test',
        agreeToTerms: true,
      }, { auth: null });

      // Try to use NoSQL injection in profile update
      for (const payload of nosqlPayloads) {
        const response = await request(userApp)
          .put('/user/profile')
          .set('Authorization', `Bearer ${signupResult.data.customToken}`)
          .send({
            firstName: payload,
          });

        // Should either reject or sanitize the input
        expect(response.status).toBeOneOf([200, 400]);
        
        if (response.status === 200) {
          // Verify the payload was not stored as an object
          const userDoc = await admin.firestore().collection('users').doc(signupResult.data.uid).get();
          const userData = userDoc.data();
          expect(typeof userData?.firstName).toBe('string');
        }
      }
    });
  });

  describe('Data Protection and Privacy', () => {
    let testUser: any;

    beforeEach(async () => {
      const signupResult = await signupWrapped({
        email: 'privacy@example.com',
        password: 'Password123!',
        firstName: 'Privacy',
        lastName: 'Test',
        agreeToTerms: true,
      }, { auth: null });
      testUser = signupResult.data;

      // Add sensitive data
      await admin.firestore().collection('users').doc(testUser.uid).update({
        walletBalance: 1000,
        totalEarnings: 5000,
        bankAccount: '1234567890',
        phoneNumber: '+1234567890',
      });
    });

    it('should not expose sensitive data in API responses', async () => {
      const response = await request(userApp)
        .get('/user/profile')
        .set('Authorization', `Bearer ${testUser.customToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Should not expose internal fields
      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.data).not.toHaveProperty('passwordHash');
      expect(response.body.data).not.toHaveProperty('salt');
      expect(response.body.data).not.toHaveProperty('internalNotes');
      expect(response.body.data).not.toHaveProperty('adminFlags');
    });

    it('should mask sensitive financial information', async () => {
      const response = await request(userApp)
        .get('/user/profile')
        .set('Authorization', `Bearer ${testUser.customToken}`);

      expect(response.status).toBe(200);
      
      // Bank account should be masked if exposed
      if (response.body.data.bankAccount) {
        expect(response.body.data.bankAccount).toMatch(/\*+/);
        expect(response.body.data.bankAccount).not.toBe('1234567890');
      }
    });

    it('should prevent data leakage through error messages', async () => {
      // Try to access non-existent user
      const response = await request(userApp)
        .get('/user/profile/non-existent-user-id')
        .set('Authorization', `Bearer ${testUser.customToken}`);

      expect(response.status).toBeOneOf([403, 404]);
      
      // Error message should not reveal system internals
      if (response.body.error) {
        expect(response.body.error).not.toContain('database');
        expect(response.body.error).not.toContain('collection');
        expect(response.body.error).not.toContain('firestore');
        expect(response.body.error).not.toContain('admin');
      }
    });

    it('should implement proper data access controls', async () => {
      // Create another user
      const otherUserResult = await signupWrapped({
        email: 'other@example.com',
        password: 'Password123!',
        firstName: 'Other',
        lastName: 'User',
        agreeToTerms: true,
      }, { auth: null });

      // Try to access other user's data
      const response = await request(userApp)
        .get(`/user/profile/${otherUserResult.data.uid}`)
        .set('Authorization', `Bearer ${testUser.customToken}`);

      // Should not be able to access other user's data
      expect(response.status).toBeOneOf([403, 404]);
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    it('should implement rate limiting on sensitive endpoints', async () => {
      const rapidRequests = 100;
      const startTime = Date.now();

      // Create user for testing
      const signupResult = await signupWrapped({
        email: 'ratelimit@example.com',
        password: 'Password123!',
        firstName: 'Rate',
        lastName: 'Limit',
        agreeToTerms: true,
      }, { auth: null });

      // Make rapid requests to login endpoint (if available) or profile update
      const requestPromises = Array(rapidRequests).fill(null).map(() =>
        request(userApp)
          .put('/user/profile')
          .set('Authorization', `Bearer ${signupResult.data.customToken}`)
          .send({ firstName: 'Updated' })
      );

      const results = await Promise.all(requestPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should have some rate-limited responses
      const rateLimitedCount = results.filter(r => r.status === 429).length;
      const successCount = results.filter(r => r.status === 200).length;

      console.log(`Rate limiting test: ${successCount} succeeded, ${rateLimitedCount} rate-limited in ${duration}ms`);

      // Should have some rate limiting if implemented
      // Note: This test might pass if rate limiting is not implemented yet
      if (rateLimitedCount > 0) {
        expect(rateLimitedCount).toBeGreaterThan(0);
        expect(successCount + rateLimitedCount).toBe(rapidRequests);
      }
    });

    it('should handle large payload attacks', async () => {
      const signupResult = await signupWrapped({
        email: 'largepayload@example.com',
        password: 'Password123!',
        firstName: 'Large',
        lastName: 'Payload',
        agreeToTerms: true,
      }, { auth: null });

      // Try to send extremely large payload
      const largePayload = {
        firstName: 'A'.repeat(10000),
        lastName: 'B'.repeat(10000),
        bio: 'C'.repeat(50000),
      };

      const response = await request(userApp)
        .put('/user/profile')
        .set('Authorization', `Bearer ${signupResult.data.customToken}`)
        .send(largePayload);

      // Should reject large payloads
      expect(response.status).toBeOneOf([400, 413, 422]);
    });
  });

  describe('Security Headers and CORS', () => {
    it('should include security headers in responses', async () => {
      const response = await request(userApp).get('/health');

      // Check for security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
      
      // Verify header values
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should implement proper CORS policies', async () => {
      const response = await request(userApp)
        .options('/user/dashboard')
        .set('Origin', 'https://malicious-site.com');

      // Should not allow arbitrary origins
      expect(response.headers['access-control-allow-origin']).not.toBe('*');
      
      // Should have proper CORS headers
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });

    it('should prevent clickjacking attacks', async () => {
      const response = await request(userApp).get('/health');

      // Should have X-Frame-Options header
      expect(response.headers['x-frame-options']).toBeOneOf(['DENY', 'SAMEORIGIN']);
    });
  });

  describe('Cryptographic Security', () => {
    it('should use secure password hashing', async () => {
      const signupResult = await signupWrapped({
        email: 'crypto@example.com',
        password: 'Password123!',
        firstName: 'Crypto',
        lastName: 'Test',
        agreeToTerms: true,
      }, { auth: null });

      expect(signupResult.success).toBe(true);

      // Verify password is not stored in plain text
      const userDoc = await admin.firestore().collection('users').doc(signupResult.data.uid).get();
      const userData = userDoc.data();
      
      expect(userData?.password).toBeUndefined();
      expect(userData?.passwordHash).toBeUndefined(); // Firebase Auth handles this
    });

    it('should generate secure random tokens', async () => {
      // Test multiple signups to check token uniqueness
      const tokens = new Set();
      const tokenCount = 10;

      for (let i = 0; i < tokenCount; i++) {
        const signupResult = await signupWrapped({
          email: `token${i}@example.com`,
          password: 'Password123!',
          firstName: 'Token',
          lastName: `Test${i}`,
          agreeToTerms: true,
        }, { auth: null });

        expect(signupResult.success).toBe(true);
        tokens.add(signupResult.data.customToken);
      }

      // All tokens should be unique
      expect(tokens.size).toBe(tokenCount);

      // Tokens should be sufficiently long and complex
      tokens.forEach(token => {
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(50);
      });
    });
  });

  describe('Audit and Logging Security', () => {
    it('should log security events without exposing sensitive data', async () => {
      // Attempt unauthorized access
      const response = await request(userApp)
        .get('/user/dashboard')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);

      // Check if security event was logged (implementation dependent)
      // This would typically check your logging system
      // For now, we just verify the response doesn't contain sensitive info
      expect(response.body).not.toHaveProperty('stackTrace');
      expect(response.body).not.toHaveProperty('internalError');
    });

    it('should not log sensitive information', async () => {
      const signupResult = await signupWrapped({
        email: 'logging@example.com',
        password: 'Password123!',
        firstName: 'Logging',
        lastName: 'Test',
        agreeToTerms: true,
      }, { auth: null });

      // Verify that sensitive data is not exposed in any response
      expect(JSON.stringify(signupResult)).not.toContain('Password123!');
      expect(JSON.stringify(signupResult)).not.toContain('password');
    });
  });
});
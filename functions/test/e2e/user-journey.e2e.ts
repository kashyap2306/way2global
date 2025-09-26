/**
 * End-to-End Tests - Complete User Journey
 */

import request from 'supertest';
import * as admin from 'firebase-admin';
import { testEnv, cleanupFirestore, createMockRank } from '../setup';
import { signup } from '../../src/callable/signup';
import { activation } from '../../src/callable/activation';
import { userHandlers } from '../../src/handlers/userHandlers';

describe('Complete User Journey E2E', () => {
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
    
    // Setup system data
    const ranks = [
      createMockRank({ id: 'starter', name: 'Starter', level: 1, activationFee: 100, benefits: { directReferralBonus: 10 } }),
      createMockRank({ id: 'bronze', name: 'Bronze', level: 2, activationFee: 500, benefits: { directReferralBonus: 25 } }),
      createMockRank({ id: 'silver', name: 'Silver', level: 3, activationFee: 1000, benefits: { directReferralBonus: 50 } }),
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

  describe('New User Complete Journey', () => {
    it('should complete full user lifecycle: signup -> activation -> team building -> income generation', async () => {
      // Step 1: User Signup
      const signupData = {
        email: 'newuser@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        country: 'US',
        agreeToTerms: true,
      };

      const signupResult = await signupWrapped(signupData, { auth: null });
      expect(signupResult.success).toBe(true);
      
      const userId = signupResult.data.uid;
      const customToken = signupResult.data.customToken;

      // Verify user was created properly
      expect(signupResult.data.user.email).toBe(signupData.email);
      expect(signupResult.data.user.status).toBe('inactive');
      expect(signupResult.data.user.isActivated).toBe(false);

      // Step 2: Add funds to wallet (simulate payment)
      await admin.firestore().collection('users').doc(userId).update({
        walletBalance: 200, // Enough for starter activation
      });

      // Step 3: User Dashboard (before activation)
      const dashboardResponse1 = await request(userApp)
        .get('/user/dashboard')
        .set('Authorization', `Bearer ${customToken}`)
        .expect(200);

      expect(dashboardResponse1.body.data.user.status).toBe('inactive');
      expect(dashboardResponse1.body.data.balances.wallet).toBe(200);

      // Step 4: User Activation
      const activationData = {
        rankId: 'starter',
        paymentMethod: 'wallet',
      };

      const activationResult = await activationWrapped(activationData, {
        auth: { uid: userId, token: { uid: userId } }
      });

      expect(activationResult.success).toBe(true);
      expect(activationResult.data.user.status).toBe('active');
      expect(activationResult.data.user.isActivated).toBe(true);
      expect(activationResult.data.user.currentRank).toBe('starter');

      // Step 5: User Dashboard (after activation)
      const dashboardResponse2 = await request(userApp)
        .get('/user/dashboard')
        .set('Authorization', `Bearer ${customToken}`)
        .expect(200);

      expect(dashboardResponse2.body.data.user.status).toBe('active');
      expect(dashboardResponse2.body.data.user.currentRank).toBe('starter');
      expect(dashboardResponse2.body.data.balances.wallet).toBe(150); // 200 - 100 + 50 welcome bonus

      // Step 6: Check Referral System
      const referralResponse = await request(userApp)
        .get('/user/referral')
        .set('Authorization', `Bearer ${customToken}`)
        .expect(200);

      expect(referralResponse.body.data.referralLink).toContain(userId);
      expect(referralResponse.body.data.directReferrals).toHaveLength(0);

      // Step 7: Create Referral (simulate another user joining under this user)
      const referralSignupData = {
        email: 'referral@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Smith',
        sponsorId: userId,
        agreeToTerms: true,
      };

      const referralSignupResult = await signupWrapped(referralSignupData, { auth: null });
      expect(referralSignupResult.success).toBe(true);

      const referralUserId = referralSignupResult.data.uid;

      // Add funds and activate referral
      await admin.firestore().collection('users').doc(referralUserId).update({
        walletBalance: 200,
      });

      const referralActivationResult = await activationWrapped(activationData, {
        auth: { uid: referralUserId, token: { uid: referralUserId } }
      });

      expect(referralActivationResult.success).toBe(true);

      // Step 8: Check Updated Referral System
      const updatedReferralResponse = await request(userApp)
        .get('/user/referral')
        .set('Authorization', `Bearer ${customToken}`)
        .expect(200);

      expect(updatedReferralResponse.body.data.directReferrals).toHaveLength(1);
      expect(updatedReferralResponse.body.data.directReferrals[0].email).toBe('referral@example.com');

      // Step 9: Check Income Generation
      const incomeResponse = await request(userApp)
        .get('/user/incomes')
        .set('Authorization', `Bearer ${customToken}`)
        .expect(200);

      expect(incomeResponse.body.data.incomes.length).toBeGreaterThan(0);
      expect(incomeResponse.body.data.statistics.totalIncome).toBeGreaterThan(0);

      // Step 10: Check Updated Dashboard with Income
      const finalDashboardResponse = await request(userApp)
        .get('/user/dashboard')
        .set('Authorization', `Bearer ${customToken}`)
        .expect(200);

      expect(finalDashboardResponse.body.data.statistics.directReferrals).toBe(1);
      expect(finalDashboardResponse.body.data.statistics.totalTeamSize).toBeGreaterThan(0);
      expect(finalDashboardResponse.body.data.balances.wallet).toBeGreaterThan(150); // Should have received referral bonus

      // Step 11: Team Structure
      const teamResponse = await request(userApp)
        .get('/user/team')
        .set('Authorization', `Bearer ${customToken}`)
        .expect(200);

      expect(teamResponse.body.data.statistics.totalMembers).toBe(1);
      expect(teamResponse.body.data.teamStructure).toBeDefined();

      // Step 12: Transaction History
      const transactionResponse = await request(userApp)
        .get('/user/transactions')
        .set('Authorization', `Bearer ${customToken}`)
        .expect(200);

      expect(transactionResponse.body.data.transactions.length).toBeGreaterThan(0);
      const activationTx = transactionResponse.body.data.transactions.find(
        (tx: any) => tx.type === 'activation'
      );
      expect(activationTx).toBeDefined();
      expect(activationTx.amount).toBe(100);
      expect(activationTx.status).toBe('completed');
    });
  });

  describe('Multi-Level Team Building Journey', () => {
    it('should handle complex team structure with multiple levels', async () => {
      // Create root user
      const rootSignupResult = await signupWrapped({
        email: 'root@example.com',
        password: 'Password123!',
        firstName: 'Root',
        lastName: 'User',
        agreeToTerms: true,
      }, { auth: null });

      const rootUserId = rootSignupResult.data.uid;
      const rootToken = rootSignupResult.data.customToken;

      // Activate root user
      await admin.firestore().collection('users').doc(rootUserId).update({
        walletBalance: 1000,
      });

      await activationWrapped({
        rankId: 'bronze',
        paymentMethod: 'wallet',
      }, { auth: { uid: rootUserId, token: { uid: rootUserId } } });

      // Create level 1 users (direct referrals)
      const level1Users = [];
      for (let i = 0; i < 3; i++) {
        const userResult = await signupWrapped({
          email: `level1-${i}@example.com`,
          password: 'Password123!',
          firstName: `Level1`,
          lastName: `User${i}`,
          sponsorId: rootUserId,
          agreeToTerms: true,
        }, { auth: null });

        level1Users.push(userResult.data.uid);

        // Activate level 1 user
        await admin.firestore().collection('users').doc(userResult.data.uid).update({
          walletBalance: 200,
        });

        await activationWrapped({
          rankId: 'starter',
          paymentMethod: 'wallet',
        }, { auth: { uid: userResult.data.uid, token: { uid: userResult.data.uid } } });
      }

      // Create level 2 users (referrals of level 1 users)
      for (let i = 0; i < level1Users.length; i++) {
        for (let j = 0; j < 2; j++) {
          const userResult = await signupWrapped({
            email: `level2-${i}-${j}@example.com`,
            password: 'Password123!',
            firstName: `Level2`,
            lastName: `User${i}${j}`,
            sponsorId: level1Users[i],
            agreeToTerms: true,
          }, { auth: null });

          // Activate level 2 user
          await admin.firestore().collection('users').doc(userResult.data.uid).update({
            walletBalance: 200,
          });

          await activationWrapped({
            rankId: 'starter',
            paymentMethod: 'wallet',
          }, { auth: { uid: userResult.data.uid, token: { uid: userResult.data.uid } } });
        }
      }

      // Check root user's team structure
      const teamResponse = await request(userApp)
        .get('/user/team')
        .query({ level: 3 })
        .set('Authorization', `Bearer ${rootToken}`)
        .expect(200);

      expect(teamResponse.body.data.statistics.totalMembers).toBe(9); // 3 level1 + 6 level2
      expect(teamResponse.body.data.statistics.activeMembers).toBe(9); // All activated

      // Check root user's income from multi-level structure
      const incomeResponse = await request(userApp)
        .get('/user/incomes')
        .set('Authorization', `Bearer ${rootToken}`)
        .expect(200);

      expect(incomeResponse.body.data.incomes.length).toBeGreaterThan(0);
      
      // Should have both direct referral income and level income
      const referralIncomes = incomeResponse.body.data.incomes.filter(
        (income: any) => income.type === 'referral'
      );
      const levelIncomes = incomeResponse.body.data.incomes.filter(
        (income: any) => income.type === 'level'
      );

      expect(referralIncomes.length).toBe(3); // From 3 direct referrals
      expect(levelIncomes.length).toBeGreaterThan(0); // From level 2 activations

      // Check final dashboard
      const dashboardResponse = await request(userApp)
        .get('/user/dashboard')
        .set('Authorization', `Bearer ${rootToken}`)
        .expect(200);

      expect(dashboardResponse.body.data.statistics.directReferrals).toBe(3);
      expect(dashboardResponse.body.data.statistics.totalTeamSize).toBe(9);
      expect(dashboardResponse.body.data.statistics.totalBusinessVolume).toBeGreaterThan(0);
    });
  });

  describe('Rank Progression Journey', () => {
    it('should handle user rank progression through team building', async () => {
      // Create user
      const signupResult = await signupWrapped({
        email: 'progression@example.com',
        password: 'Password123!',
        firstName: 'Progress',
        lastName: 'User',
        agreeToTerms: true,
      }, { auth: null });

      const userId = signupResult.data.uid;
      const customToken = signupResult.data.customToken;

      // Start with starter rank
      await admin.firestore().collection('users').doc(userId).update({
        walletBalance: 2000, // Enough for multiple upgrades
      });

      await activationWrapped({
        rankId: 'starter',
        paymentMethod: 'wallet',
      }, { auth: { uid: userId, token: { uid: userId } } });

      // Check initial rank
      let dashboardResponse = await request(userApp)
        .get('/user/dashboard')
        .set('Authorization', `Bearer ${customToken}`)
        .expect(200);

      expect(dashboardResponse.body.data.user.currentRank).toBe('starter');
      expect(dashboardResponse.body.data.rank.name).toBe('Starter');

      // Upgrade to bronze
      await activationWrapped({
        rankId: 'bronze',
        paymentMethod: 'wallet',
      }, { auth: { uid: userId, token: { uid: userId } } });

      // Check bronze rank
      dashboardResponse = await request(userApp)
        .get('/user/dashboard')
        .set('Authorization', `Bearer ${customToken}`)
        .expect(200);

      expect(dashboardResponse.body.data.user.currentRank).toBe('bronze');
      expect(dashboardResponse.body.data.rank.name).toBe('Bronze');
      expect(dashboardResponse.body.data.nextRank.name).toBe('Silver');

      // Upgrade to silver
      await activationWrapped({
        rankId: 'silver',
        paymentMethod: 'wallet',
      }, { auth: { uid: userId, token: { uid: userId } } });

      // Check silver rank
      dashboardResponse = await request(userApp)
        .get('/user/dashboard')
        .set('Authorization', `Bearer ${customToken}`)
        .expect(200);

      expect(dashboardResponse.body.data.user.currentRank).toBe('silver');
      expect(dashboardResponse.body.data.rank.name).toBe('Silver');

      // Check transaction history shows all upgrades
      const transactionResponse = await request(userApp)
        .get('/user/transactions')
        .set('Authorization', `Bearer ${customToken}`)
        .expect(200);

      const activationTxs = transactionResponse.body.data.transactions.filter(
        (tx: any) => tx.type === 'activation'
      );

      expect(activationTxs).toHaveLength(3); // starter, bronze, silver
      expect(activationTxs.map((tx: any) => tx.amount).sort()).toEqual([100, 500, 1000]);
    });
  });

  describe('Error Recovery Journey', () => {
    it('should handle and recover from various error scenarios', async () => {
      // Test signup with invalid data, then correct it
      let signupResult = await signupWrapped({
        email: 'invalid-email', // Invalid email
        password: 'weak', // Weak password
        firstName: 'Test',
        lastName: 'User',
        agreeToTerms: false, // Not agreed to terms
      }, { auth: null });

      expect(signupResult.success).toBe(false);

      // Correct the data and try again
      signupResult = await signupWrapped({
        email: 'valid@example.com',
        password: 'StrongPassword123!',
        firstName: 'Test',
        lastName: 'User',
        agreeToTerms: true,
      }, { auth: null });

      expect(signupResult.success).toBe(true);

      const userId = signupResult.data.uid;
      const customToken = signupResult.data.customToken;

      // Try activation without sufficient funds
      let activationResult = await activationWrapped({
        rankId: 'starter',
        paymentMethod: 'wallet',
      }, { auth: { uid: userId, token: { uid: userId } } });

      expect(activationResult.success).toBe(false);
      expect(activationResult.error).toContain('Insufficient wallet balance');

      // Add funds and try again
      await admin.firestore().collection('users').doc(userId).update({
        walletBalance: 200,
      });

      activationResult = await activationWrapped({
        rankId: 'starter',
        paymentMethod: 'wallet',
      }, { auth: { uid: userId, token: { uid: userId } } });

      expect(activationResult.success).toBe(true);

      // Try to activate to same rank again (should fail)
      const duplicateActivationResult = await activationWrapped({
        rankId: 'starter',
        paymentMethod: 'wallet',
      }, { auth: { uid: userId, token: { uid: userId } } });

      expect(duplicateActivationResult.success).toBe(false);
      expect(duplicateActivationResult.error).toContain('already activated');

      // Verify user state is still correct after errors
      const dashboardResponse = await request(userApp)
        .get('/user/dashboard')
        .set('Authorization', `Bearer ${customToken}`)
        .expect(200);

      expect(dashboardResponse.body.data.user.status).toBe('active');
      expect(dashboardResponse.body.data.user.currentRank).toBe('starter');
    });
  });

  describe('Concurrent Operations Journey', () => {
    it('should handle concurrent user operations safely', async () => {
      // Create user
      const signupResult = await signupWrapped({
        email: 'concurrent@example.com',
        password: 'Password123!',
        firstName: 'Concurrent',
        lastName: 'User',
        agreeToTerms: true,
      }, { auth: null });

      const userId = signupResult.data.uid;
      const customToken = signupResult.data.customToken;

      await admin.firestore().collection('users').doc(userId).update({
        walletBalance: 500,
      });

      // Try concurrent activations (should only succeed once)
      const activationPromises = Array(3).fill(null).map(() =>
        activationWrapped({
          rankId: 'starter',
          paymentMethod: 'wallet',
        }, { auth: { uid: userId, token: { uid: userId } } })
      );

      const activationResults = await Promise.all(activationPromises);
      const successCount = activationResults.filter(r => r.success).length;
      expect(successCount).toBe(1);

      // Try concurrent dashboard requests (should all succeed)
      const dashboardPromises = Array(5).fill(null).map(() =>
        request(userApp)
          .get('/user/dashboard')
          .set('Authorization', `Bearer ${customToken}`)
      );

      const dashboardResults = await Promise.all(dashboardPromises);
      dashboardResults.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Verify final state is consistent
      const finalDashboard = await request(userApp)
        .get('/user/dashboard')
        .set('Authorization', `Bearer ${customToken}`)
        .expect(200);

      expect(finalDashboard.body.data.user.status).toBe('active');
      expect(finalDashboard.body.data.user.currentRank).toBe('starter');
    });
  });
});
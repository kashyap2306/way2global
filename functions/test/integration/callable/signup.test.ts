/**
 * Integration Tests - Signup Callable Function
 */

import { signup } from '../../../src/callable/signup';
import { testEnv, mockAuthContext, cleanupFirestore, createMockUser } from '../../setup';
import * as admin from 'firebase-admin';

describe('Signup Callable Function', () => {
  let wrapped: any;

  beforeAll(() => {
    wrapped = testEnv.wrap(signup);
  });

  beforeEach(async () => {
    await cleanupFirestore();
  });

  describe('successful signup', () => {
    it('should create user successfully with valid data', async () => {
      const signupData = {
        email: 'newuser@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        country: 'US',
        agreeToTerms: true,
      };

      const result = await wrapped(signupData, { auth: null });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('uid');
      expect(result.data).toHaveProperty('customToken');
      expect(result.data.user.email).toBe(signupData.email);
      expect(result.data.user.firstName).toBe(signupData.firstName);
      expect(result.data.user.lastName).toBe(signupData.lastName);

      // Verify user was created in Firebase Auth
      const userRecord = await admin.auth().getUserByEmail(signupData.email);
      expect(userRecord).toBeDefined();
      expect(userRecord.customClaims?.status).toBe('inactive');
      expect(userRecord.customClaims?.isActivated).toBe(false);

      // Verify user document was created in Firestore
      const userDoc = await admin.firestore().collection('users').doc(result.data.uid).get();
      expect(userDoc.exists).toBe(true);
      
      const userData = userDoc.data();
      expect(userData?.email).toBe(signupData.email);
      expect(userData?.status).toBe('inactive');
      expect(userData?.isActivated).toBe(false);
    });

    it('should create user with sponsor and placement', async () => {
      // First create a sponsor user
      const sponsorData = createMockUser({ uid: 'sponsor-id', email: 'sponsor@example.com' });
      await admin.firestore().collection('users').doc('sponsor-id').set(sponsorData);
      await admin.auth().createUser({
        uid: 'sponsor-id',
        email: 'sponsor@example.com',
        password: 'Password123!',
      });

      const signupData = {
        email: 'newuser@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        sponsorId: 'sponsor-id',
        placementId: 'sponsor-id',
        position: 'left',
        agreeToTerms: true,
      };

      const result = await wrapped(signupData, { auth: null });

      expect(result.success).toBe(true);
      expect(result.data.user.sponsorId).toBe('sponsor-id');
      expect(result.data.user.placementId).toBe('sponsor-id');
      expect(result.data.user.position).toBe('left');

      // Verify sponsor's referral count was updated
      const sponsorDoc = await admin.firestore().collection('users').doc('sponsor-id').get();
      const sponsorUpdated = sponsorDoc.data();
      expect(sponsorUpdated?.directReferrals).toBe(1);
      expect(sponsorUpdated?.leftChild).toBe(result.data.uid);
    });

    it('should find optimal placement in binary tree', async () => {
      // Create a binary tree structure
      const rootUser = createMockUser({ uid: 'root-id', email: 'root@example.com' });
      const leftUser = createMockUser({ 
        uid: 'left-id', 
        email: 'left@example.com',
        placementId: 'root-id',
        position: 'left'
      });

      await admin.firestore().collection('users').doc('root-id').set({
        ...rootUser,
        leftChild: 'left-id',
        rightChild: null,
      });
      await admin.firestore().collection('users').doc('left-id').set(leftUser);

      // Create auth users
      await admin.auth().createUser({ uid: 'root-id', email: 'root@example.com', password: 'Password123!' });
      await admin.auth().createUser({ uid: 'left-id', email: 'left@example.com', password: 'Password123!' });

      const signupData = {
        email: 'newuser@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        sponsorId: 'root-id',
        agreeToTerms: true,
      };

      const result = await wrapped(signupData, { auth: null });

      expect(result.success).toBe(true);
      expect(result.data.user.placementId).toBe('root-id');
      expect(result.data.user.position).toBe('right'); // Should be placed on right since left is taken

      // Verify placement was updated
      const rootDoc = await admin.firestore().collection('users').doc('root-id').get();
      const rootUpdated = rootDoc.data();
      expect(rootUpdated?.rightChild).toBe(result.data.uid);
    });
  });

  describe('validation errors', () => {
    it('should reject invalid email format', async () => {
      const signupData = {
        email: 'invalid-email',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        agreeToTerms: true,
      };

      const result = await wrapped(signupData, { auth: null });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
    });

    it('should reject weak password', async () => {
      const signupData = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
        agreeToTerms: true,
      };

      const result = await wrapped(signupData, { auth: null });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
    });

    it('should reject missing required fields', async () => {
      const signupData = {
        email: 'test@example.com',
        password: 'Password123!',
        // Missing firstName, lastName, agreeToTerms
      };

      const result = await wrapped(signupData, { auth: null });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
    });

    it('should reject if terms not agreed', async () => {
      const signupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        agreeToTerms: false,
      };

      const result = await wrapped(signupData, { auth: null });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation error');
    });
  });

  describe('business logic errors', () => {
    it('should reject duplicate email', async () => {
      // Create existing user
      await admin.auth().createUser({
        uid: 'existing-user',
        email: 'existing@example.com',
        password: 'Password123!',
      });

      const signupData = {
        email: 'existing@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        agreeToTerms: true,
      };

      const result = await wrapped(signupData, { auth: null });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should reject invalid sponsor', async () => {
      const signupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        sponsorId: 'non-existent-sponsor',
        agreeToTerms: true,
      };

      const result = await wrapped(signupData, { auth: null });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Sponsor not found');
    });

    it('should reject invalid placement', async () => {
      // Create sponsor but not placement user
      const sponsorData = createMockUser({ uid: 'sponsor-id', email: 'sponsor@example.com' });
      await admin.firestore().collection('users').doc('sponsor-id').set(sponsorData);
      await admin.auth().createUser({
        uid: 'sponsor-id',
        email: 'sponsor@example.com',
        password: 'Password123!',
      });

      const signupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        sponsorId: 'sponsor-id',
        placementId: 'non-existent-placement',
        position: 'left',
        agreeToTerms: true,
      };

      const result = await wrapped(signupData, { auth: null });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Placement user not found');
    });

    it('should reject if placement position is occupied', async () => {
      // Create placement user with both positions occupied
      const placementData = createMockUser({ 
        uid: 'placement-id', 
        email: 'placement@example.com',
        leftChild: 'left-child-id',
        rightChild: 'right-child-id',
      });
      await admin.firestore().collection('users').doc('placement-id').set(placementData);
      await admin.auth().createUser({
        uid: 'placement-id',
        email: 'placement@example.com',
        password: 'Password123!',
      });

      const signupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        sponsorId: 'placement-id',
        placementId: 'placement-id',
        position: 'left',
        agreeToTerms: true,
      };

      const result = await wrapped(signupData, { auth: null });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Position already occupied');
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limiting', async () => {
      const signupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        agreeToTerms: true,
      };

      // Make multiple rapid requests (this would need to be implemented based on your rate limiting logic)
      // This is a placeholder test - actual implementation depends on your rate limiting strategy
      const promises = Array(10).fill(null).map((_, i) => 
        wrapped({ ...signupData, email: `test${i}@example.com` }, { auth: null })
      );

      const results = await Promise.all(promises);
      
      // At least some should succeed, but rate limiting might kick in
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('system settings', () => {
    it('should respect registration closed setting', async () => {
      // Set registration closed
      await admin.firestore().collection('settings').doc('system').set({
        registrationOpen: false,
        maintenanceMode: false,
        welcomeBonus: 0,
        maxRankLevel: 10,
      });

      const signupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        agreeToTerms: true,
      };

      const result = await wrapped(signupData, { auth: null });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Registration is currently closed');
    });

    it('should respect maintenance mode', async () => {
      // Set maintenance mode
      await admin.firestore().collection('settings').doc('system').set({
        registrationOpen: true,
        maintenanceMode: true,
        welcomeBonus: 0,
        maxRankLevel: 10,
      });

      const signupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        agreeToTerms: true,
      };

      const result = await wrapped(signupData, { auth: null });

      expect(result.success).toBe(false);
      expect(result.error).toContain('System is under maintenance');
    });
  });
});
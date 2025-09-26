/**
 * Unit Tests - Validation Service
 */

import { ValidationService, validationSchemas } from '../../../src/services/validationService';
import { UserStatus, PaymentMethod } from '../../../src/types';

describe('ValidationService', () => {
  describe('validate', () => {
    it('should validate user signup data correctly', () => {
      const validSignupData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        country: 'US',
        sponsorId: 'abcdefghijklmnopqrstuvwxyz12',
        agreeToTerms: true,
      };

      const result = ValidationService.validate(
        validationSchemas.userSignup,
        validSignupData
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors for invalid signup data', () => {
      const invalidSignupData = {
        email: 'invalid-email',
        password: 'weak',
        firstName: '',
        lastName: 'D',
        phone: 'invalid-phone',
        country: 'USA', // should be 2 characters
        agreeToTerms: false,
      };

      const result = ValidationService.validate(
        validationSchemas.userSignup,
        invalidSignupData
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'email')).toBe(true);
      expect(result.errors.some(e => e.field === 'password')).toBe(true);
      expect(result.errors.some(e => e.field === 'firstName')).toBe(true);
    });

    it('should validate activation data correctly', () => {
      const validActivationData = {
        rankId: 'starter',
        paymentMethod: PaymentMethod.USDT_BEP20,
        paymentDetails: {
          walletAddress: '0x1234567890123456789012345678901234567890',
          transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        },
        autoTopup: false,
      };

      const result = ValidationService.validate(
        validationSchemas.activation,
        validActivationData
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate withdrawal data correctly', () => {
      const validWithdrawalData = {
        amount: 100.50,
        method: PaymentMethod.USDT_BEP20,
        paymentDetails: {
          walletAddress: '0x1234567890123456789012345678901234567890',
        },
        password: 'Password123!',
      };

      const result = ValidationService.validate(
        validationSchemas.withdrawal,
        validWithdrawalData
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(ValidationService.isValidEmail('test@example.com')).toBe(true);
      expect(ValidationService.isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(ValidationService.isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(ValidationService.isValidEmail('invalid-email')).toBe(false);
      expect(ValidationService.isValidEmail('test@')).toBe(false);
      expect(ValidationService.isValidEmail('@example.com')).toBe(false);
      expect(ValidationService.isValidEmail('test..test@example.com')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should validate correct phone formats', () => {
      expect(ValidationService.isValidPhone('+1234567890')).toBe(true);
      expect(ValidationService.isValidPhone('1234567890')).toBe(true);
      expect(ValidationService.isValidPhone('+44123456789')).toBe(true);
    });

    it('should reject invalid phone formats', () => {
      expect(ValidationService.isValidPhone('123')).toBe(false);
      expect(ValidationService.isValidPhone('abc123456789')).toBe(false);
      expect(ValidationService.isValidPhone('+123456789012345678')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('should validate strong passwords', () => {
      expect(ValidationService.isValidPassword('Password123!')).toBe(true);
      expect(ValidationService.isValidPassword('MyStr0ng@Pass')).toBe(true);
      expect(ValidationService.isValidPassword('C0mplex#Password')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(ValidationService.isValidPassword('password')).toBe(false); // no uppercase, number, special char
      expect(ValidationService.isValidPassword('PASSWORD')).toBe(false); // no lowercase, number, special char
      expect(ValidationService.isValidPassword('Password')).toBe(false); // no number, special char
      expect(ValidationService.isValidPassword('Pass123')).toBe(false); // no special char
      expect(ValidationService.isValidPassword('Pass!')).toBe(false); // no number, too short
    });
  });

  describe('isValidWalletAddress', () => {
    it('should validate correct wallet addresses', () => {
      expect(ValidationService.isValidWalletAddress('0x1234567890123456789012345678901234567890')).toBe(true);
      expect(ValidationService.isValidWalletAddress('0xabcdefABCDEF1234567890123456789012345678')).toBe(true);
    });

    it('should reject invalid wallet addresses', () => {
      expect(ValidationService.isValidWalletAddress('1234567890123456789012345678901234567890')).toBe(false); // no 0x prefix
      expect(ValidationService.isValidWalletAddress('0x123456789012345678901234567890123456789')).toBe(false); // too short
      expect(ValidationService.isValidWalletAddress('0x12345678901234567890123456789012345678901')).toBe(false); // too long
      expect(ValidationService.isValidWalletAddress('0xGHIJKL7890123456789012345678901234567890')).toBe(false); // invalid characters
    });
  });

  describe('isValidUID', () => {
    it('should validate correct UIDs', () => {
      expect(ValidationService.isValidUID('abcdefghijklmnopqrstuvwxyz12')).toBe(true);
      expect(ValidationService.isValidUID('1234567890abcdefghijklmnop')).toBe(true);
    });

    it('should reject invalid UIDs', () => {
      expect(ValidationService.isValidUID('short')).toBe(false); // too short
      expect(ValidationService.isValidUID('abcdefghijklmnopqrstuvwxyz123')).toBe(false); // too long
      expect(ValidationService.isValidUID('abcdefghijklmnopqrstuvwxyz!@')).toBe(false); // special characters
    });
  });

  describe('isValidAmount', () => {
    it('should validate correct amounts', () => {
      expect(ValidationService.isValidAmount(100)).toBe(true);
      expect(ValidationService.isValidAmount(0.01)).toBe(true);
      expect(ValidationService.isValidAmount(999999.99)).toBe(true);
    });

    it('should reject invalid amounts', () => {
      expect(ValidationService.isValidAmount(0)).toBe(false); // zero
      expect(ValidationService.isValidAmount(-100)).toBe(false); // negative
      expect(ValidationService.isValidAmount(100.001)).toBe(false); // too many decimal places
    });
  });

  describe('sanitizeString', () => {
    it('should sanitize string input', () => {
      expect(ValidationService.sanitizeString('  hello world  ')).toBe('hello world');
      expect(ValidationService.sanitizeString('test<script>alert("xss")</script>')).toBe('testscriptalert("xss")/script');
      expect(ValidationService.sanitizeString('normal text')).toBe('normal text');
    });
  });

  describe('sanitizeUserInput', () => {
    it('should sanitize nested object input', () => {
      const input = {
        name: '  John Doe  ',
        email: 'test@example.com',
        profile: {
          bio: '<script>alert("xss")</script>',
          age: 25,
        },
      };

      const result = ValidationService.sanitizeUserInput(input);

      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('test@example.com');
      expect(result.profile.bio).toBe('scriptalert("xss")/script');
      expect(result.profile.age).toBe(25);
    });
  });

  describe('canUserPerformAction', () => {
    it('should allow active users to perform all actions', () => {
      expect(ValidationService.canUserPerformAction(UserStatus.ACTIVE, 'withdraw')).toBe(true);
      expect(ValidationService.canUserPerformAction(UserStatus.ACTIVE, 'activate')).toBe(true);
      expect(ValidationService.canUserPerformAction(UserStatus.ACTIVE, 'refer')).toBe(true);
    });

    it('should restrict inactive users to specific actions', () => {
      expect(ValidationService.canUserPerformAction(UserStatus.INACTIVE, 'login')).toBe(true);
      expect(ValidationService.canUserPerformAction(UserStatus.INACTIVE, 'activate')).toBe(true);
      expect(ValidationService.canUserPerformAction(UserStatus.INACTIVE, 'withdraw')).toBe(false);
    });

    it('should restrict suspended users to view-only actions', () => {
      expect(ValidationService.canUserPerformAction(UserStatus.SUSPENDED, 'login')).toBe(true);
      expect(ValidationService.canUserPerformAction(UserStatus.SUSPENDED, 'view')).toBe(true);
      expect(ValidationService.canUserPerformAction(UserStatus.SUSPENDED, 'withdraw')).toBe(false);
      expect(ValidationService.canUserPerformAction(UserStatus.SUSPENDED, 'activate')).toBe(false);
    });

    it('should block all actions for blocked users', () => {
      expect(ValidationService.canUserPerformAction(UserStatus.BLOCKED, 'login')).toBe(false);
      expect(ValidationService.canUserPerformAction(UserStatus.BLOCKED, 'view')).toBe(false);
      expect(ValidationService.canUserPerformAction(UserStatus.BLOCKED, 'withdraw')).toBe(false);
    });
  });

  describe('validateBusinessRules', () => {
    describe('canActivateToRank', () => {
      it('should allow activation to next rank level', () => {
        const rankLevels = { starter: 1, bronze: 2, silver: 3 };
        
        expect(ValidationService.validateBusinessRules.canActivateToRank(
          'starter', 'bronze', rankLevels
        )).toBe(true);
        
        expect(ValidationService.validateBusinessRules.canActivateToRank(
          'bronze', 'silver', rankLevels
        )).toBe(true);
      });

      it('should not allow skipping rank levels', () => {
        const rankLevels = { starter: 1, bronze: 2, silver: 3 };
        
        expect(ValidationService.validateBusinessRules.canActivateToRank(
          'starter', 'silver', rankLevels
        )).toBe(false);
      });

      it('should not allow downgrading ranks', () => {
        const rankLevels = { starter: 1, bronze: 2, silver: 3 };
        
        expect(ValidationService.validateBusinessRules.canActivateToRank(
          'silver', 'bronze', rankLevels
        )).toBe(false);
      });
    });

    describe('isWithdrawalAmountValid', () => {
      it('should validate withdrawal within limits', () => {
        expect(ValidationService.validateBusinessRules.isWithdrawalAmountValid(
          100, 10, 1000, 500, 0
        )).toBe(true);
        
        expect(ValidationService.validateBusinessRules.isWithdrawalAmountValid(
          200, 10, 1000, 500, 200
        )).toBe(true); // exactly at daily limit
      });

      it('should reject withdrawal below minimum', () => {
        expect(ValidationService.validateBusinessRules.isWithdrawalAmountValid(
          5, 10, 1000, 500, 0
        )).toBe(false);
      });

      it('should reject withdrawal above maximum', () => {
        expect(ValidationService.validateBusinessRules.isWithdrawalAmountValid(
          1500, 10, 1000, 2000, 0
        )).toBe(false);
      });

      it('should reject withdrawal exceeding daily limit', () => {
        expect(ValidationService.validateBusinessRules.isWithdrawalAmountValid(
          300, 10, 1000, 500, 300
        )).toBe(false);
      });
    });

    describe('hasSufficientBalance', () => {
      it('should validate sufficient balance', () => {
        expect(ValidationService.validateBusinessRules.hasSufficientBalance(
          100, 500
        )).toBe(true);
        
        expect(ValidationService.validateBusinessRules.hasSufficientBalance(
          500, 500
        )).toBe(true); // exactly equal
      });

      it('should reject insufficient balance', () => {
        expect(ValidationService.validateBusinessRules.hasSufficientBalance(
          600, 500
        )).toBe(false);
      });
    });

    describe('canRefer', () => {
      it('should allow active and activated users to refer', () => {
        expect(ValidationService.validateBusinessRules.canRefer(
          UserStatus.ACTIVE, true
        )).toBe(true);
      });

      it('should not allow inactive users to refer', () => {
        expect(ValidationService.validateBusinessRules.canRefer(
          UserStatus.INACTIVE, true
        )).toBe(false);
      });

      it('should not allow unactivated users to refer', () => {
        expect(ValidationService.validateBusinessRules.canRefer(
          UserStatus.ACTIVE, false
        )).toBe(false);
      });
    });
  });
});
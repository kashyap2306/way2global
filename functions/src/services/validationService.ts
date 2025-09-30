/**
 * Validation Service
 * Centralized validation schemas and functions
 */

import * as Joi from 'joi';
import { 
  UserStatus, 
  TransactionType, 
  PaymentMethod, 
  WithdrawalStatus,
  ValidationResult,
  ValidationError
} from '../types';

// ============================================================================
// COMMON VALIDATION PATTERNS
// ============================================================================

const emailPattern = Joi.string().email().required();
const phonePattern = Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional();
const passwordPattern = Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required();
const uidPattern = Joi.string().alphanum().length(28).required();
const amountPattern = Joi.number().positive().precision(2).required();
const walletAddressPattern = Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional();

// ============================================================================
// USER VALIDATION SCHEMAS
// ============================================================================

export const userSignupSchema = Joi.object({
  email: emailPattern,
  password: passwordPattern,
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  phone: phonePattern,
  country: Joi.string().length(2).uppercase().optional(),
  sponsorId: Joi.string().alphanum().length(28).optional(),
  placementId: Joi.string().alphanum().length(28).optional(),
  position: Joi.string().valid('left', 'right').when('placementId', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  agreeToTerms: Joi.boolean().valid(true).required()
});

export const userProfileUpdateSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  phone: phonePattern,
  country: Joi.string().length(2).uppercase().optional(),
  avatar: Joi.string().uri().optional(),
  bio: Joi.string().max(500).optional(),
  dateOfBirth: Joi.date().max('now').optional(),
  address: Joi.object({
    street: Joi.string().max(100).optional(),
    city: Joi.string().max(50).optional(),
    state: Joi.string().max(50).optional(),
    zipCode: Joi.string().max(20).optional(),
    country: Joi.string().length(2).uppercase().optional()
  }).optional(),
  socialLinks: Joi.object({
    facebook: Joi.string().uri().optional(),
    twitter: Joi.string().uri().optional(),
    linkedin: Joi.string().uri().optional(),
    instagram: Joi.string().uri().optional()
  }).optional(),
  preferences: Joi.object({
    language: Joi.string().length(2).lowercase().optional(),
    timezone: Joi.string().optional(),
    currency: Joi.string().length(3).uppercase().optional()
  }).optional()
});

export const userLoginSchema = Joi.object({
  email: emailPattern,
  password: Joi.string().required()
});

export const passwordResetSchema = Joi.object({
  email: emailPattern
});

export const passwordChangeSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: passwordPattern,
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
});

// ============================================================================
// TRANSACTION VALIDATION SCHEMAS
// ============================================================================

export const activationSchema = Joi.object({
  rankId: Joi.string().required(),
  paymentMethod: Joi.string().valid(...Object.values(PaymentMethod)).required(),
  paymentDetails: Joi.when('paymentMethod', {
    switch: [
      {
        is: PaymentMethod.USDT_BEP20,
        then: Joi.object({
          walletAddress: walletAddressPattern.required(),
          transactionHash: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required()
        }).required()
      },
      {
        is: PaymentMethod.FUND_CONVERSION,
        then: Joi.object({
          fromBalance: Joi.string().valid('available', 'pending').default('available')
        }).optional()
      },
      {
        is: PaymentMethod.P2P,
        then: Joi.object({
          fromUserId: uidPattern.required(),
          reference: Joi.string().max(100).optional()
        }).required()
      }
    ]
  }),
  autoTopup: Joi.boolean().default(false)
});

export const withdrawalSchema = Joi.object({
  amount: amountPattern,
  method: Joi.string().valid(...Object.values(PaymentMethod)).required(),
  paymentDetails: Joi.when('method', {
    switch: [
      {
        is: PaymentMethod.USDT_BEP20,
        then: Joi.object({
          walletAddress: walletAddressPattern.required()
        }).required()
      },
      {
        is: PaymentMethod.FUND_CONVERSION,
        then: Joi.object({
          toBalance: Joi.string().valid('pending').default('pending')
        }).optional()
      },
      {
        is: PaymentMethod.P2P,
        then: Joi.object({
          toUserId: uidPattern.required(),
          reference: Joi.string().max(100).optional()
        }).required()
      }
    ]
  }),
  password: Joi.string().required()
});

export const payoutClaimSchema = Joi.object({
  payoutId: Joi.string().required(),
  password: Joi.string().required()
});

// ============================================================================
// ADMIN VALIDATION SCHEMAS
// ============================================================================

export const adminUserUpdateSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  phone: phonePattern,
  country: Joi.string().length(2).uppercase().optional(),
  status: Joi.string().valid(...Object.values(UserStatus)).optional(),
  currentRank: Joi.string().optional(),
  autoTopup: Joi.boolean().optional(),
  customClaims: Joi.object({
    admin: Joi.boolean().optional(),
    superAdmin: Joi.boolean().optional()
  }).optional(),
  notes: Joi.string().max(1000).optional()
});

export const adminWithdrawalActionSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required(),
  notes: Joi.string().max(500).optional(),
  rejectionReason: Joi.when('action', {
    is: 'reject',
    then: Joi.string().required(),
    otherwise: Joi.optional()
  })
});

export const adminSettingsUpdateSchema = Joi.object({
  withdrawal: Joi.object({
    minAmount: Joi.number().positive().optional(),
    maxAmount: Joi.number().positive().optional(),
    dailyLimit: Joi.number().positive().optional(),
    processingFee: Joi.number().min(0).max(100).optional(),
    processingTime: Joi.string().optional()
  }).optional(),
  income: Joi.object({
    referralBonus: Joi.number().min(0).max(100).optional(),
    levelBonuses: Joi.array().items(Joi.number().min(0).max(100)).optional(),
    globalPoolPercentage: Joi.number().min(0).max(100).optional()
    // reTopupBonus removed - re-topup system removed
  }).optional(),
  globalCycle: Joi.object({
    participantLimit: Joi.number().integer().positive().optional(),
    poolDistribution: Joi.array().items(Joi.number().min(0).max(100)).optional(),
    autoProcessing: Joi.boolean().optional(),
    processingInterval: Joi.number().integer().positive().optional()
  }).optional(),
  system: Joi.object({
    maintenanceMode: Joi.boolean().optional(),
    registrationOpen: Joi.boolean().optional(),
    welcomeBonus: Joi.number().min(0).optional(),
    maxRankLevel: Joi.number().integer().positive().optional()
  }).optional()
});

// ============================================================================
// QUERY VALIDATION SCHEMAS
// ============================================================================

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

export const userListQuerySchema = paginationSchema.keys({
  search: Joi.string().min(2).optional(),
  status: Joi.string().valid(...Object.values(UserStatus)).optional(),
  rank: Joi.string().optional(),
  country: Joi.string().length(2).uppercase().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional()
});

export const transactionListQuerySchema = paginationSchema.keys({
  type: Joi.string().valid(...Object.values(TransactionType)).optional(),
  status: Joi.string().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  minAmount: Joi.number().positive().optional(),
  maxAmount: Joi.number().positive().optional()
});

export const withdrawalListQuerySchema = paginationSchema.keys({
  status: Joi.string().valid(...Object.values(WithdrawalStatus)).optional(),
  method: Joi.string().valid(...Object.values(PaymentMethod)).optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  minAmount: Joi.number().positive().optional(),
  maxAmount: Joi.number().positive().optional()
});

export const teamQuerySchema = Joi.object({
  level: Joi.number().integer().min(1).max(5).default(3),
  includeInactive: Joi.boolean().default(false)
});

// ============================================================================
// VALIDATION SERVICE CLASS
// ============================================================================

export class ValidationService {
  /**
   * Validate data against a Joi schema
   */
  static validate<T>(schema: Joi.ObjectSchema, data: any): ValidationResult {
    const { error } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors: ValidationError[] = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        code: detail.type
      }));

      return {
        isValid: false,
        errors
      };
    }

    return {
      isValid: true,
      errors: []
    };
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const { error } = emailPattern.validate(email);
    return !error;
  }

  /**
   * Validate phone number format
   */
  static isValidPhone(phone: string): boolean {
    const { error } = phonePattern.validate(phone);
    return !error;
  }

  /**
   * Validate password strength
   */
  static isValidPassword(password: string): boolean {
    const { error } = passwordPattern.validate(password);
    return !error;
  }

  /**
   * Validate wallet address format
   */
  static isValidWalletAddress(address: string): boolean {
    const { error } = walletAddressPattern.validate(address);
    return !error;
  }

  /**
   * Validate UID format
   */
  static isValidUID(uid: string): boolean {
    const { error } = uidPattern.validate(uid);
    return !error;
  }

  /**
   * Validate amount format
   */
  static isValidAmount(amount: number): boolean {
    const { error } = amountPattern.validate(amount);
    return !error;
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Validate and sanitize user input
   */
  static sanitizeUserInput(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeUserInput(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Check if user can perform action based on status
   */
  static canUserPerformAction(userStatus: UserStatus, action: string): boolean {
    const allowedActions: Record<UserStatus, string[]> = {
      [UserStatus.ACTIVE]: ['all'],
      [UserStatus.INACTIVE]: ['login', 'activate'],
      [UserStatus.SUSPENDED]: ['login', 'view'],
      [UserStatus.BLOCKED]: []
    };

    const userAllowedActions = allowedActions[userStatus] || [];
    return userAllowedActions.includes('all') || userAllowedActions.includes(action);
  }

  /**
   * Validate business rules
   */
  static validateBusinessRules = {
    /**
     * Check if user can activate to specific rank
     */
    canActivateToRank: (currentRank: string, targetRank: string, rankLevels: Record<string, number>): boolean => {
      const currentLevel = rankLevels[currentRank] || 0;
      const targetLevel = rankLevels[targetRank] || 0;
      return targetLevel === currentLevel + 1;
    },

    /**
     * Check if withdrawal amount is within limits
     */
    isWithdrawalAmountValid: (amount: number, minAmount: number, maxAmount: number, dailyLimit: number, todayWithdrawn: number): boolean => {
      return amount >= minAmount && 
             amount <= maxAmount && 
             (todayWithdrawn + amount) <= dailyLimit;
    },

    /**
     * Check if user has sufficient balance
     */
    hasSufficientBalance: (requiredAmount: number, availableBalance: number): boolean => {
      return availableBalance >= requiredAmount;
    },

    /**
     * Check if user can refer others
     */
    canRefer: (userStatus: UserStatus, isActivated: boolean): boolean => {
      return userStatus === UserStatus.ACTIVE && isActivated;
    }
  };
}

// ============================================================================
// EXPORT VALIDATION SCHEMAS AND SERVICE
// ============================================================================

export const validationSchemas = {
  // User schemas
  userSignup: userSignupSchema,
  userProfileUpdate: userProfileUpdateSchema,
  userLogin: userLoginSchema,
  passwordReset: passwordResetSchema,
  passwordChange: passwordChangeSchema,

  // Transaction schemas
  activation: activationSchema,
  withdrawal: withdrawalSchema,
  payoutClaim: payoutClaimSchema,

  // Admin schemas
  adminUserUpdate: adminUserUpdateSchema,
  adminWithdrawalAction: adminWithdrawalActionSchema,
  adminSettingsUpdate: adminSettingsUpdateSchema,

  // Query schemas
  pagination: paginationSchema,
  userListQuery: userListQuerySchema,
  transactionListQuery: transactionListQuerySchema,
  withdrawalListQuery: withdrawalListQuerySchema,
  teamQuery: teamQuerySchema
};

export default ValidationService;
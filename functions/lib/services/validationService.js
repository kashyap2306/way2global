"use strict";
/**
 * Validation Service
 * Centralized validation schemas and functions
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationSchemas = exports.ValidationService = exports.teamQuerySchema = exports.withdrawalListQuerySchema = exports.transactionListQuerySchema = exports.userListQuerySchema = exports.paginationSchema = exports.adminSettingsUpdateSchema = exports.adminWithdrawalActionSchema = exports.adminUserUpdateSchema = exports.payoutClaimSchema = exports.withdrawalSchema = exports.activationSchema = exports.passwordChangeSchema = exports.passwordResetSchema = exports.userLoginSchema = exports.userProfileUpdateSchema = exports.userSignupSchema = void 0;
const Joi = __importStar(require("joi"));
const types_1 = require("../types");
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
exports.userSignupSchema = Joi.object({
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
exports.userProfileUpdateSchema = Joi.object({
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
        currency: Joi.string().length(3).uppercase().optional(),
        notifications: Joi.object({
            email: Joi.boolean().optional(),
            sms: Joi.boolean().optional(),
            push: Joi.boolean().optional()
        }).optional()
    }).optional()
});
exports.userLoginSchema = Joi.object({
    email: emailPattern,
    password: Joi.string().required()
});
exports.passwordResetSchema = Joi.object({
    email: emailPattern
});
exports.passwordChangeSchema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: passwordPattern,
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
});
// ============================================================================
// TRANSACTION VALIDATION SCHEMAS
// ============================================================================
exports.activationSchema = Joi.object({
    rankId: Joi.string().required(),
    paymentMethod: Joi.string().valid(...Object.values(types_1.PaymentMethod)).required(),
    paymentDetails: Joi.when('paymentMethod', {
        switch: [
            {
                is: types_1.PaymentMethod.USDT_BEP20,
                then: Joi.object({
                    walletAddress: walletAddressPattern.required(),
                    transactionHash: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required()
                }).required()
            },
            {
                is: types_1.PaymentMethod.FUND_CONVERSION,
                then: Joi.object({
                    fromBalance: Joi.string().valid('available', 'pending').default('available')
                }).optional()
            },
            {
                is: types_1.PaymentMethod.P2P,
                then: Joi.object({
                    fromUserId: uidPattern.required(),
                    reference: Joi.string().max(100).optional()
                }).required()
            }
        ]
    }),
    autoTopup: Joi.boolean().default(false)
});
exports.withdrawalSchema = Joi.object({
    amount: amountPattern,
    method: Joi.string().valid(...Object.values(types_1.PaymentMethod)).required(),
    paymentDetails: Joi.when('method', {
        switch: [
            {
                is: types_1.PaymentMethod.USDT_BEP20,
                then: Joi.object({
                    walletAddress: walletAddressPattern.required()
                }).required()
            },
            {
                is: types_1.PaymentMethod.FUND_CONVERSION,
                then: Joi.object({
                    toBalance: Joi.string().valid('pending').default('pending')
                }).optional()
            },
            {
                is: types_1.PaymentMethod.P2P,
                then: Joi.object({
                    toUserId: uidPattern.required(),
                    reference: Joi.string().max(100).optional()
                }).required()
            }
        ]
    }),
    password: Joi.string().required()
});
exports.payoutClaimSchema = Joi.object({
    payoutId: Joi.string().required(),
    password: Joi.string().required()
});
// ============================================================================
// ADMIN VALIDATION SCHEMAS
// ============================================================================
exports.adminUserUpdateSchema = Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    phone: phonePattern,
    country: Joi.string().length(2).uppercase().optional(),
    status: Joi.string().valid(...Object.values(types_1.UserStatus)).optional(),
    currentRank: Joi.string().optional(),
    autoTopup: Joi.boolean().optional(),
    notifications: Joi.boolean().optional(),
    customClaims: Joi.object({
        admin: Joi.boolean().optional(),
        superAdmin: Joi.boolean().optional()
    }).optional(),
    notes: Joi.string().max(1000).optional()
});
exports.adminWithdrawalActionSchema = Joi.object({
    action: Joi.string().valid('approve', 'reject').required(),
    notes: Joi.string().max(500).optional(),
    rejectionReason: Joi.when('action', {
        is: 'reject',
        then: Joi.string().required(),
        otherwise: Joi.optional()
    })
});
exports.adminSettingsUpdateSchema = Joi.object({
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
        globalPoolPercentage: Joi.number().min(0).max(100).optional(),
        reTopupBonus: Joi.number().min(0).max(100).optional()
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
exports.paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});
exports.userListQuerySchema = exports.paginationSchema.keys({
    search: Joi.string().min(2).optional(),
    status: Joi.string().valid(...Object.values(types_1.UserStatus)).optional(),
    rank: Joi.string().optional(),
    country: Joi.string().length(2).uppercase().optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional()
});
exports.transactionListQuerySchema = exports.paginationSchema.keys({
    type: Joi.string().valid(...Object.values(types_1.TransactionType)).optional(),
    status: Joi.string().optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
    minAmount: Joi.number().positive().optional(),
    maxAmount: Joi.number().positive().optional()
});
exports.withdrawalListQuerySchema = exports.paginationSchema.keys({
    status: Joi.string().valid(...Object.values(types_1.WithdrawalStatus)).optional(),
    method: Joi.string().valid(...Object.values(types_1.PaymentMethod)).optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
    minAmount: Joi.number().positive().optional(),
    maxAmount: Joi.number().positive().optional()
});
exports.teamQuerySchema = Joi.object({
    level: Joi.number().integer().min(1).max(5).default(3),
    includeInactive: Joi.boolean().default(false)
});
// ============================================================================
// VALIDATION SERVICE CLASS
// ============================================================================
class ValidationService {
    /**
     * Validate data against a Joi schema
     */
    static validate(schema, data) {
        const { error } = schema.validate(data, {
            abortEarly: false,
            stripUnknown: true,
            convert: true
        });
        if (error) {
            const errors = error.details.map(detail => ({
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
    static isValidEmail(email) {
        const { error } = emailPattern.validate(email);
        return !error;
    }
    /**
     * Validate phone number format
     */
    static isValidPhone(phone) {
        const { error } = phonePattern.validate(phone);
        return !error;
    }
    /**
     * Validate password strength
     */
    static isValidPassword(password) {
        const { error } = passwordPattern.validate(password);
        return !error;
    }
    /**
     * Validate wallet address format
     */
    static isValidWalletAddress(address) {
        const { error } = walletAddressPattern.validate(address);
        return !error;
    }
    /**
     * Validate UID format
     */
    static isValidUID(uid) {
        const { error } = uidPattern.validate(uid);
        return !error;
    }
    /**
     * Validate amount format
     */
    static isValidAmount(amount) {
        const { error } = amountPattern.validate(amount);
        return !error;
    }
    /**
     * Sanitize string input
     */
    static sanitizeString(input) {
        return input.trim().replace(/[<>]/g, '');
    }
    /**
     * Validate and sanitize user input
     */
    static sanitizeUserInput(data) {
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                sanitized[key] = this.sanitizeString(value);
            }
            else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeUserInput(value);
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    /**
     * Check if user can perform action based on status
     */
    static canUserPerformAction(userStatus, action) {
        const allowedActions = {
            [types_1.UserStatus.ACTIVE]: ['all'],
            [types_1.UserStatus.INACTIVE]: ['login', 'activate'],
            [types_1.UserStatus.SUSPENDED]: ['login', 'view'],
            [types_1.UserStatus.BLOCKED]: []
        };
        const userAllowedActions = allowedActions[userStatus] || [];
        return userAllowedActions.includes('all') || userAllowedActions.includes(action);
    }
}
exports.ValidationService = ValidationService;
/**
 * Validate business rules
 */
ValidationService.validateBusinessRules = {
    /**
     * Check if user can activate to specific rank
     */
    canActivateToRank: (currentRank, targetRank, rankLevels) => {
        const currentLevel = rankLevels[currentRank] || 0;
        const targetLevel = rankLevels[targetRank] || 0;
        return targetLevel === currentLevel + 1;
    },
    /**
     * Check if withdrawal amount is within limits
     */
    isWithdrawalAmountValid: (amount, minAmount, maxAmount, dailyLimit, todayWithdrawn) => {
        return amount >= minAmount &&
            amount <= maxAmount &&
            (todayWithdrawn + amount) <= dailyLimit;
    },
    /**
     * Check if user has sufficient balance
     */
    hasSufficientBalance: (requiredAmount, availableBalance) => {
        return availableBalance >= requiredAmount;
    },
    /**
     * Check if user can refer others
     */
    canRefer: (userStatus, isActivated) => {
        return userStatus === types_1.UserStatus.ACTIVE && isActivated;
    }
};
// ============================================================================
// EXPORT VALIDATION SCHEMAS AND SERVICE
// ============================================================================
exports.validationSchemas = {
    // User schemas
    userSignup: exports.userSignupSchema,
    userProfileUpdate: exports.userProfileUpdateSchema,
    userLogin: exports.userLoginSchema,
    passwordReset: exports.passwordResetSchema,
    passwordChange: exports.passwordChangeSchema,
    // Transaction schemas
    activation: exports.activationSchema,
    withdrawal: exports.withdrawalSchema,
    payoutClaim: exports.payoutClaimSchema,
    // Admin schemas
    adminUserUpdate: exports.adminUserUpdateSchema,
    adminWithdrawalAction: exports.adminWithdrawalActionSchema,
    adminSettingsUpdate: exports.adminSettingsUpdateSchema,
    // Query schemas
    pagination: exports.paginationSchema,
    userListQuery: exports.userListQuerySchema,
    transactionListQuery: exports.transactionListQuerySchema,
    withdrawalListQuery: exports.withdrawalListQuerySchema,
    teamQuery: exports.teamQuerySchema
};
exports.default = ValidationService;
//# sourceMappingURL=validationService.js.map
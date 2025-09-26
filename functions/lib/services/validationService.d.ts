/**
 * Validation Service
 * Centralized validation schemas and functions
 */
import * as Joi from 'joi';
import { UserStatus, ValidationResult } from '../types';
export declare const userSignupSchema: Joi.ObjectSchema<any>;
export declare const userProfileUpdateSchema: Joi.ObjectSchema<any>;
export declare const userLoginSchema: Joi.ObjectSchema<any>;
export declare const passwordResetSchema: Joi.ObjectSchema<any>;
export declare const passwordChangeSchema: Joi.ObjectSchema<any>;
export declare const activationSchema: Joi.ObjectSchema<any>;
export declare const withdrawalSchema: Joi.ObjectSchema<any>;
export declare const payoutClaimSchema: Joi.ObjectSchema<any>;
export declare const adminUserUpdateSchema: Joi.ObjectSchema<any>;
export declare const adminWithdrawalActionSchema: Joi.ObjectSchema<any>;
export declare const adminSettingsUpdateSchema: Joi.ObjectSchema<any>;
export declare const paginationSchema: Joi.ObjectSchema<any>;
export declare const userListQuerySchema: Joi.ObjectSchema<any>;
export declare const transactionListQuerySchema: Joi.ObjectSchema<any>;
export declare const withdrawalListQuerySchema: Joi.ObjectSchema<any>;
export declare const teamQuerySchema: Joi.ObjectSchema<any>;
export declare class ValidationService {
    /**
     * Validate data against a Joi schema
     */
    static validate<T>(schema: Joi.ObjectSchema, data: any): ValidationResult;
    /**
     * Validate email format
     */
    static isValidEmail(email: string): boolean;
    /**
     * Validate phone number format
     */
    static isValidPhone(phone: string): boolean;
    /**
     * Validate password strength
     */
    static isValidPassword(password: string): boolean;
    /**
     * Validate wallet address format
     */
    static isValidWalletAddress(address: string): boolean;
    /**
     * Validate UID format
     */
    static isValidUID(uid: string): boolean;
    /**
     * Validate amount format
     */
    static isValidAmount(amount: number): boolean;
    /**
     * Sanitize string input
     */
    static sanitizeString(input: string): string;
    /**
     * Validate and sanitize user input
     */
    static sanitizeUserInput(data: Record<string, any>): Record<string, any>;
    /**
     * Check if user can perform action based on status
     */
    static canUserPerformAction(userStatus: UserStatus, action: string): boolean;
    /**
     * Validate business rules
     */
    static validateBusinessRules: {
        /**
         * Check if user can activate to specific rank
         */
        canActivateToRank: (currentRank: string, targetRank: string, rankLevels: Record<string, number>) => boolean;
        /**
         * Check if withdrawal amount is within limits
         */
        isWithdrawalAmountValid: (amount: number, minAmount: number, maxAmount: number, dailyLimit: number, todayWithdrawn: number) => boolean;
        /**
         * Check if user has sufficient balance
         */
        hasSufficientBalance: (requiredAmount: number, availableBalance: number) => boolean;
        /**
         * Check if user can refer others
         */
        canRefer: (userStatus: UserStatus, isActivated: boolean) => boolean;
    };
}
export declare const validationSchemas: {
    userSignup: Joi.ObjectSchema<any>;
    userProfileUpdate: Joi.ObjectSchema<any>;
    userLogin: Joi.ObjectSchema<any>;
    passwordReset: Joi.ObjectSchema<any>;
    passwordChange: Joi.ObjectSchema<any>;
    activation: Joi.ObjectSchema<any>;
    withdrawal: Joi.ObjectSchema<any>;
    payoutClaim: Joi.ObjectSchema<any>;
    adminUserUpdate: Joi.ObjectSchema<any>;
    adminWithdrawalAction: Joi.ObjectSchema<any>;
    adminSettingsUpdate: Joi.ObjectSchema<any>;
    pagination: Joi.ObjectSchema<any>;
    userListQuery: Joi.ObjectSchema<any>;
    transactionListQuery: Joi.ObjectSchema<any>;
    withdrawalListQuery: Joi.ObjectSchema<any>;
    teamQuery: Joi.ObjectSchema<any>;
};
export default ValidationService;
//# sourceMappingURL=validationService.d.ts.map
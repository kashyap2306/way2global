"use strict";
/**
 * HTTP Handlers - Authentication
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authHandlers = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const Joi = __importStar(require("joi"));
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
const logger = (0, logger_1.createLogger)('AuthHandlers');
// Create Express app
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)(config_1.corsOptions));
app.use(express_1.default.json({ limit: '10mb' }));
// Rate limiting
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.rateLimits.login.windowMs,
    max: config_1.rateLimits.login.max,
    message: {
        error: 'Too many authentication attempts',
        retryAfter: config_1.rateLimits.login.windowMs / 1000
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/auth', authLimiter);
// Validation schemas
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});
const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required()
});
const resetPasswordSchema = Joi.object({
    email: Joi.string().email().required()
});
const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().min(6).required(),
    newPassword: Joi.string().min(6).required()
});
/**
 * POST /auth/login
 * Authenticate user with email and password
 */
app.post('/auth/login', async (req, res) => {
    try {
        // Validate input
        const { error, value } = loginSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.details[0].message
            });
            return;
        }
        const { email } = value;
        await logger.info(logger_1.LogCategory.AUTH, 'Login attempt', undefined, { email, ip: req.ip });
        // Get user by email
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(email);
        }
        catch (authError) {
            if (authError.code === 'auth/user-not-found') {
                res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
                return;
            }
            throw authError;
        }
        // Get user data from Firestore
        const userDoc = await admin.firestore()
            .collection(config_1.collections.USERS)
            .doc(userRecord.uid)
            .get();
        if (!userDoc.exists) {
            res.status(401).json({
                success: false,
                error: 'User profile not found'
            });
            return;
        }
        const userData = userDoc.data();
        // Check if account is disabled
        if (userRecord.disabled) {
            res.status(403).json({
                success: false,
                error: 'Account has been disabled'
            });
            return;
        }
        // In a real implementation, you would verify the password here
        // For Firebase Auth, password verification is typically done on the client side
        // This endpoint is mainly for additional server-side validation and logging
        // Create custom token with additional claims
        const customClaims = {
            role: userData?.status === 'active' ? 'user' : 'inactive',
            status: userData?.status || 'active',
            rank: userData?.rank || 'Azurite'
        };
        // Update custom claims
        await admin.auth().setCustomUserClaims(userRecord.uid, customClaims);
        // Create custom token
        const customToken = await admin.auth().createCustomToken(userRecord.uid, customClaims);
        // Update last login time
        await admin.firestore()
            .collection(config_1.collections.USERS)
            .doc(userRecord.uid)
            .update({
            lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        await logger.info(logger_1.LogCategory.AUTH, 'Login successful', userRecord.uid, { email });
        res.json({
            success: true,
            message: config_1.successMessages.LOGIN_SUCCESS,
            data: {
                uid: userRecord.uid,
                email: userRecord.email,
                customToken,
                user: {
                    uid: userRecord.uid,
                    displayName: userData?.displayName,
                    email: userData?.email,
                    rank: userData?.rank,
                    status: userData?.status,
                    balance: userData?.balance || 0,
                    totalEarnings: userData?.totalEarnings || 0,
                    referrals: userData?.referrals || []
                }
            }
        });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.AUTH, 'Login failed', error, undefined, { email: req.body.email, ip: req.ip });
        res.status(500).json({
            success: false,
            error: config_1.errorCodes.LOGIN_FAILED,
            message: 'Login failed. Please try again.'
        });
        return;
    }
});
/**
 * POST /auth/refresh
 * Refresh user token and get updated user data
 */
app.post('/auth/refresh', async (req, res) => {
    try {
        // Validate input
        const { error, value } = refreshTokenSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.details[0].message
            });
            return;
        }
        const { refreshToken } = value;
        // Verify the refresh token (this would typically be a JWT or session token)
        // For this example, we'll assume it's a Firebase ID token
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(refreshToken);
        }
        catch (tokenError) {
            res.status(401).json({
                success: false,
                error: 'Invalid refresh token'
            });
            return;
        }
        const uid = decodedToken.uid;
        // Get fresh user data
        const userDoc = await admin.firestore().collection(config_1.collections.USERS).doc(uid).get();
        if (!userDoc.exists) {
            res.status(404).json({
                success: false,
                error: 'User profile not found'
            });
            return;
        }
        const userData = userDoc.data();
        // Update custom claims with fresh data
        const customClaims = {
            role: userData?.isActive ? 'user' : 'inactive',
            isActive: userData?.isActive || false,
            rank: userData?.rank || 'Inactive',
            isVerified: userData?.isVerified || false
        };
        await admin.auth().setCustomUserClaims(uid, customClaims);
        // Create new custom token
        const customToken = await admin.auth().createCustomToken(uid, customClaims);
        await logger.info(logger_1.LogCategory.AUTH, 'Token refreshed', uid);
        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                uid,
                customToken,
                user: {
                    uid,
                    fullName: userData?.fullName,
                    email: userData?.email,
                    rank: userData?.rank,
                    isActive: userData?.isActive,
                    isVerified: userData?.isVerified,
                    availableBalance: userData?.availableBalance || 0,
                    totalEarnings: userData?.totalEarnings || 0
                }
            }
        });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.AUTH, 'Token refresh failed', error, undefined, { ip: req.ip });
        res.status(500).json({
            success: false,
            error: 'Token refresh failed'
        });
        return;
    }
});
/**
 * POST /auth/logout
 * Logout user and revoke tokens
 */
app.post('/auth/logout', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'Authorization header required'
            });
            return;
        }
        const idToken = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
        }
        catch (tokenError) {
            res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
            return;
        }
        const uid = decodedToken.uid;
        // Revoke all refresh tokens for the user
        await admin.auth().revokeRefreshTokens(uid);
        await logger.info(logger_1.LogCategory.AUTH, 'User logged out', uid);
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.AUTH, 'Logout failed', error, undefined, { ip: req.ip });
        res.status(500).json({
            success: false,
            error: 'Logout failed'
        });
        return;
    }
});
/**
 * POST /auth/reset-password
 * Send password reset email
 */
app.post('/auth/reset-password', async (req, res) => {
    try {
        // Validate input
        const { error, value } = resetPasswordSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.details[0].message
            });
            return;
        }
        const { email } = value;
        // Check if user exists
        try {
            await admin.auth().getUserByEmail(email);
        }
        catch (authError) {
            if (authError.code === 'auth/user-not-found') {
                // Don't reveal if email exists or not for security
                res.json({
                    success: true,
                    message: 'If the email exists, a password reset link has been sent.'
                });
                return;
            }
            throw authError;
        }
        // Generate password reset link
        const resetLink = await admin.auth().generatePasswordResetLink(email);
        // In a real implementation, you would send this via email service
        // For now, we'll just log it
        await logger.info(logger_1.LogCategory.AUTH, 'Password reset requested', undefined, { email, resetLink });
        res.json({
            success: true,
            message: 'Password reset link has been sent to your email.'
        });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.AUTH, 'Password reset failed', error, undefined, { email: req.body.email, ip: req.ip });
        res.status(500).json({
            success: false,
            error: 'Password reset failed'
        });
    }
});
/**
 * POST /auth/change-password
 * Change user password (requires authentication)
 */
app.post('/auth/change-password', async (req, res) => {
    try {
        // Verify authentication
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'Authorization header required'
            });
            return;
        }
        const idToken = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
        }
        catch (tokenError) {
            res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
            return;
        }
        // Validate input
        const { error, value } = changePasswordSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.details[0].message
            });
            return;
        }
        const { newPassword } = value;
        const uid = decodedToken.uid;
        // In a real implementation, you would verify the current password
        // For Firebase Auth, password changes are typically done on the client side
        // This endpoint is for additional server-side validation and logging
        // Update password
        await admin.auth().updateUser(uid, {
            password: newPassword
        });
        // Revoke all refresh tokens to force re-authentication
        await admin.auth().revokeRefreshTokens(uid);
        await logger.info(logger_1.LogCategory.AUTH, 'Password changed', uid);
        res.json({
            success: true,
            message: 'Password changed successfully. Please log in again.'
        });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.AUTH, 'Password change failed', error, req.body.uid || 'unknown', { ip: req.ip });
        res.status(500).json({
            success: false,
            error: 'Password change failed'
        });
    }
});
/**
 * GET /auth/verify-token
 * Verify token and return user info
 */
app.get('/auth/verify-token', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'Authorization header required'
            });
            return;
        }
        const idToken = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
        }
        catch (tokenError) {
            res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
            return;
        }
        const uid = decodedToken.uid;
        // Get user data
        const userDoc = await admin.firestore()
            .collection(config_1.collections.USERS)
            .doc(uid)
            .get();
        if (!userDoc.exists) {
            res.status(404).json({
                success: false,
                error: 'User profile not found'
            });
            return;
        }
        const userData = userDoc.data();
        res.json({
            success: true,
            data: {
                uid,
                email: decodedToken.email,
                user: {
                    uid,
                    fullName: userData?.fullName,
                    email: userData?.email,
                    rank: userData?.rank,
                    isActive: userData?.isActive,
                    isVerified: userData?.isVerified,
                    availableBalance: userData?.availableBalance || 0,
                    totalEarnings: userData?.totalEarnings || 0
                },
                claims: decodedToken
            }
        });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.AUTH, 'Token verification failed', error, undefined, { ip: req.ip });
        res.status(500).json({
            success: false,
            error: 'Token verification failed'
        });
    }
});
// Health check endpoint
app.get('/auth/health', (req, res) => {
    res.json({
        success: true,
        message: 'Auth service is healthy',
        timestamp: new Date().toISOString()
    });
});
// Error handling middleware
app.use((error, req, res, next) => {
    logger.error(logger_1.LogCategory.API, 'Unhandled error in auth handlers', error, undefined, { path: req.path, method: req.method });
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});
// Export the Express app as a Firebase Cloud Function
exports.authHandlers = functions.https.onRequest(app);
//# sourceMappingURL=authHandlers.js.map
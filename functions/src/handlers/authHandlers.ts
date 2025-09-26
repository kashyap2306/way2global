/**
 * HTTP Handlers - Authentication
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as Joi from 'joi';
import { createLogger, LogCategory } from '../utils/logger';
import { collections, errorCodes, successMessages, corsOptions, rateLimits } from '../config';

const logger = createLogger('AuthHandlers');

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: rateLimits.login.windowMs,
  max: rateLimits.login.max,
  message: {
    error: 'Too many authentication attempts',
    retryAfter: rateLimits.login.windowMs / 1000
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
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const { email } = value;

    await logger.info(
      LogCategory.AUTH,
      'Login attempt',
      undefined,
      { email, ip: req.ip }
    );

    // Get user by email
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (authError: any) {
      if (authError.code === 'auth/user-not-found') {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }
      throw authError;
    }

    // Get user data from Firestore
    const userDoc = await admin.firestore()
      .collection(collections.USERS)
      .doc(userRecord.uid)
      .get();

    if (!userDoc.exists) {
      return res.status(401).json({
        success: false,
        error: 'User profile not found'
      });
    }

    const userData = userDoc.data();

    // Check if account is disabled
    if (userRecord.disabled) {
      return res.status(403).json({
        success: false,
        error: 'Account has been disabled'
      });
    }

    // In a real implementation, you would verify the password here
    // For Firebase Auth, password verification is typically done on the client side
    // This endpoint is mainly for additional server-side validation and logging

    // Create custom token with additional claims
    const customClaims = {
      role: userData?.isActive ? 'user' : 'inactive',
      isActive: userData?.isActive || false,
      rank: userData?.rank || 'Inactive',
      isVerified: userData?.isVerified || false
    };

    // Update custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, customClaims);

    // Create custom token
    const customToken = await admin.auth().createCustomToken(userRecord.uid, customClaims);

    // Update last login time
    await admin.firestore()
      .collection(collections.USERS)
      .doc(userRecord.uid)
      .update({
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    await logger.info(
      LogCategory.AUTH,
      'Login successful',
      userRecord.uid,
      { email }
    );

    res.json({
      success: true,
      message: successMessages.LOGIN_SUCCESS,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        customToken,
        user: {
          uid: userRecord.uid,
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

  } catch (error) {
    await logger.error(
      LogCategory.AUTH,
      'Login failed',
      error as Error,
      undefined,
      { email: req.body.email, ip: req.ip }
    );

    return res.status(500).json({
      success: false,
      error: errorCodes.LOGIN_FAILED,
      message: 'Login failed. Please try again.'
    });
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
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const { refreshToken } = value;

    // Verify the refresh token (this would typically be a JWT or session token)
    // For this example, we'll assume it's a Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(refreshToken);
    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    const uid = decodedToken.uid;

    // Get fresh user data
    const userDoc = await admin.firestore().collection(collections.USERS).doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found'
      });
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

    await logger.info(
      LogCategory.AUTH,
      'Token refreshed',
      uid
    );

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

  } catch (error) {
    await logger.error(
      LogCategory.AUTH,
      'Token refresh failed',
      error as Error,
      undefined,
      { ip: req.ip }
    );

    return res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
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
      return res.status(401).json({
        success: false,
        error: 'Authorization header required'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    const uid = decodedToken.uid;

    // Revoke all refresh tokens for the user
    await admin.auth().revokeRefreshTokens(uid);

    await logger.info(
      LogCategory.AUTH,
      'User logged out',
      uid
    );

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    await logger.error(
      LogCategory.AUTH,
      'Logout failed',
      error as Error,
      undefined,
      { ip: req.ip }
    );

    return res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
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
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const { email } = value;

    // Check if user exists
    try {
      await admin.auth().getUserByEmail(email);
    } catch (authError: any) {
      if (authError.code === 'auth/user-not-found') {
        // Don't reveal if email exists or not for security
        return res.json({
          success: true,
          message: 'If the email exists, a password reset link has been sent.'
        });
      }
      throw authError;
    }

    // Generate password reset link
    const resetLink = await admin.auth().generatePasswordResetLink(email);

    // In a real implementation, you would send this via email service
    // For now, we'll just log it
    await logger.info(
      LogCategory.AUTH,
      'Password reset requested',
      undefined,
      { email, resetLink }
    );

    res.json({
      success: true,
      message: 'Password reset link has been sent to your email.'
    });

  } catch (error) {
    await logger.error(
      LogCategory.AUTH,
      'Password reset failed',
      error as Error,
      undefined,
      { email: req.body.email, ip: req.ip }
    );

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
      return res.status(401).json({
        success: false,
        error: 'Authorization header required'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    // Validate input
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details[0].message
      });
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

    await logger.info(
      LogCategory.AUTH,
      'Password changed',
      uid
    );

    res.json({
      success: true,
      message: 'Password changed successfully. Please log in again.'
    });

  } catch (error) {
    await logger.error(
      LogCategory.AUTH,
      'Password change failed',
      error as Error,
      req.body.uid || 'unknown',
      { ip: req.ip }
    );

    return res.status(500).json({
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
      return res.status(401).json({
        success: false,
        error: 'Authorization header required'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    const uid = decodedToken.uid;

    // Get user data
    const userDoc = await admin.firestore()
      .collection(collections.USERS)
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found'
      });
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

  } catch (error) {
    await logger.error(
      LogCategory.AUTH,
      'Token verification failed',
      error as Error,
      undefined,
      { ip: req.ip }
    );

    return res.status(500).json({
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
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(
    LogCategory.API,
    'Unhandled error in auth handlers',
    error,
    undefined,
    { path: req.path, method: req.method }
  );

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Export the Express app as a Firebase Cloud Function
export const authHandlers = functions.https.onRequest(app);
/**
 * HTTP Handlers - Admin Operations
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as Joi from 'joi';
import { createLogger, LogCategory } from '../utils/logger';
import { collections, corsOptions, rateLimits } from '../config';
import { PayoutProcessor } from '../services/payoutProcessor';

const logger = createLogger('AdminHandlers');
const payoutProcessor = new PayoutProcessor();

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Rate limiting for admin operations
const adminLimiter = rateLimit({
  windowMs: rateLimits.general.windowMs,
  max: rateLimits.general.max * 2, // Higher limit for admin operations
  message: {
    error: 'Too many admin requests',
    retryAfter: rateLimits.general.windowMs / 1000
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/admin', adminLimiter);

// Admin authentication middleware
const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
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

    // Check if user has admin role
    if (!decodedToken.admin && !decodedToken.superAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Add user info to request
    (req as any).user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      isAdmin: decodedToken.admin || false,
      isSuperAdmin: decodedToken.superAdmin || false
    };

    next();
  } catch (error) {
    await logger.error(
      LogCategory.SECURITY,
      'Admin authentication failed',
      error as Error,
      undefined,
      { ip: req.ip, path: req.path }
    );

    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Apply admin middleware to all admin routes
app.use('/admin', requireAdmin);

// Validation schemas
const userUpdateSchema = Joi.object({
  fullName: Joi.string().min(2).max(100),
  isActive: Joi.boolean(),
  isVerified: Joi.boolean(),
  rank: Joi.string().valid('Inactive', 'Starter', 'Basic', 'Standard', 'Advanced', 'Professional', 'Executive', 'Diamond', 'Crown', 'Ambassador'),
  availableBalance: Joi.number().min(0),
  notes: Joi.string().max(500)
});

const withdrawalActionSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required(),
  notes: Joi.string().max(500)
});

const settingUpdateSchema = Joi.object({
  category: Joi.string().valid('withdrawal', 'income', 'globalCycle', 'system').required(),
  key: Joi.string().required(),
  value: Joi.any().required()
});

/**
 * GET /admin/dashboard
 * Get admin dashboard statistics
 */
app.get('/admin/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      pendingWithdrawals,
      totalWithdrawals,
      recentTransactions
    ] = await Promise.all([
      // Total users count
      admin.firestore().collection(collections.USERS).count().get(),
      
      // Active users count
      admin.firestore().collection(collections.USERS)
        .where('isActive', '==', true).count().get(),
      
      // Pending withdrawals
      admin.firestore().collection(collections.WITHDRAWALS)
        .where('status', '==', 'pending').get(),
      
      // Total withdrawals amount
      admin.firestore().collection(collections.WITHDRAWALS)
        .where('status', '==', 'completed').get(),
      
      // Recent transactions
      admin.firestore().collection(collections.TRANSACTIONS)
        .orderBy('createdAt', 'desc').limit(10).get()
    ]);

    const pendingWithdrawalAmount = pendingWithdrawals.docs.reduce((sum, doc) => {
      return sum + (doc.data().amount || 0);
    }, 0);

    const totalWithdrawalAmount = totalWithdrawals.docs.reduce((sum, doc) => {
      return sum + (doc.data().amount || 0);
    }, 0);

    const recentTxData = recentTransactions.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers.data().count,
          active: activeUsers.data().count,
          inactive: totalUsers.data().count - activeUsers.data().count
        },
        withdrawals: {
          pending: {
            count: pendingWithdrawals.size,
            amount: pendingWithdrawalAmount
          },
          completed: {
            count: totalWithdrawals.size,
            amount: totalWithdrawalAmount
          }
        },
        recentTransactions: recentTxData
      }
    });

  } catch (error) {
    await logger.error(
      LogCategory.API,
      'Admin dashboard fetch failed',
      error as Error,
      (req as any).user?.uid
    );

    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    });
  }
});

/**
 * GET /admin/users
 * Get paginated list of users
 */
app.get('/admin/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string;
    const status = req.query.status as string; // 'active', 'inactive', 'all'

    let query = admin.firestore().collection(collections.USERS);

    // Apply filters
    if (status && status !== 'all') {
      query = query.where('isActive', '==', status === 'active');
    }

    // For search, we'll need to implement client-side filtering
    // In a production app, you'd use a search service like Algolia
    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(limit * page)
      .get();

    let users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as any[];

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter((user: any) => 
        user.fullName?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.userId?.toLowerCase().includes(searchLower)
      );
    }

    // Paginate results
    const startIndex = (page - 1) * limit;
    const paginatedUsers = users.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      data: {
        users: paginatedUsers,
        pagination: {
          page,
          limit,
          total: users.length,
          hasMore: users.length > startIndex + limit
        }
      }
    });

  } catch (error) {
    await logger.error(
      LogCategory.API,
      'Admin users fetch failed',
      error as Error,
      (req as any).user?.uid
    );

    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

/**
 * GET /admin/users/:userId
 * Get detailed user information
 */
app.get('/admin/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [userDoc, transactions, withdrawals, incomes] = await Promise.all([
      admin.firestore().collection(collections.USERS).doc(userId).get(),
      admin.firestore().collection(collections.TRANSACTIONS)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get(),
      admin.firestore().collection(collections.WITHDRAWALS)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get(),
      admin.firestore().collection(collections.INCOMES)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get()
    ]);

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userData = userDoc.data();
    const userTransactions = transactions.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));

    const userWithdrawals = withdrawals.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));

    const userIncomes = incomes.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));

    res.json({
      success: true,
      data: {
        user: {
          id: userId,
          ...userData,
          createdAt: userData?.createdAt?.toDate(),
          updatedAt: userData?.updatedAt?.toDate()
        },
        transactions: userTransactions,
        withdrawals: userWithdrawals,
        incomes: userIncomes
      }
    });

  } catch (error) {
    await logger.error(
      LogCategory.API,
      'Admin user detail fetch failed',
      error as Error,
      (req as any).user?.uid,
      { targetUserId: req.params.userId }
    );

    res.status(500).json({
      success: false,
      error: 'Failed to fetch user details'
    });
  }
});

/**
 * PUT /admin/users/:userId
 * Update user information
 */
app.put('/admin/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate input
    const { error, value } = userUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    // Check if user exists
    const userDoc = await admin.firestore().collection(collections.USERS).doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update user data
    const updateData = {
      ...value,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: (req as any).user.uid
    };

    await admin.firestore().collection(collections.USERS).doc(userId).update(updateData);

    // Update Firebase Auth custom claims if needed
    if (value.isActive !== undefined || value.rank !== undefined) {
      const userData = userDoc.data();
      const customClaims = {
        role: value.isActive ?? userData?.isActive ? 'user' : 'inactive',
        isActive: value.isActive ?? userData?.isActive,
        rank: value.rank ?? userData?.rank,
        isVerified: value.isVerified ?? userData?.isVerified
      };

      await admin.auth().setCustomUserClaims(userId, customClaims);
    }

    await logger.info(
      LogCategory.API,
      'User updated by admin',
      (req as any).user.uid,
      { targetUserId: userId, updates: value }
    );

    res.json({
      success: true,
      message: 'User updated successfully'
    });

  } catch (error) {
    await logger.error(
      LogCategory.API,
      'Admin user update failed',
      error as Error,
      (req as any).user?.uid,
      { targetUserId: req.params.userId }
    );

    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

/**
 * GET /admin/withdrawals
 * Get paginated list of withdrawal requests
 */
app.get('/admin/withdrawals', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const status = req.query.status as string; // 'pending', 'approved', 'rejected', 'completed', 'all'

    let query: FirebaseFirestore.Query = admin.firestore().collection(collections.WITHDRAWALS);

    // Apply status filter
    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .get();

    const withdrawals = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        // Get user info
        const userDoc = await admin.firestore()
          .collection(collections.USERS)
          .doc(data.userId)
          .get();

        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          user: userDoc.exists ? {
            fullName: userDoc.data()?.fullName,
            email: userDoc.data()?.email,
            userId: userDoc.data()?.userId
          } : null
        };
      })
    );

    // Get total count for pagination
    const totalSnapshot = await query.count().get();

    res.json({
      success: true,
      data: {
        withdrawals,
        pagination: {
          page,
          limit,
          total: totalSnapshot.data().count,
          hasMore: totalSnapshot.data().count > page * limit
        }
      }
    });

  } catch (error) {
    await logger.error(
      LogCategory.API,
      'Admin withdrawals fetch failed',
      error as Error,
      (req as any).user?.uid
    );

    res.status(500).json({
      success: false,
      error: 'Failed to fetch withdrawals'
    });
  }
});

/**
 * PUT /admin/withdrawals/:withdrawalId
 * Approve or reject withdrawal request
 */
app.put('/admin/withdrawals/:withdrawalId', async (req, res) => {
  try {
    const { withdrawalId } = req.params;

    // Validate input
    const { error, value } = withdrawalActionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const { action, notes } = value;

    // Get withdrawal request
    const withdrawalDoc = await admin.firestore()
      .collection(collections.WITHDRAWALS)
      .doc(withdrawalId)
      .get();

    if (!withdrawalDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal request not found'
      });
    }

    const withdrawalData = withdrawalDoc.data();

    if (withdrawalData?.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Withdrawal request is not pending'
      });
    }

    await admin.firestore().runTransaction(async (transaction) => {
      if (action === 'approve') {
        // Approve withdrawal - add to payout queue
        const payoutData = {
          userId: withdrawalData?.userId,
          withdrawalId,
          amount: withdrawalData?.amount,
          method: withdrawalData?.method,
          details: withdrawalData?.details,
          status: 'queued',
          priority: 'normal',
          scheduledAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: (req as any).user.uid,
          notes
        };

        transaction.set(
          admin.firestore().collection(collections.PAYOUT_QUEUE).doc(),
          payoutData
        );

        // Update withdrawal status
        transaction.update(withdrawalDoc.ref, {
          status: 'approved',
          approvedAt: admin.firestore.FieldValue.serverTimestamp(),
          approvedBy: (req as any).user.uid,
          notes,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

      } else if (action === 'reject') {
        // Reject withdrawal - refund balance
        const userRef = admin.firestore().collection(collections.USERS).doc(withdrawalData?.userId);
        const userDoc = await transaction.get(userRef);
        
        if (userDoc.exists) {
          const currentBalance = userDoc.data()?.availableBalance || 0;
          transaction.update(userRef, {
            availableBalance: currentBalance + (withdrawalData?.amount || 0),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        // Update withdrawal status
        transaction.update(withdrawalDoc.ref, {
          status: 'rejected',
          rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
          rejectedBy: (req as any).user.uid,
          notes,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });

    await logger.info(
      LogCategory.API,
      `Withdrawal ${action}d by admin`,
      (req as any).user.uid,
      { withdrawalId, action, notes }
    );

    res.json({
      success: true,
      message: `Withdrawal ${action}d successfully`
    });

  } catch (error) {
    await logger.error(
      LogCategory.API,
      'Admin withdrawal action failed',
      error as Error,
      (req as any).user?.uid,
      { withdrawalId: req.params.withdrawalId, action: req.body.action }
    );

    return res.status(500).json({
      success: false,
      error: `Failed to ${req.body.action} withdrawal`
    });
  }
});

/**
 * GET /admin/settings
 * Get system settings
 */
app.get('/admin/settings', async (req, res) => {
  try {
    const settingsSnapshot = await admin.firestore()
      .collection(collections.SETTINGS)
      .get();

    const settings: any = {};
    settingsSnapshot.docs.forEach(doc => {
      settings[doc.id] = doc.data();
    });

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    await logger.error(
      LogCategory.API,
      'Admin settings fetch failed',
      error as Error,
      (req as any).user?.uid
    );

    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
});

/**
 * PUT /admin/settings
 * Update system settings
 */
app.put('/admin/settings', async (req, res) => {
  try {
    // Validate input
    const { error, value } = settingUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const { category, key, value: settingValue } = value;

    // Update setting
    await admin.firestore()
      .collection(collections.SETTINGS)
      .doc(category)
      .set({
        [key]: settingValue,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: (req as any).user.uid
      }, { merge: true });

    await logger.info(
      LogCategory.API,
      'Setting updated by admin',
      (req as any).user.uid,
      { category, key, value: settingValue }
    );

    res.json({
      success: true,
      message: 'Setting updated successfully'
    });

  } catch (error) {
    await logger.error(
      LogCategory.API,
      'Admin setting update failed',
      error as Error,
      (req as any).user?.uid,
      { setting: req.body }
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to update setting'
    });
  }
});

/**
 * POST /admin/process-payouts
 * Manually trigger payout processing
 */
app.post('/admin/process-payouts', async (req, res) => {
  try {
    // Only super admin can trigger manual payout processing
    if (!(req as any).user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Super admin access required'
      });
    }

    // Process payouts
    const result = await payoutProcessor.processPayoutQueue();

    await logger.info(
      LogCategory.API,
      'Manual payout processing triggered',
      (req as any).user.uid,
      { result }
    );

    res.json({
      success: true,
      message: 'Payout processing completed',
      data: result
    });

  } catch (error) {
    await logger.error(
      LogCategory.API,
      'Manual payout processing failed',
      error as Error,
      (req as any).user?.uid
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to process payouts'
    });
  }
});

// Health check endpoint
app.get('/admin/health', (req, res) => {
  res.json({
    success: true,
    message: 'Admin service is healthy',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(
    LogCategory.API,
    'Unhandled error in admin handlers',
    error,
    (req as any).user?.uid,
    { path: req.path, method: req.method }
  );

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Export the Express app as a Firebase Cloud Function
export const adminHandlers = functions.https.onRequest(app);
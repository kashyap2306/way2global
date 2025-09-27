/**
 * HTTP Handlers - User Operations
 * Clean implementation with proper TypeScript, Firebase Functions, and Express syntax
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

// Initialize logger
const logger = createLogger('UserHandlers');

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Rate limiting for user operations
const userLimiter = rateLimit({
  windowMs: rateLimits.general.windowMs,
  max: rateLimits.general.max,
  message: {
    error: 'Too many requests',
    retryAfter: rateLimits.general.windowMs / 1000
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/user', userLimiter);

// User authentication middleware
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
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
    } catch (tokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
      return;
    }

    // Add user info to request
    (req as any).user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      isActive: decodedToken.isActive || false,
      isVerified: decodedToken.isVerified || false,
      rank: decodedToken.rank || 'Inactive'
    };

    next();
  } catch (error) {
    await logger.error(
      LogCategory.SECURITY,
      'User authentication failed',
      error as Error,
      undefined,
      { ip: req.ip, path: req.path }
    );

    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Apply auth middleware to all user routes
app.use('/user', requireAuth);

// Validation schemas
const profileUpdateSchema = Joi.object({
  fullName: Joi.string().min(2).max(100),
  contactNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]{10,15}$/),
  walletAddress: Joi.string().min(26).max(62),
  bankDetails: Joi.object({
    accountNumber: Joi.string().min(8).max(20),
    ifscCode: Joi.string().min(11).max(11),
    accountHolderName: Joi.string().min(2).max(100),
    bankName: Joi.string().min(2).max(100)
  })
});

// Helper function to calculate team statistics
const calculateTeamStats = async (userId: string, level: number = 5): Promise<any> => {
  const teamStats = {
    totalMembers: 0,
    activeMembers: 0,
    levels: [] as any[]
  };

  const processLevel = async (userIds: string[], currentLevel: number): Promise<string[]> => {
    if (currentLevel > level || userIds.length === 0) {
      return [];
    }

    const levelUsers = await Promise.all(
      userIds.map(async (uid) => {
        const userDoc = await admin.firestore()
          .collection(collections.USERS)
          .doc(uid)
          .get();
        
        return userDoc.exists ? { id: uid, ...userDoc.data() } : null;
      })
    );

    const validUsers = levelUsers.filter(user => user !== null) as Array<{
      id: string;
      fullName?: string;
      email?: string;
      userId?: string;
      isActive?: boolean;
      rank?: string;
      createdAt?: admin.firestore.Timestamp;
      [key: string]: any;
    }>;
    const activeUsers = validUsers.filter(user => user.isActive);

    teamStats.totalMembers += validUsers.length;
    teamStats.activeMembers += activeUsers.length;

    teamStats.levels.push({
      level: currentLevel,
      totalMembers: validUsers.length,
      activeMembers: activeUsers.length,
      members: validUsers.map(user => ({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        userId: user.userId,
        isActive: user.isActive,
        rank: user.rank,
        joinedAt: user.createdAt?.toDate()
      }))
    });

    // Get next level referrals
    const nextLevelIds: string[] = [];
    for (const user of validUsers) {
      const referralsSnapshot = await admin.firestore()
        .collection(collections.USERS)
        .where('sponsorId', '==', user.id)
        .get();
      
      referralsSnapshot.docs.forEach(doc => {
        nextLevelIds.push(doc.id);
      });
    }

    return await processLevel(nextLevelIds, currentLevel + 1);
  };

  // Start with direct referrals
  const directReferralsSnapshot = await admin.firestore()
    .collection(collections.USERS)
    .where('sponsorId', '==', userId)
    .get();

  const directReferralIds = directReferralsSnapshot.docs.map(doc => doc.id);
  await processLevel(directReferralIds, 1);

  return teamStats;
};

/**
 * GET /user/dashboard
 * Get user dashboard data
 */
app.get('/user/dashboard', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const userId = (req as any).user.uid;

    const [
      userDoc,
      recentTransactions,
      recentIncomes,
      teamStats
    ] = await Promise.all([
      admin.firestore().collection(collections.USERS).doc(userId).get(),
      admin.firestore().collection(collections.TRANSACTIONS)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get(),
      admin.firestore().collection(collections.INCOMES)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get(),
      calculateTeamStats(userId, 3) // Only 3 levels for dashboard
    ]);

    if (!userDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    const userData = userDoc.data();
    const recentTxData = recentTransactions.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));

    const recentIncomeData = recentIncomes.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));

    // Calculate total incomes for current month
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const monthlyIncomesSnapshot = await admin.firestore()
      .collection(collections.INCOMES)
      .where('userId', '==', userId)
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(currentMonth))
      .get();

    const thisMonthIncome = monthlyIncomesSnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().amount || 0);
    }, 0);

    res.json({
      success: true,
      data: {
        user: {
          id: userId,
          fullName: userData?.fullName,
          email: userData?.email,
          userId: userData?.userId,
          rank: userData?.rank,
          isActive: userData?.isActive,
          isVerified: userData?.isVerified,
          availableBalance: userData?.availableBalance || 0,
          totalEarnings: userData?.totalEarnings || 0,
          joinedAt: userData?.createdAt?.toDate()
        },
        incomes: {
          thisMonth: thisMonthIncome,
          recent: recentIncomeData
        },
        transactions: recentTxData,
        team: {
          totalMembers: teamStats.totalMembers,
          activeMembers: teamStats.activeMembers,
          directReferrals: teamStats.levels[0]?.totalMembers || 0
        }
      }
    });

  } catch (error) {
    await logger.error(
      LogCategory.API,
      'User dashboard fetch failed',
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
 * GET /user/profile
 * Get user profile information
 */
app.get('/user/profile', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const userId = (req as any).user.uid;

    const userDoc = await admin.firestore()
      .collection(collections.USERS)
      .doc(userId)
      .get();

    if (!userDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    const userData = userDoc.data();
    let sponsorData = null;

    // Get sponsor information if exists
    if (userData?.sponsorId) {
      const sponsorDoc = await admin.firestore()
        .collection(collections.USERS)
        .doc(userData.sponsorId)
        .get();

      if (sponsorDoc.exists) {
        const sponsor = sponsorDoc.data();
        sponsorData = {
          id: userData.sponsorId,
          fullName: sponsor?.fullName,
          userId: sponsor?.userId,
          email: sponsor?.email
        };
      }
    }

    res.json({
      success: true,
      data: {
        id: userId,
        ...userData,
        createdAt: userData?.createdAt?.toDate(),
        updatedAt: userData?.updatedAt?.toDate(),
        sponsor: sponsorData
      }
    });

  } catch (error) {
    await logger.error(
      LogCategory.API,
      'User profile fetch failed',
      error as Error,
      (req as any).user?.uid
    );

    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
});

/**
 * PUT /user/profile
 * Update user profile
 */
app.put('/user/profile', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const userId = (req as any).user.uid;

    // Validate input
    const { error, value } = profileUpdateSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details[0].message
      });
      return;
    }

    // Check if user exists
    const userDoc = await admin.firestore()
      .collection(collections.USERS)
      .doc(userId)
      .get();

    if (!userDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Update user profile
    const updateData = {
      ...value,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await admin.firestore()
      .collection(collections.USERS)
      .doc(userId)
      .update(updateData);

    await logger.info(
      LogCategory.API,
      'User profile updated',
      userId,
      { updates: Object.keys(value) }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    await logger.error(
      LogCategory.API,
      'User profile update failed',
      error as Error,
      (req as any).user?.uid
    );

    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

/**
 * GET /user/referral
 * Get referral information
 */
app.get('/user/referral', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const userId = (req as any).user.uid;

    const [directReferrals, referralIncomes] = await Promise.all([
      admin.firestore().collection(collections.USERS)
        .where('sponsorId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get(),
      admin.firestore().collection(collections.INCOMES)
        .where('userId', '==', userId)
        .where('type', 'in', ['referral', 'level'])
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get()
    ]);

    const referralData = directReferrals.docs.map(doc => ({
      id: doc.id,
      fullName: doc.data().fullName,
      email: doc.data().email,
      userId: doc.data().userId,
      isActive: doc.data().isActive,
      rank: doc.data().rank,
      joinedAt: doc.data().createdAt?.toDate()
    }));

    const incomeData = referralIncomes.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    })) as Array<{
      id: string;
      amount: number;
      type: string;
      createdAt: Date;
      [key: string]: any;
    }>;

    // Calculate total referral income
    const totalReferralIncome = incomeData.reduce((sum, income) => {
      return sum + (income.amount || 0);
    }, 0);

    // Calculate this month's referral income
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const thisMonthIncome = incomeData
      .filter(income => income.createdAt >= currentMonth)
      .reduce((sum, income) => sum + (income.amount || 0), 0);

    res.json({
      success: true,
      data: {
        directReferrals: {
          count: referralData.length,
          active: referralData.filter(ref => ref.isActive).length,
          list: referralData
        },
        incomes: {
          total: totalReferralIncome,
          thisMonth: thisMonthIncome,
          recent: incomeData
        }
      }
    });

  } catch (error) {
    await logger.error(
      LogCategory.API,
      'User referral fetch failed',
      error as Error,
      (req as any).user?.uid
    );

    res.status(500).json({
      success: false,
      error: 'Failed to fetch referral data'
    });
  }
});

/**
 * GET /user/transactions
 * Get user transactions
 */
app.get('/user/transactions', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const userId = (req as any).user.uid;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const type = req.query.type as string; // 'deposit', 'withdrawal', 'activation', 'all'

    let query: admin.firestore.Query = admin.firestore()
      .collection(collections.TRANSACTIONS)
      .where('userId', '==', userId);

    // Apply type filter
    if (type && type !== 'all') {
      query = query.where('type', '==', type);
    }

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .get();

    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));

    // Get total count for pagination
    const totalSnapshot = await query.count().get();

    res.json({
      success: true,
      data: {
        transactions,
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
      'User transactions fetch failed',
      error as Error,
      (req as any).user?.uid
    );

    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    });
  }
});

/**
 * GET /user/team
 * Get team structure and statistics
 */
app.get('/user/team', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const userId = (req as any).user.uid;
    const level = Math.min(parseInt(req.query.level as string) || 5, 10); // Max 10 levels

    const teamStats = await calculateTeamStats(userId, level);

    res.json({
      success: true,
      data: teamStats
    });

  } catch (error) {
    await logger.error(
      LogCategory.API,
      'User team fetch failed',
      error as Error,
      (req as any).user?.uid
    );

    res.status(500).json({
      success: false,
      error: 'Failed to fetch team data'
    });
  }
});

// Health check endpoint
app.get('/user/health', (req: express.Request, res: express.Response): void => {
  res.json({
    success: true,
    message: 'User service is healthy',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction): void => {
  logger.error(
    LogCategory.API,
    'Unhandled error in user handlers',
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
export const userHandlers = functions.https.onRequest(app);
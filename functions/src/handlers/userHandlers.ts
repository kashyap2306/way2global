/**
 * HTTP Handlers - User Features
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
import { calculateBinaryPosition, calculateTreeLevel, formatCurrency } from '../utils/math';

const logger = createLogger('UserHandlers');

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
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
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
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

    // Add user info to request
    (req as any).user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      isActive: decodedToken.isActive || false,
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
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
  dateOfBirth: Joi.date().max('now'),
  address: Joi.object({
    street: Joi.string().max(200),
    city: Joi.string().max(100),
    state: Joi.string().max(100),
    country: Joi.string().max(100),
    zipCode: Joi.string().max(20)
  }),
  bankDetails: Joi.object({
    accountName: Joi.string().max(100),
    accountNumber: Joi.string().max(50),
    bankName: Joi.string().max(100),
    routingNumber: Joi.string().max(50)
  }),
  cryptoWallets: Joi.object({
    usdtBep20: Joi.string().max(100),
    bitcoin: Joi.string().max(100),
    ethereum: Joi.string().max(100)
  })
});

/**
 * GET /user/dashboard
 * Get user dashboard data
 */
app.get('/user/dashboard', async (req, res) => {
  try {
    const uid = (req as any).user.uid;

    // Get user data and related information
    const [userDoc, recentTransactions, recentIncomes, teamStats] = await Promise.all([
      admin.firestore().collection(collections.USERS).doc(uid).get(),
      
      admin.firestore().collection(collections.TRANSACTIONS)
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get(),
      
      admin.firestore().collection(collections.INCOMES)
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get(),
      
      // Get team statistics
      admin.firestore().collection(collections.USERS)
        .where('sponsorId', '==', uid)
        .get()
    ]);

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found'
      });
    }

    const userData = userDoc.data();

    // Calculate team statistics
    const directReferrals = teamStats.size;
    const activeReferrals = teamStats.docs.filter(doc => doc.data().isActive).length;

    // Get total team size from user data
    const totalTeamSize = userData?.teamSize || 0;

    // Calculate income statistics
    const recentIncomeData = recentIncomes.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));

    const totalIncomeToday = recentIncomeData
      .filter(income => {
        const today = new Date();
        const incomeDate = income.createdAt;
        return incomeDate && 
               incomeDate.toDateString() === today.toDateString();
      })
      .reduce((sum, income) => sum + (income.amount || 0), 0);

    // Get recent transactions
    const recentTxData = recentTransactions.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));

    // Get rank information
    const rankDoc = await admin.firestore()
      .collection(collections.RANKS)
      .doc(userData?.rank || 'Inactive')
      .get();

    const rankData = rankDoc.exists ? rankDoc.data() : null;

    // Calculate next rank progress
    let nextRankProgress = 0;
    if (rankData && rankData.nextRank) {
      const nextRankDoc = await admin.firestore()
        .collection(collections.RANKS)
        .doc(rankData.nextRank)
        .get();
      
      if (nextRankDoc.exists) {
        const nextRankData = nextRankDoc.data();
        const currentBV = userData?.businessVolume || 0;
        const requiredBV = nextRankData?.requirements?.businessVolume || 0;
        nextRankProgress = requiredBV > 0 ? Math.min((currentBV / requiredBV) * 100, 100) : 0;
      }
    }

    res.json({
      success: true,
      data: {
        user: {
          uid,
          fullName: userData?.fullName,
          email: userData?.email,
          userId: userData?.userId,
          rank: userData?.rank,
          isActive: userData?.isActive,
          isVerified: userData?.isVerified,
          joinedAt: userData?.createdAt?.toDate()
        },
        balances: {
          available: userData?.availableBalance || 0,
          total: userData?.totalEarnings || 0,
          pending: userData?.pendingBalance || 0
        },
        statistics: {
          totalIncome: userData?.totalEarnings || 0,
          todayIncome: totalIncomeToday,
          directReferrals,
          activeReferrals,
          totalTeamSize,
          businessVolume: userData?.businessVolume || 0
        },
        rank: {
          current: userData?.rank || 'Inactive',
          benefits: rankData?.benefits || {},
          nextRank: rankData?.nextRank || null,
          nextRankProgress
        },
        recentTransactions: recentTxData,
        recentIncomes: recentIncomeData
      }
    });

  } catch (error) {
    await logger.error(
      LogCategory.API,
      'Dashboard fetch failed',
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
app.get('/user/profile', async (req, res) => {
  try {
    const uid = (req as any).user.uid;

    const userDoc = await admin.firestore().collection(collections.USERS).doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found'
      });
    }

    const userData = userDoc.data();

    // Get sponsor information if available
    let sponsorInfo = null;
    if (userData?.sponsorId) {
      const sponsorDoc = await admin.firestore()
        .collection(collections.USERS)
        .doc(userData.sponsorId)
        .get();
      
      if (sponsorDoc.exists) {
        const sponsorData = sponsorDoc.data();
        sponsorInfo = {
          uid: userData.sponsorId,
          fullName: sponsorData?.fullName,
          userId: sponsorData?.userId,
          email: sponsorData?.email
        };
      }
    }

    res.json({
      success: true,
      data: {
        uid,
        fullName: userData?.fullName,
        email: userData?.email,
        userId: userData?.userId,
        phone: userData?.phone,
        dateOfBirth: userData?.dateOfBirth?.toDate(),
        address: userData?.address,
        bankDetails: userData?.bankDetails,
        cryptoWallets: userData?.cryptoWallets,
        rank: userData?.rank,
        isActive: userData?.isActive,
        isVerified: userData?.isVerified,
        sponsor: sponsorInfo,
        binaryPosition: userData?.binaryPosition,
        createdAt: userData?.createdAt?.toDate(),
        updatedAt: userData?.updatedAt?.toDate()
      }
    });

  } catch (error) {
    await logger.error(
      LogCategory.API,
      'Profile fetch failed',
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
 * Update user profile information
 */
app.put('/user/profile', async (req, res) => {
  try {
    const uid = (req as any).user.uid;

    // Validate input
    const { error, value } = profileUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    // Update user profile
    const updateData = {
      ...value,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await admin.firestore().collection(collections.USERS).doc(uid).update(updateData);

    await logger.info(
      LogCategory.API,
      'Profile updated',
      uid,
      { updates: Object.keys(value) }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    await logger.error(
      LogCategory.API,
      'Profile update failed',
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
 * Get referral system information
 */
app.get('/user/referral', async (req, res) => {
  try {
    const uid = (req as any).user.uid;

    // Get user data
    const userDoc = await admin.firestore().collection(collections.USERS).doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found'
      });
    }

    const userData = userDoc.data();

    // Get direct referrals
    const directReferralsSnapshot = await admin.firestore()
      .collection(collections.USERS)
      .where('sponsorId', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();

    const directReferrals = directReferralsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        fullName: data.fullName,
        userId: data.userId,
        email: data.email,
        rank: data.rank,
        isActive: data.isActive,
        joinedAt: data.createdAt?.toDate(),
        businessVolume: data.businessVolume || 0
      };
    });

    // Get binary tree structure (left and right legs)
    const binaryTree = {
      left: {
        count: userData?.binaryLeft?.count || 0,
        businessVolume: userData?.binaryLeft?.businessVolume || 0
      },
      right: {
        count: userData?.binaryRight?.count || 0,
        businessVolume: userData?.binaryRight?.businessVolume || 0
      }
    };

    // Get referral income statistics
    const referralIncomesSnapshot = await admin.firestore()
      .collection(collections.INCOMES)
      .where('userId', '==', uid)
      .where('type', 'in', ['referral', 'level'])
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const referralIncomes = referralIncomesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));

    // Calculate referral statistics
    const totalReferralIncome = referralIncomes.reduce((sum, income) => sum + (income.amount || 0), 0);
    const thisMonthIncome = referralIncomes
      .filter(income => {
        const incomeDate = income.createdAt;
        const now = new Date();
        return incomeDate && 
               incomeDate.getMonth() === now.getMonth() && 
               incomeDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, income) => sum + (income.amount || 0), 0);

    // Generate referral link
    const referralLink = `${process.env.FRONTEND_URL || 'https://wayglobe.com'}/signup?ref=${userData?.userId}`;

    res.json({
      success: true,
      data: {
        referralCode: userData?.userId,
        referralLink,
        statistics: {
          directReferrals: directReferrals.length,
          activeReferrals: directReferrals.filter(ref => ref.isActive).length,
          totalTeamSize: userData?.teamSize || 0,
          totalReferralIncome,
          thisMonthIncome
        },
        binaryTree,
        directReferrals,
        recentIncomes: referralIncomes
      }
    });

  } catch (error) {
    await logger.error(
      LogCategory.API,
      'Referral data fetch failed',
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
 * Get user transaction history
 */
app.get('/user/transactions', async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const type = req.query.type as string; // 'activation', 'topup', 'withdrawal', 'all'

    let query = admin.firestore()
      .collection(collections.TRANSACTIONS)
      .where('userId', '==', uid);

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
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    // Get total count for pagination
    const totalSnapshot = await admin.firestore()
      .collection(collections.TRANSACTIONS)
      .where('userId', '==', uid)
      .count()
      .get();

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
      'Transaction history fetch failed',
      error as Error,
      (req as any).user?.uid
    );

    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction history'
    });
  }
});

/**
 * GET /user/incomes
 * Get user income history
 */
app.get('/user/incomes', async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const type = req.query.type as string; // 'referral', 'level', 'global', 'retopup', 'all'

    let query = admin.firestore()
      .collection(collections.INCOMES)
      .where('userId', '==', uid);

    // Apply type filter
    if (type && type !== 'all') {
      query = query.where('type', '==', type);
    }

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .get();

    const incomes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));

    // Calculate income statistics
    const totalIncome = incomes.reduce((sum, income) => sum + (income.amount || 0), 0);
    
    const incomeByType = incomes.reduce((acc, income) => {
      const type = income.type || 'other';
      acc[type] = (acc[type] || 0) + (income.amount || 0);
      return acc;
    }, {} as Record<string, number>);

    // Get total count for pagination
    const totalSnapshot = await admin.firestore()
      .collection(collections.INCOMES)
      .where('userId', '==', uid)
      .count()
      .get();

    res.json({
      success: true,
      data: {
        incomes,
        statistics: {
          totalIncome,
          incomeByType
        },
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
      'Income history fetch failed',
      error as Error,
      (req as any).user?.uid
    );

    res.status(500).json({
      success: false,
      error: 'Failed to fetch income history'
    });
  }
});

/**
 * GET /user/withdrawals
 * Get user withdrawal history
 */
app.get('/user/withdrawals', async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const snapshot = await admin.firestore()
      .collection(collections.WITHDRAWALS)
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .get();

    const withdrawals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    // Calculate withdrawal statistics
    const totalWithdrawn = withdrawals
      .filter(w => w.status === 'completed')
      .reduce((sum, w) => sum + (w.amount || 0), 0);

    const pendingAmount = withdrawals
      .filter(w => w.status === 'pending')
      .reduce((sum, w) => sum + (w.amount || 0), 0);

    // Get total count for pagination
    const totalSnapshot = await admin.firestore()
      .collection(collections.WITHDRAWALS)
      .where('userId', '==', uid)
      .count()
      .get();

    res.json({
      success: true,
      data: {
        withdrawals,
        statistics: {
          totalWithdrawn,
          pendingAmount,
          totalRequests: totalSnapshot.data().count
        },
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
      'Withdrawal history fetch failed',
      error as Error,
      (req as any).user?.uid
    );

    res.status(500).json({
      success: false,
      error: 'Failed to fetch withdrawal history'
    });
  }
});

/**
 * GET /user/team
 * Get team structure and statistics
 */
app.get('/user/team', async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const level = parseInt(req.query.level as string) || 1;
    const maxLevel = Math.min(level, 5); // Limit to 5 levels for performance

    // Get user data
    const userDoc = await admin.firestore().collection(collections.USERS).doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found'
      });
    }

    // Get team members at specified level
    const getTeamAtLevel = async (parentId: string, currentLevel: number): Promise<any[]> => {
      if (currentLevel > maxLevel) return [];

      const snapshot = await admin.firestore()
        .collection(collections.USERS)
        .where('sponsorId', '==', parentId)
        .orderBy('createdAt', 'desc')
        .get();

      const members = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          const children = currentLevel < maxLevel ? await getTeamAtLevel(doc.id, currentLevel + 1) : [];
          
          return {
            uid: doc.id,
            fullName: data.fullName,
            userId: data.userId,
            email: data.email,
            rank: data.rank,
            isActive: data.isActive,
            businessVolume: data.businessVolume || 0,
            teamSize: data.teamSize || 0,
            joinedAt: data.createdAt?.toDate(),
            level: currentLevel,
            children
          };
        })
      );

      return members;
    };

    const teamStructure = await getTeamAtLevel(uid, 1);

    // Calculate team statistics
    const calculateTeamStats = (members: any[]): any => {
      let totalMembers = 0;
      let activeMembers = 0;
      let totalBV = 0;

      const processMembers = (memberList: any[]) => {
        memberList.forEach(member => {
          totalMembers++;
          if (member.isActive) activeMembers++;
          totalBV += member.businessVolume || 0;
          
          if (member.children && member.children.length > 0) {
            processMembers(member.children);
          }
        });
      };

      processMembers(members);

      return {
        totalMembers,
        activeMembers,
        totalBusinessVolume: totalBV
      };
    };

    const teamStats = calculateTeamStats(teamStructure);

    res.json({
      success: true,
      data: {
        teamStructure,
        statistics: teamStats,
        level: maxLevel
      }
    });

  } catch (error) {
    await logger.error(
      LogCategory.API,
      'Team structure fetch failed',
      error as Error,
      (req as any).user?.uid
    );

    res.status(500).json({
      success: false,
      error: 'Failed to fetch team structure'
    });
  }
});

// Health check endpoint
app.get('/user/health', (req, res) => {
  res.json({
    success: true,
    message: 'User service is healthy',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
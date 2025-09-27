"use strict";
/**
 * HTTP Handlers - User Operations
 * Clean implementation with proper TypeScript, Firebase Functions, and Express syntax
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
exports.userHandlers = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const Joi = __importStar(require("joi"));
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
// Initialize logger
const logger = (0, logger_1.createLogger)('UserHandlers');
// Create Express app
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)(config_1.corsOptions));
app.use(express_1.default.json({ limit: '10mb' }));
// Rate limiting for user operations
const userLimiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.rateLimits.general.windowMs,
    max: config_1.rateLimits.general.max,
    message: {
        error: 'Too many requests',
        retryAfter: config_1.rateLimits.general.windowMs / 1000
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/user', userLimiter);
// User authentication middleware
const requireAuth = async (req, res, next) => {
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
        // Add user info to request
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            isActive: decodedToken.isActive || false,
            isVerified: decodedToken.isVerified || false,
            rank: decodedToken.rank || 'Inactive'
        };
        next();
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.SECURITY, 'User authentication failed', error, undefined, { ip: req.ip, path: req.path });
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
const calculateTeamStats = async (userId, level = 5) => {
    const teamStats = {
        totalMembers: 0,
        activeMembers: 0,
        levels: []
    };
    const processLevel = async (userIds, currentLevel) => {
        if (currentLevel > level || userIds.length === 0) {
            return [];
        }
        const levelUsers = await Promise.all(userIds.map(async (uid) => {
            const userDoc = await admin.firestore()
                .collection(config_1.collections.USERS)
                .doc(uid)
                .get();
            return userDoc.exists ? { id: uid, ...userDoc.data() } : null;
        }));
        const validUsers = levelUsers.filter(user => user !== null);
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
        const nextLevelIds = [];
        for (const user of validUsers) {
            const referralsSnapshot = await admin.firestore()
                .collection(config_1.collections.USERS)
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
        .collection(config_1.collections.USERS)
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
app.get('/user/dashboard', async (req, res) => {
    try {
        const userId = req.user.uid;
        const [userDoc, recentTransactions, recentIncomes, teamStats] = await Promise.all([
            admin.firestore().collection(config_1.collections.USERS).doc(userId).get(),
            admin.firestore().collection(config_1.collections.TRANSACTIONS)
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get(),
            admin.firestore().collection(config_1.collections.INCOMES)
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
            .collection(config_1.collections.INCOMES)
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
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.API, 'User dashboard fetch failed', error, req.user?.uid);
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
        const userId = req.user.uid;
        const userDoc = await admin.firestore()
            .collection(config_1.collections.USERS)
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
                .collection(config_1.collections.USERS)
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
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.API, 'User profile fetch failed', error, req.user?.uid);
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
app.put('/user/profile', async (req, res) => {
    try {
        const userId = req.user.uid;
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
            .collection(config_1.collections.USERS)
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
            .collection(config_1.collections.USERS)
            .doc(userId)
            .update(updateData);
        await logger.info(logger_1.LogCategory.API, 'User profile updated', userId, { updates: Object.keys(value) });
        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.API, 'User profile update failed', error, req.user?.uid);
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
app.get('/user/referral', async (req, res) => {
    try {
        const userId = req.user.uid;
        const [directReferrals, referralIncomes] = await Promise.all([
            admin.firestore().collection(config_1.collections.USERS)
                .where('sponsorId', '==', userId)
                .orderBy('createdAt', 'desc')
                .get(),
            admin.firestore().collection(config_1.collections.INCOMES)
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
        }));
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
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.API, 'User referral fetch failed', error, req.user?.uid);
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
app.get('/user/transactions', async (req, res) => {
    try {
        const userId = req.user.uid;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const type = req.query.type; // 'deposit', 'withdrawal', 'activation', 'all'
        let query = admin.firestore()
            .collection(config_1.collections.TRANSACTIONS)
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
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.API, 'User transactions fetch failed', error, req.user?.uid);
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
app.get('/user/team', async (req, res) => {
    try {
        const userId = req.user.uid;
        const level = Math.min(parseInt(req.query.level) || 5, 10); // Max 10 levels
        const teamStats = await calculateTeamStats(userId, level);
        res.json({
            success: true,
            data: teamStats
        });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.API, 'User team fetch failed', error, req.user?.uid);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch team data'
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
app.use((error, req, res, next) => {
    logger.error(logger_1.LogCategory.API, 'Unhandled error in user handlers', error, req.user?.uid, { path: req.path, method: req.method });
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});
// Export the Express app as a Firebase Cloud Function
exports.userHandlers = functions.https.onRequest(app);
//# sourceMappingURL=userHandlers.js.map
"use strict";
/**
 * HTTP Handlers - User Features
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
const logger = (0, logger_1.createLogger)('UserHandlers');
// Create Express app
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)(config_1.corsOptions));
app.use(express_1.default.json({ limit: '10mb' }));
// Rate limiting
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
            return res.status(401).json({
                success: false,
                error: 'Authorization header required'
            });
        }
        const idToken = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
        }
        catch (tokenError) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }
        // Add user info to request
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            isActive: decodedToken.isActive || false,
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
    var _a, _b, _c;
    try {
        const uid = req.user.uid;
        // Get user data and related information
        const [userDoc, recentTransactions, recentIncomes, teamStats] = await Promise.all([
            admin.firestore().collection(config_1.collections.USERS).doc(uid).get(),
            admin.firestore().collection(config_1.collections.TRANSACTIONS)
                .where('userId', '==', uid)
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get(),
            admin.firestore().collection(config_1.collections.INCOMES)
                .where('userId', '==', uid)
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get(),
            // Get team statistics
            admin.firestore().collection(config_1.collections.USERS)
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
        const totalTeamSize = (userData === null || userData === void 0 ? void 0 : userData.teamSize) || 0;
        // Calculate income statistics
        const recentIncomeData = recentIncomes.docs.map(doc => {
            var _a;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate() }));
        });
        const totalIncomeToday = recentIncomeData
            .filter(income => {
            const today = new Date();
            const incomeDate = income.createdAt;
            return incomeDate &&
                incomeDate.toDateString() === today.toDateString();
        })
            .reduce((sum, income) => sum + (income.amount || 0), 0);
        // Get recent transactions
        const recentTxData = recentTransactions.docs.map(doc => {
            var _a;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate() }));
        });
        // Get rank information
        const rankDoc = await admin.firestore()
            .collection(config_1.collections.RANKS)
            .doc((userData === null || userData === void 0 ? void 0 : userData.rank) || 'Inactive')
            .get();
        const rankData = rankDoc.exists ? rankDoc.data() : null;
        // Calculate next rank progress
        let nextRankProgress = 0;
        if (rankData && rankData.nextRank) {
            const nextRankDoc = await admin.firestore()
                .collection(config_1.collections.RANKS)
                .doc(rankData.nextRank)
                .get();
            if (nextRankDoc.exists) {
                const nextRankData = nextRankDoc.data();
                const currentBV = (userData === null || userData === void 0 ? void 0 : userData.businessVolume) || 0;
                const requiredBV = ((_a = nextRankData === null || nextRankData === void 0 ? void 0 : nextRankData.requirements) === null || _a === void 0 ? void 0 : _a.businessVolume) || 0;
                nextRankProgress = requiredBV > 0 ? Math.min((currentBV / requiredBV) * 100, 100) : 0;
            }
        }
        res.json({
            success: true,
            data: {
                user: {
                    uid,
                    fullName: userData === null || userData === void 0 ? void 0 : userData.fullName,
                    email: userData === null || userData === void 0 ? void 0 : userData.email,
                    userId: userData === null || userData === void 0 ? void 0 : userData.userId,
                    rank: userData === null || userData === void 0 ? void 0 : userData.rank,
                    isActive: userData === null || userData === void 0 ? void 0 : userData.isActive,
                    isVerified: userData === null || userData === void 0 ? void 0 : userData.isVerified,
                    joinedAt: (_b = userData === null || userData === void 0 ? void 0 : userData.createdAt) === null || _b === void 0 ? void 0 : _b.toDate()
                },
                balances: {
                    available: (userData === null || userData === void 0 ? void 0 : userData.availableBalance) || 0,
                    total: (userData === null || userData === void 0 ? void 0 : userData.totalEarnings) || 0,
                    pending: (userData === null || userData === void 0 ? void 0 : userData.pendingBalance) || 0
                },
                statistics: {
                    totalIncome: (userData === null || userData === void 0 ? void 0 : userData.totalEarnings) || 0,
                    todayIncome: totalIncomeToday,
                    directReferrals,
                    activeReferrals,
                    totalTeamSize,
                    businessVolume: (userData === null || userData === void 0 ? void 0 : userData.businessVolume) || 0
                },
                rank: {
                    current: (userData === null || userData === void 0 ? void 0 : userData.rank) || 'Inactive',
                    benefits: (rankData === null || rankData === void 0 ? void 0 : rankData.benefits) || {},
                    nextRank: (rankData === null || rankData === void 0 ? void 0 : rankData.nextRank) || null,
                    nextRankProgress
                },
                recentTransactions: recentTxData,
                recentIncomes: recentIncomeData
            }
        });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.API, 'Dashboard fetch failed', error, (_c = req.user) === null || _c === void 0 ? void 0 : _c.uid);
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
    var _a, _b, _c, _d;
    try {
        const uid = req.user.uid;
        const userDoc = await admin.firestore().collection(config_1.collections.USERS).doc(uid).get();
        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'User profile not found'
            });
        }
        const userData = userDoc.data();
        // Get sponsor information if available
        let sponsorInfo = null;
        if (userData === null || userData === void 0 ? void 0 : userData.sponsorId) {
            const sponsorDoc = await admin.firestore()
                .collection(config_1.collections.USERS)
                .doc(userData.sponsorId)
                .get();
            if (sponsorDoc.exists) {
                const sponsorData = sponsorDoc.data();
                sponsorInfo = {
                    uid: userData.sponsorId,
                    fullName: sponsorData === null || sponsorData === void 0 ? void 0 : sponsorData.fullName,
                    userId: sponsorData === null || sponsorData === void 0 ? void 0 : sponsorData.userId,
                    email: sponsorData === null || sponsorData === void 0 ? void 0 : sponsorData.email
                };
            }
        }
        res.json({
            success: true,
            data: {
                uid,
                fullName: userData === null || userData === void 0 ? void 0 : userData.fullName,
                email: userData === null || userData === void 0 ? void 0 : userData.email,
                userId: userData === null || userData === void 0 ? void 0 : userData.userId,
                phone: userData === null || userData === void 0 ? void 0 : userData.phone,
                dateOfBirth: (_a = userData === null || userData === void 0 ? void 0 : userData.dateOfBirth) === null || _a === void 0 ? void 0 : _a.toDate(),
                address: userData === null || userData === void 0 ? void 0 : userData.address,
                bankDetails: userData === null || userData === void 0 ? void 0 : userData.bankDetails,
                cryptoWallets: userData === null || userData === void 0 ? void 0 : userData.cryptoWallets,
                rank: userData === null || userData === void 0 ? void 0 : userData.rank,
                isActive: userData === null || userData === void 0 ? void 0 : userData.isActive,
                isVerified: userData === null || userData === void 0 ? void 0 : userData.isVerified,
                sponsor: sponsorInfo,
                binaryPosition: userData === null || userData === void 0 ? void 0 : userData.binaryPosition,
                createdAt: (_b = userData === null || userData === void 0 ? void 0 : userData.createdAt) === null || _b === void 0 ? void 0 : _b.toDate(),
                updatedAt: (_c = userData === null || userData === void 0 ? void 0 : userData.updatedAt) === null || _c === void 0 ? void 0 : _c.toDate()
            }
        });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.API, 'Profile fetch failed', error, (_d = req.user) === null || _d === void 0 ? void 0 : _d.uid);
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
    var _a;
    try {
        const uid = req.user.uid;
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
        const updateData = Object.assign(Object.assign({}, value), { updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        await admin.firestore().collection(config_1.collections.USERS).doc(uid).update(updateData);
        await logger.info(logger_1.LogCategory.API, 'Profile updated', uid, { updates: Object.keys(value) });
        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.API, 'Profile update failed', error, (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid);
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
    var _a, _b, _c, _d, _e;
    try {
        const uid = req.user.uid;
        // Get user data
        const userDoc = await admin.firestore().collection(config_1.collections.USERS).doc(uid).get();
        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'User profile not found'
            });
        }
        const userData = userDoc.data();
        // Get direct referrals
        const directReferralsSnapshot = await admin.firestore()
            .collection(config_1.collections.USERS)
            .where('sponsorId', '==', uid)
            .orderBy('createdAt', 'desc')
            .get();
        const directReferrals = directReferralsSnapshot.docs.map(doc => {
            var _a;
            const data = doc.data();
            return {
                uid: doc.id,
                fullName: data.fullName,
                userId: data.userId,
                email: data.email,
                rank: data.rank,
                isActive: data.isActive,
                joinedAt: (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate(),
                businessVolume: data.businessVolume || 0
            };
        });
        // Get binary tree structure (left and right legs)
        const binaryTree = {
            left: {
                count: ((_a = userData === null || userData === void 0 ? void 0 : userData.binaryLeft) === null || _a === void 0 ? void 0 : _a.count) || 0,
                businessVolume: ((_b = userData === null || userData === void 0 ? void 0 : userData.binaryLeft) === null || _b === void 0 ? void 0 : _b.businessVolume) || 0
            },
            right: {
                count: ((_c = userData === null || userData === void 0 ? void 0 : userData.binaryRight) === null || _c === void 0 ? void 0 : _c.count) || 0,
                businessVolume: ((_d = userData === null || userData === void 0 ? void 0 : userData.binaryRight) === null || _d === void 0 ? void 0 : _d.businessVolume) || 0
            }
        };
        // Get referral income statistics
        const referralIncomesSnapshot = await admin.firestore()
            .collection(config_1.collections.INCOMES)
            .where('userId', '==', uid)
            .where('type', 'in', ['referral', 'level'])
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
        const referralIncomes = referralIncomesSnapshot.docs.map(doc => {
            var _a;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate() }));
        });
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
        const referralLink = `${process.env.FRONTEND_URL || 'https://wayglobe.com'}/signup?ref=${userData === null || userData === void 0 ? void 0 : userData.userId}`;
        res.json({
            success: true,
            data: {
                referralCode: userData === null || userData === void 0 ? void 0 : userData.userId,
                referralLink,
                statistics: {
                    directReferrals: directReferrals.length,
                    activeReferrals: directReferrals.filter(ref => ref.isActive).length,
                    totalTeamSize: (userData === null || userData === void 0 ? void 0 : userData.teamSize) || 0,
                    totalReferralIncome,
                    thisMonthIncome
                },
                binaryTree,
                directReferrals,
                recentIncomes: referralIncomes
            }
        });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.API, 'Referral data fetch failed', error, (_e = req.user) === null || _e === void 0 ? void 0 : _e.uid);
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
    var _a;
    try {
        const uid = req.user.uid;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const type = req.query.type; // 'activation', 'topup', 'withdrawal', 'all'
        let query = admin.firestore()
            .collection(config_1.collections.TRANSACTIONS)
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
        const transactions = snapshot.docs.map(doc => {
            var _a, _b;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), updatedAt: (_b = doc.data().updatedAt) === null || _b === void 0 ? void 0 : _b.toDate() }));
        });
        // Get total count for pagination
        const totalSnapshot = await admin.firestore()
            .collection(config_1.collections.TRANSACTIONS)
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
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.API, 'Transaction history fetch failed', error, (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid);
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
    var _a;
    try {
        const uid = req.user.uid;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const type = req.query.type; // 'referral', 'level', 'global', 'retopup', 'all'
        let query = admin.firestore()
            .collection(config_1.collections.INCOMES)
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
        const incomes = snapshot.docs.map(doc => {
            var _a;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate() }));
        });
        // Calculate income statistics
        const totalIncome = incomes.reduce((sum, income) => sum + (income.amount || 0), 0);
        const incomeByType = incomes.reduce((acc, income) => {
            const type = income.type || 'other';
            acc[type] = (acc[type] || 0) + (income.amount || 0);
            return acc;
        }, {});
        // Get total count for pagination
        const totalSnapshot = await admin.firestore()
            .collection(config_1.collections.INCOMES)
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
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.API, 'Income history fetch failed', error, (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid);
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
    var _a;
    try {
        const uid = req.user.uid;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const snapshot = await admin.firestore()
            .collection(config_1.collections.WITHDRAWALS)
            .where('userId', '==', uid)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .offset((page - 1) * limit)
            .get();
        const withdrawals = snapshot.docs.map(doc => {
            var _a, _b;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), updatedAt: (_b = doc.data().updatedAt) === null || _b === void 0 ? void 0 : _b.toDate() }));
        });
        // Calculate withdrawal statistics
        const totalWithdrawn = withdrawals
            .filter(w => w.status === 'completed')
            .reduce((sum, w) => sum + (w.amount || 0), 0);
        const pendingAmount = withdrawals
            .filter(w => w.status === 'pending')
            .reduce((sum, w) => sum + (w.amount || 0), 0);
        // Get total count for pagination
        const totalSnapshot = await admin.firestore()
            .collection(config_1.collections.WITHDRAWALS)
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
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.API, 'Withdrawal history fetch failed', error, (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid);
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
    var _a;
    try {
        const uid = req.user.uid;
        const level = parseInt(req.query.level) || 1;
        const maxLevel = Math.min(level, 5); // Limit to 5 levels for performance
        // Get user data
        const userDoc = await admin.firestore().collection(config_1.collections.USERS).doc(uid).get();
        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'User profile not found'
            });
        }
        // Get team members at specified level
        const getTeamAtLevel = async (parentId, currentLevel) => {
            if (currentLevel > maxLevel)
                return [];
            const snapshot = await admin.firestore()
                .collection(config_1.collections.USERS)
                .where('sponsorId', '==', parentId)
                .orderBy('createdAt', 'desc')
                .get();
            const members = await Promise.all(snapshot.docs.map(async (doc) => {
                var _a;
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
                    joinedAt: (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate(),
                    level: currentLevel,
                    children
                };
            }));
            return members;
        };
        const teamStructure = await getTeamAtLevel(uid, 1);
        // Calculate team statistics
        const calculateTeamStats = (members) => {
            let totalMembers = 0;
            let activeMembers = 0;
            let totalBV = 0;
            const processMembers = (memberList) => {
                memberList.forEach(member => {
                    totalMembers++;
                    if (member.isActive)
                        activeMembers++;
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
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.API, 'Team structure fetch failed', error, (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid);
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
app.use((error, req, res, next) => {
    var _a;
    logger.error(logger_1.LogCategory.API, 'Unhandled error in user handlers', error, (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid, { path: req.path, method: req.method });
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});
// Export the Express app as a Firebase Cloud Function
exports.userHandlers = functions.https.onRequest(app);
//# sourceMappingURL=userHandlers.js.map
"use strict";
/**
 * HTTP Handlers - Admin Operations
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
exports.adminHandlers = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const Joi = __importStar(require("joi"));
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
const payoutProcessor_1 = require("../services/payoutProcessor");
const logger = (0, logger_1.createLogger)('AdminHandlers');
const payoutProcessor = new payoutProcessor_1.PayoutProcessor();
// Create Express app
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)(config_1.corsOptions));
app.use(express_1.default.json({ limit: '10mb' }));
// Rate limiting for admin operations
const adminLimiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.rateLimits.general.windowMs,
    max: config_1.rateLimits.general.max * 2, // Higher limit for admin operations
    message: {
        error: 'Too many admin requests',
        retryAfter: config_1.rateLimits.general.windowMs / 1000
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/admin', adminLimiter);
// Admin authentication middleware
const requireAdmin = async (req, res, next) => {
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
        // Check if user has admin role
        if (!decodedToken.admin && !decodedToken.superAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        // Add user info to request
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            isAdmin: decodedToken.admin || false,
            isSuperAdmin: decodedToken.superAdmin || false
        };
        next();
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.SECURITY, 'Admin authentication failed', error, undefined, { ip: req.ip, path: req.path });
        res.status(500).json({
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
    var _a;
    try {
        const [totalUsers, activeUsers, pendingWithdrawals, totalWithdrawals, recentTransactions] = await Promise.all([
            // Total users count
            admin.firestore().collection(config_1.collections.USERS).count().get(),
            // Active users count
            admin.firestore().collection(config_1.collections.USERS)
                .where('isActive', '==', true).count().get(),
            // Pending withdrawals
            admin.firestore().collection(config_1.collections.WITHDRAWALS)
                .where('status', '==', 'pending').get(),
            // Total withdrawals amount
            admin.firestore().collection(config_1.collections.WITHDRAWALS)
                .where('status', '==', 'completed').get(),
            // Recent transactions
            admin.firestore().collection(config_1.collections.TRANSACTIONS)
                .orderBy('createdAt', 'desc').limit(10).get()
        ]);
        const pendingWithdrawalAmount = pendingWithdrawals.docs.reduce((sum, doc) => {
            return sum + (doc.data().amount || 0);
        }, 0);
        const totalWithdrawalAmount = totalWithdrawals.docs.reduce((sum, doc) => {
            return sum + (doc.data().amount || 0);
        }, 0);
        const recentTxData = recentTransactions.docs.map(doc => {
            var _a;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate() }));
        });
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
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.API, 'Admin dashboard fetch failed', error, (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid);
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
    var _a;
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const search = req.query.search;
        const status = req.query.status; // 'active', 'inactive', 'all'
        let query = admin.firestore().collection(config_1.collections.USERS);
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
        let users = snapshot.docs.map(doc => {
            var _a, _b;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), updatedAt: (_b = doc.data().updatedAt) === null || _b === void 0 ? void 0 : _b.toDate() }));
        });
        // Apply search filter if provided
        if (search) {
            const searchLower = search.toLowerCase();
            users = users.filter(user => {
                var _a, _b, _c;
                return ((_a = user.fullName) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(searchLower)) ||
                    ((_b = user.email) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(searchLower)) ||
                    ((_c = user.userId) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(searchLower));
            });
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
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.API, 'Admin users fetch failed', error, (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid);
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
    var _a, _b, _c;
    try {
        const { userId } = req.params;
        const [userDoc, transactions, withdrawals, incomes] = await Promise.all([
            admin.firestore().collection(config_1.collections.USERS).doc(userId).get(),
            admin.firestore().collection(config_1.collections.TRANSACTIONS)
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get(),
            admin.firestore().collection(config_1.collections.WITHDRAWALS)
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get(),
            admin.firestore().collection(config_1.collections.INCOMES)
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
        const userTransactions = transactions.docs.map(doc => {
            var _a;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate() }));
        });
        const userWithdrawals = withdrawals.docs.map(doc => {
            var _a;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate() }));
        });
        const userIncomes = incomes.docs.map(doc => {
            var _a;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate() }));
        });
        res.json({
            success: true,
            data: {
                user: Object.assign(Object.assign({ id: userId }, userData), { createdAt: (_a = userData === null || userData === void 0 ? void 0 : userData.createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), updatedAt: (_b = userData === null || userData === void 0 ? void 0 : userData.updatedAt) === null || _b === void 0 ? void 0 : _b.toDate() }),
                transactions: userTransactions,
                withdrawals: userWithdrawals,
                incomes: userIncomes
            }
        });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.API, 'Admin user detail fetch failed', error, (_c = req.user) === null || _c === void 0 ? void 0 : _c.uid, { targetUserId: req.params.userId });
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
    var _a, _b, _c, _d, _e;
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
        const userDoc = await admin.firestore().collection(config_1.collections.USERS).doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        // Update user data
        const updateData = Object.assign(Object.assign({}, value), { updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedBy: req.user.uid });
        await admin.firestore().collection(config_1.collections.USERS).doc(userId).update(updateData);
        // Update Firebase Auth custom claims if needed
        if (value.isActive !== undefined || value.rank !== undefined) {
            const userData = userDoc.data();
            const customClaims = {
                role: ((_a = value.isActive) !== null && _a !== void 0 ? _a : userData === null || userData === void 0 ? void 0 : userData.isActive) ? 'user' : 'inactive',
                isActive: (_b = value.isActive) !== null && _b !== void 0 ? _b : userData === null || userData === void 0 ? void 0 : userData.isActive,
                rank: (_c = value.rank) !== null && _c !== void 0 ? _c : userData === null || userData === void 0 ? void 0 : userData.rank,
                isVerified: (_d = value.isVerified) !== null && _d !== void 0 ? _d : userData === null || userData === void 0 ? void 0 : userData.isVerified
            };
            await admin.auth().setCustomUserClaims(userId, customClaims);
        }
        await logger.info(logger_1.LogCategory.API, 'User updated by admin', req.user.uid, { targetUserId: userId, updates: value });
        res.json({
            success: true,
            message: 'User updated successfully'
        });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.API, 'Admin user update failed', error, (_e = req.user) === null || _e === void 0 ? void 0 : _e.uid, { targetUserId: req.params.userId });
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
    var _a;
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const status = req.query.status; // 'pending', 'approved', 'rejected', 'completed', 'all'
        let query = admin.firestore().collection(config_1.collections.WITHDRAWALS);
        // Apply status filter
        if (status && status !== 'all') {
            query = query.where('status', '==', status);
        }
        const snapshot = await query
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .offset((page - 1) * limit)
            .get();
        const withdrawals = await Promise.all(snapshot.docs.map(async (doc) => {
            var _a, _b, _c, _d, _e;
            const data = doc.data();
            // Get user info
            const userDoc = await admin.firestore()
                .collection(config_1.collections.USERS)
                .doc(data.userId)
                .get();
            return Object.assign(Object.assign({ id: doc.id }, data), { createdAt: (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), updatedAt: (_b = data.updatedAt) === null || _b === void 0 ? void 0 : _b.toDate(), user: userDoc.exists ? {
                    fullName: (_c = userDoc.data()) === null || _c === void 0 ? void 0 : _c.fullName,
                    email: (_d = userDoc.data()) === null || _d === void 0 ? void 0 : _d.email,
                    userId: (_e = userDoc.data()) === null || _e === void 0 ? void 0 : _e.userId
                } : null });
        }));
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
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.API, 'Admin withdrawals fetch failed', error, (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid);
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
    var _a;
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
            .collection(config_1.collections.WITHDRAWALS)
            .doc(withdrawalId)
            .get();
        if (!withdrawalDoc.exists) {
            return res.status(404).json({
                success: false,
                error: 'Withdrawal request not found'
            });
        }
        const withdrawalData = withdrawalDoc.data();
        if ((withdrawalData === null || withdrawalData === void 0 ? void 0 : withdrawalData.status) !== 'pending') {
            return res.status(400).json({
                success: false,
                error: 'Withdrawal request is not pending'
            });
        }
        await admin.firestore().runTransaction(async (transaction) => {
            var _a;
            if (action === 'approve') {
                // Approve withdrawal - add to payout queue
                const payoutData = {
                    userId: withdrawalData === null || withdrawalData === void 0 ? void 0 : withdrawalData.userId,
                    withdrawalId,
                    amount: withdrawalData === null || withdrawalData === void 0 ? void 0 : withdrawalData.amount,
                    method: withdrawalData === null || withdrawalData === void 0 ? void 0 : withdrawalData.method,
                    details: withdrawalData === null || withdrawalData === void 0 ? void 0 : withdrawalData.details,
                    status: 'queued',
                    priority: 'normal',
                    scheduledAt: admin.firestore.FieldValue.serverTimestamp(),
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    createdBy: req.user.uid,
                    notes
                };
                transaction.set(admin.firestore().collection(config_1.collections.PAYOUT_QUEUE).doc(), payoutData);
                // Update withdrawal status
                transaction.update(withdrawalDoc.ref, {
                    status: 'approved',
                    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
                    approvedBy: req.user.uid,
                    notes,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            else if (action === 'reject') {
                // Reject withdrawal - refund balance
                const userRef = admin.firestore().collection(config_1.collections.USERS).doc(withdrawalData === null || withdrawalData === void 0 ? void 0 : withdrawalData.userId);
                const userDoc = await transaction.get(userRef);
                if (userDoc.exists) {
                    const currentBalance = ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.availableBalance) || 0;
                    transaction.update(userRef, {
                        availableBalance: currentBalance + ((withdrawalData === null || withdrawalData === void 0 ? void 0 : withdrawalData.amount) || 0),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
                // Update withdrawal status
                transaction.update(withdrawalDoc.ref, {
                    status: 'rejected',
                    rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
                    rejectedBy: req.user.uid,
                    notes,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        });
        await logger.info(logger_1.LogCategory.API, `Withdrawal ${action}d by admin`, req.user.uid, { withdrawalId, action, notes });
        res.json({
            success: true,
            message: `Withdrawal ${action}d successfully`
        });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.API, 'Admin withdrawal action failed', error, (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid, { withdrawalId: req.params.withdrawalId, action: req.body.action });
        res.status(500).json({
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
    var _a;
    try {
        const settingsSnapshot = await admin.firestore()
            .collection(config_1.collections.SETTINGS)
            .get();
        const settings = {};
        settingsSnapshot.docs.forEach(doc => {
            settings[doc.id] = doc.data();
        });
        res.json({
            success: true,
            data: settings
        });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.API, 'Admin settings fetch failed', error, (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid);
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
    var _a;
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
            .collection(config_1.collections.SETTINGS)
            .doc(category)
            .set({
            [key]: settingValue,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: req.user.uid
        }, { merge: true });
        await logger.info(logger_1.LogCategory.API, 'Setting updated by admin', req.user.uid, { category, key, value: settingValue });
        res.json({
            success: true,
            message: 'Setting updated successfully'
        });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.API, 'Admin setting update failed', error, (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid, { setting: req.body });
        res.status(500).json({
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
    var _a;
    try {
        // Only super admin can trigger manual payout processing
        if (!req.user.isSuperAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Super admin access required'
            });
        }
        // Process payouts
        const result = await payoutProcessor.processPayoutQueue();
        await logger.info(logger_1.LogCategory.API, 'Manual payout processing triggered', req.user.uid, { result });
        res.json({
            success: true,
            message: 'Payout processing completed',
            data: result
        });
    }
    catch (error) {
        await logger.error(logger_1.LogCategory.API, 'Manual payout processing failed', error, (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid);
        res.status(500).json({
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
app.use((error, req, res, next) => {
    var _a;
    logger.error(logger_1.LogCategory.API, 'Unhandled error in admin handlers', error, (_a = req.user) === null || _a === void 0 ? void 0 : _a.uid, { path: req.path, method: req.method });
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});
// Export the Express app as a Firebase Cloud Function
exports.adminHandlers = functions.https.onRequest(app);
//# sourceMappingURL=adminHandlers.js.map
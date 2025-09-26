"use strict";
/**
 * Seed Service - Initialize database with test data
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
exports.SeedService = void 0;
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
const logger = (0, logger_1.createLogger)('SeedService');
class SeedService {
    /**
     * Seed all data (ranks, settings, test users, global cycles)
     */
    async seedAll() {
        try {
            await logger.info(logger_1.LogCategory.SYSTEM, 'Starting complete database seeding');
            await this.seedRanks();
            await this.seedSettings();
            await this.seedTestUsers();
            await this.seedGlobalCycles();
            await logger.info(logger_1.LogCategory.SYSTEM, 'Complete database seeding finished');
        }
        catch (error) {
            await logger.error(logger_1.LogCategory.SYSTEM, 'Complete seeding failed', error);
            throw error;
        }
    }
    /**
     * Seed rank system
     */
    async seedRanks() {
        try {
            await logger.info(logger_1.LogCategory.SYSTEM, 'Seeding ranks');
            const ranks = [
                {
                    id: 'Inactive',
                    name: 'Inactive',
                    activationAmount: 0,
                    benefits: {
                        referralIncome: 0,
                        levelIncome: 0,
                        globalIncome: 0,
                        retopupIncome: 0,
                        maxWithdrawal: 0
                    },
                    requirements: {
                        businessVolume: 0,
                        directReferrals: 0,
                        teamSize: 0
                    },
                    nextRank: 'Starter',
                    order: 0
                },
                {
                    id: 'Starter',
                    name: 'Starter',
                    activationAmount: config_1.mlmConfig.ranks.azurite.activationAmount,
                    benefits: {
                        referralIncome: config_1.mlmConfig.incomes.referral.percentage,
                        levelIncome: config_1.mlmConfig.incomes.level.L1, // Using L1 level income
                        globalIncome: config_1.mlmConfig.incomes.global.percentage,
                        retopupIncome: config_1.mlmConfig.incomes.reTopup.percentage,
                        maxWithdrawal: 1000
                    },
                    requirements: {
                        businessVolume: 0,
                        directReferrals: 0,
                        teamSize: 0
                    },
                    nextRank: 'Basic',
                    order: 1
                },
                {
                    id: 'Basic',
                    name: 'Basic',
                    activationAmount: config_1.mlmConfig.ranks.pearl.activationAmount,
                    benefits: {
                        referralIncome: config_1.mlmConfig.incomes.referral.percentage,
                        levelIncome: config_1.mlmConfig.incomes.level.L1, // Using L1 level income
                        globalIncome: config_1.mlmConfig.incomes.global.percentage,
                        retopupIncome: config_1.mlmConfig.incomes.reTopup.percentage,
                        maxWithdrawal: 2500
                    },
                    requirements: {
                        businessVolume: 500,
                        directReferrals: 2,
                        teamSize: 5
                    },
                    nextRank: 'Standard',
                    order: 2
                },
                {
                    id: 'Standard',
                    name: 'Standard',
                    activationAmount: config_1.mlmConfig.ranks.ruby.activationAmount,
                    benefits: {
                        referralIncome: config_1.mlmConfig.incomes.referral.percentage,
                        levelIncome: config_1.mlmConfig.incomes.level.L1, // Using L1 level income
                        globalIncome: config_1.mlmConfig.incomes.global.percentage,
                        retopupIncome: config_1.mlmConfig.incomes.reTopup.percentage,
                        maxWithdrawal: 5000
                    },
                    requirements: {
                        businessVolume: 1500,
                        directReferrals: 3,
                        teamSize: 15
                    },
                    nextRank: 'Advanced',
                    order: 3
                },
                {
                    id: 'Advanced',
                    name: 'Advanced',
                    activationAmount: config_1.mlmConfig.ranks.emerald.activationAmount,
                    benefits: {
                        referralIncome: config_1.mlmConfig.incomes.referral.percentage,
                        levelIncome: config_1.mlmConfig.incomes.level.L1, // Using L1 level income
                        globalIncome: config_1.mlmConfig.incomes.global.percentage,
                        retopupIncome: config_1.mlmConfig.incomes.reTopup.percentage,
                        maxWithdrawal: 10000
                    },
                    requirements: {
                        businessVolume: 5000,
                        directReferrals: 5,
                        teamSize: 50
                    },
                    nextRank: 'Professional',
                    order: 4
                },
                {
                    id: 'Professional',
                    name: 'Professional',
                    activationAmount: config_1.mlmConfig.ranks.sapphire.activationAmount,
                    benefits: {
                        referralIncome: config_1.mlmConfig.incomes.referral.percentage,
                        levelIncome: config_1.mlmConfig.incomes.level.L1, // Using L1 level income
                        globalIncome: config_1.mlmConfig.incomes.global.percentage,
                        retopupIncome: config_1.mlmConfig.incomes.reTopup.percentage,
                        maxWithdrawal: 25000
                    },
                    requirements: {
                        businessVolume: 15000,
                        directReferrals: 8,
                        teamSize: 150
                    },
                    nextRank: 'Executive',
                    order: 5
                },
                {
                    id: 'Executive',
                    name: 'Executive',
                    activationAmount: config_1.mlmConfig.ranks.diamond.activationAmount,
                    benefits: {
                        referralIncome: config_1.mlmConfig.incomes.referral.percentage,
                        levelIncome: config_1.mlmConfig.incomes.level.L1, // Using L1 level income
                        globalIncome: config_1.mlmConfig.incomes.global.percentage,
                        retopupIncome: config_1.mlmConfig.incomes.reTopup.percentage,
                        maxWithdrawal: 50000
                    },
                    requirements: {
                        businessVolume: 50000,
                        directReferrals: 12,
                        teamSize: 500
                    },
                    nextRank: 'Diamond',
                    order: 6
                },
                {
                    id: 'Diamond',
                    name: 'Diamond',
                    activationAmount: config_1.mlmConfig.ranks.diamond.activationAmount,
                    benefits: {
                        referralIncome: config_1.mlmConfig.incomes.referral.percentage,
                        levelIncome: config_1.mlmConfig.incomes.level.L1, // Using L1 level income
                        globalIncome: config_1.mlmConfig.incomes.global.percentage,
                        retopupIncome: config_1.mlmConfig.incomes.reTopup.percentage,
                        maxWithdrawal: 100000
                    },
                    requirements: {
                        businessVolume: 150000,
                        directReferrals: 20,
                        teamSize: 1500
                    },
                    nextRank: 'Crown',
                    order: 7
                },
                {
                    id: 'Crown',
                    name: 'Crown',
                    activationAmount: config_1.mlmConfig.ranks.crown.activationAmount,
                    benefits: {
                        referralIncome: config_1.mlmConfig.incomes.referral.percentage,
                        levelIncome: config_1.mlmConfig.incomes.level.L1, // Using L1 level income
                        globalIncome: config_1.mlmConfig.incomes.global.percentage,
                        retopupIncome: config_1.mlmConfig.incomes.reTopup.percentage,
                        maxWithdrawal: 250000
                    },
                    requirements: {
                        businessVolume: 500000,
                        directReferrals: 30,
                        teamSize: 5000
                    },
                    nextRank: 'Ambassador',
                    order: 8
                },
                {
                    id: 'Ambassador',
                    name: 'Ambassador',
                    activationAmount: config_1.mlmConfig.ranks.royalCrown.activationAmount,
                    benefits: {
                        referralIncome: config_1.mlmConfig.incomes.referral.percentage,
                        levelIncome: config_1.mlmConfig.incomes.level.L1, // Using L1 level income
                        globalIncome: config_1.mlmConfig.incomes.global.percentage,
                        retopupIncome: config_1.mlmConfig.incomes.reTopup.percentage,
                        maxWithdrawal: 500000
                    },
                    requirements: {
                        businessVolume: 1500000,
                        directReferrals: 50,
                        teamSize: 15000
                    },
                    nextRank: null,
                    order: 9
                }
            ];
            const batch = admin.firestore().batch();
            ranks.forEach(rank => {
                const rankRef = admin.firestore().collection(config_1.collections.RANKS).doc(rank.id);
                batch.set(rankRef, Object.assign(Object.assign({}, rank), { createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
            });
            await batch.commit();
            await logger.info(logger_1.LogCategory.SYSTEM, 'Ranks seeded successfully');
        }
        catch (error) {
            await logger.error(logger_1.LogCategory.SYSTEM, 'Rank seeding failed', error);
            throw error;
        }
    }
    /**
     * Seed system settings
     */
    async seedSettings() {
        try {
            await logger.info(logger_1.LogCategory.SYSTEM, 'Seeding settings');
            const settings = {
                withdrawal: {
                    minimumAmount: config_1.mlmConfig.withdrawal.minimumAmount,
                    maximumAmount: 10000, // Using dailyLimit as maximum
                    processingFee: 5, // Using processingFeePercentage
                    dailyLimit: config_1.mlmConfig.withdrawal.dailyLimit,
                    processingTime: '24-48 hours',
                    allowedMethods: ['USDT BEP20', 'Fund Conversion', 'P2P'],
                    autoApprovalLimit: 100
                },
                income: {
                    referral: {
                        percentage: config_1.mlmConfig.incomes.referral.percentage,
                        enabled: true
                    },
                    level: {
                        percentage: config_1.mlmConfig.incomes.level.L1, // Using L1 as base percentage
                        maxLevels: 6, // Based on L1-L6 levels
                        enabled: true
                    },
                    global: {
                        percentage: config_1.mlmConfig.incomes.global.percentage,
                        enabled: true
                    },
                    retopup: {
                        percentage: config_1.mlmConfig.incomes.reTopup.percentage,
                        enabled: true
                    }
                },
                globalCycle: {
                    targetAmount: config_1.mlmConfig.globalCycle.targetAmount,
                    triggerInterval: config_1.mlmConfig.globalCycle.triggerInterval,
                    autoTopupEnabled: config_1.mlmConfig.globalCycle.autoTopupEnabled,
                    reidGenerationEnabled: config_1.mlmConfig.globalCycle.reidGenerationEnabled,
                    enabled: true
                },
                system: {
                    maintenanceMode: false,
                    registrationEnabled: true,
                    withdrawalEnabled: true,
                    topupEnabled: true,
                    welcomeBonus: 0,
                    maxDailyRegistrations: 1000,
                    supportEmail: 'support@wayglobe.com',
                    companyName: 'WayGlobe',
                    version: '1.0.0'
                }
            };
            const batch = admin.firestore().batch();
            Object.entries(settings).forEach(([category, data]) => {
                const settingRef = admin.firestore().collection(config_1.collections.SETTINGS).doc(category);
                batch.set(settingRef, Object.assign(Object.assign({}, data), { createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
            });
            await batch.commit();
            await logger.info(logger_1.LogCategory.SYSTEM, 'Settings seeded successfully');
        }
        catch (error) {
            await logger.error(logger_1.LogCategory.SYSTEM, 'Settings seeding failed', error);
            throw error;
        }
    }
    /**
     * Seed test users with MLM structure
     */
    async seedTestUsers() {
        try {
            await logger.info(logger_1.LogCategory.SYSTEM, 'Seeding test users');
            const testUsers = [
                {
                    uid: 'admin-user-001',
                    email: 'admin@wayglobe.com',
                    fullName: 'System Administrator',
                    userId: 'WG000001',
                    rank: 'Ambassador',
                    isActive: true,
                    isVerified: true,
                    isAdmin: true,
                    isSuperAdmin: true,
                    sponsorId: null,
                    availableBalance: 10000,
                    totalEarnings: 50000,
                    businessVolume: 2000000,
                    teamSize: 20000
                },
                {
                    uid: 'test-user-001',
                    email: 'john.doe@example.com',
                    fullName: 'John Doe',
                    userId: 'WG000002',
                    rank: 'Diamond',
                    isActive: true,
                    isVerified: true,
                    sponsorId: 'admin-user-001',
                    availableBalance: 5000,
                    totalEarnings: 25000,
                    businessVolume: 200000,
                    teamSize: 2000
                },
                {
                    uid: 'test-user-002',
                    email: 'jane.smith@example.com',
                    fullName: 'Jane Smith',
                    userId: 'WG000003',
                    rank: 'Executive',
                    isActive: true,
                    isVerified: true,
                    sponsorId: 'admin-user-001',
                    availableBalance: 3000,
                    totalEarnings: 15000,
                    businessVolume: 75000,
                    teamSize: 750
                },
                {
                    uid: 'test-user-003',
                    email: 'mike.johnson@example.com',
                    fullName: 'Mike Johnson',
                    userId: 'WG000004',
                    rank: 'Professional',
                    isActive: true,
                    isVerified: true,
                    sponsorId: 'test-user-001',
                    availableBalance: 2000,
                    totalEarnings: 8000,
                    businessVolume: 25000,
                    teamSize: 250
                },
                {
                    uid: 'test-user-004',
                    email: 'sarah.wilson@example.com',
                    fullName: 'Sarah Wilson',
                    userId: 'WG000005',
                    rank: 'Advanced',
                    isActive: true,
                    isVerified: true,
                    sponsorId: 'test-user-001',
                    availableBalance: 1500,
                    totalEarnings: 5000,
                    businessVolume: 8000,
                    teamSize: 80
                },
                {
                    uid: 'test-user-005',
                    email: 'david.brown@example.com',
                    fullName: 'David Brown',
                    userId: 'WG000006',
                    rank: 'Standard',
                    isActive: true,
                    isVerified: true,
                    sponsorId: 'test-user-002',
                    availableBalance: 800,
                    totalEarnings: 2500,
                    businessVolume: 2000,
                    teamSize: 20
                },
                {
                    uid: 'test-user-006',
                    email: 'lisa.davis@example.com',
                    fullName: 'Lisa Davis',
                    userId: 'WG000007',
                    rank: 'Basic',
                    isActive: true,
                    isVerified: true,
                    sponsorId: 'test-user-002',
                    availableBalance: 400,
                    totalEarnings: 1000,
                    businessVolume: 750,
                    teamSize: 8
                },
                {
                    uid: 'test-user-007',
                    email: 'robert.miller@example.com',
                    fullName: 'Robert Miller',
                    userId: 'WG000008',
                    rank: 'Starter',
                    isActive: true,
                    isVerified: true,
                    sponsorId: 'test-user-003',
                    availableBalance: 200,
                    totalEarnings: 500,
                    businessVolume: 100,
                    teamSize: 2
                },
                {
                    uid: 'test-user-008',
                    email: 'emily.garcia@example.com',
                    fullName: 'Emily Garcia',
                    userId: 'WG000009',
                    rank: 'Starter',
                    isActive: true,
                    isVerified: false,
                    sponsorId: 'test-user-003',
                    availableBalance: 150,
                    totalEarnings: 300,
                    businessVolume: 100,
                    teamSize: 1
                },
                {
                    uid: 'test-user-009',
                    email: 'inactive.user@example.com',
                    fullName: 'Inactive User',
                    userId: 'WG000010',
                    rank: 'Inactive',
                    isActive: false,
                    isVerified: false,
                    sponsorId: 'test-user-004',
                    availableBalance: 0,
                    totalEarnings: 0,
                    businessVolume: 0,
                    teamSize: 0
                }
            ];
            const batch = admin.firestore().batch();
            // Create Firebase Auth users and Firestore documents
            for (const user of testUsers) {
                try {
                    // Create Firebase Auth user
                    await admin.auth().createUser({
                        uid: user.uid,
                        email: user.email,
                        password: 'TempPassword123!', // Default password for test users
                        displayName: user.fullName,
                        emailVerified: user.isVerified
                    });
                    // Set custom claims
                    const customClaims = {
                        role: user.isActive ? 'user' : 'inactive',
                        isActive: user.isActive,
                        rank: user.rank,
                        isVerified: user.isVerified
                    };
                    if (user.isAdmin)
                        customClaims.admin = true;
                    if (user.isSuperAdmin)
                        customClaims.superAdmin = true;
                    await admin.auth().setCustomUserClaims(user.uid, customClaims);
                    // Calculate binary position
                    const binaryPosition = user.sponsorId ?
                        { side: 'left', position: parseInt(user.sponsorId) } :
                        { side: 'root', position: 0 };
                    // Create Firestore document
                    const userRef = admin.firestore().collection(config_1.collections.USERS).doc(user.uid);
                    batch.set(userRef, Object.assign(Object.assign({}, user), { binaryPosition, binaryLeft: { count: 0, businessVolume: 0 }, binaryRight: { count: 0, businessVolume: 0 }, referralCount: 0, pendingBalance: 0, phone: `+1555${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`, address: {
                            street: '123 Test Street',
                            city: 'Test City',
                            state: 'Test State',
                            country: 'United States',
                            zipCode: '12345'
                        }, cryptoWallets: {
                            usdtBep20: `0x${Math.random().toString(16).substr(2, 40)}`
                        }, createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
                }
                catch (authError) {
                    if (authError.code === 'auth/uid-already-exists') {
                        await logger.info(logger_1.LogCategory.SYSTEM, `User ${user.uid} already exists, skipping`);
                        continue;
                    }
                    throw authError;
                }
            }
            await batch.commit();
            // Create sample transactions for test users
            await this.seedTestTransactions(testUsers);
            await logger.info(logger_1.LogCategory.SYSTEM, 'Test users seeded successfully');
        }
        catch (error) {
            await logger.error(logger_1.LogCategory.SYSTEM, 'Test users seeding failed', error);
            throw error;
        }
    }
    /**
     * Seed test transactions
     */
    async seedTestTransactions(users) {
        var _a;
        try {
            const batch = admin.firestore().batch();
            let transactionCount = 0;
            for (const user of users.filter(u => u.isActive)) {
                // Create activation transaction
                const activationTxRef = admin.firestore().collection(config_1.collections.TRANSACTIONS).doc();
                batch.set(activationTxRef, {
                    userId: user.uid,
                    type: 'activation',
                    rank: user.rank,
                    amount: ((_a = config_1.mlmConfig.ranks[user.rank]) === null || _a === void 0 ? void 0 : _a.activationAmount) || 100,
                    method: 'USDT BEP20',
                    status: 'completed',
                    details: {
                        walletAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
                        txHash: `0x${Math.random().toString(16).substr(2, 64)}`
                    },
                    createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                transactionCount++;
                // Create some income records
                if (user.totalEarnings > 0) {
                    const incomeTypes = ['referral', 'level', 'global', 'retopup'];
                    const incomePerType = user.totalEarnings / incomeTypes.length;
                    incomeTypes.forEach(type => {
                        const incomeRef = admin.firestore().collection(config_1.collections.INCOMES).doc();
                        batch.set(incomeRef, {
                            userId: user.uid,
                            type,
                            amount: incomePerType,
                            fromUserId: users[Math.floor(Math.random() * users.length)].uid,
                            description: `${type.charAt(0).toUpperCase() + type.slice(1)} income`,
                            createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000))
                        });
                        transactionCount++;
                    });
                }
                // Commit batch every 400 operations to avoid limits
                if (transactionCount >= 400) {
                    await batch.commit();
                    transactionCount = 0;
                }
            }
            if (transactionCount > 0) {
                await batch.commit();
            }
            await logger.info(logger_1.LogCategory.SYSTEM, 'Test transactions seeded successfully');
        }
        catch (error) {
            await logger.error(logger_1.LogCategory.SYSTEM, 'Test transactions seeding failed', error);
            throw error;
        }
    }
    /**
     * Seed global cycles
     */
    async seedGlobalCycles() {
        try {
            await logger.info(logger_1.LogCategory.SYSTEM, 'Seeding global cycles');
            const globalCycles = [
                {
                    id: 'cycle-001',
                    cycleNumber: 1,
                    targetAmount: config_1.mlmConfig.globalCycle.targetAmount,
                    currentAmount: config_1.mlmConfig.globalCycle.targetAmount,
                    status: 'completed',
                    participants: ['test-user-001', 'test-user-002', 'test-user-003'],
                    completedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
                    createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000))
                },
                {
                    id: 'cycle-002',
                    cycleNumber: 2,
                    targetAmount: config_1.mlmConfig.globalCycle.targetAmount,
                    currentAmount: config_1.mlmConfig.globalCycle.targetAmount * 0.7,
                    status: 'active',
                    participants: ['test-user-001', 'test-user-002', 'test-user-003', 'test-user-004'],
                    createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))
                }
            ];
            const batch = admin.firestore().batch();
            globalCycles.forEach(cycle => {
                const cycleRef = admin.firestore().collection(config_1.collections.GLOBAL_CYCLES).doc(cycle.id);
                batch.set(cycleRef, Object.assign(Object.assign({}, cycle), { updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
            });
            await batch.commit();
            await logger.info(logger_1.LogCategory.SYSTEM, 'Global cycles seeded successfully');
        }
        catch (error) {
            await logger.error(logger_1.LogCategory.SYSTEM, 'Global cycles seeding failed', error);
            throw error;
        }
    }
    /**
     * Clear all data from collections
     */
    async clearAllData() {
        try {
            await logger.info(logger_1.LogCategory.SYSTEM, 'Clearing all data');
            const collectionsToDelete = [
                config_1.collections.USERS,
                config_1.collections.TRANSACTIONS,
                config_1.collections.INCOMES,
                config_1.collections.WITHDRAWALS,
                config_1.collections.PAYOUT_QUEUE,
                config_1.collections.GLOBAL_CYCLES,
                config_1.collections.RANKS,
                config_1.collections.SETTINGS
            ];
            for (const collectionName of collectionsToDelete) {
                const snapshot = await admin.firestore().collection(collectionName).get();
                if (!snapshot.empty) {
                    const batch = admin.firestore().batch();
                    let count = 0;
                    snapshot.docs.forEach(doc => {
                        batch.delete(doc.ref);
                        count++;
                        // Commit batch every 400 operations
                        if (count >= 400) {
                            batch.commit();
                            count = 0;
                        }
                    });
                    if (count > 0) {
                        await batch.commit();
                    }
                }
            }
            // Delete Firebase Auth users (test users only)
            const authUsers = await admin.auth().listUsers();
            const testUserUids = authUsers.users
                .filter(user => { var _a, _b; return ((_a = user.email) === null || _a === void 0 ? void 0 : _a.includes('example.com')) || ((_b = user.email) === null || _b === void 0 ? void 0 : _b.includes('wayglobe.com')); })
                .map(user => user.uid);
            if (testUserUids.length > 0) {
                await admin.auth().deleteUsers(testUserUids);
            }
            await logger.info(logger_1.LogCategory.SYSTEM, 'All data cleared successfully');
        }
        catch (error) {
            await logger.error(logger_1.LogCategory.SYSTEM, 'Data clearing failed', error);
            throw error;
        }
    }
    /**
     * Check if database is already seeded
     */
    async isSeedComplete() {
        try {
            const [ranksSnapshot, settingsSnapshot, usersSnapshot] = await Promise.all([
                admin.firestore().collection(config_1.collections.RANKS).limit(1).get(),
                admin.firestore().collection(config_1.collections.SETTINGS).limit(1).get(),
                admin.firestore().collection(config_1.collections.USERS).limit(1).get()
            ]);
            return !ranksSnapshot.empty && !settingsSnapshot.empty && !usersSnapshot.empty;
        }
        catch (error) {
            await logger.error(logger_1.LogCategory.SYSTEM, 'Seed status check failed', error);
            return false;
        }
    }
    /**
     * Get seed status information
     */
    async getSeedStatus() {
        try {
            const [ranksCount, settingsCount, usersCount, transactionsCount, incomesCount, globalCyclesCount] = await Promise.all([
                admin.firestore().collection(config_1.collections.RANKS).count().get(),
                admin.firestore().collection(config_1.collections.SETTINGS).count().get(),
                admin.firestore().collection(config_1.collections.USERS).count().get(),
                admin.firestore().collection(config_1.collections.TRANSACTIONS).count().get(),
                admin.firestore().collection(config_1.collections.INCOMES).count().get(),
                admin.firestore().collection(config_1.collections.GLOBAL_CYCLES).count().get()
            ]);
            return {
                ranks: ranksCount.data().count,
                settings: settingsCount.data().count,
                users: usersCount.data().count,
                transactions: transactionsCount.data().count,
                incomes: incomesCount.data().count,
                globalCycles: globalCyclesCount.data().count,
                isComplete: ranksCount.data().count > 0 && settingsCount.data().count > 0 && usersCount.data().count > 0
            };
        }
        catch (error) {
            await logger.error(logger_1.LogCategory.SYSTEM, 'Seed status fetch failed', error);
            throw error;
        }
    }
}
exports.SeedService = SeedService;
//# sourceMappingURL=seedService.js.map
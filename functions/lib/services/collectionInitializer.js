"use strict";
/**
 * Collection Initializer Service
 * Handles initialization of all required Firestore collections
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
exports.initializeGlobalCollections = initializeGlobalCollections;
exports.initializeUserCollections = initializeUserCollections;
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
/**
 * Initialize global collections that should exist once in the system
 */
async function initializeGlobalCollections() {
    const db = admin.firestore();
    try {
        // Check if global collections already exist to avoid duplicates
        const settingsDoc = await db.collection(config_1.collections.SETTINGS).doc('default').get();
        if (!settingsDoc.exists) {
            await createGlobalCollections(db);
            await logger_1.logger.info(logger_1.LogCategory.SYSTEM, 'Global collections initialized successfully');
        }
    }
    catch (error) {
        await logger_1.logger.error(logger_1.LogCategory.SYSTEM, 'Failed to initialize global collections', error);
        throw error;
    }
}
/**
 * Create all global collections with initial documents
 */
async function createGlobalCollections(db) {
    const batch = db.batch();
    // 1. Settings collection
    const settingsRef = db.collection(config_1.collections.SETTINGS).doc('default');
    batch.set(settingsRef, {
        minWithdrawal: 10,
        withdrawalFeePercent: 15,
        fundConvertFeePercent: 10,
        p2pTransferFeePercent: 0,
        activationCurrency: 'USDT_BEP20',
        referralCommissionPercent: 50,
        levelIncomePercentages: {
            L1: 5,
            L2: 4,
            L3: 3,
            L4: 1,
            L5: 1,
            L6: 1
        },
        globalCyclesToRun: 14,
        autoTopUpEnabled: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    // 2. Admin collection (using a generic admin collection name)
    const adminRef = db.collection('admin').doc('admin_test_user');
    batch.set(adminRef, {
        adminId: 'admin_test_user',
        email: 'admin@example.com',
        name: 'Admin Test',
        role: 'superadmin',
        permissions: ['manageUsers', 'approveWithdrawals', 'editSettings'],
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    // 3. Cycles collection - Initialize for Azurite rank
    const cyclesRef = db.collection('cycles').doc('rank_Azurite');
    batch.set(cyclesRef, {
        rank: 'Azurite',
        currentCycle: 1,
        completedCount: 0,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        perLevelCounts: [0, 0, 0, 0, 0, 0]
    });
    // 4. Ranks collection - Create all rank documents
    const ranks = [
        {
            rankName: 'Azurite',
            order: 1,
            activationAmount: 5,
            investment: 5,
            globalReceivedIncome: 511.50,
            globalPerLevel: [5, 4, 3, 2, 1, 1, 0, 0, 0, 0],
            levelPercentages: { L1: 5, L2: 4, L3: 3, L4: 1, L5: 1, L6: 1 },
            nextRank: 'Benitoite',
            autoTopUpEnabled: true,
            cyclesToComplete: 14
        },
        {
            rankName: 'Benitoite',
            order: 2,
            activationAmount: 10,
            investment: 10,
            globalReceivedIncome: 1023.00,
            globalPerLevel: [10, 8, 6, 4, 2, 2, 0, 0, 0, 0],
            levelPercentages: { L1: 5, L2: 4, L3: 3, L4: 1, L5: 1, L6: 1 },
            nextRank: 'Citrine',
            autoTopUpEnabled: true,
            cyclesToComplete: 14
        },
        {
            rankName: 'Citrine',
            order: 3,
            activationAmount: 25,
            investment: 25,
            globalReceivedIncome: 2557.50,
            globalPerLevel: [25, 20, 15, 10, 5, 5, 0, 0, 0, 0],
            levelPercentages: { L1: 5, L2: 4, L3: 3, L4: 1, L5: 1, L6: 1 },
            nextRank: 'Danburite',
            autoTopUpEnabled: true,
            cyclesToComplete: 14
        },
        {
            rankName: 'Danburite',
            order: 4,
            activationAmount: 50,
            investment: 50,
            globalReceivedIncome: 5115.00,
            globalPerLevel: [50, 40, 30, 20, 10, 10, 0, 0, 0, 0],
            levelPercentages: { L1: 5, L2: 4, L3: 3, L4: 1, L5: 1, L6: 1 },
            nextRank: 'Emerald',
            autoTopUpEnabled: true,
            cyclesToComplete: 14
        },
        {
            rankName: 'Emerald',
            order: 5,
            activationAmount: 100,
            investment: 100,
            globalReceivedIncome: 10230.00,
            globalPerLevel: [100, 80, 60, 40, 20, 20, 0, 0, 0, 0],
            levelPercentages: { L1: 5, L2: 4, L3: 3, L4: 1, L5: 1, L6: 1 },
            nextRank: 'Fluorite',
            autoTopUpEnabled: true,
            cyclesToComplete: 14
        },
        {
            rankName: 'Fluorite',
            order: 6,
            activationAmount: 250,
            investment: 250,
            globalReceivedIncome: 25575.00,
            globalPerLevel: [250, 200, 150, 100, 50, 50, 0, 0, 0, 0],
            levelPercentages: { L1: 5, L2: 4, L3: 3, L4: 1, L5: 1, L6: 1 },
            nextRank: 'Garnet',
            autoTopUpEnabled: true,
            cyclesToComplete: 14
        },
        {
            rankName: 'Garnet',
            order: 7,
            activationAmount: 500,
            investment: 500,
            globalReceivedIncome: 51150.00,
            globalPerLevel: [500, 400, 300, 200, 100, 100, 0, 0, 0, 0],
            levelPercentages: { L1: 5, L2: 4, L3: 3, L4: 1, L5: 1, L6: 1 },
            nextRank: 'Hematite',
            autoTopUpEnabled: true,
            cyclesToComplete: 14
        },
        {
            rankName: 'Hematite',
            order: 8,
            activationAmount: 1000,
            investment: 1000,
            globalReceivedIncome: 102300.00,
            globalPerLevel: [1000, 800, 600, 400, 200, 200, 0, 0, 0, 0],
            levelPercentages: { L1: 5, L2: 4, L3: 3, L4: 1, L5: 1, L6: 1 },
            nextRank: 'Iolite',
            autoTopUpEnabled: true,
            cyclesToComplete: 14
        },
        {
            rankName: 'Iolite',
            order: 9,
            activationAmount: 2500,
            investment: 2500,
            globalReceivedIncome: 255750.00,
            globalPerLevel: [2500, 2000, 1500, 1000, 500, 500, 0, 0, 0, 0],
            levelPercentages: { L1: 5, L2: 4, L3: 3, L4: 1, L5: 1, L6: 1 },
            nextRank: 'Jeremejevite',
            autoTopUpEnabled: true,
            cyclesToComplete: 14
        },
        {
            rankName: 'Jeremejevite',
            order: 10,
            activationAmount: 5000,
            investment: 5000,
            globalReceivedIncome: 511500.00,
            globalPerLevel: [5000, 4000, 3000, 2000, 1000, 1000, 0, 0, 0, 0],
            levelPercentages: { L1: 5, L2: 4, L3: 3, L4: 1, L5: 1, L6: 1 },
            nextRank: null,
            autoTopUpEnabled: true,
            cyclesToComplete: 14
        }
    ];
    // Add all rank documents to batch
    ranks.forEach(rank => {
        const rankRef = db.collection(config_1.collections.RANKS).doc(rank.rankName);
        batch.set(rankRef, {
            ...rank,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    });
    await batch.commit();
}
/**
 * Initialize user-specific collections for a new user
 */
async function initializeUserCollections(uid) {
    const db = admin.firestore();
    try {
        const batch = db.batch();
        // 1. Withdrawals collection - Initial document
        const withdrawalRef = db.collection(config_1.collections.WITHDRAWALS).doc(`wd_${uid}_01`);
        batch.set(withdrawalRef, {
            withdrawalId: `wd_${uid}_01`,
            userId: uid,
            amountRequested: 0,
            feePercent: 15,
            feeAmount: 0,
            amountAfterFee: 0,
            currency: 'USDT_BEP20',
            status: 'pending',
            requestedAt: admin.firestore.FieldValue.serverTimestamp(),
            approvedAt: null,
            processedAt: null,
            processedBy: null,
            txHash: null,
            notes: null
        });
        // 2. Income Pools collection - Initial document
        const incomePoolRef = db.collection(config_1.collections.INCOME_POOLS).doc(`pool_${uid}_1`);
        batch.set(incomePoolRef, {
            poolId: `pool_${uid}_1`,
            userId: uid,
            rank: 'Azurite',
            amount: 0,
            generatedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active',
            linkedToTx: null
        });
        // 3. Payout Queue collection - Initial document
        const payoutRef = db.collection(config_1.collections.PAYOUT_QUEUE).doc(`pq_${uid}_01`);
        batch.set(payoutRef, {
            queueId: `pq_${uid}_01`,
            userId: uid,
            amount: 0,
            currency: 'USDT_BEP20',
            status: 'queued',
            attempts: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            txHash: null
        });
        // 4. Audit Logs collection - Initial signup log
        const auditRef = db.collection('auditLogs').doc(`log_${uid}_signup`);
        batch.set(auditRef, {
            logId: `log_${uid}_signup`,
            actorId: uid,
            action: 'user_signup',
            target: { type: 'user', id: uid },
            details: { rank: 'Azurite', activationAmount: 5 },
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        await batch.commit();
        await logger_1.logger.info(logger_1.LogCategory.SYSTEM, `User-specific collections initialized for user: ${uid}`);
    }
    catch (error) {
        await logger_1.logger.error(logger_1.LogCategory.SYSTEM, 'Failed to initialize user collections', error);
        throw error;
    }
}
//# sourceMappingURL=collectionInitializer.js.map
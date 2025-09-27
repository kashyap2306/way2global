"use strict";
/**
 * User Migration Script
 * Migrates existing users to ensure they have all required collections
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
exports.migrateSpecificUser = exports.migrateUsers = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
/**
 * Callable function to migrate existing users
 */
exports.migrateUsers = functions.https.onCall(async (data, context) => {
    try {
        // Check if user is authenticated and has admin privileges
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        await logger_1.logger.info(logger_1.LogCategory.SYSTEM, 'Starting user migration process');
        const db = admin.firestore();
        const result = {
            success: true,
            totalUsers: 0,
            migratedUsers: 0,
            errors: [],
            createdCollections: {}
        };
        // Fetch all existing users from Firebase Authentication
        const authUsers = await admin.auth().listUsers();
        result.totalUsers = authUsers.users.length;
        await logger_1.logger.info(logger_1.LogCategory.SYSTEM, `Found ${result.totalUsers} users in Firebase Auth to migrate`);
        // Process each user from Firebase Authentication
        for (const authUser of authUsers.users) {
            const userId = authUser.uid;
            const userEmail = authUser.email;
            try {
                await logger_1.logger.info(logger_1.LogCategory.SYSTEM, `Processing Auth user: ${userId} (${userEmail})`);
                // First, ensure the user document exists in Firestore
                const userDocCreated = await ensureUserDocument(db, authUser);
                // Get the user data from Firestore (either existing or newly created)
                const userDocRef = db.collection(config_1.collections.USERS).doc(userId);
                const userDoc = await userDocRef.get();
                const userData = userDoc.data();
                // Check and create missing collections for this user
                const createdCollections = await checkAndCreateMissingCollections(db, userId, userData);
                // Track what was created
                const allCreated = [];
                if (userDocCreated)
                    allCreated.push('users');
                allCreated.push(...createdCollections);
                if (allCreated.length > 0) {
                    result.migratedUsers++;
                    result.createdCollections[userId] = allCreated;
                    await logger_1.logger.info(logger_1.LogCategory.SYSTEM, `Migration completed for user ${userId}`, undefined, {
                        userId,
                        email: userEmail,
                        userDocCreated,
                        createdCollections: allCreated,
                        status: 'success'
                    });
                }
                else {
                    await logger_1.logger.info(logger_1.LogCategory.SYSTEM, `No migration needed for user ${userId}`, undefined, {
                        userId,
                        email: userEmail,
                        status: 'already_exists'
                    });
                }
            }
            catch (error) {
                const errorMessage = `Failed to migrate user ${userId}: ${error.message}`;
                result.errors.push(errorMessage);
                await logger_1.logger.error(logger_1.LogCategory.SYSTEM, `Migration error for user ${userId}`, error, undefined, {
                    userId,
                    email: userEmail,
                    status: 'error'
                });
            }
        }
        await logger_1.logger.info(logger_1.LogCategory.SYSTEM, 'User migration completed', undefined, {
            totalUsers: result.totalUsers,
            migratedUsers: result.migratedUsers,
            errors: result.errors.length
        });
        return result;
    }
    catch (error) {
        await logger_1.logger.error(logger_1.LogCategory.SYSTEM, 'User migration failed', error);
        throw new functions.https.HttpsError('internal', 'Migration process failed', error.message);
    }
});
/**
 * Ensure user document exists in Firestore users collection
 */
async function ensureUserDocument(db, authUser) {
    const userId = authUser.uid;
    const userDocRef = db.collection(config_1.collections.USERS).doc(userId);
    try {
        const userDoc = await userDocRef.get();
        if (!userDoc.exists) {
            // Create new user document with the required structure
            const newUserData = {
                uid: authUser.uid,
                email: authUser.email || '',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                status: 'active',
                profile: {
                    name: authUser.displayName || '',
                    contact: authUser.phoneNumber || '',
                    avatar: authUser.photoURL || ''
                },
                balances: {
                    main: 0,
                    referral: 0,
                    topup: 0
                }
            };
            await userDocRef.set(newUserData);
            await logger_1.logger.info(logger_1.LogCategory.SYSTEM, `Created user document for ${userId}`, undefined, {
                userId,
                email: authUser.email,
                action: 'user_document_created'
            });
            return true; // Document was created
        }
        return false; // Document already existed
    }
    catch (error) {
        await logger_1.logger.error(logger_1.LogCategory.SYSTEM, `Failed to ensure user document for ${userId}`, error, undefined, { userId, email: authUser.email });
        throw error;
    }
}
/**
 * Check and create missing collections for a specific user
 */
async function checkAndCreateMissingCollections(db, userId, userData) {
    const createdCollections = [];
    const batch = db.batch();
    // Define the collection structures based on user requirements
    const collectionStructures = {
        withdrawals: {
            withdrawalId: `wd_${userId}_migration`,
            userId: userId,
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
            notes: 'Migration document',
            // Additional fields from user requirements
            totalWithdrawn: 0,
            pending: [],
            history: []
        },
        reids: {
            reid: `REID_${userId}_migration`,
            userId: userId,
            originRank: userData.rank || 'Azurite',
            originCycle: 1,
            generatedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active',
            linkedToTx: null,
            // Additional fields from user requirements
            redisKey: '',
            score: 0,
            lastUpdated: null
        },
        settings: {
            userId: userId,
            notifications: true,
            theme: 'light',
            language: 'en',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        payoutQueue: {
            queueId: `pq_${userId}_migration`,
            userId: userId,
            amount: 0,
            currency: 'USDT_BEP20',
            status: 'queued',
            attempts: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            txHash: null,
            // Additional fields from user requirements
            queue: [],
            lastProcessed: null
        },
        admin: {
            userId: userId,
            isAdmin: false,
            roles: [],
            permissions: [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        auditLogs: {
            logId: `log_${userId}_migration`,
            actorId: userId,
            action: 'user_migration',
            target: { type: 'user', id: userId },
            details: { migrationDate: new Date().toISOString() },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            // Additional fields from user requirements
            logs: []
        },
        cycles: {
            userId: userId,
            currentCycle: userData.cyclesCompleted ? userData.cyclesCompleted + 1 : 1,
            completedCycles: [],
            lastCycleDate: null,
            rank: userData.rank || 'Azurite',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        ranks: {
            userId: userId,
            currentRank: userData.rank || 'Azurite',
            rankHistory: [],
            rankPoints: 0,
            activationAmount: userData.activationAmount || 5,
            rankActivatedAt: userData.rankActivatedAt || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
    };
    // Check each collection and create if missing
    const collectionsToCheck = [
        { name: 'withdrawals', collection: config_1.collections.WITHDRAWALS },
        { name: 'reids', collection: config_1.collections.REIDS },
        { name: 'settings', collection: 'settings' },
        { name: 'payoutQueue', collection: config_1.collections.PAYOUT_QUEUE },
        { name: 'admin', collection: 'admin' },
        { name: 'auditLogs', collection: 'auditLogs' },
        { name: 'cycles', collection: 'cycles' },
        { name: 'ranks', collection: 'ranks' }
    ];
    for (const { name, collection } of collectionsToCheck) {
        try {
            // Check if document exists in the collection for this user
            const existingDocs = await db.collection(collection)
                .where('userId', '==', userId)
                .limit(1)
                .get();
            if (existingDocs.empty) {
                // Create the missing document
                const docId = `${name}_${userId}_migration`;
                const docRef = db.collection(collection).doc(docId);
                batch.set(docRef, collectionStructures[name]);
                createdCollections.push(name);
                await logger_1.logger.info(logger_1.LogCategory.SYSTEM, `Queued creation of ${name} collection for user ${userId}`);
            }
        }
        catch (error) {
            await logger_1.logger.error(logger_1.LogCategory.SYSTEM, `Error checking ${name} collection for user ${userId}`, error);
            throw error;
        }
    }
    // Commit all changes in a single batch
    if (createdCollections.length > 0) {
        await batch.commit();
        await logger_1.logger.info(logger_1.LogCategory.SYSTEM, `Successfully created ${createdCollections.length} collections for user ${userId}`, undefined, { userId, createdCollections });
    }
    return createdCollections;
}
/**
 * Helper function to run migration for a specific user (for testing)
 */
exports.migrateSpecificUser = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { userId } = data;
        if (!userId) {
            throw new functions.https.HttpsError('invalid-argument', 'userId is required');
        }
        const db = admin.firestore();
        // Get user data
        const userDoc = await db.collection(config_1.collections.USERS).doc(userId).get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }
        const userData = userDoc.data();
        const createdCollections = await checkAndCreateMissingCollections(db, userId, userData);
        return {
            success: true,
            userId,
            createdCollections,
            message: `Migration completed for user ${userId}. Created ${createdCollections.length} collections.`
        };
    }
    catch (error) {
        await logger_1.logger.error(logger_1.LogCategory.SYSTEM, `Migration failed for user ${data.userId}`, error);
        throw new functions.https.HttpsError('internal', 'Migration failed', error.message);
    }
});
//# sourceMappingURL=migrateUsers.js.map
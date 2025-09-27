/**
 * User Signup Service - Comprehensive Document Creation
 * Handles automatic creation of all required documents for new user signups
 */
import * as admin from 'firebase-admin';
export declare function generateUserCode(): Promise<string>;
export declare function createDocumentTemplates(uid: string, userCode: string, userData: any): {
    users: {
        uid: string;
        userCode: string;
        displayName: any;
        email: any;
        phone: any;
        rank: string;
        teamSize: number;
        isActive: boolean;
        availableBalance: number;
        pendingBalance: number;
        totalEarnings: number;
        createdAt: admin.firestore.FieldValue;
        updatedAt: admin.firestore.FieldValue;
        walletAddress: any;
    };
    transactions: {
        uid: string;
        userCode: string;
        transactionId: string;
        type: string;
        amount: number;
        currency: string;
        status: string;
        description: string;
        createdAt: admin.firestore.FieldValue;
        updatedAt: admin.firestore.FieldValue;
    };
    incomeTransactions: {
        _placeholder: boolean;
        type: string;
        createdAt: admin.firestore.FieldValue;
    };
    withdrawals: {
        uid: string;
        userCode: string;
        withdrawalId: string;
        amount: number;
        currency: string;
        status: string;
        method: string;
        description: string;
        createdAt: admin.firestore.FieldValue;
        updatedAt: admin.firestore.FieldValue;
    };
    settings: {
        uid: string;
        userCode: string;
        notifications: {
            email: boolean;
            sms: boolean;
            push: boolean;
        };
        privacy: {
            profileVisible: boolean;
            showEarnings: boolean;
        };
        preferences: {
            language: string;
            currency: string;
            timezone: string;
        };
        security: {
            twoFactorEnabled: boolean;
            loginNotifications: boolean;
        };
        createdAt: admin.firestore.FieldValue;
        updatedAt: admin.firestore.FieldValue;
    };
    reids: {
        uid: string;
        userCode: string;
        reidId: string;
        isActive: boolean;
        linkedUserId: string;
        createdAt: admin.firestore.FieldValue;
        updatedAt: admin.firestore.FieldValue;
    };
    rateLimits: {
        uid: string;
        userCode: string;
        signupAttempts: number;
        lastSignupAttempt: admin.firestore.FieldValue;
        dailyLimit: number;
        resetDate: admin.firestore.FieldValue;
        createdAt: admin.firestore.FieldValue;
        updatedAt: admin.firestore.FieldValue;
    };
    payoutQueue: {
        uid: string;
        userCode: string;
        queuePosition: number;
        totalPending: number;
        lastProcessed: null;
        status: string;
        createdAt: admin.firestore.FieldValue;
        updatedAt: admin.firestore.FieldValue;
    };
    auditLogs: {
        action: string;
        actorId: string;
        actorUid: string;
        createdAt: admin.firestore.FieldValue;
        details: {
            activationAmount: number;
            rank: string;
        };
        target: {
            id: string;
            type: string;
            targetUid: string;
            targetUserCode: string;
        };
        logId: string;
    };
    cycles: {
        uid: string;
        userCode: string;
        currentRank: string;
        cycleNumber: number;
        position: number;
        isActive: boolean;
        completedAt: null;
        earnings: number;
        createdAt: admin.firestore.FieldValue;
        updatedAt: admin.firestore.FieldValue;
    };
};
export declare function createAllUserDocuments(uid: string, userData: any, sponsorId?: string): Promise<void>;
export declare function checkUserDocumentsExist(uid: string): Promise<boolean>;
export declare function validateUserDocuments(uid: string): Promise<boolean>;
export declare function createRankTemplates(): Promise<void>;
//# sourceMappingURL=userSignupService.d.ts.map
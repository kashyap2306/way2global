/**
 * TypeScript Interfaces and Types for MLM Platform
 */
import { Timestamp } from 'firebase-admin/firestore';
export declare enum UserStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    SUSPENDED = "suspended",
    BLOCKED = "blocked"
}
export declare enum TransactionType {
    ACTIVATION = "activation",
    REFERRAL = "referral",
    LEVEL = "level",
    GLOBAL = "global",
    WITHDRAWAL = "withdrawal",
    DEPOSIT = "deposit",
    ADMIN_ADJUSTMENT = "admin_adjustment"
}
export declare enum TransactionStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export declare enum PaymentMethod {
    USDT_BEP20 = "usdt_bep20",
    FUND_CONVERSION = "fund_conversion",
    P2P = "p2p"
}
export declare enum IncomeType {
    REFERRAL = "referral",
    LEVEL = "level",
    GLOBAL = "global"
}
export declare enum WithdrawalStatus {
    PENDING = "pending",
    APPROVED = "approved",
    PROCESSING = "processing",
    COMPLETED = "completed",
    REJECTED = "rejected"
}
export declare enum PayoutStatus {
    PENDING = "pending",
    CLAIMED = "claimed",
    EXPIRED = "expired"
}
export declare enum GlobalCycleStatus {
    ACTIVE = "active",
    COMPLETED = "completed"
}
export declare enum LogCategory {
    AUTH = "auth",
    TRANSACTION = "transaction",
    INCOME = "income",
    WITHDRAWAL = "withdrawal",
    SYSTEM = "system",
    ERROR = "error"
}
export interface IncomePool {
    id: string;
    rank: string;
    userId: string;
    poolIncome: number;
    isLocked: boolean;
    canClaim: boolean;
    directReferralsCount: number;
    requiredDirectReferrals: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    claimedAt?: Timestamp;
}
export interface PlatformSettings {
    id: string;
    directReferralRequirement: number;
    maintenanceMode: boolean;
    registrationOpen: boolean;
    welcomeBonus: number;
    maxRankLevel: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    updatedBy?: string;
}
export interface User {
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    country?: string;
    sponsorId?: string;
    placementId?: string;
    position?: 'left' | 'right';
    status: UserStatus;
    currentRank: string;
    joinDate: Timestamp;
    lastActive: Timestamp;
    isActivated: boolean;
    activationDate?: Timestamp;
    leftChild?: string;
    rightChild?: string;
    leftCount: number;
    rightCount: number;
    leftBV: number;
    rightBV: number;
    totalBV: number;
    availableBalance: number;
    lockedBalance: number;
    totalEarnings: number;
    totalWithdrawn: number;
    directReferrals: number;
    teamSize: number;
    totalIncome: number;
    rankActivations: {
        [rankName: string]: {
            isActive: boolean;
            activatedAt?: Timestamp;
            poolIncome: number;
            canClaim: boolean;
        };
    };
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
export interface UserProfile {
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    country?: string;
    avatar?: string;
    bio?: string;
    dateOfBirth?: Timestamp;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
    };
    socialLinks?: {
        facebook?: string;
        twitter?: string;
        linkedin?: string;
        instagram?: string;
    };
    preferences?: {
        language: string;
        timezone: string;
        currency: string;
    };
    updatedAt: Timestamp;
}
export interface Rank {
    id: string;
    name: string;
    level: number;
    activationFee: number;
    requirements: {
        directReferrals: number;
        teamBV: number;
        personalBV: number;
    };
    benefits: {
        referralBonus: number;
        levelBonus: number[];
        globalPoolShare: number;
        maxPoolIncome: number;
    };
    isActive: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
export interface Transaction {
    id: string;
    userId: string;
    type: TransactionType;
    status: TransactionStatus;
    amount: number;
    fee: number;
    netAmount: number;
    paymentMethod: PaymentMethod;
    paymentDetails: {
        walletAddress?: string;
        transactionHash?: string;
        fromUserId?: string;
        toUserId?: string;
        reference?: string;
    };
    rankId?: string;
    rankName?: string;
    cycleNumber?: number;
    description: string;
    notes?: string;
    processedAt?: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
export interface Income {
    id: string;
    userId: string;
    type: IncomeType;
    amount: number;
    sourceUserId?: string;
    sourceTransactionId?: string;
    sourceRankId?: string;
    level?: number;
    globalCycleId?: string;
    cycleNumber?: number;
    description: string;
    calculatedAt: Timestamp;
    paidAt?: Timestamp;
    createdAt: Timestamp;
}
export interface Withdrawal {
    id: string;
    userId: string;
    amount: number;
    fee: number;
    netAmount: number;
    method: PaymentMethod;
    status: WithdrawalStatus;
    paymentDetails: {
        walletAddress?: string;
        bankAccount?: string;
        recipientUserId?: string;
        reference?: string;
    };
    processedBy?: string;
    processedAt?: Timestamp;
    transactionHash?: string;
    notes?: string;
    rejectionReason?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
export interface Payout {
    id: string;
    userId: string;
    amount: number;
    status: PayoutStatus;
    sourceType: 'withdrawal' | 'income' | 'bonus';
    sourceId: string;
    claimPassword?: string;
    claimedAt?: Timestamp;
    expiresAt: Timestamp;
    description: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
export interface GlobalCycle {
    id: string;
    cycleNumber: number;
    status: GlobalCycleStatus;
    participants: string[];
    totalParticipants: number;
    totalPool: number;
    distributedAmount: number;
    startedAt: Timestamp;
    completedAt?: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
export interface SystemSettings {
    withdrawal: {
        minAmount: number;
        maxAmount: number;
        dailyLimit: number;
        processingFee: number;
        processingTime: string;
    };
    income: {
        referralBonus: number;
        levelBonuses: number[];
        globalPoolPercentage: number;
    };
    globalCycle: {
        participantLimit: number;
        poolDistribution: number[];
        autoProcessing: boolean;
        processingInterval: number;
    };
    platform: {
        directReferralRequirement: number;
        maintenanceMode: boolean;
        registrationOpen: boolean;
        welcomeBonus: number;
        maxRankLevel: number;
    };
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    timestamp?: Timestamp;
}
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}
export interface UserDashboard {
    user: User;
    balances: {
        available: number;
        pending: number;
        total: number;
        withdrawn: number;
    };
    statistics: {
        totalIncome: number;
        monthlyIncome: number;
        directReferrals: number;
        teamSize: number;
        businessVolume: number;
    };
    rank: {
        current: Rank;
        next?: Rank;
        progress: {
            directReferrals: number;
            teamBV: number;
            personalBV: number;
            percentage: number;
        };
    };
    recentTransactions: Transaction[];
    recentIncomes: Income[];
}
export interface AdminDashboard {
    statistics: {
        totalUsers: number;
        activeUsers: number;
        inactiveUsers: number;
        suspendedUsers: number;
        totalTransactions: number;
        pendingWithdrawals: number;
        completedWithdrawals: number;
        totalVolume: number;
        monthlyVolume: number;
    };
    recentUsers: User[];
    recentTransactions: Transaction[];
    recentWithdrawals: Withdrawal[];
}
export interface TeamMember {
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    rank: string;
    status: UserStatus;
    joinDate: Timestamp;
    businessVolume: number;
    directReferrals: number;
    teamSize: number;
    position?: 'left' | 'right';
    level: number;
}
export interface TeamStructure {
    user: TeamMember;
    left?: TeamStructure;
    right?: TeamStructure;
    statistics: {
        totalMembers: number;
        activeMembers: number;
        totalBV: number;
        leftBV: number;
        rightBV: number;
    };
}
export interface ValidationError {
    field: string;
    message: string;
    code: string;
}
export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}
export interface LogEntry {
    id: string;
    category: LogCategory;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    userId?: string;
    metadata?: Record<string, any>;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
    timestamp: Timestamp;
    createdAt: Timestamp;
}
export type Partial<T> = {
    [P in keyof T]?: T[P];
};
export type Required<T> = {
    [P in keyof T]-?: T[P];
};
export type Pick<T, K extends keyof T> = {
    [P in K]: T[P];
};
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export interface CustomClaims {
    admin?: boolean;
    superAdmin?: boolean;
    rank?: string;
    status?: UserStatus;
    isActivated?: boolean;
}
export * from './index';
//# sourceMappingURL=index.d.ts.map
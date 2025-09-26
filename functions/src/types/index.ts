/**
 * TypeScript Interfaces and Types for MLM Platform
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================================================
// ENUMS
// ============================================================================

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BLOCKED = 'blocked'
}

export enum TransactionType {
  ACTIVATION = 'activation',
  AUTO_TOPUP = 'auto_topup',
  WITHDRAWAL = 'withdrawal',
  DEPOSIT = 'deposit',
  TRANSFER = 'transfer'
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum PaymentMethod {
  USDT_BEP20 = 'usdt_bep20',
  FUND_CONVERSION = 'fund_conversion',
  P2P = 'p2p'
}

export enum IncomeType {
  REFERRAL = 'referral',
  LEVEL = 'level',
  GLOBAL = 'global',
  RE_TOPUP = 're_topup'
}

export enum WithdrawalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  REJECTED = 'rejected'
}

export enum PayoutStatus {
  PENDING = 'pending',
  CLAIMED = 'claimed',
  EXPIRED = 'expired'
}

export enum GlobalCycleStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed'
}

export enum LogCategory {
  AUTH = 'auth',
  TRANSACTION = 'transaction',
  INCOME = 'income',
  WITHDRAWAL = 'withdrawal',
  SYSTEM = 'system',
  ERROR = 'error'
}

// ============================================================================
// USER INTERFACES
// ============================================================================

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
  
  // MLM Structure
  leftChild?: string;
  rightChild?: string;
  leftCount: number;
  rightCount: number;
  leftBV: number;
  rightBV: number;
  totalBV: number;
  
  // Balances
  availableBalance: number;
  pendingBalance: number;
  totalEarnings: number;
  totalWithdrawn: number;
  
  // Statistics
  directReferrals: number;
  teamSize: number;
  totalIncome: number;
  
  // Settings
  autoTopup: boolean;
  notifications: boolean;
  
  // Metadata
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
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
  updatedAt: Timestamp;
}

// ============================================================================
// RANK INTERFACES
// ============================================================================

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
    reTopupBonus: number;
  };
  autoTopup: {
    enabled: boolean;
    amount: number;
    maxCycles: number;
  };
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// TRANSACTION INTERFACES
// ============================================================================

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  fee: number;
  netAmount: number;
  
  // Payment Details
  paymentMethod: PaymentMethod;
  paymentDetails: {
    walletAddress?: string;
    transactionHash?: string;
    fromUserId?: string;
    toUserId?: string;
    reference?: string;
  };
  
  // MLM Details
  rankId?: string;
  rankName?: string;
  cycleNumber?: number;
  
  // Metadata
  description: string;
  notes?: string;
  processedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// INCOME INTERFACES
// ============================================================================

export interface Income {
  id: string;
  userId: string;
  type: IncomeType;
  amount: number;
  
  // Source Information
  sourceUserId?: string;
  sourceTransactionId?: string;
  sourceRankId?: string;
  level?: number;
  
  // Global Cycle Information
  globalCycleId?: string;
  cycleNumber?: number;
  
  // Metadata
  description: string;
  calculatedAt: Timestamp;
  paidAt?: Timestamp;
  createdAt: Timestamp;
}

// ============================================================================
// WITHDRAWAL INTERFACES
// ============================================================================

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  fee: number;
  netAmount: number;
  method: PaymentMethod;
  status: WithdrawalStatus;
  
  // Payment Details
  paymentDetails: {
    walletAddress?: string;
    bankAccount?: string;
    recipientUserId?: string;
    reference?: string;
  };
  
  // Processing Information
  processedBy?: string;
  processedAt?: Timestamp;
  transactionHash?: string;
  
  // Metadata
  notes?: string;
  rejectionReason?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// PAYOUT INTERFACES
// ============================================================================

export interface Payout {
  id: string;
  userId: string;
  amount: number;
  status: PayoutStatus;
  
  // Source Information
  sourceType: 'withdrawal' | 'income' | 'bonus';
  sourceId: string;
  
  // Claim Information
  claimPassword?: string;
  claimedAt?: Timestamp;
  expiresAt: Timestamp;
  
  // Metadata
  description: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// GLOBAL CYCLE INTERFACES
// ============================================================================

export interface GlobalCycle {
  id: string;
  cycleNumber: number;
  status: GlobalCycleStatus;
  
  // Participants
  participants: string[];
  totalParticipants: number;
  
  // Financial Information
  totalPool: number;
  distributedAmount: number;
  
  // Timing
  startedAt: Timestamp;
  completedAt?: Timestamp;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// SETTINGS INTERFACES
// ============================================================================

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
    reTopupBonus: number;
  };
  globalCycle: {
    participantLimit: number;
    poolDistribution: number[];
    autoProcessing: boolean;
    processingInterval: number;
  };
  system: {
    maintenanceMode: boolean;
    registrationOpen: boolean;
    welcomeBonus: number;
    maxRankLevel: number;
  };
}

// ============================================================================
// API RESPONSE INTERFACES
// ============================================================================

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

// ============================================================================
// DASHBOARD INTERFACES
// ============================================================================

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

// ============================================================================
// TEAM INTERFACES
// ============================================================================

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

// ============================================================================
// VALIDATION INTERFACES
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// ============================================================================
// LOG INTERFACES
// ============================================================================

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

// ============================================================================
// UTILITY TYPES
// ============================================================================

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

// ============================================================================
// FIREBASE CUSTOM CLAIMS
// ============================================================================

export interface CustomClaims {
  admin?: boolean;
  superAdmin?: boolean;
  rank?: string;
  status?: UserStatus;
  isActivated?: boolean;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export * from './index';
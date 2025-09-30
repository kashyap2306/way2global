import * as functions from 'firebase-functions';

// Environment configuration
export const config = {
  // Firebase configuration
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || functions.config().firebase?.project_id,
    region: 'us-central1'
  },

  // Security configuration
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY || functions.config().security?.encryption_key,
    jwtSecret: process.env.JWT_SECRET || functions.config().security?.jwt_secret,
    bcryptRounds: 12
  },

  // External API configuration
  apis: {
    paymentGateway: {
      apiKey: process.env.PAYMENT_GATEWAY_API_KEY || functions.config().apis?.payment_gateway?.api_key,
      baseUrl: process.env.PAYMENT_GATEWAY_URL || 'https://api.paymentgateway.com'
    },
    blockchain: {
      apiKey: process.env.BLOCKCHAIN_API_KEY || functions.config().apis?.blockchain?.api_key,
      baseUrl: process.env.BLOCKCHAIN_URL || 'https://api.bscscan.com'
    }
  },

  // Rate limiting configuration
  rateLimits: {
    signup: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5 // 5 attempts per window
    },
    login: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10 // 10 attempts per window
    },
    withdrawal: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5 // 5 withdrawal requests per hour
    },
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // 100 requests per window
    }
  },

  // CORS configuration
  cors: {
    origin: [
      'https://wayglobe.com',
      'https://www.wayglobe.com',
      'https://admin.wayglobe.com',
      // Development origins
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:4000'
    ],
    credentials: true,
    optionsSuccessStatus: 200
  }
};

// MLM Business Rules Configuration
export const mlmConfig = {
  // Rank system - Updated to match user's plan
  ranks: {
    azurite: { 
      name: 'Azurite', 
      activationAmount: 5, // ✓ Correct per plan
      benefits: { levelIncome: true, globalIncome: false } 
    },
    pearl: { 
      name: 'Pearl', 
      activationAmount: 10, // ✓ Fixed per plan (was 25)
      benefits: { levelIncome: true, globalIncome: true } 
    },
    ruby: { 
      name: 'Ruby', 
      activationAmount: 20, // ✓ Fixed per plan (was 125)
      benefits: { levelIncome: true, globalIncome: true } 
    },
    emerald: { 
      name: 'Emerald', 
      activationAmount: 40, // ✓ Fixed per plan (was 625)
      benefits: { levelIncome: true, globalIncome: true } 
    },
    sapphire: { 
      name: 'Sapphire', 
      activationAmount: 80, // ✓ Fixed per plan (was 3125)
      benefits: { levelIncome: true, globalIncome: true } 
    },
    diamond: { 
      name: 'Diamond', 
      activationAmount: 160, // ✓ Fixed per plan (was 15625)
      benefits: { levelIncome: true, globalIncome: true } 
    },
    doubleDiamond: { 
      name: 'Double Diamond', 
      activationAmount: 320, // ✓ Fixed per plan (was 78125)
      benefits: { levelIncome: true, globalIncome: true } 
    },
    tripleDiamond: { 
      name: 'Triple Diamond', 
      activationAmount: 640, // ✓ Fixed per plan (was 390625)
      benefits: { levelIncome: true, globalIncome: true } 
    },
    crown: { 
      name: 'Crown', 
      activationAmount: 1280, // ✓ Fixed per plan (was 1953125)
      benefits: { levelIncome: true, globalIncome: true } 
    },
    royalCrown: { 
      name: 'Royal Crown', 
      activationAmount: 2560, // ✓ Fixed per plan (was 9765625)
      benefits: { levelIncome: true, globalIncome: true } 
    }
  },

  // Income percentages
  incomes: {
    referral: {
      percentage: 50 // 50% of direct referral activation
    },
    level: {
      L1: 5,  // 5%
      L2: 4,  // 4%
      L3: 3,  // 3%
      L4: 1,  // 1%
      L5: 1,  // 1%
      L6: 1   // 1%
    },
    global: {
      percentage: 10, // 10% distributed across global cycle
      levels: 10,     // 10 levels in global cycle
      cycleSize: 1024 // 2^10 = 1024 users per cycle
    }
  },

  // Withdrawal settings
  withdrawal: {
    minimum: 10,           // Minimum $10 withdrawal
    minimumAmount: 10,     // Alias for minimum
    bankDeduction: 15,     // 15% deduction for bank withdrawal
    fundConversion: 10,    // 10% for fund conversion
    p2pFee: 0,            // P2P is free
    usdtFee: 5,           // 5% for USDT withdrawal
    processingFeePercentage: 5, // General processing fee
    networkFees: {
      usdt: 2,            // USDT network fee
      bank: 5,            // Bank transfer fee
      bep20: 2,           // BEP20 network fee
      p2p: 0              // P2P is free
    },
    dailyLimit: 10000,    // Daily withdrawal limit
    processingTime: {
      bank: 24 * 60 * 60 * 1000,    // 24 hours
      usdt: 2 * 60 * 60 * 1000,     // 2 hours
      p2p: 5 * 60 * 1000            // 5 minutes
    }
  },

  // Global cycle settings
  globalCycle: {
    triggerInterval: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    maxCyclesPerRun: 10, // Maximum cycles to process per run
    targetAmount: 1000, // Target amount for global cycle completion
    processingInterval: 5 * 60 * 1000, // 5 minutes in milliseconds
    reIdGeneration: false // Disable RE-ID generation
  },

  // Validation rules
  validation: {
    email: {
      pattern: /^[a-zA-Z0-9._%+-]+@gmail\.com$/,
      message: 'Only Gmail addresses are allowed'
    },
    walletAddress: {
      pattern: /^0x[a-fA-F0-9]{40}$/,
      message: 'Invalid USDT BEP20 wallet address'
    },
    contactNumber: {
      pattern: /^\+?[1-9]\d{1,14}$/,
      message: 'Invalid contact number format'
    },
    password: {
      minLength: 6,
      message: 'Password must be at least 6 characters long'
    }
  }
};

// Database collection names
export const collections = {
  USERS: 'users',
  TRANSACTIONS: 'transactions',
  INCOMES: 'incomes',
  RANKS: 'ranks',
  INCOME_TRANSACTIONS: 'incomeTransactions',
  WITHDRAWALS: 'withdrawals',
  INCOME_POOLS: 'incomePools',
  SETTINGS: 'settings',
  PAYOUT_QUEUE: 'payoutQueue',
  SECURITY_LOGS: 'securityLogs',
  GLOBAL_CYCLES: 'globalCycles'
};

// Error codes
export const errorCodes = {
  // Authentication errors
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  
  // Validation errors
  VALIDATION_INVALID_EMAIL: 'VALIDATION_INVALID_EMAIL',
  VALIDATION_INVALID_WALLET: 'VALIDATION_INVALID_WALLET',
  VALIDATION_INVALID_CONTACT: 'VALIDATION_INVALID_CONTACT',
  VALIDATION_INVALID_AMOUNT: 'VALIDATION_INVALID_AMOUNT',
  
  // Business logic errors
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INVALID_RANK_UPGRADE: 'INVALID_RANK_UPGRADE',
  SPONSOR_NOT_FOUND: 'SPONSOR_NOT_FOUND',
  USER_ALREADY_ACTIVE: 'USER_ALREADY_ACTIVE',
  
  // System errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  
  // Additional error codes
  SIGNUP_FAILED: 'SIGNUP_FAILED',
  LOGIN_FAILED: 'LOGIN_FAILED',
  ACTIVATION_FAILED: 'ACTIVATION_FAILED',
  WITHDRAWAL_FAILED: 'WITHDRAWAL_FAILED',
  PAYOUT_CLAIM_FAILED: 'PAYOUT_CLAIM_FAILED'
};

// Success messages
export const successMessages = {
  USER_CREATED: 'User created successfully',
  ACTIVATION_SUCCESSFUL: 'Rank activation successful',
  ACTIVATION_CREATED: 'Activation created successfully',
  WITHDRAWAL_REQUESTED: 'Withdrawal request submitted',
  PROFILE_UPDATED: 'Profile updated successfully',
  PAYOUT_CLAIMED: 'Payout claimed successfully',
  LOGIN_SUCCESS: 'Login successful'
};

// Environment check
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';

// Export individual configurations for backward compatibility
export const rateLimits = config.rateLimits;
export const corsOptions = config.cors;
export const bcryptRounds = config.security.bcryptRounds;
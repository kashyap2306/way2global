export declare const config: {
    firebase: {
        projectId: any;
        region: string;
    };
    security: {
        encryptionKey: any;
        jwtSecret: any;
        bcryptRounds: number;
    };
    apis: {
        paymentGateway: {
            apiKey: any;
            baseUrl: string;
        };
        blockchain: {
            apiKey: any;
            baseUrl: string;
        };
    };
    rateLimits: {
        signup: {
            windowMs: number;
            max: number;
        };
        login: {
            windowMs: number;
            max: number;
        };
        withdrawal: {
            windowMs: number;
            max: number;
        };
        general: {
            windowMs: number;
            max: number;
        };
    };
    cors: {
        origin: string[];
        credentials: boolean;
        optionsSuccessStatus: number;
    };
};
export declare const mlmConfig: {
    ranks: {
        azurite: {
            name: string;
            activationAmount: number;
            benefits: {
                levelIncome: boolean;
                globalIncome: boolean;
            };
        };
        pearl: {
            name: string;
            activationAmount: number;
            benefits: {
                levelIncome: boolean;
                globalIncome: boolean;
            };
        };
        ruby: {
            name: string;
            activationAmount: number;
            benefits: {
                levelIncome: boolean;
                globalIncome: boolean;
            };
        };
        emerald: {
            name: string;
            activationAmount: number;
            benefits: {
                levelIncome: boolean;
                globalIncome: boolean;
            };
        };
        sapphire: {
            name: string;
            activationAmount: number;
            benefits: {
                levelIncome: boolean;
                globalIncome: boolean;
            };
        };
        diamond: {
            name: string;
            activationAmount: number;
            benefits: {
                levelIncome: boolean;
                globalIncome: boolean;
            };
        };
        doubleDiamond: {
            name: string;
            activationAmount: number;
            benefits: {
                levelIncome: boolean;
                globalIncome: boolean;
            };
        };
        tripleDiamond: {
            name: string;
            activationAmount: number;
            benefits: {
                levelIncome: boolean;
                globalIncome: boolean;
            };
        };
        crown: {
            name: string;
            activationAmount: number;
            benefits: {
                levelIncome: boolean;
                globalIncome: boolean;
            };
        };
        royalCrown: {
            name: string;
            activationAmount: number;
            benefits: {
                levelIncome: boolean;
                globalIncome: boolean;
            };
        };
    };
    incomes: {
        referral: {
            percentage: number;
        };
        level: {
            L1: number;
            L2: number;
            L3: number;
            L4: number;
            L5: number;
            L6: number;
        };
        global: {
            percentage: number;
            levels: number;
            cycleSize: number;
        };
    };
    withdrawal: {
        minimum: number;
        minimumAmount: number;
        bankDeduction: number;
        fundConversion: number;
        p2pFee: number;
        usdtFee: number;
        processingFeePercentage: number;
        networkFees: {
            usdt: number;
            bank: number;
            bep20: number;
            p2p: number;
        };
        dailyLimit: number;
        processingTime: {
            bank: number;
            usdt: number;
            p2p: number;
        };
    };
    globalCycle: {
        triggerInterval: number;
        maxCyclesPerRun: number;
        targetAmount: number;
        processingInterval: number;
        reIdGeneration: boolean;
    };
    validation: {
        email: {
            pattern: RegExp;
            message: string;
        };
        walletAddress: {
            pattern: RegExp;
            message: string;
        };
        contactNumber: {
            pattern: RegExp;
            message: string;
        };
        password: {
            minLength: number;
            message: string;
        };
    };
};
export declare const collections: {
    USERS: string;
    TRANSACTIONS: string;
    INCOMES: string;
    RANKS: string;
    INCOME_TRANSACTIONS: string;
    WITHDRAWALS: string;
    INCOME_POOLS: string;
    SETTINGS: string;
    PAYOUT_QUEUE: string;
    SECURITY_LOGS: string;
    GLOBAL_CYCLES: string;
};
export declare const errorCodes: {
    AUTH_INVALID_TOKEN: string;
    AUTH_TOKEN_EXPIRED: string;
    AUTH_INSUFFICIENT_PERMISSIONS: string;
    VALIDATION_INVALID_EMAIL: string;
    VALIDATION_INVALID_WALLET: string;
    VALIDATION_INVALID_CONTACT: string;
    VALIDATION_INVALID_AMOUNT: string;
    INSUFFICIENT_BALANCE: string;
    INVALID_RANK_UPGRADE: string;
    SPONSOR_NOT_FOUND: string;
    USER_ALREADY_ACTIVE: string;
    DATABASE_ERROR: string;
    EXTERNAL_API_ERROR: string;
    INTERNAL_SERVER_ERROR: string;
    SIGNUP_FAILED: string;
    LOGIN_FAILED: string;
    ACTIVATION_FAILED: string;
    WITHDRAWAL_FAILED: string;
    PAYOUT_CLAIM_FAILED: string;
};
export declare const successMessages: {
    USER_CREATED: string;
    ACTIVATION_SUCCESSFUL: string;
    ACTIVATION_CREATED: string;
    WITHDRAWAL_REQUESTED: string;
    PROFILE_UPDATED: string;
    PAYOUT_CLAIMED: string;
    LOGIN_SUCCESS: string;
};
export declare const isDevelopment: boolean;
export declare const isProduction: boolean;
export declare const isTest: boolean;
export declare const rateLimits: {
    signup: {
        windowMs: number;
        max: number;
    };
    login: {
        windowMs: number;
        max: number;
    };
    withdrawal: {
        windowMs: number;
        max: number;
    };
    general: {
        windowMs: number;
        max: number;
    };
};
export declare const corsOptions: {
    origin: string[];
    credentials: boolean;
    optionsSuccessStatus: number;
};
export declare const bcryptRounds: number;
//# sourceMappingURL=config.d.ts.map
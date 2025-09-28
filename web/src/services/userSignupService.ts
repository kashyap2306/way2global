import { 
  doc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';

import { db } from '../config/firebase';
import type { User } from 'firebase/auth';

// Generate unique userCode in WG12345 format
export const generateUserCode = async (): Promise<string> => {
  let userCode: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    // Generate 5-digit random number
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    userCode = `WG${randomNum}`;
    
    // Check if userCode already exists
    const usersQuery = query(
      collection(db, 'users'),
      where('userCode', '==', userCode)
    );
    
    const querySnapshot = await getDocs(usersQuery);
    isUnique = querySnapshot.empty;
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique userCode after maximum attempts');
  }

  return userCode!;
};

// Document templates for all collections
export const createUserDocumentTemplate = (
  uid: string,
  userCode: string,
  email: string,
  displayName: string,
  sponsorId?: string
) => ({
  uid,
  userCode,
  email,
  displayName,
  contact: '',
  walletAddress: '0x745ECD992E8bF99CD298E60C65e98962E16207bE', // Default wallet
  sponsorId: sponsorId || null,
  referrals: [],
  rank: 'Azurite',
  rankActivatedAt: serverTimestamp(),
  activationAmount: 0,
  balance: 0,
  availableBalance: 0,
  pendingBalance: 0,
  totalEarnings: 0,
  totalWithdrawn: 0,
  cyclesCompleted: 0,
  directReferrals: 0,
  teamSize: 1,
  autoTopUpEnabled: false,
  nextRankTopUpAmount: 0,
  minWithdrawEligibleAt: null,
  status: 'active',
  isActive: true,
  role: 'user',
  level: 1,
  currentCycle: 0,
  sideAmounts: [10, 20, 40, 80, 160, 320, 640, 1280],
  joinedAt: serverTimestamp(),
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  lastLoginAt: serverTimestamp()
});

export const createTransactionInitTemplate = (uid: string, userCode: string) => ({
  _init: true,
  uid,
  userCode,
  userId: uid, // Backward compatibility
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  note: 'Initial placeholder document for user transactions'
});

export const createIncomeTransactionInitTemplate = (uid: string, userCode: string) => ({
  _init: true,
  uid,
  userCode,
  userId: uid, // Backward compatibility
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  note: 'Initial placeholder document for user income transactions'
});

export const createWithdrawalTemplate = (uid: string, userCode: string) => ({
  uid,
  userCode,
  userId: uid, // Backward compatibility
  amount: 0,
  currency: 'USD',
  status: 'pending',
  walletAddress: '0x745ECD992E8bF99CD298E60C65e98962E16207bE',
  requestedAt: serverTimestamp(),
  processedAt: null,
  notes: 'Initial withdrawal document',
  feeApplied: 0,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});

export const createSettingsTemplate = (uid: string, userCode: string) => ({
  uid,
  userCode,
  userId: uid, // Backward compatibility
  notifications: {
    email: true,
    sms: false,
    push: true
  },
  privacy: {
    profileVisible: true,
    showEarnings: false,
    showTeam: true
  },
  preferences: {
    language: 'en',
    currency: 'USD',
    timezone: 'UTC'
  },
  security: {
    twoFactorEnabled: false,
    loginNotifications: true,
    sessionTimeout: 3600
  },
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});

export const createReidTemplate = (uid: string, userCode: string) => ({
  uid,
  userCode,
  userId: uid, // Backward compatibility
  reidCode: `REID_${userCode}`,
  status: 'active',
  linkedAt: serverTimestamp(),
  expiresAt: null,
  metadata: {
    source: 'signup',
    version: '1.0'
  },
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});

export const createRateLimitTemplate = (uid: string, userCode: string) => ({
  uid,
  userCode,
  userId: uid, // Backward compatibility
  signupAttempts: 1,
  lastAttemptAt: serverTimestamp(),
  ipAddress: 'unknown',
  userAgent: 'unknown',
  resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});

export const createPayoutQueueTemplate = (uid: string, userCode: string) => ({
  uid,
  userCode,
  userId: uid, // Backward compatibility
  queuePosition: 0,
  estimatedPayout: 0,
  currency: 'USD',
  status: 'queued',
  priority: 'normal',
  scheduledAt: null,
  processedAt: null,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});

export const createAuditLogTemplate = (uid: string, userCode: string, email: string) => ({
  uid,
  userCode,
  userId: uid, // Backward compatibility
  action: 'user_signup',
  resource: 'user',
  resourceId: uid,
  details: {
    email,
    userCode,
    signupMethod: 'email_password'
  },
  ipAddress: 'unknown',
  userAgent: 'unknown',
  timestamp: serverTimestamp(),
  createdAt: serverTimestamp()
});

export const createCycleTemplate = (uid: string, userCode: string) => ({
  uid,
  userCode,
  userId: uid, // Backward compatibility
  rank: 'Azurite',
  currentCycle: 0,
  cyclesCompleted: 0,
  cycleStartedAt: serverTimestamp(),
  cycleCompletedAt: null,
  earnings: {
    referral: 0,
    level: 0,
    global: 0,
    total: 0
  },
  status: 'active',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});

// Main function to create all required documents for a new user
export const createAllUserDocuments = async (
  user: User,
  displayName: string,
  sponsorId?: string
): Promise<void> => {
  const uid = user.uid;
  const email = user.email || '';
  let userCode: string | null = null;
  
  try {
    // Generate unique userCode
    userCode = await generateUserCode();
    console.log(`[UserSignupService] Generated userCode: ${userCode} for user: ${uid}`);
    
    // Create all document references
    const userRef = doc(db, 'users', uid);
    const transactionRef = doc(db, 'transactions', `${uid}_init`);
    const incomeTransactionRef = doc(db, 'incomeTransactions', `${uid}_init`);
    const withdrawalRef = doc(db, 'withdrawals', `${uid}_initial`);
    const settingsRef = doc(db, 'settings', uid);
    const reidRef = doc(db, 'reids', uid);
    const rateLimitRef = doc(db, 'rateLimits', uid);
    const payoutQueueRef = doc(db, 'payoutQueue', uid);
    const auditLogRef = doc(db, 'auditLogs', `${uid}_signup_${Date.now()}`);
    const cycleRef = doc(db, 'cycles', uid);
    
    // Use batch for atomic operations
    const batch = writeBatch(db);
    
    // Add all documents to batch
    batch.set(userRef, createUserDocumentTemplate(uid, userCode, email, displayName, sponsorId));
    batch.set(transactionRef, createTransactionInitTemplate(uid, userCode));
    batch.set(incomeTransactionRef, createIncomeTransactionInitTemplate(uid, userCode));
    batch.set(withdrawalRef, createWithdrawalTemplate(uid, userCode));
    batch.set(settingsRef, createSettingsTemplate(uid, userCode));
    batch.set(reidRef, createReidTemplate(uid, userCode));
    batch.set(rateLimitRef, createRateLimitTemplate(uid, userCode));
    batch.set(payoutQueueRef, createPayoutQueueTemplate(uid, userCode));
    batch.set(auditLogRef, createAuditLogTemplate(uid, userCode, email));
    batch.set(cycleRef, createCycleTemplate(uid, userCode));
    
    // Commit all documents in a single atomic transaction
    await batch.commit();
    
    console.log(`[UserSignupService] Successfully created all documents for user ${userCode} (${uid})`);
    
  } catch (error) {
    console.error('[UserSignupService] Error creating user documents:', error);
    
    // Enhanced error handling with specific error types
    if (error instanceof Error) {
      if (error.message.includes('userCode')) {
        throw new Error(`Failed to generate unique user code: ${error.message}`);
      } else if (error.message.includes('permission-denied')) {
        throw new Error('Permission denied: Unable to create user documents. Please check Firestore security rules.');
      } else if (error.message.includes('quota-exceeded')) {
        throw new Error('Database quota exceeded: Please try again later.');
      } else if (error.message.includes('unavailable')) {
        throw new Error('Database temporarily unavailable: Please try again in a few moments.');
      }
    }
    
    // Attempt cleanup if batch failed (best effort - some documents might have been created)
    try {
      if (userCode) {
        console.log(`[UserSignupService] Attempting cleanup for failed signup: ${userCode}`);
        await cleanupFailedSignup(uid, userCode);
      }
    } catch (cleanupError) {
      console.error('[UserSignupService] Cleanup failed:', cleanupError);
      // Don't throw cleanup errors, just log them
    }
    
    throw new Error(`Failed to create user documents: ${error}`);
  }
};

// Function to check if user documents already exist
export const checkUserDocumentsExist = async (uid: string): Promise<boolean> => {
  try {
    const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)));
    return !userDoc.empty;
  } catch (error) {
    console.error('[UserSignupService] Error checking user documents:', error);
    return false;
  }
};

// Function to create rank templates (called once during system setup)
export const createRankTemplates = async (): Promise<void> => {
  const batch = writeBatch(db);
  
  const ranks = [
    {
      rankName: 'Azurite',
      order: 1,
      activationAmount: 10,
      investment: 10,
      globalReceivedIncome: 80,
      globalPerLevel: [10, 20, 40, 80],
      levelPercentages: { '1': 50, '2': 25, '3': 15, '4': 10 },
      nextRank: 'Malachite',
      autoTopUpEnabled: true,
      cyclesToComplete: 8
    },
    {
      rankName: 'Malachite',
      order: 2,
      activationAmount: 20,
      investment: 20,
      globalReceivedIncome: 160,
      globalPerLevel: [20, 40, 80, 160],
      levelPercentages: { '1': 50, '2': 25, '3': 15, '4': 10 },
      nextRank: 'Sapphire',
      autoTopUpEnabled: true,
      cyclesToComplete: 8
    },
    {
      rankName: 'Sapphire',
      order: 3,
      activationAmount: 40,
      investment: 40,
      globalReceivedIncome: 320,
      globalPerLevel: [40, 80, 160, 320],
      levelPercentages: { '1': 50, '2': 25, '3': 15, '4': 10 },
      nextRank: 'Ruby',
      autoTopUpEnabled: true,
      cyclesToComplete: 8
    },
    {
      rankName: 'Ruby',
      order: 4,
      activationAmount: 80,
      investment: 80,
      globalReceivedIncome: 640,
      globalPerLevel: [80, 160, 320, 640],
      levelPercentages: { '1': 50, '2': 25, '3': 15, '4': 10 },
      nextRank: 'Emerald',
      autoTopUpEnabled: true,
      cyclesToComplete: 8
    },
    {
      rankName: 'Emerald',
      order: 5,
      activationAmount: 160,
      investment: 160,
      globalReceivedIncome: 1280,
      globalPerLevel: [160, 320, 640, 1280],
      levelPercentages: { '1': 50, '2': 25, '3': 15, '4': 10 },
      nextRank: 'Diamond',
      autoTopUpEnabled: true,
      cyclesToComplete: 8
    },
    {
      rankName: 'Diamond',
      order: 6,
      activationAmount: 320,
      investment: 320,
      globalReceivedIncome: 2560,
      globalPerLevel: [320, 640, 1280, 2560],
      levelPercentages: { '1': 50, '2': 25, '3': 15, '4': 10 },
      nextRank: 'Crown',
      autoTopUpEnabled: true,
      cyclesToComplete: 8
    },
    {
      rankName: 'Crown',
      order: 7,
      activationAmount: 640,
      investment: 640,
      globalReceivedIncome: 5120,
      globalPerLevel: [640, 1280, 2560, 5120],
      levelPercentages: { '1': 50, '2': 25, '3': 15, '4': 10 },
      nextRank: 'Royal',
      autoTopUpEnabled: true,
      cyclesToComplete: 8
    },
    {
      rankName: 'Royal',
      order: 8,
      activationAmount: 1280,
      investment: 1280,
      globalReceivedIncome: 10240,
      globalPerLevel: [1280, 2560, 5120, 10240],
      levelPercentages: { '1': 50, '2': 25, '3': 15, '4': 10 },
      nextRank: null,
      autoTopUpEnabled: true,
      cyclesToComplete: 8
    }
  ];
  
  ranks.forEach(rank => {
    const rankRef = doc(db, 'ranks', rank.rankName);
    batch.set(rankRef, {
      ...rank,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });
  
  await batch.commit();
  console.log('[UserSignupService] Rank templates created successfully');
};

// Cleanup function for failed signups (best effort cleanup)
export const cleanupFailedSignup = async (uid: string, userCode: string): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    // List of all document references that might have been created
    const documentsToCleanup = [
      doc(db, 'users', uid),
      doc(db, 'transactions', `${uid}_init`),
      doc(db, 'incomeTransactions', `${uid}_init`),
      doc(db, 'withdrawals', `${uid}_initial`),
      doc(db, 'settings', uid),
      doc(db, 'reids', uid),
      doc(db, 'rateLimits', uid),
      doc(db, 'payoutQueue', uid),
      doc(db, 'cycles', uid)
    ];
    
    // Add delete operations to batch
    documentsToCleanup.forEach(docRef => {
      batch.delete(docRef);
    });
    
    // Also cleanup any audit logs for this signup
    const auditLogsQuery = query(
      collection(db, 'auditLogs'),
      where('uid', '==', uid),
      where('action', '==', 'user_signup')
    );
    
    const auditLogsSnapshot = await getDocs(auditLogsQuery);
    auditLogsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`[UserSignupService] Cleanup completed for failed signup: ${userCode} (${uid})`);
    
  } catch (error) {
    console.error('[UserSignupService] Error during cleanup:', error);
    // Don't throw - this is best effort cleanup
  }
};

// Validation function to ensure all required documents exist
export const validateUserDocuments = async (uid: string): Promise<{
  isValid: boolean;
  missingDocuments: string[];
  userCode?: string;
}> => {
  const requiredCollections = [
    'users',
    'transactions',
    'incomeTransactions', 
    'withdrawals',
    'settings',
    'reids',
    'rateLimits',
    'payoutQueue',
    'cycles'
  ];
  
  const missingDocuments: string[] = [];
  let userCode: string | undefined;
  
  try {
    for (const collectionName of requiredCollections) {
      // Handle special document ID patterns - not used in query but kept for reference
      
      const docSnap = await getDocs(query(collection(db, collectionName), where('uid', '==', uid)));
      
      if (docSnap.empty) {
        missingDocuments.push(collectionName);
      } else if (collectionName === 'users' && !docSnap.empty) {
        // Extract userCode from user document
        const userData = docSnap.docs[0].data();
        userCode = userData.userCode;
      }
    }
    
    return {
      isValid: missingDocuments.length === 0,
      missingDocuments,
      userCode
    };
    
  } catch (error) {
    console.error('[UserSignupService] Error validating user documents:', error);
    return {
      isValid: false,
      missingDocuments: ['validation_error'],
      userCode
    };
  }
};
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  serverTimestamp, 
  Timestamp,
  arrayUnion,
  increment,
  writeBatch,
  type DocumentReference,
  type FieldValue
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Types for MLM collections
export interface MLMUser {
  uid: string;
  userCode: string;
  email: string;
  phone: string;
  contact: string;
  displayName: string;
  fullName: string;
  walletAddress: string;
  usdtAddress: string;
  profileImageUrl?: string;
  sponsorId: string | null;
  sponsorRef: DocumentReference | null;
  referrals: string[];
  rank: string;
  level: number;
  rankActivatedAt: Timestamp;
  activationAmount: number;
  balance: number;
  pendingBalance: number;
  totalEarnings: number;
  totalWithdrawn: number;
  availableBalance: number;
  cyclesCompleted: number;
  autoTopUpEnabled: boolean;
  nextRankTopUpAmount: number;
  minWithdrawEligibleAt: Timestamp | null;
  status: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
  // Admin fields
  role: 'user' | 'admin' | 'superadmin' | 'moderator';
  isAdmin?: boolean;
  // Global income fields
  globalIncomeEarned?: number;
  currentPool?: string;
  poolPosition?: number;
  poolsCompleted?: number;
  // Level-wise income tracking
  levelIncomes?: {
    level1: number;
    level2: number;
    level3: number;
    level4: number;
    level5: number;
  };
  // Direct referrals count
  directReferralsCount?: number;
  // ID activation status
  isIdActivated?: boolean;
  idActivatedAt?: Timestamp;
}

export interface Transaction {
  txId: string;
  type: 'activation' | 'topup' | 're-topup' | 'withdrawal' | 'referral_commission' | 'global_income' | 'level_income' | 'rank_upgrade';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  sourceUserId: string | null;
  sourceRef: DocumentReference | null;
  notes: string | null;
  feeApplied: number;
  createdAt: Timestamp;
}

export interface Income {
  incomeId: string;
  type: 'referral' | 'level' | 'global' | 're-topup' | 're-level' | 're-global';
  amount: number;
  currency: string;
  rank: string;
  cycle: number;
  level: number | null;
  sourceUserId: string | null;
  status: 'pending' | 'credited' | 'reversed';
  createdAt: Timestamp;
}

export interface Rank {
  rankName: string;
  order: number;
  activationAmount: number;
  investment: number;
  globalReceivedIncome: number;
  globalPerLevel: number[];
  levelPercentages: { [key: string]: number };
  nextRank: string | null;
  autoTopUpEnabled: boolean;
  cyclesToComplete: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// New interfaces for additional collections
export interface IncomeTransaction {
  itxId: string;
  userId: string;
  type: 'referral' | 'level' | 'global';
  amount: number;
  currency: string;
  rank: string;
  cycle: number;
  sourceUserId: string | null;
  notes: string;
  processedBy: string;
  createdAt: Timestamp;
}

export interface Withdrawal {
  withdrawalId: string;
  userId: string;
  amountRequested: number;
  feePercent: number;
  amountAfterFee: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requestedAt: Timestamp;
  processedAt?: Timestamp;
  processedBy?: string;
  notes?: string;
}

export interface Reid {
  id: string;
  reid: string;
  userId: string;
  reidNumber: number;
  rank: string;
  originRank: string;
  originCycle: number;
  isActive: boolean;
  activationAmount: number;
  totalEarnings: number;
  directReferrals: string[];
  createdAt: Timestamp;
  activatedAt?: Timestamp;
  cycleCompletions: number;
  generatedAt: Timestamp;
  status: 'active' | 'used' | 'expired';
  linkedToTx: string | null;
}

export interface Settings {
  minWithdrawal: number;
  withdrawalFeePercent: number;
  fundConvertFeePercent: number;
  p2pTransferFeePercent: number;
  activationCurrency: string;
  referralCommissionPercent: number;
  levelIncomePercentages: { [key: string]: number };
  autoTopUpEnabled: boolean;
  globalCyclesToRun: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PayoutQueue {
  queueId: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  attempts: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastAttemptAt?: Timestamp;
  errorMessage?: string;
}

export interface Admin {
  adminId: string;
  email: string;
  name: string;
  role: 'admin' | 'superadmin' | 'moderator';
  permissions: string[];
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AuditLog {
  logId: string;
  actorId: string;
  action: string;
  target: {
    type: string;
    id: string;
  };
  details?: string | Record<string, any>;
  targetType?: string;
  createdAt: Timestamp | FieldValue;
}

export interface Cycle {
  rank: string;
  currentCycle: number;
  completedCount: number;
  lastUpdated: Timestamp;
  perLevelCounts: number[];
}

// User service functions
export const createMLMUser = async (userData: Partial<MLMUser>): Promise<void> => {
  const userRef = doc(db, 'users', userData.uid!);
  const mlmUserData: Partial<MLMUser> = {
    ...userData,
    rank: 'Azurite',
    activationAmount: 5,
    balance: 0,
    pendingBalance: 0,
    totalEarnings: 0,
    totalWithdrawn: 0,
    availableBalance: 0,
    cyclesCompleted: 0,
    autoTopUpEnabled: true,
    nextRankTopUpAmount: 10,
    minWithdrawEligibleAt: null,
    status: 'active',
    isActive: false,
    role: userData.role || 'user', // Default role is 'user'
    referrals: [],
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
    rankActivatedAt: serverTimestamp() as Timestamp
  };
  
  await setDoc(userRef, mlmUserData);
};

export const getMLMUser = async (uid: string): Promise<MLMUser | null> => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return userSnap.data() as MLMUser;
  }
  return null;
};

export const updateMLMUser = async (uid: string, updateData: Partial<MLMUser>): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  const updatedData = {
    ...updateData,
    updatedAt: serverTimestamp() as Timestamp
  };
  
  await updateDoc(userRef, updatedData);
};

export const checkEmailExists = async (email: string): Promise<boolean> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};

export const checkContactExists = async (contact: string): Promise<boolean> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('contact', '==', contact));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};

// Transaction service functions
export const createTransaction = async (uid: string, transactionData: Partial<Transaction>): Promise<string> => {
  const transactionsRef = collection(db, 'users', uid, 'transactions');
  const txData: Partial<Transaction> = {
    ...transactionData,
    createdAt: serverTimestamp() as Timestamp
  };
  
  const docRef = await addDoc(transactionsRef, txData);
  return docRef.id;
};

// Enhanced transaction functions for TopUp, Re-TopUp, Activation
export const createTopUpTransaction = async (uid: string, amount: number, currency: string = 'USDT_BEP20'): Promise<string> => {
  return await createTransaction(uid, {
    txId: `tx_topup_${Date.now()}`,
    type: 'topup',
    amount,
    currency,
    status: 'completed',
    sourceUserId: null,
    sourceRef: null,
    notes: 'TopUp transaction',
    feeApplied: 0
  });
};

export const createReTopUpTransaction = async (uid: string, amount: number, currency: string = 'USDT_BEP20'): Promise<string> => {
  return await createTransaction(uid, {
    txId: `tx_retopup_${Date.now()}`,
    type: 're-topup',
    amount,
    currency,
    status: 'completed',
    sourceUserId: null,
    sourceRef: null,
    notes: 'Re-TopUp transaction',
    feeApplied: 0
  });
};

export const createActivationTransaction = async (uid: string, amount: number, currency: string = 'USDT_BEP20'): Promise<string> => {
  return await createTransaction(uid, {
    txId: `tx_activation_${Date.now()}`,
    type: 'activation',
    amount,
    currency,
    status: 'completed',
    sourceUserId: null,
    sourceRef: null,
    notes: 'Account activation transaction',
    feeApplied: 0
  });
};

// Income service functions
export const createIncome = async (uid: string, incomeData: Partial<Income>): Promise<string> => {
  const incomesRef = collection(db, 'users', uid, 'incomes');
  const incData: Partial<Income> = {
    ...incomeData,
    createdAt: serverTimestamp() as Timestamp
  };
  
  const docRef = await addDoc(incomesRef, incData);
  return docRef.id;
};

// Enhanced income functions
export const createReferralIncome = async (
  uid: string, 
  amount: number, 
  rank: string, 
  cycle: number, 
  sourceUserId: string,
  currency: string = 'USDT_BEP20'
): Promise<string> => {
  return await createIncome(uid, {
    incomeId: `income_referral_${Date.now()}`,
    type: 'referral',
    amount,
    currency,
    rank,
    cycle,
    level: 1,
    sourceUserId,
    status: 'pending'
  });
};

export const createLevelIncome = async (
  uid: string, 
  amount: number, 
  rank: string, 
  cycle: number, 
  level: number,
  sourceUserId: string,
  currency: string = 'USDT_BEP20'
): Promise<string> => {
  return await createIncome(uid, {
    incomeId: `income_level_${Date.now()}`,
    type: 'level',
    amount,
    currency,
    rank,
    cycle,
    level,
    sourceUserId,
    status: 'pending'
  });
};

export const createGlobalIncome = async (
  uid: string, 
  amount: number, 
  rank: string, 
  cycle: number,
  currency: string = 'USDT_BEP20'
): Promise<string> => {
  return await createIncome(uid, {
    incomeId: `income_global_${Date.now()}`,
    type: 'global',
    amount,
    currency,
    rank,
    cycle,
    level: null,
    sourceUserId: null,
    status: 'pending'
  });
};

// Income Transactions service
export const createIncomeTransaction = async (incomeTransactionData: Partial<IncomeTransaction>): Promise<string> => {
  const incomeTransactionsRef = collection(db, 'incomeTransactions');
  const itxData: Partial<IncomeTransaction> = {
    ...incomeTransactionData,
    createdAt: serverTimestamp() as Timestamp
  };
  
  const docRef = await addDoc(incomeTransactionsRef, itxData);
  return docRef.id;
};

// Withdrawals service
export const createWithdrawal = async (withdrawalData: Partial<Withdrawal>): Promise<string> => {
  const withdrawalsRef = collection(db, 'withdrawals');
  const wdData: Partial<Withdrawal> = {
    ...withdrawalData,
    requestedAt: serverTimestamp() as Timestamp
  };
  
  const docRef = await addDoc(withdrawalsRef, wdData);
  return docRef.id;
};

export const updateWithdrawalStatus = async (
  withdrawalId: string, 
  status: Withdrawal['status'], 
  processedBy?: string,
  notes?: string
): Promise<void> => {
  const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
  const updateData: Partial<Withdrawal> = {
    status,
    processedAt: serverTimestamp() as Timestamp,
    processedBy,
    notes
  };
  
  await updateDoc(withdrawalRef, updateData);
};

// REIDs service
export const createReid = async (reidData: Partial<Reid>): Promise<string> => {
  const reidsRef = collection(db, 'reids');
  const rData: Partial<Reid> = {
    ...reidData,
    generatedAt: serverTimestamp() as Timestamp
  };
  
  const docRef = await addDoc(reidsRef, rData);
  return docRef.id;
};

export const generateReid = async (
  userId: string, 
  originRank: string, 
  originCycle: number
): Promise<string> => {
  const reid = `REID_${userId}_${originCycle}`;
  
  await createReid({
    reid,
    userId,
    originRank,
    originCycle,
    status: 'active',
    linkedToTx: null
  });
  
  return reid;
};

// Enhanced REID generation for global cycle completion
export const generateREIDFromGlobalCycle = async (
  originalUID: string,
  rank: string,
  cycleId: string,
  parentCycleRank: string
): Promise<string> => {
  try {
    // Get user's current REID count for this rank
    const userReidsQuery = query(
      collection(db, 'reids'),
      where('originalUID', '==', originalUID),
      where('rank', '==', rank)
    );
    const userReidsSnapshot = await getDocs(userReidsQuery);
    const reidNumber = userReidsSnapshot.size + 1;

    const reidData = {
      originalUID,
      reidNumber,
      rank,
      isActive: true,
      activationAmount: 0, // Will be set when activated
      totalEarnings: 0,
      directReferrals: [],
      cycleCompletions: 0,
      createdAt: serverTimestamp() as Timestamp,
      metadata: {
        triggeredBy: 'global_cycle_completion',
        parentCycleId: cycleId,
        parentCycleRank
      }
    };

    const reidRef = await addDoc(collection(db, 'reids'), reidData);
    
    // Create audit log for REID generation
    await createAuditLog({
      action: 'reid_generated',
      targetType: 'reid',
      target: {
        type: 'reid',
        id: reidRef.id
      },
      details: JSON.stringify({
        originalUID,
        rank,
        reidNumber,
        triggeredBy: 'global_cycle_completion',
        parentCycleId: cycleId,
        performedBy: originalUID
      })
    });

    return reidRef.id;
  } catch (error) {
    console.error('Error generating REID from global cycle:', error);
    throw error;
  }
};

// Get user's REIDs
export const getUserREIDs = async (userId: string): Promise<Reid[]> => {
  try {
    const reidsQuery = query(
      collection(db, 'reids'),
      where('originalUID', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const reidsSnapshot = await getDocs(reidsQuery);
    
    return reidsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<Reid, 'id'>)
    }));
  } catch (error) {
    console.error('Error fetching user REIDs:', error);
    throw error;
  }
};

// Activate REID (when user wants to use it for rank upgrade)
export const activateREID = async (
  reidId: string,
  activationAmount: number,
  sponsorREID?: string
): Promise<void> => {
  try {
    const reidRef = doc(db, 'reids', reidId);
    const updateData: any = {
      isActive: true,
      activationAmount,
      activatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (sponsorREID) {
      updateData.sponsorREID = sponsorREID;
    }

    await updateDoc(reidRef, updateData);

    // Create audit log for REID activation
    await createAuditLog({
      action: 'reid_activated',
      targetType: 'reid',
      target: {
        type: 'reid',
        id: reidId
      },
      details: JSON.stringify({
        performedBy: 'system',
        activationAmount,
        sponsorREID
      }),
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error activating REID:', error);
    throw error;
  }
};

// Update REID earnings
export const updateREIDEarnings = async (
  reidId: string,
  earningsAmount: number,
  incomeType: string
): Promise<void> => {
  try {
    const reidRef = doc(db, 'reids', reidId);
    await updateDoc(reidRef, {
      totalEarnings: increment(earningsAmount),
      updatedAt: serverTimestamp()
    });

    // Create audit log for REID earnings update
    await createAuditLog({
      action: 'reid_earnings_updated',
      targetType: 'reid',
      target: {
        type: 'reid',
        id: reidId
      },
      details: JSON.stringify({
        performedBy: 'system',
        earningsAmount,
        incomeType
      }),
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating REID earnings:', error);
    throw error;
  }
};

// Enhanced global cycle processing with REID generation
export const processGlobalCyclePayout = async (
  cycleId: string,
  participants: string[],
  payoutAmount: number,
  rank: string
): Promise<{ processedPayouts: string[], generatedREIDs: string[] }> => {
  try {
    const batch = writeBatch(db);
    const processedPayouts: string[] = [];
    const generatedREIDs: string[] = [];

    // Process payout for each participant
    for (const participantUID of participants) {
      // Create income record
      const incomeRef = doc(collection(db, 'incomes'));
      const incomeData = {
        uid: participantUID,
        type: 'global' as const,
        amount: payoutAmount,
        currency: 'USDT_BEP20',
        rank,
        cycle: 1,
        level: null,
        sourceUserId: null,
        status: 'credited' as const,
        createdAt: serverTimestamp() as Timestamp
      };
      batch.set(incomeRef, incomeData);
      processedPayouts.push(incomeRef.id);

      // Update user balance
      const userRef = doc(db, 'users', participantUID);
      batch.update(userRef, {
        availableBalance: increment(payoutAmount),
        totalEarnings: increment(payoutAmount),
        updatedAt: serverTimestamp()
      });

      // Generate REID for infinite cycles (for highest rank participants)
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userRank = userData.currentRank;
        
        // Check if this is the highest rank or REID generation is enabled for this rank
        const shouldGenerateREID = await checkREIDGenerationEligibility(userRank, rank);
        
        if (shouldGenerateREID) {
          const reidId = await generateREIDFromGlobalCycle(
            participantUID,
            rank,
            cycleId,
            rank
          );
          generatedREIDs.push(reidId);
        }
      }
    }

    // Mark cycle as completed
    const cycleRef = doc(db, 'globalCycles', cycleId);
    batch.update(cycleRef, {
      isComplete: true,
      completedAt: serverTimestamp(),
      processedAt: serverTimestamp(),
      payoutAmount,
      participantCount: participants.length
    });

    await batch.commit();

    // Create audit log for global cycle completion
    await createAuditLog({
      action: 'global_cycle_completed',
      targetType: 'globalCycle',
      target: {
        type: 'globalCycle',
        id: cycleId
      },
      details: JSON.stringify({
        performedBy: 'system',
        participants: participants.length,
        payoutAmount,
        rank,
        processedPayouts: processedPayouts.length,
        generatedREIDs: generatedREIDs.length
      })
    });

    return { processedPayouts, generatedREIDs };
  } catch (error) {
    console.error('Error processing global cycle payout:', error);
    throw error;
  }
};

// Check if REID generation is eligible for a rank
const checkREIDGenerationEligibility = async (userRank: string, cycleRank: string): Promise<boolean> => {
  try {
    // Get settings to check REID generation rules
    const settings = await getSettings();
    if (!settings) return false;

    // For now, generate REID for users who complete cycles at their current rank or higher
    const rankOrder = ['azurite', 'pearl', 'topaz', 'emerald', 'ruby', 'diamond', 'crown'];
    const userRankIndex = rankOrder.indexOf(userRank.toLowerCase());
    const cycleRankIndex = rankOrder.indexOf(cycleRank.toLowerCase());

    // Generate REID if user's rank is same or higher than cycle rank
    return userRankIndex >= cycleRankIndex;
  } catch (error) {
    console.error('Error checking REID generation eligibility:', error);
    return false;
  }
};

// Settings service
export const getSettings = async (): Promise<Settings | null> => {
  const settingsRef = doc(db, 'settings', 'default');
  const settingsSnap = await getDoc(settingsRef);
  
  if (settingsSnap.exists()) {
    return settingsSnap.data() as Settings;
  }
  return null;
};

export const updateSettings = async (settingsData: Partial<Settings>): Promise<void> => {
  const settingsRef = doc(db, 'settings', 'default');
  const updateData: Partial<Settings> = {
    ...settingsData,
    updatedAt: serverTimestamp() as Timestamp
  };
  
  await updateDoc(settingsRef, updateData);
};

// Payout Queue service
export const createPayoutQueue = async (payoutData: Partial<PayoutQueue>): Promise<string> => {
  const payoutQueueRef = collection(db, 'payoutQueue');
  const pqData: Partial<PayoutQueue> = {
    ...payoutData,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp
  };
  
  const docRef = await addDoc(payoutQueueRef, pqData);
  return docRef.id;
};

export const updatePayoutQueueStatus = async (
  queueId: string, 
  status: PayoutQueue['status'],
  errorMessage?: string
): Promise<void> => {
  const payoutRef = doc(db, 'payoutQueue', queueId);
  const updateData: Partial<PayoutQueue> = {
    status,
    updatedAt: serverTimestamp() as Timestamp,
    lastAttemptAt: serverTimestamp() as Timestamp,
    errorMessage
  };
  
  if (status === 'processing' || status === 'failed') {
    const currentDoc = await getDoc(payoutRef);
    if (currentDoc.exists()) {
      const currentData = currentDoc.data() as PayoutQueue;
      updateData.attempts = (currentData.attempts || 0) + 1;
    }
  }
  
  await updateDoc(payoutRef, updateData);
};

// Admin service
export const createAdmin = async (adminData: Partial<Admin>): Promise<void> => {
  const adminRef = doc(db, 'admin', adminData.adminId!);
  const aData: Partial<Admin> = {
    ...adminData,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp
  };
  
  await setDoc(adminRef, aData);
};

export const getAdmin = async (adminId: string): Promise<Admin | null> => {
  const adminRef = doc(db, 'admin', adminId);
  const adminSnap = await getDoc(adminRef);
  
  if (adminSnap.exists()) {
    return adminSnap.data() as Admin;
  }
  return null;
};

// Audit Logs service
export const createAuditLog = async (auditData: Partial<AuditLog>): Promise<string> => {
  const auditLogsRef = collection(db, 'auditLogs');
  const logData: Partial<AuditLog> = {
    ...auditData,
    createdAt: serverTimestamp() as Timestamp
  };
  
  const docRef = await addDoc(auditLogsRef, logData);
  return docRef.id;
};

// Cycles service
export const createOrUpdateCycle = async (rank: string, cycleData: Partial<Cycle>): Promise<void> => {
  const cycleRef = doc(db, 'cycles', `rank_${rank}`);
  const cData: Partial<Cycle> = {
    ...cycleData,
    rank,
    lastUpdated: serverTimestamp() as Timestamp
  };
  
  await setDoc(cycleRef, cData, { merge: true });
};

export const getCycle = async (rank: string): Promise<Cycle | null> => {
  const cycleRef = doc(db, 'cycles', `rank_${rank}`);
  const cycleSnap = await getDoc(cycleRef);
  
  if (cycleSnap.exists()) {
    return cycleSnap.data() as Cycle;
  }
  return null;
};

// Initialize sample data
export const initializeSampleData = async (): Promise<void> => {
  // Create sample ranks
  const ranks = [
    {
      rankName: 'Azurite',
      order: 1,
      activationAmount: 5,
      investment: 5,
      globalReceivedIncome: 70,
      globalPerLevel: [5, 4, 3, 2, 1],
      levelPercentages: { L1: 5, L2: 4, L3: 3, L4: 1, L5: 1, L6: 1 },
      nextRank: 'Benitoite',
      autoTopUpEnabled: true,
      cyclesToComplete: 14,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp
    },
    {
      rankName: 'Benitoite',
      order: 2,
      activationAmount: 10,
      investment: 10,
      globalReceivedIncome: 140,
      globalPerLevel: [10, 8, 6, 4, 2],
      levelPercentages: { L1: 5, L2: 4, L3: 3, L4: 1, L5: 1, L6: 1 },
      nextRank: 'Crystals',
      autoTopUpEnabled: true,
      cyclesToComplete: 14,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp
    }
  ];

  for (const rank of ranks) {
    const rankRef = doc(db, 'ranks', rank.rankName);
    await setDoc(rankRef, rank);
  }

  // Create sample settings
  const settings: Partial<Settings> = {
    minWithdrawal: 10,
    withdrawalFeePercent: 15,
    fundConvertFeePercent: 10,
    p2pTransferFeePercent: 0,
    activationCurrency: 'USDT_BEP20',
    referralCommissionPercent: 50,
    levelIncomePercentages: { L1: 5, L2: 4, L3: 3, L4: 1, L5: 1, L6: 1 },
    globalCyclesToRun: 14,
    autoTopUpEnabled: true,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp
  };

  const settingsRef = doc(db, 'settings', 'default');
  await setDoc(settingsRef, settings);

  // Initialize sample cycles
  const sampleCycles = ['Azurite', 'Benitoite'];
  for (const rank of sampleCycles) {
    await createOrUpdateCycle(rank, {
      currentCycle: 1,
      completedCount: 0,
      perLevelCounts: [0, 0, 0, 0, 0, 0]
    });
  }

  // Create sample admin user
  await createAdmin({
    adminId: 'admin_test_user',
    email: 'admin@example.com',
    name: 'Admin Test',
    role: 'superadmin',
    permissions: ['manageUsers', 'approveWithdrawals', 'editSettings'],
    status: 'active'
  });
};

// Workflow functions combining multiple operations
export const processTopUp = async (
  uid: string, 
  amount: number, 
  currency: string = 'USDT_BEP20'
): Promise<{
  transactionId: string;
  incomeId?: string;
  incomeTransactionId?: string;
}> => {
  // Create transaction
  const transactionId = await createTopUpTransaction(uid, amount, currency);
  
  // Create income (referral commission for sponsor if exists)
  const user = await getMLMUser(uid);
  let incomeId: string | undefined;
  let incomeTransactionId: string | undefined;
  
  if (user?.sponsorId) {
    const settings = await getSettings();
    const commissionPercent = settings?.referralCommissionPercent || 50;
    const commissionAmount = (amount * commissionPercent) / 100;
    
    incomeId = await createReferralIncome(
      user.sponsorId,
      commissionAmount,
      user.rank,
      user.cyclesCompleted + 1,
      uid,
      currency
    );
    
    incomeTransactionId = await createIncomeTransaction({
      itxId: `itx_${Date.now()}`,
      userId: user.sponsorId,
      type: 'referral',
      amount: commissionAmount,
      currency,
      rank: user.rank,
      cycle: user.cyclesCompleted + 1,
      sourceUserId: uid,
      notes: 'Referral commission',
      processedBy: 'system'
    });
  }
  
  // Log audit
  await createAuditLog({
    logId: `log_${Date.now()}`,
    actorId: uid,
    action: 'topup',
    target: { type: 'user', id: uid },
    details: `TopUp of ${amount} ${currency}`
  });
  
  return { transactionId, incomeId, incomeTransactionId };
};

export const processWithdrawal = async (
  uid: string,
  amountRequested: number,
  currency: string = 'USDT_BEP20'
): Promise<{
  withdrawalId: string;
  payoutQueueId: string;
}> => {
  const settings = await getSettings();
  const feePercent = settings?.withdrawalFeePercent || 15;
  const amountAfterFee = amountRequested - (amountRequested * feePercent / 100);
  
  // Create withdrawal request
  const withdrawalId = await createWithdrawal({
    withdrawalId: `wd_${Date.now()}`,
    userId: uid,
    amountRequested,
    feePercent,
    amountAfterFee,
    currency,
    status: 'pending'
  });
  
  // Queue payout
  const payoutQueueId = await createPayoutQueue({
    queueId: `pq_${Date.now()}`,
    userId: uid,
    amount: amountAfterFee,
    currency,
    status: 'queued',
    attempts: 0
  });
  
  // Log audit
  await createAuditLog({
    logId: `log_${Date.now()}`,
    actorId: uid,
    action: 'withdrawal_request',
    target: { type: 'user', id: uid },
    details: `Withdrawal request of ${amountRequested} ${currency}`
  });
  
  return { withdrawalId, payoutQueueId };
};

// Helper function to get upline chain for level income distribution
export const getUplineChain = async (userId: string, levels: number): Promise<string[]> => {
  const uplineChain: string[] = [];
  let currentUserId = userId;
  
  for (let i = 0; i < levels; i++) {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUserId));
      if (!userDoc.exists()) break;
      
      const userData = userDoc.data();
      const sponsorId = userData.sponsorId;
      
      if (!sponsorId) break;
      
      uplineChain.push(sponsorId);
      currentUserId = sponsorId;
    } catch (error) {
      console.error(`Error getting upline at level ${i + 1}:`, error);
      break;
    }
  }
  
  return uplineChain;
};

// Helper function to check if a rank is eligible for level income
export const isRankEligibleForLevelIncome = (uplineRank: string, sourceRank: string): boolean => {
  const rankOrder = ['Azurite', 'Benitoite', 'Crystals', 'Diamond', 'Emerald', 'Fluorite', 'Garnet', 'Hematite', 'Iolite', 'Jeremejevite'];
  const uplineIndex = rankOrder.indexOf(uplineRank);
  const sourceIndex = rankOrder.indexOf(sourceRank);
  
  // Upline must have same or higher rank to receive level income
  return uplineIndex >= sourceIndex;
};

// Helper function to check if a rank is eligible for global cycles
export const isRankEligibleForGlobalCycle = (rank: string): boolean => {
  const globalEligibleRanks = ['Diamond', 'Emerald', 'Fluorite', 'Garnet', 'Hematite', 'Iolite', 'Jeremejevite'];
  return globalEligibleRanks.includes(rank);
};

// Helper function to add user to global cycle
export const addToGlobalCycle = async (userId: string, rank: string, activationAmount: number): Promise<string> => {
  try {
    // Find or create active global cycle for this rank
    const cyclesQuery = query(
      collection(db, 'globalCycles'),
      where('rank', '==', rank),
      where('isComplete', '==', false),
      orderBy('createdAt', 'asc'),
      limit(1)
    );
    
    const cyclesSnapshot = await getDocs(cyclesQuery);
    let cycleRef;
    
    if (cyclesSnapshot.empty) {
      // Create new global cycle
      cycleRef = doc(collection(db, 'globalCycles'));
      const cycleData = {
        rank,
        participants: [userId],
        maxParticipants: 10, // Standard global cycle size
        currentParticipants: 1,
        totalAmount: activationAmount,
        isComplete: false,
        createdAt: serverTimestamp() as Timestamp,
        completedAt: null
      };
      await setDoc(cycleRef, cycleData);
    } else {
      // Add to existing cycle
      cycleRef = cyclesSnapshot.docs[0].ref;
      const cycleData = cyclesSnapshot.docs[0].data();
      
      await updateDoc(cycleRef, {
        participants: arrayUnion(userId),
        currentParticipants: (cycleData.currentParticipants || 0) + 1,
        totalAmount: (cycleData.totalAmount || 0) + activationAmount,
        isComplete: (cycleData.currentParticipants || 0) + 1 >= (cycleData.maxParticipants || 10),
        updatedAt: serverTimestamp() as Timestamp
      });
      
      // If cycle is now complete, process global cycle payouts
      if ((cycleData.currentParticipants || 0) + 1 >= (cycleData.maxParticipants || 10)) {
        const participants = cycleData.participants || [];
        const payoutAmount = (cycleData.totalAmount || 0) / (cycleData.maxParticipants || 10);
        await processGlobalCyclePayout(cycleRef.id, participants, payoutAmount, rank);
      }
    }
    
    return cycleRef.id;
  } catch (error) {
    console.error('Error adding to global cycle:', error);
    throw error;
  }
};

export const processRankUpgrade = async (
  uid: string,
  newRank: string,
  activationAmount: number,
  currency: string = 'USDT_BEP20'
): Promise<{
  transactionId: string;
  rankDocumentId: string;
  incomeId?: string;
  incomeTransactionId?: string;
  levelIncomes?: string[];
  globalCycleId?: string;
}> => {
  const user = await getMLMUser(uid);
  if (!user) {
    throw new Error('User not found');
  }

  // Create rank upgrade transaction
  const transactionId = await createTransaction(uid, {
    txId: `tx_rank_upgrade_${Date.now()}`,
    type: 'rank_upgrade',
    amount: activationAmount,
    currency,
    status: 'completed',
    sourceUserId: null,
    sourceRef: null,
    notes: `Rank upgrade from ${user.rank} to ${newRank}`,
    feeApplied: 0
  });

  // Create rank document in ranks collection
  const rankRef = doc(db, 'ranks', `${uid}_${newRank}_${Date.now()}`);
  const rankData = {
    userId: uid,
    rankName: newRank,
    previousRank: user.rank,
    activationAmount,
    currency,
    activatedAt: serverTimestamp() as Timestamp,
    status: 'active',
    cyclesCompleted: 0,
    totalEarnings: 0,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp
  };
  await setDoc(rankRef, rankData);
  const rankDocumentId = rankRef.id;

  // Update user's rank and related fields
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    rank: newRank,
    rankActivatedAt: serverTimestamp() as Timestamp,
    activationAmount,
    cyclesCompleted: 0,
    updatedAt: serverTimestamp() as Timestamp
  });

  // Process comprehensive income distribution
  let incomeId: string | undefined;
  let incomeTransactionId: string | undefined;
  let levelIncomes: string[] = [];
  let globalCycleId: string | undefined;

  // 1. Process referral income for sponsor
  if (user.sponsorId) {
    const settings = await getSettings();
    const commissionPercent = settings?.referralCommissionPercent || 50;
    const commissionAmount = (activationAmount * commissionPercent) / 100;
    
    incomeId = await createReferralIncome(
      user.sponsorId,
      commissionAmount,
      newRank,
      1, // New cycle starts at 1
      uid,
      currency
    );
    
    incomeTransactionId = await createIncomeTransaction({
      itxId: `itx_rank_upgrade_${Date.now()}`,
      userId: user.sponsorId,
      type: 'referral',
      amount: commissionAmount,
      currency,
      rank: newRank,
      cycle: 1,
      sourceUserId: uid,
      notes: `Referral commission for ${user.rank} to ${newRank} upgrade`,
      processedBy: 'system'
    });
  }

  // 2. Process level income distribution (6 levels up)
  try {
    const uplineChain = await getUplineChain(uid, 6);
    
    for (let i = 0; i < uplineChain.length; i++) {
      const level = i + 1;
      const uplineUserId = uplineChain[i];
      
      // Calculate level income based on level and activation amount
      const levelPercentages = [10, 5, 3, 2, 1, 1]; // L1: 10%, L2: 5%, L3: 3%, L4: 2%, L5: 1%, L6: 1%
      const levelPercent = levelPercentages[i] || 0;
      const levelIncomeAmount = (activationAmount * levelPercent) / 100;
      
      if (levelIncomeAmount > 0) {
        // Check if upline user is eligible for level income (must have same or higher rank)
        const uplineUser = await getMLMUser(uplineUserId);
        if (uplineUser && isRankEligibleForLevelIncome(uplineUser.rank, newRank)) {
          const levelIncomeId = await createLevelIncome(
            uplineUserId,
            levelIncomeAmount,
            newRank,
            1, // cycle number
            level,
            uid,
            currency
          );
          
          await createIncomeTransaction({
            itxId: `itx_level_${level}_${Date.now()}`,
            userId: uplineUserId,
            type: 'level',
            amount: levelIncomeAmount,
            currency,
            rank: newRank,
            cycle: 1,
            sourceUserId: uid,
            notes: `Level ${level} income from ${user.rank} to ${newRank} upgrade`,
            processedBy: 'system'
          });
          
          levelIncomes.push(levelIncomeId);
        }
      }
    }
  } catch (error) {
    console.error('Error processing level incomes:', error);
  }

  // 3. Process global cycle participation
  try {
    // Check if user is eligible for global cycles based on rank
    if (isRankEligibleForGlobalCycle(newRank)) {
      globalCycleId = await addToGlobalCycle(uid, newRank, activationAmount);
    }
  } catch (error) {
    console.error('Error processing global cycle:', error);
  }

  // Update or create cycle data
  await createOrUpdateCycle(newRank, {
    currentCycle: 1,
    completedCount: 0,
    perLevelCounts: [0, 0, 0, 0, 0, 0]
  });

  // Log audit
  await createAuditLog({
    logId: `log_rank_upgrade_${Date.now()}`,
    actorId: uid,
    action: 'rank_upgrade',
    target: { type: 'user', id: uid },
    details: `Rank upgraded from ${user.rank} to ${newRank} with activation amount ${activationAmount} ${currency}. Processed referral, level, and global cycle incomes.`
  });

  return { 
    transactionId, 
    rankDocumentId, 
    incomeId, 
    incomeTransactionId,
    levelIncomes,
    globalCycleId
  };
};

// Support Ticket Types
export interface SupportTicket {
  id?: string;
  userId: string;
  userCode: string;
  subject: string;
  description: string;
  status: 'pending' | 'in-progress' | 'resolved' | 'closed';
  priority: 'normal' | 'high' | 'urgent';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  assignedTo: string | null;
  response: TicketResponse[];
}

export interface TicketResponse {
  senderId: string;
  senderRole: 'user' | 'admin';
  message: string;
  createdAt: Timestamp;
}

export interface CreateTicketData {
  subject: string;
  description: string;
  priority?: 'normal' | 'high' | 'urgent';
}

// Support Ticket Functions
export const createSupportTicket = async (
  userId: string, 
  userCode: string, 
  ticketData: CreateTicketData
): Promise<string> => {
  try {
    const ticketRef = await addDoc(collection(db, 'supportTickets'), {
      userId,
      userCode,
      subject: ticketData.subject,
      description: ticketData.description,
      status: 'pending',
      priority: ticketData.priority || 'normal',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      assignedTo: null,
      response: []
    });

    return ticketRef.id;
  } catch (error) {
    console.error('Error creating support ticket:', error);
    throw error;
  }
};

export const getUserTickets = async (userId: string): Promise<SupportTicket[]> => {
  try {
    const q = query(
      collection(db, 'supportTickets'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SupportTicket));
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    throw error;
  }
};

export const getAllTickets = async (): Promise<SupportTicket[]> => {
  try {
    const q = query(
      collection(db, 'supportTickets'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SupportTicket));
  } catch (error) {
    console.error('Error fetching all tickets:', error);
    throw error;
  }
};

export const getTicketById = async (ticketId: string): Promise<SupportTicket | null> => {
  try {
    const ticketDoc = await getDoc(doc(db, 'supportTickets', ticketId));
    if (ticketDoc.exists()) {
      return {
        id: ticketDoc.id,
        ...ticketDoc.data()
      } as SupportTicket;
    }
    return null;
  } catch (error) {
    console.error('Error fetching ticket:', error);
    throw error;
  }
};

export const addTicketResponse = async (
  ticketId: string,
  senderId: string,
  senderRole: 'user' | 'admin',
  message: string
): Promise<void> => {
  try {
    const ticketRef = doc(db, 'supportTickets', ticketId);
    const response: TicketResponse = {
      senderId,
      senderRole,
      message,
      createdAt: serverTimestamp() as Timestamp
    };

    await updateDoc(ticketRef, {
      response: arrayUnion(response),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error adding ticket response:', error);
    throw error;
  }
};

export const updateTicketStatus = async (
  ticketId: string,
  status: 'pending' | 'in-progress' | 'resolved' | 'closed'
): Promise<void> => {
  try {
    const ticketRef = doc(db, 'supportTickets', ticketId);
    await updateDoc(ticketRef, {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating ticket status:', error);
    throw error;
  }
};

export const assignTicket = async (
  ticketId: string,
  adminId: string
): Promise<void> => {
  try {
    const ticketRef = doc(db, 'supportTickets', ticketId);
    await updateDoc(ticketRef, {
      assignedTo: adminId,
      status: 'in-progress',
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error assigning ticket:', error);
    throw error;
  }
};

export const getTicketsByStatus = async (status: string): Promise<SupportTicket[]> => {
  try {
    const q = query(
      collection(db, 'supportTickets'),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SupportTicket));
  } catch (error) {
    console.error('Error fetching tickets by status:', error);
    throw error;
  }
};

export const getTicketsByPriority = async (priority: string): Promise<SupportTicket[]> => {
  try {
    const q = query(
      collection(db, 'supportTickets'),
      where('priority', '==', priority),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SupportTicket));
  } catch (error) {
    console.error('Error fetching tickets by priority:', error);
    throw error;
  }
};
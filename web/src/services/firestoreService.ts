import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  type DocumentReference,
  type Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Types for MLM collections
export interface MLMUser {
  uid: string;
  email: string;
  contact: string;
  displayName: string;
  walletAddress: string;
  sponsorId: string | null;
  sponsorRef: DocumentReference | null;
  referrals: string[];
  rank: string;
  rankActivatedAt: Timestamp;
  activationAmount: number;
  balance: number;
  pendingBalance: number;
  totalEarnings: number;
  cyclesCompleted: number;
  autoTopUpEnabled: boolean;
  nextRankTopUpAmount: number;
  minWithdrawEligibleAt: Timestamp | null;
  status: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Transaction {
  txId: string;
  type: 'activation' | 'topup' | 're-topup' | 'withdrawal' | 'referral_commission' | 'global_income' | 'level_income';
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
    cyclesCompleted: 0,
    autoTopUpEnabled: true,
    nextRankTopUpAmount: 10,
    minWithdrawEligibleAt: null,
    status: 'active',
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
  const settings = {
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
};
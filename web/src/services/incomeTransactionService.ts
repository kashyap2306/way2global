import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  updateDoc,
  increment,
  serverTimestamp, 
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Income Transaction Interface
export interface IncomeTransaction {
  id?: string;
  type: 'Level Income' | 'Re-Level Income';
  fromUser: string;
  amount: number;
  level: number;
  status: 'pending' | 'approved';
  createdAt: Timestamp;
  userId?: string;
}

// Level percentages configuration
export const LEVEL_PERCENTAGES = {
  1: 5,  // 5%
  2: 4,  // 4%
  3: 3,  // 3%
  4: 1,  // 1%
  5: 1,  // 1%
  6: 1   // 1%
};

/**
 * Create an income transaction
 */
export const createIncomeTransaction = async (
  userId: string,
  transactionData: Omit<IncomeTransaction, 'id' | 'createdAt'>
): Promise<string> => {
  try {
    const incomeTransactionsRef = collection(db, 'users', userId, 'incomeTransactions');
    const docData = {
      ...transactionData,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(incomeTransactionsRef, docData);
    
    // Update user's available balance
    await updateUserBalance(userId, transactionData.amount);
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating income transaction:', error);
    throw error;
  }
};

/**
 * Update user's available balance
 */
export const updateUserBalance = async (userId: string, amount: number): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      availableBalance: increment(amount)
    });
  } catch (error) {
    console.error('Error updating user balance:', error);
    throw error;
  }
};

/**
 * Get upline chain for a user (up to 6 levels)
 */
export const getUplineChain = async (userId: string, maxLevels: number = 6): Promise<string[]> => {
  try {
    const uplineChain: string[] = [];
    let currentUserId = userId;
    
    for (let level = 0; level < maxLevels; level++) {
      // Get current user's sponsor
      const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', currentUserId)));
      
      if (userDoc.empty) break;
      
      const userData = userDoc.docs[0].data();
      const sponsorId = userData.sponsorId;
      
      if (!sponsorId) break;
      
      uplineChain.push(sponsorId);
      currentUserId = sponsorId;
    }
    
    return uplineChain;
  } catch (error) {
    console.error('Error getting upline chain:', error);
    return [];
  }
};

/**
 * Process Level Income when user activates package
 */
export const processLevelIncome = async (
  activatorUserId: string,
  packageAmount: number
): Promise<void> => {
  try {
    const uplineChain = await getUplineChain(activatorUserId, 6);
    
    for (let i = 0; i < uplineChain.length; i++) {
      const level = i + 1;
      const uplineUserId = uplineChain[i];
      const levelPercentage = LEVEL_PERCENTAGES[level as keyof typeof LEVEL_PERCENTAGES];
      
      if (levelPercentage) {
        const incomeAmount = (packageAmount * levelPercentage) / 100;
        
        await createIncomeTransaction(uplineUserId, {
          type: 'Level Income',
          fromUser: activatorUserId,
          amount: incomeAmount,
          level: level,
          status: 'approved' // Auto-approve for now
        });
      }
    }
  } catch (error) {
    console.error('Error processing level income:', error);
    throw error;
  }
};

/**
 * Process Re-Level Income when user upgrades rank
 */
export const processReLevelIncome = async (
  upgraderUserId: string,
  packageAmount: number
): Promise<void> => {
  try {
    const uplineChain = await getUplineChain(upgraderUserId, 6);
    
    for (let i = 0; i < uplineChain.length; i++) {
      const level = i + 1;
      const uplineUserId = uplineChain[i];
      const levelPercentage = LEVEL_PERCENTAGES[level as keyof typeof LEVEL_PERCENTAGES];
      
      if (levelPercentage) {
        const incomeAmount = (packageAmount * levelPercentage) / 100;
        
        await createIncomeTransaction(uplineUserId, {
          type: 'Re-Level Income',
          fromUser: upgraderUserId,
          amount: incomeAmount,
          level: level,
          status: 'approved' // Auto-approve for now
        });
      }
    }
  } catch (error) {
    console.error('Error processing re-level income:', error);
    throw error;
  }
};

/**
 * Get income transactions for a user with real-time updates
 */
export const getIncomeTransactions = (
  userId: string,
  callback: (transactions: IncomeTransaction[]) => void,
  filters?: {
    type?: 'Level Income' | 'Re-Level Income';
    status?: 'pending' | 'approved';
    level?: number;
  }
): (() => void) => {
  try {
    let q = query(
      collection(db, 'users', userId, 'incomeTransactions'),
      orderBy('createdAt', 'desc')
    );

    // Apply filters
    if (filters?.type) {
      q = query(q, where('type', '==', filters.type));
    }
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters?.level) {
      q = query(q, where('level', '==', filters.level));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactions: IncomeTransaction[] = [];
      snapshot.forEach((doc) => {
        transactions.push({
          id: doc.id,
          ...doc.data()
        } as IncomeTransaction);
      });
      callback(transactions);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error getting income transactions:', error);
    return () => {};
  }
};

/**
 * Get income summary for a user
 */
export const getIncomeSummary = async (userId: string): Promise<{
  totalLevelIncome: number;
  totalReLevelIncome: number;
  totalIncome: number;
  pendingIncome: number;
  approvedIncome: number;
}> => {
  try {
    const incomeTransactionsRef = collection(db, 'users', userId, 'incomeTransactions');
    const snapshot = await getDocs(incomeTransactionsRef);
    
    let totalLevelIncome = 0;
    let totalReLevelIncome = 0;
    let pendingIncome = 0;
    let approvedIncome = 0;
    
    snapshot.forEach((doc) => {
      const transaction = doc.data() as IncomeTransaction;
      
      if (transaction.type === 'Level Income') {
        totalLevelIncome += transaction.amount;
      } else if (transaction.type === 'Re-Level Income') {
        totalReLevelIncome += transaction.amount;
      }
      
      if (transaction.status === 'pending') {
        pendingIncome += transaction.amount;
      } else if (transaction.status === 'approved') {
        approvedIncome += transaction.amount;
      }
    });
    
    const totalIncome = totalLevelIncome + totalReLevelIncome;
    
    return {
      totalLevelIncome,
      totalReLevelIncome,
      totalIncome,
      pendingIncome,
      approvedIncome
    };
  } catch (error) {
    console.error('Error getting income summary:', error);
    return {
      totalLevelIncome: 0,
      totalReLevelIncome: 0,
      totalIncome: 0,
      pendingIncome: 0,
      approvedIncome: 0
    };
  }
};

/**
 * Get user data by ID
 */
export const getUserById = async (userId: string): Promise<any> => {
  try {
    const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', userId)));
    
    if (userDoc.empty) {
      return null;
    }
    
    return userDoc.docs[0].data();
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
};
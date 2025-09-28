import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  doc,
  serverTimestamp,
  increment,
  Timestamp,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Global Pool Entry Interface
export interface GlobalPoolEntry {
  id?: string;
  userId: string;
  level: number;
  position: number;
  joinedAt: Timestamp;
  status: 'active' | 'completed';
  totalEarned: number;
  isEligibleForUpgrade: boolean;
}

// Level Configuration for Way2Globe Wave
export const LEVEL_CONFIG = {
  1: { name: 'Azurite', cost: 5, totalIncome: 15 },
  2: { name: 'Sapphire', cost: 15, totalIncome: 45 },
  3: { name: 'Ruby', cost: 45, totalIncome: 135 },
  4: { name: 'Emerald', cost: 135, totalIncome: 405 },
  5: { name: 'Diamond', cost: 405, totalIncome: 1215 },
  6: { name: 'Crown Diamond', cost: 1215, totalIncome: 3645 }
};

// Income distribution per level (based on PDF chart)
export const INCOME_DISTRIBUTION = {
  1: [5, 5, 5], // Azurite: 3 payments of $5 each = $15 total
  2: [15, 15, 15], // Sapphire: 3 payments of $15 each = $45 total
  3: [45, 45, 45], // Ruby: 3 payments of $45 each = $135 total
  4: [135, 135, 135], // Emerald: 3 payments of $135 each = $405 total
  5: [405, 405, 405], // Diamond: 3 payments of $405 each = $1215 total
  6: [1215, 1215, 1215] // Crown Diamond: 3 payments of $1215 each = $3645 total
};

/**
 * Add user to global pool for a specific level
 */
export const addToGlobalPool = async (userId: string, level: number): Promise<void> => {
  try {
    // Get current position count for this level
    const poolQuery = query(
      collection(db, 'globalPool'),
      where('level', '==', level),
      orderBy('position', 'desc'),
      limit(1)
    );
    
    const poolSnapshot = await getDocs(poolQuery);
    let nextPosition = 1;
    
    if (!poolSnapshot.empty) {
      const lastEntry = poolSnapshot.docs[0].data();
      nextPosition = lastEntry.position + 1;
    }

    // Add user to global pool
    const poolEntry: Omit<GlobalPoolEntry, 'id'> = {
      userId,
      level,
      position: nextPosition,
      joinedAt: serverTimestamp() as Timestamp,
      status: 'active',
      totalEarned: 0,
      isEligibleForUpgrade: false
    };

    await addDoc(collection(db, 'globalPool'), poolEntry);

    // Process income distribution if there are enough users
    await processIncomeDistribution(level);
    
  } catch (error) {
    console.error('Error adding user to global pool:', error);
    throw error;
  }
};

/**
 * Process income distribution for a specific level
 */
export const processIncomeDistribution = async (level: number): Promise<void> => {
  try {
    // Get active users in this level pool
    const poolQuery = query(
      collection(db, 'globalPool'),
      where('level', '==', level),
      where('status', '==', 'active'),
      orderBy('position', 'asc')
    );
    
    const poolSnapshot = await getDocs(poolQuery);
    const activeUsers = poolSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as (GlobalPoolEntry & { id: string })[];

    // Need at least 2 users to start income distribution
    if (activeUsers.length < 2) {
      return;
    }

    const batch = writeBatch(db);
    const incomeAmount = INCOME_DISTRIBUTION[level as keyof typeof INCOME_DISTRIBUTION][0];

    // Process income for users who haven't completed their cycle
    for (let i = 0; i < activeUsers.length - 1; i++) {
      const currentUser = activeUsers[i];
      const nextUser = activeUsers[i + 1];

      // Give income to current user from next user
      await distributeIncome(currentUser.userId, nextUser.userId, incomeAmount, level);

      // Update user's total earned
      const newTotalEarned = currentUser.totalEarned + incomeAmount;
      const maxIncome = LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG].totalIncome;

      // Check if user has completed this level
      if (newTotalEarned >= maxIncome) {
        // Mark as completed and eligible for upgrade
        batch.update(doc(db, 'globalPool', currentUser.id), {
          status: 'completed',
          totalEarned: newTotalEarned,
          isEligibleForUpgrade: true,
          completedAt: serverTimestamp()
        });

        // Auto-upgrade to next level if available
        if (level < 6) {
          await autoUpgradeUser(currentUser.userId, level + 1);
        }
      } else {
        // Update total earned
        batch.update(doc(db, 'globalPool', currentUser.id), {
          totalEarned: newTotalEarned
        });
      }
    }

    await batch.commit();
    
  } catch (error) {
    console.error('Error processing income distribution:', error);
    throw error;
  }
};

/**
 * Distribute income from one user to another
 */
export const distributeIncome = async (
  receiverUserId: string,
  payerUserId: string,
  amount: number,
  level: number
): Promise<void> => {
  try {
    const batch = writeBatch(db);

    // Update receiver's balance
    const receiverRef = doc(db, 'users', receiverUserId);
    batch.update(receiverRef, {
      balance: increment(amount),
      totalEarnings: increment(amount),
      updatedAt: serverTimestamp()
    });

    // Create income transaction record
    const incomeTransactionRef = doc(collection(db, 'users', receiverUserId, 'incomeTransactions'));
    batch.set(incomeTransactionRef, {
      type: 'Global Income',
      fromUser: payerUserId,
      amount,
      level,
      status: 'approved',
      createdAt: serverTimestamp()
    });

    // Create audit log
    const auditLogRef = doc(collection(db, 'auditLogs'));
    batch.set(auditLogRef, {
      type: 'income_distribution',
      userId: receiverUserId,
      fromUserId: payerUserId,
      amount,
      level,
      timestamp: serverTimestamp(),
      details: `Global income distribution: $${amount} from level ${level}`
    });

    await batch.commit();
    
  } catch (error) {
    console.error('Error distributing income:', error);
    throw error;
  }
};

/**
 * Auto-upgrade user to next level
 */
export const autoUpgradeUser = async (userId: string, nextLevel: number): Promise<void> => {
  try {
    // Check if user has sufficient balance for upgrade
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const requiredAmount = LEVEL_CONFIG[nextLevel as keyof typeof LEVEL_CONFIG].cost;

    if (userData.balance >= requiredAmount) {
      const batch = writeBatch(db);

      // Deduct cost from user's balance
      batch.update(userRef, {
        balance: increment(-requiredAmount),
        rank: LEVEL_CONFIG[nextLevel as keyof typeof LEVEL_CONFIG].name,
        updatedAt: serverTimestamp()
      });

      // Add to next level pool
      await addToGlobalPool(userId, nextLevel);

      // Create transaction record
      const transactionRef = doc(collection(db, 'users', userId, 'transactions'));
      batch.set(transactionRef, {
        type: 'auto_upgrade',
        amount: requiredAmount,
        level: nextLevel,
        status: 'completed',
        createdAt: serverTimestamp()
      });

      await batch.commit();
    }
    
  } catch (error) {
    console.error('Error auto-upgrading user:', error);
    throw error;
  }
};

/**
 * Get user's global pool status
 */
export const getUserGlobalPoolStatus = async (userId: string): Promise<{
  levels: Array<{
    level: number;
    position: number;
    status: string;
    totalEarned: number;
    maxIncome: number;
    progress: number;
  }>;
}> => {
  try {
    const poolQuery = query(
      collection(db, 'globalPool'),
      where('userId', '==', userId),
      orderBy('level', 'asc')
    );
    
    const poolSnapshot = await getDocs(poolQuery);
    const levels = poolSnapshot.docs.map(doc => {
      const data = doc.data() as GlobalPoolEntry;
      const maxIncome = LEVEL_CONFIG[data.level as keyof typeof LEVEL_CONFIG].totalIncome;
      const progress = (data.totalEarned / maxIncome) * 100;
      
      return {
        level: data.level,
        position: data.position,
        status: data.status,
        totalEarned: data.totalEarned,
        maxIncome,
        progress: Math.min(progress, 100)
      };
    });

    return { levels };
    
  } catch (error) {
    console.error('Error getting user global pool status:', error);
    throw error;
  }
};

/**
 * Check if user can activate ID (has sufficient balance)
 */
export const canActivateId = async (userId: string): Promise<{
  canActivate: boolean;
  currentBalance: number;
  requiredAmount: number;
}> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const currentBalance = userData.balance || 0;
    const requiredAmount = LEVEL_CONFIG[1].cost; // Azurite level cost

    return {
      canActivate: currentBalance >= requiredAmount,
      currentBalance,
      requiredAmount
    };
    
  } catch (error) {
    console.error('Error checking activation eligibility:', error);
    throw error;
  }
};

/**
 * Activate user ID and add to first level pool
 */
export const activateUserId = async (userId: string): Promise<void> => {
  try {
    const activationCheck = await canActivateId(userId);
    
    if (!activationCheck.canActivate) {
      throw new Error('Insufficient balance for ID activation');
    }

    const batch = writeBatch(db);
    const userRef = doc(db, 'users', userId);

    // Deduct activation cost and update status
    batch.update(userRef, {
      balance: increment(-activationCheck.requiredAmount),
      isActive: true,
      rank: LEVEL_CONFIG[1].name,
      activatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Create activation transaction
    const transactionRef = doc(collection(db, 'users', userId, 'transactions'));
    batch.set(transactionRef, {
      type: 'id_activation',
      amount: activationCheck.requiredAmount,
      status: 'completed',
      createdAt: serverTimestamp()
    });

    // Create audit log
    const auditLogRef = doc(collection(db, 'auditLogs'));
    batch.set(auditLogRef, {
      type: 'id_activation',
      userId,
      amount: activationCheck.requiredAmount,
      timestamp: serverTimestamp(),
      details: 'User ID activated and added to Azurite level'
    });

    await batch.commit();

    // Add user to first level global pool
    await addToGlobalPool(userId, 1);
    
  } catch (error) {
    console.error('Error activating user ID:', error);
    throw error;
  }
};
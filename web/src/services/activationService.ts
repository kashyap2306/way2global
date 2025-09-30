import { 
  doc, 
  updateDoc, 
  serverTimestamp, 
  getDoc,
  collection,
  addDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { processLevelIncome, processReLevelIncome } from './incomeTransactionService';

export interface ActivationData {
  userId: string;
  packageAmount: number;
  newRank: string;
  previousRank?: string;
  isUpgrade: boolean;
}

/**
 * Process package activation and trigger income distribution
 */
export const processPackageActivation = async (activationData: ActivationData): Promise<void> => {
  try {
    const { userId, packageAmount, newRank, previousRank, isUpgrade } = activationData;

    // Update user's rank and activation status
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      rank: newRank,
      isActive: true,
      rankActivatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Process Level Income for new activations
    if (!isUpgrade || !previousRank) {
      await processLevelIncome(userId, packageAmount);
    }

    // Process Re-Level Income for rank upgrades
    if (isUpgrade && previousRank) {
      await processReLevelIncome(userId, packageAmount);
    }

    // Create activation record
    await createActivationRecord(userId, packageAmount, newRank, previousRank, isUpgrade);

  } catch (error) {
    console.error('Error processing package activation:', error);
    throw error;
  }
};

/**
 * Create activation record for audit trail
 */
const createActivationRecord = async (
  userId: string,
  packageAmount: number,
  newRank: string,
  previousRank?: string,
  isUpgrade: boolean = false
): Promise<void> => {
  try {
    const activationsRef = collection(db, 'users', userId, 'activations');
    await addDoc(activationsRef, {
      packageAmount,
      newRank,
      previousRank: previousRank || null,
      isUpgrade,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating activation record:', error);
    throw error;
  }
};

/**
 * Get user's current rank and activation status
 */
export const getUserActivationStatus = async (userId: string): Promise<{
  currentRank: string;
  isActive: boolean;
  canUpgrade: boolean;
  nextRank?: string;
}> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    const currentRank = userData.rank || 'Inactive';
    const isActive = userData.isActive || false;
    
    // Define rank hierarchy
    const rankHierarchy = [
      'Inactive',
      'Starter',
      'Bronze',
      'Silver', 
      'Gold',
      'Platinum',
      'Diamond',
      'Crown'
    ];
    
    const currentRankIndex = rankHierarchy.indexOf(currentRank);
    const canUpgrade = currentRankIndex < rankHierarchy.length - 1;
    const nextRank = canUpgrade ? rankHierarchy[currentRankIndex + 1] : undefined;
    
    return {
      currentRank,
      isActive,
      canUpgrade,
      nextRank
    };
  } catch (error) {
    console.error('Error getting user activation status:', error);
    throw error;
  }
};

/**
 * Calculate package amount based on rank
 */
export const getPackageAmount = (rank: string): number => {
  const packageAmounts: { [key: string]: number } = {
    'Starter': 5,    // ✓ Azurite equivalent
    'Bronze': 10,    // ✓ Benitoite equivalent (was 25)
    'Silver': 20,    // ✓ Crystals equivalent (was 50)
    'Gold': 40,      // ✓ Diamond equivalent (was 100)
    'Platinum': 80,  // ✓ Emerald equivalent (was 250)
    'Diamond': 160,  // ✓ Feldspar equivalent (was 500)
    'Crown': 320     // ✓ Garnet equivalent (was 1000)
  };
  
  return packageAmounts[rank] || 0;
};

/**
 * Validate activation request
 */
export const validateActivationRequest = async (
  userId: string,
  targetRank: string
): Promise<{
  isValid: boolean;
  error?: string;
  packageAmount?: number;
}> => {
  try {
    const activationStatus = await getUserActivationStatus(userId);
    const packageAmount = getPackageAmount(targetRank);
    
    if (packageAmount === 0) {
      return {
        isValid: false,
        error: 'Invalid rank specified'
      };
    }
    
    // Check if user can activate this rank
    if (activationStatus.currentRank === 'Inactive' && targetRank !== 'Starter') {
      return {
        isValid: false,
        error: 'Inactive users must first activate Starter rank'
      };
    }
    
    // For upgrades, ensure it's the next rank in hierarchy
    if (activationStatus.isActive && targetRank !== activationStatus.nextRank && targetRank !== activationStatus.currentRank) {
      return {
        isValid: false,
        error: 'You can only upgrade to the next rank level or re-activate current rank'
      };
    }
    
    return {
      isValid: true,
      packageAmount
    };
  } catch (error) {
    console.error('Error validating activation request:', error);
    return {
      isValid: false,
      error: 'Failed to validate activation request'
    };
  }
};
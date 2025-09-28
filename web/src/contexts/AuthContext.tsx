import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  type User,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { createAllUserDocuments, checkUserDocumentsExist } from '../services/userSignupService';

interface MLMUserData {
  uid: string;
  userCode?: string; // Add userCode field
  displayName: string;
  email: string;
  contact?: string;
  walletAddress?: string;
  sponsorId?: string | null;
  rank: string;
  status: string;
  balance: number;
  availableBalance?: number; // Add availableBalance field
  totalEarnings: number;
  totalWithdrawn?: number; // Add totalWithdrawn field
  referrals: string[];
  activationAmount: number;
  cyclesCompleted: number;
  directReferrals?: number; // Add directReferrals field
  teamSize?: number; // Add teamSize field
  joinedAt?: any; // Add joinedAt field
  createdAt: any;
  lastLoginAt?: any;
  isActive: boolean;
  role?: 'user' | 'admin';
  // Additional MLM fields
  level?: number;
  pendingBalance?: number;
  totalWithdrawals?: number;
  currentCycle?: number;
  sideAmounts?: number[];
}

interface AuthContextType {
  currentUser: User | null;
  userData: MLMUserData | null;
  user: User | null; // Alias for backward compatibility
  userDoc: MLMUserData | null; // Alias for backward compatibility
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string, sponsorId?: string) => Promise<User>;
  logout: () => Promise<void>;
  loading: boolean;
  updateUserData: (data: Partial<MLMUserData>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<MLMUserData | null>(null);
  const [loading, setLoading] = useState(true);

  const signup = async (email: string, password: string, displayName: string, sponsorId?: string): Promise<User> => {
    try {
      console.log('[AuthContext] Starting signup process for:', email);
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile with display name
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName });
      }

      // Check if user documents already exist (prevent duplicates)
      const documentsExist = await checkUserDocumentsExist(user.uid);
      if (documentsExist) {
        console.log('[AuthContext] User documents already exist, skipping creation');
        return user;
      }

      // Create all required documents using the comprehensive service
      await createAllUserDocuments(user, displayName, sponsorId);
      
      console.log('[AuthContext] User signup completed successfully with all documents created');
      return user;
      
    } catch (error) {
      console.error('[AuthContext] Signup error:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    try {
      console.log('[AuthContext] Starting login process for:', email);
      
      // Authenticate with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      
      // Fetch user document from Firestore
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
        console.error('[AuthContext] User document not found for UID:', uid);
        throw new Error('User document not found. Please contact support to recreate your account.');
      }
      
      // Set user data in global state
      const userData = userDoc.data() as MLMUserData;
      const completeUserData: MLMUserData = {
        ...userData,
        uid,
        lastLoginAt: serverTimestamp()
      };
      
      // Update last login time
      await updateDoc(doc(db, 'users', uid), {
        lastLoginAt: serverTimestamp()
      });
      
      setUserData(completeUserData);
      console.log('[AuthContext] Login successful for user:', userData.displayName);
      
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      console.log('[AuthContext] Logging out user');
      await signOut(auth);
      setUserData(null);
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
      throw error;
    }
  };

  const updateUserData = async (data: Partial<MLMUserData>): Promise<void> => {
    if (!currentUser) {
      throw new Error('No user logged in');
    }
    
    try {
      console.log('[AuthContext] Updating user data:', data);
      await updateDoc(doc(db, 'users', currentUser.uid), data);
      
      // Update local state
      if (userData) {
        setUserData({ ...userData, ...data });
      }
      
      console.log('[AuthContext] User data updated successfully');
    } catch (error) {
      console.error('[AuthContext] Error updating user data:', error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('[AuthContext] Auth state changed:', user ? user.email : 'No user');
      setCurrentUser(user);
      
      if (user) {
        // Always fetch fresh user data when auth state changes
        try {
          console.log('[AuthContext] Fetching user data for UID:', user.uid);
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const fetchedUserData = userDoc.data() as MLMUserData;
            setUserData({
              ...fetchedUserData,
              uid: user.uid
            });
            console.log('[AuthContext] User data loaded successfully');
          } else {
            console.error('[AuthContext] User document not found for authenticated user:', user.uid);
            // Show user-friendly error message
            alert('Your account data is missing. Please contact support to recreate your account.');
            setUserData(null);
          }
        } catch (error) {
          console.error('[AuthContext] Error fetching user data:', error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []); // Empty dependency array to avoid infinite loops

  const value: AuthContextType = {
    currentUser,
    userData,
    user: currentUser, // Alias for backward compatibility
    userDoc: userData, // Alias for backward compatibility
    login,
    signup,
    logout,
    loading,
    updateUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
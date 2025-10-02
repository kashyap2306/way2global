import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  type User,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { createAllUserDocuments } from '../services/userSignupService';

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
  isAdmin?: boolean;
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
  signup: (email: string, password: string, displayName: string, phone?: string, walletAddress?: string, sponsorId?: string) => Promise<User>;
  logout: () => Promise<void>;
  loading: boolean;
  updateUserData: (data: Partial<MLMUserData>) => Promise<void>;
  showActivationPopup: boolean;
  setShowActivationPopup: (show: boolean) => void;
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
  const [showActivationPopup, setShowActivationPopup] = useState(false);

  const signup = async (email: string, password: string, displayName: string, phone?: string, walletAddress?: string, sponsorId?: string): Promise<User> => {
    try {
      console.log('[AuthContext] Starting signup process for:', email);
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile with display name
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName });
      }

      // Use the comprehensive user document creation service
      // This will generate userCode and create all required documents
      await createAllUserDocuments(
        user,
        displayName,
        phone,
        walletAddress,
        sponsorId
      );
      
      console.log('[AuthContext] User documents created successfully with userCode');
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
        lastLoginAt: serverTimestamp(),
        isAdmin: userData.role === 'admin'
      };
      
      // Update last login time
      await updateDoc(doc(db, 'users', uid), {
        lastLoginAt: serverTimestamp()
      });
      
      setUserData(completeUserData);
      console.log('[AuthContext] Login successful for user:', userData.displayName);

      // Check if user is inactive and set popup state
      if (!completeUserData.isActive) {
        setShowActivationPopup(true);
      }
      
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
      setShowActivationPopup(false);
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
        const updated = { ...userData, ...data };
        setUserData(updated);
        // If user becomes active, hide the popup
        if (updated.isActive) {
          setShowActivationPopup(false);
        }
      }
      
      console.log('[AuthContext] User data updated successfully');
    } catch (error) {
      console.error('[AuthContext] Error updating user data:', error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('[AuthContext] Auth state changed:', firebaseUser ? firebaseUser.email : 'No user');
      setCurrentUser(firebaseUser);

      if (firebaseUser) {
        // Set up real-time listener for user data
        const userRef = doc(db, "users", firebaseUser.uid);
        const unsubDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const fetchedUserData = docSnap.data() as MLMUserData;
            setUserData({
              ...fetchedUserData,
              uid: firebaseUser.uid
            });
            // Check if user is inactive and set popup state
            if (!fetchedUserData.isActive) {
              setShowActivationPopup(true);
            } else {
              setShowActivationPopup(false);
            }
            console.log('[AuthContext] User data updated via real-time listener');
          } else {
            console.error('[AuthContext] User document not found:', firebaseUser.uid);
            setUserData(null);
            setShowActivationPopup(false);
          }
          setLoading(false);
        });
        
        // Return cleanup function for the document listener
        return unsubDoc;
      } else {
        setUserData(null);
        setLoading(false);
        setShowActivationPopup(false);
      }
    });

    return () => unsubscribe();
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
    updateUserData,
    showActivationPopup,
    setShowActivationPopup
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">Loading...</span>
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
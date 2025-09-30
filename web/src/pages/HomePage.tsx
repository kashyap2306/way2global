import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import DashboardCards from '../components/dashboard/DashboardCards';
import { ClipboardDocumentIcon as CopyIcon, CheckIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface UserData {
  uid: string;
  displayName: string;
  userCode: string;
  isActive: boolean;
}

interface GlobalPoolStatus {
  levels: Array<{
    level: number;
    position: number;
    status: string;
    totalEarned: number;
    maxIncome: number;
    progress: number;
  }>;
}

const HomePage: React.FC = () => {
  const { currentUser } = useAuth();
  const { uid } = useParams<{ uid: string }>();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [referralLink, setReferralLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [globalPoolStatus, setGlobalPoolStatus] = useState<GlobalPoolStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = useCallback(async () => {
    try {
      // Use UID from params if available, otherwise use current user's UID
      const targetUid = uid || currentUser?.uid;
      if (!targetUid) {
        setError("User not logged in or UID not provided.");
        setLoading(false);
        return;
      }

      const userDocRef = doc(db, 'users', targetUid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserData;
        setUserData(data);

        const baseUrl = window.location.origin;
        setReferralLink(`${baseUrl}/signup?ref=${data.userCode}`);

        if (data.isActive) {
          // Global pool status functionality removed - using new direct pool generation system
          setGlobalPoolStatus(null);
        }
      } else {
        setError("User data not found.");
      }
    } catch (err: any) {
      console.error('Error fetching user data:', err);
      setError(err.message || "Failed to fetch user data.");
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid, uid]);

  useEffect(() => {
    if (currentUser || uid) {
      fetchUserData();
    }
  }, [currentUser?.uid, uid]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-600">Loading user session...</span>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-600">Loading dashboard data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-xl font-semibold text-red-700 mb-4">Error Loading Dashboard</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchUserData}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-xl font-semibold text-orange-700 mb-4">User Data Not Found</h2>
          <p className="text-orange-600 mb-4">Please ensure your account is properly set up.</p>
          <button
            onClick={fetchUserData}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-0 sm:px-4">
      {/* User Details */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 rounded-xl shadow-lg p-4 sm:p-6 backdrop-blur-sm border border-slate-700/50">
        <h2 className="text-lg font-semibold text-white mb-4">User Details</h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse h-20 bg-slate-700 rounded"></div>
            ))}
          </div>
        ) : userData ? (
          <div className="grid grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                Full Name
              </label>
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
                <p className="text-white font-semibold">{userData.displayName}</p>
              </div>
            </div>

            {/* User Code */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                User Code
              </label>
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
                <p className="text-white font-semibold">{userData.userCode}</p>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                Status
              </label>
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600/30 flex items-center gap-2">
                <p className={`font-semibold ${userData.isActive ? 'text-green-500' : 'text-red-500'}`}>
                  {userData.isActive ? 'Active' : 'Inactive'}
                </p>
                {!userData.isActive && <span className="w-4 h-4 bg-red-500 rounded-full"></span>}
              </div>
            </div>

            {/* Rank */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                Rank
              </label>
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
                <p className="text-white font-semibold">
                  {userData.isActive ? 'Azurite' : 'Coming Soon'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-slate-400">Unable to load user details</p>
        )}
      </div>

      {/* Global Pool Status */}
      {userData?.isActive && globalPoolStatus && globalPoolStatus.levels.length > 0 && (
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 rounded-xl shadow-lg p-4 sm:p-6 backdrop-blur-sm border border-slate-700/50">
          <div className="flex items-center gap-2 mb-4">
            <SparklesIcon className="w-6 h-6 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Global Pool Status</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {globalPoolStatus.levels.map((pool, index) => (
              <div key={index} className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-semibold">Level {pool.level}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    pool.status === 'completed' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {pool.status === 'completed' ? 'Completed' : 'Active'}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Position:</span>
                    <span className="text-white">{pool.position}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Income Earned:</span>
                    <span className="text-green-400 font-semibold">${pool.totalEarned.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Progress:</span>
                    <span className="text-blue-400">{pool.progress.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Referral Link */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 rounded-xl shadow-lg p-4 sm:p-6 backdrop-blur-sm border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">Referral Link</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-600/30 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(referralLink);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 text-sm sm:text-base whitespace-nowrap flex items-center gap-2"
          >
            {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy Link'}
          </button>
        </div>
        <p className="text-slate-400 text-sm mt-3">
          Share this link to invite new members to your team
        </p>
      </div>

      {/* Dashboard Cards */}
      <div className="rounded-xl shadow-lg p-4 sm:p-6 border border-slate-700/50">
        <div className="grid grid-cols-1 gap-4">
          <DashboardCards />
        </div>
      </div>
    </div>
  );
};

export default HomePage;

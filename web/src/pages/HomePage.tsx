import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import DashboardCards from '../components/dashboard/DashboardCards';
import { ClipboardDocumentIcon as CopyIcon, CheckIcon } from '@heroicons/react/24/outline';

interface UserData {
  uid: string;
  displayName: string;
  userCode: string;
  rank: string;
  isActive: boolean;
  balance: number;
  totalEarnings: number;
  referrals: any[];
  activationAmount: number;
  cyclesCompleted: number;
  createdAt: any;
}

const HomePage: React.FC = () => {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [referralLink, setReferralLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchUserData();
    }
  }, [currentUser]);

  const fetchUserData = async () => {
    try {
      const userDocRef = doc(db, 'users', currentUser?.uid || '');
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserData;
        setUserData(data);

        const baseUrl = window.location.origin;
        setReferralLink(`${baseUrl}/signup?ref=${data.userCode}`);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

            {/* Rank */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                Rank
              </label>
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
                <p className="text-white font-semibold">{userData.rank}</p>
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
          </div>
        ) : (
          <p className="text-slate-400">Unable to load user details</p>
        )}
      </div>

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
            onClick={copyReferralLink}
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
          <DashboardCards fullWidth />
        </div>
      </div>
    </div>
  );
};

export default HomePage;

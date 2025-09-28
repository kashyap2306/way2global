import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ClipboardDocumentIcon as CopyIcon, CheckIcon, UserGroupIcon, CurrencyRupeeIcon, ChartBarIcon } from '@heroicons/react/24/outline';

interface UserData {
  uid: string;
  displayName?: string;
  fullName?: string;
  email: string;
  userCode: string;
  rank: string;
  isActive: boolean;
  directReferrals: number;
  teamSize: number;
  totalEarnings: number;
  availableBalance: number;
  phone?: string;
  referrals?: string[];
  createdAt: any;
}

interface TeamMember {
  uid: string;
  fullName: string;
  displayName?: string;
  email: string;
  userCode: string;
  phone?: string;
  directReferrals: number;
  isActive: boolean;
  rank: string;
  totalEarnings: number;
  sponsorId?: string;
  createdAt: any;
}

const ReferralsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [directReferrals, setDirectReferrals] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [referralLink, setReferralLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [teamStats, setTeamStats] = useState({
    totalReferrals: 0,
    activeMembers: 0,
    teamIncome: 0,
    referralIncome: 0
  });

  useEffect(() => {
    if (currentUser) {
      setupRealTimeListeners();
    }
  }, [currentUser]);

  // Setup real-time listeners for live data updates
  const setupRealTimeListeners = () => {
    if (!currentUser) return;

    const unsubscribers: (() => void)[] = [];

    // Listen to user data changes
    const userUnsubscribe = onSnapshot(
      doc(db, 'users', currentUser.uid),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data() as UserData;
          setUserData(data);
          
          // Set referral link using userCode
          const baseUrl = window.location.origin;
          setReferralLink(`${baseUrl}/signup?ref=${data.userCode}`);
          
          // Update team stats with user's team size
          setTeamStats(prev => ({
            ...prev,
            activeMembers: data.teamSize || 0
          }));
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to user data:', error);
        setLoading(false);
      }
    );
    unsubscribers.push(userUnsubscribe);

    // Listen to direct referrals (users where sponsorId == currentUser.uid)
    const directReferralsUnsubscribe = onSnapshot(
      query(collection(db, 'users'), where('sponsorId', '==', currentUser.uid)),
      (snapshot) => {
        const directReferralsData: TeamMember[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          const memberUid = data.uid || doc.id;
          directReferralsData.push({
            uid: memberUid,
            fullName: data.fullName || data.displayName || 'Unknown',
            displayName: data.displayName,
            email: data.email || '',
            userCode: data.userCode || '',
            phone: data.phone || '',
            directReferrals: data.directReferrals || 0,
            isActive: data.isActive || false,
            rank: data.rank || 'Member',
            totalEarnings: data.totalEarnings || 0,
            sponsorId: data.sponsorId,
            createdAt: data.createdAt
          });
        });
        setDirectReferrals(directReferralsData);
        
        // Update team stats with direct referrals count
        setTeamStats(prev => ({
          ...prev,
          totalReferrals: directReferralsData.length
        }));
        
        // Calculate team income from all team members
        fetchAllTeamMembersAndCalculateIncome();
      },
      (error) => {
        console.error('Error listening to direct referrals:', error);
      }
    );
    unsubscribers.push(directReferralsUnsubscribe);

    // Listen to incomeTransactions for referral income
    const referralIncomeUnsubscribe = onSnapshot(
      query(
        collection(db, 'users', currentUser.uid, 'incomeTransactions'),
        where('type', '==', 'referral_commission'),
        where('status', '==', 'completed')
      ),
      (snapshot) => {
        let totalReferralIncome = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          totalReferralIncome += data.amount || 0;
        });
        
        setTeamStats(prev => ({
          ...prev,
          referralIncome: totalReferralIncome
        }));
      },
      (error) => {
        console.error('Error listening to referral income:', error);
      }
    );
    unsubscribers.push(referralIncomeUnsubscribe);

    // Cleanup function
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  };

  // Fetch all team members and calculate total income
  const fetchAllTeamMembersAndCalculateIncome = async () => {
    if (!currentUser) return;

    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      let totalTeamIncome = 0;
      
      snapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.sponsorId === currentUser.uid) {
          totalTeamIncome += userData.totalEarnings || 0;
        }
      });

      setTeamStats(prev => ({
        ...prev,
        teamIncome: totalTeamIncome
      }));
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount).replace('$', '') + ' USDT';
  };

  const copyReferralLink = async () => {
    if (referralLink) {
      try {
        await navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy: ', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 px-2 sm:px-4 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-4">
            Referrals & Team
          </h1>
          <p className="text-sm sm:text-lg text-slate-300">
            Build your network and earn rewards
          </p>
        </div>

        {/* Team Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-6 backdrop-blur-sm border border-slate-700/50 hover:shadow-2xl transition-all duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-lg font-semibold text-white mb-1 break-words">Direct Referrals</h3>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-400 break-words">
                  {loading ? '...' : teamStats.totalReferrals}
                </p>
                <p className="text-xs sm:text-sm text-slate-400 break-words">Users you directly referred</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-green-900 rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-6 backdrop-blur-sm border border-slate-700/50 hover:shadow-2xl transition-all duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg flex-shrink-0">
                <ChartBarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-lg font-semibold text-white mb-1 break-words">Total Team Size</h3>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-400 break-words">
                  {loading ? '...' : teamStats.activeMembers}
                </p>
                <p className="text-xs sm:text-sm text-slate-400 break-words">All levels (direct + indirect)</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-purple-900 rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-6 backdrop-blur-sm border border-slate-700/50 hover:shadow-2xl transition-all duration-300 sm:col-span-2 lg:col-span-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg flex-shrink-0">
                <CurrencyRupeeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-lg font-semibold text-white mb-1 break-words">Referral Income</h3>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-400 break-words">
                  {loading ? '...' : formatCurrency(teamStats.referralIncome)}
                </p>
                <p className="text-xs sm:text-sm text-slate-400 break-words">From referral commissions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Link */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-900 rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-6 backdrop-blur-sm border border-slate-700/50">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">Your Referral Link</h3>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="text"
              value={referralLink || 'Loading...'}
              readOnly
              className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 break-all"
            />
            <button
              onClick={copyReferralLink}
              disabled={!referralLink}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-xs sm:text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Referrals Table */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-lg sm:rounded-xl shadow-lg backdrop-blur-sm border border-slate-700/50 overflow-hidden">
          <div className="p-3 sm:p-6 border-b border-slate-700/50">
            <h2 className="text-lg sm:text-xl font-bold text-white">Your Team</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Direct referrals and their status</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="text-left p-2 sm:p-4 text-xs sm:text-sm font-semibold text-slate-300">Name</th>
                  <th className="text-left p-2 sm:p-4 text-xs sm:text-sm font-semibold text-slate-300 hidden sm:table-cell">Email</th>
                  <th className="text-left p-2 sm:p-4 text-xs sm:text-sm font-semibold text-slate-300">Rank</th>
                  <th className="text-left p-2 sm:p-4 text-xs sm:text-sm font-semibold text-slate-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {directReferrals.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center p-6 sm:p-8 text-slate-400">
                      No referrals yet. Share your referral link to get started!
                    </td>
                  </tr>
                ) : (
                  directReferrals.map((referral) => (
                    <tr key={referral.uid} className="border-t border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                      <td className="p-2 sm:p-4">
                        <div className="text-xs sm:text-sm font-medium text-white break-words">
                          {referral.displayName || referral.fullName || 'Unknown User'}
                        </div>
                      </td>
                      <td className="p-2 sm:p-4 hidden sm:table-cell">
                        <div className="text-xs sm:text-sm text-slate-300 break-words">
                          {referral.email || 'No email'}
                        </div>
                      </td>
                      <td className="p-2 sm:p-4">
                        <div className="text-xs sm:text-sm text-slate-300">
                          {referral.rank || 'Unranked'}
                        </div>
                      </td>
                      <td className="p-2 sm:p-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          referral.isActive 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {referral.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralsPage;
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
// ... existing code ...
import { 
  ClipboardDocumentIcon as CopyIcon, 
  CheckIcon, 
  UserGroupIcon, 
  ChartBarIcon, 
// ... existing code ...
  ChevronDownIcon,
  ChevronRightIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

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
  sponsorId?: string;
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
  children?: TeamMember[];
  level?: number;
}

interface TeamStats {
  totalReferrals: number;
  activeMembers: number;
  totalTeamSize: number;
}

const ReferralsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [directReferrals, setDirectReferrals] = useState<TeamMember[]>([]);
  const [teamHierarchy, setTeamHierarchy] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [referralLink, setReferralLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [teamStats, setTeamStats] = useState<TeamStats>({
    totalReferrals: 0,
    activeMembers: 0,
    totalTeamSize: 0,
  });

  useEffect(() => {
    if (currentUser) {
      fetchUserData();
      setupRealTimeListeners();
    }
  }, [currentUser]);

  const fetchUserData = async () => {
    try {
      const userDocRef = doc(db, 'users', currentUser?.uid || '');
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserData;

        const baseUrl = window.location.origin;
        setReferralLink(`${baseUrl}/signup?ref=${data.userCode}`);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user data');
    }
  };

  const setupRealTimeListeners = () => {
    if (!currentUser) return;

    const unsubscribers: (() => void)[] = [];

    // Listen to user data changes
    const userUnsubscribe = onSnapshot(
      doc(db, 'users', currentUser.uid),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data() as UserData;
          
          const baseUrl = window.location.origin;
          setReferralLink(`${baseUrl}/signup?ref=${data.userCode}`);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to user data:', error);
        setLoading(false);
      }
    );
    unsubscribers.push(userUnsubscribe);

    // Listen to all users to build team hierarchy
    const usersUnsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const allUsers: TeamMember[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          allUsers.push({
            uid: doc.id,
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

        // Build team hierarchy
        const directRefs = allUsers.filter(user => user.sponsorId === currentUser.uid);
        const hierarchy = buildTeamHierarchy(allUsers, currentUser.uid, 1);
        
        setDirectReferrals(directRefs);
        setTeamHierarchy(hierarchy);
        
        // Calculate team stats
        calculateTeamStats(allUsers, currentUser.uid);
      },
      (error) => {
        console.error('Error listening to users:', error);
      }
    );
    unsubscribers.push(usersUnsubscribe);

    // Listen to income transactions
    const incomeUnsubscribe = onSnapshot(
      query(
        collection(db, 'incomeTransactions'),
        where('userId', '==', currentUser.uid)
      ),
      (snapshot) => {
        let referralIncome = 0;
        let levelIncome = 0;
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          const amount = data.amount || 0;
          
          if (data.type === 'referral') {
            referralIncome += amount;
          } else if (data.type === 'level') {
            levelIncome += amount;
          }
        });
        
        setTeamStats(prev => ({
          ...prev,
          referralIncome,
          levelIncome,
          totalIncome: referralIncome + levelIncome
        }));
      },
      (error) => {
        console.error('Error listening to income transactions:', error);
      }
    );
    unsubscribers.push(incomeUnsubscribe);

    // Cleanup function
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  };

  const buildTeamHierarchy = (allUsers: TeamMember[], parentId: string, level: number): TeamMember[] => {
    const children = allUsers.filter(user => user.sponsorId === parentId);
    
    return children.map(child => ({
      ...child,
      level,
      children: level < 10 ? buildTeamHierarchy(allUsers, child.uid, level + 1) : []
    }));
  };

  const calculateTeamStats = (allUsers: TeamMember[], userId: string) => {
    const getTeamMembers = (parentId: string, level: number = 1): TeamMember[] => {
      if (level > 10) return []; // Limit to 10 levels
      
      const directChildren = allUsers.filter(user => user.sponsorId === parentId);
      let allTeamMembers = [...directChildren];
      
      directChildren.forEach(child => {
        allTeamMembers = [...allTeamMembers, ...getTeamMembers(child.uid, level + 1)];
      });
      
      return allTeamMembers;
    };

    const directRefs = allUsers.filter(user => user.sponsorId === userId);
    const allTeamMembers = getTeamMembers(userId);
    const activeMembers = allTeamMembers.filter(member => member.isActive).length;

    setTeamStats(prev => ({
      ...prev,
      totalReferrals: directRefs.length,
      activeMembers,
      totalTeamSize: allTeamMembers.length
    }));
  };

  const copyReferralLink = async () => {
    if (!referralLink) return;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Referral link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast.error('Failed to copy referral link');
    }
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderTeamMember = (member: TeamMember, depth: number = 0) => {
    const hasChildren = member.children && member.children.length > 0;
    const isExpanded = expandedNodes.has(member.uid);
    const indentClass = `ml-${Math.min(depth * 4, 16)}`;

    return (
      <div key={member.uid} className="border-b border-slate-700/30 last:border-b-0">
        <div className={`flex items-center p-4 hover:bg-slate-800/30 transition-colors ${indentClass}`}>
          {hasChildren && (
            <button
              onClick={() => toggleNode(member.uid)}
              className="mr-2 p-1 hover:bg-slate-700 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRightIcon className="w-4 h-4 text-slate-400" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-6 mr-2" />}
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">
                  {member.fullName || member.displayName}
                </p>
                <p className="text-slate-400 text-xs">{member.userCode}</p>
              </div>
            </div>
            
            <div className="text-sm">
              <p className="text-slate-300">{member.rank}</p>
              <p className="text-slate-500 text-xs">Level {member.level || 1}</p>
            </div>
            
            <div className="text-sm">
              <p className="text-slate-300 flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                {member.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                member.isActive 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {member.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="bg-slate-900/30">
            {member.children!.map(child => renderTeamMember(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse h-32 bg-slate-700 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-slate-700/50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">
            Referrals & Team Network
          </h1>
          <p className="text-slate-300">
            Build your network and track your team's growth
          </p>
        </div>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Direct Referrals */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Direct Referrals</p>
              <p className="text-2xl font-bold">{teamStats.totalReferrals}</p>
            </div>
            <UserGroupIcon className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        {/* Total Team Size */}
        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Total Team Size</p>
              <p className="text-2xl font-bold">{teamStats.totalTeamSize}</p>
            </div>
            <ChartBarIcon className="w-8 h-8 text-green-200" />
          </div>
        </div>

        {/* Active Members */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Active Members</p>
              <p className="text-2xl font-bold">{teamStats.activeMembers}</p>
            </div>
            <UserIcon className="w-8 h-8 text-purple-200" />
          </div>
        </div>


      </div>

      {/* Referral Link */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">Your Referral Link</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-600/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <button
            onClick={copyReferralLink}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 text-sm whitespace-nowrap flex items-center gap-2"
          >
            {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
        <p className="text-slate-400 text-sm mt-3">
          Share this link to invite new members and earn referral commissions
        </p>
      </div>

      {/* Team Hierarchy */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 rounded-xl shadow-lg backdrop-blur-sm border border-slate-700/50 overflow-hidden">
        <div className="p-6 border-b border-slate-700/50">
          <h2 className="text-xl font-bold text-white">Team Hierarchy</h2>
          <p className="text-sm text-slate-400 mt-1">
            Expandable tree view of your entire network (up to 10 levels)
          </p>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {teamHierarchy.length === 0 ? (
            <div className="text-center p-8 text-slate-400">
              <UserGroupIcon className="w-12 h-12 mx-auto mb-4 text-slate-500" />
              <p className="text-lg font-medium mb-2">No team members yet</p>
              <p className="text-sm">Share your referral link to start building your network!</p>
            </div>
          ) : (
            <div>
              {teamHierarchy.map(member => renderTeamMember(member, 0))}
            </div>
          )}
        </div>
      </div>

      {/* Direct Referrals Table */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 rounded-xl shadow-lg backdrop-blur-sm border border-slate-700/50 overflow-hidden">
        <div className="p-6 border-b border-slate-700/50">
          <h2 className="text-xl font-bold text-white">Direct Referrals</h2>
          <p className="text-sm text-slate-400 mt-1">
            Users you directly referred to the platform
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="text-left p-4 text-sm font-semibold text-slate-300">Member</th>
                <th className="text-left p-4 text-sm font-semibold text-slate-300">User Code</th>
                <th className="text-left p-4 text-sm font-semibold text-slate-300">Rank</th>
                <th className="text-left p-4 text-sm font-semibold text-slate-300">Join Date</th>
                <th className="text-left p-4 text-sm font-semibold text-slate-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {directReferrals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-slate-400">
                    <UserGroupIcon className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                    <p>No direct referrals yet. Share your referral link to get started!</p>
                  </td>
                </tr>
              ) : (
                directReferrals.map((referral) => (
                  <tr key={referral.uid} className="border-t border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">
                            {referral.fullName || referral.displayName}
                          </p>
                          <p className="text-slate-400 text-xs">{referral.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-slate-300 text-sm font-mono">{referral.userCode}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-slate-300 text-sm">{referral.rank}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-slate-300 text-sm">
                        {referral.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                      </p>
                    </td>
                    <td className="p-4">
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
  );
};

export default ReferralsPage;
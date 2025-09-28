import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, Mail, Phone, Wallet, Users, Shield, Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserData {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  walletAddress: string;
  sponsorId?: string;
  status: string;
  createdAt: any;
}

const UserDetails: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!userId) {
      setError('User ID not provided');
      setLoading(false);
      return;
    }

    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'users', userId!));
      
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        setUserData(data);
      } else {
        setError('User not found');
      }
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      setError('Failed to load user data');
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your details...</p>
        </div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/signup')}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Back to Signup
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent mb-2">
            Welcome to Way2Globe Wave!
          </h1>
          <p className="text-gray-600 font-medium">
            Your account has been successfully created. Here are your details:
          </p>
        </div>

        {/* User Details Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-purple-500/10 p-8 border border-white/20 mb-8">
          {/* Status Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-full shadow-lg">
              <Shield className="w-5 h-5 mr-2" />
              Status: {userData.status.toUpperCase()}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Code */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700 uppercase tracking-wide">
                <User className="w-4 h-4 mr-2" />
                User Code
              </label>
              <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-200">
                <p className="text-lg font-mono font-semibold text-gray-900 break-all">{userData.userId}</p>
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700 uppercase tracking-wide">
                <User className="w-4 h-4 mr-2" />
                Full Name
              </label>
              <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-200">
                <p className="text-lg font-semibold text-gray-900">{userData.fullName}</p>
              </div>
            </div>

            {/* Email ID */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700 uppercase tracking-wide">
                <Mail className="w-4 h-4 mr-2" />
                Email ID
              </label>
              <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-200">
                <p className="text-lg font-semibold text-gray-900">{userData.email}</p>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700 uppercase tracking-wide">
                <Shield className="w-4 h-4 mr-2" />
                Password
              </label>
              <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-200 flex items-center justify-between">
                <p className="text-lg font-semibold text-gray-900">
                  {showPassword ? '••••••••' : '••••••••'}
                </p>
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-purple-600 hover:text-purple-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700 uppercase tracking-wide">
                <Phone className="w-4 h-4 mr-2" />
                Phone Number
              </label>
              <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-200">
                <p className="text-lg font-semibold text-gray-900">{userData.phone}</p>
              </div>
            </div>

            {/* Upline User ID */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700 uppercase tracking-wide">
                <Users className="w-4 h-4 mr-2" />
                Upline User ID
              </label>
              <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-200">
                <p className="text-lg font-semibold text-gray-900">{userData.sponsorId || 'N/A'}</p>
              </div>
            </div>

            {/* Wallet Address */}
            <div className="md:col-span-2 space-y-2">
              <label className="flex items-center text-sm font-semibold text-gray-700 uppercase tracking-wide">
                <Wallet className="w-4 h-4 mr-2" />
                Wallet Address
              </label>
              <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-200">
                <p className="text-lg font-mono font-semibold text-gray-900 break-all">{userData.walletAddress}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          <button
            onClick={handleGoToDashboard}
            className="flex items-center justify-center px-8 py-4 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white font-bold rounded-xl shadow-lg hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 transform hover:scale-105 transition-all duration-300"
          >
            Go to Dashboard
            <ArrowRight className="w-6 h-6 ml-2" />
          </button>
        </div>

        {/* Important Information */}
        <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-amber-800 mb-2">Important Information</h3>
              <ul className="text-amber-700 space-y-1 text-sm">
                <li>• Please save your User Code and wallet address for future reference</li>
                <li>• Your account status is currently "{userData.status}" - it will be activated after verification</li>
                <li>• You can access your dashboard to view more details and track your progress</li>
                <li>• Contact support if you need any assistance with your account</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetails;
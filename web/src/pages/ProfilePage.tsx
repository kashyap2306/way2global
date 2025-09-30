import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getMLMUser, type MLMUser } from '../services/firestoreService';
import { updateProfile, updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, storage, auth } from '../config/firebase';
import { Copy, Camera, Eye, EyeOff, User, Mail, Phone, Calendar, Award, Link, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProfileFormData {
  displayName: string;
  fullName: string;
  contact: string;
  phone: string;
  walletAddress: string;
  usdtAddress: string;
  profileImageUrl?: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ProfilePage: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [userData, setUserData] = useState<MLMUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    displayName: '',
    fullName: '',
    contact: '',
    phone: '',
    walletAddress: '',
    usdtAddress: '',
    profileImageUrl: ''
  });
  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    
    // Set up real-time listener for user data
    const userRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = { uid: doc.id, ...doc.data() } as MLMUser;
        setUserData(userData);
        setProfileForm({
          displayName: userData.displayName || '',
          fullName: userData.fullName || '',
          contact: userData.contact || '',
          phone: userData.phone || '',
          walletAddress: userData.walletAddress || '',
          usdtAddress: userData.usdtAddress || '',
          profileImageUrl: userData.profileImageUrl || ''
        });
      } else {
        console.error('User document does not exist');
        toast.error('User profile not found');
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load profile data');
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [currentUser]);

  const copyReferralLink = () => {
    if (userData?.userCode) {
      const referralLink = `${window.location.origin}/signup?referral=${userData.userCode}`;
      navigator.clipboard.writeText(referralLink);
      toast.success('Referral link copied to clipboard!');
    }
  };

  const validateBEP20Address = (address: string): boolean => {
    const bep20Regex = /^0x[a-fA-F0-9]{40}$/;
    return bep20Regex.test(address);
  };

  const handleProfileImageUpload = async (file: File) => {
    if (!currentUser) return;

    try {
      setUploading(true);
      const imageRef = ref(storage, `profilePictures/${currentUser.uid}/${file.name}`);
      await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(imageRef);
      
      setProfileForm(prev => ({ ...prev, profileImageUrl: downloadURL }));
      toast.success('Profile picture uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser || !userData) return;

    // Validation
    if (!profileForm.fullName.trim()) {
      toast.error('Full name is required');
      return;
    }

    if (!profileForm.phone.trim()) {
      toast.error('Contact number is required');
      return;
    }

    if (!profileForm.usdtAddress.trim()) {
      toast.error('USDT BEP20 address is required');
      return;
    }

    if (!validateBEP20Address(profileForm.usdtAddress)) {
      toast.error('Invalid USDT BEP20 address format');
      return;
    }

    try {
      setSaving(true);
      
      // Update Firebase Auth profile
      await updateProfile(currentUser, {
        displayName: profileForm.fullName,
        photoURL: profileForm.profileImageUrl
      });

      // Update Firestore document
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        fullName: profileForm.fullName,
        displayName: profileForm.fullName,
        phone: profileForm.phone,
        contact: profileForm.phone,
        usdtAddress: profileForm.usdtAddress,
        walletAddress: profileForm.usdtAddress,
        profileImageUrl: profileForm.profileImageUrl,
        updatedAt: new Date()
      });

      // Update local state
      setUserData(prev => prev ? {
        ...prev,
        fullName: profileForm.fullName,
        displayName: profileForm.fullName,
        phone: profileForm.phone,
        contact: profileForm.phone,
        usdtAddress: profileForm.usdtAddress,
        walletAddress: profileForm.usdtAddress,
        profileImageUrl: profileForm.profileImageUrl
      } : null);

      setIsEditModalOpen(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentUser) return;

    // Validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('All password fields are required');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    try {
      setSaving(true);
      await updatePassword(currentUser, passwordForm.newPassword);
      
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setIsPasswordModalOpen(false);
      toast.success('Password updated successfully!');
    } catch (error: any) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Please log out and log back in before changing your password');
      } else {
        toast.error('Failed to update password');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!currentUser?.email) return;

    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      toast.success('Password reset email sent!');
    } catch (error) {
      console.error('Error sending password reset email:', error);
      toast.error('Failed to send password reset email');
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out:', error);
      toast.error('Failed to logout');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 w-full">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">Profile Management</h1>
            <p className="text-sm sm:text-base lg:text-lg text-slate-300">Manage your account information and settings</p>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 text-sm sm:text-base ml-auto"
            >
              Logout
            </button>
          </div>
      
      {/* Profile Card */}
      <div className="rounded-2xl shadow-md p-6 space-y-6 bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 backdrop-blur-sm border border-slate-700/50">
        {/* Profile Header */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* Profile Image */}
          <div className="flex flex-col items-center lg:items-start space-y-4">
            {userData?.profileImageUrl ? (
              <img
                src={userData.profileImageUrl}
                alt="Profile"
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover shadow-lg border-2 border-blue-500"
              />
            ) : (
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-lg">
                {userData?.displayName ? userData.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 text-sm sm:text-base font-medium"
            >
              Edit Profile
            </button>
          </div>

          {/* Profile Info */}
          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-xl font-semibold text-white">{userData?.displayName || 'User Name'}</h2>
            <p className="text-slate-300">{userData?.email}</p>
            <p className="text-sm text-green-400 font-medium">
              {userData?.status === 'Active' ? 'Active Member' : 'Inactive Member'}
            </p>
          </div>
        </div>

        {/* Two-column grid on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 uppercase tracking-wide flex items-center gap-2">
                <User size={16} />
                Full Name
              </label>
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
                <p className="text-white font-semibold text-sm sm:text-base">{userData?.displayName || 'Not provided'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 uppercase tracking-wide flex items-center gap-2">
                <User size={16} />
                User Code
              </label>
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
                <p className="text-white font-semibold text-sm sm:text-base font-mono">{userData?.userCode || 'N/A'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 uppercase tracking-wide flex items-center gap-2">
                <Phone size={16} />
                Phone Number
              </label>
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
                <p className="text-white font-semibold text-sm sm:text-base">{userData?.phone || userData?.contact || 'Not provided'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 uppercase tracking-wide flex items-center gap-2">
                <Mail size={16} />
                Email (Locked)
              </label>
              <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/30 opacity-75">
                <p className="text-slate-300 font-semibold text-sm sm:text-base">{userData?.email}</p>
              </div>
            </div>





            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 uppercase tracking-wide flex items-center gap-2">
                <Award size={16} />
                Current Rank
              </label>
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
                <p className="text-white font-semibold text-sm sm:text-base capitalize">{userData?.currentRank || userData?.rank || 'Not Ranked Yet'}</p>
              </div>
            </div>
          </div>

          {/* Right Column - Financial & Referral */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Financial & Referral</h3>
            
            

            

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 uppercase tracking-wide flex items-center gap-2">
                <Wallet size={16} />
                USDT BEP20 Address
              </label>
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
                <p className="text-white font-semibold text-sm sm:text-base font-mono break-all">
                  {userData?.walletAddress || 'Not Available'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 uppercase tracking-wide flex items-center gap-2">
                <Link size={16} />
                Referral Link
              </label>
              <div className="flex flex-col gap-2">
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
                  <p className="text-white font-semibold text-sm sm:text-base break-all">
                    {userData?.userCode ? `${window.location.origin}/signup?referral=${userData.userCode}` : 'N/A'}
                  </p>
                </div>
                <button
                  onClick={copyReferralLink}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-3 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <Copy size={16} />
                  Copy Referral Link
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 uppercase tracking-wide flex items-center gap-2">
                <Calendar size={16} />
                Registration Date
              </label>
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
                <p className="text-white font-semibold text-sm sm:text-base">{formatDate(userData?.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Security */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-purple-900 rounded-2xl shadow-md p-4 sm:p-6 backdrop-blur-sm border border-slate-700/50 w-full max-w-full">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Account Security</h3>
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => setIsPasswordModalOpen(true)}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 font-medium text-sm sm:text-base"
          >
            Change Password
          </button>
          <button 
            onClick={handleForgotPassword}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 font-medium text-sm sm:text-base"
          >
            Send Password Reset Email
          </button>
        </div>
      </div>
    </div>
  </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Edit Profile</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Profile Picture Upload */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  {profileForm.profileImageUrl ? (
                    <img
                      src={profileForm.profileImageUrl}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover shadow-lg border-2 border-blue-500"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {profileForm.displayName ? profileForm.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer transition-colors">
                    <Camera size={16} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProfileImageUpload(file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                {uploading && (
                  <p className="text-blue-400 text-sm">Uploading image...</p>
                )}
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                    Contact Number *
                  </label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                    placeholder="Enter your contact number"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                    USDT BEP20 Address *
                  </label>
                  <input
                    type="text"
                    value={profileForm.usdtAddress}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, usdtAddress: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 font-mono"
                    placeholder="0x..."
                  />
                  <p className="text-xs text-slate-400">
                    Must be a valid BEP20 address (starts with 0x followed by 40 characters)
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 font-medium disabled:transform-none disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={saving}
                  className="w-full flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-3 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 font-medium text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-purple-900 rounded-xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Change Password</h2>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full px-4 py-3 pr-12 bg-slate-800/50 border border-slate-600/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPasswords.current ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-4 py-3 pr-12 bg-slate-800/50 border border-slate-600/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPasswords.new ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-4 py-3 pr-12 bg-slate-800/50 border border-slate-600/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPasswords.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="w-full flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 font-medium disabled:transform-none disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={saving}
                  className="w-full flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-3 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 font-medium text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
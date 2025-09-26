import React from 'react';
import { User } from 'lucide-react';

const ProfilePage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <User className="h-6 w-6 text-indigo-600 mr-3" />
        <h1 className="text-2xl font-bold text-gray-900">Profile Management</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Manage Your Profile</h2>
        <p className="text-gray-600 mb-4">
          Update your personal information, security settings, and account preferences.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Personal Information</h3>
            <p className="text-sm text-gray-600">Update your name, email, and contact details.</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Security Settings</h3>
            <p className="text-sm text-gray-600">Manage password and two-factor authentication.</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Account Preferences</h3>
            <p className="text-sm text-gray-600">Configure notifications and display settings.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
import React from 'react';
import { Users } from 'lucide-react';

const ReferralsPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Users className="h-6 w-6 text-indigo-600 mr-3" />
        <h1 className="text-2xl font-bold text-gray-900">Referrals & Team</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Manage Your Network</h2>
        <p className="text-gray-600 mb-4">
          Track your referrals, manage your team, and monitor your network growth.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Total Referrals</h3>
            <p className="text-sm text-gray-600">View the total number of people you've referred.</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Referral Earnings</h3>
            <p className="text-sm text-gray-600">Track earnings from your referral network.</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Team Structure</h3>
            <p className="text-sm text-gray-600">Visualize your team hierarchy and growth.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralsPage;
import React from 'react';
import { CreditCard } from 'lucide-react';

const TopupPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <CreditCard className="h-6 w-6 text-indigo-600 mr-3" />
        <h1 className="text-2xl font-bold text-gray-900">Topup</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Funds to Your Account</h2>
        <p className="text-gray-600 mb-4">
          Easily add funds to your account using various payment methods.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Current Balance</h3>
            <p className="text-sm text-gray-600">View your current account balance and available funds.</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Quick Topup</h3>
            <p className="text-sm text-gray-600">Choose from predefined amounts for quick topup.</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Payment Methods</h3>
            <p className="text-sm text-gray-600">Select from available payment options.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopupPage;
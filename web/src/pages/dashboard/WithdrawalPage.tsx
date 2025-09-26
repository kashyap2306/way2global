import React from 'react';
import { ArrowDownToLine } from 'lucide-react';

const WithdrawalPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <ArrowDownToLine className="h-6 w-6 text-indigo-600 mr-3" />
        <h1 className="text-2xl font-bold text-gray-900">Withdrawal</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Withdraw Your Funds</h2>
        <p className="text-gray-600 mb-4">
          Request withdrawals from your account balance to your preferred payment method.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Available for Withdrawal</h3>
            <p className="text-sm text-gray-600">View the amount available for withdrawal.</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Withdrawal History</h3>
            <p className="text-sm text-gray-600">Track your previous withdrawal requests and status.</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Payment Methods</h3>
            <p className="text-sm text-gray-600">Manage your withdrawal payment methods.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WithdrawalPage;
import React from 'react';
import { Globe } from 'lucide-react';

const GlobalIncomePage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Globe className="h-6 w-6 text-indigo-600 mr-3" />
        <h1 className="text-2xl font-bold text-gray-900">Global Income / Re-Global Income</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Global Network Earnings</h2>
        <p className="text-gray-600 mb-4">
          Track your global income and re-global income from worldwide network activities.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Total Global Income</h3>
            <p className="text-sm text-gray-600">View your cumulative global earnings.</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Monthly Earnings</h3>
            <p className="text-sm text-gray-600">Track monthly global income performance.</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Re-Global Bonuses</h3>
            <p className="text-sm text-gray-600">Monitor additional re-global income bonuses.</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Global Network Stats</h3>
            <p className="text-sm text-gray-600">View worldwide network statistics and growth.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalIncomePage;
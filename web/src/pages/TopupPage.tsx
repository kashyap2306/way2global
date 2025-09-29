import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { CurrencyDollarIcon, ClipboardDocumentIcon, CheckIcon, ClockIcon, XMarkIcon, ArrowLeftIcon, ArrowRightIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface TopupRequest {
  id: string;
  userId: string;
  amount: number;
  txHash: string;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: any;
}

const TopupPage: React.FC = () => {
  const { currentUser, userData } = useAuth();
  
  // Step management
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState(0);
  const [txHash, setTxHash] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [requests, setRequests] = useState<TopupRequest[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // ID Activation states
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activationLoading, setActivationLoading] = useState(false);
  const [canActivate, setCanActivate] = useState(false);
  const [activationData, setActivationData] = useState<{
    canActivate: boolean;
    currentBalance: number;
    requiredAmount: number;
  } | null>(null);

  const paymentAddress = '0x4a30fD7C40Ee41bB991bf316Ec082271D6B214c9';
  const predefinedAmounts = [10, 50, 100, 500, 1000];

  useEffect(() => {
    if (currentUser) {
      setupRealTimeListener();
      checkActivationEligibility();
    }
  }, [currentUser, userData?.balance]);

  const checkActivationEligibility = async () => {
    if (!currentUser || userData?.isActive) return;
    
    try {
      // Old activation eligibility check removed - using new direct activation system
      setActivationData(null);
      setCanActivate(false);
    } catch (error) {
      console.error('Error checking activation eligibility:', error);
    }
  };

  const setupRealTimeListener = () => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'topups'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsData: TopupRequest[] = [];
      snapshot.forEach((doc) => {
        requestsData.push({
          id: doc.id,
          ...doc.data()
        } as TopupRequest);
      });
      setRequests(requestsData);
    });

    return unsubscribe;
  };

  // Step 1: Amount validation and submission
  const handleAmountSubmit = () => {
    if (amount <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }
    setStep(2);
  };

  // Step 2: Move to transaction hash step
  const handleNextStep = () => {
    setStep(3);
  };

  // Step 3: Submit topup request
  const handleFinalSubmit = async () => {
    if (!currentUser) return;
    
    if (!txHash.trim()) {
      alert('Please enter the transaction hash');
      return;
    }
    
    if (txHash.length < 10) {
      alert('Please enter a valid transaction hash');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'topups'), {
        userId: currentUser.uid,
        amount,
        txHash: txHash.trim(),
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Reset form and show success
      setAmount(0);
      setTxHash('');
      setStep(1);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error submitting topup request:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateId = async () => {
    if (!currentUser || !activationData) return;
    
    setActivationLoading(true);
    try {
      // Old activation function removed - using new direct activation system
      setShowActivationModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Refresh activation eligibility
      await checkActivationEligibility();
    } catch (error) {
      console.error('Error activating ID:', error);
      alert('Failed to activate ID. Please try again.');
    } finally {
      setActivationLoading(false);
    }
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(paymentAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} USDT`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            <ClockIcon className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
            <CheckIcon className="w-3 h-3 mr-1" />
            Confirmed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
            <XMarkIcon className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6 sm:mb-8">
      <div className="flex items-center space-x-4">
        {[1, 2, 3].map((stepNumber) => (
          <React.Fragment key={stepNumber}>
            <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all duration-300 ${
              step >= stepNumber 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'border-slate-600 text-slate-400'
            }`}>
              <span className="text-sm sm:text-base font-semibold">{stepNumber}</span>
            </div>
            {stepNumber < 3 && (
              <div className={`w-8 sm:w-12 h-0.5 transition-all duration-300 ${
                step > stepNumber ? 'bg-blue-600' : 'bg-slate-600'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-slate-700/50">
      <h3 className="text-xl font-semibold text-white mb-6 text-center">Step 1: Enter Amount</h3>
      
      {/* Quick Select Buttons */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 uppercase tracking-wide mb-3">Quick Select (USDT)</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {predefinedAmounts.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setAmount(amt)}
              className={`px-3 py-3 sm:px-4 sm:py-3 rounded-lg border transition-all duration-300 transform hover:scale-105 text-sm font-medium ${
                amount === amt
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-500 shadow-lg'
                  : 'bg-slate-800/50 text-slate-300 border-slate-600/30 hover:bg-slate-700/50 hover:border-slate-500/50'
              }`}
            >
              {amt} USDT
            </button>
          ))}
        </div>
      </div>

      {/* Custom Amount Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 uppercase tracking-wide mb-3">Enter Amount (USDT)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount || ''}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          placeholder="Enter amount in USDT"
          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleAmountSubmit}
        disabled={amount <= 0}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:shadow-none flex items-center justify-center gap-2"
      >
        Continue to Payment Address
        <ArrowRightIcon className="w-4 h-4" />
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-purple-900 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-slate-700/50">
      <h3 className="text-xl font-semibold text-white mb-6 text-center">Step 2: Send USDT Payment</h3>
      
      {/* Amount Display */}
      <div className="bg-blue-600/20 rounded-lg p-4 mb-6 border border-blue-500/30">
        <div className="text-center">
          <p className="text-slate-300 text-sm mb-1">Amount to Send</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(amount)}</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-6">
        <p className="text-slate-300 text-center mb-4">
          Send your USDT to this address via BEP-20 network
        </p>
      </div>

      {/* USDT Address */}
      <div className="bg-slate-800/50 rounded-lg p-4 mb-6 border border-slate-600/30">
        <label className="block text-sm font-medium text-slate-300 uppercase tracking-wide mb-3">USDT BEP-20 Address</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={paymentAddress}
            readOnly
            className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-3 text-white text-sm focus:outline-none break-all font-mono"
          />
          <button
            onClick={copyAddress}
            className="px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 sm:w-auto w-full"
          >
            {copied ? <CheckIcon className="w-4 h-4" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => setStep(1)}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Amount
        </button>
        <button
          onClick={handleNextStep}
          className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center gap-2"
        >
          I've Sent the Payment
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-green-900 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-slate-700/50">
      <h3 className="text-xl font-semibold text-white mb-6 text-center">Step 3: Enter Transaction Hash</h3>
      
      {/* Amount Display */}
      <div className="bg-green-600/20 rounded-lg p-4 mb-6 border border-green-500/30">
        <div className="text-center">
          <p className="text-slate-300 text-sm mb-1">Payment Amount</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(amount)}</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-6">
        <p className="text-slate-300 text-sm text-center mb-4">
          Paste your transaction hash here. You can find it in your wallet after sending the payment.
        </p>
      </div>

      {/* Transaction Hash Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 uppercase tracking-wide mb-3">Transaction Hash</label>
        <input
          type="text"
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          placeholder="Paste your transaction hash here"
          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 font-mono text-sm"
        />
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => setStep(2)}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Address
        </button>
        <button
          onClick={handleFinalSubmit}
          disabled={loading || !txHash.trim() || txHash.length < 10}
          className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:shadow-none flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Submitting...
            </>
          ) : (
            <>
              Submit Topup Request
              <CheckIcon className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 px-2 sm:px-4 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-4">
            USDT Top-up
          </h1>
          <p className="text-sm sm:text-lg text-slate-300">
            Add USDT to your wallet via BEP-20 network
          </p>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-4 mb-6 flex items-center gap-3">
            <CheckIcon className="w-6 h-6 text-white flex-shrink-0" />
            <div className="text-white">
              <p className="font-semibold">Topup request submitted, pending approval</p>
              <p className="text-sm text-green-100">Your request is being processed by our team.</p>
            </div>
          </div>
        )}

        {/* Current Balance */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-xl shadow-lg p-4 sm:p-6 text-white backdrop-blur-sm border border-blue-500/20 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-2">
            <CurrencyDollarIcon className="w-6 h-6 text-blue-200" />
            <h3 className="text-lg font-semibold">Current Balance</h3>
          </div>
          <p className="text-2xl sm:text-3xl font-bold">
            {userData?.availableBalance ? formatCurrency(userData.availableBalance) : '0.00 USDT'}
          </p>
          <p className="text-blue-100 text-sm mt-2">Available for transactions</p>
        </div>

        {/* ID Activation Section */}
        {!userData?.isActive && (
          <div className="bg-gradient-to-br from-green-600 via-green-700 to-emerald-700 rounded-xl shadow-lg p-4 sm:p-6 text-white backdrop-blur-sm border border-green-500/20 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <SparklesIcon className="w-6 h-6 text-green-200" />
              <h3 className="text-lg font-semibold">ID Activation</h3>
            </div>
            <p className="text-green-100 text-sm mb-4">
              Activate your ID to start earning from the global income pool. Minimum balance required: $5.00 USDT
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-200">Status: <span className="font-semibold text-yellow-300">Pending</span></p>
                {activationData && (
                  <p className="text-xs text-green-200 mt-1">
                    Balance: ${activationData.currentBalance.toFixed(2)} / Required: ${activationData.requiredAmount.toFixed(2)}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowActivationModal(true)}
                disabled={!canActivate}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-300 ${
                  canActivate
                    ? 'bg-white text-green-700 hover:bg-green-50 shadow-md hover:shadow-lg transform hover:scale-105'
                    : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                }`}
              >
                {canActivate ? 'Activate ID' : 'Insufficient Balance'}
              </button>
            </div>
          </div>
        )}

        {/* Active Status */}
        {userData?.isActive && (
          <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-green-700 rounded-xl shadow-lg p-4 sm:p-6 text-white backdrop-blur-sm border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <CheckIcon className="w-6 h-6 text-emerald-200" />
              <div>
                <h3 className="text-lg font-semibold">ID Status: Active</h3>
                <p className="text-emerald-100 text-sm">Your ID is activated and earning from the global pool</p>
              </div>
            </div>
          </div>
        )}

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        <div className="transition-all duration-500 ease-in-out">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>

        {/* Previous Topup Requests */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-900 rounded-xl shadow-lg p-4 sm:p-6 backdrop-blur-sm border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Previous Topup Requests</h3>
          
          {/* Desktop Layout */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-600/30">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-300 uppercase tracking-wide">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-300 uppercase tracking-wide">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-300 uppercase tracking-wide">TX Hash</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-300 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No topup requests found
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="text-sm text-white">
                          {formatDate(request.createdAt)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-white">
                          {formatCurrency(request.amount)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs text-slate-300 font-mono break-all max-w-xs">
                          {request.txHash.substring(0, 20)}...
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(request.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Layout - Stacked Cards */}
          <div className="sm:hidden space-y-4">
            {requests.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                No topup requests found
              </div>
            ) : (
              requests.map((request) => (
                <div key={request.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-medium text-white">
                      {formatCurrency(request.amount)}
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="text-xs text-slate-300 mb-2">
                    {formatDate(request.createdAt)}
                  </div>
                  <div className="text-xs text-slate-400 font-mono break-all">
                    TX: {request.txHash.substring(0, 30)}...
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ID Activation Confirmation Modal */}
      {showActivationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-green-900 rounded-xl shadow-2xl p-6 max-w-md w-full border border-slate-700/50">
            <div className="text-center mb-6">
              <SparklesIcon className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Activate Your ID</h3>
              <p className="text-slate-300 text-sm">
                Are you sure you want to activate your ID for ${activationData?.requiredAmount.toFixed(2)} USDT?
              </p>
            </div>
            
            <div className="bg-green-600/20 rounded-lg p-4 mb-6 border border-green-500/30">
              <div className="text-center">
                <p className="text-slate-300 text-sm mb-1">Activation Cost</p>
                <p className="text-2xl font-bold text-white">${activationData?.requiredAmount.toFixed(2)} USDT</p>
                <p className="text-green-300 text-xs mt-1">
                  Current Balance: ${activationData?.currentBalance.toFixed(2)} USDT
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-400 mb-6 space-y-1">
              <p>• Your ID will be activated immediately</p>
              <p>• You'll enter the Azurite level global pool</p>
              <p>• Income distribution starts after 2 users join</p>
              <p>• This action cannot be undone</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowActivationModal(false)}
                disabled={activationLoading}
                className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white py-3 rounded-lg font-medium transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleActivateId}
                disabled={activationLoading}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2"
              >
                {activationLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Activating...
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    Confirm Activation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopupPage;
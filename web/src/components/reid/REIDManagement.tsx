import React, { useState, useEffect } from 'react';
import { 
  SparklesIcon, 
  CurrencyDollarIcon, 
  ChartBarIcon,
  PlayIcon,
  ClockIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { getUserREIDs, activateREID } from '../../services/firestoreService';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface Reid {
  id: string;
  originalUID: string;
  reidNumber: number;
  rank: string;
  sponsorREID?: string;
  isActive: boolean;
  activationAmount: number;
  totalEarnings: number;
  directReferrals: string[];
  createdAt: any;
  activatedAt?: any;
  cycleCompletions: number;
  metadata?: {
    parentCycleId?: string;
    [key: string]: any;
  };
}

interface REIDManagementProps {
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

const REIDManagement: React.FC<REIDManagementProps> = ({ onError, onSuccess }) => {
  const { currentUser } = useAuth();
  const [reids, setReids] = useState<Reid[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingREID, setActivatingREID] = useState<string | null>(null);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [selectedREID, setSelectedREID] = useState<Reid | null>(null);
  const [activationAmount, setActivationAmount] = useState('');
  const [sponsorREID, setSponsorREID] = useState('');

  useEffect(() => {
    if (currentUser) {
      fetchUserREIDs();
    }
  }, [currentUser]);

  const fetchUserREIDs = async () => {
    try {
      setLoading(true);
      const userREIDs = await getUserREIDs(currentUser!.uid);
      setReids(userREIDs);
    } catch (error) {
      console.error('Error fetching REIDs:', error);
      onError('Failed to load REIDs');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateREID = async () => {
    if (!selectedREID || !activationAmount) return;

    try {
      setActivatingREID(selectedREID.id);
      await activateREID(
        selectedREID.id,
        parseFloat(activationAmount),
        sponsorREID || undefined
      );
      
      onSuccess(`REID ${selectedREID.reidNumber} activated successfully with ${formatCurrency(parseFloat(activationAmount))}`);
      setShowActivationModal(false);
      setSelectedREID(null);
      setActivationAmount('');
      setSponsorREID('');
      await fetchUserREIDs(); // Refresh the list
    } catch (error) {
      console.error('Error activating REID:', error);
      onError('Failed to activate REID');
    } finally {
      setActivatingREID(null);
    }
  };

  const openActivationModal = (reid: Reid) => {
    setSelectedREID(reid);
    setShowActivationModal(true);
  };

  const closeActivationModal = () => {
    setShowActivationModal(false);
    setSelectedREID(null);
    setActivationAmount('');
    setSponsorREID('');
  };

  const getRankColor = (rank: string) => {
    const colors: { [key: string]: string } = {
      'azurite': 'text-blue-400',
      'pearl': 'text-gray-300',
      'coral': 'text-orange-400',
      'amber': 'text-yellow-400',
      'jade': 'text-green-400',
      'sapphire': 'text-blue-500',
      'ruby': 'text-red-400',
      'emerald': 'text-emerald-400',
      'diamond': 'text-purple-400',
      'crown': 'text-yellow-500'
    };
    return colors[rank.toLowerCase()] || 'text-gray-400';
  };

  const totalActiveREIDs = reids.filter(reid => reid.isActive).length;
  const totalREIDEarnings = reids.reduce((sum, reid) => sum + reid.totalEarnings, 0);
  const totalCycleCompletions = reids.reduce((sum, reid) => sum + reid.cycleCompletions, 0);

  if (loading) {
    return (
      <div className="space-y-6 fade-in">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">REID Management</h2>
        </div>
        <div className="glass-card p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            <span className="ml-3 text-muted">Loading REIDs...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">REID Management</h2>
        <div className="flex items-center space-x-2 text-sm text-muted">
          <InformationCircleIcon className="h-4 w-4" />
          <span>RE-IDs enable infinite earning cycles</span>
        </div>
      </div>

      {/* REID Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-accent/20">
              <SparklesIcon className="h-6 w-6 text-accent" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-muted">Active REIDs</p>
              <p className="text-2xl font-bold text-white">{totalActiveREIDs}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-500/20">
              <CurrencyDollarIcon className="h-6 w-6 text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-muted">Total REID Earnings</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalREIDEarnings)}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-500/20">
              <ChartBarIcon className="h-6 w-6 text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-muted">Cycle Completions</p>
              <p className="text-2xl font-bold text-white">{totalCycleCompletions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* REIDs List */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Your REIDs</h3>
        
        {reids.length === 0 ? (
          <div className="text-center py-12">
            <SparklesIcon className="h-16 w-16 text-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No REIDs Yet</h3>
            <p className="text-muted mb-6">
              REIDs are automatically generated when you complete global cycles. 
              Complete your first global cycle to earn your first REID!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reids.map((reid) => (
              <div key={reid.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <SparklesIcon className="h-5 w-5 text-accent" />
                      <span className="font-semibold text-white">REID #{reid.reidNumber}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`font-medium ${getRankColor(reid.rank)}`}>
                        {reid.rank.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {reid.isActive ? (
                        <div className="flex items-center space-x-1">
                          <CheckCircleIcon className="h-4 w-4 text-green-400" />
                          <span className="text-sm text-green-400">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="h-4 w-4 text-yellow-400" />
                          <span className="text-sm text-yellow-400">Inactive</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-muted">Earnings</p>
                      <p className="font-semibold text-white">{formatCurrency(reid.totalEarnings)}</p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm text-muted">Cycles</p>
                      <p className="font-semibold text-white">{reid.cycleCompletions}</p>
                    </div>

                    {!reid.isActive && (
                      <button
                        onClick={() => openActivationModal(reid)}
                        className="btn-primary text-sm px-3 py-1"
                        disabled={activatingREID === reid.id}
                      >
                        {activatingREID === reid.id ? (
                          <div className="flex items-center space-x-1">
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                            <span>Activating...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <PlayIcon className="h-3 w-3" />
                            <span>Activate</span>
                          </div>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm text-muted">
                  <div>
                    Created: {formatDate(reid.createdAt)}
                  </div>
                  {reid.activatedAt && (
                    <div>
                      Activated: {formatDate(reid.activatedAt)}
                    </div>
                  )}
                  <div>
                    Referrals: {reid.directReferrals.length}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activation Modal */}
      {showActivationModal && selectedREID && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">
              Activate REID #{selectedREID.reidNumber}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-2">
                  Activation Amount (USDT)
                </label>
                <input
                  type="number"
                  value={activationAmount}
                  onChange={(e) => setActivationAmount(e.target.value)}
                  className="input-field w-full"
                  placeholder="Enter activation amount"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted mb-2">
                  Sponsor REID (Optional)
                </label>
                <input
                  type="text"
                  value={sponsorREID}
                  onChange={(e) => setSponsorREID(e.target.value)}
                  className="input-field w-full"
                  placeholder="Enter sponsor REID ID"
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-sm text-blue-400">
                  <InformationCircleIcon className="h-4 w-4 inline mr-1" />
                  Activating this REID will enable it to participate in global cycles and earn income.
                </p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={closeActivationModal}
                className="btn-secondary flex-1"
                disabled={activatingREID === selectedREID.id}
              >
                Cancel
              </button>
              <button
                onClick={handleActivateREID}
                className="btn-primary flex-1"
                disabled={!activationAmount || activatingREID === selectedREID.id}
              >
                {activatingREID === selectedREID.id ? 'Activating...' : 'Activate REID'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default REIDManagement;
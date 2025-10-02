import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from './index'; // Assuming you have an AdminLayout component

interface FundRequest {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string;
  requestedByEmail?: string; // To display user email
  createdAt: Timestamp;
}

const FundRequestsManagement: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [fundRequests, setFundRequests] = useState<FundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const functions = getFunctions();
  const callableApproveFundRequest = httpsCallable(functions, 'approveFundRequest');
  const callableRejectFundRequest = httpsCallable(functions, 'rejectFundRequest');

  useEffect(() => {
    if (!currentUser || !userData?.isAdmin) {
      setError('You do not have administrative privileges to view this page.');
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'fundingWalletRequests'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const requests: FundRequest[] = [];
      for (const document of snapshot.docs) {
        const data = document.data();
        let requestedByEmail = 'N/A';

        // Fetch user email for display
        if (data.requestedBy) {
          const userDocRef = doc(db, 'users', data.requestedBy);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            requestedByEmail = userDoc.data().email || 'N/A';
          }
        }

        requests.push({
          id: document.id,
          amount: data.amount || 0,
          currency: data.currency || 'USDT',
          status: data.status || 'pending',
          requestedBy: data.requestedBy || '',
          requestedByEmail: requestedByEmail,
          createdAt: data.createdAt,
        });
      }
      setFundRequests(requests);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching fund requests:', err);
      setError('Failed to load fund requests.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, userData]);

  const handleApprove = async (request: FundRequest) => {
    if (!confirm(`Are you sure you want to approve this fund request for ${request.amount} ${request.currency} from ${request.requestedByEmail}?`)) {
      return;
    }
    try {
      // Call the Cloud Function to approve the request
      const result = await callableApproveFundRequest({ requestId: request.id, userId: request.requestedBy });
      const data = (result.data as any);
      if (data.success) {
        alert('Fund request approved successfully!');
      } else {
        alert(`Failed to approve fund request: ${data.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('Error approving fund request:', err);
      alert(`Error approving fund request: ${err.message}`);
    }
  };

  const handleReject = async (request: FundRequest) => {
    const reason = prompt(`Please provide a reason for rejecting this fund request for ${request.amount} ${request.currency} from ${request.requestedByEmail}:`);
    if (!reason || reason.trim() === '') {
      alert('Rejection reason is required.');
      return;
    }
    if (!confirm(`Are you sure you want to reject this fund request for ${request.amount} ${request.currency} from ${request.requestedByEmail}?`)) {
      return;
    }
    try {
      // Call the Cloud Function to reject the request
      const result = await callableRejectFundRequest({ requestId: request.id, userId: request.requestedBy, reason });
      const data = (result.data as any);
      if (data.success) {
        alert('Fund request rejected successfully!');
      } else {
        alert(`Failed to reject fund request: ${data.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('Error rejecting fund request:', err);
      alert(`Error rejecting fund request: ${err.message}`);
    }
  };

  const formatDate = (timestamp: Timestamp): string => {
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <AdminLayout><div className="text-white">Loading fund requests...</div></AdminLayout>;
  }

  if (error) {
    return <AdminLayout><div className="text-red-500">{error}</div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 bg-gray-900 text-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-400">Fund Requests Management</h1>

        {fundRequests.length === 0 ? (
          <p className="text-center text-gray-400">No fund requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden">
              <thead className="bg-gray-700">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-300">ID</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-300">User Email</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-300">Amount</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-300">Currency</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-300">Status</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-300">Requested At</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fundRequests.map((request) => (
                  <tr key={request.id} className="border-b border-gray-700 hover:bg-gray-700 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-300">{request.id}</td>
                    <td className="py-3 px-4 text-sm text-gray-300">{request.requestedByEmail}</td>
                    <td className="py-3 px-4 text-sm text-gray-300">{request.amount.toFixed(2)}</td>
                    <td className="py-3 px-4 text-sm text-gray-300">{request.currency}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        request.status === 'approved' ? 'bg-green-500 text-white' :
                        request.status === 'rejected' ? 'bg-red-500 text-white' :
                        'bg-yellow-500 text-white'
                      }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-300">{formatDate(request.createdAt)}</td>
                    <td className="py-3 px-4 text-sm">
                      {request.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApprove(request)}
                            className="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded-md text-xs font-medium transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(request)}
                            className="bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded-md text-xs font-medium transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default FundRequestsManagement;
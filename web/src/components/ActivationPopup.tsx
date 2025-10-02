import React from 'react';
import Modal from './ui/Modal';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react'; // Import a relevant icon

interface ActivationPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const ActivationPopup: React.FC<ActivationPopupProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const handleActivateClick = () => {
    onClose();
    navigate('/topup'); // Navigate to the topup section
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Account Activation Required"
      type="warning"
    >
      <div className="flex flex-col items-center justify-center mb-6">
        <ShieldAlert className="w-16 h-16 text-yellow-500 mb-4" />
        <p className="text-center text-gray-700 text-lg font-semibold mb-2">
          Your account is currently inactive.
        </p>
        <p className="text-center text-gray-600 mb-4">
          Please activate your account to unlock all features and start earning.
        </p>
      </div>
      <button
        onClick={handleActivateClick}
        className="w-full bg-yellow-500 text-white py-3 px-4 rounded-lg hover:bg-yellow-600 transition-colors duration-200 font-bold text-lg shadow-md"
      >
        Activate Account Now
      </button>
    </Modal>
  );
};

export default ActivationPopup;
import { useState } from 'react';

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export const useModal = () => {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showModal = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setModalState({
      isOpen: true,
      title,
      message,
      type
    });
  };

  const showSuccess = (title: string, message: string) => {
    showModal(title, message, 'success');
  };

  const showError = (title: string, message: string) => {
    showModal(title, message, 'error');
  };

  const showWarning = (title: string, message: string) => {
    showModal(title, message, 'warning');
  };

  const showInfo = (title: string, message: string) => {
    showModal(title, message, 'info');
  };

  const hideModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  return {
    modalState,
    showModal,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideModal
  };
};
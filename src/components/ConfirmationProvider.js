// src/components/ConfirmationProvider.js
import React, { createContext, useState, useContext } from 'react';
import ConfirmationModal from './ConfirmationModal';

// Skapa en context för konfirmationer
const ConfirmationContext = createContext();

// Custom hook för att använda konfirmationskontext
export const useConfirmation = () => useContext(ConfirmationContext);

// Provider-komponent
export const ConfirmationProvider = ({ children }) => {
  const [confirmationState, setConfirmationState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Ja, ta bort',
    cancelText: 'Avbryt',
    confirmButtonClass: 'danger',
    onConfirm: () => {},
    onCancel: () => {}
  });

  // Funktion för att visa bekräftelsedialogrutan
  const showConfirmation = ({
    title, 
    message, 
    confirmText = 'Ja, ta bort', 
    cancelText = 'Avbryt',
    confirmButtonClass = 'danger',
    onConfirm,
    onCancel = () => hideConfirmation()
  }) => {
    setConfirmationState({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      confirmButtonClass,
      onConfirm: () => {
        onConfirm();
        hideConfirmation();
      },
      onCancel: () => {
        if (onCancel) onCancel();
        hideConfirmation();
      }
    });
  };

  // Funktion för att dölja bekräftelsedialogrutan
  const hideConfirmation = () => {
    setConfirmationState(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  // Skapa ett funktionsobjekt som tillhandahåller confirm-metoden
  const confirmation = {
    confirm: showConfirmation
  };

  return (
    <ConfirmationContext.Provider value={confirmation}>
      {children}
      <ConfirmationModal
        isOpen={confirmationState.isOpen}
        title={confirmationState.title}
        message={confirmationState.message}
        confirmText={confirmationState.confirmText}
        cancelText={confirmationState.cancelText}
        confirmButtonClass={confirmationState.confirmButtonClass}
        onConfirm={confirmationState.onConfirm}
        onCancel={confirmationState.onCancel}
      />
    </ConfirmationContext.Provider>
  );
};

export default ConfirmationProvider;
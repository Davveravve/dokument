// src/components/ConfirmationModal.js
import React from 'react';

const ConfirmationModal = ({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'Ja, ta bort', 
  cancelText = 'Avbryt', 
  confirmButtonClass = 'danger', 
  onConfirm, 
  onCancel 
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button 
            onClick={onCancel}
            className="button secondary"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className={`button ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
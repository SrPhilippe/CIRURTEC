import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const DeleteConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  expectedValue, 
  title = "Excluir Conta", 
  description,
  instructionLabel,
  inputPlaceholder = "Digite aqui",
  confirmButtonText = "Confirmar Exclusão",
  cancelButtonText = "Cancelar"
}) => {
  const [inputValue, setInputValue] = useState('');

  // Reset input when modal opens
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'white', padding: '2rem', borderRadius: '12px',
        width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
          <h2 style={{color: '#991b1b', margin: 0}}>{title}</h2>
          <button onClick={onClose} style={{border: 'none', background: 'transparent', cursor: 'pointer'}}>
            <X size={24} />
          </button>
        </div>
        
        <div style={{marginBottom: '1rem', color: '#334155'}}>
          {description}
        </div>

        <div style={{marginBottom: '1.5rem'}}>
          <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#64748b'}}>
            {instructionLabel}
          </label>
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={inputPlaceholder}
            style={{
              width: '100%', padding: '0.75rem', borderRadius: '8px',
              border: '1px solid #e2e8f0', fontSize: '1rem'
            }}
          />
        </div>

        <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
          <button onClick={onClose} style={{
            padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer'
          }}>
            {cancelButtonText}
          </button>
          <button 
            onClick={onConfirm} 
            disabled={inputValue !== expectedValue}
            style={{
              padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', 
              background: inputValue === expectedValue ? '#dc2626' : '#fca5a5',
              color: 'white', fontWeight: 'bold', 
              cursor: inputValue === expectedValue ? 'pointer' : 'not-allowed'
            }}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;

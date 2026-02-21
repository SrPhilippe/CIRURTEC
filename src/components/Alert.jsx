import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const Alert = ({ message, type = 'info', onClose, duration = 5000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [onClose, duration]);

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle size={20} />;
      case 'error': return <AlertCircle size={20} />;
      default: return <Info size={20} />;
    }
  };

  return (
    <div className={`alert-component ${type}`}>
      <div className="alert-content">
        {getIcon()}
        <span>{message}</span>
      </div>
      <button className="alert-close-btn" onClick={onClose} aria-label="Fechar">
        <X size={18} />
      </button>
    </div>
  );
};

export default Alert;

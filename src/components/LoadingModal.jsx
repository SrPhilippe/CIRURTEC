import React, { useEffect, useState, useRef } from 'react';
import './LoadingModal.css';

const LoadingModal = ({ isOpen, message = 'Carregando...', minDuration = 3000 }) => {
  const [isVisible, setIsVisible] = useState(isOpen);
  const startTimeRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (!isVisible) {
        setIsVisible(true);
        startTimeRef.current = Date.now();
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    } else {
      if (isVisible && startTimeRef.current) {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = minDuration - elapsed;

        if (remaining > 0) {
          timeoutRef.current = setTimeout(() => {
            setIsVisible(false);
            startTimeRef.current = null;
          }, remaining);
        } else {
          setIsVisible(false);
          startTimeRef.current = null;
        }
      } else if (!isOpen && isVisible) {
         // Fallback for cases where start time might be missing but we need to hide
         setIsVisible(false);
      }
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isOpen, minDuration, isVisible]);

  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="loading-modal-overlay">
      <div className="loading-modal-content">
        <div className="loading-spinner"></div>
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
};

export default LoadingModal;

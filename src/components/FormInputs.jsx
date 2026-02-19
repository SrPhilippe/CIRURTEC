import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import useDebounce from '../hooks/useDebounce';

// --- UsernameInput ---
export const UsernameInput = ({ value, onChange, currentUsername, required = true, disabled = false }) => {
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const debouncedUsername = useDebounce(value, 500);

  useEffect(() => {
    // If disabled, don't check
    if (disabled) return;
    
    const checkUsername = async () => {
      // If empty, or same as current (for edits), skip check
      if (!debouncedUsername || (currentUsername && debouncedUsername === currentUsername)) {
        setUsernameAvailable(null);
        return;
      }

      // Pre-validation before API call to save resources
      if (debouncedUsername.length > 16 || /\s/.test(debouncedUsername) || !/^[a-zA-Z0-9._-]+$/.test(debouncedUsername) || (debouncedUsername.match(/\./g) || []).length > 1) {
          setUsernameAvailable(null);
          return;
      }

      setIsCheckingUsername(true);
      try {
        const q = query(collection(db, 'users'), where('username', '==', debouncedUsername));
        const querySnapshot = await getDocs(q);
        setUsernameAvailable(querySnapshot.empty);
      } catch (error) {
        console.error(error);
        setUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    };

    checkUsername();
  }, [debouncedUsername, currentUsername, disabled]);

  const handleChange = (e) => {
    const newVal = e.target.value;

    // Validation Rules
    if (newVal.length > 16) return;
    if (/\s/.test(newVal)) return;
    if (newVal !== '' && !/^[a-zA-Z0-9._-]+$/.test(newVal)) return;
    
    // Only allow one dot max
    if ((newVal.match(/\./g) || []).length > 1) return;

    setUsernameAvailable(null);
    onChange(e);
  };

  return (
    <div className="form-group">
      <label className="form-label" htmlFor="username">Nome de Usuário</label>
      <div className="input-wrapper">
        <User size={18} className="field-icon" />
        <input
          id="username"
          type="text"
          name="username"
          className="form-input"
          placeholder="Digite o nome de usuário"
          value={value}
          onChange={handleChange}
          required={required}
          disabled={disabled}
          style={disabled ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
        />
      </div>
      {!disabled && isCheckingUsername && (
        <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
          Verificando disponibilidade...
        </span>
      )}
      {!disabled && !isCheckingUsername && usernameAvailable === true && (
        <span style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: '4px', display: 'block' }}>
          ✓ Disponível
        </span>
      )}
      {!disabled && !isCheckingUsername && usernameAvailable === false && (
        <span style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '4px', display: 'block' }}>
          ✕ Indisponível
        </span>
      )}
    </div>
  );
};

// --- EmailInput ---
export const EmailInput = ({ value, onChange, currentEmail, required = true, disabled = false }) => {
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const debouncedEmail = useDebounce(value, 800); // Slightly longer debounce for email

  useEffect(() => {
    if (disabled) return;

    const checkEmail = async () => {
      if (!debouncedEmail || (currentEmail && debouncedEmail === currentEmail)) {
        setEmailAvailable(null);
        return;
      }

      // Basic Regex Validation before API check
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(debouncedEmail)) {
        setEmailAvailable(null);
        return;
      }

      setIsCheckingEmail(true);
      try {
        const q = query(collection(db, 'users'), where('email', '==', debouncedEmail));
        const querySnapshot = await getDocs(q);
        setEmailAvailable(querySnapshot.empty);
      } catch (error) {
        console.error(error);
        setEmailAvailable(null);
      } finally {
        setIsCheckingEmail(false);
      }
    };

    checkEmail();
  }, [debouncedEmail, currentEmail, disabled]);

  const handleChange = (e) => {
    setEmailAvailable(null);
    onChange(e);
  };

  return (
    <div className="form-group">
      <label className="form-label" htmlFor="email">E-mail</label>
      <div className="input-wrapper">
        <Mail size={18} className="field-icon" />
        <input
          id="email"
          type="email"
          name="email"
          className="form-input"
          placeholder="Digite o e-mail"
          value={value}
          onChange={handleChange}
          required={required}
          disabled={disabled}
          style={disabled ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
        />
      </div>
      {!disabled && isCheckingEmail && (
        <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
          Verificando disponibilidade...
        </span>
      )}
      {!disabled && !isCheckingEmail && emailAvailable === true && (
        <span style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: '4px', display: 'block' }}>
          ✓ Disponível
        </span>
      )}
      {!disabled && !isCheckingEmail && emailAvailable === false && (
        <span style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '4px', display: 'block' }}>
          ✕ Indisponível
        </span>
      )}
    </div>
  );
};

// --- PasswordInput ---
export const PasswordInput = ({ 
    value, 
    onChange, 
    name = "password", 
    label = "Senha", 
    placeholder = "Digite a senha",
    required = true 
}) => {
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        if (e.target.value.length > 24) return;
        onChange(e);
    };

    return (
        <div className="form-group">
            <label className="form-label" htmlFor={name}>{label}</label>
            <div className="input-wrapper">
                <Lock size={18} className="field-icon" />
                <input
                    id={name}
                    type={showPassword ? "text" : "password"}
                    name={name}
                    className="form-input"
                    placeholder={placeholder}
                    value={value}
                    onChange={handleChange}
                    required={required}
                    style={{ paddingRight: '40px' }} 
                />
                <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
        </div>
    );
};

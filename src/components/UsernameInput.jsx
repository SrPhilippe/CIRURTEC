import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import api from '../services/api';
import useDebounce from '../hooks/useDebounce';

const UsernameInput = ({ value, onChange, currentUsername, required = true }) => {
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const debouncedUsername = useDebounce(value, 500);

  useEffect(() => {
    const checkUsername = async () => {
      // If empty, or same as current (for edits), skip check
      if (!debouncedUsername || (currentUsername && debouncedUsername === currentUsername)) {
        setUsernameAvailable(null);
        return;
      }

      setIsCheckingUsername(true);
      try {
        const response = await api.get(`/auth/check-username/${debouncedUsername}`);
        setUsernameAvailable(!response.data.exists);
      } catch (error) {
        console.error(error);
        setUsernameAvailable(null); // On error, maybe neutral state?
      } finally {
        setIsCheckingUsername(false);
      }
    };

    checkUsername();
  }, [debouncedUsername, currentUsername]);

  const handleChange = (e) => {
    const newVal = e.target.value;

    // Validation Rules
    if (newVal.length > 16) return;
    if (/\s/.test(newVal)) return;
    if (newVal !== '' && !/^[a-zA-Z0-9._-]+$/.test(newVal)) return;
    if ((newVal.match(/\./g) || []).length > 1) return;

    // Reset availability temp
    setUsernameAvailable(null);
    
    // Propagate change
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
        />
      </div>
      {isCheckingUsername && (
        <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
          Verificando disponibilidade...
        </span>
      )}
      {!isCheckingUsername && usernameAvailable === true && (
        <span style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: '4px', display: 'block' }}>
          ✓ Disponível
        </span>
      )}
      {!isCheckingUsername && usernameAvailable === false && (
        <span style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '4px', display: 'block' }}>
          ✕ Indisponível
        </span>
      )}
    </div>
  );
};

export default UsernameInput;

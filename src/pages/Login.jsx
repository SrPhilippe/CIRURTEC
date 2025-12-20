import React, { useState, useContext } from 'react';
import LoadingModal from '../components/LoadingModal';
import logo from '../assets/images/logo-cirurtec.png';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Lock, User, LogIn, AlertCircle, Shield } from 'lucide-react';
import './Login.css';

const Login = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setValidationError('');
    
    // If it looks like a username (not email), apply username rules
    if (!value.includes('@')) {
      // Max 16 characters
      if (value.length > 16) {
        setValidationError('Nome de usuário deve ter no máximo 16 caracteres.');
        return;
      }
      // No spaces
      if (/\s/.test(value)) {
        setValidationError('Nome de usuário não pode conter espaços.');
        return;
      }
      // Valid characters only
      if (value !== '' && !/^[a-zA-Z0-9._@-]+$/.test(value)) {
        setValidationError('Caracteres inválidos no nome de usuário.');
        return;
      }
    }
    
    setUsernameOrEmail(value);
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setValidationError('');
    
    // Max 24 characters
    if (value.length > 24) {
      setValidationError('Senha deve ter no máximo 24 caracteres.');
      return;
    }
    
    setPassword(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const startTime = Date.now();
    const minLoadTime = 1000;

    try {
      await login(usernameOrEmail, password);
      
      const elapsed = Date.now() - startTime;
      if (elapsed < minLoadTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadTime - elapsed));
      }

      navigate('/'); // Redirect to home after login
    } catch (err) {
      setError('Falha no login. Verifique suas credenciais.');
      // If error, we also need to respect min time if we want consistent UX, 
      // or just let it close fast? Usually fast fail is fine, or consistent.
      // Let's keep error fast for now, or user waits for nothing.
      // But LoadingModal internal logic will handle the "visual" duration if we keep isOpen=true?
      // No, we set loading=false in finally.
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
            <img src={logo} alt="Cirurtec Logo" className="login-logo" style={{ maxWidth: '180px', marginBottom: '1rem' }} />
            <p className="login-subtitle">Entre com suas credenciais para acessar</p>
        </div>

        {error && (
            <div className="error-message">
                <AlertCircle size={18} />
                <span>{error}</span>
            </div>
        )}
        
        {validationError && (
            <div className="error-message">
                <AlertCircle size={18} />
                <span>{validationError}</span>
            </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="username">Usuário ou E-mail</label>
            <div className="input-wrapper">
              <User size={18} className="field-icon" />
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="Digite seu usuário ou e-mail"
                value={usernameOrEmail}
                onChange={handleUsernameChange}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Senha</label>
            <div className="input-wrapper">
              <Lock size={18} className="field-icon" />
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Digite sua senha"
                value={password}
                onChange={handlePasswordChange}
                required
              />
            </div>
          </div>
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? (
                'Entrando...'
            ) : (
                <>
                    <LogIn size={18} />
                    Entrar
                </>
            )}
          </button>
        </form>
      </div>
        <LoadingModal isOpen={loading} minDuration={50} message="Acessando o sistema..." />
    </div>
  );
};

export default Login;

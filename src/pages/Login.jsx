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

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState({ loading: false, message: '', error: '' });

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotStatus({ loading: true, message: '', error: '' });
    
    try {
        await new Promise(resolve => setTimeout(resolve, 800)); // Slight delay for UX
        const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: forgotEmail })
        });
        
        const data = await response.json();
        setForgotStatus({ loading: false, message: data.message, error: '' });
        
        // Hide modal after 3 seconds
        setTimeout(() => setShowForgotModal(false), 3000);
    } catch (error) {
        setForgotStatus({ loading: false, message: '', error: 'Erro ao enviar solicitação.' });
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

        {/* LOGIN FORM */}
        {!showForgotModal ? (
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
                <div style={{ textAlign: 'right', marginTop: '8px' }}>
                    <button 
                        type="button" 
                        className="text-btn" 
                        onClick={() => setShowForgotModal(true)}
                        style={{ background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                        Esqueci minha senha
                    </button>
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
        ) : (
            /* FORGOT PASSWORD FORM */
            <form onSubmit={handleForgotPassword} className="login-form">
                <h3 style={{ textAlign: 'center', marginBottom: '1rem', color: '#334155' }}>Recuperar Senha</h3>
                <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.5rem', textAlign: 'center' }}>
                    Informe seu e-mail para receber o link de redefinição.
                </p>

                {forgotStatus.message && (
                    <div className="alert alert-success" style={{ padding: '10px', marginBottom: '15px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>
                        {forgotStatus.message}
                    </div>
                )}
                {forgotStatus.error && (
                    <div className="error-message">
                        <AlertCircle size={18} />
                        <span>{forgotStatus.error}</span>
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label">E-mail Cadastrado</label>
                    <div className="input-wrapper">
                        <User size={18} className="field-icon" />
                        <input
                            type="email"
                            className="form-input"
                            placeholder="seu@email.com"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="form-actions" style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                    <button 
                        type="button" 
                        className="login-button" 
                        onClick={() => { setShowForgotModal(false); setForgotStatus({ message: '', error: '', loading: false }); setForgotEmail(''); }}
                        style={{ backgroundColor: '#94a3b8' }}
                    >
                        Voltar
                    </button>
                    <button type="submit" className="login-button" disabled={forgotStatus.loading}>
                        {forgotStatus.loading ? 'Enviando...' : 'Enviar Link'}
                    </button>
                </div>
            </form>
        )}

      </div>
        <LoadingModal isOpen={loading} minDuration={50} message="Acessando o sistema..." />
    </div>
  );
};

export default Login;

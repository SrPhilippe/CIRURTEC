import React, { useState, useContext } from 'react';
import logo from '../assets/images/logo-cirurtec.png';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Lock, User, LogIn, AlertCircle, Shield } from 'lucide-react';
import './Login.css';

const Login = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(usernameOrEmail, password);
      navigate('/'); // Redirect to home after login
    } catch (err) {
      setError('Falha no login. Verifique suas credenciais.');
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
                onChange={(e) => setUsernameOrEmail(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
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
    </div>
  );
};

export default Login;

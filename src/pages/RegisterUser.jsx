import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { User, Mail, Lock, Shield, UserPlus, AlertCircle, CheckCircle, Briefcase } from 'lucide-react';
import './RegisterUser.css';

const RegisterUser = () => {
  const { register } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: '',
    rights: 'Padrão'
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      await register(formData.username, formData.email, formData.password, formData.role, formData.rights);
      setMessage({ type: 'success', text: 'Usuário registrado com sucesso!' });
      setFormData({
        username: '',
        email: '',
        password: '',
        role: '',
        rights: 'Padrão'
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Erro ao registrar usuário' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <div className="register-icon-wrapper">
            <UserPlus size={32} />
          </div>
          <h2 className="register-title">Cadastrar Novo Usuário</h2>
          <p className="register-subtitle">Preencha os dados para criar um novo usuário</p>
        </div>

        {message.text && (
          <div className={message.type === 'success' ? 'success-message' : 'error-message'}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form">
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
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
          </div>

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
                value={formData.email}
                onChange={handleChange}
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
                name="password"
                className="form-input"
                placeholder="Digite a senha"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="role">Cargo</label>
            <div className="input-wrapper">
              <Briefcase size={18} className="field-icon" />
              <input
                id="role"
                type="text"
                name="role"
                className="form-input"
                placeholder="Ex: Vendedor, Técnico"
                value={formData.role}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="rights">Nível de Acesso</label>
            <div className="input-wrapper">
              <Shield size={18} className="field-icon" />
              <select
                id="rights"
                name="rights"
                className="form-select"
                value={formData.rights}
                onChange={handleChange}
              >
                <option value="Padrão">Padrão</option>
                <option value="Master">Master</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          </div>

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? (
              'Registrando...'
            ) : (
              <>
                <UserPlus size={18} />
                Registrar Usuário
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterUser;

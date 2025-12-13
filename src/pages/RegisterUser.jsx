import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
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
        <h2 className="register-title">Novo Usuário</h2>
        {message.text && (
          <div className={message.type === 'success' ? 'success-message' : 'error-message'}>
            {message.text}
          </div>
        )}
        <form onSubmit={handleSubmit} className="register-form">
          <input
            type="text"
            name="username"
            className="form-input"
            placeholder="Nome de Usuário"
            value={formData.username}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            className="form-input"
            placeholder="E-mail"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            className="form-input"
            placeholder="Senha"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="role"
            className="form-input"
            placeholder="Cargo (ex: Vendedor)"
            value={formData.role}
            onChange={handleChange}
          />
          <select
            name="rights"
            className="form-select"
            value={formData.rights}
            onChange={handleChange}
          >
            <option value="Padrão">Padrão</option>
            <option value="Master">Master</option>
            <option value="ADMIN">ADMIN</option>
          </select>

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrar Usuário'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterUser;

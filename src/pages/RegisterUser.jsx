import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { UsernameInput, EmailInput, PasswordInput } from '../components/FormInputs';
import LoadingModal from '../components/LoadingModal';
import { Mail, Lock, Shield, UserPlus, AlertCircle, CheckCircle, Briefcase, ArrowLeft } from 'lucide-react';
import Alert from '../components/Alert';
import { checkPermission, PERMISSIONS } from '../utils/permissions';
import './RegisterUser.css';

const RegisterUser = () => {
  const navigate = useNavigate();
  const { register, user: currentUser } = useContext(AuthContext);
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
    const { name, value } = e.target;
    
    if (name === 'password') {
        if (value.length > 24) return;
    }

    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    // Permission check: Master cannot create Admin users
    if (currentUser?.rights === 'Master' && formData.rights === 'ADMIN') {
        setMessage({ type: 'error', text: 'Você não tem permissão para criar usuários ADMIN.' });
        setLoading(false);
        return;
    }
    
    // Username Validation
    if (formData.username.length > 16) {
        setMessage({ type: 'error', text: 'O nome de usuário deve ter no máximo 16 caracteres.' });
        setLoading(false);
        return;
    }
    if (/\s/.test(formData.username)) {
        setMessage({ type: 'error', text: 'O nome de usuário não pode conter espaços.' });
        setLoading(false);
        return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(formData.username)) {
        setMessage({ type: 'error', text: 'O nome de usuário pode conter apenas letras, números, ponto (.), underline (_) e hífen (-).' });
        setLoading(false);
        return;
    }

    // Password Validation
    if (formData.password.length > 24) {
        setMessage({ type: 'error', text: 'A senha deve ter no máximo 24 caracteres.' });
        setLoading(false);
        return;
    }

    try {
      // Artificial delay to show loading modal
      await new Promise(resolve => setTimeout(resolve, 2000));

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
      console.error(error);
      setMessage({ type: 'error', text: error.message || 'Erro ao registrar usuário' });
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
          <Alert 
            message={message.text} 
            type={message.type} 
            onClose={() => setMessage({ type: '', text: '' })} 
          />
        )}

        <form onSubmit={handleSubmit} className="register-form">
          <UsernameInput 
            value={formData.username} 
            onChange={handleChange} 
          />

          <EmailInput 
            value={formData.email}
            onChange={handleChange}
          />

          <PasswordInput
             value={formData.password}
             onChange={handleChange}
          />

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
                <option value="ADMIN" disabled={currentUser?.rights === 'Master'}>ADMIN</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
             <button 
                type="button" 
                onClick={() => navigate('/users')}
                className="btn-secondary"
             >
                <ArrowLeft size={18} />
                Voltar
             </button>
             <button type="submit" className="register-button" disabled={loading} style={{ flex: 1, margin: 0 }}>
                {loading ? (
                'Registrando...'
                ) : (
                <>
                    <UserPlus size={18} />
                    Registrar Usuário
                </>
                )}
             </button>
          </div>
        </form>
      </div>
      <LoadingModal isOpen={loading} duration={5000} message="Registrando usuário..." />
    </div>
  );
};

export default RegisterUser;

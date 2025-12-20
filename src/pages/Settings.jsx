
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { User, Mail, Lock, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { UsernameInput, EmailInput, PasswordInput } from '../components/FormInputs';
import api from '../services/api';
import './Settings.css';

const Settings = () => {
  const { user, updateProfile } = useContext(AuthContext);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.username) {
      setFormData(prev => ({
        ...prev,
        username: user.username || '',
        email: user.email || '',
        password: '',
        confirmPassword: ''
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'password' || name === 'confirmPassword') {
        if (value.length > 24) return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    
    if (formData.password && formData.password !== formData.confirmPassword) {
      setStatus({ type: 'error', message: 'As senhas não coincidem' });
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        username: formData.username,
        email: formData.email
      };
      
      if (formData.password) {
        updateData.password = formData.password;
      }

      await updateProfile(user.id, updateData);
      setStatus({ type: 'success', message: 'Perfil atualizado com sucesso!' });
      
      // Clear password fields on success
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.message || 'Erro ao atualizar perfil';
      setStatus({ type: 'error', message: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-card">
        <div className="settings-header">
          <User size={32} className="settings-icon" />
          <h1>Configurações do Perfil</h1>
          <p>Gerencie suas informações pessoais</p>
        </div>

        {status.message && (
          <div className={`status-message ${status.type}`}>
            {status.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            <span>{status.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="settings-form">
          <UsernameInput 
            value={formData.username} 
            onChange={handleChange}
            currentUsername={user?.username}
          />

          <EmailInput 
            value={formData.email}
            onChange={handleChange}
            currentEmail={user?.email}
          />

          <div className="divider">
            <span>Alterar Senha (Opcional)</span>
          </div>

          <PasswordInput 
            name="password"
            label="Nova Senha"
            placeholder="Deixe em branco para manter a atual"
            value={formData.password}
            onChange={handleChange}
            required={false}
          />

          <PasswordInput 
            name="confirmPassword"
            label="Confirmar Nova Senha"
            placeholder="Digite a nova senha novamente"
            value={formData.confirmPassword}
            onChange={handleChange}
            required={false}
          />

          <div className="form-info">
             <p><strong>Cargo:</strong> {user?.role || 'N/A'}</p>
             <p><strong>Nível de Acesso:</strong> {user?.rights || 'N/A'}</p>
          </div>

          <button type="submit" className="save-btn" disabled={loading}>
            {loading ? 'Salvando...' : (
              <>
                <Save size={20} />
                Salvar Alterações
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;

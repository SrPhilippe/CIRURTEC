import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import UsernameInput from '../components/UsernameInput';
import { User, Mail, Lock, Save, AlertCircle, CheckCircle, Trash2, X, ArrowLeft } from 'lucide-react';
import './Settings.css'; // Reusing settings styles

const EditUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    rights: ''
  });
  
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Username Check State
  const [originalUsername, setOriginalUsername] = useState('');

  useEffect(() => {
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
        // Admin gets all users, we filter client side or ideally Fetch Single User endpoint?
        // The endpoint /auth/users returns all users. 
        // /auth/me returns current.
        // I'll use /auth/users and find by ID for now since I didn't add GET /users/:id. 
        // Wait, I should probably use the existing GET /users list and find local, or fetch fresh list.
        const response = await api.get('/auth/users');
        const user = response.data.find(u => u.id === parseInt(id));
        
        if (user) {
            setOriginalUsername(user.username);
            setFormData({
                username: user.username,
                email: user.email,
                password: '',
                confirmPassword: '',
                role: user.role,
                rights: user.rights
            });
        } else {
            setStatus({ type: 'error', message: 'Usuário não encontrado.' });
        }
    } catch (err) {
        console.error(err);
        setStatus({ type: 'error', message: 'Erro ao carregar usuário.' });
    } finally {
        setInitialLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'password') {
        if (value.length > 24) return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    
    // Username Validation
    if (formData.username.length > 16) {
        setStatus({ type: 'error', message: 'O nome de usuário deve ter no máximo 16 caracteres.' });
        return;
    }
    if (/\s/.test(formData.username)) {
        setStatus({ type: 'error', message: 'O nome de usuário não pode conter espaços.' });
        return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(formData.username)) {
        setStatus({ type: 'error', message: 'O nome de usuário pode conter apenas letras, números, ponto (.), underline (_) e hífen (-).' });
        return;
    }

    if (formData.password) {
        if (formData.password.length > 24) {
            setStatus({ type: 'error', message: 'A senha deve ter no máximo 24 caracteres.' });
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setStatus({ type: 'error', message: 'As senhas não coincidem' });
            return;
        }
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

      await api.put(`/auth/users/${id}`, updateData);
      setStatus({ type: 'success', message: 'Usuário atualizado com sucesso!' });
      
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.message || 'Erro ao atualizar usuário';
      setStatus({ type: 'error', message: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete(`/auth/users/${id}`);
      navigate('/users');
    } catch (error) {
       console.error(error);
       alert('Erro ao excluir conta.');
       setShowDeleteModal(false);
    }
  };

  if (initialLoading) return <div className="loading-state">Carregando...</div>;

  return (
    <div className="settings-container">
      <div className="settings-card">
        <div className="settings-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/users')} className="btn-icon" style={{color: 'white'}}>
             <ArrowLeft size={24} />
          </button>
          <div>
              <h1>Editar Usuário</h1>
              <p>Gerencie as informações desta conta</p>
          </div>
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
            currentUsername={originalUsername}
          />

          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <div className="input-wrapper">
              <Mail size={18} />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="divider">
            <span>Alterar Senha (Opcional)</span>
          </div>

          <div className="form-group">
            <label htmlFor="password">Nova Senha</label>
            <div className="input-wrapper">
              <Lock size={18} />
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Deixe em branco para manter a atual"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Nova Senha</label>
            <div className="input-wrapper">
              <Lock size={18} />
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Digite a nova senha novamente"
              />
            </div>
          </div>

          <div className="form-info">
             <p><strong>Cargo Atual:</strong> {formData.role}</p>
             <p><strong>Permissão:</strong> {formData.rights}</p>
          </div>

          <div className="form-actions" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
             <button type="button" className="btn-delete-account" onClick={() => setShowDeleteModal(true)} style={{
                 backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
             }}>
                <Trash2 size={18} /> Excluir Conta
             </button>
             
             <button type="submit" className="save-btn" disabled={loading}>
                {loading ? 'Salvando...' : (
                <>
                    <Save size={20} />
                    Salvar Alterações
                </>
                )}
            </button>
          </div>
        </form>
      </div>

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                background: 'white', padding: '2rem', borderRadius: '12px',
                width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                    <h2 style={{color: '#991b1b', margin: 0}}>Excluir Conta</h2>
                    <button onClick={() => setShowDeleteModal(false)} style={{border: 'none', background: 'transparent', cursor: 'pointer'}}>
                        <X size={24} />
                    </button>
                </div>
                
                <p style={{marginBottom: '1rem', color: '#334155'}}>
                    Tem certeza que deseja excluir a conta de <strong>{formData.username}</strong>? Esta ação é irreversível.
                </p>

                <div style={{marginBottom: '1.5rem'}}>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#64748b'}}>
                        Para confirmar, digite <strong>{formData.username}</strong> abaixo:
                    </label>
                    <input 
                        type="text" 
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder="Nome do usuário"
                        style={{
                            width: '100%', padding: '0.75rem', borderRadius: '8px',
                            border: '1px solid #e2e8f0', fontSize: '1rem'
                        }}
                    />
                </div>

                <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
                    <button onClick={() => setShowDeleteModal(false)} style={{
                        padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer'
                    }}>
                        Cancelar
                    </button>
                    <button 
                        onClick={handleDeleteAccount} 
                        disabled={deleteConfirmation !== formData.username}
                        style={{
                            padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', 
                            background: deleteConfirmation === formData.username ? '#dc2626' : '#fca5a5',
                            color: 'white', fontWeight: 'bold', cursor: deleteConfirmation === formData.username ? 'pointer' : 'not-allowed'
                        }}
                    >
                        Confirmar Exclusão
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default EditUser;

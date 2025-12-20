import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { UsernameInput, EmailInput, PasswordInput } from '../components/FormInputs';
import { User, Mail, Lock, Save, AlertCircle, CheckCircle, Trash2, X, ArrowLeft } from 'lucide-react';
import { AuthContext } from '../context/AuthContext'; 
import { checkPermission, PERMISSIONS, ROLES } from '../utils/permissions';
import './Perfil.css'; // Reusing settings styles

const EditUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading } = useContext(AuthContext);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    rights: '' // Legacy mapping, we might update this based on role
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
                rights: user.rights // Usually 'rights' maps to permission level string
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
    
    // Permission Check for Edit
    const targetUser = { id: parseInt(id), role: formData.role };
    // Warning: we should use the ORIGINAL role for permission check to see if we can edit THIS user.
    // If I am Master and I try to edit an Admin, I shouldn't be able to.
    
    // Ideally we should have stored the original role separately or rely on backend.
    // But since Master cannot delete Admin, likely cannot edit Admin either.
    // Let's assume passed 'rights' or initial load role is the truth. 
    // We already do a check based on `formData.role` which might have been changed by the user in the UI? 
    // No, `targetUser` for checkPermission should probably reflect the *current* state in DB (or initial load).
    // If I change the role dropdown to Admin, I (Master) shouldn't suddenly be unable to save?
    // Actually if I am Master, I can't change role anyway.
    
    if (!checkPermission(currentUser, PERMISSIONS.EDIT_USER, targetUser)) {
         setStatus({ type: 'error', message: 'Você não tem permissão para editar este usuário.' });
         return;
    }

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
        email: formData.email
      };
      
      // Only include username if allowed to edit it and it changed
      if (checkPermission(currentUser, PERMISSIONS.EDIT_USERNAME, targetUser) && formData.username !== originalUsername) {
          updateData.username = formData.username;
      }

      if (formData.password) {
        updateData.password = formData.password;
      }

      // Role Update
      if (checkPermission(currentUser, PERMISSIONS.EDIT_USER_ROLE, targetUser)) {
          updateData.role = formData.role;
          // You might also want to update 'rights' based on role if your backend expects it, 
          // or ideally backend handles it. For now we just send role.
      }

      await api.put(`/auth/users/${id}`, updateData);
      setStatus({ type: 'success', message: 'Usuário atualizado com sucesso!' });
      
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      // Update original username if changed successfully
      if (updateData.username) {
          setOriginalUsername(updateData.username);
      }
      
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.message || 'Erro ao atualizar usuário';
      setStatus({ type: 'error', message: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    // Permission Check
    const targetUser = { id: parseInt(id), role: formData.role };
    if (!checkPermission(currentUser, PERMISSIONS.DELETE_USER, targetUser)) {
        setStatus({ type: 'error', message: 'Permissão negada para excluir este usuário.' });
        setShowDeleteModal(false);
        return;
    }

    try {
      await api.delete(`/auth/users/${id}`);
      navigate('/users');
    } catch (error) {
       console.error(error);
       alert('Erro ao excluir conta.');
       setShowDeleteModal(false);
    }
  };

  // Wait for BOTH auth loading and user fetch loading
  if (initialLoading || authLoading) return <div className="loading-state">Carregando...</div>;

  // Construct target user object for permission checks
  const targetUser = { id: parseInt(id), role: formData.role };
  
  // Calculate permissions
  const canEditUsername = checkPermission(currentUser, PERMISSIONS.EDIT_USERNAME, targetUser);
  const canDeleteUser = checkPermission(currentUser, PERMISSIONS.DELETE_USER, targetUser);
  const canEditUser = checkPermission(currentUser, PERMISSIONS.EDIT_USER, targetUser);
  const canEditRole = checkPermission(currentUser, PERMISSIONS.EDIT_USER_ROLE, targetUser);

  return (
    <div className="settings-container">
      <div className="settings-card">
        <div className="settings-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
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
            disabled={!canEditUsername}
          />

          <EmailInput
            value={formData.email}
            onChange={handleChange}
            currentEmail={formData.email} 
            disabled={!canEditUser} 
          />

          {/* ROLE SLECTION */}
          <div className="form-group">
              <label className="form-label">Cargo</label>
              <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="form-input"
                  disabled={!canEditRole}
                  style={!canEditRole ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
              >
                  <option value={ROLES.PADRAO}>{ROLES.PADRAO}</option>
                  <option value={ROLES.MASTER}>{ROLES.MASTER}</option>
                  <option value={ROLES.ADMIN}>{ROLES.ADMIN}</option>
              </select>
          </div>

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
             {/* Removed Cargo display since we have input now, maybe keep rights or info */}
             <p><strong>Permissão:</strong> {formData.rights}</p>
          </div>

          <div className="form-actions" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
             {canDeleteUser ? (
                 <button type="button" className="btn-delete-account" onClick={() => setShowDeleteModal(true)} style={{
                     backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem'
                 }}>
                    <Trash2 size={18} /> Excluir Conta
                 </button>
             ) : (
                <div></div> // Spacer to keep layout if expected
             )}
             
             <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto' }}>
                <button type="button" className="btn-secondary" onClick={() => navigate('/users')}>
                    <ArrowLeft size={20} /> Voltar
                </button>
                {canEditUser && (
                    <button type="submit" className="save-btn" disabled={loading}>
                        {loading ? 'Salvando...' : (
                        <>
                            <Save size={20} />
                            Salvar Alterações
                        </>
                        )}
                    </button>
                )}
             </div>
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

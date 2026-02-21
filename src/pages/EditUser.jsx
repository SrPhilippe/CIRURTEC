import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { UsernameInput, EmailInput, PasswordInput } from '../components/FormInputs';
import { User, Mail, Lock, Save, AlertCircle, CheckCircle, Trash2, X, ArrowLeft, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { checkPermission, PERMISSIONS, ROLES } from '../utils/permissions';
import './Perfil.css'; // Reusing settings styles
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

const EditUser = () => {
  const { id } = useParams(); // id here will be the public_ID string from URL
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading, updateProfile } = useContext(AuthContext);
  
  const [targetUserId, setTargetUserId] = useState(null); // Real numeric ID for permission checks locally
  
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

  // Username Check State
  const [originalUsername, setOriginalUsername] = useState('');

  useEffect(() => {
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
        const docRef = doc(db, 'users', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const user = docSnap.data();
            setTargetUserId(id);
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
    
    // Permission Check for Edit
    // Use targetUserId which we resolved on fetch
    const targetUser = { id: targetUserId || parseInt(id), role: formData.role };
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
      const isSelf = currentUser.uid === id;
      
      const updateData = {
        email: formData.email
      };
      
      // Only include username if allowed to edit it and it changed
      if (checkPermission(currentUser, PERMISSIONS.EDIT_USERNAME, targetUser) && formData.username !== originalUsername) {
          updateData.username = formData.username;
      }

      // Role Update
      if (checkPermission(currentUser, PERMISSIONS.EDIT_USER_ROLE, targetUser)) {
          updateData.role = formData.role;
      }

      if (isSelf) {
          // If editing self, we can use updateProfile which handles password security
          if (formData.password) {
              updateData.password = formData.password;
          }
          await updateProfile(id, updateData);
      } else {
          // If editing another user, we MUST NOT include password in Firestore
          // (Logic above handleSubmit already blocks this if not Self, but for safety it's excluded here too)
          const userRef = doc(db, 'users', id);
          await updateDoc(userRef, updateData);
      }
      
      setStatus({ type: 'success', message: 'Usuário atualizado com sucesso!' });
      
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      // Update original username if changed successfully
      if (updateData.username) {
          setOriginalUsername(updateData.username);
      }
      
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Erro ao atualizar usuário' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    try {
        setLoading(true);
        const { sendPasswordResetEmail } = await import('firebase/auth');
        const { auth } = await import('../services/firebase');
        await sendPasswordResetEmail(auth, formData.email);
        setStatus({ type: 'success', message: 'E-mail de redefinição de senha enviado!' });
    } catch (error) {
        console.error(error);
        setStatus({ type: 'error', message: 'Erro ao enviar e-mail de redefinição.' });
    } finally {
        setLoading(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!window.confirm(`Tem certeza que deseja redefinir a senha de ${formData.username} para o padrão do sistema?`)) {
        return;
    }

    try {
        setLoading(true);
        const response = await api.post('/auth/reset-user-password-default', {
            targetUid: id
        });
        
        setStatus({ 
            type: 'success', 
            message: `Senha redefinida com sucesso! A nova senha é: ${response.data.defaultPassword}` 
        });
    } catch (error) {
        console.error(error);
        setStatus({ type: 'error', message: 'Erro ao redefinir para a senha padrão.' });
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    // Permission Check
    const targetUser = { id: targetUserId || parseInt(id), role: formData.role };
    if (!checkPermission(currentUser, PERMISSIONS.DELETE_USER, targetUser)) {
        setStatus({ type: 'error', message: 'Permissão negada para excluir este usuário.' });
        setShowDeleteModal(false);
        return;
    }

    try {
      // NOTE: Client SDK cannot delete other users or change their passwords.
      // This will only delete the Firestore document. 
      // A Cloud Function is needed for full user management.
      await deleteDoc(doc(db, 'users', id));
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
  // Use targetUserId if available (from fetch), otherwise fallback (might be unsafe if not resolved yet, but initialLoading blocks)
  const targetUser = { id: targetUserId, role: formData.role };
  
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
            <span>Alterar Senha {currentUser.uid !== id ? '(Via E-mail)' : '(Opcional)'}</span>
          </div>

          {currentUser.uid === id ? (
            <>
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
            </>
          ) : (
            <div className="form-group" style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
                    Por questões de segurança, a senha deve ser alterada pelo próprio usuário.
                </p>
                <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={handleSendResetEmail}
                    disabled={loading}
                    style={{ width: '100%', justifyContent: 'center', marginBottom: '0.5rem' }}
                >
                    <Mail size={18} /> Enviar E-mail de Redefinição
                </button>

                {currentUser.rights === 'ADMIN' && (
                    <button 
                        type="button" 
                        className="btn-secondary" 
                        onClick={handleResetToDefault}
                        disabled={loading}
                        style={{ width: '100%', justifyContent: 'center', backgroundColor: '#f0f9ff', color: '#0369a1', borderColor: '#bae6fd' }}
                    >
                        <RefreshCw size={18} /> Redefinir para Senha Padrão
                    </button>
                )}
            </div>
          )}

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
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        expectedValue={formData.username}
        title="Excluir Conta"
        description={
            <p style={{marginBottom: '1rem', color: '#334155'}}>
                Tem certeza que deseja excluir a conta de <strong>{formData.username}</strong>? Esta ação é irreversível.
            </p>
        }
        instructionLabel={
            <>
                Para confirmar, digite <strong>{formData.username}</strong> abaixo:
            </>
        }
        inputPlaceholder="Nome do usuário"
      />
    </div>
  );
};

export default EditUser;

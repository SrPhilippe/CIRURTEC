import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Mail, Save, AlertCircle, Search, ChevronDown, ChevronUp } from 'lucide-react';
import './Configuracoes.css';

export default function EmailGarantia() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUserId, setExpandedUserId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Erro ao carregar usuários. Verifique se você tem permissão.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (userId, currentValue) => {
    const newValue = !currentValue;
    
    // Optimistic update
    setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, receive_warranty_emails: newValue } : u
    ));

    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            receive_warranty_emails: newValue
        });
        setSuccess('Configuração atualizada!');
        setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
        console.error('Error updating setting:', err);
        setError('Erro ao salvar alteração.');
        // Revert on error
        setUsers(prev => prev.map(u => 
            u.id === userId ? { ...u, receive_warranty_emails: currentValue } : u
        ));
    }
  };


  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(/[\s.]+/); // Split by space or dot
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (name.substring(0, 2)).toUpperCase();
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="config-container">
      <div className="config-header">
        <h1 className="config-title">
          <Mail size={32} /> E-mail de Garantia
        </h1>
        <p className="status-label" style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>
          CONFIGURAÇÃO AUTOMÁTICA
        </p>
        <p className="config-subtitle">
            Gerencie os usuários que receberão cópias automáticas (Cc) dos e-mails de garantia enviados aos clientes.
        </p>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      <div className="config-card">
        {loading ? (
            <div className="loading-container"><p>Carregando...</p></div>
        ) : (
            <>
                <div className="search-container">
                    <Search size={20} className="search-icon" />
                    <input 
                        type="text" 
                        placeholder="Buscar usuário..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="section-header">
                    <span>LISTA DE USUÁRIOS</span>
                    <span>STATUS</span>
                </div>

                <div className="user-card-list">
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                            <div key={user.id} className="user-config-card">
                                <div className="user-info-section">
                                    <div className="user-avatar">
                                        {getInitials(user.username)}
                                    </div>
                                    <div className="user-details">
                                        <span className="user-name">{user.username}</span>
                                        <span className="user-email">{user.email}</span>
                                    </div>
                                </div>
                                <div className="status-section">
                                    <label className="switch">
                                        <input 
                                            type="checkbox" 
                                            checked={!!user.receive_warranty_emails}
                                            onChange={() => handleToggle(user.id, user.receive_warranty_emails)}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state" style={{ textAlign: 'center', padding: '3rem' }}>
                            <p style={{ color: '#94a3b8' }}>Nenhum usuário encontrado.</p>
                        </div>
                    )}
                </div>
            </>
        )}
      </div>
    </div>
  );
}

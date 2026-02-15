import React, { useState, useEffect } from 'react';
import api from '../../services/api';
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
      const response = await api.get('/auth/users');
      setUsers(response.data);
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
        await api.put(`/auth/users/${userId}/warranty-settings`, {
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

  const toggleExpand = (userId) => {
    if (window.innerWidth <= 768) {
        setExpandedUserId(expandedUserId === userId ? null : userId);
    }
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="config-container">
      <div className="config-header">
        <h1 className="config-title">
          <Mail size={32} /> Configuração de E-mail de Garantia
        </h1>
        <p className="config-subtitle">
            Selecione quais usuários devem receber uma cópia de todos os e-mails automáticos de garantia enviados aos clientes.
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
            <p>Carregando...</p>
        ) : (
            <>
                <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                    <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                        type="text" 
                        placeholder="Buscar usuário ou e-mail..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-input"
                        style={{ paddingLeft: '40px' }}
                    />
                </div>

                <table className="config-table">
                    <thead>
                        <tr>
                            <th>Usuário</th>
                            <th>E-mail</th>
                            <th style={{ textAlign: 'center' }}>Receber Cópias</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map(user => (
                                <tr 
                                    key={user.id} 
                                    className={expandedUserId === user.id ? 'expanded' : ''}
                                    onClick={() => toggleExpand(user.id)}
                                >
                                    <td data-label="Usuário" className="user-name-cell">
                                        <span className="user-name-text">{user.username}</span>
                                        <div className="mobile-chevron">
                                            {expandedUserId === user.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </div>
                                    </td>
                                    <td data-label="E-mail" className="detail-cell">{user.email}</td>
                                    <td data-label="Receber Cópias" style={{ textAlign: 'center' }} className="detail-cell">
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                                            <label className="switch" onClick={(e) => e.stopPropagation()}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={!!user.receive_warranty_emails}
                                                    onChange={() => handleToggle(user.id, user.receive_warranty_emails)}
                                                />
                                                <span className="slider round"></span>
                                            </label>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }} className="empty-state">
                                    Nenhum usuário encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </>
        )}
      </div>
    </div>
  );
}

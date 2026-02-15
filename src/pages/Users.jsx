import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Users as UsersIcon, Search, Shield, ShieldAlert, User, UserPlus, Edit, ChevronDown, ChevronUp } from 'lucide-react';
import './Users.css';

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  
  // Mobile Expansion State
  const [expandedUserId, setExpandedUserId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/auth/users');
      setUsers(response.data);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleExpand = (userId) => {
    if (window.innerWidth <= 768) {
        setExpandedUserId(expandedUserId === userId ? null : userId);
    }
  };

  const getRoleIcon = (rights) => {
    switch (rights) {
      case 'ADMIN': return <ShieldAlert className="role-icon admin" />;
      case 'Master': return <Shield className="role-icon master" />;
      default: return <User className="role-icon default" />;
    }
  };

  return (
    <div className="users-page-container">
      <div className="users-header">
        <div className="title-section">
          <UsersIcon size={32} />
          <h1>Gerenciamento de Usuários</h1>
        </div>
        
        <div className="search-and-actions">
          <div className="search-bar">
            <Search size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou e-mail..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button className="btn-add-user" onClick={() => navigate('../admin/register')}>
            <UserPlus size={20} />
            Cadastrar Novo Usuário
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="users-table-container">
        {loading ? (
          <div className="loading-state">Carregando usuários...</div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Ações</th>
                <th>E-mail</th>
                <th>Cargo</th>
                <th>Permissão</th>
                <th>Data de Criação</th>
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
                    <td className="user-name-cell" data-label="Usuário">
                      <div className="avatar-placeholder">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="user-name-text">{user.username}</span>
                      {/* Mobile Chevron */}
                      <div className="mobile-chevron">
                        {expandedUserId === user.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </td>
                    <td data-label="Ações" className="actions-cell">
                      <button 
                        className="btn-manage" 
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent row toggle
                            navigate(`/users/edit/${user.public_ID}`);
                        }}
                        title="Gerenciar Usuário"
                        style={{
                            backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', 
                            padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', 
                            fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                      >
                        <Edit size={14} /> Gerenciar
                      </button>
                    </td>
                    <td data-label="E-mail" className="detail-cell">{user.email}</td>
                    <td data-label="Cargo" className="detail-cell">{user.role}</td>
                    <td data-label="Permissão" className="detail-cell">
                      <div className={`role-badge ${user.rights.toLowerCase()}`}>
                        {getRoleIcon(user.rights)}
                        <span>{user.rights}</span>
                      </div>
                    </td>
                    <td data-label="Data de Criação" className="detail-cell">{new Date(user.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-state">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Users;

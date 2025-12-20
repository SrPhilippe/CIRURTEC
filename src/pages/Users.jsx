import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Users as UsersIcon, Search, Shield, ShieldAlert, User, UserPlus, Edit } from 'lucide-react';
import './Users.css';

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

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
                  <tr key={user.id}>
                    <td className="user-name-cell">
                      <div className="avatar-placeholder">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      {user.username}
                    </td>
                    <td>
                      <button 
                        className="btn-manage" 
                        onClick={() => navigate(`/users/edit/${user.id}`)}
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
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      <div className={`role-badge ${user.rights.toLowerCase()}`}>
                        {getRoleIcon(user.rights)}
                        <span>{user.rights}</span>
                      </div>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="empty-state">
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

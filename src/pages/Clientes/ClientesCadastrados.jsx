import React, { useState, useEffect } from 'react';
import { Building2, Filter, Eye, Edit, Trash2, Search, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './Clientes.css';

export default function ClientesCadastrados() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await api.get('/clients');
      setClients(response.data);
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
      setError('Não foi possível carregar a lista de clientes.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        await api.delete(`/clients/${id}`);
        setClients(clients.filter(client => client.id !== id));
      } catch (err) {
        console.error('Erro ao excluir cliente:', err);
        alert('Erro ao excluir cliente.');
      }
    }
  };

  const filteredClients = clients.filter(client => 
    client.nome_hospital.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.cnpj.includes(searchTerm) ||
    (client.nome_fantasia && client.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="clientes-container">
      <div className="page-header">
        <h1 className="page-title">
          <Building2 size={32} /> Clientes Cadastrados
        </h1>
        <div className="action-bar" style={{ marginTop: 0 }}>
             <button className="btn-secondary" onClick={() => navigate('/clientes/novo')}>
                <Plus size={18} /> Novo Cliente
             </button>
        </div>
      </div>

      <div className="client-form-card">
        <div className="search-bar-container">
          <div className="input-wrapper">
             <Search size={20} className="field-icon" />
             <input 
               type="text" 
               placeholder="Buscar por nome, fantasia ou CNPJ..." 
               className="form-input search-input"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="loading-container">
            <p>Carregando clientes...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="clients-table">
              <thead>
                <tr>
                  <th>Nome do Hospital</th>
                  <th>CNPJ</th>
                  <th>Tipo</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.length > 0 ? (
                  filteredClients.map(client => (
                    <tr key={client.id}>
                      <td className="font-medium">{client.nome_hospital}</td>
                      <td>{client.cnpj}</td>
                      <td>
                        <span className={`badge badge-${client.tipo_cliente?.toLowerCase()}`}>
                          {client.tipo_cliente}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn-icon btn-view" 
                            title="Visualizar"
                            onClick={() => navigate(`/clientes/${client.id}`)}
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            className="btn-icon btn-edit" 
                            title="Editar"
                            onClick={() => navigate(`/clientes/editar/${client.id}`)}
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            className="btn-icon btn-delete" 
                            title="Excluir"
                            onClick={() => handleDelete(client.id)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center">
                      {searchTerm ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

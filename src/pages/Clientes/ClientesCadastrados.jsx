import React, { useState, useEffect, useContext } from 'react';
import { Building2, Filter, Eye, Edit, Trash2, Search, Plus, X, Eraser } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { checkPermission, PERMISSIONS } from '../../utils/permissions';
import './Clientes.css';

export default function ClientesCadastrados() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user: currentUser, loading: authLoading } = useContext(AuthContext); // Get authLoading
  
  // Filter State
  const [showFilterModal, setShowFilterModal] = useState(false);
  // ... (rest of state)
  const [filters, setFilters] = useState({
    cnpj: '',
    nomeHospital: '', // nome_fantasia
    razaoSocial: '', // nome_hospital
    email: '',
    equipamento: '',
    numeroSerie: '',
    modelo: ''
  });

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
    // Double check permission before confirmed action
    if (!checkPermission(currentUser, PERMISSIONS.DELETE_CLIENT)) {
        alert('Você não tem permissão para excluir clientes.');
        return;
    }

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

  const filteredClients = clients.filter(client => {
    // 1. Text Search (Global)
    const matchesSearch = 
      client.nome_hospital.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.cnpj.includes(searchTerm) ||
      (client.nome_fantasia && client.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    // 2. Advanced Filters
    // CNPJ
    if (filters.cnpj && !client.cnpj.includes(filters.cnpj)) return false;
    
    // Razão Social (nome_hospital)
    if (filters.razaoSocial && !client.nome_hospital.toLowerCase().includes(filters.razaoSocial.toLowerCase())) return false;
    
    // Nome do Hospital (nome_fantasia)
    if (filters.nomeHospital) {
        if (!client.nome_fantasia) return false;
        if (!client.nome_fantasia.toLowerCase().includes(filters.nomeHospital.toLowerCase())) return false;
    }

    // Email (checks 1 and 2)
    if (filters.email) {
        const emailFilter = filters.email.toLowerCase();
        const email1 = client.email1 ? client.email1.toLowerCase() : '';
        const email2 = client.email2 ? client.email2.toLowerCase() : '';
        if (!email1.includes(emailFilter) && !email2.includes(emailFilter)) return false;
    }

    // Equipment Filters (Requires checking the equipments array)
    if (filters.equipamento || filters.numeroSerie || filters.modelo) {
        if (!client.equipments || client.equipments.length === 0) return false;
        
        // Check if ANY equipment matches ALL active equipment filters
        const hasMatchingEquipment = client.equipments.some(eq => {
            if (!eq) return false; // Safety check
            let match = true;
            if (filters.equipamento && (!eq.equipamento || !eq.equipamento.toLowerCase().includes(filters.equipamento.toLowerCase()))) match = false;
            if (filters.modelo && (!eq.modelo || !eq.modelo.toLowerCase().includes(filters.modelo.toLowerCase()))) match = false;
            if (filters.numeroSerie && (!eq.numero_serie || !eq.numero_serie.toLowerCase().includes(filters.numeroSerie.toLowerCase()))) match = false;
            return match;
        });

        if (!hasMatchingEquipment) return false;
    }

    return true;
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
        cnpj: '',
        nomeHospital: '',
        razaoSocial: '',
        email: '',
        equipamento: '',
        numeroSerie: '',
        modelo: ''
    });
  };

  const canDeleteClient = checkPermission(currentUser, PERMISSIONS.DELETE_CLIENT);
  
  if (authLoading) return <div className="loading-container"><p>Carregando permissões...</p></div>;

  return (
    <div className="clientes-container">
      <div className="page-header">
        <h1 className="page-title">
          <Building2 size={32} /> Clientes Cadastrados
        </h1>
        <div className="action-bar" style={{ marginTop: 0 }}>
             <button className="btn btn-primary" onClick={() => navigate('/clientes/novo')}>
                <Plus size={20} /> Novo Cliente
             </button>
        </div>
      </div>

      <div className="client-form-card">
        <div className="search-bar-container">
          <button 
                className={`btn-filter ${Object.values(filters).some(Boolean) ? 'active' : ''}`}
                onClick={() => setShowFilterModal(true)}
                title="Filtros Avançados"
                style={{ marginRight: 5 }}
             >
                <Filter size={20} />
          </button>
          
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

        {/* FILTER MODAL */}
        {showFilterModal && (
            <div className="filter-modal-overlay">
                <div className="filter-modal">
                    <div className="filter-modal-header">
                        <h2>Filtrar Clientes</h2>
                        <button className="close-btn" onClick={() => setShowFilterModal(false)}>
                            <X size={20} />
                        </button>
                    </div>
                    <div className="filter-modal-body">
                        <div className="filter-grid">
                             <div className="filter-group">
                                <label>CNPJ</label>
                                <input 
                                    type="text" 
                                    name="cnpj" 
                                    value={filters.cnpj} 
                                    onChange={handleFilterChange} 
                                    placeholder="Digite o CNPJ"
                                />
                             </div>
                             <div className="filter-group">
                                <label>Nome do Hospital</label>
                                <input 
                                    type="text" 
                                    name="nomeHospital" 
                                    value={filters.nomeHospital} 
                                    onChange={handleFilterChange} 
                                    placeholder="Nome Fantasia"
                                />
                             </div>
                             <div className="filter-group">
                                <label>Razão Social</label>
                                <input 
                                    type="text" 
                                    name="razaoSocial" 
                                    value={filters.razaoSocial} 
                                    onChange={handleFilterChange} 
                                    placeholder="Razão Social"
                                />
                             </div>
                             <div className="filter-group">
                                <label>E-mail</label>
                                <input 
                                    type="text" 
                                    name="email" 
                                    value={filters.email} 
                                    onChange={handleFilterChange} 
                                    placeholder="Buscar em e-mails"
                                />
                             </div>
                             
                             <div className="filter-divider">Dados do Equipamento</div>

                             <div className="filter-group">
                                <label>Equipamento</label>
                                <input 
                                    type="text" 
                                    name="equipamento" 
                                    value={filters.equipamento} 
                                    onChange={handleFilterChange} 
                                    placeholder="Ex: Autoclave"
                                />
                             </div>
                             <div className="filter-group">
                                <label>Modelo</label>
                                <input 
                                    type="text" 
                                    name="modelo" 
                                    value={filters.modelo} 
                                    onChange={handleFilterChange} 
                                    placeholder="Ex: XYZ-123"
                                />
                             </div>
                             <div className="filter-group">
                                <label>Número de Série</label>
                                <input 
                                    type="text" 
                                    name="numeroSerie" 
                                    value={filters.numeroSerie} 
                                    onChange={handleFilterChange} 
                                    placeholder="Serial Number"
                                />
                             </div>
                        </div>
                    </div>
                    <div className="filter-modal-footer">
                        <button className="btn-secondary" onClick={clearFilters}>
                            <Eraser size={16} /> Limpar
                        </button>
                        <button className="btn-primary" onClick={() => setShowFilterModal(false)}>
                            Aplicar Filtros
                        </button>
                    </div>
                </div>
            </div>
        )}

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

                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.length > 0 ? (
                  filteredClients.map(client => (
                    <tr key={client.id}>
                      <td className="font-medium" data-label="Nome do Hospital">{client.nome_hospital}</td>
                      <td data-label="CNPJ">{client.cnpj}</td>

                      <td data-label="Ações">
                        <div className="action-buttons">
                          <button 
                            className="btn-icon btn-view" 
                            title="Visualizar"
                            onClick={() => navigate(`/clientes/${client.cnpj.replace(/\D/g, '')}`)}
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            className="btn-icon btn-edit" 
                            title="Editar"
                            onClick={() => navigate(`/clientes/editar/${client.cnpj.replace(/\D/g, '')}`)}
                          >
                            <Edit size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3">
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

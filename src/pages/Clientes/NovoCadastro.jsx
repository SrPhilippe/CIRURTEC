import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Building2, Plus, Save, Trash2, Printer, ArrowLeft, Edit } from 'lucide-react';
import './Clientes.css';

// Helper functions (outside component or inside)
const formatPhone = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length > 10) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (digits.length > 5) {
    return digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  } else if (digits.length > 2) {
    return digits.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  }
  return digits;
};

const formatDate = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length >= 5) {
      return digits.replace(/^(\d{2})(\d{2})(\d{0,4})/, '$1/$2/$3');
  } else if (digits.length >= 3) {
      return digits.replace(/^(\d{2})(\d{0,2})/, '$1/$2');
  }
  return digits;
};

const isValidDate = (dateString) => {
    // Expected format: DD/MM/YYYY
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return false;
    
    const [day, month, year] = dateString.split('/').map(Number);
    
    if (day < 1 || day > 31) return false;
    if (month < 1 || month > 12) return false;
    if (year < 1900 || year > 2100) return false;

    // Simple check for days in month
    const daysInMonth = new Date(year, month, 0).getDate();
    return day <= daysInMonth;
};

export default function NovoCadastro() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isViewMode = !location.pathname.includes('/editar') && !!id;
  const isEditMode = location.pathname.includes('/editar') && !!id;
  
  const nomeHospitalRef = useRef(null); // Ref for "Nome do Hospital" (which is state.nomeFantasia)

  const [clientData, setClientData] = useState({
    cnpj: '',
    nomeHospital: '', // This will be "Razão Social"
    nomeFantasia: '', // This will be "Nome do Hospital"
    email1: '',
    email2: '',
    contato1: '',
    contato2: '',
    tipoCliente: 'CEMIG' // Default
  });

  const [equipments, setEquipments] = useState([
    { id: 1, equipamento: '', modelo: '', numeroSerie: '', dataNota: '' }
  ]);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (id) {
      fetchClientData(id);
    } else {
      // Reset form when entering "New Client" mode
      setClientData({
        cnpj: '',
        nomeHospital: '',
        nomeFantasia: '',
        email1: '',
        email2: '',
        contato1: '',
        contato2: '',
        tipoCliente: 'CEMIG'
      });
      setEquipments([{ id: 1, equipamento: '', modelo: '', numeroSerie: '', dataNota: '' }]);
      setErrors({});
      setSuccessMessage('');
      setErrorMessage('');
    }
  }, [id]);

  const fetchClientData = async (clientId) => {
    try {
      setLoading(true);
      const response = await api.get(`/clients/${clientId}`);
      const { client, equipments: clientEquipments } = response.data;
      
      setClientData({
        cnpj: client.cnpj,
        nomeHospital: client.nome_hospital,
        nomeFantasia: client.nome_fantasia || '',
        email1: client.email1,
        email2: client.email2 || '',
        contato1: client.contato1,
        contato2: client.contato2 || '',
        tipoCliente: client.tipo_cliente
      });

      if (clientEquipments && clientEquipments.length > 0) {
        setEquipments(clientEquipments.map(eq => ({
            id: eq.id,
            equipamento: eq.equipamento,
            modelo: eq.modelo,
            numeroSerie: eq.numero_serie, // Map from snake_case
            dataNota: eq.data_nota      // Map from snake_case
        })));
      }
    } catch (error) {
      console.error('Error fetching client:', error);
      setErrorMessage('Erro ao carregar dados do cliente.');
    } finally {
      setLoading(false);
    }
  };

  const [loadingCnpj, setLoadingCnpj] = useState(false);

  const fetchCNPJData = async (cnpj) => {
    setLoadingCnpj(true);
    setErrors(prev => ({ ...prev, cnpj: '' })); // Clear previous errors
    
    try {
      const cleanCNPJ = cnpj.replace(/\D/g, '');
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
      
      if (!response.ok) {
        throw new Error('CNPJ não encontrado ou erro na consulta');
      }

      const data = await response.json();
      
      setClientData(prev => ({
        ...prev,
        nomeHospital: data.razao_social || '', // Razão Social maps to nomeHospital
        // nomeFantasia: '', // Keep empty or user managed (Nome do Hospital)
        email1: data.email || '',
        email2: '',
        // contato1: '', // Do NOT populate contact
        // contato2: '',
      }));

      // Focus the "Nome do Hospital" input (which is mapped to nomeFantasia state)
      if (nomeHospitalRef.current) {
        nomeHospitalRef.current.focus();
      }

    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
      setErrors(prev => ({ ...prev, cnpj: 'Erro ao buscar CNPJ. Verifique se está correto.' }));
    } finally {
      setLoadingCnpj(false);
    }
  };

  const formatCNPJ = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  // ... (keeping other helpers same, reusing them from closure if possible or redefining but since this is a big block replace mostly, I need to check where I cut)
  // Wait, I am replacing from line 1. So I need to include everything.

  const formatDate = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1/$2')
      .replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3')
      .replace(/(\d{4})\d+?$/, '$1');
  };

  const validateEmail = (email) => {
    const regex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    return regex.test(email);
  };

  const validateField = (name, value) => {
    switch (name) {
      case 'cnpj':
        if (!value) return 'CNPJ é obrigatório';
        if (value.length < 18) return 'CNPJ incompleto';
        return '';
      case 'nomeHospital': // Validating Razão Social
        if (!value) return 'Razão Social é obrigatória';
        return '';
      case 'email1':
        if (!value) return 'E-mail 1 é obrigatório';
        if (!validateEmail(value)) return 'E-mail inválido';
        return '';
      case 'email2':
        if (value && !validateEmail(value)) return 'E-mail inválido';
        return '';
      case 'contato1':
        if (!value) return 'Contato 1 é obrigatório';
        if (value.length < 10) return 'Contato inválido';
        return '';
      case 'equipamento':
        if (!value) return 'Obrigatório';
        return '';
      case 'modelo':
        if (!value) return 'Obrigatório';
        return '';
      case 'dataNota':
        if (value && value.length > 0 && value.length < 10) return 'Data incompleta';
        return '';
      default:
        return '';
    }
  };

  const handleClientChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;
    
    if (name === 'cnpj') {
      formattedValue = formatCNPJ(value);
    } else if (name === 'contato1' || name === 'contato2') {
        formattedValue = formatPhone(value);
    }

    setClientData(prev => ({ ...prev, [name]: formattedValue }));

    // Trigger lookup when full CNPJ is entered (14 digits + formatting = 18 chars)
    if (name === 'cnpj') {
      const cleanValue = formattedValue.replace(/\D/g, '');
      if (cleanValue.length === 14) {
        fetchCNPJData(cleanValue);
      }
    }
  };

  const handleEquipmentChange = (id, field, value) => {
    let formattedValue = value;
    
    if (field === 'dataNota') {
      formattedValue = formatDate(value);
    }

    setEquipments(prev => prev.map(eq => 
      eq.id === id ? { ...eq, [field]: formattedValue } : eq
    ));
  };

  const addEquipment = () => {
    setEquipments(prev => [
      ...prev,
      { id: Date.now(), equipamento: '', modelo: '', numeroSerie: '', dataNota: '' }
    ]);
  };

  const removeEquipment = (id) => {
    if (equipments.length === 1) return;
    setEquipments(prev => prev.filter(eq => eq.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    setLoading(true);

    const newErrors = {};

    // Validate client data
    for (const key in clientData) {
        const error = validateField(key, clientData[key]);
        if (error) {
            newErrors[key] = error;
        }
    }

    // Validate equipment data
    equipments.forEach((eq, index) => {
        const eqFields = ['equipamento', 'modelo', 'numeroSerie', 'dataNota'];
        eqFields.forEach(field => {
            const error = validateField(field, eq[field]);
            if (error) {
                newErrors[`eq-${eq.id}-${field}`] = error;
            }
        });
        // Validate Dates
        if (eq.dataNota && !isValidDate(eq.dataNota)) {
            newErrors[`eq-${eq.id}-dataNota`] = 'Data inválida (DD/MM/AAAA)';
        }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setErrorMessage('Por favor, corrija os erros no formulário.');
      setLoading(false);
      return;
    }

    try {
      if (id) {
        await api.put(`/clients/${id}`, {
          clientData,
          equipments
        });
        setSuccessMessage('Cliente atualizado com sucesso!');
      } else {
        await api.post('/clients', {
          clientData,
          equipments
        });
        setSuccessMessage('Cliente cadastrado com sucesso!');
      }
      
      // Clear form if new registration
      if (!id) {
        setClientData({
            cnpj: '',
            nomeHospital: '',
            nomeFantasia: '',
            email1: '',
            email2: '',
            contato1: '',
            contato2: '',
            tipoCliente: 'CEMIG'
        });
        setEquipments([{ id: 1, equipamento: '', modelo: '', numeroSerie: '', dataNota: '' }]);
      }
      setErrors({});

      // Clear success message after 5 seconds
      // Clear success message after 5 seconds and redirect if edit/new
      setTimeout(() => {
        setSuccessMessage('');
        if (id) navigate('/clientes/lista');
      }, 2000);

    } catch (error) {
      console.error('Error saving client:', error);
      const message = error.response?.data?.message || 'Erro ao cadastrar cliente';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="clientes-container">
      <div className="page-header">
        <h1 className="page-title">
          <Building2 size={32} /> {isViewMode ? 'Visualizar Cliente' : isEditMode ? 'Editar Cliente' : 'Novo Cadastro de Cliente'}
        </h1>
        <div className="action-bar" style={{ marginTop: 0 }}>
             {isViewMode && (
               <button className="btn-primary" onClick={() => navigate(`/clientes/editar/${id}`)}>
                  <Edit size={18} /> Editar
               </button>
             )}
             <button className="btn-secondary">
                <Printer size={18} /> Imprimir Ficha
             </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="alert alert-error">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {!isViewMode ? (
          <>
            {/* DADOS DO CLIENTE - MODE EDIT/CREATE */}
            <div className="client-form-card">
              <h2 className="form-section-title">Dados da Instituição</h2>
              
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">
                    CNPJ * 
                    {loadingCnpj && <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#6366f1' }}>Buscando dados...</span>}
                  </label>
                  <input 
                    type="text" 
                    name="cnpj" 
                    value={clientData.cnpj}
                    onChange={handleClientChange}
                    required 
                    maxLength={18}
                    placeholder="00.000.000/0000-00"
                    className={`form-input ${errors.cnpj ? 'input-error' : ''}`}
                    disabled={loadingCnpj}
                  />
                  {errors.cnpj && <span className="error-text">{errors.cnpj}</span>}
                </div>
                
                <div className="form-group">
                  <label className="form-label">Razão Social *</label>
                  <input 
                    type="text" 
                    name="nomeHospital"
                    value={clientData.nomeHospital}
                    onChange={handleClientChange}
                    required
                    placeholder="Razão Social"
                    className={`form-input ${errors.nomeHospital ? 'input-error' : ''}`}
                  />
                  {errors.nomeHospital && <span className="error-text">{errors.nomeHospital}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Nome do Hospital</label>
                  <input 
                    type="text" 
                    name="nomeFantasia"
                    value={clientData.nomeFantasia}
                    onChange={handleClientChange}
                    placeholder="Nome Popular / Fantasia"
                    className="form-input"
                    ref={nomeHospitalRef}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo de Cliente *</label>
                  <select 
                    name="tipoCliente" 
                    value={clientData.tipoCliente}
                    onChange={handleClientChange}
                    required
                    className="form-select"
                  >
                    <option value="CEMIG">CEMIG</option>
                    <option value="CIRURTEC">CIRURTEC</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">E-mail 1 *</label>
                  <input 
                    type="email" 
                    name="email1"
                    value={clientData.email1}
                    onChange={handleClientChange}
                    required
                    placeholder="admin@hospital.com"
                    className={`form-input ${errors.email1 ? 'input-error' : ''}`}
                  />
                  {errors.email1 && <span className="error-text">{errors.email1}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">E-mail 2</label>
                  <input 
                    type="email" 
                    name="email2"
                    value={clientData.email2}
                    onChange={handleClientChange}
                    placeholder="financeiro@hospital.com"
                    className={`form-input ${errors.email2 ? 'input-error' : ''}`}
                  />
                  {errors.email2 && <span className="error-text">{errors.email2}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Contato 1 *</label>
                  <input 
                    type="tel" 
                    name="contato1"
                    value={clientData.contato1}
                    onChange={handleClientChange}
                    required
                    placeholder="(31) 99999-9999"
                    className={`form-input ${errors.contato1 ? 'input-error' : ''}`}
                  />
                  {errors.contato1 && <span className="error-text">{errors.contato1}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Contato 2</label>
                  <input 
                    type="tel" 
                    name="contato2"
                    value={clientData.contato2}
                    onChange={handleClientChange}
                    placeholder="(31) 98888-8888"
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* EQUIPAMENTOS - MODE EDIT/CREATE */}
            <div className="client-form-card equipments-section">
              <h2 className="form-section-title">Equipamentos Instalados</h2>
              
              <div className="equipment-table-wrapper">
                <table className="equipment-table">
                  <thead>
                    <tr>
                      <th>Equipamento</th>
                      <th>Modelo</th>
                      <th>Número de Série</th>
                      <th>Data Nota Fiscal</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipments.map((eq) => (
                      <tr key={eq.id}>
                        <td>
                          <input 
                            type="text" 
                            value={eq.equipamento}
                            onChange={(e) => handleEquipmentChange(eq.id, 'equipamento', e.target.value)}
                            placeholder="Ex: Termodesinfectora"
                            className={`table-input ${errors[`eq-${eq.id}-equipamento`] ? 'input-error' : ''}`}
                          />
                          {errors[`eq-${eq.id}-equipamento`] && <span className="error-text">{errors[`eq-${eq.id}-equipamento`]}</span>}
                        </td>
                        <td>
                          <input 
                            type="text" 
                            value={eq.modelo}
                            onChange={(e) => handleEquipmentChange(eq.id, 'modelo', e.target.value)}
                            placeholder="Ex: XYZ-2000"
                            className={`table-input ${errors[`eq-${eq.id}-modelo`] ? 'input-error' : ''}`}
                          />
                          {errors[`eq-${eq.id}-modelo`] && <span className="error-text">{errors[`eq-${eq.id}-modelo`]}</span>}
                        </td>
                        <td>
                          <input 
                            type="text" 
                            value={eq.numeroSerie}
                            onChange={(e) => handleEquipmentChange(eq.id, 'numeroSerie', e.target.value)}
                            placeholder="SN123456"
                            className="table-input"
                          />
                        </td>
                        <td>
                          <input 
                            type="text" 
                            value={eq.dataNota}
                            onChange={(e) => handleEquipmentChange(eq.id, 'dataNota', e.target.value)}
                            placeholder="DD/MM/AAAA"
                            maxLength={10}
                            className={`table-input ${errors[`eq-${eq.id}-dataNota`] ? 'input-error' : ''}`}
                          />
                          {errors[`eq-${eq.id}-dataNota`] && <span className="error-text">{errors[`eq-${eq.id}-dataNota`]}</span>}
                        </td>
                        <td>
                          { !isViewMode && (
                        <button 
                          type="button" 
                          onClick={() => removeEquipment(eq.id)}
                          className="btn-icon-danger"
                          title="Remover Equipamento"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button 
                type="button" 
                onClick={addEquipment}
                className="btn-add-equip"
              >
                <Plus size={18} /> Adicionar mais equipamentos
              </button>
            </div>
          </>
        ) : (
          /* DOCUMENT VIEW MODE */
          <>
            <div className="client-form-card">
              <h2 className="form-section-title">Dados da Instituição</h2>
              <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">CNPJ</label>
                    <div className="document-value">{clientData.cnpj || '-'}</div>
                </div>
                <div className="form-group">
                    <label className="form-label">Razão Social</label>
                    <div className="document-value">{clientData.nomeHospital || '-'}</div>
                </div>
                <div className="form-group">
                    <label className="form-label">Nome do Hospital</label>
                    <div className="document-value">{clientData.nomeFantasia || '-'}</div>
                </div>
                <div className="form-group">
                    <label className="form-label">Tipo de Cliente</label>
                    <div className="document-value">
                        <span className={`badge badge-${clientData.tipoCliente?.toLowerCase()}`}>
                          {clientData.tipoCliente}
                        </span>
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">E-mail 1</label>
                    <div className="document-value">{clientData.email1 || '-'}</div>
                </div>
                <div className="form-group">
                    <label className="form-label">E-mail 2</label>
                    <div className="document-value">{clientData.email2 || '-'}</div>
                </div>
                <div className="form-group">
                    <label className="form-label">Contato 1</label>
                    <div className="document-value">{clientData.contato1 || '-'}</div>
                </div>
                <div className="form-group">
                    <label className="form-label">Contato 2</label>
                    <div className="document-value">{clientData.contato2 || '-'}</div>
                </div>
              </div>
            </div>

            <div className="client-form-card equipments-section">
              <h2 className="form-section-title">Equipamentos Instalados</h2>
              <div className="table-responsive">
                <table className="clients-table">
                  <thead>
                    <tr>
                      <th>Equipamento</th>
                      <th>Modelo</th>
                      <th>Número de Série</th>
                      <th>Data Nota Fiscal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipments.map((eq) => (
                      <tr key={eq.id}>
                        <td>{eq.equipamento || '-'}</td>
                        <td>{eq.modelo || '-'}</td>
                        <td>{eq.numeroSerie || '-'}</td>
                        <td>{eq.dataNota || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ACTIONS */}
        <div className="action-bar">
          <button type="button" className="btn-secondary" onClick={() => navigate('/clientes/lista')}>
            <ArrowLeft size={18} /> Voltar
          </button>
          {!isViewMode && (
            <button type="submit" className="btn-primary" disabled={loading}>
                <Save size={18} /> {loading ? 'Salvando...' : 'Salvar'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

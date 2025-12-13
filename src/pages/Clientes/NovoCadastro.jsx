import React, { useState } from 'react';
import { Building2, Plus, Save, Trash2, Printer } from 'lucide-react';
import './Clientes.css';

export default function NovoCadastro() {
  const [clientData, setClientData] = useState({
    cnpj: '',
    nomeHospital: '',
    nomeFantasia: '',
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

  const formatCNPJ = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
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
      case 'nomeHospital':
        if (!value) return 'Nome do Hospital é obrigatório';
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
      default:
        return '';
    }
  };

  const handleClientChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    
    if (name === 'cnpj') {
      finalValue = formatCNPJ(value);
    }

    setClientData(prev => ({ ...prev, [name]: finalValue }));

    // Validate
    const error = validateField(name, finalValue);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleEquipmentChange = (id, field, value) => {
    setEquipments(prev => prev.map(eq => 
      eq.id === id ? { ...eq, [field]: value } : eq
    ));

    const errorKey = `eq-${id}-${field}`;
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [errorKey]: error }));
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const hasErrors = Object.values(errors).some(error => error);
    const invalidEmail1 = clientData.email1 && !validateEmail(clientData.email1);
    const invalidEmail2 = clientData.email2 && !validateEmail(clientData.email2);

    if (hasErrors || invalidEmail1 || invalidEmail2) {
        alert("Por favor, corrija os campos inválidos antes de salvar.");
        return;
    }
    console.log("Dados do Cliente:", clientData);
    console.log("Equipamentos:", equipments);
    alert("Cadastro salvo no console (Simulação)!");
  };

  return (
    <div className="clientes-container">
      <div className="page-header">
        <h1 className="page-title">
          <Building2 size={32} /> Novo Cadastro de Cliente
        </h1>
        <div className="action-bar" style={{ marginTop: 0 }}>
             <button className="btn-secondary">
                <Printer size={18} /> Imprimir Ficha
             </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* DADOS DO CLIENTE */}
        <div className="client-form-card">
          <h2 className="form-section-title">Dados da Instituição</h2>
          
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">CNPJ *</label>
              <input 
                type="text" 
                name="cnpj" 
                value={clientData.cnpj}
                onChange={handleClientChange}
                required 
                maxLength={18}
                placeholder="00.000.000/0000-00"
                className={`form-input ${errors.cnpj ? 'input-error' : ''}`}
              />
              {errors.cnpj && <span className="error-text">{errors.cnpj}</span>}
            </div>
            
            <div className="form-group">
              <label className="form-label">Nome do Hospital *</label>
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
              <label className="form-label">Nome Fantasia</label>
              <input 
                type="text" 
                name="nomeFantasia"
                value={clientData.nomeFantasia}
                onChange={handleClientChange}
                placeholder="Nome Popular"
                className="form-input"
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

        {/* EQUIPAMENTOS */}
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
                        placeholder="Ex: Tomógrafo"
                        className="table-input"
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        value={eq.modelo}
                        onChange={(e) => handleEquipmentChange(eq.id, 'modelo', e.target.value)}
                        placeholder="Ex: XYZ-2000"
                        className="table-input"
                      />
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
                        type="date" 
                        value={eq.dataNota}
                        onChange={(e) => handleEquipmentChange(eq.id, 'dataNota', e.target.value)}
                        className="table-input"
                      />
                    </td>
                    <td>
                      {equipments.length > 1 && (
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

        {/* ACTIONS */}
        <div className="action-bar">
          <button type="button" className="btn-secondary">Cancelar</button>
          <button type="submit" className="btn-primary">
            <Save size={18} /> Salvar Cadastro
          </button>
        </div>

      </form>
    </div>
  );
}

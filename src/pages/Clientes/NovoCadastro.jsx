import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Building2, Plus, Save, Trash2, Printer, ArrowLeft, Edit, X, ChevronDown, Copy, Check } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { checkPermission, PERMISSIONS } from '../../utils/permissions';
import './Clientes.css';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ptBR } from 'date-fns/locale';

// UI Components
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

registerLocale('pt-BR', ptBR);

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

const maskDate = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length >= 5) {
      return digits.replace(/^(\d{2})(\d{2})(\d{0,4})/, '$1/$2/$3');
  } else if (digits.length >= 3) {
      return digits.replace(/^(\d{2})(\d{0,2})/, '$1/$2');
  }
  return digits;
};

const isValidDate = (dateString) => {
    // Expected format: YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
    
    // Check if it is a real date
    const date = new Date(dateString);
    const timestamp = date.getTime();
    if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) return false;
    return date.toISOString().startsWith(dateString);
};

export default function NovoCadastro() {
  const { id } = useParams(); // DocID is sanitized CNPJ
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
    contato2: ''
  });

  const [equipments, setEquipments] = useState([
    { id: 1, equipamento: '', modelo: '', numeroSerie: '', dataNota: '', tipoInstalacao: 'BAUMER' }
  ]);

  const [equipmentTypes, setEquipmentTypes] = useState([]); // Store hierarchy


  const [expandedEquipment, setExpandedEquipment] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [warningMessage, setWarningMessage] = useState(''); // For duplicate CNPJ warning
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [cnpjCopied, setCnpjCopied] = useState(false);
  const [email1Copied, setEmail1Copied] = useState(false);
  const [email2Copied, setEmail2Copied] = useState(false);
  
  // Delete modal states
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'CLIENT' | 'EQUIPMENT', data: any }
  
  const { user: currentUser } = useContext(AuthContext);
  const canDeleteClient = checkPermission(currentUser, PERMISSIONS.DELETE_CLIENT);
  const canDeleteEquipment = checkPermission(currentUser, PERMISSIONS.DELETE_EQUIPMENT);

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
        contato2: ''
      });
      setEquipments([{ id: Date.now(), equipamento: '', modelo: '', numeroSerie: '', dataNota: '', tipoInstalacao: 'BAUMER' }]);
      setErrors({});
      setSuccessMessage('');
      setErrorMessage('');
    }
  }, [id]);

  // Fetch Equipment Hierarchy
  useEffect(() => {
    const fetchHierarchy = async () => {
        try {
            const settingsDoc = await getDoc(doc(db, 'settings', 'equipment_hierarchy'));
            if (settingsDoc.exists()) {
                const data = settingsDoc.data();
                // data.types is an array: [ { id, name, models: [ { id, name } ] } ]
                const types = (data.types || []).map(type => ({
                    id: type.id,
                    name: type.name,
                    models: (type.models || []).map(model => ({
                        id: model.id,
                        name: model.name
                    }))
                }));
                setEquipmentTypes(types);
            }
        } catch (error) {
            console.error('Error fetching equipment hierarchy:', error);
        }
    };
    fetchHierarchy();
  }, []);

  // Check for duplicate CNPJ warning from navigation state
  useEffect(() => {
    if (location.state?.duplicateCNPJ) {
      setWarningMessage('Este cliente já possui cadastro');
      // Clear the state to avoid showing on refresh
      window.history.replaceState({}, document.title);
      
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setWarningMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  const fetchClientData = async (docId) => {
    try {
      setLoading(true);
      const clientDoc = await getDoc(doc(db, 'clients', docId));
      
      if (clientDoc.exists()) {
        const client = clientDoc.data();
        
        // Fetch equipments associated with this client
        const eqQuery = query(collection(db, 'equipments'), where('clientId', '==', client.cnpj));
        const eqSnapshot = await getDocs(eqQuery);
        const clientEquipments = eqSnapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
        }));

        setClientData({
          cnpj: client.cnpj,
          nomeHospital: client.nome_hospital,
          nomeFantasia: client.nome_fantasia || '',
          email1: client.emails?.[0] || '',
          email2: client.emails?.[1] || '',
          contato1: client.contatos?.[0] || '',
          contato2: client.contatos?.[1] || ''
        });

        if (clientEquipments.length > 0) {
          setEquipments(clientEquipments.map(eq => ({
              id: eq.id,
              equipamento: eq.equipamento,
              modelo: eq.modelo,
              numeroSerie: eq.numeroSerie,
              dataNota: eq.dataNota,
              tipoInstalacao: eq.tipoInstalacao || 'BAUMER'
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching client:', error);
      setErrorMessage('Erro ao carregar dados do cliente.');
    } finally {
      setLoading(false);
    }
  };



  const fetchCNPJData = async (cnpj) => {
    setLoadingCnpj(true);
    setErrors(prev => ({ ...prev, cnpj: '' })); // Clear previous errors
    
    const cleanCNPJ = cnpj.replace(/\D/g, '');

    try {
      // 1. Check local database first
      const checkDoc = await getDoc(doc(db, 'clients', cleanCNPJ));
      if (checkDoc.exists()) {
         // Redirect to existing client with warning
         navigate(`/clientes/${cleanCNPJ}`, { state: { duplicateCNPJ: true } });
         return; 
      }

      // 2. If not found, fetch from BrasilAPI
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
      
      if (!response.ok) {
        throw new Error('CNPJ não encontrado ou erro na consulta');
      }

      const data = await response.json();
      
      setClientData(prev => ({
        ...prev,
        nomeHospital: data.razao_social || '', // Razão Social maps to nomeHospital
        // nomeFantasia: '', // Keep empty or user managed (Nome do Hospital)
        email1: data.email ? data.email.toLowerCase() : '',
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
      setErrors(prev => ({ ...prev, cnpj: 'CNPJ inexistente ou inválido. Por favor, verifique o número digitado.' }));
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

  const handleCopyCNPJ = () => {
    if (!clientData.cnpj) return;
    const items = clientData.cnpj.replace(/\D/g, '');
    navigator.clipboard.writeText(items);
    setCnpjCopied(true);
    setTimeout(() => setCnpjCopied(false), 2000);
  };

  const handleCopyText = (text, setCopiedState) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
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

  const calculateMaintenanceDates = (invoiceDate) => {
    if (!invoiceDate) return { threeMonths: '-', sixMonths: '-', nineMonths: '-', twelveMonths: '-' };
    
    const date = new Date(invoiceDate + 'T00:00:00');
    
    const addDays = (date, days) => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result.toLocaleDateString('pt-BR');
    };
    
    return {
      threeMonths: addDays(date, 90),
      sixMonths: addDays(date, 180),
      nineMonths: addDays(date, 270),
      twelveMonths: addDays(date, 365)
    };
  };

  const calculateRemainingWarranty = (invoiceDate) => {
    if (!invoiceDate) return '-';
    
    const startDate = new Date(invoiceDate + 'T00:00:00');
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 365);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Garantia Expirada';
    return `${diffDays} dias`;
  };

  const toggleEquipmentExpand = (equipmentId) => {
    setExpandedEquipment(prev => prev === equipmentId ? null : equipmentId);
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
      case 'nomeFantasia': // Validating Nome do Hospital
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
      case 'dataNota':
        if (!value) return 'Data da Nota é obrigatória';
        if (!isValidDate(value)) return 'Data inválida';
        return '';
      default:
        return '';
    }
  };

  const handleClientChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;
    
    // Apply Uppercase to text fields
    // emails usually standard lowercase, but kept as is or could be lower. 
    // User asked "everything in uppercase". I will apply to text fields.
    const isTextField = ['nomeHospital', 'nomeFantasia'].includes(name);

    if (name === 'cnpj') {
      formattedValue = formatCNPJ(value);
    } else if (name === 'contato1' || name === 'contato2') {
        formattedValue = formatPhone(value);
    } else if (name === 'email1' || name === 'email2') {
        formattedValue = value.toLowerCase();
    } else if (isTextField) {
        formattedValue = value.toUpperCase();
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
    
    // Enforce Uppercase on equipment text fields
    if (['numeroSerie'].includes(field)) { // Removed equipamento/modelo from automatic uppercase since they are now selects (but values are already upper)
        formattedValue = value.toUpperCase();
    }

    if (field === 'dataNota') {
        if (value instanceof Date) {
            // value is a Date object from DatePicker
            // Format to YYYY-MM-DD for storage
            const year = value.getFullYear();
            const month = String(value.getMonth() + 1).padStart(2, '0');
            const day = String(value.getDate()).padStart(2, '0');
            formattedValue = `${year}-${month}-${day}`;
        } else if (value === null) {
            formattedValue = '';
        } else {
             formattedValue = value;
        }
    }

    setEquipments(prev => prev.map(eq => {
      if (eq.id === id) {
          const updates = { [field]: formattedValue };
          
          // If changing Equipment Type, clear the Model
          if (field === 'equipamento') {
              updates.modelo = '';
          }
          return { ...eq, ...updates };
      }
      return eq;
    }));
  };

  const addEquipment = () => {
    setEquipments(prev => [
      ...prev,
      { id: Date.now(), equipamento: '', modelo: '', numeroSerie: '', dataNota: '', tipoInstalacao: 'BAUMER' }
    ]);
  };

  const removeEquipment = (id) => {
    // This function is now used to perform the actual state update
    if (equipments.length === 1) return;
    setEquipments(prev => prev.filter(eq => eq.id !== id));
  };

  const handleRequestDeleteEquipment = (eq) => {
    if (equipments.length === 1) return;
    setDeleteTarget({ type: 'EQUIPMENT', data: eq });
  };

  const handleDeleteClick = () => {
    setDeleteTarget({ type: 'CLIENT', data: clientData });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'EQUIPMENT') {
        removeEquipment(deleteTarget.data.id);
        setDeleteTarget(null);
        return;
    }

    // CLIENT Deletion
    try {
      const sanitizedCnpj = id.replace(/\D/g, '');
      
      // Delete associated equipments first? Or rely on a cleanup task.
      // For now, let's delete associated equipments.
      const eqQuery = query(collection(db, 'equipments'), where('clientId', '==', clientData.cnpj));
      const eqSnapshot = await getDocs(eqQuery);
      const batch = writeBatch(db);
      
      eqSnapshot.docs.forEach(d => {
          batch.delete(d.ref);
      });
      
      batch.delete(doc(db, 'clients', sanitizedCnpj));
      await batch.commit();
      
      navigate('/clientes/lista');
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      setErrorMessage('Erro ao excluir cliente. Tente novamente.');
      setDeleteTarget(null);
    }
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
    // Ensure at least one equipment is present (though the UI usually keeps one empty row, we need to ensure it's filled)
    const hasValidEquipment = equipments.some(eq => eq.equipamento && eq.modelo && eq.dataNota);

    if (!hasValidEquipment) {
         setErrorMessage('É obrigatório cadastrar ao menos um equipamento completo (com data da nota).');
         setLoading(false);
         // Highlight empty fields of the first one
         equipments.forEach((eq, index) => {
            ['equipamento', 'modelo', 'dataNota'].forEach(field => {
                if (!eq[field]) newErrors[`eq-${eq.id}-${field}`] = validateField(field, '');
            });
         });
         setErrors(prev => ({...prev, ...newErrors}));
         return; 
    }

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
            newErrors[`eq-${eq.id}-dataNota`] = 'Data inexistente';
        }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setErrorMessage('Por favor, corrija os erros no formulário (verifique datas e campos obrigatórios).');
      setLoading(false);
      return;
    }

    try {
      const sanitizedCnpj = clientData.cnpj.replace(/\D/g, '');
      const batch = writeBatch(db);

      const clientRef = doc(db, 'clients', sanitizedCnpj);
      const clientPayload = {
        cnpj: clientData.cnpj,
        nome_hospital: clientData.nomeHospital,
        nome_fantasia: clientData.nomeFantasia,
        emails: [clientData.email1, clientData.email2].filter(Boolean),
        contatos: [clientData.contato1, clientData.contato2].filter(Boolean),
        updatedAt: new Date()
      };

      if (!id) {
        clientPayload.createdAt = new Date();
      }

      batch.set(clientRef, clientPayload, { merge: true });

      // Handle Equipments
      // To simplify, we'll delete and re-add or just set with their IDs
      // But we need to know which ones to delete if they were removed in the UI
      
      // If editing, find existing equipments to see if any need deletion
      if (id) {
          const eqQuery = query(collection(db, 'equipments'), where('clientId', '==', clientData.cnpj));
          const eqSnapshot = await getDocs(eqQuery);
          const existingEqIds = eqSnapshot.docs.map(d => d.id);
          const currentEqIds = equipments.map(eq => String(eq.id));
          
          existingEqIds.forEach(exId => {
              if (!currentEqIds.includes(exId)) {
                  batch.delete(doc(db, 'equipments', exId));
              }
          });
      }

      for (const eq of equipments) {
          if (!eq.equipamento || !eq.modelo) continue;
          
          const eqId = isNaN(eq.id) ? doc(collection(db, 'equipments')).id : String(eq.id);
          const eqRef = doc(db, 'equipments', eqId);
          
          batch.set(eqRef, {
              clientId: clientData.cnpj,
              equipamento: eq.equipamento,
              modelo: eq.modelo,
              numeroSerie: eq.numeroSerie,
              dataNota: eq.dataNota,
              tipoInstalacao: eq.tipoInstalacao,
              updatedAt: new Date()
          }, { merge: true });
      }

      await batch.commit();

      if (id) {
        setSuccessMessage('Cliente atualizado com sucesso!');
      } else {
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
            contato2: ''
        });
        setEquipments([{ id: Date.now(), equipamento: '', modelo: '', numeroSerie: '', dataNota: '', tipoInstalacao: 'BAUMER' }]);
      }
      setErrors({});

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
        if (id) navigate('/clientes/lista');
      }, 2000);

    } catch (error) {
      console.error('Error saving client:', error);
      setErrorMessage('Erro ao salvar os dados do cliente.');
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
      
      {warningMessage && (
        <div className="alert alert-warning" style={{ backgroundColor: '#fef3c7', borderColor: '#fbbf24', color: '#92400e' }}>
          {warningMessage}
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
            <div className="card">
              <h2 className="form-section-title">Dados da Instituição</h2>
              
              <div className="form-grid">
                <Input
                  label="CNPJ"
                  name="cnpj"
                  value={clientData.cnpj}
                  onChange={handleClientChange}
                  required
                  maxLength={18}
                  placeholder="00.000.000/0000-00"
                  error={errors.cnpj}
                  disabled={loadingCnpj || (id && !checkPermission(currentUser, PERMISSIONS.EDIT_CLIENT_CNPJ))}
                />
                
                <Input
                  label="Razão Social"
                  name="nomeHospital"
                  value={clientData.nomeHospital}
                  onChange={handleClientChange}
                  required
                  placeholder="Razão Social"
                  error={errors.nomeHospital}
                  readOnly
                  style={{ backgroundColor: '#f8fafc', cursor: 'not-allowed' }}
                />

                <Input
                  ref={nomeHospitalRef}
                  label="Nome do Hospital"
                  name="nomeFantasia"
                  value={clientData.nomeFantasia}
                  onChange={handleClientChange}
                  placeholder="Nome Popular / Fantasia"
                  error={errors.nomeFantasia}
                />

                <Input
                  label="E-mail 1"
                  name="email1"
                  type="email"
                  value={clientData.email1}
                  onChange={handleClientChange}
                  required
                  placeholder="admin@hospital.com"
                  error={errors.email1}
                />

                <Input
                  label="E-mail 2"
                  name="email2"
                  type="email"
                  value={clientData.email2}
                  onChange={handleClientChange}
                  placeholder="financeiro@hospital.com"
                  error={errors.email2}
                />

                <Input
                  label="Contato 1"
                  name="contato1"
                  type="tel"
                  value={clientData.contato1}
                  onChange={handleClientChange}
                  required
                  placeholder="(31) 99999-9999"
                  error={errors.contato1}
                />

                <Input
                  label="Contato 2"
                  name="contato2"
                  type="tel"
                  value={clientData.contato2}
                  onChange={handleClientChange}
                  placeholder="(31) 98888-8888"
                />
              </div>
            </div>

            {/* EQUIPAMENTOS - MODE EDIT/CREATE */}
            <div className="card equipments-section">
              <h2 className="form-section-title">Equipamentos Instalados</h2>
              
              <div className="equipment-table-wrapper">
                <table className="equipment-table">
                  <thead>
                    <tr>
                      <th>Equipamento</th>
                      <th>Modelo</th>
                      <th>Número de Série</th>
                      <th>Tipo</th>
                      <th>Data Nota Fiscal</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipments.map((eq) => (
                      <tr key={eq.id}>
                        <td data-label="Equipamento">
                          <select
                            value={eq.equipamento}
                            onChange={(e) => handleEquipmentChange(eq.id, 'equipamento', e.target.value)}
                            className={`modern-select ${errors[`eq-${eq.id}-equipamento`] ? 'input-error' : ''}`}
                          >
                            <option value="">Selecione...</option>
                            {equipmentTypes.map(type => (
                                <option key={type.id} value={type.name}>{type.name}</option>
                            ))}
                          </select>
                          {errors[`eq-${eq.id}-equipamento`] && <span className="error-text">{errors[`eq-${eq.id}-equipamento`]}</span>}
                        </td>
                        <td data-label="Modelo">
                          <select
                            value={eq.modelo}
                            onChange={(e) => handleEquipmentChange(eq.id, 'modelo', e.target.value)}
                            className={`modern-select ${errors[`eq-${eq.id}-modelo`] ? 'input-error' : ''}`}
                            disabled={!eq.equipamento}
                          >
                            <option value="">Selecione...</option>
                            {equipmentTypes.find(t => t.name === eq.equipamento)?.models.map(model => (
                                <option key={model.id} value={model.name}>{model.name}</option>
                            ))}
                          </select>
                          {errors[`eq-${eq.id}-modelo`] && <span className="error-text">{errors[`eq-${eq.id}-modelo`]}</span>}
                        </td>
                        <td data-label="Número de Série">
                          <input 
                            type="text" 
                            name={`numeroSerie-${eq.id}`}
                            value={eq.numeroSerie} 
                            onChange={(e) => handleEquipmentChange(eq.id, 'numeroSerie', e.target.value)}
                            placeholder="SN123456"
                            className="table-input"
                          />
                        </td>
                        <td data-label="Tipo">
                          <select 
                            value={eq.tipoInstalacao} 
                            onChange={(e) => handleEquipmentChange(eq.id, 'tipoInstalacao', e.target.value)}
                            className="modern-select"
                          >
                            <option value="BAUMER">BAUMER</option>
                            <option value="CIRURTEC">CIRURTEC</option>
                            <option value="CEMIG">CEMIG</option>
                          </select>
                        </td>
                        <td data-label="Data Nota Fiscal">
                          <DatePicker
                            selected={eq.dataNota ? new Date(eq.dataNota + 'T00:00:00') : null}
                            onChange={(date) => handleEquipmentChange(eq.id, 'dataNota', date)}
                            onChangeRaw={(e) => {
                                const masked = maskDate(e.target.value);
                                e.target.value = masked;
                            }}
                            dateFormat="dd/MM/yyyy"
                            locale="pt-BR"
                            placeholderText="DD/MM/AAAA"
                            className={`table-input ${errors[`eq-${eq.id}-dataNota`] ? 'input-error' : ''}`}
                            wrapperClassName="w-full"
                          />
                          {errors[`eq-${eq.id}-dataNota`] && <span className="error-text">{errors[`eq-${eq.id}-dataNota`]}</span>}
                        </td>
                        <td className="action-cell">
                          { !isViewMode && canDeleteEquipment && (
                        <button 
                          type="button" 
                          onClick={() => handleRequestDeleteEquipment(eq)}
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
                    <div className="document-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>{clientData.cnpj || '-'}</span>
                        {clientData.cnpj && (
                            <button 
                                type="button" 
                                onClick={handleCopyCNPJ} 
                                style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    cursor: 'pointer', 
                                    color: cnpjCopied ? '#16a34a' : '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.8rem'
                                }}
                                title="Copiar CNPJ (apenas números)"
                            >
                                {cnpjCopied ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        )}
                    </div>
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
                    <label className="form-label">E-mail 1</label>
                    <div className="document-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>{clientData.email1 || '-'}</span>
                        {clientData.email1 && (
                            <button 
                                type="button" 
                                onClick={() => handleCopyText(clientData.email1, setEmail1Copied)} 
                                style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    cursor: 'pointer', 
                                    color: email1Copied ? '#16a34a' : '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.8rem'
                                }}
                                title="Copiar E-mail"
                            >
                                {email1Copied ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        )}
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">E-mail 2</label>
                    <div className="document-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>{clientData.email2 || '-'}</span>
                        {clientData.email2 && (
                            <button 
                                type="button" 
                                onClick={() => handleCopyText(clientData.email2, setEmail2Copied)} 
                                style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    cursor: 'pointer', 
                                    color: email2Copied ? '#16a34a' : '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.8rem'
                                }}
                                title="Copiar E-mail"
                            >
                                {email2Copied ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        )}
                    </div>
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
                <table className="clients-table register">
                  <thead>
                    <tr>
                      <th>Equipamento</th>
                      <th>Modelo</th>
                      <th>Número de Série</th>
                      <th>Tipo</th>
                      <th>Data Nota Fiscal</th>
                      <th>Garantia</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipments.map((eq) => {
                      const maintenanceDates = calculateMaintenanceDates(eq.dataNota);
                      const remainingWarranty = calculateRemainingWarranty(eq.dataNota);
                      const isExpanded = expandedEquipment === eq.id;
                      
                      return (
                        <React.Fragment key={eq.id}>
                          <tr>
                            <td data-label="Equipamento">{eq.equipamento || '-'}</td>
                            <td data-label="Modelo">{eq.modelo || '-'}</td>
                            <td data-label="Número de Série">{eq.numeroSerie || '-'}</td>
                            <td data-label="Tipo">
                              <span className={`badge badge-${eq.tipoInstalacao?.toLowerCase()}`}>
                                {eq.tipoInstalacao}
                              </span>
                            </td>
                            <td data-label="Data Nota Fiscal">{eq.dataNota ? eq.dataNota.split('-').reverse().join('/') : '-'}</td>
                            <td data-label="Garantia" style={{ fontWeight: '600', color: remainingWarranty === 'Garantia Expirada' ? '#dc2626' : '#059669' }}>
                              {remainingWarranty}
                            </td>
                            <td data-label="Ações">
                              <button
                                type="button"
                                onClick={() => toggleEquipmentExpand(eq.id)}
                                className="btn-expand-equipment"
                                title="Ver cronograma de troca de peças"
                              >
                                <ChevronDown 
                                  size={20} 
                                  style={{ 
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s'
                                  }} 
                                />
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="equipment-details-row">
                              <td colSpan="7">
                                <div className="maintenance-schedule">
                                  <h3 className="maintenance-title">Troca de Peças</h3>
                                  <div className="maintenance-table-wrapper">
                                    <table className="maintenance-table">
                                      <thead>
                                        <tr>
                                          <th>Data NF</th>
                                          <th>3 Meses</th>
                                          <th>6 Meses</th>
                                          <th>9 Meses</th>
                                          <th>12 Meses</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr>
                                          <td>{eq.dataNota ? eq.dataNota.split('-').reverse().join('/') : '-'}</td>
                                          <td data-label="3 Meses">
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                              {maintenanceDates.threeMonths}
                                              {eq.sentNotifications?.includes(3) && <Check size={16} color="#0ea5e9" strokeWidth={3} title="E-mail enviado" />}
                                            </div>
                                          </td>
                                          <td data-label="6 Meses">
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                              {maintenanceDates.sixMonths}
                                              {eq.sentNotifications?.includes(6) && <Check size={16} color="#0ea5e9" strokeWidth={3} title="E-mail enviado" />}
                                            </div>
                                          </td>
                                          <td data-label="9 Meses">
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                              {maintenanceDates.nineMonths}
                                              {eq.sentNotifications?.includes(9) && <Check size={16} color="#0ea5e9" strokeWidth={3} title="E-mail enviado" />}
                                            </div>
                                          </td>
                                          <td data-label="12 Meses">
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                              {maintenanceDates.twelveMonths}
                                              {eq.sentNotifications?.includes(12) && <Check size={16} color="#0ea5e9" strokeWidth={3} title="E-mail enviado" />}
                                            </div>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ACTIONS */}
        <div className="action-bar">
          {isEditMode && canDeleteClient && (
            <button 
              type="button" 
              onClick={handleDeleteClick}
              className="btn-delete-account"
              style={{ marginRight: 'auto' }}
            >
              <Trash2 size={18} /> Excluir Cliente
            </button>
          )}
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
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        expectedValue={deleteTarget?.type === 'EQUIPMENT' 
            ? (deleteTarget.data.modelo || 'CONFIRMAR') 
            : clientData.cnpj} 
        title={deleteTarget?.type === 'EQUIPMENT' ? "Remover Equipamento" : "Confirmar Exclusão"}
        description={
            deleteTarget?.type === 'EQUIPMENT' ? (
                <>
                    <p style={{ marginBottom: '1rem' }}>
                        Tem certeza que deseja remover este equipamento da lista?
                    </p>
                    <p style={{ marginBottom: '1rem', fontWeight: 'bold' }}>
                        {deleteTarget.data.equipamento} - {deleteTarget.data.modelo || '(Sem modelo)'}
                    </p>
                </>
            ) : (
                <>
                    <p style={{ marginBottom: '1rem', color: '#dc2626', fontWeight: '500' }}>
                        ⚠️ Esta ação é permanente e não pode ser desfeita!
                    </p>
                    <p style={{ marginBottom: '1rem' }}>
                        Para confirmar a exclusão do cliente, digite o CNPJ abaixo:
                    </p>
                    <p style={{ marginBottom: '1rem', fontWeight: '600', fontSize: '1.1rem' }}>
                        {clientData.cnpj}
                    </p>
                </>
            )
        }
        instructionLabel={
            deleteTarget?.type === 'EQUIPMENT' 
            ? <span>Para confirmar, digite <strong>{deleteTarget.data.modelo || 'CONFIRMAR'}</strong> abaixo:</span>
            : null
        } 
        inputPlaceholder={""}
        confirmButtonText={deleteTarget?.type === 'EQUIPMENT' ? "Remover Equipamento" : "Excluir Cliente"}
      />
    </div>
  );
}

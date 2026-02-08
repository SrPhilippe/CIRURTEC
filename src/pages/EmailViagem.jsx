import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Copy, Users, Briefcase, Sparkles, X, Loader2, Mic, MicOff, MapPin, Truck, ChevronDown, ChevronUp, Layers, Save, RotateCcw } from 'lucide-react';
import './EmailViagem.css';
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ptBR } from 'date-fns/locale';

registerLocale('pt-BR', ptBR);

import { fetchCities } from '../services/ibgeService';
import { analyzeTripText, generateSubject } from '../services/geminiService';

// --- CONFIGURAÇÃO DA API GEMINI ---
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""; // A chave será injetada automaticamente pelo ambiente

export default function TravelEmail() {
  // --- ESTADO PRINCIPAL: GRUPOS DE VIAGEM ---
  const [tripGroups, setTripGroups] = useState([createEmptyTripGroup()]);

  const [copied, setCopied] = useState(false);
  
  // Estados para funcionalidades de IA e Voz
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingSubject, setIsGeneratingSubject] = useState(false);
  const [generatedSubject, setGeneratedSubject] = useState('');
  
  // Estado para reconhecimento de voz
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const previewRef = useRef(null);

  // --- CITY AUTOCOMPLETE STATE ---
  const allCitiesRef = useRef([]); // Stores all fetched cities
  const [citySearchResults, setCitySearchResults] = useState([]); // Stores filtered cities
  const [activeCityField, setActiveCityField] = useState(null); // { groupIndex, destIndex }
  const wrapperRef = useRef(null); // To detect clicks outside

  // --- AUTO-FOCUS NEW TASKS STATE ---
  const taskInputRefs = useRef({});
  const [focusTarget, setFocusTarget] = useState(null); // { groupIndex, destIndex, taskIndex }

  // Auto-focus effect
  useEffect(() => {
    if (focusTarget) {
        const { groupIndex, destIndex, taskIndex } = focusTarget;
        const key = `${groupIndex}-${destIndex}-${taskIndex}`;
        const el = taskInputRefs.current[key];
        if (el) {
            el.focus();
            setFocusTarget(null);
        }
    }
  }, [tripGroups, focusTarget]);

  // --- FETCH CITIES FROM IBGE (ON MOUNT) ---
  useEffect(() => {
    fetchCities()
      .then(mapped => {
        console.log(`Cidades carregadas: ${mapped.length}`); // DEBUG
        allCitiesRef.current = mapped;
      })
      .catch(err => console.error("Erro ao buscar cidades:", err));
      
    // Handle click outside to close dropdown
    function handleClickOutside(event) {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
            setActiveCityField(null);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCityChange = (groupIndex, destIndex, value) => {
    // 1. Update the value (Uppercase)
    const upperValue = value.toUpperCase();
    updateDestinationField(groupIndex, destIndex, 'city', upperValue);
    
    // 2. Filter Cities if >= 2 chars
    if (value.length >= 2) {
        const searchNorm = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        const filtered = allCitiesRef.current.filter(city => {
            const cityNorm = city.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return cityNorm.includes(searchNorm);
        });

        // 3. Sort: MG first, then alphabetical
        filtered.sort((a, b) => {
            if (a.uf === 'MG' && b.uf !== 'MG') return -1;
            if (a.uf !== 'MG' && b.uf === 'MG') return 1;
            return a.nome.localeCompare(b.nome);
        });

        setCitySearchResults(filtered.slice(0, 10)); // Limit to 10 results
        setActiveCityField({ groupIndex, destIndex });
    } else {
        setCitySearchResults([]);
        setActiveCityField(null);
    }
  };

  const selectCity = (groupIndex, destIndex, city) => {
      updateDestinationField(groupIndex, destIndex, 'city', city.nome.toUpperCase());
      setActiveCityField(null);
  };

  // Estados para Adicionar Técnico (Novo Fluxo)
  const [addingTechState, setAddingTechState] = useState({}); // { groupIndex: boolean }
  const [tempTechInput, setTempTechInput] = useState({}); // { groupIndex: string }
  const [notification, setNotification] = useState(null); // { message, type: 'success' | 'info' }

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Inicializa o primeiro destino do primeiro grupo como expandido
  useEffect(() => {
    // Tenta carregar do localStorage
    const savedData = localStorage.getItem('travelEmailDraft');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            if (Array.isArray(parsedData) && parsedData.length > 0) {
                setTripGroups(parsedData);
                return;
            }
        } catch (e) {
            console.error("Erro ao carregar rascunho:", e);
        }
    }

    if (tripGroups.length > 0 && tripGroups[0].destinations.length > 0 && tripGroups[0].expandedDestinationId === null) {
        const newGroups = [...tripGroups];
        newGroups[0].expandedDestinationId = newGroups[0].destinations[0].id;
        setTripGroups(newGroups);
    }
  }, []);

  const saveDraft = () => {
    localStorage.setItem('travelEmailDraft', JSON.stringify(tripGroups));
    showNotification("Rascunho salvo com sucesso!", "success");
  };

  const clearDraft = () => {
    localStorage.removeItem('travelEmailDraft');
    setTripGroups([createEmptyTripGroup()]);
    showNotification("Rascunho limpo e reiniciado!", "info");
  };


  function createEmptyDestination() {
    return {
      id: Date.now() + Math.random(),
      city: '',
      startDate: '',
      endDate: '',
      visitType: 'PREVENTIVA',
      returnSameDay: false,
      tasks: [''],
      sleepAt: ''
    };
  }

  function createEmptyTripGroup() {
    return {
        id: Date.now() + Math.random(),
        technicians: [],
        transport: 'VEÍCULO DA EMPRESA',
        destinations: [createEmptyDestination()],
        expandedDestinationId: null
    };
  }

  // --- FUNÇÕES DE VOZ (Speech-to-Text) ---
  
  useEffect(() => {
    // Inicializa o reconhecimento de voz se suportado
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Continua ouvindo mesmo após pausas
      recognition.interimResults = true; // Mostra resultados enquanto fala
      recognition.lang = 'pt-BR'; // Define idioma para Português

      recognition.onresult = (event) => {
        const currentTranscript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setImportText(currentTranscript);
      };

      recognition.onerror = (event) => {
        console.error("Erro no reconhecimento de voz:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setImportText(''); // Limpa texto anterior ao começar nova ditação
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // --- FUNÇÕES DA IA (GEMINI) ---

  /* 
   * Helper para converter DD-MM-YYYY para ISO string (para o DatePIcker)
   * Ex: "25-12-2023" -> "2023-12-25T00:00:00.000Z"
   */
  const parseDateToISO = (dateStr) => {
    if (!dateStr) return '';
    try {
        const parts = dateStr.split('-'); // DD-MM-YYYY
        if (parts.length === 3) {
            // new Date(year, monthIndex, day)
            // Month is 0-indexed in JS Date
            const dt = new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
            return dt.toISOString();
        }
        return '';
    } catch (e) {
        console.warn("Falha ao tratar data:", dateStr, e);
        return '';
    }
  };

  const handleSmartImport = async () => {
    if (!importText.trim()) return;
    setIsAnalyzing(true);
    if (isListening) {
        recognitionRef.current.stop(); // Para de ouvir ao enviar
        setIsListening(false);
    }

    try {
      const extractedData = await analyzeTripText(importText, apiKey);
      if (!extractedData) throw new Error("Falha na análise");

      // CRIA UM NOVO GRUPO COM OS DADOS IMPORTADOS
      const newGroup = createEmptyTripGroup();

      if (extractedData.technicians && Array.isArray(extractedData.technicians)) {
        newGroup.technicians = extractedData.technicians;
      }
      if (extractedData.transport) {
        newGroup.transport = extractedData.transport;
      }

      if (extractedData.destinations && Array.isArray(extractedData.destinations)) {
        const newDestinations = extractedData.destinations.map(dest => {
            // Conversão de data do formato DD-MM-YYYY para ISO
            const startISO = parseDateToISO(dest.startDate);
            const endISO = parseDateToISO(dest.endDate);

            return {
                ...createEmptyDestination(),
                ...dest,
                startDate: startISO,
                endDate: endISO,
                tasks: Array.isArray(dest.tasks) ? dest.tasks : [dest.tasks || '']
            };
        });
        newGroup.destinations = newDestinations;
        if (newDestinations.length > 0) {
            newGroup.expandedDestinationId = newDestinations[0].id;
        }
      }

      // Adiciona o novo grupo à lista existente
      setTripGroups([...tripGroups, newGroup]);

      setIsImportModalOpen(false);
      setImportText('');
    } catch (error) {
      console.error("Erro na IA:", error);
      alert("Não foi possível interpretar o texto. Verifique a chave de API ou conexão.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateEmailSubject = async () => {
    setIsGeneratingSubject(true);
    
    // Coleta resumo de todos os grupos
    const allSummaries = tripGroups.map(group => {
        const techs = group.technicians.join(', ');
        const dests = group.destinations.map(d => `${d.city} (${d.startDate ? formatDateRange(d.startDate, d.endDate) : 'Data indefinida'})`).join(', ');
        return `Equipe: ${techs} -> ${dests}`;
    }).join(' | ');

    try {
      const subject = await generateSubject(allSummaries, apiKey);
      setGeneratedSubject(subject);
    } catch (error) {
      console.error("Erro ao gerar assunto:", error);
    } finally {
      setIsGeneratingSubject(false);
    }
  };

  // --- MANIPULAÇÃO DE ESTADO ---

  // GRUPOS
  const addTripGroup = () => {
    setTripGroups([...tripGroups, createEmptyTripGroup()]);
  };

  const removeTripGroup = (index) => {
    if (tripGroups.length === 1) return;
    const newGroups = [...tripGroups];
    newGroups.splice(index, 1);
    setTripGroups(newGroups);
  };

  // TÉCNICOS (Por Grupo) - NEW HELPERS
  const startAddingTechnician = (groupIndex) => {
    setAddingTechState({ ...addingTechState, [groupIndex]: true });
    setTempTechInput({ ...tempTechInput, [groupIndex]: '' });
  };

  const confirmAddTechnician = (groupIndex) => {
    const name = tempTechInput[groupIndex];
    if (!name || !name.trim()) return;

    const formattedName = name.trim().toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    const newGroups = [...tripGroups];
    newGroups[groupIndex].technicians.push(formattedName);
    setTripGroups(newGroups);

    setTempTechInput({ ...tempTechInput, [groupIndex]: '' });
    setAddingTechState({ ...addingTechState, [groupIndex]: false });
  };

  const cancelAddTechnician = (groupIndex) => {
    setTempTechInput({ ...tempTechInput, [groupIndex]: '' });
    setAddingTechState({ ...addingTechState, [groupIndex]: false });
  };

  const removeTechnician = (groupIndex, techIndex) => {
    const newGroups = [...tripGroups];
    newGroups[groupIndex].technicians.splice(techIndex, 1);
    setTripGroups(newGroups);
  };

  // TRANSPORTE (Por Grupo)
  const updateTransport = (groupIndex, value) => {
    const newGroups = [...tripGroups];
    newGroups[groupIndex].transport = value;
    setTripGroups(newGroups);
  };

  // DESTINOS (Por Grupo)
  const addDestination = (groupIndex) => {
    const newGroups = [...tripGroups];
    const newDest = createEmptyDestination();
    newGroups[groupIndex].destinations.push(newDest);
    newGroups[groupIndex].expandedDestinationId = newDest.id; // Auto-expand
    setTripGroups(newGroups);
  };

  const removeDestination = (groupIndex, destIndex) => {
    const newGroups = [...tripGroups];
    const group = newGroups[groupIndex];
    
    if (group.destinations.length === 1) return; // Mínimo 1 destino por grupo?
    
    const removedId = group.destinations[destIndex].id;
    group.destinations.splice(destIndex, 1);
    
    if (removedId === group.expandedDestinationId) {
        group.expandedDestinationId = group.destinations[Math.max(0, destIndex - 1)]?.id || null;
    }
    setTripGroups(newGroups);
  };

  const toggleDestination = (groupIndex, destId) => {
    const newGroups = [...tripGroups];
    const group = newGroups[groupIndex];
    
    if (group.expandedDestinationId === destId) {
        group.expandedDestinationId = null;
    } else {
        group.expandedDestinationId = destId;
    }
    setTripGroups(newGroups);
  };

  const updateDestinationField = (groupIndex, destIndex, field, value) => {
    const newGroups = [...tripGroups];
    newGroups[groupIndex].destinations[destIndex][field] = value;
    setTripGroups(newGroups);
  };

  // TAREFAS (Por Grupo -> Por Destino)
  const updateTask = (groupIndex, destIndex, taskIndex, value) => {
    const newGroups = [...tripGroups];
    newGroups[groupIndex].destinations[destIndex].tasks[taskIndex] = value;
    setTripGroups(newGroups);
  };
  const addTask = (groupIndex, destIndex) => {
    const newGroups = [...tripGroups];
    newGroups[groupIndex].destinations[destIndex].tasks.push('');
    setTripGroups(newGroups);
  };
  const removeTask = (groupIndex, destIndex, taskIndex) => {
    const newGroups = [...tripGroups];
    newGroups[groupIndex].destinations[destIndex].tasks.splice(taskIndex, 1);
    setTripGroups(newGroups);
  };

  // Helpers de Formatação
  const formatDateRange = (start, end) => {
    if (!start) return 'Data indefinida';
    const d1 = new Date(start);
    d1.setMinutes(d1.getMinutes() + d1.getTimezoneOffset());
    const day = d1.getDate().toString().padStart(2, '0');
    const month = (d1.getMonth() + 1).toString().padStart(2, '0');
    
    if (end && end !== start) {
        const d2 = new Date(end);
        d2.setMinutes(d2.getMinutes() + d2.getTimezoneOffset());
        const day2 = d2.getDate().toString().padStart(2, '0');
        const month2 = (d2.getMonth() + 1).toString().padStart(2, '0');
        return `${day}/${month} a ${day2}/${month2}`;
    }
    return `${day}/${month}`;
  };

  const getDurationText = (dest) => {
    const { startDate: start, endDate: end, returnSameDay } = dest;
    if (returnSameDay) return 'Volta no mesmo dia';
    if (!start || !end) return 'Duração indefinida';
    if (start === end) return 'Volta no mesmo dia';
    
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays === 1 ? '1 Diária' : `${diffDays} diárias`;
  };

  const formatTechnicians = (techs) => {
    const capitalize = (s) => s.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const validTechs = techs.filter(t => t.trim() !== '').map(capitalize);
    
    if (validTechs.length === 0) return 'Técnicos não informados';
    if (validTechs.length === 1) return validTechs[0];
    
    const last = validTechs[validTechs.length - 1];
    const rest = validTechs.slice(0, -1).join(', ');
    return `${rest} e ${last}`;
  };

  const handleCopy = () => {
    if (!previewRef.current) return;
    const range = document.createRange();
    range.selectNode(previewRef.current);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="travel-email-wrapper">
      
      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className={`notification-toast notification-${notification.type}`}>
            {notification.type === 'success' ? <Sparkles size={16} /> : <Briefcase size={16} />}
            {notification.message}
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO COM IA + VOZ */}
      {isImportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                <Sparkles size={20} /> Importar via Voz ou Texto
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="close-button">
                <X size={24} />
              </button>
            </div>
            
            <p className="modal-description">
              Fale ou digite os detalhes da viagem. Ex: <i>"Vou com o Carlos para Itabirito dia 20 e depois para Ouro Preto dia 22."</i>
            </p>

            <div className="input-container">
                <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Aguardando texto ou voz..."
                className="import-textarea"
                />
                
                {/* BOTÃO DE MICROFONE FLUTUANTE */}
                <button
                    onClick={toggleListening}
                    className={`mic-button ${isListening ? 'listening' : 'idle'}`}
                    title={isListening ? "Parar de ouvir" : "Falar"}
                >
                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
            </div>

            <div className="modal-footer">
              <span className={`status-text ${isListening ? 'listening' : 'idle'}`}>
                {isListening ? '● Ouvindo...' : 'Clique no microfone para falar'}
              </span>

              <div className="modal-actions">
                <button 
                    onClick={() => setIsImportModalOpen(false)}
                    className="btn-cancel"
                >
                    Cancelar
                </button>
                <button 
                    onClick={handleSmartImport}
                    disabled={isAnalyzing || !importText.trim()}
                    className="btn-primary"
                >
                    {isAnalyzing ? <><Loader2 className="animate-spin" size={16} /> Processando...</> : 'Gerar Viagem'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COLUNA ESQUERDA: FORMULÁRIO */}
      <div className="form-section">
        
        {/* HEADER E AÇÕES DE TOPO */}
        <div className="section-header">
          <h1 className="page-title">
            <Briefcase className="w-6 h-6" /> Gerador de Viagens
          </h1>
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="btn-secondary"
          >
            <Sparkles size={16} /> Importar com IA
          </button>
        </div>

        {/* LISTA DE GRUPOS DE VIAGEM */}
        {tripGroups.map((group, groupIndex) => (
            <div key={group.id} className="trip-group-card">
                
                <div className="group-header">
                    <h3 className="group-title">
                        <Layers size={18} /> Equipe {groupIndex + 1}
                    </h3>
                    {tripGroups.length > 1 && (
                        <button 
                            onClick={() => removeTripGroup(groupIndex)}
                            className="btn-remove-group"
                        >
                            <Trash2 size={16} /> Remover Grupo
                        </button>
                    )}
                </div>

                {/* SEÇÃO TÉCNICOS DO GRUPO (NEW JSX) */}
                <div className="global-section">
                    <div className="field-group">
                        <label className="label">
                        <Users size={16}/> Técnicos (Equipe)
                        </label>
                        
                        {/* LISTA DE TÉCNICOS JÁ ADICIONADOS (INLINE) */}
                        <div className="technicians-list">
                            {group.technicians.map((tech, i) => (
                                <div key={i} className="tech-badge">
                                    <span>{tech}</span>
                                    <button onClick={() => removeTechnician(groupIndex, i)} className="btn-remove-tech" title="Remover">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* ÁREA DE ADICIONAR TÉCNICO */}
                        {addingTechState[groupIndex] ? (
                            <div className="add-tech-container">
                                <input
                                    type="text"
                                    value={tempTechInput[groupIndex] || ''}
                                    onChange={(e) => setTempTechInput({...tempTechInput, [groupIndex]: e.target.value})}
                                    placeholder="Nome do Técnico"
                                    className="input-field"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') confirmAddTechnician(groupIndex);
                                        if (e.key === 'Escape') cancelAddTechnician(groupIndex);
                                    }}
                                />
                                <div className="add-tech-actions">
                                    <button onClick={() => confirmAddTechnician(groupIndex)} className="btn-confirm-tech">Confirmar</button>
                                    <button onClick={() => cancelAddTechnician(groupIndex)} className="btn-cancel-tech">Cancelar</button>
                                </div>
                            </div>
                        ) : (
                            <button 
                                onClick={() => startAddingTechnician(groupIndex)}
                                className="btn-add-tech-green"
                            >
                                <Plus size={14} /> Adicionar Técnico
                            </button>
                        )}
                    </div>
                </div>

                <hr className="divider" />

                {/* LISTA DE DESTINOS (ACCORDION) */}
                <div className="destinations-list">
                    <label className="label mb-4">Destinos / Cidades</label>
                    
                    {group.destinations.map((dest, destIndex) => {
                        const isExpanded = group.expandedDestinationId === dest.id;

                        return (
                            <div key={dest.id} className={`trip-card ${isExpanded ? 'expanded' : 'collapsed'}`}>
                                {/* HEADER DO CARD (Clicável para expandir/retrair) */}
                                <div 
                                    className="trip-card-header" 
                                    onClick={() => toggleDestination(groupIndex, dest.id)}
                                >
                                    <div className="trip-summary">
                                        <span className="trip-number">#{destIndex + 1}</span>
                                        <span className="trip-city">{dest.city || 'Nova Cidade'}</span>
                                        <span className="trip-date">{formatDateRange(dest.startDate, dest.endDate)}</span>
                                    </div>
                                    <div className="trip-actions">
                                        {group.destinations.length > 1 && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); removeDestination(groupIndex, destIndex); }}
                                                className="btn-remove-trip-mini"
                                                title="Remover Destino"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {/* CORPO DO CARD (Visível apenas se expandido) */}
                                {isExpanded && (
                                    <div className="trip-card-body">
                                        {/* GRUPO 1: DESTINO E DATA */}
                                        <div className="grid-2-col">
                                        <div className="col-span-2">
                                            <label className="label-sm">Cidade</label>
                                            <div className="input-icon-wrapper" ref={activeCityField?.groupIndex === groupIndex && activeCityField?.destIndex === destIndex ? wrapperRef : null}>
                                            <MapPin className="input-icon" size={16} />
                                            <input
                                                type="text"
                                                value={dest.city}
                                                onChange={(e) => handleCityChange(groupIndex, destIndex, e.target.value)}
                                                onFocus={(e) => { 
                                                    if(e.target.value.length >= 2) handleCityChange(groupIndex, destIndex, e.target.value); 
                                                }}
                                                placeholder="Ex: IBERTIOGA"
                                                className="input-no-border"
                                                autoComplete="off"
                                            />
                                            
                                            {/* DROPDOWN MENU */}
                                            {activeCityField?.groupIndex === groupIndex && activeCityField?.destIndex === destIndex && citySearchResults.length > 0 && (
                                                <ul className="city-dropdown">
                                                    {citySearchResults.map((city) => (
                                                        <li 
                                                            key={city.id} 
                                                            className="city-dropdown-item"
                                                            onClick={() => selectCity(groupIndex, destIndex, city)}
                                                        >
                                                            <span className="city-name">{city.nome}</span>
                                                            <span className="city-uf">{city.uf}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            </div>
                                        </div>

                                        <div className="col-span-2">
                                            <label className="label-sm">Período (Ida e Volta)</label>
                                            <div className="date-picker-wrapper">
                                                <DatePicker
                                                    selectsRange={true}
                                                    startDate={dest.startDate ? new Date(dest.startDate) : null}
                                                    endDate={dest.endDate ? new Date(dest.endDate) : null}
                                                    onChange={(update) => {
                                                        const [start, end] = update;
                                                        updateDestinationField(groupIndex, destIndex, 'startDate', start ? start.toISOString() : '');
                                                        updateDestinationField(groupIndex, destIndex, 'endDate', end ? end.toISOString() : '');
                                                    }}
                                                    dateFormat="dd/MM/yyyy"
                                                    locale="pt-BR"
                                                    placeholderText="Selecione a data de ida e volta"
                                                    className="input-field w-full"
                                                    isClearable={true}
                                                    wrapperClassName="w-full"
                                                />
                                            </div>
                                        </div>

                                        {/* CHECKBOX VOLTA MESMO DIA */}
                                        <div className="col-span-2 checkbox-wrapper">
                                            <input 
                                            type="checkbox" 
                                            id={`returnSameDay-${group.id}-${dest.id}`}
                                            checked={dest.returnSameDay}
                                            onChange={(e) => updateDestinationField(groupIndex, destIndex, 'returnSameDay', e.target.checked)}
                                            className="checkbox"
                                            />
                                            <label htmlFor={`returnSameDay-${group.id}-${dest.id}`} className="checkbox-label">
                                            Retorna no mesmo dia
                                            </label>
                                        </div>

                                        <div className="col-span-2">
                                            <label className="label-sm">Tipo de Visita</label>
                                            <select
                                            value={dest.visitType}
                                            onChange={(e) => updateDestinationField(groupIndex, destIndex, 'visitType', e.target.value)}
                                            className="select-field"
                                            >
                                            <option value="PREVENTIVA">PREVENTIVA</option>
                                            <option value="CORRETIVA">CORRETIVA</option>
                                            <option value="CEMIG">CEMIG</option>
                                            <option value="VISITA TÉCNICA">VISITA TÉCNICA</option>
                                            <option value="OUTROS">OUTROS</option>
                                            </select>
                                        </div>

                                        {/* SLEEP AT SELECTION */}
                                        <div className="col-span-2">
                                            <label className="label-sm">Onde vai dormir?</label>
                                            <select
                                                value={dest.sleepAt || ''}
                                                onChange={(e) => updateDestinationField(groupIndex, destIndex, 'sleepAt', e.target.value)}
                                                className="select-field"
                                            >
                                                <option value="">Selecione...</option>
                                                {group.destinations.slice(destIndex).map((d) => (
                                                    d.city ? (
                                                        <option key={d.id} value={d.city}>{d.city}</option>
                                                    ) : null
                                                ))}
                                            </select>
                                        </div>
                                        </div>

                                        {/* GRUPO 2: LOCAIS / TAREFAS */}
                                        <div className="field-group">
                                        <label className="label">Locais e Tarefas</label>
                                        {dest.tasks.map((task, i) => (
                                            <div key={i} className="input-row">
                                            <input
                                                type="text"
                                                value={task}
                                                onChange={(e) => updateTask(groupIndex, destIndex, i, e.target.value)}
                                                placeholder="Ex: Santa Casa - Entrega de material"
                                                className="input-field"
                                                ref={(el) => (taskInputRefs.current[`${groupIndex}-${destIndex}-${i}`] = el)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const nextIndex = dest.tasks.length;
                                                        addTask(groupIndex, destIndex);
                                                        setFocusTarget({ groupIndex, destIndex, taskIndex: nextIndex });
                                                    }
                                                    if (e.ctrlKey && e.key === 'Backspace') {
                                                        e.preventDefault();
                                                        if (dest.tasks.length > 1) {
                                                            removeTask(groupIndex, destIndex, i);
                                                            const targetIndex = i > 0 ? i - 1 : 0;
                                                            setFocusTarget({ groupIndex, destIndex, taskIndex: targetIndex });
                                                        }
                                                    }
                                                }}
                                            />
                                            {dest.tasks.length > 1 && (
                                                <button onClick={() => removeTask(groupIndex, destIndex, i)} className="btn-icon-only">
                                                <Trash2 size={18} />
                                                </button>
                                            )}
                                            </div>
                                        ))}
                                        <button 
                                            onClick={() => addTask(groupIndex, destIndex)}
                                            className="btn-add-text"
                                        >
                                            <Plus size={14} /> Adicionar Local/Tarefa
                                        </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    <button 
                    onClick={() => addDestination(groupIndex)}
                    className="btn-add-trip"
                    >
                    <Plus size={20} /> Adicionar Cidade/Destino
                    </button>
                </div>

                <hr className="divider" />

                {/* SEÇÃO TRANSPORTE DO GRUPO */}
                <div className="global-section">
                    <label className="label">
                        <Truck size={16}/> Deslocamento/Transporte
                    </label>
                    <select
                        value={group.transport}
                        onChange={(e) => updateTransport(groupIndex, e.target.value)}
                        className="select-field"
                    >
                        <option value="VEÍCULO PARTICULAR">VEÍCULO PARTICULAR</option>
                        <option value="VEÍCULO DA EMPRESA">VEÍCULO DA EMPRESA</option>
                        <option value="ÔNIBUS">ÔNIBUS</option>
                    </select>
                </div>
            </div>
        ))}

        {/* BOTÃO PARA ADICIONAR NOVO GRUPO */}
        <button 
            onClick={addTripGroup}
            className="btn-add-group"
        >
            <Plus size={20} /> Adicionar Outra Equipe/Viagem
        </button>

      </div>

      {/* COLUNA DIREITA: PREVIEW E AÇÃO */}
      <div className="preview-section">
        
        {/* BARRA DE AÇÕES */}
        <div className="preview-actions">
          <div className="preview-header">
            <div>
              <h2 className="preview-title">Pré-visualização</h2>
              <p className="preview-subtitle">Pronto para colar no E-mail</p>
            </div>
            <button
              onClick={handleCopy}
              className={`btn-copy ${copied ? 'copied' : 'default'}`}
            >
              {copied ? (
                <>Copiado!</>
              ) : (
                <><Copy size={18} /> Copiar</>
              )}
            </button>
          </div>
          
          <div className="subject-actions">
             <div className="subject-row">
                <button 
                  onClick={generateEmailSubject}
                  disabled={isGeneratingSubject || tripGroups.length === 0}
                  className="btn-generate-subject"
                >
                  {isGeneratingSubject ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />} 
                  Gerar Assunto com IA
                </button>
                {generatedSubject && (
                  <div className="subject-display">
                    <span className="subject-text">{generatedSubject}</span>
                    <button 
                      onClick={() => {navigator.clipboard.writeText(generatedSubject); alert('Assunto copiado!');}}
                      className="btn-copy-subject"
                      title="Copiar Assunto"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* ÁREA DE RENDERIZAÇÃO DO E-MAIL */}
        <div 
          className="preview-content" 
          ref={previewRef}
        >
            <div style={{ fontFamily: 'Arial, sans-serif', color: '#000' }}>
                
                {tripGroups.map((group, gIndex) => (
                    <div key={group.id} style={{ marginBottom: '32px' }}>
                        {/* HEADER: NOMES (DO GRUPO) */}
                        <div style={{ 
                            color: '#1e40af', // Blue-800
                            fontWeight: 'bold', 
                            fontSize: '18px', 
                            marginBottom: '8px',
                            wordBreak: 'break-word'
                        }}>
                            {formatTechnicians(group.technicians)}
                        </div>

                        {/* LOOP DE DESTINOS DO GRUPO */}
                        {group.destinations.map((dest, index) => (
                            <div key={dest.id} style={{ marginBottom: '8px' }}>
                                {/* LINHA 1: CIDADE - DATA - TIPO - PERNOITE */}
                                <div style={{ fontSize: '14px', lineHeight: '1.5', marginBottom: '2px', wordBreak: 'break-word' }}>
                                    <strong style={{ textTransform: 'uppercase' }}>{dest.city || 'CIDADE'}</strong>
                                    {' - '}
                                    {formatDateRange(dest.startDate, dest.endDate)}
                                    {' - '}
                                    {dest.visitType}
                                    {' - '}
                                    <strong>{dest.sleepAt ? `Dorme em ${dest.sleepAt}` : getDurationText(dest)}</strong>
                                </div>

                                {/* LINHA 2+: TAREFAS */}
                                <div style={{ fontSize: '14px', lineHeight: '1.4', marginBottom: '4px', wordBreak: 'break-word' }}>
                                    {dest.tasks.filter(t => t).map((task, tIndex) => (
                                    <div key={tIndex}>- {task}</div>
                                    ))}
                                    {dest.tasks.filter(t => t).length === 0 && (
                                    <div style={{ color: '#999', fontStyle: 'italic' }}>- Nenhuma tarefa descrita</div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* FOOTER: DESLOCAMENTO BOX (DO GRUPO) */}
                        <table style={{ borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #9ca3af', marginTop: '12px', width: 'auto' }}>
                            <tbody>
                            <tr>
                                <td style={{ 
                                fontWeight: 'bold', 
                                padding: '4px 8px', 
                                borderRight: '1px solid #9ca3af',
                                whiteSpace: 'nowrap',
                                backgroundColor: '#f9fafb'
                                }}>
                                DESLOCAMENTO
                                </td>
                                <td style={{ 
                                padding: '4px 8px',
                                textTransform: 'uppercase',
                                wordBreak: 'break-word'
                                }}>
                                {group.transport}
                                </td>
                            </tr>
                            </tbody>
                        </table>

                        {/* SEPARADOR ENTRE GRUPOS (Se não for o último) */}
                        {gIndex < tripGroups.length - 1 && (
                             <hr style={{ margin: '32px 0', border: 'none', borderTop: '2px solid #e5e7eb' }} />
                        )}
                    </div>
                ))}
            </div>
        </div>

      </div>

      {/* FLOATING ACTION BUTTONS */}
      <div className="floating-actions">
        <button 
            onClick={clearDraft}
            className="btn-float-clear"
            title="Limpar e Reiniciar"
        >
            <Trash2 size={24} />
        </button>
        <button 
            onClick={saveDraft}
            className="btn-float-save"
            title="Salvar Rascunho"
        >
            <Save size={20} />
            <span>Salvar Rascunho</span>
        </button>
      </div>
    </div>
  );
  }

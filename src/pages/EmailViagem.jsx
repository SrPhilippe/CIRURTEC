import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Copy, Users, Briefcase, Sparkles, X, Loader2, Mic, MicOff, MapPin, Truck, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import './EmailViagem.css';
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ptBR } from 'date-fns/locale';

registerLocale('pt-BR', ptBR);

// --- CONFIGURAÇÃO DA API GEMINI ---
const apiKey = ""; // A chave será injetada automaticamente pelo ambiente

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

  // Inicializa o primeiro destino do primeiro grupo como expandido
  useEffect(() => {
    if (tripGroups.length > 0 && tripGroups[0].destinations.length > 0 && tripGroups[0].expandedDestinationId === null) {
        const newGroups = [...tripGroups];
        newGroups[0].expandedDestinationId = newGroups[0].destinations[0].id;
        setTripGroups(newGroups);
    }
  }, []);

  function createEmptyDestination() {
    return {
      id: Date.now() + Math.random(),
      city: '',
      startDate: '',
      endDate: '',
      visitType: 'PREVENTIVA',
      returnSameDay: false,
      tasks: ['']
    };
  }

  function createEmptyTripGroup() {
    return {
        id: Date.now() + Math.random(),
        technicians: [''],
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

  const handleSmartImport = async () => {
    if (!importText.trim()) return;
    setIsAnalyzing(true);
    if (isListening) {
        recognitionRef.current.stop(); // Para de ouvir ao enviar
        setIsListening(false);
    }

    const prompt = `
      Analise o texto abaixo, que descreve uma viagem de trabalho, e extraia os dados para formato JSON.
      
      Texto: "${importText}"
      
      Regras de extração:
      1. technicians: Lista de nomes de pessoas citadas.
      2. destinations: Lista de objetos contendo:
         - city: Cidade de destino.
         - startDate: Data de ida no formato YYYY-MM-DD. Assuma o ano corrente se não citado.
         - endDate: Data de volta no formato YYYY-MM-DD. Se for voltar no mesmo dia, igual à startDate.
         - visitType: Escolha ESTRITAMENTE um destes: "PREVENTIVA", "CORRETIVA", "PREVENTIVA + CORRETIVA", "CEMIG", "INSTALAÇÃO", "VISITA TÉCNICA", "OUTROS". Se não estiver claro, use "OUTROS".
         - tasks: Lista de locais e o que será feito (ex: "Santa Casa - Troca de Switch"). Melhore o texto para soar profissional.
         - returnSameDay: Booleano. True se o texto deixar claro que voltam no mesmo dia (ex: "bate e volta", "diário"), False caso contrário.
      3. transport: Escolha um destes: "VEÍCULO PARTICULAR", "VEÍCULO DA EMPRESA", "ÔNIBUS". Padrão: "VEÍCULO DA EMPRESA".

      Responda APENAS o JSON, sem markdown.
      Exemplo de JSON: { "technicians": ["João"], "destinations": [{ "city": "Betim", "startDate": "2023-10-20", "endDate": "2023-10-20", "visitType": "CORRETIVA", "tasks": ["Hospital Regional - Reparo"], "returnSameDay": false }], "transport": "VEÍCULO DA EMPRESA" }
    `;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await response.json();
      let jsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      // Limpeza básica
      jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const extractedData = JSON.parse(jsonStr);

      // CRIA UM NOVO GRUPO COM OS DADOS IMPORTADOS
      const newGroup = createEmptyTripGroup();

      if (extractedData.technicians && Array.isArray(extractedData.technicians)) {
        newGroup.technicians = extractedData.technicians;
      }
      if (extractedData.transport) {
        newGroup.transport = extractedData.transport;
      }

      if (extractedData.destinations && Array.isArray(extractedData.destinations)) {
        const newDestinations = extractedData.destinations.map(dest => ({
            ...createEmptyDestination(),
            ...dest,
            tasks: Array.isArray(dest.tasks) ? dest.tasks : [dest.tasks || '']
        }));
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
      alert("Não foi possível interpretar o texto. Tente falar de forma mais clara ou verifique a conexão.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateEmailSubject = async () => {
    setIsGeneratingSubject(true);
    
    // Coleta resumo de todos os grupos
    const allSummaries = tripGroups.map(group => {
        const techs = group.technicians.join(', ');
        const dests = group.destinations.map(d => `${d.city} (${d.startDate})`).join(', ');
        return `Equipe: ${techs} -> ${dests}`;
    }).join(' | ');

    const prompt = `
      Crie um assunto de e-mail profissional, curto e direto para as seguintes viagens técnicas. 
      Padrão desejado: "Programação de Viagem: [Cidades Principais] - [Datas Resumidas]".
      Dados: ${allSummaries}
      Responda APENAS o texto do assunto.
    `;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await response.json();
      const subject = data.candidates?.[0]?.content?.parts?.[0]?.text;
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

  // TÉCNICOS (Por Grupo)
  const updateTechnician = (groupIndex, techIndex, value) => {
    const newGroups = [...tripGroups];
    newGroups[groupIndex].technicians[techIndex] = value;
    setTripGroups(newGroups);
  };
  const addTechnician = (groupIndex) => {
    const newGroups = [...tripGroups];
    newGroups[groupIndex].technicians.push('');
    setTripGroups(newGroups);
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
    const validTechs = techs.filter(t => t.trim() !== '');
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
            className="btn-import"
          >
            <Mic size={14} /> <Sparkles size={14} /> Importar (Voz/IA)
          </button>
        </div>

        {/* LOOP DE GRUPOS DE VIAGEM */}
        {tripGroups.map((group, groupIndex) => (
            <div key={group.id} className="group-wrapper">
                
                <div className="group-header">
                    <h3 className="group-title">
                        <Layers size={18} /> Grupo / Equipe {groupIndex + 1}
                    </h3>
                    {tripGroups.length > 1 && (
                        <button 
                            onClick={() => removeTripGroup(groupIndex)}
                            className="btn-remove-group"
                            title="Remover Grupo"
                        >
                            <Trash2 size={16} /> Remover Grupo
                        </button>
                    )}
                </div>

                {/* SEÇÃO TÉCNICOS DO GRUPO */}
                <div className="global-section">
                    <div className="field-group">
                        <label className="label">
                        <Users size={16}/> Técnicos (Equipe)
                        </label>
                        {group.technicians.map((tech, i) => (
                        <div key={i} className="input-row">
                            <input
                            type="text"
                            value={tech}
                            onChange={(e) => updateTechnician(groupIndex, i, e.target.value)}
                            placeholder="Nome do Técnico"
                            className="input-field"
                            />
                            {group.technicians.length > 1 && (
                            <button onClick={() => removeTechnician(groupIndex, i)} className="btn-icon-only">
                                <Trash2 size={18} />
                            </button>
                            )}
                        </div>
                        ))}
                        <button 
                        onClick={() => addTechnician(groupIndex)}
                        className="btn-add-text"
                        >
                        <Plus size={14} /> Adicionar Técnico
                        </button>
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
                                            <div className="input-icon-wrapper">
                                            <MapPin className="input-icon" size={16} />
                                            <input
                                                type="text"
                                                value={dest.city}
                                                onChange={(e) => updateDestinationField(groupIndex, destIndex, 'city', e.target.value)}
                                                placeholder="Ex: IBERTIOGA"
                                                className="input-no-border"
                                            />
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
                                            <option value="PREVENTIVA + CORRETIVA">PREVENTIVA + CORRETIVA</option>
                                            <option value="CEMIG">CEMIG</option>
                                            <option value="INSTALAÇÃO">INSTALAÇÃO</option>
                                            <option value="VISITA TÉCNICA">VISITA TÉCNICA</option>
                                            <option value="OUTROS">OUTROS</option>
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
                            marginBottom: '16px',
                            wordBreak: 'break-word'
                        }}>
                            {formatTechnicians(group.technicians)}
                        </div>

                        {/* LOOP DE DESTINOS DO GRUPO */}
                        {group.destinations.map((dest, index) => (
                            <div key={dest.id} style={{ marginBottom: '16px' }}>
                                {/* LINHA 1: CIDADE - DATA - TIPO - PERNOITE */}
                                <div style={{ fontSize: '14px', lineHeight: '1.5', marginBottom: '4px', wordBreak: 'break-word' }}>
                                    <strong style={{ textTransform: 'uppercase' }}>{dest.city || 'CIDADE'}</strong>
                                    {' - '}
                                    {formatDateRange(dest.startDate, dest.endDate)}
                                    {' - '}
                                    {dest.visitType}
                                    {' - '}
                                    <strong>{getDurationText(dest)}</strong>
                                </div>

                                {/* LINHA 2+: TAREFAS */}
                                <div style={{ fontSize: '14px', lineHeight: '1.4', marginBottom: '8px', wordBreak: 'break-word' }}>
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
    </div>
  );
}
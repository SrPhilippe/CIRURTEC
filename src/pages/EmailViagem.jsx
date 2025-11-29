import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Copy, Users, Briefcase, Sparkles, X, Loader2, Mic, MicOff, MapPin, Truck } from 'lucide-react';
import './EmailViagem.css';

// --- CONFIGURAÇÃO DA API GEMINI ---
const apiKey = ""; // A chave será injetada automaticamente pelo ambiente

export default function TravelEmail() {
  const [trips, setTrips] = useState([createEmptyTrip()]);
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

  function createEmptyTrip() {
    return {
      id: Date.now(),
      technicians: [''],
      city: '',
      startDate: '',
      endDate: '',
      visitType: 'PREVENTIVA',
      returnSameDay: false,
      tasks: [''],
      transport: 'VEÍCULO DA EMPRESA'
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
      2. city: Cidade de destino.
      3. startDate: Data de ida no formato YYYY-MM-DD. Assuma o ano corrente se não citado.
      4. endDate: Data de volta no formato YYYY-MM-DD. Se for voltar no mesmo dia, igual à startDate.
      5. visitType: Escolha ESTRITAMENTE um destes: "PREVENTIVA", "CORRETIVA", "PREVENTIVA + CORRETIVA", "CEMIG", "INSTALAÇÃO", "VISITA TÉCNICA", "OUTROS". Se não estiver claro, use "OUTROS".
      6. tasks: Lista de locais e o que será feito (ex: "Santa Casa - Troca de Switch"). Melhore o texto para soar profissional.
      7. transport: Escolha um destes: "VEÍCULO PARTICULAR", "VEÍCULO DA EMPRESA", "ÔNIBUS". Padrão: "VEÍCULO DA EMPRESA".
      8. returnSameDay: Booleano. True se o texto deixar claro que voltam no mesmo dia (ex: "bate e volta", "diário"), False caso contrário.

      Responda APENAS o JSON, sem markdown.
      Exemplo de JSON: { "technicians": ["João"], "city": "Betim", "startDate": "2023-10-20", "endDate": "2023-10-20", "visitType": "CORRETIVA", "tasks": ["Hospital Regional - Reparo"], "transport": "VEÍCULO DA EMPRESA", "returnSameDay": false }
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

      const newTrip = {
        ...createEmptyTrip(),
        id: Date.now(),
        ...extractedData,
        technicians: Array.isArray(extractedData.technicians) ? extractedData.technicians : [extractedData.technicians || ''],
        tasks: Array.isArray(extractedData.tasks) ? extractedData.tasks : [extractedData.tasks || '']
      };

      setTrips([...trips, newTrip]);
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
    const tripsSummary = trips.map(t => 
      `${t.city} (${t.startDate}): ${t.visitType} com ${t.technicians.join(', ')}`
    ).join(' | ');

    const prompt = `
      Crie um assunto de e-mail profissional, curto e direto para as seguintes viagens técnicas. 
      Padrão desejado: "Programação de Viagem: [Cidades Principais] - [Datas Resumidas]".
      Dados: ${tripsSummary}
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

  const addTrip = () => {
    setTrips([...trips, { ...createEmptyTrip(), id: Date.now() + Math.random() }]);
  };

  const removeTrip = (index) => {
    if (trips.length === 1) return;
    const newTrips = [...trips];
    newTrips.splice(index, 1);
    setTrips(newTrips);
  };

  const updateTripField = (index, field, value) => {
    const newTrips = [...trips];
    newTrips[index][field] = value;
    setTrips(newTrips);
  };

  const updateTechnician = (tripIndex, techIndex, value) => {
    const newTrips = [...trips];
    newTrips[tripIndex].technicians[techIndex] = value;
    setTrips(newTrips);
  };
  const addTechnician = (tripIndex) => {
    const newTrips = [...trips];
    newTrips[tripIndex].technicians.push('');
    setTrips(newTrips);
  };
  const removeTechnician = (tripIndex, techIndex) => {
    const newTrips = [...trips];
    newTrips[tripIndex].technicians.splice(techIndex, 1);
    setTrips(newTrips);
  };

  const updateTask = (tripIndex, taskIndex, value) => {
    const newTrips = [...trips];
    newTrips[tripIndex].tasks[taskIndex] = value;
    setTrips(newTrips);
  };
  const addTask = (tripIndex) => {
    const newTrips = [...trips];
    newTrips[tripIndex].tasks.push('');
    setTrips(newTrips);
  };
  const removeTask = (tripIndex, taskIndex) => {
    const newTrips = [...trips];
    newTrips[tripIndex].tasks.splice(taskIndex, 1);
    setTrips(newTrips);
  };

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

  const getDurationText = (trip) => {
    const { startDate: start, endDate: end, returnSameDay } = trip;
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
              Fale ou digite os detalhes da viagem. Ex: <i>"Vou com o Carlos para Itabirito dia 20 fazer preventiva na UPA, voltamos no mesmo dia."</i>
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

        {trips.map((trip, tripIndex) => (
          <div key={trip.id} className="trip-card">
            <div className="trip-badge">
              Viagem {tripIndex + 1}
            </div>
            
            {trips.length > 1 && (
              <button 
                onClick={() => removeTrip(tripIndex)}
                className="btn-remove-trip"
                title="Remover Viagem"
              >
                <Trash2 size={18} />
              </button>
            )}

            {/* SEÇÃO TÉCNICOS */}
            <div className="field-group">
              <label className="label">
                <Users size={16}/> Técnicos
              </label>
              {trip.technicians.map((tech, i) => (
                <div key={i} className="input-row">
                  <input
                    type="text"
                    value={tech}
                    onChange={(e) => updateTechnician(tripIndex, i, e.target.value)}
                    placeholder="Nome do Técnico"
                    className="input-field"
                  />
                  {trip.technicians.length > 1 && (
                    <button onClick={() => removeTechnician(tripIndex, i)} className="btn-icon-only">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
              <button 
                onClick={() => addTechnician(tripIndex)}
                className="btn-add-text"
              >
                <Plus size={14} /> Adicionar Técnico
              </button>
            </div>

            {/* GRUPO 1: DESTINO E DATA */}
            <div className="grid-2-col">
              <div className="col-span-2">
                <label className="label-sm">Cidade de Destino</label>
                <div className="input-icon-wrapper">
                  <MapPin className="input-icon" size={16} />
                  <input
                    type="text"
                    value={trip.city}
                    onChange={(e) => updateTripField(tripIndex, 'city', e.target.value)}
                    placeholder="Ex: IBERTIOGA"
                    className="input-no-border"
                  />
                </div>
              </div>

              <div>
                <label className="label-sm">Ida</label>
                <input
                  type="date"
                  value={trip.startDate}
                  onChange={(e) => updateTripField(tripIndex, 'startDate', e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label className="label-sm">Volta</label>
                <input
                  type="date"
                  value={trip.endDate}
                  onChange={(e) => updateTripField(tripIndex, 'endDate', e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              {/* CHECKBOX VOLTA MESMO DIA */}
              <div className="col-span-2 checkbox-wrapper">
                <input 
                  type="checkbox" 
                  id={`returnSameDay-${trip.id}`}
                  checked={trip.returnSameDay}
                  onChange={(e) => updateTripField(tripIndex, 'returnSameDay', e.target.checked)}
                  className="checkbox"
                />
                <label htmlFor={`returnSameDay-${trip.id}`} className="checkbox-label">
                   Retorna no mesmo dia
                </label>
              </div>

              <div className="col-span-2">
                <label className="label-sm">Tipo de Visita</label>
                <select
                  value={trip.visitType}
                  onChange={(e) => updateTripField(tripIndex, 'visitType', e.target.value)}
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
              {trip.tasks.map((task, i) => (
                <div key={i} className="input-row">
                  <input
                    type="text"
                    value={task}
                    onChange={(e) => updateTask(tripIndex, i, e.target.value)}
                    placeholder="Ex: Santa Casa - Entrega de material"
                    className="input-field"
                  />
                  {trip.tasks.length > 1 && (
                    <button onClick={() => removeTask(tripIndex, i)} className="btn-icon-only">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
              <button 
                onClick={() => addTask(tripIndex)}
                className="btn-add-text"
              >
                <Plus size={14} /> Adicionar Local/Tarefa
              </button>
            </div>

            {/* GRUPO 3: TRANSPORTE */}
            <div>
              <label className="label">
                <Truck size={16}/> Deslocamento/Transporte
              </label>
              <select
                value={trip.transport}
                onChange={(e) => updateTripField(tripIndex, 'transport', e.target.value)}
                className="select-field"
              >
                <option value="VEÍCULO PARTICULAR">VEÍCULO PARTICULAR</option>
                <option value="VEÍCULO DA EMPRESA">VEÍCULO DA EMPRESA</option>
                <option value="ÔNIBUS">ÔNIBUS</option>
              </select>
            </div>
          </div>
        ))}

        <button 
          onClick={addTrip}
          className="btn-add-trip"
        >
          <Plus size={20} /> Adicionar Outra Viagem
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
                  disabled={isGeneratingSubject || trips.length === 0}
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
          {trips.map((trip, index) => (
            <div key={trip.id} style={{ marginBottom: '24px', fontFamily: 'Arial, sans-serif', color: '#000' }}>
              
              {/* HEADER: NOMES */}
              <div style={{ 
                color: '#1e40af', // Blue-800
                fontWeight: 'bold', 
                fontSize: '18px', 
                marginBottom: '4px',
                wordBreak: 'break-word'
              }}>
                {formatTechnicians(trip.technicians)}
              </div>

              {/* LINHA 1: CIDADE - DATA - TIPO - PERNOITE */}
              <div style={{ fontSize: '14px', lineHeight: '1.5', marginBottom: '4px', wordBreak: 'break-word' }}>
                <strong style={{ textTransform: 'uppercase' }}>{trip.city || 'CIDADE'}</strong>
                {' - '}
                {formatDateRange(trip.startDate, trip.endDate)}
                {' - '}
                {trip.visitType}
                {' - '}
                <strong>{getDurationText(trip)}</strong>
              </div>

              {/* LINHA 2+: TAREFAS */}
              <div style={{ fontSize: '14px', lineHeight: '1.4', marginBottom: '8px', wordBreak: 'break-word' }}>
                {trip.tasks.filter(t => t).map((task, tIndex) => (
                  <div key={tIndex}>- {task}</div>
                ))}
                {trip.tasks.filter(t => t).length === 0 && (
                   <div style={{ color: '#999', fontStyle: 'italic' }}>- Nenhuma tarefa descrita</div>
                )}
              </div>

              {/* FOOTER: DESLOCAMENTO BOX */}
              <table style={{ borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #9ca3af', marginTop: '4px', width: 'auto' }}>
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
                      {trip.transport}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Separador visual apenas se houver mais de uma viagem e não for a última */}
              {index < trips.length - 1 && (
                <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px dashed #ccc' }} />
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
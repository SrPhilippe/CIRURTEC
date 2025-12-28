
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Settings, Box, ChevronRight, X, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import './Equipamentos.css';

const Equipamentos = () => {
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedType, setSelectedType] = useState(null);
    const [newType, setNewType] = useState('');
    const [newModel, setNewModel] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchTypes();
    }, []);

    const fetchTypes = async () => {
        try {
            setLoading(true);
            const response = await api.get('/equipment-settings/types');
            setTypes(response.data);
            
            // Maintain selection if possible
            if (selectedType) {
                const updatedSelected = response.data.find(t => t.id === selectedType.id);
                if (updatedSelected) setSelectedType(updatedSelected);
            }
        } catch (err) {
            setError('Erro ao carregar equipamentos.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddType = async () => {
        if (!newType.trim()) return;
        try {
            await api.post('/equipment-settings/types', { name: newType });
            setNewType('');
            fetchTypes();
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao adicionar tipo.');
        }
    };

    const handleAddModel = async () => {
        if (!selectedType || !newModel.trim()) return;
        try {
            await api.post('/equipment-settings/models', { name: newModel, type_id: selectedType.id });
            setNewModel('');
            fetchTypes();
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao adicionar modelo.');
        }
    };

    const handleDeleteType = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Tem certeza? Isso excluirá todos os modelos associados.')) return;
        try {
            await api.delete(`/equipment-settings/types/${id}`);
            if (selectedType?.id === id) setSelectedType(null);
            fetchTypes();
        } catch (err) {
            setError('Erro ao excluir tipo.');
        }
    };

    const handleDeleteModel = async (id) => {
        if (!window.confirm('Excluir este modelo?')) return;
        try {
            api.delete(`/equipment-settings/models/${id}`);
            // Optimistic update
             const updatedType = {
                ...selectedType,
                models: selectedType.models.filter(m => m.id !== id)
            };
            setSelectedType(updatedType); // Update local state immediately
            // Also update the main list for consistency on re-select
             setTypes(types.map(t => t.id === selectedType?.id ? updatedType : t));
        } catch (err) {
             setError('Erro ao excluir modelo.');
             fetchTypes(); // Revert on error
        }
    };

    return (
        <div className="equipment-settings-container">
            <div className="settings-header">
                <h1 className="page-title">
                    <Settings className="text-blue-600" size={28} />
                    Hierarquia de Equipamentos
                </h1>
                <p className="text-slate-500 mt-1">Gerencie os tipos e modelos de equipamentos disponíveis.</p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-2 border border-red-200">
                    <AlertCircle size={20} />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto hover:bg-red-100 p-1 rounded"><X size={16} /></button>
                </div>
            )}

            <div className="hierarchy-canvas">
                
                {/* LEFT COLUMN: EQUIPMENT TYPES */}
                <div className="column types-column">
                    <h2 className="column-title">Tipos de Equipamento</h2>
                    
                    <div className="add-item-box">
                        <input 
                            type="text" 
                            value={newType} 
                            onChange={(e) => setNewType(e.target.value.toUpperCase())}
                            placeholder="Novo Tipo (ex: OSMOSE)" 
                            className="input-base"
                        />
                        <button onClick={handleAddType} className="btn-add" disabled={!newType.trim()}> <Plus size={20} /> </button>
                    </div>

                    <div className="items-list">
                        {loading ? <p className="loading-text">Carregando...</p> : types.map(type => (
                            <div 
                                key={type.id} 
                                className={`hierarchy-node type-node ${selectedType?.id === type.id ? 'active' : ''}`}
                                onClick={() => setSelectedType(type)}
                            >
                                <div className="node-content">
                                    <Box size={18} />
                                    <span>{type.name}</span>
                                </div>
                                <div className="node-actions relative">
                                    <span className="count-badge">{type.models?.length || 0}</span>
                                    {selectedType?.id === type.id && <div className="connector-line"></div>}
                                    <button onClick={(e) => handleDeleteType(type.id, e)} className="btn-delete-node" title="Excluir Tipo">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {!loading && types.length === 0 && <p className="empty-text">Nenhum tipo cadastrado.</p>}
                    </div>
                </div>

                {/* VISUAL CONNECTOR AREA */}
                <div className="column connector-column">
                     <ChevronRight size={32} className={`connector-icon ${selectedType ? 'active' : ''}`} />
                </div>

                {/* RIGHT COLUMN: MODELS */}
                <div className={`column models-column ${!selectedType ? 'disabled' : ''}`}>
                    <h2 className="column-title">Modelos Relacionados</h2>
                    
                    {selectedType ? (
                        <>
                            <div className="header-info">
                                <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wide">
                                    {selectedType.name}
                                </span>
                            </div>

                            <div className="add-item-box">
                                <input 
                                    type="text" 
                                    value={newModel} 
                                    onChange={(e) => setNewModel(e.target.value.toUpperCase())}
                                    placeholder="Novo Modelo (ex: H0100-020)" 
                                    className="input-base"
                                />
                                <button onClick={handleAddModel} className="btn-add" disabled={!newModel.trim()}> <Plus size={20} /> </button>
                            </div>

                            <div className="items-list">
                                {selectedType.models?.map(model => (
                                    <div key={model.id} className="hierarchy-node model-node">
                                        <div className="node-content">
                                            <div className="w-2 h-2 rounded-full bg-slate-400 mr-3"></div>
                                            <span>{model.name}</span>
                                        </div>
                                        <button onClick={() => handleDeleteModel(model.id)} className="btn-delete-node" title="Excluir Modelo">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {selectedType.models?.length === 0 && <p className="empty-text">Nenhum modelo cadastrado para este tipo.</p>}
                            </div>
                        </>
                    ) : (
                        <div className="empty-selection-state">
                            <Box size={48} />
                            <p>Selecione um Tipo de Equipamento à esquerda para gerenciar seus modelos.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Equipamentos;

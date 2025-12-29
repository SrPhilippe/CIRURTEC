import React, { useState, useEffect, useContext } from 'react';
import { Plus, Trash2, Settings, Box, ChevronRight, X, AlertCircle, Edit2, Check } from 'lucide-react';
import api from '../../services/api';
import './Equipamentos.css';
import { AuthContext } from '../../context/AuthContext';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

const Equipamentos = () => {
    const { user } = useContext(AuthContext);
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedType, setSelectedType] = useState(null);
    const [newType, setNewType] = useState('');
    const [newModel, setNewModel] = useState('');
    const [error, setError] = useState(null);

    // Edit State
    const [editingId, setEditingId] = useState(null); // ID of item being edited
    const [editingType, setEditingType] = useState(null); // 'TYPE' or 'MODEL'
    const [editValue, setEditValue] = useState('');

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null); // { id, type: 'TYPE'|'MODEL', name }

    // Permissions
    const isAdmin = user?.rights === 'ADMIN' || user?.role === 'ADMIN';
    const isMaster = user?.rights === 'Master' || user?.role === 'Master';

    const canManageTypes = isAdmin; // Only Admin can Add/Edit/Delete Types
    const canManageModels = isAdmin || isMaster; // Admin and Master can Add/Edit Models
    const canDeleteModel = isAdmin; // Only Admin can Delete Models

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

    // --- Delete Modal Logic ---
    const requestDelete = (item, type) => {
        setItemToDelete({ ...item, type }); // item has id and name
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        try {
            if (itemToDelete.type === 'TYPE') {
                await api.delete(`/equipment-settings/types/${itemToDelete.id}`);
                if (selectedType?.id === itemToDelete.id) setSelectedType(null);
            } else {
                await api.delete(`/equipment-settings/models/${itemToDelete.id}`);
            }
            fetchTypes();
        } catch (err) {
            console.error(err);
            alert('Erro ao excluir: ' + (err.response?.data?.error || err.message));
        } finally {
            setDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    // Rename Logic
    const startEditing = (id, type, currentValue) => {
        setEditingId(id);
        setEditingType(type);
        setEditValue(currentValue);
    };

    const cancelEditing = (e) => {
        if (e) e.stopPropagation();
        setEditingId(null);
        setEditingType(null);
        setEditValue('');
    };

    const saveEditing = async (e) => {
        if (e) e.stopPropagation();
        if (!editValue.trim()) return;

        try {
            if (editingType === 'TYPE') {
                await api.put(`/equipment-settings/types/${editingId}`, { name: editValue });
            } else {
                await api.put(`/equipment-settings/models/${editingId}`, { name: editValue });
            }
            setEditingId(null);
            setEditingType(null);
            fetchTypes();
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao renomear.');
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
                    
                    {canManageTypes && (
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
                    )}

                    <div className="items-list">
                        {loading ? <p className="loading-text">Carregando...</p> : types.map(type => (
                            <div 
                                key={type.id} 
                                className={`hierarchy-node type-node ${selectedType?.id === type.id ? 'active' : ''}`}
                                onClick={() => setSelectedType(type)}
                            >
                                {editingId === type.id && editingType === 'TYPE' ? (
                                    <div className="edit-mode-box" onClick={e => e.stopPropagation()}>
                                        <input 
                                            autoFocus
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value.toUpperCase())}
                                            className="input-edit"
                                        />
                                        <button onClick={saveEditing} className="btn-save-edit"><Check size={14}/></button>
                                        <button onClick={cancelEditing} className="btn-cancel-edit"><X size={14}/></button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="node-content">
                                            <Box size={18} />
                                            <span>{type.name}</span>
                                        </div>
                                        <div className="node-actions relative" onClick={(e) => e.stopPropagation()}>
                                            <span className="count-badge">{type.models?.length || 0}</span>
                                            {selectedType?.id === type.id && <div className="connector-line"></div>}
                                            
                                            {canManageTypes && (
                                                <>
                                                    <button onClick={() => startEditing(type.id, 'TYPE', type.name)} className="btn-action-node btn-edit" title="Renomear Tipo">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button onClick={() => requestDelete(type, 'TYPE')} className="btn-action-node btn-delete" title="Excluir Tipo">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
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

                            {canManageModels && (
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
                            )}

                            <div className="items-list">
                                {selectedType.models?.map(model => (
                                    <div key={model.id} className="hierarchy-node model-node">
                                        {editingId === model.id && editingType === 'MODEL' ? (
                                            <div className="edit-mode-box w-full">
                                                <input 
                                                    autoFocus
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value.toUpperCase())}
                                                    className="input-edit"
                                                />
                                                <button onClick={saveEditing} className="btn-save-edit"><Check size={14}/></button>
                                                <button onClick={cancelEditing} className="btn-cancel-edit"><X size={14}/></button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="node-content">
                                                    <div className="w-2 h-2 rounded-full bg-slate-400 mr-3"></div>
                                                    <span>{model.name}</span>
                                                </div>
                                                <div className="node-actions" onClick={(e) => e.stopPropagation()}>
                                                    {canManageModels && (
                                                        <button onClick={() => startEditing(model.id, 'MODEL', model.name)} className="btn-action-node btn-edit" title="Renomear Modelo">
                                                            <Edit2 size={14} />
                                                        </button>
                                                    )}
                                                    {canDeleteModel && (
                                                        <button onClick={() => requestDelete(model, 'MODEL')} className="btn-action-node btn-delete" title="Excluir Modelo">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </>
                                        )}
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

            {/* Custom Delete Confirmation Modal */}
            <DeleteConfirmationModal 
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                expectedValue={itemToDelete?.name}
                title={itemToDelete?.type === 'TYPE' ? "Excluir Tipo de Equipamento" : "Excluir Modelo"}
                description={
                    itemToDelete?.type === 'TYPE' 
                        ? `Atenção: A exclusão do tipo "${itemToDelete?.name}" irá excluir permanentemente TODOS os modelos vinculados a ele.` 
                        : `Atenção: A exclusão do modelo "${itemToDelete?.name}" é permanente.`
                }
                instructionLabel={
                    <span>Para confirmar a exclusão, digite <strong>{itemToDelete?.name}</strong> abaixo:</span>
                }
                inputPlaceholder={`Digite ${itemToDelete?.name}`}
                confirmButtonText={itemToDelete?.type === 'TYPE' ? "Excluir Tipo" : "Excluir Modelo"}
            />
        </div>
    );
};

export default Equipamentos;

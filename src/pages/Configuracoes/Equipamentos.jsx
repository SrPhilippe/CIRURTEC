import React, { useState, useEffect, useContext } from 'react';
import { Plus, Trash2, Settings, Box, ChevronRight, ChevronUp, X, AlertCircle, Edit2, Check } from 'lucide-react';
import api from '../../services/api';
import './Equipamentos.css';
import { AuthContext } from '../../context/AuthContext';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

const Equipamentos = () => {
    const { user } = useContext(AuthContext);
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedTypeId, setExpandedTypeId] = useState(null);
    const [newType, setNewType] = useState('');
    const [newModel, setNewModel] = useState({}); // mapped by type_id
    const [error, setError] = useState(null);

    // Edit State
    const [editingId, setEditingId] = useState(null);
    const [editingType, setEditingType] = useState(null);
    const [editValue, setEditValue] = useState('');

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // Permissions
    const isAdmin = user?.rights === 'ADMIN' || user?.role === 'ADMIN';
    const isMaster = user?.rights === 'Master' || user?.role === 'Master';
    const canManageTypes = isAdmin;
    const canManageModels = isAdmin || isMaster;
    const canDeleteModel = isAdmin;

    useEffect(() => {
        fetchTypes();
    }, []);

    const fetchTypes = async () => {
        try {
            setLoading(true);
            const response = await api.get('/equipment-settings/types');
            setTypes(response.data);
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

    const handleAddModel = async (typeId) => {
        const modelName = newModel[typeId];
        if (!modelName || !modelName.trim()) return;
        try {
            await api.post('/equipment-settings/models', { name: modelName, type_id: typeId });
            setNewModel(prev => ({ ...prev, [typeId]: '' }));
            fetchTypes();
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao adicionar modelo.');
        }
    };

    const requestDelete = (e, item, type) => {
        e.stopPropagation();
        setItemToDelete({ ...item, type });
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            if (itemToDelete.type === 'TYPE') {
                await api.delete(`/equipment-settings/types/${itemToDelete.id}`);
                if (expandedTypeId === itemToDelete.id) setExpandedTypeId(null);
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

    const startEditing = (e, id, type, currentValue) => {
        e.stopPropagation();
        setEditingId(id);
        setEditingType(type);
        setEditValue(currentValue);
    };

    const saveEditing = async (e) => {
        e.stopPropagation();
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

    const getIconForType = (name) => {
        const n = name.toUpperCase();
        if (n.includes('OSMO')) return <Settings size={22} />;
        if (n.includes('LAVA')) return <Settings size={22} />;
        if (n.includes('AUTO')) return <Box size={22} />;
        if (n.includes('MONI')) return <AlertCircle size={22} />;
        return <Box size={22} />;
    };

    return (
        <div className="equipment-settings-container">
            <div className="settings-header">
                <h1 className="page-title">
                    <Settings className="text-blue-600" size={32} />
                    Hierarquia
                </h1>
                <p className="text-slate-500">Organize os tipos e modelos de equipamentos do sistema.</p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-2 border border-red-200">
                    <AlertCircle size={20} />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto p-1"><X size={16} /></button>
                </div>
            )}

            {canManageTypes && (
                <div className="add-new-section">
                    <span className="section-label">Adicionar Novo Tipo</span>
                    <div className="add-item-card">
                        <input 
                            type="text" 
                            value={newType} 
                            onChange={(e) => setNewType(e.target.value.toUpperCase())}
                            placeholder="Ex: Monitor Cardíaco" 
                            className="input-base"
                        />
                        <button onClick={handleAddType} className="btn-save-primary" disabled={!newType.trim()}>Salvar</button>
                    </div>
                </div>
            )}

            <div className="hierarchy-header">
                <span className="section-label">Tipos Cadastrados</span>
                <span className="count-badge" style={{ background: '#eff6ff', color: '#2563eb' }}>Total: {types.length}</span>
            </div>

            <div className="hierarchy-list">
                {loading ? (
                    <div className="loading-container"><p>Carregando...</p></div>
                ) : types.map(type => (
                    <div key={type.id} className={`type-card ${expandedTypeId === type.id ? 'expanded' : ''}`}>
                        <div className="type-header" onClick={() => setExpandedTypeId(expandedTypeId === type.id ? null : type.id)}>
                            <div className="type-info">
                                <div className="icon-box">
                                    {getIconForType(type.name)}
                                </div>
                                <div className="type-meta">
                                    {editingId === type.id && editingType === 'TYPE' ? (
                                        <div className="edit-inline" onClick={e => e.stopPropagation()}>
                                            <input 
                                                autoFocus
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value.toUpperCase())}
                                                className="input-edit"
                                            />
                                            <button onClick={saveEditing} className="btn-save-edit"><Check size={14}/></button>
                                            <button onClick={() => setEditingId(null)} className="btn-cancel-edit"><X size={14}/></button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="type-name">{type.name}</span>
                                            <span className="type-count">{type.models?.length || 0} Modelos</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="actions-group">
                                {canManageTypes && editingId !== type.id && (
                                    <>
                                        <button onClick={(e) => startEditing(e, type.id, 'TYPE', type.name)} className="btn-node-action">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={(e) => requestDelete(e, type, 'TYPE')} className="btn-node-action delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </>
                                )}
                                <div style={{ color: '#94a3b8', marginLeft: '0.5rem' }}>
                                    {expandedTypeId === type.id ? <ChevronUp size={20} /> : <ChevronRight size={20} />}
                                </div>
                            </div>
                        </div>

                        {expandedTypeId === type.id && (
                            <div className="models-section">
                                <span className="models-title">Modelos Relacionados</span>
                                
                                {canManageModels && (
                                    <div className="add-model-inline">
                                        <input 
                                            type="text" 
                                            value={newModel[type.id] || ''} 
                                            onChange={(e) => setNewModel(prev => ({ ...prev, [type.id]: e.target.value.toUpperCase() }))}
                                            placeholder="Adicionar modelo..." 
                                            className="input-model-inline"
                                        />
                                        <button onClick={() => handleAddModel(type.id)} className="btn-add-inline">
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                )}

                                {type.models?.map(model => (
                                    <div key={model.id} className="model-node">
                                        {editingId === model.id && editingType === 'MODEL' ? (
                                            <div className="edit-inline">
                                                <input 
                                                    autoFocus
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value.toUpperCase())}
                                                    className="input-edit"
                                                />
                                                <button onClick={saveEditing} className="btn-save-edit"><Check size={14}/></button>
                                                <button onClick={() => setEditingId(null)} className="btn-cancel-edit"><X size={14}/></button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="model-info">
                                                    <div className="status-dot"></div>
                                                    <span>{model.name}</span>
                                                </div>
                                                <div className="actions-group">
                                                    {canManageModels && (
                                                        <button onClick={(e) => startEditing(e, model.id, 'MODEL', model.name)} className="btn-node-action">
                                                            <Edit2 size={14} />
                                                        </button>
                                                    )}
                                                    {canDeleteModel && (
                                                        <button onClick={(e) => requestDelete(e, model, 'MODEL')} className="btn-node-action delete">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                                {type.models?.length === 0 && <p className="empty-text">Nenhum modelo cadastrado.</p>}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <DeleteConfirmationModal 
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                expectedValue={itemToDelete?.name}
                title={itemToDelete?.type === 'TYPE' ? "Excluir Tipo" : "Excluir Modelo"}
                description={itemToDelete?.type === 'TYPE' ? `Excluir o tipo "${itemToDelete?.name}" removerá todos os modelos vinculados.` : `Confirmar exclusão de "${itemToDelete?.name}".`}
                instructionLabel={<span>Digite <strong>{itemToDelete?.name}</strong> para excluir:</span>}
                confirmButtonText="Confirmar Exclusão"
            />
        </div>
    );
};

export default Equipamentos;

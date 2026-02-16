import React, { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import './SelectionModal.css';

/**
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {string} title
 * @param {Array<{id: string, name: string} | string>} options
 * @param {function} onSelect
 */
const SelectionModal = ({ isOpen, onClose, title, options = [], onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(option => {
            const label = typeof option === 'string' ? option : option.name;
            return label.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [options, searchTerm]);

    if (!isOpen) return null;

    return (
        <div className="selection-modal-overlay" onClick={onClose}>
            <div className="selection-modal" onClick={e => e.stopPropagation()}>
                <div className="selection-header">
                    <h3>{title}</h3>
                    <button className="btn-close-selection" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                
                <div className="selection-search-container">
                    <div style={{ position: 'relative' }}>
                        <Search size={18} className="search-icon-absolute" style={{ top: '50%', transform: 'translateY(-50%)', left: '0.75rem' }} />
                        <input 
                            type="text" 
                            className="selection-search-input" 
                            placeholder="Buscar..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="selection-list">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => {
                            const label = typeof option === 'string' ? option : option.name;
                            const key = typeof option === 'string' ? option : option.id || index;
                            
                            return (
                                <div 
                                    key={key} 
                                    className="selection-item"
                                    onClick={() => {
                                        onSelect(option);
                                        onClose();
                                        setSearchTerm('');
                                    }}
                                >
                                    {label}
                                </div>
                            );
                        })
                    ) : (
                        <div className="selection-empty">Nenhum item encontrado.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SelectionModal;

import React from 'react';
import { Building2, Search, Filter } from 'lucide-react';
import './Clientes.css';

export default function ClientesCadastrados() {
  return (
    <div className="clientes-container">
      <div className="page-header">
        <h1 className="page-title">
          <Building2 size={32} /> Clientes Cadastrados
        </h1>
        <div className="action-bar" style={{ marginTop: 0 }}>
             <button className="btn-secondary">
                <Filter size={18} /> Filtrar
             </button>
        </div>
      </div>

      <div className="client-form-card">
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Search size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <h3>Lista de Clientes</h3>
              <p>A visualização de lista será implementada aqui.</p>
              <br/>
              <p>(Placeholder da Implementação)</p>
          </div>
      </div>
    </div>
  );
}

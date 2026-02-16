import React from 'react';
import { Banknote } from 'lucide-react';
import './AcertoViagem.css'; // Optional, create if needed later

const AcertoViagem = () => {
  return (
    <div className="acerto-viagem-container">
      <div className="page-header">
        <h1 className="page-title">
          <Banknote size={32} /> Acerto de Viagem
        </h1>
      </div>
      <div className="content-placeholder" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        <p>Página em construção.</p>
      </div>
    </div>
  );
};

export default AcertoViagem;

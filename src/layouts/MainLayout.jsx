import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Menu } from 'lucide-react';

const MainLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  // Fecha o menu mobile ao navegar
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Determine page title based on current path
  const getPageTitle = (pathname) => {
    if (pathname === '/') return 'Início';
    if (pathname === '/email-viagem') return 'Viagens';
    if (pathname === '/clientes/lista') return 'Clientes Cadastrados';
    if (pathname === '/clientes/novo') return 'Novo Cadastro';
    if (pathname.startsWith('/clientes/editar/')) return 'Editar Cliente';
    if (pathname.startsWith('/clientes/')) return 'Detalhes do Cliente'; // View mode
    if (pathname === '/perfil') return 'Meu Perfil';
    if (pathname === '/users') return 'Usuários';
    if (pathname === '/admin/register') return 'Cadastrar Usuário';
    if (pathname === '/configuracoes/equipamentos') return 'Equipamentos';
    if (pathname === '/configuracoes/email-garantia') return 'E-mail Garantia';
    
    return 'CIRURTEC'; // Default
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="app-grid">
      
      {/* MOBILE HEADER - Only visible on small screens (via CSS) */}
      <div className="mobile-header">
        <button 
          className="mobile-menu-btn"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          <Menu size={24} />
        </button>
        <span className="mobile-logo-text">{pageTitle}</span>
      </div>

      <Sidebar 
          mobileOpen={isMobileOpen} 
          setMobileOpen={setIsMobileOpen} 
      />
      
      {/* OVERLAY for mobile */}
      {isMobileOpen && (
          <div 
              className="sidebar-overlay"
              onClick={() => setIsMobileOpen(false)}
          />
      )}

      <main className="content-grid">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;

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
        <span className="mobile-logo-text">CIRURTEC</span>
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

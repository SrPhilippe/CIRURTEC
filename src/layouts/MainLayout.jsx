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
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', flexDirection: 'column' }}>
      
      {/* MOBILE HEADER - Only visible on small screens */}
      <div className="mobile-header">
        <button 
          className="mobile-menu-btn"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          <Menu size={24} />
        </button>
        <span className="mobile-logo-text">CIRURTEC</span>
      </div>

      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
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

        <div style={{ flex: 1, overflow: 'auto', width: '100%' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default MainLayout;

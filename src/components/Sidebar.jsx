import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  ChevronLeft, 
  ChevronRight, 
  Plane, 
  Users, 
  Settings, 
  FileText, 
  BarChart, 
  HelpCircle,
  Menu
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  // Initialize state from localStorage or default to false (expanded)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    return savedState === 'true';
  });

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed);
  }, [isCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const menuItems = [
    { title: 'Início', icon: Home, route: '/', exact: true },
    { title: 'E-mail de Viagens', icon: Plane, route: '/email-viagem' },
    { title: 'Usuários', icon: Users, route: '/users', disabled: true },
    { title: 'Configurações', icon: Settings, route: '/settings', disabled: true },
    { title: 'Relatórios', icon: FileText, route: '/reports', disabled: true },
    { title: 'Dashboard', icon: BarChart, route: '/dashboard', disabled: true },
    { title: 'Ajuda', icon: HelpCircle, route: '/help', disabled: true },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : 'expanded'}`}>
      <div className="sidebar-header">
        {!isCollapsed && <span className="sidebar-title">Menu</span>}
        <button 
          className="sidebar-toggle" 
          onClick={toggleSidebar}
          title={isCollapsed ? "Expandir" : "Recolher"}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.disabled ? '#' : item.route}
            className={({ isActive }) => 
              `sidebar-item ${isActive && !item.disabled ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`
            }
            onClick={(e) => item.disabled && e.preventDefault()}
            title={isCollapsed ? item.title : ''}
          >
            <item.icon size={20} className="sidebar-icon" />
            {!isCollapsed && <span className="sidebar-text">{item.title}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;

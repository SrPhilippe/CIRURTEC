import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home,
  User,
  ChevronLeft, 
  ChevronRight, 
  Car, 
  Users, 
  Settings, 
  FileText, 
  BarChart, 
  HelpCircle,
  Menu,
  Building2,
  List,
  Plus,
  ChevronDown,
  LogOut,
  UserPlus,
  Mail,
  Banknote
} from 'lucide-react';
import logo from '../assets/images/logo-cirurtec.png';
import './Sidebar.css';

import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { checkPermission, PERMISSIONS } from '../utils/permissions';


const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const { user, logout } = useContext(AuthContext); // Get user and logout
  const location = useLocation();
  
  // ... (state logic remains same)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    return savedState === 'true';
  });

  const [expandedMenus, setExpandedMenus] = useState({});

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed);
  }, [isCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleSubmenu = (title) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setTimeout(() => {
        setExpandedMenus(prev => ({ [title]: !prev[title] }));
      }, 50);
    } else {
      setExpandedMenus(prev => ({ [title]: !prev[title] }));
    }
  };

  const menuItems = [
    { title: user?.username || 'Perfil', icon: User, route: '/perfil' },
    { title: 'Início', icon: Home, route: '/', exact: true },
    { 
      title: 'Viagens', 
      icon: Car, 
      isSubmenu: true,
      subItems: [
        { title: 'E-mail Viagem', icon: Mail, route: '/viagens/email' },
        { title: 'Acerto de Viagem', icon: Banknote, route: '/viagens/acerto' }
      ]
    },
    { 
      title: 'Clientes', 
      icon: Building2, 
      isSubmenu: true,
      subItems: [
        { title: 'Clientes Cadastrados', icon: List, route: '/clientes/lista' },
        { title: 'Novo Cadastro', icon: Plus, route: '/clientes/novo' },
      ]
    },
    { 
      title: 'Usuários', 
      icon: Users, 
      isSubmenu: true,
      hidden: !checkPermission(user, PERMISSIONS.MANAGE_USERS),
      subItems: [
        { title: 'Lista de Usuários', icon: List, route: '/users' },
        { title: 'Cadastrar Usuário', icon: UserPlus, route: '/admin/register' },
      ]
    }, 
    { title: 'Relatórios', icon: FileText, route: '/reports', disabled: true },
    { title: 'Dashboard', icon: BarChart, route: '/dashboard', disabled: true },
    { 
      title: 'Configurações', 
      icon: Settings, 
      isSubmenu: true, 
      subItems: [
        { title: 'Equipamentos', icon: List, route: '/configuracoes/equipamentos' },
        { title: 'E-mail Garantia', icon: Mail, route: '/configuracoes/email-garantia' }
      ]
    },
    { title: 'Ajuda', icon: HelpCircle, route: '/help', disabled: true },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : 'expanded'} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        {!isCollapsed && <img src={logo} alt="CIRURTEC" className="sidebar-logo" style={{ maxWidth: '120px', height: 'auto' }} />}
        
        {/* Close button for mobile */}
        <button 
          className="sidebar-toggle mobile-close-btn"
          onClick={() => setMobileOpen(false)}
        >
            <ChevronLeft size={24} />
        </button>
        <button 
          className="sidebar-toggle" 
          onClick={toggleSidebar}
          title={isCollapsed ? "Expandir" : "Recolher"}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item, index) => {
          if (item.hidden) return null;

          if (item.isSubmenu) {
            const isExpanded = expandedMenus[item.title];
            const isChildActive = item.subItems.some(sub => location.pathname === sub.route);
            
            return (
              <div key={index} className="sidebar-group">
                <div 
                  className={`sidebar-item submenu-trigger ${isChildActive ? 'active-parent' : ''}`}
                  onClick={() => toggleSubmenu(item.title)}
                  title={isCollapsed ? item.title : ''}
                >
                  <item.icon size={20} className="sidebar-icon" />
                  {!isCollapsed && (
                    <>
                      <span className="sidebar-text">{item.title}</span>
                      <ChevronDown 
                        size={16} 
                        className={`submenu-arrow ${isExpanded ? 'rotated' : ''}`} 
                      />
                    </>
                  )}
                </div>
                
                <div className={`sidebar-submenu ${isExpanded ? 'open' : ''}`}>
                  {item.subItems.map((subItem, subIndex) => (
                    <NavLink
                      key={subIndex}
                      to={subItem.route}
                      className={({ isActive }) => 
                        `sidebar-item sub-item ${isActive ? 'active' : ''}`
                      }
                      title={isCollapsed ? subItem.title : ''}
                    >
                      <subItem.icon size={18} className="sidebar-icon" />
                      {!isCollapsed && <span className="sidebar-text">{subItem.title}</span>}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          }

          return (
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
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-item logout-btn" onClick={logout} title={isCollapsed ? "Sair" : ""}>
          <LogOut size={20} className="sidebar-icon" />
          {!isCollapsed && <span className="sidebar-text">Sair</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

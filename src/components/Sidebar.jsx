import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  Menu,
  Building2,
  List,
  Plus,
  ChevronDown
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  
  // Initialize state from localStorage or default to false (expanded)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    return savedState === 'true';
  });

  // State for expanded submenus
  const [expandedMenus, setExpandedMenus] = useState({});

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed);
  }, [isCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    // When collapsing sidebar, we might want to collapse submenus too, or keep them open?
    // Let's keep them as is for now, but CSS will hide text.
  };

  const toggleSubmenu = (title) => {
    if (isCollapsed) {
      setIsCollapsed(false); // Auto expand sidebar if clicking a submenu trigger while collapsed
      setTimeout(() => {
        setExpandedMenus(prev => ({ ...prev, [title]: !prev[title] }));
      }, 50);
    } else {
      setExpandedMenus(prev => ({ ...prev, [title]: !prev[title] }));
    }
  };

  const menuItems = [
    { title: 'Início', icon: Home, route: '/', exact: true },
    { title: 'E-mail de Viagens', icon: Plane, route: '/email-viagem' },
    { 
      title: 'Clientes', 
      icon: Building2, 
      isSubmenu: true,
      subItems: [
        { title: 'Clientes Cadastrados', icon: List, route: '/clientes/lista' },
        { title: 'Novo Cadastro', icon: Plus, route: '/clientes/novo' },
      ]
    },
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
        {menuItems.map((item, index) => {
          if (item.isSubmenu) {
            const isExpanded = expandedMenus[item.title];
            // Check if any child is active
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
                
                {/* Submmenu Items */}
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
    </aside>
  );
};

export default Sidebar;

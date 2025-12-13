import React, { useContext } from 'react';
import MenuCard from '../components/MenuCard';
import { Plane, Users, Settings, FileText, BarChart, HelpCircle, LogOut } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import './Home.css'; // Assuming you might create this or use inline/existing styles if any

const Home = () => {
  const { user, logout } = useContext(AuthContext);

  const menuItems = [
    { title: 'E-mail de Viagens', icon: Plane, route: '/email-viagem', disabled: false },
    { 
      title: 'Usuários', 
      icon: Users, 
      route: '/users', 
      disabled: user?.rights !== 'ADMIN', // Only Admin
      hidden: user?.rights !== 'ADMIN' // Optionally hide it entirely? Request said "unlock". Usually means visible but maybe restricted? Or just visible to Admin.
      // "desbloquear o menu de usuários somente para ADMIN" -> "unlock ... only for ADMIN".
      // Let's hide it for non-admins to avoid confusion, or show disabled. 
      // Sidebar hides it. Consistency suggests hiding or disabling. 
      // Let's hide it to keep UI clean, or if we want to show it exists but is locked, use disabled.
      // I'll stick to hiding it if user is not admin, similar to Sidebar.
    },
    { title: 'Configurações', icon: Settings, route: '/settings', disabled: false }, // Unlocked
    { title: 'Relatórios', icon: FileText, route: '/reports', disabled: true },
    { title: 'Dashboard', icon: BarChart, route: '/dashboard', disabled: true },
    { title: 'Ajuda', icon: HelpCircle, route: '/help', disabled: true },
  ];

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-title">
             <h1>CIRURTEC</h1>
             <p>Sistema Administrativo</p>
        </div>
        <button className="home-logout-btn" onClick={logout} title="Sair">
            <LogOut size={20} />
            <span>Sair</span>
        </button>
      </header>
      <div className="menu-grid">
        {menuItems.map((item, index) => {
            if (item.hidden) return null;
            
            return (
              <MenuCard
                key={index}
                title={item.title}
                icon={item.icon}
                route={item.route}
                disabled={item.disabled}
              />
            );
        })}
      </div>
    </div>
  );
};

export default Home;

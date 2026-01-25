import React, { useContext } from 'react';
import MenuCard from '../components/MenuCard';
import { Car, Users, UserCircle, Settings, FileText, BarChart, HelpCircle, LogOut, User } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/images/logo-cirurtec.png';
import './Home.css'; // Assuming you might create this or use inline/existing styles if any

const Home = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const menuItems = [
    { title: 'Viagens', icon: Car, route: '/email-viagem', disabled: false },
    { title: 'Clientes', icon: UserCircle, route: '/clientes/lista', disabled: false },
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
    { title: 'Perfil', icon: User, route: '/perfil', disabled: false }, // Unlocked
    { title: 'Relatórios', icon: FileText, route: '/reports', disabled: true },
    { title: 'Dashboard', icon: BarChart, route: '/dashboard', disabled: true },
    { title: 'Ajuda', icon: HelpCircle, route: '/help', disabled: true },
  ];

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-title">
             <img src={logo} alt="CIRURTEC" className="home-logo" />
             <p>Sistema Administrativo</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '1rem' }}>
            <button className="home-logout-btn" onClick={() => navigate('/perfil')} title="Meu Perfil">
                <User size={20} />
                <span>Perfil</span>
            </button>
            <button className="home-logout-btn" onClick={logout} title="Sair">
                <LogOut size={20} />
                <span>Sair</span>
            </button>
        </div>
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

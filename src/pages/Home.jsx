import React, { useContext } from 'react';
import MenuCard from '../components/MenuCard';
import { Car, Users, UserCircle, Settings, FileText, BarChart, HelpCircle, LogOut, User, Mail, Banknote, List, Plus, UserPlus } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/images/logo-cirurtec.png';
import './Home.css'; // Assuming you might create this or use inline/existing styles if any

const Home = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const menuItems = [
    { title: 'E-mail Viagem', icon: Mail, route: '/viagens/email', disabled: false },
    { title: 'Acerto de Viagem', icon: Banknote, route: '/viagens/acerto', disabled: false },
    { title: 'Clientes Cadastrados', icon: List, route: '/clientes/lista', disabled: false },
    { title: 'Novo Cadastro', icon: Plus, route: '/clientes/novo', disabled: false },
    { 
      title: 'Lista de Usuários', 
      icon: List, 
      route: '/users', 
      disabled: user?.rights !== 'ADMIN', 
      hidden: user?.rights !== 'ADMIN'
    },
    { 
      title: 'Cadastrar Usuário', 
      icon: UserPlus, 
      route: '/admin/register', 
      disabled: user?.rights !== 'ADMIN', 
      hidden: user?.rights !== 'ADMIN'
    },
    { title: 'Perfil', icon: User, route: '/perfil', disabled: false },
    { title: 'Equipamentos', icon: Settings, route: '/configuracoes/equipamentos', disabled: false },
    { title: 'E-mail Garantia', icon: Mail, route: '/configuracoes/email-garantia', disabled: false },
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

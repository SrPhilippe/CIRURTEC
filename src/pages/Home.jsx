import React from 'react';
import MenuCard from '../components/MenuCard';
import { Plane, Users, Settings, FileText, BarChart, HelpCircle } from 'lucide-react';

const Home = () => {
  const menuItems = [
    { title: 'E-mail de Viagens', icon: Plane, route: '/email-viagem', disabled: false },
    { title: 'Usuários', icon: Users, route: '/users', disabled: true },
    { title: 'Configurações', icon: Settings, route: '/settings', disabled: true },
    { title: 'Relatórios', icon: FileText, route: '/reports', disabled: true },
    { title: 'Dashboard', icon: BarChart, route: '/dashboard', disabled: true },
    { title: 'Ajuda', icon: HelpCircle, route: '/help', disabled: true },
  ];

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>CIRURTEC</h1>
        <p>Sistema Administrativo</p>
      </header>
      <div className="menu-grid">
        {menuItems.map((item, index) => (
          <MenuCard
            key={index}
            title={item.title}
            icon={item.icon}
            route={item.route}
            disabled={item.disabled}
          />
        ))}
      </div>
    </div>
  );
};

export default Home;

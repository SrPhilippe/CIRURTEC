import React from 'react';
import { Link } from 'react-router-dom';

const MenuCard = ({ title, icon: Icon, route, disabled }) => {
  if (disabled) {
    return (
      <div className="menu-card disabled">
        <div className="icon-container">
          <Icon size={48} />
        </div>
        <h3>{title}</h3>
      </div>
    );
  }

  return (
    <Link to={route} className="menu-card">
      <div className="icon-container">
        <Icon size={48} />
      </div>
      <h3>{title}</h3>
    </Link>
  );
};

export default MenuCard;

import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaBuilding, FaCalendarAlt, FaHardHat, FaBook, FaUsers, FaBell, FaCog } from 'react-icons/fa';
import '../../styles/Sidebar.css';

const Sidebar = () => {
  const menuItems = [
    { path: '/', icon: <FaHome />, label: '대시보드' },
    { path: '/sites', icon: <FaBuilding />, label: '현장 관리' },
    { path: '/schedule', icon: <FaCalendarAlt />, label: '일정 관리' },
    { path: '/safety', icon: <FaHardHat />, label: '안전 관리' },
    { path: '/materials', icon: <FaBook />, label: '자재 관리' },
    { path: '/users', icon: <FaUsers />, label: '인력 관리' },
    { path: '/notifications', icon: <FaBell />, label: '알림' },
    { path: '/settings', icon: <FaCog />, label: '설정' }
  ];

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar; 
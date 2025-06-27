import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaBuilding, FaComments, FaBell, FaUsers, FaCalendarAlt, FaHardHat, FaBox, FaFileAlt } from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = () => {
  const menuItems = [
    { path: '/', icon: <FaHome />, label: '대시보드' },
    { path: '/sites', icon: <FaBuilding />, label: '현장 관리' },
    { path: '/discussions', icon: <FaComments />, label: '토론' },
    { path: '/notifications', icon: <FaBell />, label: '알림' },
    { path: '/user-management', icon: <FaUsers />, label: '사용자 관리' },
    { path: '/schedule', icon: <FaCalendarAlt />, label: '일정 관리' },
    { path: '/safety', icon: <FaHardHat />, label: '안전 관리' },
    { path: '/materials', icon: <FaBox />, label: '자재 관리' },
    { path: '/reports', icon: <FaFileAlt />, label: '보고서' }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>건설 관리 시스템</h1>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar; 
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaBuilding, FaList, FaComments, FaBell, FaUsers, FaCalendarAlt, FaHardHat, FaBox, FaFileAlt, FaChartBar } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { getAccessibleMenus } from '../utils/menuPermissions';
import './Sidebar.css';

const Sidebar = () => {
  const [isMobile, setIsMobile] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // 아이콘 매핑
  const iconMap = {
    Dashboard: <FaHome />,
    Star: <FaBuilding />,
    Construction: <FaBuilding />,
    Map: <FaBuilding />,
    Security: <FaHardHat />,
    AttachMoney: <FaFileAlt />,
    Description: <FaFileAlt />,
    Forum: <FaComments />,
    People: <FaUsers />,
    MonetizationOn: <FaFileAlt />,
    BarChart: <FaChartBar />,
    Event: <FaCalendarAlt />,
    Business: <FaUsers />,
    Lock: <FaBell />,
    List: <FaList />,
    Timeline: <FaChartBar />,
    Notifications: <FaBell />,
    AdminPanelSettings: <FaUsers />,
    Inventory: <FaBox />
  };

  // 권한 기반 메뉴 아이템 가져오기
  const getMenuItems = () => {
    if (!currentUser) return [];
    
    const accessibleMenus = getAccessibleMenus(currentUser);
    return accessibleMenus.map(menu => ({
      path: menu.path,
      icon: iconMap[menu.icon] || <FaFileAlt />,
      label: menu.label,
      hideOnMobile: menu.key === 'daemaTeam'
    }));
  };

  const menuItems = getMenuItems();

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
            style={{ 
              display: isMobile && item.hideOnMobile ? 'none' : 'flex' 
            }}
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
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaBars, FaTimes, FaUser, FaSignOutAlt, FaCog, FaBell } from 'react-icons/fa';
import '../../styles/Header.css';
import { useMediaQuery } from 'react-responsive';
import NotificationSystem from './NotificationSystem';
import ThemeToggle from './ThemeToggle';
import PushNotification from './PushNotification';

const Header = () => {
  const { logout, currentUser } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // 디버깅용: 현재 사용자 정보 출력
  console.log('Header - 현재 사용자 정보:', currentUser);

  const menuItems = [
    { path: '/schedule', label: '일정관리', icon: '📅' },
    { path: '/overview', label: '주요현장', icon: '⭐' },
    { path: '/sites', label: '현장관리', icon: '🏗️' },
    { path: '/safety', label: '안전관리', icon: '⚠️' },
    { path: '/discussions', label: '토론의견', icon: '💬' },
    { path: '/progress', label: '기성관리', icon: '💰' },
    { path: '/vendors', label: '거래처현황', icon: '💼' },
    { path: '/documents', label: '문서관리', icon: '📄' },
    { path: '/reports', label: '보고서', icon: '📊' }
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  // 모바일 여부 체크 (react-responsive)
  const isMobile = useMediaQuery({ maxWidth: 600 });

  return (
    <header className="header">
      <div className="header-left">
        {/* 햄버거 버튼: 모바일에서만 보이게 */}
        <button
          className="menu-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{ display: isMobile ? 'block' : 'none' }}
        >
          {isMenuOpen ? <FaTimes /> : <FaBars />}
        </button>
        {/* Chunwoo 로고: 모바일에서는 메뉴 토글, PC에서는 홈 이동 */}
        <Link
          to="/"
          className="header-title"
          onClick={e => {
            if (isMobile) {
              e.preventDefault();
              setIsMenuOpen(!isMenuOpen);
            }
            // PC에서는 기본 동작(홈 이동)
          }}
        >
          Chunwoo
        </Link>
      </div>

      <nav className={`header-nav ${isMenuOpen ? 'open' : ''}`}>
        <ul className="header-menu">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link 
                to={item.path} 
                className={location.pathname === item.path ? 'active' : ''}
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="menu-icon">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="header-right">
        <NotificationSystem />
        <ThemeToggle />
        <PushNotification />
        
        <div className="user-menu">
          <button 
            className="user-menu-button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          >
            <FaUser />
          </button>
          
          {isUserMenuOpen && (
            <div className="user-dropdown">
              <div className="user-info">
                <div className="user-name">
                  {currentUser?.name || currentUser?.displayName || '사용자'}
                  <span className="user-role" data-role={currentUser?.role}>
                    {currentUser?.role === 'master' && '마스터'}
                    {currentUser?.role === 'admin' && '관리자'}
                    {currentUser?.role === 'team' && `팀 ${currentUser?.grade || '팀원'}`}
                    {currentUser?.role === 'user' && '일반회원'}
                    {currentUser?.role === 'pending' && '보류'}
                    {!currentUser?.role && '일반회원'}
                  </span>
                </div>
                <div className="user-email">{currentUser?.email || '이메일 없음'}</div>
              </div>
              <div className="dropdown-divider" />
              <button className="dropdown-item">
                <FaCog className="dropdown-icon" />
                계정 설정
              </button>
              <button className="dropdown-item logout" onClick={handleLogout}>
                <FaSignOutAlt className="dropdown-icon" />
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaSun, FaMoon, FaDesktop, FaBars, FaTimes, FaUser, FaSignOutAlt, FaCog } from 'react-icons/fa';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/Header.css';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SecurityIcon from '@mui/icons-material/Security';
import EventIcon from '@mui/icons-material/Event';
import DescriptionIcon from '@mui/icons-material/Description';
import BarChartIcon from '@mui/icons-material/BarChart';
import ForumIcon from '@mui/icons-material/Forum';
import GroupIcon from '@mui/icons-material/Group';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';

import { useAuth } from '../contexts/AuthContext';
import { TrendingUp as TrendingUpIconMUI, MonetizationOn as MonetizationOnIconMUI, Star as StarIconMUI } from '@mui/icons-material';
import PeopleIcon from '@mui/icons-material/People';

const Header = ({ user, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const menuRef = useRef();
  const { currentUser, refreshUserInfo } = useAuth();

  const menuItems = [
    { path: '/importantsite', label: '주요현장', icon: <StarIcon /> },
    { path: '/sites', label: '현장관리', icon: <DashboardIcon /> },
    { path: '/safety', label: '안전관리', icon: <SecurityIcon /> },
    { path: '/discussions', label: '토론의견', icon: <ForumIcon /> },
    { path: '/vendors', label: '거래처현황', icon: <PeopleIcon /> },
    { path: '/cost', label: '기성관리', icon: <MonetizationOnIcon /> },
    { path: '/documents', label: '문서관리', icon: <DescriptionIcon /> },
    { path: '/reports', label: '보고서', icon: <BarChartIcon /> }
  ];

  // 모바일 메뉴 외부 클릭 시 닫힘
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isMenuOpen]);

  // 반응형: 모바일, 태블릿, 데스크탑 구분
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = windowWidth <= 600;
  const isTablet = windowWidth > 600 && windowWidth <= 1180;

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleUserMenuToggle = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleLogout = async () => {
    try {
      if (onLogout) {
        await onLogout();
      }
      setIsUserMenuOpen(false);
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  const getGradeLabel = (user) => {
    if (!user) return { label: '게스트', color: '#666', bgColor: '#f0f0f0' };
    
    const email = user.email?.toLowerCase() || '';
    const displayName = user.displayName || '';
    const role = user.role || '';
    const grade = user.grade || '';
    const teamGrade = user.teamGrade || '';
    
    console.log('Header - 현재 사용자 정보:', { 
      email, 
      displayName, 
      role, 
      grade, 
      teamGrade,
      전체사용자정보: user 
    });
    
    // 마스터 권한 확인 (role 우선, 그 다음 email/displayName)
    if (role === 'master' || grade === '마스터' || email.includes('master') || displayName.includes('마스터')) {
      return { label: 'MASTER', color: '#fff', bgColor: '#ff4444' };
    }
    
    // 관리자 권한 확인
    if (role === 'admin' || grade === '관리자' || email.includes('admin') || displayName.includes('관리자')) {
      return { label: '관리자', color: '#000', bgColor: '#ffeb3b' };
    }
    
    // 팀 권한 확인 (role이 team인 경우)
    if (role === 'team') {
      if (teamGrade === 'A') {
        return { label: 'TEAM A', color: '#fff', bgColor: '#4caf50' };
      } else if (teamGrade === 'B') {
        return { label: 'TEAM B', color: '#fff', bgColor: '#4caf50' };
      }
      return { label: 'TEAM', color: '#fff', bgColor: '#4caf50' };
    }
    
    // 일반회원
    return { label: 'USER', color: '#fff', bgColor: '#2196f3' };
  };

  const userGrade = getGradeLabel(currentUser);

  return (
    <header 
      className={`header ${theme}`}
      style={isMobile ? { height: '38px', minHeight: '38px', maxHeight: '38px' } : {}}
    >
      <div className="header-container">
        {/* 좌측: 메뉴(데스크탑/태블릿) */}
        {!isMobile && (
          <nav className="header-nav">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 13 }}>
                  {item.icon}
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>
        )}
        {/* 모바일: 햄버거 메뉴 버튼만 */}
        {isMobile && (
          <button className="hamburger-menu" onClick={handleMenuToggle} aria-label="메뉴 열기/닫기">
            {isMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        )}
        {/* 우측: 테마/유저 */}
        <div className="header-right">
          <div className="theme-toggle-group">
            <button className={`theme-toggle${theme==='light' ? ' active' : ''}`} onClick={() => setTheme('light')} title="라이트 모드"><FaSun /></button>
            <button className={`theme-toggle${theme==='dark' ? ' active' : ''}`} onClick={() => setTheme('dark')} title="다크 모드"><FaMoon /></button>
            <button className={`theme-toggle${theme==='system' ? ' active' : ''}`} onClick={() => setTheme('system')} title="시스템 모드"><FaDesktop /></button>
          </div>
          {user ? (
            <div className="user-menu">
              <button className="user-menu-button" onClick={handleUserMenuToggle}>
                <div className="user-avatar">
                  {user.displayName?.[0] || user.email?.[0] || 'U'}
                </div>
                <span className="user-name">{user.displayName || user.email}</span>
              </button>
              {isUserMenuOpen && (
                <div className="user-dropdown">
                  <div className="user-info">
                    <div className="user-name">{user.displayName || '사용자'}</div>
                    <div className="user-email">{user.email}</div>
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
          ) : (
            <Link to="/login" className="login-button">
              <FaUser className="dropdown-icon" />
              로그인
            </Link>
          )}
          {/* 등급 표시 */}
          <div 
            style={{ 
              marginLeft: 24, 
              fontWeight: 600, 
              fontSize: 13,
              padding: '4px 12px',
              borderRadius: 20,
              backgroundColor: userGrade.bgColor,
              color: userGrade.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 'fit-content',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              border: '2px solid red' // 테스트용 테두리 추가
            }}
            onClick={async () => {
              console.log('사용자 정보 강제 새로고침 시작');
              await refreshUserInfo();
              console.log('사용자 정보 새로고침 완료');
            }}
          >
            {userGrade.label} - TEST
          </div>
        </div>
      </div>
      {/* 모바일 메뉴 */}
      {isMobile && isMenuOpen && (
        <nav className="mobile-nav" ref={menuRef}>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
};

export default Header;
 
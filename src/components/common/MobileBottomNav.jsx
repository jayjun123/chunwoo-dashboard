import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Box,
  Slide,
  Typography,
  IconButton
} from '@mui/material';
import {
  Home as HomeIcon,
  Business as SitesIcon,
  Timeline as TimelineIcon,
  Warning as SafetyIcon,
  Chat as ChatIcon,
  AttachMoney as ProgressIcon,
  Engineering as EngineeringIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  
  // expandCenter 상태 추가
  const [expandCenter, setExpandCenter] = useState(false);
  const [sitesList, setSitesList] = useState([]); // 현장 목록

  // 네비게이션 아이템 정의 (핵심 기능만 유지)
  const navItems = [
    { path: '/', label: '홈', icon: HomeIcon },
    { path: '/sites', label: '현장', icon: SitesIcon },
    { path: '/gantt', label: '현장일정', icon: TimelineIcon },
    { path: '/safety', label: '안전', icon: SafetyIcon },
    { path: '/discussions', label: '토론', icon: ChatIcon },
    { path: '/progress', label: '기성', icon: ProgressIcon }
  ];

  // 현재 페이지 인덱스
  const currentIndex = navItems.findIndex(item => item.path === location.pathname);

  // 네비게이션 변경 핸들러
  const handleNavigationChange = (event, newValue) => {
    if (newValue !== null) {
      navigate(navItems[newValue].path);
    }
  };

  // 금일현장 클릭 핸들러
  const handleTodaySitesClick = () => {
    setExpandCenter(!expandCenter);
  };

  // 터치 피드백을 위한 스타일
  const touchFeedbackStyle = {
    '&:active': {
      transform: 'scale(0.95)',
      transition: 'transform 0.1s ease'
    },
    '&:hover': {
      bgcolor: 'action.hover'
    }
  };

  // 오늘 일정 데이터 fetch
  useEffect(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const unsubSchedules = onSnapshot(collection(db, 'schedules'), (snapshot) => {
      const allSchedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 클라이언트에서 오늘 날짜 필터링
      const todaySchedules = allSchedules.filter(item => {
        if (!item.date) return false;
        
        let itemDate;
        if (item.date.toDate) {
          itemDate = item.date.toDate();
        } else if (item.date instanceof Date) {
          itemDate = item.date;
        } else if (typeof item.date === 'string') {
          itemDate = new Date(item.date + 'T12:00:00');
        } else {
          itemDate = new Date(item.date);
        }
        
        return itemDate >= todayStart && itemDate <= todayEnd;
      });
      
      // 금일현장 (type에 '현장' 포함)
      const todaySites = todaySchedules.filter(item => 
        item.type && 
        item.type.includes('현장')
      );
      
      console.log('🔥 모바일 오늘 현장 일정:', todaySites.length, '개', todaySites);
      
      setSitesList(todaySites);
    }, (err) => {
      console.error('🔥 모바일 일정 데이터 연동 오류:', err);
    });

    return () => {
      console.log('🔥 모바일 일정 데이터 연동 해제');
      unsubSchedules();
    };
  }, []);

  // 백드롭 클릭 핸들러
  const handleBackdropClick = (e, closeFn) => {
    if (e.target === e.currentTarget) {
      closeFn(false);
    }
  };

  return (
    <>
      {/* 하단 네비게이션 - 모바일에서만 표시 */}
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          borderTop: 1,
          borderColor: 'divider',
          display: { xs: 'block', md: 'none' }
        }}
        elevation={3}
      >
        <BottomNavigation
          value={currentIndex}
          onChange={handleNavigationChange}
          showLabels
          sx={{
            height: 70,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            '& .MuiBottomNavigationAction-root': {
              minWidth: 'auto',
              padding: '6px 8px',
              ...touchFeedbackStyle
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.7rem',
              marginTop: '4px'
            }
          }}
        >
          {navItems.map((item, index) => {
            const IconComponent = item.icon;
            
            return (
              <BottomNavigationAction
                key={item.path}
                label={item.label}
                icon={<IconComponent />}
                sx={{
                  '&.Mui-selected': {
                    color: 'primary.main'
                  }
                }}
              />
            );
          })}
          
          {/* 금일현장 아이콘 추가 */}
          <BottomNavigationAction
            label="금일현장"
            icon={<EngineeringIcon />}
            onClick={handleTodaySitesClick}
            sx={{
              color: '#FFD600',
              '&:active': {
                transform: 'scale(0.95)',
                transition: 'transform 0.1s ease'
              }
            }}
          />
        </BottomNavigation>
      </Paper>

      {/* 금일현장 확장 패널 */}
      {expandCenter && (
        <Box position="fixed" top={0} left={0} right={0} bottom={0} zIndex={1201} onClick={() => setExpandCenter(false)} />
      )}
      <Slide direction="up" in={expandCenter} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 70,
            zIndex: 1202,
            bgcolor: '#23242a',
            color: '#fff',
            boxShadow: 3,
            borderRadius: '16px 16px 0 0',
            p: 3,
            maxWidth: 900,
            margin: '0 auto',
            minHeight: 260
          }}
          onClick={e => handleBackdropClick(e, setExpandCenter)}
          data-panel="center"
        >
          <IconButton 
            onClick={() => setExpandCenter(false)} 
            sx={{ position: 'absolute', right: 16, top: 16, color: '#fff' }}
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            금일현장/기성/협의/안전 실시간 현황
          </Typography>
          
          {/* 금일현장 목록 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1, color: '#FFD600', fontWeight: 600 }}>
              🏗️ 금일현장 ({sitesList.length}개)
            </Typography>
            {sitesList.length === 0 ? (
              <Typography sx={{ color: '#ccc', fontSize: 14 }}>오늘 현장 일정이 없습니다.</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {sitesList.map((item, index) => (
                  <Box key={item.id} sx={{ 
                    p: 0.3,
                    bgcolor: '#23242a', 
                    borderRadius: 0.5,
                    border: '1px solid #444',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 0.2,
                    minHeight: 0
                  }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: 10, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', p: 0, m: 0 }}>
                        {item.title || item.text || item.description || item.desc || '설명 없음'}
                      </Typography>
                      {(item.description || item.desc) && (item.description || item.desc).trim() && (
                        <Typography sx={{ color: '#ccc', fontSize: 9, lineHeight: 1.1, p: 0, m: 0, mt: 0.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.description || item.desc}
                        </Typography>
                      )}
                    </Box>
                    <Typography sx={{ color: '#FFD600', fontSize: 9, fontWeight: 600, ml: 0.5, flexShrink: 0, p: 0, m: 0, lineHeight: 1.1 }}>
                      {item.startDate}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* 금일입찰 목록 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1, color: '#4FC3F7', fontWeight: 600 }}>
              📈 금일입찰 (0개)
            </Typography>
            <Typography sx={{ color: '#ccc', fontSize: 14 }}>오늘 입찰 일정이 없습니다.</Typography>
          </Box>

          {/* 금일회의 목록 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1, color: '#FF7043', fontWeight: 600 }}>
              💬 금일회의 (0개)
            </Typography>
            <Typography sx={{ color: '#ccc', fontSize: 14 }}>오늘 회의 일정이 없습니다.</Typography>
          </Box>

          {/* 금일현설 목록 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1, color: '#81C784', fontWeight: 600 }}>
              🛡️ 금일현설 (0개)
            </Typography>
            <Typography sx={{ color: '#ccc', fontSize: 14 }}>오늘 현설 일정이 없습니다.</Typography>
          </Box>
        </Box>
      </Slide>

      {/* 하단 여백 (네비게이션 바 높이만큼) */}
      <Box sx={{ height: 70, display: { xs: 'block', md: 'none' } }} />
    </>
  );
};

export default MobileBottomNav; 
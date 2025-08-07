import React, { useEffect, useState } from 'react';
import { Box, Typography, IconButton, Grid, Paper, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Autocomplete, Checkbox, FormControlLabel, Tooltip } from '@mui/material';
import { ChevronLeft, ChevronRight, ArrowBack, Add, Today, Edit, Delete, ViewWeek, ViewModule, CalendarViewMonth, Home, Business, Security, Assignment, Chat, Description, Assessment, Settings, Person, Star, Timeline, Search } from '@mui/icons-material';
import { collection, onSnapshot, doc, deleteDoc, updateDoc, addDoc, query, where, getDocs } from 'firebase/firestore';
import { subscribeToEstimates } from '../api/estimates';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../components/common/MobileLayout';
import { formatContractAmount } from '../utils/formatUtils';

// 헤더/하단바 높이(px)
const HEADER_HEIGHT = 56;
const FOOTER_HEIGHT = 56;

const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
const colorList = ['#1976d2', '#43a047', '#ffa000', '#ab47bc', '#ef5350', '#26c6da', '#d4e157'];

// 진짜 월간 달력 매트릭스 생성 (구글 캘린더 스타일)
function getMonthMatrix(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const prevLastDay = new Date(year, month, 0);
  
  const startDayOfWeek = firstDay.getDay(); // 0=일요일, 1=월요일, ...
  const daysInMonth = lastDay.getDate();
  
  const matrix = [];
  let week = [];
  
  // 지난달 날짜들 (시작 요일에 맞춰서만)
  for (let i = 0; i < startDayOfWeek; i++) {
    const prevDay = prevLastDay.getDate() - (startDayOfWeek - i - 1);
    const prevDate = new Date(year, month - 1, prevDay);
    week.push({
      day: prevDay,
      isCurrentMonth: false,
      year: prevDate.getFullYear(),
      month: prevDate.getMonth(),
      date: prevDate
    });
  }
  
  // 이번달 날짜들
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    week.push({
      day,
      isCurrentMonth: true,
      year: currentDate.getFullYear(),
      month: currentDate.getMonth(),
      date: currentDate
    });
    
    // 7칸이 찼으면 새로운 주 시작
    if (week.length === 7) {
      matrix.push(week);
      week = [];
    }
  }
  
  // 마지막 주에 남은 칸들을 다음달 날짜로 채우기
  if (week.length > 0) {
    for (let i = 1; week.length < 7; i++) {
      const nextDate = new Date(year, month + 1, i);
      week.push({
        day: i,
        isCurrentMonth: false,
        year: nextDate.getFullYear(),
        month: nextDate.getMonth(),
        date: nextDate
      });
    }
    matrix.push(week);
  }
  
  return matrix;
}

const CustomScheduleMobile = () => {
  const navigate = useNavigate();
  const authUser = useAuth();
  const today = new Date();
  const [year, setYear] = useState(2025); // 2025년으로 설정
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [schedules, setSchedules] = useState([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [editText, setEditText] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newScheduleTitle, setNewScheduleTitle] = useState('');
  const [newScheduleDesc, setNewScheduleDesc] = useState('');
  const [newScheduleSiteName, setNewScheduleSiteName] = useState('');
  const [newScheduleTypes, setNewScheduleTypes] = useState([]);
  const [newScheduleColor, setNewScheduleColor] = useState('#3b82f6');
  const [editScheduleTitle, setEditScheduleTitle] = useState('');
  const [editScheduleDesc, setEditScheduleDesc] = useState('');
  const [editScheduleSiteName, setEditScheduleSiteName] = useState('');
  const [editScheduleTypes, setEditScheduleTypes] = useState([]);
  const [editScheduleColor, setEditScheduleColor] = useState('#3b82f6');
  const [sites, setSites] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [viewMode, setViewMode] = useState('month'); // 이제 'month'만 사용
  const colorChoices = ['#3b82f6', '#22c55e', '#f59e42', '#ef4444', '#a855f7', '#eab308'];
  const [checkedItems, setCheckedItems] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [siteDetailDialogOpen, setSiteDetailDialogOpen] = useState(false);
  const [selectedSiteDetail, setSelectedSiteDetail] = useState(null);

  // 네비게이션 아이템들
  const navigationItems = [
    { icon: <Home />, path: '/', label: '홈' },
    { icon: <Star />, path: '/importantsite', label: '주요현장' },
    { icon: <Business />, path: '/sites', label: '현장' },
    { icon: <Timeline />, path: '/gantt', label: '현장일정' },
    { icon: <Assignment />, path: '/progress', label: '기성' },
    { icon: <Security />, path: '/safety', label: '안전' },
    { icon: <Chat />, path: '/discussions', label: '협의' },
    { icon: <Person />, path: '/profile', label: '프로필' },
  ];

  // 인증 상태와 로딩 상태를 모두 고려한 데이터 로딩
  useEffect(() => {
    const user = authUser.currentUser;
    const authLoading = authUser.loading;
    
    // 로딩 중이거나 사용자가 없으면 데이터 초기화
    if (authLoading || !user) {
      setSchedules([]);
      setCheckedItems({});
      setCurrentUser(null);
      setLoading(false);
      return;
    }
    
    setCurrentUser(user);
    console.log('모바일 일정 데이터 로딩 시작 - 사용자:', user.uid);

    let schedulesUnsubscribe = null;
    let checksUnsubscribe = null;

    try {
      // 일정 데이터 실시간 구독
      schedulesUnsubscribe = onSnapshot(collection(db, 'schedules'), (snapshot) => {
        const scheduleData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('모바일 일정 데이터 로드 완료:', scheduleData.length, '개 일정');
        console.log('일정 데이터 샘플:', scheduleData.slice(0, 3));
        setSchedules(scheduleData);
        setLoading(false);
      });

      // 체크 상태 실시간 구독
      const checksQuery = query(
        collection(db, 'scheduleChecks'),
        where('userId', '==', user.uid)
      );
      
      checksUnsubscribe = onSnapshot(checksQuery, (checksSnapshot) => {
        try {
          const newCheckedItems = {};
          
          checksSnapshot.docs.forEach(doc => {
            const checkData = doc.data();
            if (checkData.date && checkData.scheduleId) {
              const key = `${checkData.date}-${checkData.scheduleId}`;
              newCheckedItems[key] = checkData.checked;
            }
          });
          
          setCheckedItems(newCheckedItems);
          console.log('모바일 체크 상태 실시간 업데이트:', Object.keys(newCheckedItems).length, '개 항목');
        } catch (error) {
          console.error('모바일 체크 상태 처리 오류:', error);
        }
      });
    } catch (error) {
      console.error('모바일 구독 설정 오류:', error);
      setSchedules([]);
      setCheckedItems({});
    }

    return () => {
      try {
        if (schedulesUnsubscribe && typeof schedulesUnsubscribe === 'function') {
          schedulesUnsubscribe();
        }
        if (checksUnsubscribe && typeof checksUnsubscribe === 'function') {
          checksUnsubscribe();
        }
      } catch (error) {
        console.error('모바일 구독 해제 오류:', error);
      }
    };
  }, [authUser.currentUser, authUser.loading]); // 인증 상태와 로딩 상태 모두 추적

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'sites'), (snapshot) => {
      setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // 견적 데이터 가져오기
  useEffect(() => {
    console.log('🔍 견적 데이터 구독 시작');
    const unsubscribe = subscribeToEstimates((estimatesData) => {
      console.log('🔍 견적 데이터 로드 완료:', estimatesData.length, '개');
      console.log('🔍 견적 데이터 샘플:', estimatesData.slice(0, 3));
      
      // 견적 데이터의 필드 구조 확인
      if (estimatesData.length > 0) {
        const sample = estimatesData[0];
        console.log('🔍 견적 데이터 필드 구조:', {
          id: sample.id,
          siteName: sample.siteName,
          company: sample.company,
          submissionDeadline: sample.submissionDeadline,
          requester: sample.requester,
          requestContent: sample.requestContent
        });
      }
      
      setEstimates(estimatesData);
    });
    return () => {
      console.log('🔍 견적 데이터 구독 해제');
      unsubscribe();
    };
  }, []);

  const monthMatrix = getMonthMatrix(year, month);

  // 견적 데이터를 일정으로 변환하는 함수
  const convertEstimateToSchedule = (estimate) => {
    console.log('🔍 견적 변환 시작:', estimate);
    if (!estimate.submissionDeadline) {
      console.log('🔍 submissionDeadline이 없음:', estimate);
      return null;
    }
    
    // 현장명 우선순위: siteName > company > '견적'
    const siteName = estimate.siteName || estimate.company || '견적';
    
    // 견적 상태에 따른 체크 상태 결정
    const isChecked = estimate.submissionStatus === '제출완료';
    
    const schedule = {
      id: `estimate_${estimate.id}`,
      text: `${siteName}`,
      title: `${siteName}`,
      description: `${estimate.requester} - ${estimate.requestContent || '견적요청'}`,
      date: estimate.submissionDeadline,
      type: '견적',
      color: isChecked ? '#22c55e' : '#f59e42', // 체크되면 초록색, 아니면 주황색
      siteName: siteName, // 명시적으로 siteName 설정
      company: estimate.company,
      requester: estimate.requester,
      submissionStatus: estimate.submissionStatus,
      contractStatus: estimate.contractStatus,
      isEstimate: true, // 견적 데이터임을 표시
      estimateId: estimate.id, // 원본 견적 ID 저장
      checked: isChecked // 체크 상태 추가
    };
    
    console.log('🔍 변환된 일정:', schedule);
    console.log('🔍 설정된 siteName:', schedule.siteName);
    console.log('🔍 체크 상태:', isChecked);
    return schedule;
  };

  const convertBidToSchedule = (schedule) => {
    console.log('🔍 입찰 변환 시작:', schedule);
    if (!schedule.date) {
      console.log('🔍 date가 없음:', schedule);
      return null;
    }
    
    // 입찰 상태에 따른 체크 상태 결정
    const isChecked = schedule.bidStatus === '입찰완료';
    
    const bidSchedule = {
      ...schedule,
      id: `bid_${schedule.id}`, // 입찰 ID에 bid_ 접두사 추가
      color: isChecked ? '#22c55e' : '#ef4444', // 체크되면 초록색, 아니면 빨간색
      checked: isChecked, // 체크 상태 추가
      isBid: true // 입찰 데이터임을 표시
    };
    
    console.log('🔍 변환된 입찰 일정:', bidSchedule);
    console.log('🔍 체크 상태:', isChecked);
    return bidSchedule;
  };

  // 견적 데이터에서 현장명 가져오기
  const getSiteNameFromEstimates = (schedule) => {
    // 일정의 제목이나 텍스트에서 견적 번호나 현장명을 찾아서 매칭
    const scheduleText = (schedule.text || schedule.title || '').toLowerCase();
    
    // 견적 데이터에서 매칭되는 현장명 찾기
    for (const estimate of estimates) {
      const estimateSiteName = (estimate.siteName || '').toLowerCase();
      const estimateCompany = (estimate.company || '').toLowerCase();
      
      // 일정 텍스트에 견적의 현장명이나 회사명이 포함되어 있는지 확인
      if (estimateSiteName && scheduleText.includes(estimateSiteName)) {
        return estimate.siteName;
      }
      if (estimateCompany && scheduleText.includes(estimateCompany)) {
        return estimate.siteName || estimate.company;
      }
    }
    
    // 매칭되지 않으면 기존 siteName 반환
    return schedule.siteName || '';
  };

  // 날짜별 일정 매핑 (월과 연도를 고려한 개선된 버전)
  const scheduleMap = {};
  const getScheduleKey = (year, month, day) => `${year}-${month}-${day}`;
  
  // 기존 일정 데이터 처리
  schedules.forEach(item => {
    if (!item.date) {
      console.log('날짜가 없는 일정:', item);
      return;
    }
    
    let d;
    if (item.date.toDate) {
      // Firestore Timestamp인 경우
      d = item.date.toDate();
    } else if (item.date instanceof Date) {
      // JavaScript Date인 경우
      d = item.date;
    } else {
      // 문자열이나 다른 형식인 경우
      d = new Date(item.date);
    }
    
    console.log('일정 날짜 처리:', { 
      original: item.date, 
      processed: d, 
      year: d.getFullYear(), 
      month: d.getMonth(), 
      day: d.getDate(),
      currentYear: year,
      currentMonth: month
    });
    
    // 모든 일정을 매핑 (현재 월 제한 제거)
    const day = d.getDate();
    const key = getScheduleKey(d.getFullYear(), d.getMonth(), day);
    if (!scheduleMap[key]) scheduleMap[key] = [];
    
    // 입찰 일정인지 확인하고 변환
    if (item.type === '입찰') {
      const bidSchedule = convertBidToSchedule(item);
      if (bidSchedule) {
        const enrichedBidItem = {
          ...bidSchedule,
          siteName: getSiteNameFromEstimates(bidSchedule)
        };
        scheduleMap[key].push(enrichedBidItem);
      }
    } else {
      // 견적 데이터에서 현장명 가져와서 일정에 추가
      const enrichedItem = {
        ...item,
        siteName: getSiteNameFromEstimates(item)
      };
      
      scheduleMap[key].push(enrichedItem);
    }
  });

  // 견적 데이터를 일정으로 변환하여 추가
  console.log('🔍 견적 데이터 개수:', estimates.length);
  estimates.forEach(estimate => {
    console.log('🔍 견적 데이터 확인:', estimate);
    const schedule = convertEstimateToSchedule(estimate);
    if (schedule) {
      let d;
      if (schedule.date.toDate) {
        // Firestore Timestamp인 경우
        d = schedule.date.toDate();
      } else if (schedule.date instanceof Date) {
        // JavaScript Date인 경우
        d = schedule.date;
      } else {
        // 문자열이나 다른 형식인 경우
        d = new Date(schedule.date);
      }
      
      const day = d.getDate();
      const key = getScheduleKey(d.getFullYear(), d.getMonth(), day);
      if (!scheduleMap[key]) scheduleMap[key] = [];
      
      // 견적 일정 추가
      scheduleMap[key].push(schedule);
      console.log('🔍 견적 일정 추가됨:', schedule.text, '날짜:', key, '전체 데이터:', schedule);
    } else {
      console.log('🔍 견적 일정 변환 실패:', estimate);
    }
  });
  
  // 현재 선택된 날짜의 일정을 가져오는 헬퍼 함수
  const getSchedulesForDate = (targetYear, targetMonth, targetDay) => {
    const key = getScheduleKey(targetYear, targetMonth, targetDay);
    const schedules = scheduleMap[key] || [];
    
    // 디버깅을 위한 로그 추가
    if (schedules.length > 0) {
      console.log(`📅 ${targetYear}-${targetMonth + 1}-${targetDay} 일정:`, schedules.map(s => ({
        id: s.id,
        text: s.text,
        title: s.title,
        siteName: s.siteName,
        type: s.type,
        isEstimate: s.isEstimate,
        company: s.company
      })));
    }
    
    return schedules;
  };
  
  console.log('현재 월 일정 매핑:', scheduleMap);

  // 일일보기용 달력 렌더링
  const renderDayView = () => {
    const selectedDate = new Date(year, month, selectedDay);
    const dayOfWeek = selectedDate.getDay();
    
    // 날짜 이동 함수들
    const goToPreviousDay = () => {
      const newDate = new Date(year, month, selectedDay - 1);
      setSelectedDay(newDate.getDate());
      setMonth(newDate.getMonth());
      setYear(newDate.getFullYear());
    };
    
    const goToNextDay = () => {
      const newDate = new Date(year, month, selectedDay + 1);
      setSelectedDay(newDate.getDate());
      setMonth(newDate.getMonth());
      setYear(newDate.getFullYear());
    };
    
    return (
      <Box sx={{ px: 1, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <IconButton 
            size="small" 
            onClick={goToPreviousDay}
            sx={{ 
              color: '#fff', 
              p: 0.5,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <ChevronLeft />
          </IconButton>
          <Typography sx={{ flex: 1, textAlign: 'center', color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
            {year}년 {month + 1}월 {selectedDay}일 ({dayNames[dayOfWeek]})
          </Typography>
          <IconButton 
            size="small" 
            onClick={goToNextDay}
            sx={{ 
              color: '#fff', 
              p: 0.5,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <ChevronRight />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', mb: 0.2 }}>
          {Array.from({ length: 7 }, (_, i) => {
            const isSelected = i === dayOfWeek;
            const isToday = year === today.getFullYear() && month === today.getMonth() && selectedDay === today.getDate() && i === today.getDay();
            
            return (
              <Box
                key={i}
                sx={{
                  width: isSelected ? '100%' : '0%',
                  height: '240px',
                  bgcolor: 'transparent',
                  borderRadius: 2,
                  border: isToday
                    ? '2px solid #ef5350'
                    : isSelected
                      ? '2px solid #42a5f5'
                      : '1px solid #333',
                  p: 0.25,
                  mx: 0.1,
                  position: 'relative',
                  opacity: isSelected ? 1 : 0.3,
                  boxShadow: isSelected ? '0 2px 8px 0 #1976d255' : 'none',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'rgba(35, 38, 52, 0.06)',
                  }
                }}
                onClick={() => {
                  // 다른 요일을 클릭했을 때 해당 요일의 날짜로 이동
                  if (!isSelected) {
                    const targetDate = new Date(year, month, selectedDay);
                    const currentDayOfWeek = targetDate.getDay();
                    const diff = i - currentDayOfWeek;
                    const newDate = new Date(year, month, selectedDay + diff);
                    setSelectedDay(newDate.getDate());
                    setMonth(newDate.getMonth());
                    setYear(newDate.getFullYear());
                  }
                }}
              >
                {isSelected && (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0, mt: 0, gap: 0 }}>
                      <Typography
                        sx={{
                          color: '#888',
                          fontSize: '0.6rem',
                          fontWeight: 400,
                          opacity: 0.7,
                          ml: 0.2,
                          mt: 0,
                          mb: 0,
                          p: 0,
                          lineHeight: 1,
                        }}
                      >
                        [{getSchedulesForDate(year, month, selectedDay).length || 0}]
                      </Typography>
                      <Box
                        sx={{
                          color: dayOfWeek === 0 ? '#ef5350' : dayOfWeek === 6 ? '#42a5f5' : isToday ? '#fff' : '#888',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          mr: 0.2,
                          mt: 0,
                          mb: 0,
                          p: 0,
                          lineHeight: 1,
                        }}
                      >
                        {selectedDay}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.1, mt: 0.3 }}>
                      {getSchedulesForDate(year, month, selectedDay).slice(0, 12).map((item, i) => (
                        <Box
                          key={item.id}
                          sx={{
                            borderRadius: 0.3,
                            px: 0.3,
                            py: 0.1,
                            fontSize: '0.65rem',
                            fontWeight: 500,
                            bgcolor: item.color || colorList[i % colorList.length],
                            color: '#fff',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 1px 0 #0002',
                            textAlign: 'center',
                            width: '100%',
                            mb: 0.05,
                            lineHeight: 1.1,
                            minHeight: 12,
                            maxHeight: 12,
                          }}
                        >
                          {(() => {
                            const typePrefix = 
                              item.type === '현장' ? '[현장]' : 
                              item.type === '회의' ? '[회의]' : 
                              item.type === '입찰' ? '[입찰]' : 
                              item.type === '전자입찰' ? '[전자입찰]' : 
                              item.type === '현설' ? '[현설]' : 
                              item.type === '견적' ? '[견적]' : 
                              item.type === '실측' ? '[실측]' : 
                              item.type === '기타' ? '[기타]' : '';
                            const title = item.text || item.title || '제목 없음';
                            
                            // 디버깅 로그 추가
                            if (!title || title === '제목 없음' || title.trim() === '') {
                              console.log('🔍 빈 제목 일정:', { id: item.id, siteName: item.siteName, type: item.type });
                            }
                            
                            // 견적 일정인 경우 특별 처리
                            if (item.isEstimate) {
                              console.log('🔍 견적 일정 표시:', item);
                              console.log('🔍 견적 siteName:', item.siteName);
                              console.log('🔍 견적 company:', item.company);
                              console.log('🔍 견적 text:', item.text);
                              console.log('🔍 견적 title:', item.title);
                              
                              // 견적 일정의 경우 현장명을 우선적으로 표시
                              const siteName = item.siteName || item.company || '견적';
                              const estimateText = `[견적]${siteName}`;
                              console.log('🔍 견적 텍스트:', estimateText);
                              return estimateText.length > 15 ? estimateText.slice(0, 15) + '...' : estimateText;
                            }
                            
                            // 견적 타입이지만 isEstimate가 없는 경우도 처리
                            if (item.type === '견적') {
                              console.log('🔍 견적 타입 일정 (isEstimate 없음):', item);
                              const siteName = item.siteName || item.company || '견적';
                              const estimateText = `[견적]${siteName}`;
                              console.log('🔍 견적 텍스트 (타입 기반):', estimateText);
                              return estimateText.length > 15 ? estimateText.slice(0, 15) + '...' : estimateText;
                            }
                            
                            // 일반 일정의 경우
                            console.log('🔍 일반 일정 표시:', item);
                            console.log('🔍 item.text:', item.text);
                            console.log('🔍 item.title:', item.title);
                            console.log('🔍 item.siteName:', item.siteName);
                            
                            // 제목이 없거나 너무 짧은 경우 처리
                            if (!title || title === '제목 없음' || title.trim() === '') {
                              const fallbackText = typePrefix + (item.siteName || '일정');
                              console.log('🔍 대체 텍스트 사용:', fallbackText);
                              return fallbackText;
                            }
                            
                            const fullText = typePrefix + title;
                            const displayText = fullText.length > 15 ? fullText.slice(0, 15) + '...' : fullText;
                            console.log('🔍 표시 텍스트:', displayText, '원본:', { title, type: item.type });
                            return displayText;
                          })()}
                        </Box>
                      ))}
                    </Box>
                  </>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  // 3일보기용 달력 렌더링
  const render3DayView = () => {
    const selectedDate = new Date(year, month, selectedDay);
    const dayOfWeek = selectedDate.getDay();
    
    // 날짜 이동 함수들
    const goToPreviousDay = () => {
      const newDate = new Date(year, month, selectedDay - 1);
      setSelectedDay(newDate.getDate());
      setMonth(newDate.getMonth());
      setYear(newDate.getFullYear());
    };
    
    const goToNextDay = () => {
      const newDate = new Date(year, month, selectedDay + 1);
      setSelectedDay(newDate.getDate());
      setMonth(newDate.getMonth());
      setYear(newDate.getFullYear());
    };
    
    // 선택된 날짜 기준으로 3일 (전날, 오늘, 다음날)
    const days = [];
    for (let i = -1; i <= 1; i++) {
      const date = new Date(year, month, selectedDay + i);
      days.push({
        date: date,
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
        isCurrentMonth: date.getMonth() === month && date.getFullYear() === year,
        isSelected: i === 0
      });
    }
    
    return (
      <Box sx={{ px: 1, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <IconButton 
            size="small" 
            onClick={goToPreviousDay}
            sx={{ 
              color: '#fff', 
              p: 0.5,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <ChevronLeft />
          </IconButton>
          <Typography sx={{ flex: 1, textAlign: 'center', color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
            {year}년 {month + 1}월 {selectedDay}일
          </Typography>
          <IconButton 
            size="small" 
            onClick={goToNextDay}
            sx={{ 
              color: '#fff', 
              p: 0.5,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <ChevronRight />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', mb: 0.2 }}>
          {days.map((dayInfo, i) => {
            const isToday = dayInfo.year === today.getFullYear() && dayInfo.month === today.getMonth() && dayInfo.day === today.getDate();
            const dayOfWeek = dayInfo.date.getDay();
            
            return (
              <Box
                key={i}
                sx={{
                  width: '33.33%',
                  height: '240px',
                  bgcolor: 'transparent',
                  borderRadius: 2,
                  border: isToday
                    ? '2px solid #ef5350'
                    : dayInfo.isSelected
                      ? '2px solid #42a5f5'
                      : '1px solid #333',
                  p: 0.25,
                  mx: 0.1,
                  position: 'relative',
                  opacity: dayInfo.isCurrentMonth ? 1 : 0.3,
                  boxShadow: dayInfo.isSelected ? '0 2px 8px 0 #1976d255' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  alignItems: 'stretch',
                  overflow: 'hidden',
                  '&:hover': {
                    bgcolor: 'rgba(35, 38, 52, 0.06)',
                  }
                }}
                onClick={() => {
                  if (dayInfo.isCurrentMonth) {
                    setSelectedDay(dayInfo.day);
                    setMonth(dayInfo.month);
                    setYear(dayInfo.year);
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0, mt: 0, gap: 0 }}>
                  <Typography
                    sx={{
                      color: '#888',
                      fontSize: '0.6rem',
                      fontWeight: 400,
                      opacity: 0.7,
                      ml: 0.2,
                      mt: 0,
                      mb: 0,
                      p: 0,
                      lineHeight: 1,
                    }}
                  >
                    [{getSchedulesForDate(dayInfo.year, dayInfo.month, dayInfo.day).length || 0}]
                  </Typography>
                  <Box
                    sx={{
                      color: dayOfWeek === 0 ? '#ef5350' : dayOfWeek === 6 ? '#42a5f5' : dayInfo.isCurrentMonth ? '#fff' : '#888',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      mr: 0.2,
                      mt: 0,
                      mb: 0,
                      p: 0,
                      lineHeight: 1,
                    }}
                  >
                    {dayInfo.day}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.15, mt: 0.3 }}>
                  {dayInfo.isCurrentMonth && getSchedulesForDate(dayInfo.year, dayInfo.month, dayInfo.day).slice(0, 8).map((item, j) => {
                    const dateStr = `${dayInfo.year}-${String(dayInfo.month + 1).padStart(2, '0')}-${String(dayInfo.day).padStart(2, '0')}`;
                    const checkKey = `${dateStr}-${item.id}`;
                    const isChecked = checkedItems[checkKey] || false;
                    
                    return (
                      <Box
                        key={item.id}
                        sx={{
                          borderRadius: 1,
                          px: 0.2,
                          py: 0.05,
                          fontSize: '0.55rem',
                          fontWeight: 500,
                          bgcolor: item.color || colorList[j % colorList.length],
                          color: '#fff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 1px 2px 0 #0003',
                          textAlign: 'center',
                          width: '100%',
                          mb: 0.02,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.1,
                          minHeight: 10,
                          maxHeight: 10,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckItem(dateStr, item.id, !isChecked);
                        }}
                      >

                                                  <span style={{ flex: 1, textAlign: 'left' }}>
                            {(() => {
                              // 견적 일정인 경우 특별 처리
                              if (item.isEstimate) {
                                const siteName = item.siteName || item.company || '견적';
                                const estimateText = `[견적]${siteName}`;
                                return estimateText.length > 6 ? estimateText.slice(0, 6) + '...' : estimateText;
                              }
                              
                              const typePrefix = 
                                item.type === '현장' ? '[현장]' : 
                                item.type === '회의' ? '[회의]' : 
                                item.type === '입찰' ? '[입찰]' : 
                                item.type === '전자입찰' ? '[전자입찰]' : 
                                item.type === '현설' ? '[현설]' : 
                                item.type === '견적' ? '[견적]' : 
                                item.type === '실측' ? '[실측]' : 
                                item.type === '기타' ? '[기타]' : '';
                              const title = item.text || item.title || '제목 없음';
                              
                              // 제목이 없거나 너무 짧은 경우 처리
                              if (!title || title === '제목 없음' || title.trim() === '') {
                                return typePrefix + (item.siteName || '일정');
                              }
                              
                              const fullText = typePrefix + title;
                              return fullText.length > 6 ? fullText.slice(0, 6) + '...' : fullText;
                            })()}
                          </span>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const handlePrevMonth = () => {
    if (month === 0) {
      setYear(y => y - 1);
      setMonth(11);
    } else {
      setMonth(m => m - 1);
    }
  };
  const handleNextMonth = () => {
    if (month === 11) {
      setYear(y => y + 1);
      setMonth(0);
    } else {
      setMonth(m => m + 1);
    }
  };
  const handleToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(today.getDate());
  };

  // 선택 날짜의 일정
  const selectedSchedules = getSchedulesForDate(year, month, selectedDay);

  // 일정 삭제 확인 함수
  const handleDeleteConfirm = (schedule) => {
    setScheduleToDelete(schedule);
    setDeleteDialogOpen(true);
  };

  // 일정 삭제 실행 함수
  const handleDeleteSchedule = async () => {
    if (!scheduleToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'schedules', scheduleToDelete.id));
      console.log('일정이 삭제되었습니다.');
      setDeleteDialogOpen(false);
      setScheduleToDelete(null);
    } catch (error) {
      console.error('일정 삭제 중 오류:', error);
    }
  };

  // 삭제 취소 함수
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setScheduleToDelete(null);
  };

  // 일정 수정 함수
  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setEditScheduleTitle(schedule.text || schedule.title || '');
    setEditScheduleDesc(schedule.desc || '');
    setEditScheduleSiteName(schedule.siteName || '');
    setEditScheduleTypes(schedule.type ? schedule.type.split(', ') : []);
    setEditScheduleColor(schedule.color || '#3b82f6');
    setEditDialogOpen(true);
  };

  // 수정 완료 함수
  const handleSaveEdit = async () => {
    if (!editingSchedule || (!editScheduleTitle.trim() && !editScheduleSiteName.trim()) || editScheduleTypes.length === 0) return;
    
    try {
      await updateDoc(doc(db, 'schedules', editingSchedule.id), {
        text: editScheduleTitle || editScheduleSiteName,
        title: editScheduleTitle || editScheduleSiteName,
        type: editScheduleTypes.join(', '),
        desc: editScheduleDesc,
        siteName: editScheduleSiteName,
        color: editScheduleColor,
        updatedAt: new Date()
      });
      setEditDialogOpen(false);
      setEditingSchedule(null);
      setEditScheduleTitle('');
      setEditScheduleDesc('');
      setEditScheduleSiteName('');
      setEditScheduleTypes([]);
      setEditScheduleColor('#3b82f6');
      console.log('일정이 수정되었습니다.');
    } catch (error) {
      console.error('일정 수정 중 오류:', error);
    }
  };

  // 수정 취소 함수
  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingSchedule(null);
    setEditScheduleTitle('');
    setEditScheduleDesc('');
    setEditScheduleSiteName('');
    setEditScheduleTypes([]);
    setEditScheduleColor('#3b82f6');
  };

  // 일정 추가 함수
  const handleAddSchedule = () => {
    setAddDialogOpen(true);
    setNewScheduleTitle('');
    setNewScheduleDesc('');
    setNewScheduleSiteName('');
    setNewScheduleTypes([]);
    setNewScheduleColor('#3b82f6');
  };

  // 일정 추가 완료 함수
  const handleSaveAdd = async () => {
    if ((!newScheduleTitle.trim() && !newScheduleSiteName.trim()) || newScheduleTypes.length === 0) {
      alert('일정 제목 또는 현장명을 입력하고 분류를 선택해주세요.');
      return;
    }
    
    // 등록 확인 메시지
    const confirmMessage = `다음 일정을 등록하시겠습니까?\n\n제목: ${newScheduleTitle || newScheduleSiteName}\n현장명: ${newScheduleSiteName}\n분류: ${newScheduleTypes.join(', ')}\n날짜: ${year}년 ${month + 1}월 ${selectedDay}일`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      // 한국 시간대로 날짜 생성 (시간대 문제 해결)
      const koreanDate = new Date(year, month, selectedDay, 12, 0, 0); // 정오로 설정하여 시간대 차이 방지
      
      const newSchedule = {
        text: newScheduleTitle || newScheduleSiteName,
        title: newScheduleTitle || newScheduleSiteName,
        type: newScheduleTypes.join(', '),
        desc: newScheduleDesc,
        siteName: newScheduleSiteName,
        date: koreanDate,
        createdAt: new Date(),
        color: newScheduleColor
      };
      
      console.log('추가할 일정 데이터:', newSchedule);
      console.log('선택된 날짜:', { year, month, selectedDay });
      
      const docRef = await addDoc(collection(db, 'schedules'), newSchedule);
      console.log('일정이 추가되었습니다. 문서 ID:', docRef.id);
      
      // 성공 메시지
      alert('일정이 성공적으로 등록되었습니다.');
      
      // 입력칸 초기화
      setAddDialogOpen(false);
      setNewScheduleTitle('');
      setNewScheduleDesc('');
      setNewScheduleSiteName('');
      setNewScheduleTypes([]);
      setNewScheduleColor('#3b82f6');
    } catch (error) {
      console.error('일정 추가 중 오류:', error);
      alert('일정 등록 중 오류가 발생했습니다.');
    }
  };

  // 일정 추가 취소 함수
  const handleCancelAdd = () => {
    setAddDialogOpen(false);
    setNewScheduleTitle('');
    setNewScheduleDesc('');
    setNewScheduleSiteName('');
    setNewScheduleTypes([]);
    setNewScheduleColor('#3b82f6');
  };

  // 분류 선택 함수
  const handleTypeChange = (type) => {
    setNewScheduleTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // 수정용 분류 선택 함수
  const handleEditTypeChange = (type) => {
    setEditScheduleTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // 체크박스 상태 저장 함수
  const handleCheckItem = async (date, id, checked) => {
    const user = authUser.currentUser;
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    const checkKey = `${date}-${id}`;
    console.log('모바일 체크박스 변경 시작:', { date, id, checked, checkKey });

    try {
      // 로컬 상태 업데이트
      setCheckedItems(prev => {
        const newState = {
          ...prev,
          [checkKey]: checked
        };
        console.log('모바일 로컬 상태 업데이트:', newState);
        return newState;
      });

      // 견적 항목인지 확인하고 견적 상태 업데이트
      if (id.startsWith('estimate_')) {
        const estimateId = id.replace('estimate_', '');
        console.log('견적 항목 체크 - 견적 ID:', estimateId, '체크 상태:', checked);
        
        // 견적 상태 업데이트
        const estimateRef = doc(db, 'estimates', estimateId);
        await updateDoc(estimateRef, {
          submissionStatus: checked ? '제출완료' : '제출대기',
          updatedAt: new Date()
        });
        console.log('견적 상태 업데이트 완료:', estimateId, checked ? '제출완료' : '제출대기');
      }
      
      // 입찰 항목인지 확인하고 입찰 상태 업데이트
      if (id.startsWith('bid_')) {
        const bidId = id.replace('bid_', '');
        console.log('입찰 항목 체크 - 입찰 ID:', bidId, '체크 상태:', checked);
        
        // 입찰 상태 업데이트
        const scheduleRef = doc(db, 'schedules', bidId);
        await updateDoc(scheduleRef, {
          bidStatus: checked ? '입찰완료' : '입찰대기',
          updatedAt: new Date()
        });
        console.log('입찰 상태 업데이트 완료:', bidId, checked ? '입찰완료' : '입찰대기');
      }

      // 일반 일정 항목인지 확인하고 completed 상태 업데이트
      if (!id.startsWith('estimate_') && !id.startsWith('bid_')) {
        console.log('일반 일정 항목 체크 - 일정 ID:', id, '체크 상태:', checked);
        
        // 일정 상태 업데이트
        const scheduleRef = doc(db, 'schedules', id);
        await updateDoc(scheduleRef, {
          completed: checked,
          updatedAt: new Date()
        });
        console.log('일정 상태 업데이트 완료:', id, checked ? '완료' : '미완료');
      }

      // Firestore에 체크 상태 저장
      const checkData = {
        scheduleId: id,
        date: date,
        checked: checked,
        userId: user.uid,
        updatedAt: new Date()
      };

      console.log('모바일 Firestore 저장 데이터:', checkData);

      // 기존 체크 데이터가 있는지 확인
      const existingCheckQuery = query(
        collection(db, 'scheduleChecks'),
        where('scheduleId', '==', id),
        where('date', '==', date),
        where('userId', '==', user.uid)
      );
      
      const existingCheckSnapshot = await getDocs(existingCheckQuery);
      console.log('모바일 기존 체크 데이터 조회 결과:', existingCheckSnapshot.docs.length);
      
      if (existingCheckSnapshot.docs.length > 0) {
        // 기존 데이터 업데이트
        const existingDoc = existingCheckSnapshot.docs[0];
        await updateDoc(doc(db, 'scheduleChecks', existingDoc.id), {
          checked: checked,
          updatedAt: new Date()
        });
        console.log('모바일 체크 상태 업데이트 완료:', checkKey, checked);
      } else {
        // 새 데이터 추가
        const newDocRef = await addDoc(collection(db, 'scheduleChecks'), checkData);
        console.log('모바일 체크 상태 추가 완료:', checkKey, checked, '문서 ID:', newDocRef.id);
      }
    } catch (error) {
      console.error('모바일 체크 상태 저장 실패:', error);
      console.error('모바일 에러 상세:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // 실패 시 로컬 상태 롤백
      setCheckedItems(prev => {
        const newState = {
          ...prev,
          [checkKey]: !checked
        };
        console.log('모바일 실패로 인한 상태 롤백:', newState);
        return newState;
      });
      
      // 사용자에게 알림 (개발 중에는 상세 정보 포함)
      if (process.env.NODE_ENV === 'development') {
        alert(`모바일 체크 상태 저장에 실패했습니다.\n에러: ${error.message}\n코드: ${error.code}`);
      } else {
        alert('체크 상태 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    }
  };

  // 현장 상세내역 보기 핸들러
  const handleViewSiteDetail = async (schedule) => {
    // 일정에서 현장명 추출
    const siteName = schedule.siteName || schedule.text?.replace(/\[.*?\]/, '').trim() || '현장명 없음';
    
    // 일정 타입 확인
    const scheduleType = schedule.type || '';
    let type = '현장'; // 기본값
    
    if (scheduleType.includes('견적')) {
      type = '견적';
    } else if (scheduleType.includes('현설')) {
      type = '현설';
    } else if (scheduleType.includes('입찰')) {
      type = '입찰';
    }

    try {
      if (type === '견적') {
        // 견적 데이터 찾기
        const estimatesQuery = query(
          collection(db, 'estimates'),
          where('siteName', '==', siteName)
        );
        const estimatesSnapshot = await getDocs(estimatesQuery);
        
        if (!estimatesSnapshot.empty) {
          const estimateData = estimatesSnapshot.docs[0].data();
          setSelectedSiteDetail({
            name: siteName,
            company: estimateData.company || '회사명 없음',
            manager: estimateData.manager || '소장명 없음',
            constructionTeam: estimateData.constructionTeam || '시공팀 없음',
            address: estimateData.address || '주소 없음',
            contractAmount: estimateData.contractAmount || 0,
            startDate: estimateData.startDate || '날짜 없음',
            endDate: estimateData.endDate || '날짜 없음',
            estimateDetails: estimateData.description || estimateData.estimateDetails || '견적 상세내역이 없습니다.',
            type: '견적',
            estimateStatus: estimateData.status || '제출대기'
          });
        } else {
          // 견적 데이터가 없으면 기본 정보로 표시
          setSelectedSiteDetail({
            name: siteName,
            company: '회사명 없음',
            manager: '소장명 없음',
            constructionTeam: '시공팀 없음',
            address: '주소 없음',
            contractAmount: 0,
            startDate: '날짜 없음',
            endDate: '날짜 없음',
            estimateDetails: '견적 상세내역이 없습니다.',
            type: '견적',
            estimateStatus: '제출대기'
          });
        }
      } else if (type === '입찰') {
        // 입찰 데이터 찾기 (bids 컬렉션이 있다면)
        const bidsQuery = query(
          collection(db, 'bids'),
          where('siteName', '==', siteName)
        );
        const bidsSnapshot = await getDocs(bidsQuery);
        
        if (!bidsSnapshot.empty) {
          const bidData = bidsSnapshot.docs[0].data();
          setSelectedSiteDetail({
            name: siteName,
            company: bidData.company || '회사명 없음',
            manager: bidData.manager || '소장명 없음',
            constructionTeam: bidData.constructionTeam || '시공팀 없음',
            address: bidData.address || '주소 없음',
            contractAmount: bidData.contractAmount || 0,
            startDate: bidData.startDate || '날짜 없음',
            endDate: bidData.endDate || '날짜 없음',
            bidDetails: bidData.description || bidData.bidDetails || '입찰 상세내역이 없습니다.',
            type: '입찰',
            bidStatus: bidData.status || '입찰대기'
          });
        } else {
          // 입찰 데이터가 없으면 기본 정보로 표시
          setSelectedSiteDetail({
            name: siteName,
            company: '회사명 없음',
            manager: '소장명 없음',
            constructionTeam: '시공팀 없음',
            address: '주소 없음',
            contractAmount: 0,
            startDate: '날짜 없음',
            endDate: '날짜 없음',
            bidDetails: '입찰 상세내역이 없습니다.',
            type: '입찰',
            bidStatus: '입찰대기'
          });
        }
      } else if (type === '현설') {
        // 현설 데이터 찾기 (현장 데이터에서 현설 관련 정보 추출)
        const siteData = sites.find(site => site.name === siteName);
        
        if (siteData) {
          setSelectedSiteDetail({
            ...siteData,
            constructionDetails: siteData.constructionDetails || siteData.description || '현설 상세내역이 없습니다.',
            type: '현설'
          });
        } else {
          setSelectedSiteDetail({
            name: siteName,
            company: '회사명 없음',
            manager: '소장명 없음',
            constructionTeam: '시공팀 없음',
            address: '주소 없음',
            contractAmount: 0,
            startDate: '날짜 없음',
            endDate: '날짜 없음',
            constructionDetails: '현설 상세내역이 없습니다.',
            type: '현설'
          });
        }
      } else {
        // 현장 데이터 찾기 (기본 현장 정보)
        const siteData = sites.find(site => site.name === siteName);
        
        if (siteData) {
          setSelectedSiteDetail({
            ...siteData,
            type: '현장'
          });
        } else {
          setSelectedSiteDetail({
            name: siteName,
            company: '회사명 없음',
            manager: '소장명 없음',
            constructionTeam: '시공팀 없음',
            address: '주소 없음',
            contractAmount: 0,
            startDate: '날짜 없음',
            endDate: '날짜 없음',
            description: '현장 상세내역이 없습니다.',
            type: '현장'
          });
        }
      }
      
      setSiteDetailDialogOpen(true);
    } catch (error) {
      console.error('일정 상세정보 조회 실패:', error);
      alert('일정 상세정보를 불러오는데 실패했습니다.');
    }
  };



  return (
    <MobileLayout>
      <Box sx={{
        bgcolor: '#181a20',
        height: 'calc(90vh - 50px)', // 100vh에서 90vh로 줄임
        width: '100vw',
        overflow: 'hidden',
        position: 'fixed',
        padding: 0,
        margin: 0,
        mt: '-60px', // 위로 30px 더 이동 (30px → 60px)
        touchAction: 'none',
        WebkitOverflowScrolling: 'none',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {loading && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '200px',
            color: 'white',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000
          }}>
            <Typography>일정을 불러오는 중...</Typography>
          </Box>
        )}

        {/* 헤더(지금위치) - 여백 없음 */}
        
        {/* 5px 여백 */}
        <Box sx={{ height: '5px' }} />
        
        {/* 달력 네비게이션 + 달력 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* 월/연도 네비 */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0, px: 1, position: 'relative', top: 0, mt: 0, pt: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={handlePrevMonth} color="primary" size="small"><ChevronLeft /></IconButton>
              <Typography variant="h6" sx={{ color: '#2196f3', fontWeight: 700, fontSize: '1.1rem', minWidth: 90, textAlign: 'center' }}>{year}년 {month + 1}월</Typography>
              <IconButton onClick={handleNextMonth} color="primary" size="small"><ChevronRight /></IconButton>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {/* 견적/청구 버튼 */}
              <Button
                variant="outlined"
                size="small"
                sx={{
                  borderColor: '#3b82f6',
                  color: '#3b82f6',
                  fontSize: '0.6rem',
                  py: 0.1,
                  px: 0.8,
                  minWidth: 'auto',
                  height: 24,
                  '&:hover': {
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)'
                  }
                }}
                onClick={() => {
                  console.log('모바일 견적 버튼 클릭 - 견적 페이지로 이동');
                  navigate('/estimates');
                }}
              >
                견적
              </Button>
              <Button
                variant="outlined"
                size="small"
                sx={{
                  borderColor: '#ef4444',
                  color: '#ef4444',
                  fontSize: '0.6rem',
                  py: 0.1,
                  px: 0.8,
                  minWidth: 'auto',
                  height: 24,
                  '&:hover': {
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)'
                  }
                }}
                onClick={() => {
                  console.log('모바일 청구 버튼 클릭');
                  navigate('/claims');
                }}
              >
                청구
              </Button>
            </Box>
          </Box>
          
          {/* 요일 헤더 - 월간보기에서만 표시 */}
          {viewMode === 'month' && (
            <Box sx={{ display: 'flex', mb: 0, px: 1, mt: 0, pt: 0 }}>
              {dayNames.map((d, i) => (
                <Box
                  key={d}
                  sx={{
                    flex: 1, // 모든 요일이 동일한 너비
                    textAlign: 'center',
                    color: i === 0 ? '#ef5350' : i === 6 ? '#42a5f5' : '#b0b0b0',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    letterSpacing: 0.5,
                    mx: 0.1, // 날짜 셀과 동일한 간격 (0.25 → 0.1)
                  }}
                >
                  {d}
                </Box>
              ))}
            </Box>
          )}
          
          {/* 달력 그리드 - 월간보기만 사용 */}
          {viewMode === 'month' && (
            <Box sx={{ px: 0, mb: 0, width: '100%', overflow: 'hidden', mt: 0, pt: 0, flex: 1 }}>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(7, 1fr)', 
                gap: 0, 
                width: '100%',
                minWidth: '100%',
                maxWidth: '100%',
                height: '100%'
              }}>
                {monthMatrix.flat().map((cell, index) => {
                  const { day, isCurrentMonth, year: cellYear, month: cellMonth, date } = cell;
                  const rowIdx = Math.floor(index / 7);
                  const colIdx = index % 7;
                  const isToday = date && date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
                  const isSelected = isCurrentMonth && day === selectedDay;
                  const dayOfWeek = colIdx;
                  // 날짜셀 세로를 줄임 - 달력 크기 축소
                  const totalRows = monthMatrix.length;
                  const cellHeight = totalRows === 6 ? 57 : 67; // 높이 2px씩 증가
                  return (
                    <Box
                      key={`${rowIdx}-${colIdx}`}
                      sx={{
                        width: '100%',
                        minWidth: 0,
                        height: cellHeight,
                        bgcolor: 'transparent',
                        borderRadius: 1.5,
                        border: isToday
                          ? '2px solid #ef5350'
                          : isSelected
                            ? '2px solid #42a5f5'
                            : '1px solid #333',
                        p: 0.2,
                        m: 0,
                        position: 'relative',
                        opacity: isCurrentMonth ? 1 : 0.3,
                        boxShadow: isSelected ? '0 0 0 2px #2196f3' : 'none',
                        cursor: day ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        alignItems: 'stretch',
                        overflow: 'hidden',
                        '&:hover': {
                          bgcolor: 'rgba(35, 38, 52, 0.06)',
                        }
                      }}
                      onClick={() => isCurrentMonth && day && setSelectedDay(day)}
                    >
                      {day ? (
                        <>
                          {/* 날짜 숫자와 일정 카운트 - 더 컴팩트하게 */}
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0, mt: 0, gap: 0 }}>
                            <Typography
                              sx={{
                                color: '#888',
                                fontSize: '0.5rem',
                                fontWeight: 400,
                                opacity: 0.7,
                                ml: 0.1,
                                mt: 0,
                                mb: 0,
                                p: 0,
                                lineHeight: 1,
                              }}
                            >
                              [{getSchedulesForDate(cellYear, cellMonth, day).length || 0}]
                            </Typography>
                            <Box
                              sx={{
                                color: dayOfWeek === 0 ? '#ef5350' : dayOfWeek === 6 ? '#42a5f5' : isToday ? '#fff' : '#888',
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                mr: 0.1,
                                mt: 0,
                                mb: 0,
                                p: 0,
                                lineHeight: 1,
                              }}
                            >
                              {day}
                            </Box>
                          </Box>
                          {/* 일정 바 - 더 컴팩트하게 */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.1, mt: 0.2, flex: 1, height: '100%', overflow: 'auto' }}>
                            {getSchedulesForDate(cellYear, cellMonth, day).slice(0, 8).map((item, i) => {
                              const dateStr = `${cellYear}-${String(cellMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                              const checkKey = `${dateStr}-${item.id}`;
                              const isChecked = checkedItems[checkKey] || item.checked || false;
                              
                              return (
                                <Box
                                  key={item.id}
                                  sx={{
                                    borderRadius: 0.5,
                                    px: 0.2,
                                    py: 0.05,
                                    fontSize: '0.7rem', // 0.55rem에서 0.7rem으로 증가
                                    fontWeight: 500,
                                    bgcolor: item.color || colorList[i % colorList.length],
                                    color: '#fff',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 1px 1px 0 #0002',
                                    textAlign: 'center',
                                    width: '100%',
                                    mb: 0.02,
                                    lineHeight: 1.1, // 0.9에서 1.1로 증가
                                    minHeight: 12, // 10에서 12로 증가
                                    maxHeight: 12, // 10에서 12로 증가
                                    // 이전/다음 달 일정은 더 선명하게 표시
                                    opacity: isCurrentMonth ? 1 : 0.8,
                                    position: 'relative',
                                    cursor: 'pointer',
                                    '&:hover': {
                                      opacity: 0.8,
                                    }
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCheckItem(dateStr, item.id, !isChecked);
                                  }}
                                >

                                                                  {(() => {
                                  // 견적 일정인 경우 특별 처리
                                  if (item.isEstimate) {
                                    const siteName = item.siteName || item.company || '견적';
                                    const estimateText = `[견적]${siteName}`;
                                    return estimateText.length > 8 ? estimateText.slice(0, 8) + '...' : estimateText;
                                  }
                                  
                                  // 입찰 일정인 경우 특별 처리
                                  if (item.isBid) {
                                    const siteName = item.siteName || item.company || '입찰';
                                    const bidText = `[입찰]${siteName}`;
                                    return bidText.length > 8 ? bidText.slice(0, 8) + '...' : bidText;
                                  }
                                  
                                  const siteName = item.siteName || '';
                                  const title = item.text || item.title || '제목 없음';
                                  
                                  // 제목이 없거나 너무 짧은 경우 처리
                                  if (!title || title === '제목 없음' || title.trim() === '') {
                                    return siteName || '[일정]';
                                  }
                                  
                                  if (siteName) {
                                    const combinedText = `${siteName} ${title}`;
                                    return combinedText.length > 8 ? combinedText.slice(0, 8) + '...' : combinedText;
                                  } else {
                                    return title.length > 8 ? title.slice(0, 8) + '...' : title;
                                  }
                                })()}
                                </Box>
                              );
                            })}
                          </Box>
                        </>
                      ) : (
                        // 빈 날짜셀을 위한 공간 확보
                        <Box sx={{ height: cellHeight - 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>
        
        {/* 5px 여백 */}
        <Box sx={{ height: '5px' }} />
        
        {/* 세부내역 - 스크롤되게 수정 */}
        <Paper sx={{ 
          bgcolor: '#232634', 
          borderRadius: 3, 
          mx: 0, 
          p: 1.5, 
          boxShadow: 3,
          height: '400px', // 높이 더 증가 (320px → 400px)
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          top: '0px' // 원래 위치로 복원
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 700 }}>
              {year}년 {month + 1}월 {selectedDay}일 일정
            </Typography>
            <IconButton 
              size="small" 
              onClick={() => handleAddSchedule()}
              sx={{ 
                color: '#fff', 
                p: 0.5,
                bgcolor: '#2196f3',
                '&:hover': { bgcolor: '#1976d2' }
              }}
            >
              <Add sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Box>
          <Divider sx={{ bgcolor: '#333', mb: 0.5 }} />
          {selectedSchedules.length === 0 ? (
            <Typography sx={{ color: '#b0b0b0', fontSize: '0.95rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>등록된 일정이 없습니다.</Typography>
          ) : (
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 0.4,
                flex: 1,
                overflow: 'auto', // 스크롤 가능하게 변경
                touchAction: 'auto', // 터치 스크롤 활성화
                WebkitOverflowScrolling: 'touch', // iOS 스크롤 활성화
                maxHeight: '320px', // 최대 높이 설정 (240px → 320px)
                height: '320px',
              }}
            >
              {selectedSchedules.map((item, i) => {
                // 날짜 문자열 생성
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
                const checkKey = `${dateStr}-${item.id}`;
                const isChecked = checkedItems[checkKey] || false;

                return (
                  <Box 
                    key={item.id} 
                    sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 0.4, // 패딩 더 증가
                      borderRadius: 0.8, 
                      bgcolor: item.color || colorList[i % colorList.length], 
                      color: '#fff', 
                      fontWeight: 500, 
                      fontSize: '0.9rem', // 폰트 크기 더 증가
                      boxShadow: '0 1px 2px 0 #0002',
                      mb: 0.15, // 마진 더 증가
                      flexShrink: 0, // 스크롤 시 크기 유지
                      minHeight: 28, // 최소 높이 더 증가
                      maxHeight: 28, // 최대 높이 더 증가
                      width: '100%', // 전체 너비 사용
                      overflow: 'hidden' // 넘치는 내용 숨김
                    }}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      flex: 1, 
                      gap: 0.3, 
                      minWidth: 0,
                      overflow: 'hidden' // 넘치는 내용 숨김
                    }}>
                      <Typography sx={{ 
                        flex: 1, 
                        fontSize: '0.9rem',
                        textAlign: 'left',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.2,
                        minWidth: 0, // flex 아이템이 축소될 수 있도록
                        maxWidth: '254px', // 현장명 공간을 254px로 고정
                        wordBreak: 'keep-all', // 단어 단위로 줄바꿈 방지
                        wordWrap: 'normal' // 단어 줄바꿈 방지
                      }}>
                        {(() => {
                          const typePrefix = 
                            item.type === '현장' ? '[현장]' : 
                            item.type === '회의' ? '[회의]' : 
                            item.type === '입찰' ? '[입찰]' : 
                            item.type === '전자입찰' ? '[전자입찰]' : 
                            item.type === '현설' ? '[현설]' : 
                            item.type === '견적' ? '[견적]' : 
                            item.type === '실측' ? '[실측]' : 
                            item.type === '기타' ? '[기타]' : '';
                          const siteName = item.siteName || '';
                          const title = item.text || item.title || '제목 없음';
                          
                          // 제목이 없거나 너무 짧은 경우 처리
                          if (!title || title === '제목 없음' || title.trim() === '') {
                            return typePrefix + (siteName || '일정');
                          }
                          
                          // 현장이름과 제목이 중복되는 경우 제목에서 현장이름 제거
                          let displayTitle = title;
                          if (siteName && title.includes(siteName)) {
                            displayTitle = title.replace(siteName, '').trim();
                            // 제거 후 제목이 비어있으면 현장명만 표시
                            if (!displayTitle || displayTitle.trim() === '') {
                              return typePrefix + siteName;
                            }
                          }
                          
                          const fullText = typePrefix + (siteName ? `${siteName} ` : '') + displayTitle;
                          return fullText;
                        })()}
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      display: 'flex', 
                      gap: 0.3,
                      flexShrink: 0, // 버튼 영역이 축소되지 않도록
                      minWidth: '60px', // 버튼 영역 여백 줄임
                      alignItems: 'center',
                      justifyContent: 'flex-end'
                    }}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleViewSiteDetail(item)}
                        sx={{ 
                          color: '#fff', 
                          p: 0.1,
                          minWidth: 'auto',
                          width: '18px',
                          height: '18px',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                        }}
                      >
                        <Search sx={{ fontSize: '0.7rem' }} />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditSchedule(item)}
                        sx={{ 
                          color: '#fff', 
                          p: 0.1,
                          minWidth: 'auto',
                          width: '18px',
                          height: '18px',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                        }}
                      >
                        <Edit sx={{ fontSize: '0.7rem' }} />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDeleteConfirm(item)}
                        sx={{ 
                          color: '#fff', 
                          p: 0.1,
                          minWidth: 'auto',
                          width: '18px',
                          height: '18px',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                        }}
                      >
                        <Delete sx={{ fontSize: '0.7rem' }} />
                      </IconButton>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Paper>
        
        {/* 5px 여백 */}
        <Box sx={{ height: '5px' }} />
        
        {/* 하단바(지금위치) - 여백 없음 */}
        
        {/* 수정 다이얼로그 */}
        <Dialog 
          open={editDialogOpen} 
          onClose={handleCancelEdit}
          maxWidth="xs"
          fullWidth
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleCancelEdit();
            }
          }}
          PaperProps={{
            sx: { 
              bgcolor: '#232634', 
              color: '#fff',
              width: '90%',
              maxWidth: '320px',
              mx: 'auto'
            }
          }}
        >
          <DialogTitle sx={{ color: '#fff', fontWeight: 700 }}>
            일정 수정
          </DialogTitle>
          <DialogContent sx={{ p: 1.5 }}>
            <TextField
              autoFocus
              margin="dense"
              label="제목"
              type="text"
              fullWidth
              variant="outlined"
              value={editScheduleTitle}
              onChange={(e) => setEditScheduleTitle(e.target.value)}
              sx={{
                mt: 0.5, mb: 1,
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  fontSize: '0.9rem',
                  '& fieldset': {
                    borderColor: '#555',
                  },
                  '&:hover fieldset': {
                    borderColor: '#777',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#2196f3',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#b0b0b0',
                  fontSize: '0.85rem',
                  '&.Mui-focused': {
                    color: '#2196f3',
                  },
                },
              }}
            />
            {/* 현장명 검색 선택 */}
            <Autocomplete
              options={sites.map(site => site.name).filter(Boolean)}
              value={editScheduleSiteName || ''}
              onInputChange={(_, v) => setEditScheduleSiteName(v)}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="현장명 검색" 
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      '& fieldset': {
                        borderColor: '#555',
                      },
                      '&:hover fieldset': {
                        borderColor: '#777',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#2196f3',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: '#b0b0b0',
                      '&.Mui-focused': {
                        color: '#2196f3',
                      },
                    },
                  }}
                />
              )}
              freeSolo
              sx={{
                mb: 2,
                '& .MuiAutocomplete-popupIndicator': {
                  color: '#b0b0b0',
                },
                '& .MuiAutocomplete-clearIndicator': {
                  color: '#b0b0b0',
                },
              }}
            />
            {/* 분류 선택 */}
            <Box sx={{ mb: 1.5 }}>
              <Typography sx={{ color: '#fff', mb: 0.5, fontSize: '0.85rem' }}>분류</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                <FormControlLabel
                  control={<Checkbox checked={editScheduleTypes.includes('현장')} onChange={() => handleEditTypeChange('현장')} sx={{ color: '#2196f3', '&.Mui-checked': { color: '#2196f3' }, p: 0.5 }} />}
                  label={<Typography sx={{ color: '#fff', fontSize: '0.8rem' }}>현장</Typography>}
                />
                <FormControlLabel
                  control={<Checkbox checked={editScheduleTypes.includes('회의')} onChange={() => handleEditTypeChange('회의')} sx={{ color: '#2196f3', '&.Mui-checked': { color: '#2196f3' }, p: 0.5 }} />}
                  label={<Typography sx={{ color: '#fff', fontSize: '0.8rem' }}>회의</Typography>}
                />
                <FormControlLabel
                  control={<Checkbox checked={editScheduleTypes.includes('입찰')} onChange={() => handleEditTypeChange('입찰')} sx={{ color: '#2196f3', '&.Mui-checked': { color: '#2196f3' }, p: 0.5 }} />}
                  label={<Typography sx={{ color: '#fff', fontSize: '0.8rem' }}>입찰</Typography>}
                />
                <FormControlLabel
                  control={<Checkbox checked={editScheduleTypes.includes('현설')} onChange={() => handleEditTypeChange('현설')} sx={{ color: '#2196f3', '&.Mui-checked': { color: '#2196f3' }, p: 0.5 }} />}
                  label={<Typography sx={{ color: '#fff', fontSize: '0.8rem' }}>현설</Typography>}
                />
                <FormControlLabel
                  control={<Checkbox checked={editScheduleTypes.includes('기타')} onChange={() => handleEditTypeChange('기타')} sx={{ color: '#2196f3', '&.Mui-checked': { color: '#2196f3' }, p: 0.5 }} />}
                  label={<Typography sx={{ color: '#fff', fontSize: '0.8rem' }}>기타</Typography>}
                />
              </Box>
            </Box>
            {/* 색상 선택 */}
            <Box sx={{ mb: 1.5 }}>
              <Typography sx={{ color: '#fff', mb: 0.5, fontSize: '0.85rem' }}>색상</Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {colorChoices.map(color => (
                  <Box
                    key={color}
                    onClick={() => setEditScheduleColor(color)}
                    sx={{
                      width: 20, height: 20, borderRadius: '50%',
                      bgcolor: color, cursor: 'pointer',
                      border: editScheduleColor === color ? '2px solid #fff' : '1px solid #888',
                      boxShadow: editScheduleColor === color ? '0 0 0 1px #2196f3' : 'none',
                      transition: 'all 0.15s'
                    }}
                  />
                ))}
              </Box>
            </Box>
            <TextField
              margin="dense"
              label="설명"
              type="text"
              fullWidth
              multiline
              rows={2}
              variant="outlined"
              value={editScheduleDesc}
              onChange={(e) => setEditScheduleDesc(e.target.value)}
              sx={{
                mb: 1.5,
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': {
                    borderColor: '#555',
                  },
                  '&:hover fieldset': {
                    borderColor: '#777',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#2196f3',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#b0b0b0',
                  '&.Mui-focused': {
                    color: '#2196f3',
                  },
                },
              }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 1.5, gap: 0.5 }}>
            <Button 
              onClick={handleCancelEdit}
              size="small"
              sx={{ 
                color: '#b0b0b0',
                fontSize: '0.85rem',
                '&:hover': { bgcolor: 'rgba(176,176,176,0.1)' }
              }}
            >
              취소
            </Button>
            <Button 
              onClick={handleSaveEdit}
              variant="contained"
              size="small"
              disabled={(!editScheduleTitle.trim() && !editScheduleSiteName.trim()) || editScheduleTypes.length === 0}
              sx={{ 
                bgcolor: '#2196f3',
                fontSize: '0.85rem',
                '&:hover': { bgcolor: '#1976d2' }
              }}
            >
              수정
            </Button>
          </DialogActions>
        </Dialog>

        {/* 삭제 확인 다이얼로그 */}
        <Dialog 
          open={deleteDialogOpen} 
          onClose={handleDeleteCancel}
          maxWidth="xs"
          fullWidth
          disableRestoreFocus={false}
          disableEnforceFocus={false}
          hideBackdrop={false}
          PaperProps={{
            sx: { 
              bgcolor: '#232634', 
              color: '#fff',
              width: '90%',
              maxWidth: '280px',
              mx: 'auto'
            }
          }}
        >
          <DialogTitle sx={{ color: '#fff', fontWeight: 700 }}>
            일정 삭제
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ color: '#fff', fontSize: '1rem' }}>
              "{scheduleToDelete?.text || scheduleToDelete?.title || '제목 없음'}" 일정을 삭제하시겠습니까?
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button 
              onClick={handleDeleteCancel}
              sx={{ 
                color: '#b0b0b0',
                '&:hover': { bgcolor: 'rgba(176,176,176,0.1)' }
              }}
            >
              취소
            </Button>
            <Button 
              onClick={handleDeleteSchedule}
              variant="contained"
              sx={{ 
                bgcolor: '#ef4444',
                '&:hover': { bgcolor: '#dc2626' }
              }}
            >
              삭제
            </Button>
          </DialogActions>
        </Dialog>

        {/* 일정 추가 다이얼로그 */}
        <Dialog 
          open={addDialogOpen} 
          onClose={handleCancelAdd}
          maxWidth="xs"
          fullWidth
          disableRestoreFocus={false}
          disableEnforceFocus={false}
          hideBackdrop={false}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleCancelAdd();
            }
          }}
          PaperProps={{
            sx: { 
              bgcolor: '#232634', 
              color: '#fff',
              width: '90%',
              maxWidth: '320px',
              mx: 'auto'
            }
          }}
        >
          <DialogTitle sx={{ color: '#fff', fontWeight: 700 }}>
            {year}년 {month + 1}월 {selectedDay}일 일정
          </DialogTitle>
          <DialogContent sx={{ p: 1.5 }}>
            <TextField
              autoFocus
              margin="dense"
              label="제목"
              type="text"
              fullWidth
              variant="outlined"
              value={newScheduleTitle}
              onChange={(e) => setNewScheduleTitle(e.target.value)}
              sx={{
                mt: 0.5, mb: 1,
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  fontSize: '0.9rem',
                  '& fieldset': {
                    borderColor: '#555',
                  },
                  '&:hover fieldset': {
                    borderColor: '#777',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#2196f3',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#b0b0b0',
                  fontSize: '0.85rem',
                  '&.Mui-focused': {
                    color: '#2196f3',
                  },
                },
              }}
            />
            {/* 현장명 검색 선택 */}
            <Autocomplete
              options={sites.map(site => site.name).filter(Boolean)}
              value={newScheduleSiteName || ''}
              onInputChange={(_, v) => setNewScheduleSiteName(v)}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="현장명 검색" 
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      '& fieldset': {
                        borderColor: '#555',
                      },
                      '&:hover fieldset': {
                        borderColor: '#777',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#2196f3',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: '#b0b0b0',
                      '&.Mui-focused': {
                        color: '#2196f3',
                      },
                    },
                  }}
                />
              )}
              freeSolo
              sx={{
                mb: 2,
                '& .MuiAutocomplete-popupIndicator': {
                  color: '#b0b0b0',
                },
                '& .MuiAutocomplete-clearIndicator': {
                  color: '#b0b0b0',
                },
              }}
            />
            {/* 분류 선택 */}
            <Box sx={{ mb: 1.5 }}>
              <Typography sx={{ color: '#fff', mb: 0.5, fontSize: '0.85rem' }}>분류</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                <FormControlLabel
                  control={<Checkbox checked={newScheduleTypes.includes('현장')} onChange={() => handleTypeChange('현장')} sx={{ color: '#2196f3', '&.Mui-checked': { color: '#2196f3' }, p: 0.3 }} />}
                  label={<Typography sx={{ color: '#fff', fontSize: '0.75rem' }}>현장</Typography>}
                />
                <FormControlLabel
                  control={<Checkbox checked={newScheduleTypes.includes('회의')} onChange={() => handleTypeChange('회의')} sx={{ color: '#2196f3', '&.Mui-checked': { color: '#2196f3' }, p: 0.3 }} />}
                  label={<Typography sx={{ color: '#fff', fontSize: '0.75rem' }}>회의</Typography>}
                />
                <FormControlLabel
                  control={<Checkbox checked={newScheduleTypes.includes('입찰')} onChange={() => handleTypeChange('입찰')} sx={{ color: '#2196f3', '&.Mui-checked': { color: '#2196f3' }, p: 0.3 }} />}
                  label={<Typography sx={{ color: '#fff', fontSize: '0.75rem' }}>입찰</Typography>}
                />
                <FormControlLabel
                  control={<Checkbox checked={newScheduleTypes.includes('현설')} onChange={() => handleTypeChange('현설')} sx={{ color: '#2196f3', '&.Mui-checked': { color: '#2196f3' }, p: 0.3 }} />}
                  label={<Typography sx={{ color: '#fff', fontSize: '0.75rem' }}>현설</Typography>}
                />
                <FormControlLabel
                  control={<Checkbox checked={newScheduleTypes.includes('기타')} onChange={() => handleTypeChange('기타')} sx={{ color: '#2196f3', '&.Mui-checked': { color: '#2196f3' }, p: 0.3 }} />}
                  label={<Typography sx={{ color: '#fff', fontSize: '0.75rem' }}>기타</Typography>}
                />
              </Box>
            </Box>
            {/* 색상 선택 */}
            <Box sx={{ mb: 1.5 }}>
              <Typography sx={{ color: '#fff', mb: 0.5, fontSize: '0.85rem' }}>색상</Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {colorChoices.map(color => (
                  <Box
                    key={color}
                    onClick={() => setNewScheduleColor(color)}
                    sx={{
                      width: 18, height: 18, borderRadius: '50%',
                      bgcolor: color, cursor: 'pointer',
                      border: newScheduleColor === color ? '2px solid #fff' : '1px solid #888',
                      boxShadow: newScheduleColor === color ? '0 0 0 1px #2196f3' : 'none',
                      transition: 'all 0.15s'
                    }}
                  />
                ))}
              </Box>
            </Box>
            <TextField
              margin="dense"
              label="설명"
              type="text"
              fullWidth
              multiline
              rows={2}
              variant="outlined"
              value={newScheduleDesc}
              onChange={(e) => setNewScheduleDesc(e.target.value)}
              sx={{
                mb: 1.5,
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': {
                    borderColor: '#555',
                  },
                  '&:hover fieldset': {
                    borderColor: '#777',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#2196f3',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#b0b0b0',
                  '&.Mui-focused': {
                    color: '#2196f3',
                  },
                },
              }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 1.5, gap: 0.5 }}>
            <Button 
              onClick={handleCancelAdd}
              size="small"
              sx={{ 
                color: '#b0b0b0',
                fontSize: '0.85rem',
                '&:hover': { bgcolor: 'rgba(176,176,176,0.1)' }
              }}
            >
              취소
            </Button>
            <Button 
              onClick={handleSaveAdd}
              variant="contained"
              size="small"
              disabled={(!newScheduleTitle.trim() && !newScheduleSiteName.trim()) || newScheduleTypes.length === 0}
              sx={{ 
                bgcolor: '#2196f3',
                fontSize: '0.85rem',
                '&:hover': { bgcolor: '#1976d2' }
              }}
            >
              추가
            </Button>
          </DialogActions>
        </Dialog>

        {/* 현장 상세내역 팝업 */}
        <Dialog 
          open={siteDetailDialogOpen} 
          onClose={() => setSiteDetailDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { 
              bgcolor: '#232634', 
              color: '#fff',
              width: '95%',
              maxWidth: '400px',
              mx: 'auto'
            }
          }}
        >
          <DialogTitle sx={{ color: '#fff', fontWeight: 700, borderBottom: '1px solid #444' }}>
            {selectedSiteDetail?.type === '견적' ? '견적 상세내역' : 
             selectedSiteDetail?.type === '현설' ? '현설 상세내역' :
             selectedSiteDetail?.type === '입찰' ? '입찰 상세내역' : '현장 상세내역'}
          </DialogTitle>
          <DialogContent sx={{ p: 2 }}>
            {selectedSiteDetail && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* 기본 정보 */}
                <Box>
                  <Typography variant="h6" sx={{ color: '#2196f3', mb: 1, fontWeight: 700 }}>
                    {selectedSiteDetail.name}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ color: '#b0b0b0', fontSize: '0.85rem' }}>회사명:</Typography>
                      <Typography sx={{ color: '#fff', fontSize: '0.85rem' }}>{selectedSiteDetail.company}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ color: '#b0b0b0', fontSize: '0.85rem' }}>현장소장:</Typography>
                      <Typography sx={{ color: '#fff', fontSize: '0.85rem' }}>{selectedSiteDetail.manager}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ color: '#b0b0b0', fontSize: '0.85rem' }}>시공팀:</Typography>
                      <Typography sx={{ color: '#fff', fontSize: '0.85rem' }}>{selectedSiteDetail.constructionTeam}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ color: '#b0b0b0', fontSize: '0.85rem' }}>주소:</Typography>
                      <Typography sx={{ color: '#fff', fontSize: '0.85rem' }}>{selectedSiteDetail.address}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ color: '#b0b0b0', fontSize: '0.85rem' }}>계약금액:</Typography>
                      <Typography sx={{ color: '#fff', fontSize: '0.85rem' }}>
                        {selectedSiteDetail.contractAmount ? formatContractAmount(selectedSiteDetail.contractAmount) : '정보 없음'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ color: '#b0b0b0', fontSize: '0.85rem' }}>공사기간:</Typography>
                      <Typography sx={{ color: '#fff', fontSize: '0.85rem' }}>
                        {selectedSiteDetail.startDate} ~ {selectedSiteDetail.endDate}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* 견적 상세내역 */}
                {selectedSiteDetail.type === '견적' && (
                  <Box>
                    <Typography variant="subtitle1" sx={{ color: '#f59e42', mb: 1, fontWeight: 600 }}>
                      견적 상세내역
                    </Typography>
                    <Typography sx={{ color: '#fff', fontSize: '0.85rem', lineHeight: 1.5 }}>
                      {selectedSiteDetail.estimateDetails || '견적 상세내역이 없습니다.'}
                    </Typography>
                  </Box>
                )}

                {/* 현설 상세내역 */}
                {selectedSiteDetail.type === '현설' && (
                  <Box>
                    <Typography variant="subtitle1" sx={{ color: '#22c55e', mb: 1, fontWeight: 600 }}>
                      현설 상세내역
                    </Typography>
                    <Typography sx={{ color: '#fff', fontSize: '0.85rem', lineHeight: 1.5 }}>
                      {selectedSiteDetail.constructionDetails || '현설 상세내역이 없습니다.'}
                    </Typography>
                  </Box>
                )}

                {/* 입찰 상세내역 */}
                {selectedSiteDetail.type === '입찰' && (
                  <Box>
                    <Typography variant="subtitle1" sx={{ color: '#ef4444', mb: 1, fontWeight: 600 }}>
                      입찰 상세내역
                    </Typography>
                    <Typography sx={{ color: '#fff', fontSize: '0.85rem', lineHeight: 1.5 }}>
                      {selectedSiteDetail.bidDetails || '입찰 상세내역이 없습니다.'}
                    </Typography>
                  </Box>
                )}

                {/* 현장 상세내역 (원래내용) */}
                {(!selectedSiteDetail.type || selectedSiteDetail.type === '현장') && (
                  <Box>
                    <Typography variant="subtitle1" sx={{ color: '#2196f3', mb: 1, fontWeight: 600 }}>
                      현장 상세내역
                    </Typography>
                    <Typography sx={{ color: '#fff', fontSize: '0.85rem', lineHeight: 1.5 }}>
                      {selectedSiteDetail.description || '현장 상세내역이 없습니다.'}
                    </Typography>
                  </Box>
                )}

                {/* 견적 상태 - 견적 타입일 때만 */}
                {selectedSiteDetail.type === '견적' && (
                  <Box>
                    <Typography variant="subtitle1" sx={{ color: '#f59e42', mb: 1, fontWeight: 600 }}>
                      견적 상태
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={selectedSiteDetail.estimateStatus === '제출완료'}
                            onChange={async (e) => {
                              try {
                                const newStatus = e.target.checked ? '제출완료' : '제출대기';
                                console.log('견적 상태 업데이트:', selectedSiteDetail.name, newStatus);
                                
                                // 견적 데이터에서 상태 업데이트
                                const estimatesQuery = query(
                                  collection(db, 'estimates'),
                                  where('siteName', '==', selectedSiteDetail.name)
                                );
                                const estimatesSnapshot = await getDocs(estimatesQuery);
                                
                                if (!estimatesSnapshot.empty) {
                                  const estimateRef = doc(db, 'estimates', estimatesSnapshot.docs[0].id);
                                  await updateDoc(estimateRef, {
                                    status: newStatus,
                                    updatedAt: new Date()
                                  });
                                }
                                
                                // 로컬 상태 업데이트
                                setSelectedSiteDetail(prev => ({
                                  ...prev,
                                  estimateStatus: newStatus
                                }));
                                
                                console.log('견적 상태 업데이트 완료');
                              } catch (error) {
                                console.error('견적 상태 업데이트 실패:', error);
                                alert('견적 상태 업데이트에 실패했습니다.');
                              }
                            }}
                            sx={{ 
                              color: '#f59e42', 
                              '&.Mui-checked': { color: '#22c55e' } 
                            }}
                          />
                        }
                        label={
                          <Typography sx={{ color: '#fff', fontSize: '0.85rem' }}>
                            견적 제출 완료
                          </Typography>
                        }
                      />
                    </Box>
                  </Box>
                )}

                {/* 입찰 상태 - 입찰 타입일 때만 */}
                {selectedSiteDetail.type === '입찰' && (
                  <Box>
                    <Typography variant="subtitle1" sx={{ color: '#ef4444', mb: 1, fontWeight: 600 }}>
                      입찰 상태
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={selectedSiteDetail.bidStatus === '입찰완료'}
                            onChange={async (e) => {
                              try {
                                const newStatus = e.target.checked ? '입찰완료' : '입찰대기';
                                console.log('입찰 상태 업데이트:', selectedSiteDetail.name, newStatus);
                                
                                // 입찰 데이터에서 상태 업데이트
                                const bidsQuery = query(
                                  collection(db, 'bids'),
                                  where('siteName', '==', selectedSiteDetail.name)
                                );
                                const bidsSnapshot = await getDocs(bidsQuery);
                                
                                if (!bidsSnapshot.empty) {
                                  const bidRef = doc(db, 'bids', bidsSnapshot.docs[0].id);
                                  await updateDoc(bidRef, {
                                    status: newStatus,
                                    updatedAt: new Date()
                                  });
                                }
                                
                                // 로컬 상태 업데이트
                                setSelectedSiteDetail(prev => ({
                                  ...prev,
                                  bidStatus: newStatus
                                }));
                                
                                console.log('입찰 상태 업데이트 완료');
                              } catch (error) {
                                console.error('입찰 상태 업데이트 실패:', error);
                                alert('입찰 상태 업데이트에 실패했습니다.');
                              }
                            }}
                            sx={{ 
                              color: '#ef4444', 
                              '&.Mui-checked': { color: '#22c55e' } 
                            }}
                          />
                        }
                        label={
                          <Typography sx={{ color: '#fff', fontSize: '0.85rem' }}>
                            입찰 완료
                          </Typography>
                        }
                      />
                    </Box>
                  </Box>
                )}

                {/* 물량 내역 */}
                {selectedSiteDetail.items && selectedSiteDetail.items.length > 0 && (
                  <Box>
                    <Typography variant="subtitle1" sx={{ color: '#2196f3', mb: 1, fontWeight: 600 }}>
                      물량 내역
                    </Typography>
                    <Box sx={{ 
                      bgcolor: '#1a1a1a', 
                      borderRadius: 1, 
                      p: 1,
                      maxHeight: '200px',
                      overflow: 'auto'
                    }}>
                      <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr auto auto', 
                        gap: 1,
                        borderBottom: '1px solid #444',
                        pb: 0.5,
                        mb: 0.5
                      }}>
                        <Typography sx={{ color: '#b0b0b0', fontSize: '0.75rem', fontWeight: 600 }}>항목</Typography>
                        <Typography sx={{ color: '#b0b0b0', fontSize: '0.75rem', fontWeight: 600 }}>물량</Typography>
                        <Typography sx={{ color: '#b0b0b0', fontSize: '0.75rem', fontWeight: 600 }}>단가</Typography>
                      </Box>
                      {selectedSiteDetail.items.map((item, index) => (
                        <Box key={index} sx={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1fr auto auto', 
                          gap: 1,
                          py: 0.5,
                          borderBottom: index < selectedSiteDetail.items.length - 1 ? '1px solid #333' : 'none'
                        }}>
                          <Typography sx={{ color: '#fff', fontSize: '0.75rem' }}>{item.name}</Typography>
                          <Typography sx={{ color: '#fff', fontSize: '0.75rem' }}>{item.qty}</Typography>
                          <Typography sx={{ color: '#fff', fontSize: '0.75rem' }}>{item.price?.toLocaleString()}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, borderTop: '1px solid #444' }}>
            <Button 
              onClick={() => setSiteDetailDialogOpen(false)}
              variant="contained"
              sx={{ 
                bgcolor: '#2196f3',
                color: '#fff',
                '&:hover': { bgcolor: '#1976d2' }
              }}
            >
              닫기
            </Button>
          </DialogActions>
        </Dialog>

        {/* 하단 Chunwoo 로고 워터마크 */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: FOOTER_HEIGHT + 100,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 2000,
          }}
        >
          <img
            src="/chunwoo.png"
            alt="Chunwoo"
            style={{
              height: 40,
              opacity: 0.15,
              filter: 'drop-shadow(0 2px 8px #0006)',
              userSelect: 'none',
            }}
          />
        </Box>
      </Box>
    </MobileLayout>
  );
};

export default CustomScheduleMobile; 
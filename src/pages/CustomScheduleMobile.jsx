import React, { useEffect, useState } from 'react';
import { Box, Typography, IconButton, Grid, Paper, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Autocomplete, Checkbox, FormControlLabel } from '@mui/material';
import { ChevronLeft, ChevronRight, ArrowBack, Add, Today, Edit, Delete, ViewWeek, ViewModule, CalendarViewMonth } from '@mui/icons-material';
import { collection, onSnapshot, doc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

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
    week.push({
      day: prevDay,
      isCurrentMonth: false
    });
  }
  
  // 이번달 날짜들
  for (let day = 1; day <= daysInMonth; day++) {
    week.push({
      day,
      isCurrentMonth: true
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
      week.push({
        day: i,
        isCurrentMonth: false
      });
    }
    matrix.push(week);
  }
  
  return matrix;
}

const CustomScheduleMobile = () => {
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
  const [viewMode, setViewMode] = useState('month'); // 'day', '3day', 'month'
  const colorChoices = ['#3b82f6', '#22c55e', '#f59e42', '#ef4444', '#a855f7', '#eab308'];

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'schedules'), (snapshot) => {
      const scheduleData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('일정 데이터 로드:', scheduleData);
      setSchedules(scheduleData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'sites'), (snapshot) => {
      setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const monthMatrix = getMonthMatrix(year, month);

  // 날짜별 일정 매핑
  const scheduleMap = {};
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
    
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!scheduleMap[day]) scheduleMap[day] = [];
      scheduleMap[day].push(item);
    }
  });
  
  console.log('현재 월 일정 매핑:', scheduleMap);

  // 일일보기용 달력 렌더링
  const renderDayView = () => {
    const selectedDate = new Date(year, month, selectedDay);
    const dayOfWeek = selectedDate.getDay();
    
    return (
      <Box sx={{ px: 1, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <IconButton 
            size="small" 
            onClick={() => {
              const newDate = new Date(year, month, selectedDay - 1);
              setSelectedDay(newDate.getDate());
              setMonth(newDate.getMonth());
              setYear(newDate.getFullYear());
            }}
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
            onClick={() => {
              const newDate = new Date(year, month, selectedDay + 1);
              setSelectedDay(newDate.getDate());
              setMonth(newDate.getMonth());
              setYear(newDate.getFullYear());
            }}
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
                  width: isSelected ? '100%' : '0%', // 선택된 날짜는 100% 너비
                  height: 'calc(100vh - 200px)', // 화면 높이에서 헤더/하단바 높이를 뺀 값으로 설정
                  bgcolor: isSelected ? '#232634' : 'transparent',
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
                    bgcolor: isSelected ? '#232634' : 'rgba(35, 38, 52, 0.3)',
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
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.5, mt: 0.5 }}>
                      {/* 일정 카운트 */}
                      {scheduleMap[selectedDay]?.length > 0 && (
                        <Typography
                          sx={{
                            color: '#888',
                            fontSize: '0.75rem',
                            fontWeight: 400,
                            opacity: 0.7,
                            ml: 0.5,
                            mt: 0.5,
                          }}
                        >
                          [{scheduleMap[selectedDay].length}]
                        </Typography>
                      )}
                      {/* 날짜 숫자 */}
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          bgcolor: 'transparent',
                          color: dayOfWeek === 0 ? '#ef5350' : dayOfWeek === 6 ? '#42a5f5' : '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '1rem',
                        }}
                      >
                        {selectedDay}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.2, mt: 0.5 }}>
                      {scheduleMap[selectedDay]?.slice(0, 12).map((item, i) => (
                        <Box
                          key={item.id}
                          sx={{
                            borderRadius: 1,
                            px: 0.8,
                            py: 0.3,
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            bgcolor: item.color || colorList[i % colorList.length],
                            color: '#fff',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 2px 0 #0003',
                            textAlign: 'center',
                            width: '100%',
                            mb: 0.2,
                          }}
                        >
                          {(() => {
                            const typePrefix = 
                              item.type === '현장' ? '[현장]' : 
                              item.type === '회의' ? '[회의]' : 
                              item.type === '입찰' ? '[입찰]' : 
                              item.type === '현설' ? '[현설]' : 
                              item.type === '지원' ? '[지원]' : 
                              item.type === '기타' ? '[기타]' : '';
                            return typePrefix + (item.text || item.title || '제목 없음').slice(0, 15);
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
    
    // 선택된 날짜 기준으로 3일 (전날, 오늘, 다음날)
    const days = [];
    for (let i = -1; i <= 1; i++) {
      const date = new Date(year, month, selectedDay + i);
      days.push({
        date: date,
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
        isCurrentMonth: date.getMonth() === month,
        isSelected: i === 0
      });
    }
    
    return (
      <Box sx={{ px: 1, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <IconButton 
            size="small" 
            onClick={() => {
              const newDate = new Date(year, month, selectedDay - 1);
              setSelectedDay(newDate.getDate());
              setMonth(newDate.getMonth());
              setYear(newDate.getFullYear());
            }}
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
            onClick={() => {
              const newDate = new Date(year, month, selectedDay + 1);
              setSelectedDay(newDate.getDate());
              setMonth(newDate.getMonth());
              setYear(newDate.getFullYear());
            }}
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
                  width: '33.33%', // 3개 합쳐서 100% (각각 33.33%)
                  height: 'calc(100vh - 200px)', // 화면 높이에서 헤더/하단바 높이를 뺀 값으로 설정
                  bgcolor: dayInfo.isSelected ? '#232634' : 'transparent',
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
                  '&:hover': {
                    bgcolor: dayInfo.isCurrentMonth ? '#232634' : 'transparent',
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
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.3, mt: 0.3 }}>
                  {/* 일정 카운트 */}
                  {dayInfo.isCurrentMonth && scheduleMap[dayInfo.day]?.length > 0 && (
                    <Typography
                      sx={{
                        color: '#888',
                        fontSize: '0.65rem',
                        fontWeight: 400,
                        opacity: 0.7,
                        ml: 0.5,
                        mt: 0.5,
                      }}
                    >
                      [{scheduleMap[dayInfo.day].length}]
                    </Typography>
                  )}
                  {/* 날짜 숫자 */}
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      bgcolor: 'transparent',
                      color: dayOfWeek === 0 ? '#ef5350' : dayOfWeek === 6 ? '#42a5f5' : dayInfo.isCurrentMonth ? '#fff' : '#888',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                    }}
                  >
                    {dayInfo.day}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.15, mt: 0.3 }}>
                  {dayInfo.isCurrentMonth && scheduleMap[dayInfo.day]?.slice(0, 8).map((item, j) => (
                    <Box
                      key={item.id}
                      sx={{
                        borderRadius: 1,
                        px: 0.6,
                        py: 0.2,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        bgcolor: item.color || colorList[j % colorList.length],
                        color: '#fff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 1px 2px 0 #0003',
                        textAlign: 'center',
                        width: '100%',
                        mb: 0.1,
                      }}
                                          >
                        {(() => {
                          const typePrefix = 
                            item.type === '현장' ? '[현장]' : 
                            item.type === '회의' ? '[회의]' : 
                            item.type === '입찰' ? '[입찰]' : 
                            item.type === '현설' ? '[현설]' : 
                            item.type === '지원' ? '[지원]' : 
                            item.type === '기타' ? '[기타]' : '';
                          return typePrefix + (item.text || item.title || '제목 없음').slice(0, 8);
                        })()}
                      </Box>
                  ))}
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
  const selectedSchedules = scheduleMap[selectedDay] || [];

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

  return (
    <Box sx={{ 
      bgcolor: '#181a20', 
      height: 'calc(100vh - 60px)', 
      overflow: 'hidden',
      position: 'fixed',
      top: '15px',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000
    }}>
      {/* 상단 빈칸 */}
      <Box sx={{ height: 30, bgcolor: '#181a20' }} />
      
      {/* 월/연도 네비 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, px: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={handlePrevMonth} color="primary" size="small"><ChevronLeft /></IconButton>
          <Typography variant="h6" sx={{ color: '#2196f3', fontWeight: 700, fontSize: '1.1rem', minWidth: 90, textAlign: 'center' }}>{year}년 {month + 1}월</Typography>
          <IconButton onClick={handleNextMonth} color="primary" size="small"><ChevronRight /></IconButton>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => setViewMode('day')}
            sx={{
              color: '#fff',
              bgcolor: viewMode === 'day' ? '#232634' : 'transparent',
              borderRadius: 1,
              border: viewMode === 'day' ? '1.5px solid #fff' : '1px solid #333',
              width: 36, height: 36,
              boxShadow: viewMode === 'day' ? '0 0 0 2px #2196f3' : 'none',
              '&:hover': {
                bgcolor: '#232634',
                borderColor: '#2196f3',
              }
            }}
          >
            <ViewWeek />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setViewMode('3day')}
            sx={{
              color: '#fff',
              bgcolor: viewMode === '3day' ? '#232634' : 'transparent',
              borderRadius: 1,
              border: viewMode === '3day' ? '1.5px solid #fff' : '1px solid #333',
              width: 36, height: 36,
              boxShadow: viewMode === '3day' ? '0 0 0 2px #2196f3' : 'none',
              '&:hover': {
                bgcolor: '#232634',
                borderColor: '#2196f3',
              }
            }}
          >
            <ViewModule />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setViewMode('month')}
            sx={{
              color: '#fff',
              bgcolor: viewMode === 'month' ? '#232634' : 'transparent',
              borderRadius: 1,
              border: viewMode === 'month' ? '1.5px solid #fff' : '1px solid #333',
              width: 36, height: 36,
              boxShadow: viewMode === 'month' ? '0 0 0 2px #2196f3' : 'none',
              '&:hover': {
                bgcolor: '#232634',
                borderColor: '#2196f3',
              }
            }}
          >
            <CalendarViewMonth />
          </IconButton>
        </Box>
      </Box>
      
      {/* 요일 헤더 - 월간보기에서만 표시 */}
      {viewMode === 'month' && (
        <Box sx={{ display: 'flex', mb: 0.5, px: 1 }}>
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
      
      {/* 달력 그리드 - 뷰 모드에 따라 렌더링 */}
      {viewMode === 'day' && renderDayView()}
      {viewMode === '3day' && render3DayView()}
      {viewMode === 'month' && (
        <Box sx={{ px: 1, mb: 1 }}>
          {monthMatrix.map((week, rowIdx) => (
            <Box key={rowIdx} sx={{ display: 'flex', mb: 0.2 }}>
              {week.map((cell, colIdx) => {
                const { day, isCurrentMonth } = cell;
                const isToday = isCurrentMonth && day && year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
                const isSelected = isCurrentMonth && day === selectedDay;
                const dayOfWeek = colIdx; // 0=일요일, 6=토요일
                
                return (
                  <Box
                    key={`${rowIdx}-${colIdx}`}
                    sx={{
                      flex: 1, // 모든 셀이 동일한 너비
                      height: 68, // 모든 셀 높이 동일 (64 → 68)
                      bgcolor: isSelected ? '#232634' : 'transparent',
                      borderRadius: 2,
                      border: isToday
                        ? '2px solid #ef5350' // 오늘 날짜 셀 전체에만 빨간 테두리
                        : isSelected
                          ? '2px solid #42a5f5'
                          : '1px solid #333',
                      p: 0.25, // 패딩 줄임 (0.5 → 0.25)
                      mx: 0.1, // 마진 줄임 (0.25 → 0.1)
                      position: 'relative',
                      opacity: isCurrentMonth ? 1 : 0.3,
                      boxShadow: isSelected ? '0 2px 8px 0 #1976d255' : 'none',
                      cursor: day ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: isCurrentMonth ? '#232634' : 'transparent',
                      }
                    }}
                    onClick={() => isCurrentMonth && day && setSelectedDay(day)}
                  >
                    {day && (
                      <>
                        {/* 날짜 숫자와 일정 카운트 */}
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 0.2, mt: -0.5 }}>
                          {/* 일정 카운트 */}
                          {isCurrentMonth && scheduleMap[day]?.length > 0 && (
                            <Typography
                              sx={{
                                color: '#888',
                                fontSize: '0.65rem',
                                fontWeight: 400,
                                opacity: 0.7,
                                ml: 0.5,
                                mt: 0.5,
                              }}
                            >
                              [{scheduleMap[day].length}]
                            </Typography>
                          )}
                          {/* 날짜 숫자 */}
                          <Box
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              bgcolor: 'transparent',
                              color:
                                dayOfWeek === 0 ? '#ef5350' : // 일요일 빨강
                                dayOfWeek === 6 ? '#42a5f5' : // 토요일 파랑
                                isCurrentMonth ? '#fff' : '#888',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              transition: 'all 0.2s',
                            }}
                          >
                            {day}
                          </Box>
                        </Box>
                        
                        {/* 일정 바 - 이번달만 표시 */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.1, mt: -0.5 }}>
                          {isCurrentMonth && scheduleMap[day]?.length > 0 && (
                            <Box
                              sx={{
                                maxHeight: scheduleMap[day]?.length > 3 ? 30 : 'auto',
                                overflowY: scheduleMap[day]?.length > 3 ? 'auto' : 'visible',
                                scrollbarWidth: 'none', // Firefox
                                msOverflowStyle: 'none', // IE/Edge
                                '&::-webkit-scrollbar': { display: 'none' }, // Chrome/Safari
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.1,
                              }}
                            >
                              {scheduleMap[day]?.map((item, i) => (
                                <Box
                                  key={item.id}
                                  sx={{
                                    borderRadius: 1,
                                    px: 0.5,
                                    py: 0,
                                    fontSize: '0.7rem',
                                    fontWeight: 500,
                                    bgcolor: item.color || colorList[i % colorList.length],
                                    color: '#fff',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 1px 2px 0 #0003',
                                    textAlign: 'center',
                                    width: '100%',
                                    flexShrink: 0, // 스크롤 시 크기 유지
                                  }}
                                >
                                  {(item.text || item.title || '제목 없음').slice(0, 3)}
                                </Box>
                              ))}
                            </Box>
                          )}
                        </Box>
                      </>
                    )}
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      )}
      
      {/* 하단 상세 일정 */}
      <Paper sx={{ 
        bgcolor: '#232634', 
        borderRadius: 3, 
        mx: 1, 
        p: 1.5, 
        boxShadow: 3,
        height: '320px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
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
              gap: 0.3,
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              scrollbarWidth: 'none', // Firefox
              msOverflowStyle: 'none', // IE/Edge
              '&::-webkit-scrollbar': { display: 'none' }, // Chrome/Safari
              WebkitOverflowScrolling: 'touch', // iOS 스크롤 개선
            }}
          >
            {selectedSchedules.map((item, i) => (
              <Box 
                key={item.id} 
                sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 0.5, // 패딩 줄임 (1 → 0.5)
                  borderRadius: 2, 
                  bgcolor: item.color || colorList[i % colorList.length], 
                  color: '#fff', 
                  fontWeight: 500, 
                  fontSize: '0.9rem', // 폰트 크기 줄임 (1rem → 0.9rem)
                  boxShadow: '0 1px 4px 0 #0003',
                  mb: 0.2, // 마진 줄임
                  flexShrink: 0, // 스크롤 시 크기 유지
                }}
              >
                <Typography sx={{ flex: 1, fontSize: '0.9rem' }}>
                  {(() => {
                    const typePrefix = 
                      item.type === '현장' ? '[현장]' : 
                      item.type === '회의' ? '[회의]' : 
                      item.type === '입찰' ? '[입찰]' : 
                      item.type === '현설' ? '[현설]' : 
                      item.type === '지원' ? '[지원]' : 
                      item.type === '기타' ? '[기타]' : '';
                    return typePrefix + (item.text || item.title || '제목 없음');
                  })()}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton 
                    size="small" 
                    onClick={() => handleEditSchedule(item)}
                    sx={{ 
                      color: '#fff', 
                      p: 0.2,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                    }}
                  >
                    <Edit sx={{ fontSize: '0.8rem' }} />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => handleDeleteConfirm(item)}
                    sx={{ 
                      color: '#fff', 
                      p: 0.2,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                    }}
                  >
                    <Delete sx={{ fontSize: '0.8rem' }} />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
      
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
                control={<Checkbox checked={editScheduleTypes.includes('지원')} onChange={() => handleEditTypeChange('지원')} sx={{ color: '#2196f3', '&.Mui-checked': { color: '#2196f3' }, p: 0.5 }} />}
                label={<Typography sx={{ color: '#fff', fontSize: '0.8rem' }}>지원</Typography>}
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
                control={<Checkbox checked={newScheduleTypes.includes('지원')} onChange={() => handleTypeChange('지원')} sx={{ color: '#2196f3', '&.Mui-checked': { color: '#2196f3' }, p: 0.3 }} />}
                label={<Typography sx={{ color: '#fff', fontSize: '0.75rem' }}>지원</Typography>}
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
    </Box>
  );
};

export default CustomScheduleMobile; 
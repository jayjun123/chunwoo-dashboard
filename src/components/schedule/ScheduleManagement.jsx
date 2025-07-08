import React, { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Button, TextField, IconButton, Paper, MenuItem, Checkbox, FormControlLabel, Autocomplete } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import CustomCalendar from '../CustomCalendar';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { collection, doc, query, onSnapshot, addDoc, updateDoc, deleteDoc, writeBatch, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import * as XLSX from 'xlsx';
import { exportCalendarToExcel, exportToExcel } from '../../utils/exportUtils';
import useMediaQuery from '@mui/material/useMediaQuery';

function isInMonth(site, year, month) {
  if (!site.startDate || !site.endDate) return false;
  const s = new Date(site.startDate);
  const e = new Date(site.endDate);
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  return !(e < first || s > last);
}

// 날짜 포맷 함수 (YYYY-MM-DD → 7월 4일(목) 일정)
function formatKoreanDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const week = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = week[date.getDay()];
  return `${month}월 ${day}일(${dayOfWeek}) 일정`;
}

const ScheduleManagement = ({ 
  sites: propSites = [], 
  schedules: propSchedules = [], 
  onAddSchedule, 
  onEditSchedule, 
  onDeleteSchedule,
  viewMode: propViewMode = 'month',
  onDateClick,
  selectedSchedules,
  checkedSchedules,
  onCheckSchedule,
  onDeleteSelectedSchedules
}) => {

  const isMobile = useMediaQuery('(max-width:600px)');
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [viewMode, setViewMode] = useState(propViewMode);
  const [calendarItems, setCalendarItems] = useState({});
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupDate, setPopupDate] = useState('');
  const [popupTitle, setPopupTitle] = useState('');
  const [popupDesc, setPopupDesc] = useState('');
  const [popupType, setPopupType] = useState('');
  const [popupSiteName, setPopupSiteName] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [editPopup, setEditPopup] = useState({ open: false, item: null, date: null });
  const [sites, setSites] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});
  const colorChoices = ['#3b82f6', '#22c55e', '#f59e42', '#ef4444', '#a855f7', '#eab308'];
  const [selectedColor, setSelectedColor] = useState(colorChoices[0]);
  const [showListPopup, setShowListPopup] = useState(false);
  const [listPopupDate, setListPopupDate] = useState('');
  const [editSchedule, setEditSchedule] = useState({ open: false, schedule: null });
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [siteSearchTerm, setSiteSearchTerm] = useState('');

  useEffect(() => {
    // props로 전달받은 sites가 있으면 사용, 없으면 기존 로직 사용
    if (propSites && propSites.length > 0) {
      setSites(propSites);
      return;
    }
    
    const q = query(collection(db, 'sites'));
    let unsubscribe = null;
    
    try {
      unsubscribe = onSnapshot(q, (snapshot) => {
        try {
          const sitesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // 이전 상태와 비교하여 실제로 변경되었을 때만 업데이트
          setSites(prev => {
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(sitesData);
            if (prevStr === newStr) {
              return prev; // 변경사항이 없으면 이전 상태 반환
            }
            return sitesData;
          });
        } catch (error) {
          console.error('사이트 데이터 처리 오류:', error);
          setSites([]);
        }
      }, (error) => {
        console.error('사이트 구독 오류:', error);
        setSites([]);
      });
    } catch (error) {
      console.error('사이트 구독 설정 오류:', error);
      setSites([]);
    }
    
    return () => {
      try {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
      } catch (error) {
        console.error('사이트 구독 해제 오류:', error);
      }
    };
  }, [propSites?.length]); // propSites.length만 의존성으로 사용

  // 실시간 일정 데이터 구독
  useEffect(() => {
    const schedulesQuery = query(collection(db, 'schedules'));
    let unsubscribe = null;
    
    try {
      unsubscribe = onSnapshot(schedulesQuery, (snapshot) => {
        try {
          const schedulesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log('PC 일정 데이터 로드:', schedulesData);
          
          // 날짜별로 일정을 그룹화하고 입력순서대로 정렬
          const newCalendarItems = {};
          schedulesData.forEach(schedule => {
            if (!schedule.date) {
              console.log('날짜가 없는 일정:', schedule);
              return;
            }
            
            let dateStr;
            if (schedule.date.toDate) {
              // Firestore Timestamp인 경우
              const date = schedule.date.toDate();
              dateStr = date.toISOString().slice(0, 10);
            } else if (schedule.date instanceof Date) {
              // JavaScript Date인 경우
              dateStr = schedule.date.toISOString().slice(0, 10);
            } else {
              // 문자열인 경우
              dateStr = schedule.date;
            }
            
            if (!newCalendarItems[dateStr]) {
              newCalendarItems[dateStr] = [];
            }
            newCalendarItems[dateStr].push(schedule);
          });
          
          // 각 날짜별로 입력순서대로 정렬 (createdAt 기준)
          Object.keys(newCalendarItems).forEach(dateStr => {
            newCalendarItems[dateStr].sort((a, b) => {
              const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 
                           a.createdAt?.getTime ? a.createdAt.getTime() : 
                           new Date(a.createdAt).getTime();
              const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 
                           b.createdAt?.getTime ? b.createdAt.getTime() : 
                           new Date(b.createdAt).getTime();
              return aTime - bTime; // 오름차순 (먼저 입력된 것이 위에)
            });
          });
          
          console.log('PC 달력 아이템 업데이트:', newCalendarItems);
          setCalendarItems(newCalendarItems);
        } catch (error) {
          console.error('일정 데이터 처리 오류:', error);
          setCalendarItems({});
        }
      }, (error) => {
        console.error('일정 구독 오류:', error);
        setCalendarItems({});
      });
    } catch (error) {
      console.error('일정 구독 설정 오류:', error);
      setCalendarItems({});
    }
    
    return () => {
      try {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
      } catch (error) {
        console.error('일정 구독 해제 오류:', error);
      }
    };
  }, []); // 빈 의존성 배열로 컴포넌트 마운트 시에만 실행

  const filteredSites = useMemo(() => {
    const monthFiltered = sites.filter(site => isInMonth(site, year, month));
    if (!siteSearchTerm) return monthFiltered;
    
    return monthFiltered.filter(site => 
      site.name && site.name.toLowerCase().includes(siteSearchTerm.toLowerCase())
    );
  }, [sites, year, month, siteSearchTerm]);

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    const user = auth.currentUser;
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (source.droppableId === 'siteList' && destination.droppableId.startsWith('20')) {
      const site = filteredSites[source.index];
      if (!site) return;
      const itemsOnDate = calendarItems[destination.droppableId] || [];
      const isDuplicate = itemsOnDate.some(item => item.text === site.name && item.siteId === site.id);
      if (isDuplicate) {
        alert('같은 날짜에 같은 현장명과 제목으로 이미 등록된 일정이 있습니다.');
        return;
      }
      const newItem = {
        text: site.name,
        type: '현장', // 무조건 현장으로 설정
        desc: `${site.name} - ${site.status || ''}`,
        siteId: site.id,
        date: destination.droppableId,
        userId: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        siteName: site.name,
      };
      try {
        if (onAddSchedule) {
          // 부모 컴포넌트에서 전달받은 함수 사용
          await onAddSchedule(newItem);
        } else {
          // 기존 로직 사용
          await addDoc(collection(db, 'schedules'), newItem);
        }
      } catch (error) {
        alert('일정 추가에 실패했습니다.');
      }
    } else if (source.droppableId !== destination.droppableId) {
      // 드래그앤드롭으로 날짜 이동 시 중복 체크
      const movedItem = (calendarItems[source.droppableId] || [])[source.index];
      const itemsOnDate = calendarItems[destination.droppableId] || [];
      const isDuplicate = itemsOnDate.some(item => item.text === movedItem.text && item.siteId === movedItem.siteId);
      if (isDuplicate) {
        alert('같은 날짜에 같은 현장명과 제목으로 이미 등록된 일정이 있습니다.');
        return;
      }
      // 실시간 구독으로 인해 Optimistic-UI 제거 - Firestore 업데이트만 수행

      try {
        const itemId = draggableId.split('-').pop();
        const docRef = doc(db, 'schedules', itemId);
        await updateDoc(docRef, {
          date: destination.droppableId,
          updatedAt: new Date()
        });
      } catch (error) {
        console.error('Failed to update schedule date', error);
        // 에러 발생 시 원래 상태로 복구 (UI 복잡성으로 인해 생략, 필요시 추가)
        alert('일정 이동에 실패했습니다.');
      }
    } else {
      // 같은 날짜 내에서 순서 변경 - Firestore에서는 순서를 관리하지 않으므로 DB 업데이트 불필요
      // 실시간 구독으로 인해 UI 업데이트도 제거
    }
  };

  const handleOpenPopup = (dateStr) => {
    if (!dateStr) return;
    if (isMobile) {
      // 모바일에서는 CustomCalendar의 팝업을 사용
      return;
    }
    setPopupOpen(true);
    setPopupDate(dateStr);
    setPopupTitle('');
    setPopupType('');
    setPopupDesc('');
  };

  const handleClosePopup = () => {
    setPopupOpen(false);
    setPopupTitle('');
    setPopupDesc('');
    setPopupSiteName('');
    setSelectedTypes([]);
  };

  const handleAddSchedule = async () => {
    if ((!popupTitle.trim() && !popupSiteName.trim()) || selectedTypes.length === 0) return;
    const user = auth.currentUser;
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    
    // 한국 시간대로 날짜 생성 (시간대 문제 해결)
    const koreanDate = new Date(popupDate + 'T12:00:00'); // 정오로 설정하여 시간대 차이 방지
    
    const scheduleData = {
      text: popupTitle || popupSiteName,
      type: selectedTypes.join(', '),
      desc: popupDesc,
      date: koreanDate,
      userId: user.uid,
      color: selectedColor,
      siteName: popupSiteName,
      createdAt: new Date()
    };
    
    try {
      if (onAddSchedule) {
        // 부모 컴포넌트에서 전달받은 함수 사용
        await onAddSchedule(scheduleData);
      } else {
        // 기존 로직 사용
        await addDoc(collection(db, 'schedules'), scheduleData);
      }
      setPopupOpen(false);
      setPopupTitle('');
      setPopupDesc('');
      setPopupSiteName('');
      setSelectedTypes([]);
      
      // 모바일에서 일정 추가 후 선택된 날짜의 일정 목록 새로고침
      if (isMobile && selectedDate && selectedDate === popupDate && onDateClick) {
        onDateClick(selectedDate);
      }
    } catch (error) {
      console.error('일정 추가 실패:', error);
    }
  };

  const handleItemClick = (date, id) => {
    // 일정 클릭 시 선택 상태 토글 (삭제용)
    setSelectedItems(prev => {
      const exists = prev.find(sel => sel.date === date && sel.id === id && sel.type !== 'site');
      if (exists) {
        return prev.filter(sel => !(sel.date === date && sel.id === id && sel.type !== 'site'));
      }
      return [...prev, { date, id, type: 'schedule' }];
    });
  };

  const handleItemDoubleClick = (date, item) => {
    setEditPopup({ open: true, item, date });
  };

  let touchTimer;
  const handleItemTouchStart = (date, item) => {
    touchTimer = setTimeout(() => {
      handleItemDoubleClick(date, item);
    }, 600);
  };

  const handleItemTouchEnd = () => clearTimeout(touchTimer);



  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    
    const siteItems = selectedItems.filter(item => item.type === 'site');
    const scheduleItems = selectedItems.filter(item => item.type !== 'site');
    
    let confirmMessage = '';
    if (siteItems.length > 0 && scheduleItems.length > 0) {
      confirmMessage = `선택된 현장 ${siteItems.length}개와 일정 ${scheduleItems.length}개를 삭제하시겠습니까?`;
    } else if (siteItems.length > 0) {
      confirmMessage = `선택된 현장 ${siteItems.length}개를 삭제하시겠습니까?`;
    } else if (scheduleItems.length > 0) {
      confirmMessage = `선택된 일정 ${scheduleItems.length}개를 삭제하시겠습니까?`;
    }
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      const batch = writeBatch(db);
      
      // 일정 삭제
      scheduleItems.forEach(item => {
        const docRef = doc(db, 'schedules', item.id);
        batch.delete(docRef);
      });
      
      // 현장 삭제
      siteItems.forEach(item => {
        const docRef = doc(db, 'sites', item.id);
        batch.delete(docRef);
      });
      
      await batch.commit();
      setSelectedItems([]);
      
      if (onDeleteSelectedSchedules) {
        onDeleteSelectedSchedules(selectedItems);
      }
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleDeleteItem = async (date, itemId) => {
    if (!window.confirm('이 일정을 삭제하시겠습니까?')) return;
    
    try {
      if (onDeleteSchedule) {
        await onDeleteSchedule(itemId);
      } else {
        await deleteDoc(doc(db, 'schedules', itemId));
      }
    } catch (error) {
      console.error('일정 삭제 실패:', error);
      alert('일정 삭제에 실패했습니다.');
    }
  };

  const handleEditSave = async () => {
    if (!editPopup.item || (!editPopup.item.text?.trim() && !editPopup.item.siteName?.trim())) return;
    
    try {
      const updateData = {
        text: editPopup.item.text,
        type: editPopup.item.type,
        desc: editPopup.item.desc,
        updatedAt: new Date()
      };
      
      if (onEditSchedule) {
        await onEditSchedule(editPopup.item.id, updateData);
      } else {
        await updateDoc(doc(db, 'schedules', editPopup.item.id), updateData);
      }
      
      setEditPopup({ open: false, item: null, date: null });
    } catch (error) {
      console.error('일정 수정 실패:', error);
      alert('일정 수정에 실패했습니다.');
    }
  };

  const handleTypeChange = (type) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter(t => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const handleEditTypeChange = (type) => {
    if (!editPopup.item) return;
    setEditPopup(prev => ({
      ...prev,
      item: { ...prev.item, type }
    }));
  };

  const handleExcel = () => {
    // PC에서만 엑셀 다운로드 가능
    if (isMobile) {
      alert('PC에서만 엑셀 다운로드가 가능합니다.');
      return;
    }
    
    const data = Object.entries(calendarItems).flatMap(([date, items]) =>
      items.map(item => ({
        일자: date,
        분류: item.type || '현장',
        현장명: item.text || '',
        설명: item.desc || '',
        체크박스유무: checkedItems[`${date}-${item.id}`] ? '체크' : '미체크'
      }))
    );
    
    exportToExcel(data, '일정관리', '일정관리');
  };

  const handleCheckItem = (date, id, checked) => {
    // 체크박스 상태만 변경 (엑셀 다운로드용)
    setCheckedItems(prev => ({
      ...prev,
      [`${date}-${id}`]: checked
    }));
  };

  const handleDateClick = (dateStr) => {
    setSelectedDate(dateStr);
    if (onDateClick) {
      onDateClick(dateStr);
    }
  };

  const handleViewModeChange = (event, newViewMode) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  const handleShowListPopup = (dateStr) => { 
    setShowListPopup(true); 
    setListPopupDate(dateStr); 
  };
  const handleCloseListPopup = () => { setShowListPopup(false); setListPopupDate(''); };

  return (
    <Box sx={{ 
      p: 0, 
      height: isMobile ? 'calc(100vh + 80px)' : 'calc(100vh - 80px)',
      width: '100%',
      mx: 0,
      px: 0,
      margin: 0,
      padding: 0,
      position: 'relative',
      mt: isMobile ? '-10px' : '30px',
      mb: '20px'
    }}>
      <DragDropContext onDragEnd={onDragEnd}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column-reverse', md: 'row' }, 
          gap: isMobile ? 0 : 2, 
          height: '100%',
          width: '100%',
          mx: 0,
          px: 0
        }}>
          {/* 왼쪽 편 레이아웃 - 진행중현장리스트 */}
          <Box sx={{
            width: { xs: '100%', md: 280 },
            border: '1px solid', borderColor: 'divider', borderRadius: 2, display: 'flex',
            flexDirection: 'column', 
            height: 'calc(100% - 30px)',
            maxHeight: { xs: '270px', md: 'calc(100% - 30px)' },
            position: { xs: 'static', md: 'static' },
            transform: { xs: 'none', md: 'none' },
            mt: { xs: 0, md: '15px' } // PC에서만 위쪽 여백 15px 추가
          }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', position: { xs: 'static', md: 'static' }, transform: { xs: 'none', md: 'none' }, display: { xs: 'none', md: 'block' } }}>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, display: { xs: 'none', md: 'block' } }}>이달의 현장</Typography>
              <TextField
                size="small"
                placeholder="현장명 검색"
                value={siteSearchTerm}
                sx={{ 
                  width: '100%',
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem'
                  }
                }}
                onChange={(e) => {
                  setSiteSearchTerm(e.target.value);
                }}
              />
            </Box>
            <Droppable droppableId="siteList">
              {(provided, snapshot) => (
                <Box ref={provided.innerRef} {...provided.droppableProps} sx={{
                  flex: 1, overflowY: filteredSites.length > 10 ? 'auto' : 'hidden', p: isMobile ? 0.5 : 1,
                  bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'background.paper',
                  maxHeight: isMobile ? '200px' : 'none',
                  position: { xs: 'static', md: 'static' },
                  transform: { xs: 'none', md: 'none' },
                  scrollbarWidth: 'none', // Firefox에서 스크롤바 숨기기
                  msOverflowStyle: 'none', // IE/Edge에서 스크롤바 숨기기
                  '&::-webkit-scrollbar': {
                    display: 'none', // Webkit 브라우저에서 스크롤바 숨기기
                  },
                }}>
                  {filteredSites.length > 0 ? (
                    filteredSites.map((site, index) => (
                      !isMobile && (
                        <Draggable key={site.id} draggableId={site.id} index={index}>
                          {(provided) => (
                            <Paper 
                              ref={provided.innerRef} 
                              {...provided.draggableProps} 
                              {...provided.dragHandleProps}
                              onClick={() => {
                                // 현장 클릭 시 선택 상태 토글
                                setSelectedItems(prev => {
                                  const exists = prev.find(sel => sel.id === site.id && sel.type === 'site');
                                  if (exists) {
                                    return prev.filter(sel => !(sel.id === site.id && sel.type === 'site'));
                                  }
                                  return [...prev, { id: site.id, type: 'site', name: site.name }];
                                });
                              }}
                              sx={{ 
                                mb: 1, 
                                p: 1.5, 
                                bgcolor: selectedItems.some(sel => sel.id === site.id && sel.type === 'site') 
                                  ? '#3b82f6' 
                                  : 'background.default',
                                color: selectedItems.some(sel => sel.id === site.id && sel.type === 'site') 
                                  ? '#fff' 
                                  : 'text.primary',
                                borderRadius: 2,
                                cursor: 'grab',
                                border: '1px solid',
                                borderColor: selectedItems.some(sel => sel.id === site.id && sel.type === 'site') 
                                  ? '#3b82f6' 
                                  : 'divider',
                                transition: 'all 0.2s',
                                '&:hover': {
                                  bgcolor: selectedItems.some(sel => sel.id === site.id && sel.type === 'site') 
                                    ? '#2563eb' 
                                    : 'action.hover'
                                }
                              }}
                            >
                              <Typography sx={{ 
                                fontWeight: selectedItems.some(sel => sel.id === site.id && sel.type === 'site') ? 600 : 400
                              }}>
                                {site.name.slice(0, 10)}
                                {site.status ? ` (${site.status})` : ''}
                              </Typography>
                            </Paper>
                          )}
                        </Draggable>
                      )
                    ))
                  ) : (
                    <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                      이번 달 현장이 없습니다.
                    </Typography>
                  )}
                  {provided.placeholder}
                </Box>
              )}
            </Droppable>
          </Box>
          
          {/* 우측 달력 영역 */}
          <Box sx={{ 
            flex: 1, 
            height: '100%',
            width: '100%',
            px: isMobile ? 0 : undefined
          }}>
            <CustomCalendar
              year={year}
              month={month}
              onYearChange={setYear}
              onMonthChange={setMonth}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              calendarItems={calendarItems}
              onItemClick={handleItemClick}
              onItemDoubleClick={handleItemDoubleClick}
              onItemTouchStart={handleItemTouchStart}
              onItemTouchEnd={handleItemTouchEnd}
              onDateClick={handleDateClick}
              onOpenPopup={handleOpenPopup}
              onDateNumberClick={handleOpenPopup}
              onCountClick={handleShowListPopup}
              onDeleteItem={handleDeleteItem}
              onCheckItem={handleCheckItem}
              checkedItems={checkedItems}
              selectedItems={selectedItems}
              onDeleteSelected={handleDeleteSelected}
              sites={filteredSites}
              isMobile={isMobile}
              selectedDate={selectedDate}
              showListPopup={showListPopup}
              listPopupDate={listPopupDate}
              onShowListPopup={handleShowListPopup}
              onCloseListPopup={handleCloseListPopup}
              onExcel={handleExcel}
              onAddSchedule={onAddSchedule}
            />
          </Box>
        </Box>
      </DragDropContext>
      
      {/* 일정 추가 팝업 */}
      {popupOpen && (
        <Box
          onClick={e => { e.stopPropagation(); handleClosePopup(); }}
          sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', bgcolor: 'rgba(0,0,0,0.4)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Box onClick={e => e.stopPropagation()} sx={{ minWidth: 340, bgcolor: 'background.paper', borderRadius: 3, p: 3, boxShadow: 5, position: 'relative', zIndex: 3100 }}>
            <IconButton onClick={e => { e.stopPropagation(); handleClosePopup(); }} sx={{ position: 'absolute', top: 8, right: 8, color: 'text.primary' }}>X</IconButton>
            <Typography variant="h6" sx={{ color: 'text.primary', mb: 2 }}>{popupDate} 일정</Typography>
            <TextField label="제목" value={popupTitle} onChange={e => setPopupTitle(e.target.value)} fullWidth sx={{ mb: 2 }} autoFocus />
            {/* 현장명 검색 선택 */}
            <Autocomplete
              options={sites.map(site => site.name).filter(Boolean)}
              value={popupSiteName || ''}
              onInputChange={(_, v) => setPopupSiteName(v)}
              renderInput={(params) => <TextField {...params} label="현장명 검색" />}
              freeSolo
              sx={{ mb: 2 }}
            />
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>분류 선택</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                <FormControlLabel
                  control={<Checkbox checked={selectedTypes.includes('현장')} onChange={() => handleTypeChange('현장')} />}
                  label="현장"
                />
                <FormControlLabel
                  control={<Checkbox checked={selectedTypes.includes('회의')} onChange={() => handleTypeChange('회의')} />}
                  label="회의"
                />
                <FormControlLabel
                  control={<Checkbox checked={selectedTypes.includes('입찰')} onChange={() => handleTypeChange('입찰')} />}
                  label="입찰"
                />
                <FormControlLabel
                  control={<Checkbox checked={selectedTypes.includes('현설')} onChange={() => handleTypeChange('현설')} />}
                  label="현설"
                />
                <FormControlLabel
                  control={<Checkbox checked={selectedTypes.includes('지원')} onChange={() => handleTypeChange('지원')} />}
                  label="지원"
                />
                <FormControlLabel
                  control={<Checkbox checked={selectedTypes.includes('기타')} onChange={() => handleTypeChange('기타')} />}
                  label="기타"
                />
              </Box>
            </Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>색상 선택</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              {colorChoices.map(color => (
                <Box
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  sx={{
                    width: 24, height: 24, borderRadius: '50%',
                    bgcolor: color, cursor: 'pointer',
                    border: selectedColor === color ? '3px solid #fff' : '2px solid #888',
                    boxShadow: selectedColor === color ? '0 0 0 2px #1976d2' : 'none',
                    transition: 'all 0.15s'
                  }}
                />
              ))}
            </Box>
            <TextField 
              label="설명" 
              value={popupDesc} 
              onChange={e => setPopupDesc(e.target.value)} 
              fullWidth 
              multiline 
              rows={3} 
              sx={{ mb: 2 }} 
            />
            <Button variant="contained" color="primary" onClick={handleAddSchedule} fullWidth disabled={(!popupTitle.trim() && !popupSiteName.trim()) || selectedTypes.length === 0}>추가</Button>
          </Box>
        </Box>
      )}
      
      {/* 일정 수정 팝업 */}
      {editPopup.open && (
        <Box
          onClick={e => { e.stopPropagation(); setEditPopup({ ...editPopup, open: false }); }}
          sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', bgcolor: 'rgba(0,0,0,0.4)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Box onClick={e => e.stopPropagation()} sx={{ minWidth: 340, bgcolor: 'background.paper', borderRadius: 3, p: 3, boxShadow: 5, position: 'relative', zIndex: 3100 }}>
            <IconButton onClick={e => { e.stopPropagation(); setEditPopup({ ...editPopup, open: false }); }} sx={{ position: 'absolute', top: 8, right: 8, color: 'text.primary' }}>X</IconButton>
            <Typography variant="h6" sx={{ color: 'text.primary', mb: 2 }}>일정 수정</Typography>
            <TextField label="제목" value={editPopup.item?.text} onChange={(e) => setEditPopup({ ...editPopup, item: { ...editPopup.item, text: e.target.value } })} fullWidth sx={{ mb: 2 }} autoFocus />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>분류 선택</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                <FormControlLabel
                  control={<Checkbox checked={editPopup.item?.type === '현장'} onChange={() => handleEditTypeChange('현장')} />}
                  label="현장"
                />
                <FormControlLabel
                  control={<Checkbox checked={editPopup.item?.type === '회의'} onChange={() => handleEditTypeChange('회의')} />}
                  label="회의"
                />
                <FormControlLabel
                  control={<Checkbox checked={editPopup.item?.type === '입찰'} onChange={() => handleEditTypeChange('입찰')} />}
                  label="입찰"
                />
                <FormControlLabel
                  control={<Checkbox checked={editPopup.item?.type === '현설'} onChange={() => handleEditTypeChange('현설')} />}
                  label="현설"
                />
                <FormControlLabel
                  control={<Checkbox checked={editPopup.item?.type === '지원'} onChange={() => handleEditTypeChange('지원')} />}
                  label="지원"
                />
                <FormControlLabel
                  control={<Checkbox checked={editPopup.item?.type === '기타'} onChange={() => handleEditTypeChange('기타')} />}
                  label="기타"
                />
              </Box>
            </Box>
            <TextField 
              label="설명" 
              value={editPopup.item?.desc || ''} 
              onChange={(e) => setEditPopup({ ...editPopup, item: { ...editPopup.item, desc: e.target.value } })} 
              fullWidth 
              multiline 
              rows={3} 
              sx={{ mb: 2 }} 
            />
            <Button variant="contained" color="primary" onClick={handleEditSave} fullWidth disabled={(!editPopup.item?.text?.trim() && !editPopup.item?.siteName?.trim())}>수정</Button>
          </Box>
        </Box>
      )}
      
      {/* 일정 목록 팝업 */}
      {showListPopup && (
        <Box
          onClick={e => { e.stopPropagation(); handleCloseListPopup(); }}
          sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', bgcolor: 'rgba(0,0,0,0.4)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Box onClick={e => e.stopPropagation()} sx={{ minWidth: 340, bgcolor: 'background.paper', borderRadius: 3, p: 3, boxShadow: 5, position: 'relative', zIndex: 3100 }}>
            <IconButton onClick={e => { e.stopPropagation(); handleCloseListPopup(); }} sx={{ position: 'absolute', top: 8, right: 8, color: 'text.primary' }}>X</IconButton>
            <Typography variant="h6" sx={{ color: 'text.primary', mb: 2 }}>{listPopupDate} 일정 목록</Typography>
            {(calendarItems[listPopupDate] && calendarItems[listPopupDate].length > 0) ? (
              calendarItems[listPopupDate].map(item => (
                <Paper key={item.id} sx={{ mb: 1, p: 1, bgcolor: 'background.default' }}>
                  <Typography sx={{ fontWeight: 600 }}>{item.text}</Typography>
                  <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                </Paper>
              ))
            ) : (
              <Typography color="text.secondary">일정이 없습니다.</Typography>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ScheduleManagement; 
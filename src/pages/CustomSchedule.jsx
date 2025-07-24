import React, { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Button, TextField, IconButton, Paper, MenuItem, Checkbox, FormControlLabel } from '@mui/material';
import CustomCalendar from '../components/CustomCalendar';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { collection, doc, query, onSnapshot, addDoc, updateDoc, deleteDoc, writeBatch, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import { exportCalendarToExcel } from '../utils/excelUtils';


function isInMonth(site, year, month) {
  if (!site.startDate || !site.endDate) return false;
  const s = new Date(site.startDate);
  const e = new Date(site.endDate);
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  return !(e < first || s > last);
}

const CustomSchedule = () => {
  const isMobile = false; // 모바일 반응형 사용하지 않음
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [viewMode, setViewMode] = useState('month');
  const [calendarItems, setCalendarItems] = useState({});
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupDate, setPopupDate] = useState('');
  const [popupTitle, setPopupTitle] = useState('');
  const [popupDesc, setPopupDesc] = useState('');
  const [popupType, setPopupType] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [editPopup, setEditPopup] = useState({ open: false, item: null, date: null });
  const [sites, setSites] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});
  const colorChoices = ['#3b82f6', '#22c55e', '#f59e42', '#ef4444', '#a855f7', '#eab308'];
  const [selectedColor, setSelectedColor] = useState(colorChoices[0]);
  const [showListPopup, setShowListPopup] = useState(false);
  const [listPopupDate, setListPopupDate] = useState('');
  const [copiedItem, setCopiedItem] = useState(null); // 복사된 항목 상태
  const [selectedDate, setSelectedDate] = useState(() => {
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return todayStr;
  });

  const authUser = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'sites'));
    let unsubscribe = null;
    
    try {
      unsubscribe = onSnapshot(q, (snapshot) => {
        try {
          const sitesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setSites(sitesData);
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
  }, []);

  const filteredSites = useMemo(() => sites.filter(site => isInMonth(site, year, month)), [sites, year, month]);

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    const user = authUser.currentUser;
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (source.droppableId === 'siteList' && destination.droppableId.startsWith('20')) {
      const site = filteredSites[source.index];
      if (!site) return;
      const newItem = {
        text: site.name,
        type: '현장',
        desc: `${site.name} - ${site.status || ''}`,
        siteId: site.id,
        date: new Date(destination.droppableId + 'T12:00:00'),
        userId: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      try {
        await addDoc(collection(db, 'schedules'), newItem);
      } catch (error) {
        alert('일정 추가에 실패했습니다.');
      }
    } else if (source.droppableId !== destination.droppableId) {
      // Optimistic-UI: 즉시 상태 변경
      const sourceItems = Array.from(calendarItems[source.droppableId] || []);
      const [movedItem] = sourceItems.splice(source.index, 1);
      
      const newMovedItem = { ...movedItem, date: destination.droppableId };
      
      const destItems = Array.from(calendarItems[destination.droppableId] || []);
      destItems.splice(destination.index, 0, newMovedItem);
      
      const newCalendarItems = { ...calendarItems };
      newCalendarItems[source.droppableId] = sourceItems;
      newCalendarItems[destination.droppableId] = destItems;
      setCalendarItems(newCalendarItems);

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
      const items = Array.from(calendarItems[source.droppableId] || []);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      
      const newCalendarItems = { ...calendarItems };
      newCalendarItems[source.droppableId] = items;
      setCalendarItems(newCalendarItems);

      // Firestore에서는 순서를 관리하지 않으므로 DB 업데이트는 불필요
    }
  };

  const handleOpenPopup = (dateStr) => {
    console.log('handleOpenPopup 호출됨:', dateStr);
    if (!dateStr) return;
    console.log('팝업 열기:', dateStr);
    setPopupOpen(true);
    setPopupDate(dateStr);
    setPopupTitle('');
    setPopupType('');
    setPopupDesc('');
  };

  const handleClosePopup = () => setPopupOpen(false);

  const handleAddSchedule = async () => {
    if (!popupTitle.trim() || selectedTypes.length === 0) return;
    const user = authUser.currentUser;
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    try {
      await addDoc(collection(db, 'schedules'), {
        text: popupTitle,
        type: selectedTypes.join(', '),
        desc: popupDesc,
        date: new Date(popupDate + 'T12:00:00'),
        userId: user.uid,
        color: selectedColor,
        createdAt: new Date()
      });
      setPopupOpen(false);
      setPopupTitle('');
      setPopupDesc('');
      setSelectedTypes([]);
    } catch (error) {
      console.error('일정 추가 실패:', error);
    }
  };

  const handleItemClick = (date, id) => {
    console.log('handleItemClick 호출됨:', date, id);
    setSelectedItems(prev => {
      const exists = prev.find(sel => sel.date === date && sel.id === id);
      if (exists) return prev.filter(sel => !(sel.date === date && sel.id === id));
      return [...prev, { date, id }];
    });
  };

  let touchTimer = null;
  const handleItemDoubleClick = (date, item) => {
    setEditPopup({ open: true, item, date });
    if (item.type) {
      const types = item.type.split(', ').map(t => t.trim());
      setSelectedTypes(types);
    } else {
      setSelectedTypes([]);
    }
  };
  const handleItemTouchStart = (date, item) => {
    touchTimer = setTimeout(() => {
      setEditPopup({ open: true, item, date });
      if (item.type) {
        const types = item.type.split(', ').map(t => t.trim());
        setSelectedTypes(types);
      } else {
        setSelectedTypes([]);
      }
    }, 600);
  };
  const handleItemTouchEnd = () => clearTimeout(touchTimer);

  // 인증 상태와 로딩 상태를 모두 고려한 데이터 로딩
  useEffect(() => {
    const user = authUser.currentUser;
    const loading = authUser.loading;
    
    // 로딩 중이거나 사용자가 없으면 데이터 초기화
    if (loading || !user) {
      setCalendarItems({});
      setCheckedItems({});
      return;
    }
    
    console.log('일정 데이터 로딩 시작 - 사용자:', user.uid);
    
    const q = query(collection(db, 'schedules'));
    let unsubscribe = null;
    let checksUnsubscribe = null;
    
    try {
      unsubscribe = onSnapshot(q, async (snapshot) => {
        try {
          // 모든 일정 데이터 수집
          const allSchedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // 날짜별로 일정 그룹화
          const newCalendarItems = {};
          allSchedules.forEach(item => {
            const date = item.date;
            if (!date) return;

            if (!newCalendarItems[date]) {
              newCalendarItems[date] = [];
            }
            newCalendarItems[date].push(item);
          });

          setCalendarItems(newCalendarItems);
          console.log('일정 데이터 로드 완료:', Object.keys(newCalendarItems).length, '개 날짜, 총', allSchedules.length, '개 일정');
        } catch (error) {
          console.error('일정 데이터 처리 오류:', error);
          setCalendarItems({});
        }
      }, (error) => {
        console.error('일정 구독 오류:', error);
        setCalendarItems({});
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
          console.log('체크 상태 실시간 업데이트:', Object.keys(newCheckedItems).length, '개 항목');
        } catch (error) {
          console.error('체크 상태 처리 오류:', error);
        }
      }, (error) => {
        console.error('체크 상태 구독 오류:', error);
      });
    } catch (error) {
      console.error('구독 설정 오류:', error);
      setCalendarItems({});
      setCheckedItems({});
    }
    
    return () => {
      try {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
        if (checksUnsubscribe && typeof checksUnsubscribe === 'function') {
          checksUnsubscribe();
        }
      } catch (error) {
        console.error('구독 해제 오류:', error);
      }
    };
  }, [authUser.currentUser, authUser.loading]); // 인증 상태와 로딩 상태 모두 추적

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm('선택된 항목을 삭제하시겠습니까?')) return;

    const itemsToDelete = [...selectedItems];
    
    // 1. Optimistic UI update
    const newCalendarItems = { ...calendarItems };
    itemsToDelete.forEach(({ date, id, type }) => {
      if (type === 'site') {
        // 현장 삭제는 별도 처리 (현재는 선택 해제만)
        console.log('현장 삭제:', id);
      } else if (newCalendarItems[date]) {
        newCalendarItems[date] = newCalendarItems[date].filter(item => item.id !== id);
        if (newCalendarItems[date].length === 0) {
          delete newCalendarItems[date];
        }
      }
    });
    setCalendarItems(newCalendarItems);
    setSelectedItems([]);

    // 2. Background DB operation
    const batch = writeBatch(db);
    itemsToDelete.forEach(selected => {
      if (selected.id && selected.type !== 'site') {
        batch.delete(doc(db, 'schedules', selected.id));
      }
    });
    try {
      await batch.commit();
    } catch (error) {
      alert('데이터베이스 삭제에 실패했습니다. 새로고침하면 항목이 다시 나타날 수 있습니다.');
    }
  };

  const handleDeleteItem = async (date, itemId) => {
    if (!window.confirm('이 항목을 삭제하시겠습니까?')) return;

    // 1. Optimistic UI update
    setCalendarItems(prev => {
        const newCalendarItems = { ...prev };
        if (newCalendarItems[date]) {
          newCalendarItems[date] = newCalendarItems[date].filter(item => item.id !== itemId);
          if (newCalendarItems[date].length === 0) {
            delete newCalendarItems[date];
          }
        }
        return newCalendarItems;
    });

    // 2. Background DB operation
    try {
      await deleteDoc(doc(db, 'schedules', itemId));
    } catch (error) {
      alert('데이터베이스 삭제에 실패했습니다. 새로고침하면 항목이 다시 나타날 수 있습니다.');
    }
  };

  const handleEditSave = async () => {
    if (!editPopup.item?.text?.trim() || selectedTypes.length === 0) return;
    const user = authUser.currentUser;
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    try {
      await updateDoc(doc(db, 'schedules', editPopup.item.id), {
        text: editPopup.item.text,
        type: selectedTypes.join(', '),
        desc: editPopup.item.desc,
        color: selectedColor,
        updatedAt: new Date()
      });
      setEditPopup({ open: false, item: null, date: null });
      setSelectedTypes([]);
    } catch (error) {
      console.error('일정 수정 실패:', error);
    }
  };

  const handleTypeChange = (type) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleEditTypeChange = (type) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleExcel = () => {
    try {
      // 체크박스 상태를 포함한 데이터 생성
      const dataWithCheckStatus = Object.entries(calendarItems).flatMap(([date, items]) =>
        items.map(item => ({
          날짜: date,
          제목: item.text,
          유형: item.type,
          설명: item.desc || '',
          현장: item.siteId || '',
          체크여부: checkedItems[`${date}-${item.id}`] ? '체크' : '미체크'
        }))
      );
      
      // 새로운 전문적인 엑셀 내보내기 사용
      const result = exportToExcel(dataWithCheckStatus, '일정관리', '일정관리');
      
      if (result.success) {
        alert('전문적인 엑셀 파일이 다운로드되었습니다!');
        console.log('엑셀 파일명:', result.fileName);
      } else {
        alert('엑셀 내보내기에 실패했습니다: ' + result.error);
      }
    } catch (error) {
      console.error('엑셀 내보내기 오류:', error);
      alert('엑셀 내보내기 중 오류가 발생했습니다.');
    }
  };

  const handleCheckItem = async (date, id, checked) => {
    const user = authUser.currentUser;
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    const checkKey = `${date}-${id}`;
    console.log('체크박스 변경 시작:', { date, id, checked, checkKey });
    
    try {
      // 즉시 로컬 상태 업데이트 (Optimistic Update)
      setCheckedItems(prev => {
        const newState = {
          ...prev,
          [checkKey]: checked
        };
        console.log('로컬 상태 업데이트:', newState);
        return newState;
      });

      // Firestore에 체크 상태 저장
      const checkData = {
        scheduleId: id,
        date: date,
        checked: checked,
        userId: user.uid,
        updatedAt: new Date()
      };

      console.log('Firestore 저장 데이터:', checkData);

      // 기존 체크 데이터가 있는지 확인
      const existingCheckQuery = query(
        collection(db, 'scheduleChecks'),
        where('scheduleId', '==', id),
        where('date', '==', date),
        where('userId', '==', user.uid)
      );
      
      const existingCheckSnapshot = await getDocs(existingCheckQuery);
      console.log('기존 체크 데이터 조회 결과:', existingCheckSnapshot.docs.length);
      
      if (existingCheckSnapshot.docs.length > 0) {
        // 기존 데이터 업데이트
        const existingDoc = existingCheckSnapshot.docs[0];
        await updateDoc(doc(db, 'scheduleChecks', existingDoc.id), {
          checked: checked,
          updatedAt: new Date()
        });
        console.log('체크 상태 업데이트 완료:', checkKey, checked);
      } else {
        // 새 데이터 추가
        const newDocRef = await addDoc(collection(db, 'scheduleChecks'), checkData);
        console.log('체크 상태 추가 완료:', checkKey, checked, '문서 ID:', newDocRef.id);
      }
    } catch (error) {
      console.error('체크 상태 저장 실패:', error);
      console.error('에러 상세:', {
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
        console.log('실패로 인한 상태 롤백:', newState);
        return newState;
      });
      
      // 사용자에게 알림 (개발 중에는 상세 정보 포함)
      if (process.env.NODE_ENV === 'development') {
        alert(`체크 상태 저장에 실패했습니다.\n에러: ${error.message}\n코드: ${error.code}`);
      } else {
        alert('체크 상태 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    }
  };

  const handleDateClick = (dateStr) => {
    // 원래 일정 추가 팝업
    handleOpenPopup(dateStr);
  };

  const handleViewModeChange = (event, newViewMode) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  const handleShowListPopup = (dateStr) => { 
    console.log('handleShowListPopup 호출됨:', dateStr);
    setShowListPopup(true); 
    setListPopupDate(dateStr); 
  };
  const handleCloseListPopup = () => { setShowListPopup(false); setListPopupDate(''); };

  // 키보드 이벤트 핸들러 (복사/붙여넣기)
  const handleKeyDown = (e) => {
    console.log('키보드 이벤트:', e.key, 'Ctrl:', e.ctrlKey);
    
    // Ctrl+C: 복사
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      console.log('Ctrl+C 감지됨');
      if (selectedItems.length > 0) {
        // 선택된 항목 중 첫 번째 항목을 복사
        const selectedItem = selectedItems[0];
        const item = calendarItems[selectedItem.date]?.find(item => item.id === selectedItem.id);
        if (item) {
          setCopiedItem(item);
          console.log('항목 복사됨:', item);
          alert('항목이 복사되었습니다!');
        } else {
          console.log('복사할 항목을 찾을 수 없음');
        }
      } else {
        console.log('선택된 항목이 없음');
      }
    }
    
    // Ctrl+V: 붙여넣기
    if (e.ctrlKey && e.key === 'v') {
      e.preventDefault();
      console.log('Ctrl+V 감지됨');
      if (copiedItem && selectedDate) {
        console.log('붙여넣기 시도:', selectedDate);
        handlePasteItem(selectedDate);
      } else {
        console.log('복사된 항목이 없거나 선택된 날짜가 없음');
        if (!copiedItem) alert('복사된 항목이 없습니다. Ctrl+C로 항목을 복사하세요.');
        if (!selectedDate) alert('붙여넣을 날짜를 선택하세요.');
      }
    }
  };

  // 붙여넣기 핸들러
  const handlePasteItem = async (targetDate) => {
    if (!copiedItem) return;
    
    const user = authUser.currentUser;
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const newItem = {
        text: copiedItem.text || '',
        type: copiedItem.type || '기타',
        desc: copiedItem.desc || '',
        siteId: copiedItem.siteId || '',
        date: new Date(targetDate + 'T12:00:00'),
        userId: user.uid,
        color: copiedItem.color || colorChoices[0],
        siteName: copiedItem.siteName || '',
        selectedTypes: copiedItem.selectedTypes || [copiedItem.type || '기타'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // undefined 값 제거
      Object.keys(newItem).forEach(key => {
        if (newItem[key] === undefined) {
          delete newItem[key];
        }
      });
      
      console.log('붙여넣을 항목:', newItem);
      
      await addDoc(collection(db, 'schedules'), newItem);
      console.log('항목 붙여넣기 완료:', targetDate);
    } catch (error) {
      console.error('항목 붙여넣기 실패:', error);
      alert('항목 붙여넣기에 실패했습니다.');
    }
  };

  return (
    <Box 
      onKeyDown={handleKeyDown}
      tabIndex={0}
      sx={{ 
        p: 0, 
        height: isMobile ? 'calc(90vh - 90px)' : 'calc(90vh - 320px)', // PC에서 200px 더 줄임 (220px + 100px)
        width: isMobile ? '100vw' : '100%',
        mx: 0,
        px: 0,
        margin: 0,
        padding: 0,
        position: isMobile ? 'relative' : 'fixed', // PC에서 fixed로 변경
        top: isMobile ? '-100px' : '60px', // PC에서 60px 아래로 이동
        left: isMobile ? '-30px' : 0, // PC에서 0으로 설정
        right: isMobile ? 0 : 0, // PC에서 0으로 설정
        bottom: isMobile ? 'auto' : '100px', // PC에서 하단 100px 여백
        outline: 'none' // 포커스 테두리 제거
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
          <Box sx={{
            width: { xs: '100%', md: 280 },
            border: '1px solid', borderColor: 'divider', borderRadius: 2,
            flexDirection: 'column', 
            height: 'calc(100vh - 120px)',
            maxHeight: { xs: '270px', md: 'calc(100vh - 120px)' },
            position: { xs: 'relative', md: 'static' },
            display: 'flex',
          }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', position: { xs: 'relative', md: 'static' }, transform: { xs: 'translateX(25px)', md: 'none' }, display: { xs: 'none', md: 'block' } }}>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, display: { xs: 'none', md: 'block' } }}>공사현황</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>이달의 현장</Typography>
            </Box>
            <Droppable droppableId="siteList">
              {(provided, snapshot) => (
                <Box ref={provided.innerRef} {...provided.droppableProps} sx={{
                  flex: 1, 
                  overflowY: 'auto', // 스크롤은 되지만 스크롤바는 숨김
                  p: 1,
                  bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'background.paper',
                  maxHeight: 'none',
                  position: 'static',
                  transform: 'none',
                  display: 'block',
                  scrollbarWidth: 'none', // Firefox에서 스크롤바 숨기기
                  msOverflowStyle: 'none', // IE/Edge에서 스크롤바 숨기기
                  '&::-webkit-scrollbar': {
                    display: 'none', // Webkit 브라우저에서 스크롤바 숨기기
                  },
                  '&::-webkit-scrollbar-track': {
                    display: 'none',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    display: 'none',
                  },
                }}>
                  {filteredSites.length > 0 ? (
                    filteredSites.map((site, index) => (
                      <Draggable key={site.id} draggableId={site.id} index={index}>
                        {(provided, snapshot) => (
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
                              transform: snapshot.isDragging ? 'rotate(5deg)' : 'none',
                              boxShadow: snapshot.isDragging ? '0 8px 24px rgba(0,0,0,0.4)' : 'none',
                              '&:hover': {
                                bgcolor: selectedItems.some(sel => sel.id === site.id && sel.type === 'site') 
                                  ? '#2563eb' 
                                  : 'action.hover'
                              }
                            }}
                          >
                            <Typography sx={{ 
                              fontSize: 'inherit',
                              lineHeight: 'inherit',
                              fontWeight: selectedItems.some(sel => sel.id === site.id && sel.type === 'site') ? 600 : 400
                            }}>
                              {site.name}
                              {site.status ? ` (${site.status})` : ''}
                            </Typography>
                          </Paper>
                        )}
                      </Draggable>
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
          <Box sx={{ 
            flex: 1, 
            height: '100%',
            width: '100%',
            px: undefined,
            position: 'relative'
          }}>
            {/* 복사 상태 표시 */}
            {copiedItem && (
              <Box sx={{
                position: 'absolute',
                top: 10,
                right: 10,
                bgcolor: '#22c55e',
                color: '#fff',
                px: 2,
                py: 1,
                borderRadius: 2,
                fontSize: '0.875rem',
                fontWeight: 500,
                zIndex: 1000,
                boxShadow: 2
              }}>
                복사됨: {copiedItem.text}
              </Box>
            )}
            <CustomCalendar
              year={year} month={month} calendarItems={calendarItems}
              onPrevMonth={() => {
                console.log('CustomSchedule onPrevMonth 호출됨, 현재 month:', month);
                if (month === 0) {
                  console.log('연도 변경: 1월 -> 12월');
                  setYear(y => y - 1);
                  setMonth(11);
                } else {
                  console.log('월 변경:', month, '->', month - 1);
                  setMonth(m => m - 1);
                }
              }}
              onNextMonth={() => {
                console.log('CustomSchedule onNextMonth 호출됨, 현재 month:', month);
                if (month === 11) {
                  console.log('연도 변경: 12월 -> 1월');
                  setYear(y => y + 1);
                  setMonth(0);
                } else {
                  console.log('월 변경:', month, '->', month + 1);
                  setMonth(m => m + 1);
                }
              }}
              onDateClick={handleDateClick} selectedItems={selectedItems}
              onItemClick={handleItemClick} onItemDoubleClick={handleItemDoubleClick}
              onItemTouchStart={handleItemTouchStart} onItemTouchEnd={handleItemTouchEnd}
              onDeleteSelected={handleDeleteSelected}
              onSave={() => console.log('저장 기능')}
              onExcel={handleExcel}
              checkedItems={checkedItems}
              onCheckItem={handleCheckItem}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              onDateNumberClick={handleOpenPopup}
              onCountClick={handleShowListPopup}
              onCellClick={(dateStr) => {
                if (dateStr) {
                  setSelectedDate(dateStr);
                }
                handleShowListPopup(dateStr);
              }}
              sites={sites}
              onOpenPopup={handleOpenPopup}
              selectedDate={selectedDate}
            />
          </Box>
        </Box>
      </DragDropContext>
      {popupOpen && (
        <Box
          onClick={e => { e.stopPropagation(); handleClosePopup(); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleClosePopup();
            }
          }}
          tabIndex={0}
          sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', bgcolor: 'rgba(0,0,0,0.4)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Box onClick={e => e.stopPropagation()} sx={{ minWidth: 340, bgcolor: 'background.paper', borderRadius: 3, p: 3, boxShadow: 5, position: 'relative', zIndex: 3100 }}>
            <IconButton onClick={e => { e.stopPropagation(); handleClosePopup(); }} sx={{ position: 'absolute', top: 8, right: 8, color: 'text.primary' }}>X</IconButton>
            <Typography variant="h6" sx={{ color: 'text.primary', mb: 2 }}>{popupDate} 일정</Typography>
            <TextField label="제목" value={popupTitle} onChange={e => setPopupTitle(e.target.value)} fullWidth sx={{ mb: 2 }} autoFocus />
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
            <TextField label="설명" value={popupDesc} onChange={e => setPopupDesc(e.target.value)} fullWidth multiline rows={3} sx={{ mb: 2 }} />
            <Button variant="contained" color="primary" onClick={handleAddSchedule} fullWidth disabled={!popupTitle.trim() || selectedTypes.length === 0}>추가</Button>
          </Box>
        </Box>
      )}
      {editPopup.open && (
        <Box
          onClick={e => { e.stopPropagation(); setEditPopup({ ...editPopup, open: false }); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setEditPopup({ ...editPopup, open: false });
            }
          }}
          tabIndex={0}
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
                  control={<Checkbox checked={selectedTypes.includes('현장')} onChange={() => handleEditTypeChange('현장')} />}
                  label="현장"
                />
                <FormControlLabel
                  control={<Checkbox checked={selectedTypes.includes('회의')} onChange={() => handleEditTypeChange('회의')} />}
                  label="회의"
                />
                <FormControlLabel
                  control={<Checkbox checked={selectedTypes.includes('입찰')} onChange={() => handleEditTypeChange('입찰')} />}
                  label="입찰"
                />
                <FormControlLabel
                  control={<Checkbox checked={selectedTypes.includes('현설')} onChange={() => handleEditTypeChange('현설')} />}
                  label="현설"
                />
                <FormControlLabel
                  control={<Checkbox checked={selectedTypes.includes('지원')} onChange={() => handleEditTypeChange('지원')} />}
                  label="지원"
                />
                <FormControlLabel
                  control={<Checkbox checked={selectedTypes.includes('기타')} onChange={() => handleEditTypeChange('기타')} />}
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
            
            <TextField label="설명" value={editPopup.item?.desc} onChange={(e) => setEditPopup({ ...editPopup, item: { ...editPopup.item, desc: e.target.value } })} fullWidth multiline rows={3} sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" color="error" onClick={() => handleDeleteItem(editPopup.date, editPopup.item?.id)} sx={{ flex: 1 }}>삭제</Button>
              <Button variant="contained" color="primary" onClick={handleEditSave} sx={{ flex: 1 }} disabled={!editPopup.item?.text?.trim() || selectedTypes.length === 0}>저장</Button>
            </Box>
          </Box>
        </Box>
      )}
      {showListPopup && (
        <Box
          onClick={e => { e.stopPropagation(); handleCloseListPopup(); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleCloseListPopup();
            }
          }}
          tabIndex={0}
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

export default CustomSchedule; 
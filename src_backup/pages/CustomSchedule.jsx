import React, { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Button, TextField, IconButton } from '@mui/material';
import CustomCalendar from '../components/CustomCalendar';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useDispatch } from 'react-redux';
import { setTodayCount, setTodayItems } from '../store/dashboardSlice';

function isInMonth(site, year, month) {
  if (!site.startDate || !site.endDate) return false;
  const s = new Date(site.startDate);
  const e = new Date(site.endDate);
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  return !(e < first || s > last);
}

export default function CustomSchedule() {
  const dispatch = useDispatch();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [calendarItems, setCalendarItems] = useState({}); // 로컬 상태
  const [savedItems, setSavedItems] = useState({}); // Firebase에 저장된 상태
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupDate, setPopupDate] = useState(null);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupType, setPopupType] = useState('일정');
  const [popupDesc, setPopupDesc] = useState('');
  const [selectedItems, setSelectedItems] = useState([]); // [{date, id}]
  const [editPopup, setEditPopup] = useState({ open: false, item: null, date: null });
  const [isSaved, setIsSaved] = useState(false);
  const [sites, setSites] = useState([]);

  // 현장 데이터 Firestore에서 불러오기
  useEffect(() => {
    const fetchSites = async () => {
      const snapshot = await getDocs(collection(db, 'sites'));
      setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchSites();
  }, []);

  // 공사기간(착공일~준공예정일)이 현재 월에 포함된 현장만 필터링
  const filteredSites = useMemo(
    () => sites.filter(site => isInMonth(site, year, month)),
    [sites, year, month]
  );

  // 드래그앤드롭 핸들러
  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const isFromSiteList = draggableId.startsWith('siteList-');
    const isFromCell = draggableId.startsWith('cell-');
    
    if (isFromSiteList) {
      const siteId = draggableId.replace('siteList-', '');
      const site = filteredSites.find(s => s.id === siteId);
      if (!site) return;

      const targetDate = destination.droppableId;
      const existingItems = calendarItems[targetDate] || [];
      if (existingItems.some(item => item.id === siteId)) return;

      const newItem = {
        id: siteId,
        text: site.name,
        status: site.status,
        type: '현장',
        createdAt: new Date().toISOString()
      };

      setCalendarItems(prev => ({
        ...prev,
        [targetDate]: [...(prev[targetDate] || []), newItem]
      }));
      setIsSaved(false); // 변경사항 발생
    } else if (isFromCell) {
      const parts = draggableId.split('-');
      const sourceDate = `${parts[1]}-${parts[2]}-${parts[3]}`;
      const siteId = parts.slice(4).join('-');
      const targetDate = destination.droppableId;

      if (sourceDate === targetDate) return;

      const existingItems = calendarItems[targetDate] || [];
      if (existingItems.some(item => item.id === siteId)) return;

      setCalendarItems(prev => {
        const sourceItems = [...(prev[sourceDate] || [])];
        const targetItems = [...(prev[targetDate] || [])];
        const [movedItem] = sourceItems.splice(source.index, 1);
        
        if (!movedItem) return prev;
        
        targetItems.splice(destination.index, 0, movedItem);

        return {
          ...prev,
          [sourceDate]: sourceItems,
          [targetDate]: targetItems
        };
      });
      setIsSaved(false); // 변경사항 발생
    }
  };

  // 3. 팝업 오픈 핸들러
  const handleOpenPopup = (dateStr) => {
    if (!dateStr) return;
    setPopupOpen(true);
    setPopupDate(dateStr);
    setPopupTitle('');
    setPopupType('일정');
    setPopupDesc('');
  };
  const handleClosePopup = () => setPopupOpen(false);

  // 4. 팝업에서 추가 버튼 클릭 시 해당 날짜 셀에 항목 추가
  const handleAddSchedule = () => {
    if (!popupTitle.trim()) return;
    const items = calendarItems[popupDate] || [];
    setCalendarItems({
      ...calendarItems,
      [popupDate]: [...items, { id: 'schedule-' + Date.now(), text: popupTitle, type: popupType, desc: popupDesc }]
    });
    setPopupOpen(false);
  };

  // 5. 항목 클릭(터치) 시 선택/해제
  const handleItemClick = (date, id) => {
    setSelectedItems(prev => {
      const exists = prev.find(sel => sel.date === date && sel.id === id);
      if (exists) return prev.filter(sel => !(sel.date === date && sel.id === id));
      return [...prev, { date, id }];
    });
  };

  // 6. 더블클릭(길게터치) 시 팝업
  let touchTimer = null;
  const handleItemDoubleClick = (date, item) => {
    setEditPopup({ open: true, item, date });
  };
  const handleItemTouchStart = (date, item) => {
    touchTimer = setTimeout(() => setEditPopup({ open: true, item, date }), 600);
  };
  const handleItemTouchEnd = () => {
    clearTimeout(touchTimer);
  };

  // Firebase에서 일정 데이터 불러오기
  useEffect(() => {
    const q = query(collection(db, 'schedules'), where('year', '==', year), where('month', '==', month));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        const date = data.date;
        if (!items[date]) items[date] = [];
        items[date].push({ ...data, id: doc.id });
      });
      setCalendarItems(items);
      setSavedItems(items);

      // 오늘 날짜의 항목 수와 리스트 업데이트
      const todayItems = items[todayStr] || [];
      dispatch(setTodayCount(todayItems.length));
      dispatch(setTodayItems(todayItems));
    });

    return () => unsubscribe();
  }, [year, month, dispatch]);

  // 저장 버튼
  const handleSave = async () => {
    if (!window.confirm('변경사항을 저장하시겠습니까?')) return;
    
    try {
      const batch = writeBatch(db);
      
      // 새로운 항목들 추가
      Object.entries(calendarItems).forEach(([date, items]) => {
        items.forEach(item => {
          // 이미 저장된 항목인지 확인
          const isAlreadySaved = savedItems[date]?.some(savedItem => savedItem.id === item.id);
          if (!isAlreadySaved) {
            const docRef = doc(collection(db, 'schedules'));
            batch.set(docRef, {
              ...item,
              date,
              year,
              month,
              createdAt: item.createdAt || new Date().toISOString()
            });
          }
        });
      });

      // 삭제된 항목들 제거
      Object.entries(savedItems).forEach(([date, items]) => {
        items.forEach(item => {
          // 현재 캘린더에 없는 항목인지 확인
          const stillExists = calendarItems[date]?.some(calItem => calItem.id === item.id);
          if (!stillExists) {
            const docRef = doc(db, 'schedules', item.id);
            batch.delete(docRef);
          }
        });
      });

      await batch.commit();
      setIsSaved(true);
      alert('저장되었습니다.');
    } catch (error) {
      console.error('저장 중 오류:', error);
      alert(`저장 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  // 8. 삭제 버튼
  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) {
      alert('삭제할 항목을 선택해주세요.');
      return;
    }

    if (!window.confirm(`선택한 ${selectedItems.length}개의 항목을 삭제하시겠습니까?`)) return;

    try {
      // 실제로는 Firebase에서 삭제
      // await deleteFromFirebase(selectedItems);
      
      setCalendarItems(prev => {
        const newItems = { ...prev };
        selectedItems.forEach(({ date, id }) => {
          newItems[date] = (newItems[date] || []).filter(item => item.id !== id);
        });
        return newItems;
      });
      
      setSavedItems(prev => {
        const newItems = { ...prev };
        selectedItems.forEach(({ date, id }) => {
          newItems[date] = (newItems[date] || []).filter(item => item.id !== id);
        });
        return newItems;
      });

      setSelectedItems([]);
      setIsSaved(false);
      alert('삭제되었습니다.');
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.');
      console.error(error);
    }
  };

  // 9. 엑셀 내보내기
  const handleExcel = () => {
    const rows = [];
    const currentMonth = month + 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 해당 월의 모든 날짜에 대해 데이터 수집
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const items = savedItems[date] || [];
      
      items.forEach(item => {
        rows.push({
          날짜: date,
          제목: item.text,
          유형: item.type || '',
          상태: item.status || '',
          설명: item.desc || '',
          생성일: item.createdAt || ''
        });
      });
    }

    // CSV 형식으로 변환
    const headers = ['날짜', '제목', '유형', '상태', '설명', '생성일'];
    const csvContent = [
      headers.join(','),
      ...rows.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');

    // 임시로 콘솔에 출력 (실제로는 파일 다운로드)
    console.log('엑셀 내보내기 데이터:', csvContent);
    alert('엑셀 데이터가 준비되었습니다. (콘솔에서 확인 가능)');
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 2, md: 3 },
        p: { xs: 2, md: 3 },
        minHeight: '100vh',
        bgcolor: '#0f172a',
        color: '#fff'
      }}>
        {/* 좌측 현장 리스트 */}
        <Box sx={{
          width: { xs: '100%', md: '220px' },
          minWidth: { xs: 'auto', md: '170px' },
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 1, md: 2 },
          bgcolor: '#1e293b',
          borderRadius: { xs: 2, md: 4 },
          p: { xs: 1.5, md: 3 },
          height: { xs: 'auto', md: 'calc(100vh - 48px)' },
          position: { xs: 'relative', md: 'sticky' },
          top: { xs: 'auto', md: 24 },
        }}>
          <Typography variant="h5" sx={{ 
            color: '#fff', 
            fontWeight: 700, 
            mb: { xs: 1, md: 2 }, 
            textAlign: 'left',
            fontSize: { xs: '1.2rem', md: '1.5rem' }
          }}>
            공사현황
          </Typography>
          <Typography sx={{ 
            color: '#3b82f6', 
            fontWeight: 600, 
            borderBottom: '2px solid #3b82f6', 
            pb: 0.5, 
            mb: { xs: 2, md: 4 }, 
            fontSize: { xs: '0.9rem', md: '1.1rem' }, 
            textAlign: 'left' 
          }}>
            진행중 현장 LIST
          </Typography>
          <Droppable droppableId="siteList"
            renderClone={(provided, snapshot, rubric) => (
              <Box
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                sx={{
                  mb: { xs: 0.5, md: 1 },
                  p: { xs: 0.75, md: 1 },
                  bgcolor: '#3b82f6',
                  color: '#fff',
                  borderRadius: 1,
                  fontWeight: 500,
                  fontSize: { xs: '0.8rem', md: '0.9rem' },
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  cursor: 'grab',
                  border: '2px solid #3b82f6',
                  transition: 'all 0.2s',
                  width: '180px',
                  zIndex: 99999,
                  position: 'fixed',
                  pointerEvents: 'none',
                }}
              >
                {filteredSites[rubric.source.index]?.name?.slice(0,7)}({filteredSites[rubric.source.index]?.status})
              </Box>
            )}
          >
            {(provided) => (
              <Box
                ref={provided.innerRef}
                {...provided.droppableProps}
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: { xs: 0.5, md: 1 },
                  minHeight: { xs: '200px', md: 'auto' }
                }}
              >
                {filteredSites.map((site, idx) => (
                  <Draggable key={site.id} draggableId={`siteList-${site.id}`} index={idx}>
                    {(provided, snapshot) => (
                      <Box
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        sx={{
                          mb: { xs: 0.5, md: 1 },
                          p: { xs: 0.75, md: 1 },
                          bgcolor: snapshot.isDragging ? '#3b82f6' : '#181c24',
                          color: '#fff',
                          borderRadius: 1,
                          fontWeight: 500,
                          fontSize: { xs: '0.8rem', md: '0.9rem' },
                          boxShadow: snapshot.isDragging ? 3 : 0,
                          cursor: 'grab',
                          border: '1px solid #3b82f6',
                          transition: 'all 0.2s',
                        }}
                      >
                        {site.name.slice(0,7)}({site.status})
                      </Box>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Box>
            )}
          </Droppable>
        </Box>
        {/* 우측 달력 */}
        <Box sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          bgcolor: '#181c24',
          borderRadius: { xs: 2, md: 4 },
          p: { xs: 1, md: 3 },
          width: '100%',
          minWidth: 0,
          minHeight: { xs: 'auto', md: 'calc(100vh - 48px)' },
          boxSizing: 'border-box',
          justifyContent: 'flex-start',
        }}>
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '100%',
            height: '100%'
          }}>
            <CustomCalendar
              year={year}
              month={month}
              calendarItems={calendarItems}
              onDragEnd={onDragEnd}
              onPrevMonth={() => setMonth(m => m === 0 ? 11 : m - 1)}
              onNextMonth={() => setMonth(m => m === 11 ? 0 : m + 1)}
              onDateClick={handleOpenPopup}
              selectedItems={selectedItems}
              onItemClick={handleItemClick}
              onItemDoubleClick={handleItemDoubleClick}
              onItemTouchStart={handleItemTouchStart}
              onItemTouchEnd={handleItemTouchEnd}
              onDeleteSelected={handleDeleteSelected}
              onSave={handleSave}
              onExcel={handleExcel}
              sx={{
                width: '100%',
                height: '100%',
                '& .calendar-grid': {
                  gap: { xs: '2px', md: '5px' }
                },
                '& .calendar-cell': {
                  p: { xs: 0.5, md: 1 },
                  minHeight: { xs: '60px', md: '100px' }
                }
              }}
            />
          </Box>
        </Box>
      </Box>
      {popupOpen && (
        <Box onClick={handleClosePopup} sx={{ position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', bgcolor:'rgba(0,0,0,0.4)', zIndex: 2000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Box onClick={e=>e.stopPropagation()} sx={{ minWidth:340, bgcolor:'#232837', borderRadius:3, p:3, boxShadow:5, position:'relative' }}>
            <IconButton onClick={handleClosePopup} sx={{ position:'absolute', top:8, right:8, color:'#fff' }}>X</IconButton>
            <Typography variant="h6" sx={{ color:'#fff', mb:2 }}>새 일정 추가</Typography>
            <TextField label="제목" value={popupTitle} onChange={e=>setPopupTitle(e.target.value)} fullWidth sx={{ mb:2, input:{color:'#fff'}, label:{color:'#fff'} }} autoFocus/>
            <TextField select label="유형" value={popupType} onChange={e=>setPopupType(e.target.value)} fullWidth sx={{ mb:2, input:{color:'#fff'}, label:{color:'#fff'} }} SelectProps={{ native:true }}>
              <option value="일정">일정</option>
              <option value="지원">지원</option>
              <option value="회의">회의</option>
              <option value="입찰">입찰</option>
              <option value="점검">점검</option>
              <option value="기타">기타</option>
            </TextField>
            <TextField label="설명" value={popupDesc} onChange={e=>setPopupDesc(e.target.value)} fullWidth multiline rows={3} sx={{ mb:2, input:{color:'#fff'}, label:{color:'#fff'} }}/>
            <Button variant="contained" color="primary" onClick={handleAddSchedule} fullWidth>추가</Button>
          </Box>
        </Box>
      )}
      {editPopup.open && (
        <Box onClick={() => setEditPopup({ ...editPopup, open: false })} sx={{ position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', bgcolor:'rgba(0,0,0,0.4)', zIndex: 2000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Box onClick={e=>e.stopPropagation()} sx={{ minWidth:340, bgcolor:'#232837', borderRadius:3, p:3, boxShadow:5, position:'relative' }}>
            <IconButton onClick={(e) => { e.stopPropagation(); setEditPopup({ ...editPopup, open: false }); }} sx={{ position:'absolute', top:8, right:8, color:'#fff' }}>X</IconButton>
            <Typography variant="h6" sx={{ color:'#fff', mb:2 }}>일정 수정</Typography>
            <TextField label="제목" value={editPopup.item?.text} onChange={(e) => setEditPopup({ ...editPopup, item: { ...editPopup.item, text: e.target.value } })} fullWidth sx={{ mb:2, input:{color:'#fff'}, label:{color:'#fff'} }} autoFocus/>
            <TextField select label="유형" value={editPopup.item?.type} onChange={(e) => setEditPopup({ ...editPopup, item: { ...editPopup.item, type: e.target.value } })} fullWidth sx={{ mb:2, input:{color:'#fff'}, label:{color:'#fff'} }} SelectProps={{ native:true }}>
              <option value="일정">일정</option>
              <option value="지원">지원</option>
              <option value="회의">회의</option>
              <option value="입찰">입찰</option>
              <option value="점검">점검</option>
              <option value="기타">기타</option>
            </TextField>
            <TextField label="설명" value={editPopup.item?.desc} onChange={(e) => setEditPopup({ ...editPopup, item: { ...editPopup.item, desc: e.target.value } })} fullWidth multiline rows={3} sx={{ mb:2, input:{color:'#fff'}, label:{color:'#fff'} }}/>
            <Button variant="contained" color="primary" onClick={(e) => { e.stopPropagation(); setCalendarItems({ ...calendarItems, [editPopup.date]: [...(calendarItems[editPopup.date] || []), editPopup.item] }); setEditPopup({ ...editPopup, open: false }); }} fullWidth>저장</Button>
          </Box>
        </Box>
      )}
    </DragDropContext>
  );
} 
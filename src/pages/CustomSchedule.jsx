import React, { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Button, TextField, IconButton, Paper, MenuItem, Checkbox, FormControlLabel } from '@mui/material';
import CustomCalendar from '../components/CustomCalendar';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { collection, doc, query, onSnapshot, addDoc, updateDoc, deleteDoc, writeBatch, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import * as XLSX from 'xlsx';
import { exportCalendarToExcel } from '../utils/exportUtils';
import useMediaQuery from '@mui/material/useMediaQuery';

function isInMonth(site, year, month) {
  if (!site.startDate || !site.endDate) return false;
  const s = new Date(site.startDate);
  const e = new Date(site.endDate);
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  return !(e < first || s > last);
}

const CustomSchedule = () => {
  const isMobile = useMediaQuery('(max-width:600px)');
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
    const user = auth.currentUser;
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
        date: destination.droppableId,
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

  const handleClosePopup = () => setPopupOpen(false);

  const handleAddSchedule = async () => {
    if (!popupTitle.trim() || selectedTypes.length === 0) return;
    const user = auth.currentUser;
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    try {
      await addDoc(collection(db, 'schedules'), {
        text: popupTitle,
        type: selectedTypes.join(', '),
        desc: popupDesc,
        date: popupDate,
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

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setCalendarItems({});
      return;
    }
    
    const q = query(collection(db, 'schedules'));
    let unsubscribe = null;
    
    try {
      unsubscribe = onSnapshot(q, (snapshot) => {
        try {
          snapshot.docChanges().forEach((change) => {
            const item = { id: change.doc.id, ...change.doc.data() };
            const date = item.date;

            if (!date) return;

            setCalendarItems(prev => {
              const newItems = { ...prev };
              
              if (change.type === "added" || change.type === "modified") {
                let dateItems = newItems[date] ? [...newItems[date]] : [];
                const existingIndex = dateItems.findIndex(i => i.id === item.id);
                if (existingIndex > -1) {
                  dateItems[existingIndex] = item;
                } else {
                  dateItems.push(item);
                }
                newItems[date] = dateItems;
              } else if (change.type === "removed") {
                let dateItems = newItems[date] ? newItems[date].filter(i => i.id !== item.id) : [];
                if (dateItems.length > 0) {
                  newItems[date] = dateItems;
                } else {
                  delete newItems[date];
                }
              }
              return newItems;
            });
          });
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
  }, []);

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm('선택된 항목을 삭제하시겠습니까?')) return;

    const itemsToDelete = [...selectedItems];
    
    // 1. Optimistic UI update
    const newCalendarItems = { ...calendarItems };
    itemsToDelete.forEach(({ date, id }) => {
      if (newCalendarItems[date]) {
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
      if (selected.id) {
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
    const user = auth.currentUser;
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
      // 새로운 전문적인 엑셀 내보내기 사용
      const result = exportCalendarToExcel(calendarItems, year, month + 1, '일정관리');
      
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

  const handleCheckItem = (date, id, checked) => {
    setCheckedItems(prev => {
      const key = `${date}_${id}`;
      return { ...prev, [key]: checked };
    });
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

  const handleShowListPopup = (dateStr) => { setShowListPopup(true); setListPopupDate(dateStr); };
  const handleCloseListPopup = () => { setShowListPopup(false); setListPopupDate(''); };

  return (
    <Box sx={{ 
      p: 0, 
      height: isMobile ? 'calc(100vh - 90px)' : 'calc(100vh - 120px)',
      width: isMobile ? '100vw' : '100%',
      mx: 0,
      px: 0,
      margin: 0,
      padding: 0,
      position: isMobile ? 'relative' : 'static',
      left: isMobile ? '-30px' : 'auto',
      right: isMobile ? 0 : 'auto'
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
            border: '1px solid', borderColor: 'divider', borderRadius: 2, display: 'flex',
            flexDirection: 'column', 
            height: 'calc(100% - 30px)',
            maxHeight: { xs: '270px', md: 'calc(100% - 30px)' },
            position: { xs: 'relative', md: 'static' },
            display: isMobile ? 'none' : 'flex',
          }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', position: { xs: 'relative', md: 'static' }, transform: { xs: 'translateX(25px)', md: 'none' }, display: { xs: 'none', md: 'block' } }}>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, display: { xs: 'none', md: 'block' } }}>공사현황</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>이달의 현장</Typography>
            </Box>
            <Droppable droppableId="siteList">
              {(provided, snapshot) => (
                <Box ref={provided.innerRef} {...provided.droppableProps} sx={{
                  flex: 1, overflowY: 'auto', p: isMobile ? 0.5 : 1,
                  bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'background.paper',
                  maxHeight: isMobile ? '200px' : 'none',
                  position: { xs: 'relative', md: 'static' },
                  transform: { xs: 'translateX(25px)', md: 'none' },
                  display: { xs: 'none', md: 'block' },
                }}>
                  {filteredSites.length > 0 ? (
                    filteredSites.map((site, index) => (
                      <Draggable key={site.id} draggableId={site.id} index={index}>
                        {(provided) => (
                          <Paper ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                            sx={{ 
                              mb: isMobile ? 0.5 : 1, 
                              p: isMobile ? 0.5 : 1.5, 
                              bgcolor: 'background.default',
                              borderRadius: isMobile ? 1 : 2
                            }}>
                            <Typography sx={{ 
                              fontSize: isMobile ? '0.7rem' : 'inherit',
                              lineHeight: isMobile ? 1.2 : 'inherit'
                            }}>
                              {site.name.slice(0, 10)}
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
            px: isMobile ? 0 : undefined
          }}>
            <CustomCalendar
              year={year} month={month} calendarItems={calendarItems}
              onPrevMonth={() => setMonth(m => m === 0 ? 11 : m - 1)}
              onNextMonth={() => setMonth(m => m === 11 ? 0 : m + 1)}
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
              onCellClick={handleShowListPopup}
              sites={sites}
              onOpenPopup={handleOpenPopup}
            />
          </Box>
        </Box>
      </DragDropContext>
      {!isMobile && popupOpen && (
        <Box
          onClick={e => { e.stopPropagation(); handleClosePopup(); }}
          sx={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', bgcolor: 'rgba(0,0,0,0.4)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Box onClick={e => e.stopPropagation()} sx={{ minWidth: 340, bgcolor: 'background.paper', borderRadius: 3, p: 3, boxShadow: 5, position: 'relative', zIndex: 3100 }}>
            <IconButton onClick={e => { e.stopPropagation(); handleClosePopup(); }} sx={{ position: 'absolute', top: 8, right: 8, color: 'text.primary' }}>X</IconButton>
            <Typography variant="h6" sx={{ color: 'text.primary', mb: 2 }}>새 일정 추가</Typography>
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
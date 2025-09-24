import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const ScheduleList = () => {
  const [schedules, setSchedules] = useState([]);
  const [sites, setSites] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    siteId: '',
    startDate: '',
    endDate: '',
    type: '일반',
    priority: '중간',
    status: '예정',
    description: '',
    location: '',
    participants: ''
  });
  const [extraItems, setExtraItems] = useState([]);
  const [extraInput, setExtraInput] = useState('');
  const longPressTimeout = useRef(null);
  const [selectedExtra, setSelectedExtra] = useState(null);
  
  // 터치 관련 상태 관리
  const [touchStates, setTouchStates] = useState({});

  useEffect(() => {
    fetchSchedules();
    fetchSites();
  }, []);

  const fetchSchedules = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'schedules'));
      const scheduleList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSchedules(scheduleList);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const fetchSites = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'sites'));
      const siteList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSites(siteList);
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  const handleOpen = (schedule = null) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData(schedule);
    } else {
      setEditingSchedule(null);
      setFormData({
        title: '',
        siteId: '',
        startDate: '',
        endDate: '',
        type: '일반',
        priority: '중간',
        status: '예정',
        description: '',
        location: '',
        participants: ''
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingSchedule(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSchedule) {
        await updateDoc(doc(db, 'schedules', editingSchedule.id), formData);
      } else {
        await addDoc(collection(db, 'schedules'), formData);
      }
      handleClose();
      fetchSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  };

  const handleDelete = async (scheduleId) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'schedules', scheduleId));
        fetchSchedules();
      } catch (error) {
        console.error('Error deleting schedule:', error);
      }
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case '높음':
        return 'error';
      case '중간':
        return 'warning';
      case '낮음':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '완료':
        return 'success';
      case '진행중':
        return 'primary';
      case '예정':
        return 'info';
      case '취소':
        return 'error';
      default:
        return 'default';
    }
  };

  const getSiteName = (siteId) => {
    const site = sites.find(s => s.id === siteId);
    return site ? site.name : '미지정';
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(extraItems);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setExtraItems(items);
  };

  const handleAddExtra = () => {
    if (extraInput.trim()) {
      setExtraItems([...extraItems, { id: Date.now(), text: extraInput.trim() }]);
      setExtraInput('');
    }
  };

  const handleExtraInputKeyDown = (e) => {
    if (e.key === 'Enter') handleAddExtra();
  };

  const handleExtraClick = (id) => {
    setSelectedExtra(selectedExtra === id ? null : id);
  };

  const handleExtraDoubleClick = (item) => {
    alert(`팝업: ${item.text}`);
  };

  const handleExtraTouchStart = (item) => {
    longPressTimeout.current = setTimeout(() => handleExtraDoubleClick(item), 600);
  };

  const handleExtraTouchEnd = () => {
    clearTimeout(longPressTimeout.current);
  };

  // 터치 이벤트 핸들러
  const handleTouchStart = (itemId, e) => {
    e.stopPropagation();
    const touch = e.touches[0];
    const newTouchState = {
      startTime: Date.now(),
      startY: touch.clientY,
      startX: touch.clientX,
      isLongPress: false,
      isScrolling: false,
      timer: null
    };
    
    setTouchStates(prev => ({
      ...prev,
      [itemId]: newTouchState
    }));
    
    // 전역 상태로도 저장
    window.touchStates = {
      ...window.touchStates,
      [itemId]: newTouchState
    };
    
    // 길게 누르기 타이머 설정 (1.5초)
    const timer = setTimeout(() => {
      setTouchStates(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], isLongPress: true }
      }));
      
      window.touchStates = {
        ...window.touchStates,
        [itemId]: { ...window.touchStates[itemId], isLongPress: true }
      };
      
      e.target.style.transform = 'scale(1.05)';
      e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    }, 1500);
    
    setTouchStates(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], timer }
    }));
  };

  const handleTouchMove = (itemId, e) => {
    e.stopPropagation();
    const touchState = touchStates[itemId];
    if (!touchState || !touchState.startTime || !touchState.startY) return;
    
    const touch = e.touches[0];
    const deltaY = Math.abs(touch.clientY - touchState.startY);
    const deltaX = Math.abs(touch.clientX - (touchState.startX || touch.clientX));
    const deltaTime = Date.now() - touchState.startTime;
    
    // 스크롤 감지 조건 강화
    const isScrolling = (
      deltaY > 5 || // 수직 이동이 5px 이상
      deltaTime < 300 || // 터치 시간이 300ms 미만
      (deltaY > deltaX && deltaY > 3) // 수직 이동이 가로 이동보다 크고 3px 이상
    );
    
    if (isScrolling) {
      if (touchState.timer) {
        clearTimeout(touchState.timer);
      }
      setTouchStates(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], isLongPress: false, timer: null, isScrolling: true }
      }));
      
      window.touchStates = {
        ...window.touchStates,
        [itemId]: { ...window.touchStates[itemId], isLongPress: false, timer: null, isScrolling: true }
      };
      
      e.target.style.transform = '';
      e.target.style.boxShadow = '';
    }
  };

  const handleTouchEnd = (itemId, e) => {
    e.stopPropagation();
    const touchState = touchStates[itemId];
    
    if (touchState && touchState.timer) {
      clearTimeout(touchState.timer);
    }
    
    // 길게 누르지 않았고 스크롤하지 않았으면 클릭 이벤트 처리
    if (!touchState?.isLongPress && !touchState?.isScrolling && touchState?.startTime && (Date.now() - touchState.startTime) < 1500) {
      handleExtraClick(itemId);
    }
    
    // 상태 초기화
    setTouchStates(prev => {
      const newStates = { ...prev };
      delete newStates[itemId];
      return newStates;
    });
    
    if (window.touchStates) {
      delete window.touchStates[itemId];
    }
    
    e.target.style.transform = '';
    e.target.style.boxShadow = '';
  };

  return (
            <DragDropContext 
          onDragStart={(result) => {
            // 길게 터치하지 않은 경우 드래그 취소
            const itemKey = result.draggableId;
            const touchState = window.touchStates?.[itemKey];
            if (!touchState || !touchState.isLongPress) {
              console.log('길게 터치하지 않아 드래그 취소:', itemKey);
              return false; // 드래그 취소
            }
          }}
          onDragEnd={onDragEnd}
        >
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">일정 목록</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
          >
            일정 추가
          </Button>
        </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ color: '#2196f3', fontWeight: 700, mb: 2, textAlign: 'left' }}>
          진행중현장 LIST
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="현장명, 회사명, 소장명 검색"
          sx={{ mb: 2 }}
        />
        <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 600, mb: 1, textAlign: 'left' }}>
          추가사항
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="추가사항 입력"
            value={extraInput}
            onChange={e => setExtraInput(e.target.value)}
            onKeyDown={handleExtraInputKeyDown}
          />
          <IconButton color="primary" onClick={handleAddExtra}>
            <AddIcon />
          </IconButton>
        </Box>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="extraList" isDropDisabled={false}>
            {(provided) => (
              <Box 
                ref={provided.innerRef} 
                {...provided.droppableProps} 
                sx={{ 
                  minHeight: 40,
                  maxHeight: '300px',
                  overflowY: 'auto',
                  overflowX: 'hidden'
                }}
              >
                {extraItems.map((item, idx) => (
                  <Draggable key={item.id} draggableId={item.id.toString()} index={idx}>
                    {(provided, snapshot) => (
                      <Box
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        sx={{
                          bgcolor: selectedExtra === item.id ? '#1976d2' : '#23242a',
                          color: '#fff',
                          borderRadius: 2,
                          p: 1.2,
                          mb: 1,
                          cursor: 'pointer',
                          userSelect: 'none',
                          border: selectedExtra === item.id ? '2px solid #2196f3' : '1px solid #333',
                          fontWeight: 500,
                          transition: 'background 0.2s, border 0.2s',
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // 터치 이벤트가 아닌 경우에만 클릭 처리
                          if (!touchStates[item.id]?.startTime || touchStates[item.id]?.isScrolling) {
                            return; // 스크롤 중이면 클릭 무시
                          }
                          handleExtraClick(item.id);
                        }}
                        onDoubleClick={() => handleExtraDoubleClick(item)}
                        onTouchStart={(e) => handleTouchStart(item.id, e)}
                        onTouchMove={(e) => handleTouchMove(item.id, e)}
                        onTouchEnd={(e) => handleTouchEnd(item.id, e)}
                      >
                        {item.text}
                      </Box>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Box>
            )}
          </Droppable>
        </DragDropContext>
      </Box>

      <Grid container spacing={3}>
        {schedules.map((schedule) => (
          <Grid item xs={12} md={6} lg={4} key={schedule.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="h6" gutterBottom>
                    {schedule.title}
                  </Typography>
                  <Box>
                    <IconButton size="small" onClick={() => handleOpen(schedule)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(schedule.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Typography color="textSecondary" gutterBottom>
                  현장: {getSiteName(schedule.siteId)}
                </Typography>
                <Box sx={{ mb: 1 }}>
                  <Chip
                    label={schedule.priority}
                    color={getPriorityColor(schedule.priority)}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={schedule.status}
                    color={getStatusColor(schedule.status)}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="textSecondary">
                  기간: {schedule.startDate} ~ {schedule.endDate}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  유형: {schedule.type}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  장소: {schedule.location}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  참석자: {schedule.participants}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingSchedule ? '일정 수정' : '새 일정 추가'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="제목"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>현장</InputLabel>
              <Select
                value={formData.siteId}
                onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                label="현장"
              >
                {sites.map((site) => (
                  <MenuItem key={site.id} value={site.id}>
                    {site.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="시작일"
              type="datetime-local"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              margin="normal"
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="종료일"
              type="datetime-local"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              margin="normal"
              required
              InputLabelProps={{ shrink: true }}
            />
            <Autocomplete
              options={['일반', '회의', '점검', '교육', '기타']}
              value={formData.type}
              onChange={(event, newValue) => setFormData({ ...formData, type: newValue || '' })}
              onInputChange={(event, newInputValue) => setFormData({ ...formData, type: newInputValue })}
              freeSolo
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="유형"
                  placeholder="선택하거나 직접 입력"
                  margin="normal"
                  required
                  fullWidth
                />
              )}
            />
            <Autocomplete
              options={['높음', '중간', '낮음']}
              value={formData.priority}
              onChange={(event, newValue) => setFormData({ ...formData, priority: newValue || '' })}
              onInputChange={(event, newInputValue) => setFormData({ ...formData, priority: newInputValue })}
              freeSolo
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="우선순위"
                  placeholder="선택하거나 직접 입력"
                  margin="normal"
                  required
                  fullWidth
                />
              )}
            />
            <Autocomplete
              options={['예정', '진행중', '완료', '취소']}
              value={formData.status}
              onChange={(event, newValue) => setFormData({ ...formData, status: newValue || '' })}
              onInputChange={(event, newInputValue) => setFormData({ ...formData, status: newInputValue })}
              freeSolo
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="상태"
                  placeholder="선택하거나 직접 입력"
                  margin="normal"
                  required
                  fullWidth
                />
              )}
            />
            <TextField
              fullWidth
              label="장소"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="참석자"
              value={formData.participants}
              onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
              margin="normal"
              placeholder="쉼표로 구분하여 입력"
            />
            <TextField
              fullWidth
              label="설명"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={4}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingSchedule ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </DragDropContext>
  );
};

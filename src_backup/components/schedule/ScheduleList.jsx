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
  MenuItem
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

  return (
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
          <Droppable droppableId="extraList">
            {(provided) => (
              <Box ref={provided.innerRef} {...provided.droppableProps} sx={{ minHeight: 40 }}>
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
                        onClick={() => handleExtraClick(item.id)}
                        onDoubleClick={() => handleExtraDoubleClick(item)}
                        onTouchStart={() => handleExtraTouchStart(item)}
                        onTouchEnd={handleExtraTouchEnd}
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
            <FormControl fullWidth margin="normal" required>
              <InputLabel>유형</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                label="유형"
              >
                <MenuItem value="일반">일반</MenuItem>
                <MenuItem value="회의">회의</MenuItem>
                <MenuItem value="점검">점검</MenuItem>
                <MenuItem value="교육">교육</MenuItem>
                <MenuItem value="기타">기타</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>우선순위</InputLabel>
              <Select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                label="우선순위"
              >
                <MenuItem value="높음">높음</MenuItem>
                <MenuItem value="중간">중간</MenuItem>
                <MenuItem value="낮음">낮음</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>상태</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                label="상태"
              >
                <MenuItem value="예정">예정</MenuItem>
                <MenuItem value="진행중">진행중</MenuItem>
                <MenuItem value="완료">완료</MenuItem>
                <MenuItem value="취소">취소</MenuItem>
              </Select>
            </FormControl>
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
  );
};

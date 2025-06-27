import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarMonth as CalendarIcon,
  List as ListIcon,
} from '@mui/icons-material';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const locales = {
  'ko': ko,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const Schedule = () => {
  const [events, setEvents] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('calendar');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    siteId: '',
    start: new Date(),
    end: new Date(),
    description: '',
    status: 'pending',
    priority: 'normal',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 현장 목록 로드
      const sitesSnapshot = await getDocs(collection(db, 'sites'));
      setSites(sitesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 일정 목록 로드
      const eventsSnapshot = await getDocs(collection(db, 'schedules'));
      const eventsData = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        start: new Date(doc.data().start),
        end: new Date(doc.data().end),
      }));
      setEvents(eventsData);
      setLoading(false);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setError('데이터를 불러오는데 실패했습니다.');
      setLoading(false);
    }
  };

  const handleViewChange = (event, newValue) => {
    setView(newValue);
  };

  const handleOpenDialog = (event = null) => {
    if (event) {
      setSelectedEvent(event);
      setFormData({
        title: event.title,
        siteId: event.siteId,
        start: event.start,
        end: event.end,
        description: event.description,
        status: event.status,
        priority: event.priority,
      });
    } else {
      setSelectedEvent(null);
      setFormData({
        title: '',
        siteId: '',
        start: new Date(),
        end: new Date(),
        description: '',
        status: 'pending',
        priority: 'normal',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedEvent(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const eventData = {
        ...formData,
        updatedAt: new Date().toISOString(),
      };

      if (selectedEvent) {
        await updateDoc(doc(db, 'schedules', selectedEvent.id), eventData);
      } else {
        eventData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'schedules'), eventData);
      }

      handleCloseDialog();
      loadData();
    } catch (error) {
      console.error('일정 저장 실패:', error);
      setError('일정을 저장하는데 실패했습니다.');
    }
  };

  const handleDelete = async (eventId) => {
    if (window.confirm('정말로 이 일정을 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'schedules', eventId));
        loadData();
      } catch (error) {
        console.error('일정 삭제 실패:', error);
        setError('일정을 삭제하는데 실패했습니다.');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'primary';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return '완료';
      case 'in_progress':
        return '진행중';
      case 'pending':
        return '대기중';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'normal':
        return 'primary';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={view} onChange={handleViewChange}>
          <Tab icon={<CalendarIcon />} label="캘린더" value="calendar" />
          <Tab icon={<ListIcon />} label="목록" value="list" />
        </Tabs>
      </Paper>

      {view === 'calendar' ? (
        <Paper sx={{ height: 'calc(100vh - 250px)', position: 'relative' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            onSelectEvent={handleOpenDialog}
            messages={{
              next: "다음",
              previous: "이전",
              today: "오늘",
              month: "월",
              week: "주",
              day: "일",
              agenda: "일정",
              date: "날짜",
              time: "시간",
              event: "일정",
              noEventsInRange: "일정이 없습니다.",
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, position: 'absolute', right: 24, bottom: 24 }}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => {/* 엑셀 내보내기 함수 연결 */}}>
              엑셀 내보내기
            </Button>
          </Box>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {events.map((event) => (
            <Grid item xs={12} md={6} lg={4} key={event.id}>
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6">{event.title}</Typography>
                  <Box>
                    <Chip
                      label={getStatusText(event.status)}
                      color={getStatusColor(event.status)}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      label={event.priority}
                      color={getPriorityColor(event.priority)}
                      size="small"
                    />
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {format(event.start, 'yyyy년 MM월 dd일 HH:mm')} ~ {format(event.end, 'yyyy년 MM월 dd일 HH:mm')}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  현장: {sites.find(site => site.id === event.siteId)?.name || '미지정'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {event.description}
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <IconButton size="small" onClick={() => handleOpenDialog(event)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(event.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedEvent ? '일정 수정' : '새 일정 추가'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="제목"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>현장</InputLabel>
                  <Select
                    name="siteId"
                    value={formData.siteId}
                    onChange={handleInputChange}
                    label="현장"
                  >
                    {sites.map((site) => (
                      <MenuItem key={site.id} value={site.id}>
                        {site.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="시작일시"
                  name="start"
                  type="datetime-local"
                  value={formData.start}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="종료일시"
                  name="end"
                  type="datetime-local"
                  value={formData.end}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>상태</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    label="상태"
                  >
                    <MenuItem value="pending">대기중</MenuItem>
                    <MenuItem value="in_progress">진행중</MenuItem>
                    <MenuItem value="completed">완료</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>우선순위</InputLabel>
                  <Select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    label="우선순위"
                  >
                    <MenuItem value="high">높음</MenuItem>
                    <MenuItem value="normal">보통</MenuItem>
                    <MenuItem value="low">낮음</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="설명"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  multiline
                  rows={4}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedEvent ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Schedule; 
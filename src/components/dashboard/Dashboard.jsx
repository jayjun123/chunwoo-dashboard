import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, Modal, IconButton, TextField, List, ListItem, ListItemText, Chip, Divider, Stack, AppBar, useTheme, Grid, CircularProgress } from '@mui/material';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';
import NewsPanel from './NewsPanel';
import { collection, getDocs } from 'firebase/firestore';
import { db, queries } from '../../firebase';

// 임시 데이터
const today = new Date();
const weekWeather = [
  { day: '월', temp: 23, weather: '맑음', icon: '☀️' },
  { day: '화', temp: 24, weather: '구름', icon: '⛅' },
  { day: '수', temp: 22, weather: '비', icon: '🌧️' },
  { day: '목', temp: 21, weather: '흐림', icon: '☁️' },
  { day: '금', temp: 25, weather: '맑음', icon: '☀️' },
  { day: '토', temp: 26, weather: '맑음', icon: '☀️' },
  { day: '일', temp: 24, weather: '구름', icon: '⛅' },
];

// 날씨 상세
function WeatherDetail({ onClose }) {
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('대구');
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>{location} 주간 날씨</Typography>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', alignItems: 'center', mb: 2 }}>
        {weekWeather.map((w, i) => (
          <Paper key={i} sx={{ p: 1, minWidth: 60, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body2">{w.day}</Typography>
            <Typography variant="h6">{w.icon}</Typography>
            <Typography variant="body2">{w.temp}°C</Typography>
          </Paper>
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'center' }}>
        <TextField
          size="small"
          placeholder="지역 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 140 }}
        />
        <Button variant="contained" size="small" onClick={() => setLocation(search || '대구')} startIcon={<SearchIcon />}>검색</Button>
      </Box>
    </Box>
  );
}

// 현장 상세
function SitesDetail() {
  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', alignItems: 'stretch' }}>
        {/* 금일현장 카드 */}
        <Paper sx={{ p: 2, minWidth: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2">금일현장</Typography>
          <Typography>진행중 현장 : 0</Typography>
          <Typography>금일완료 현장 : 0</Typography>
          <Typography>이달 완료 현장 : 0</Typography>
        </Paper>
        {/* 기성현황 카드 */}
        <Paper sx={{ p: 2, minWidth: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2">기성현황</Typography>
          <Typography>그래프 자리(예시)</Typography>
        </Paper>
        {/* 협의새글 카드 */}
        <Paper sx={{ p: 2, minWidth: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2">협의새글</Typography>
          <Typography>협의새글 카드 예시</Typography>
        </Paper>
        {/* 안전새글 카드 */}
        <Paper sx={{ p: 2, minWidth: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2">안전새글</Typography>
          <Typography>안전새글 카드 예시</Typography>
        </Paper>
      </Box>
    </Box>
  );
}

// ToDo 상세
function TodoDetail() {
  const [todos, setTodos] = useState([
    { id: 1, text: '안전점검 실시', completed: false },
    { id: 2, text: '기성청구서 작성', completed: false },
    { id: 3, text: '협력업체 미팅', completed: true },
  ]);
  const [input, setInput] = useState('');
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');

  const handleAdd = () => {
    if (input.trim()) {
      setTodos([...todos, { id: Date.now(), text: input, completed: false }]);
      setInput('');
    }
  };
  const handleEdit = (id, text) => {
    setEditId(id);
    setEditText(text);
  };
  const handleEditSave = () => {
    setTodos(todos.map(t => t.id === editId ? { ...t, text: editText } : t));
    setEditId(null);
    setEditText('');
  };
  const handleDelete = id => setTodos(todos.filter(t => t.id !== id));
  const handleToggle = id => setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', mb: 2, gap: 1 }}>
        <TextField fullWidth size="small" value={input} onChange={e => setInput(e.target.value)} placeholder="할 일 추가" onKeyDown={e => e.key === 'Enter' && handleAdd()} />
        <IconButton color="primary" onClick={handleAdd}><AddIcon /></IconButton>
      </Box>
      <List>
        {todos.map(todo => (
          <ListItem key={todo.id} secondaryAction={
            <Box>
              <IconButton onClick={() => handleToggle(todo.id)} color={todo.completed ? 'success' : 'default'}>
                <CheckCircleIcon />
              </IconButton>
              <IconButton onClick={() => handleEdit(todo.id, todo.text)}><EditIcon /></IconButton>
              <IconButton onClick={() => handleDelete(todo.id)}><DeleteIcon /></IconButton>
            </Box>
          }>
            {editId === todo.id ? (
              <TextField size="small" value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEditSave()} autoFocus />
            ) : (
              <ListItemText
                primary={<Typography sx={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>{todo.text}</Typography>}
              />
            )}
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

// 관리 상세
function ManageDetail({ onGoMembers, onGoPermissions }) {
  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Button variant="contained" onClick={onGoMembers}>회원관리</Button>
      <Button variant="outlined" onClick={onGoPermissions}>권한관리</Button>
    </Box>
  );
}

const Dashboard = React.memo(() => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    sites: { active: 0, total: 0 },
    progress: { current: 0, target: 0 },
    discussions: { new: 0, total: 0 },
    safety: { new: 0, total: 0 },
    todos: { completed: 0, total: 0 }
  });
  const [modal, setModal] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 현장 통계
        const sitesSnapshot = await getDocs(queries.getSites());
        const sites = sitesSnapshot.docs.map(doc => doc.data());
        const activeSites = sites.filter(site => site.status === '진행중');

        // 기성 현황 통계
        const progressSnapshot = await getDocs(queries.getProgressBySite('all'));
        const progress = progressSnapshot.docs.map(doc => doc.data());
        const totalProgress = progress.reduce((sum, p) => sum + p.amount, 0);

        // 협의 게시판 통계
        const discussionsSnapshot = await getDocs(queries.getDiscussions());
        const discussions = discussionsSnapshot.docs.map(doc => doc.data());
        const newDiscussions = discussions.filter(d => !d.read);

        // 안전 관리 통계
        const safetySnapshot = await getDocs(queries.getUnresolvedSafety());
        const safety = safetySnapshot.docs.map(doc => doc.data());

        setStats({
          sites: {
            active: activeSites.length,
            total: sites.length
          },
          progress: {
            current: totalProgress,
            target: 1000000000 // 목표 금액 설정
          },
          discussions: {
            new: newDiscussions.length,
            total: discussions.length
          },
          safety: {
            new: safety.length,
            total: safety.length
          },
          todos: {
            completed: 0,
            total: 0
          }
        });
      } catch (error) {
        console.error('통계 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      pt: 0,
      pb: 0,
      px: 2, 
      height: '100vh',
      bgcolor: theme.palette.background.default,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      overflow: 'hidden',
      mt: 0
    }}>
      <Box sx={{ 
        width: '100%',
        maxWidth: { xs: '100%', md: 1300 },
        display: 'flex',
        justifyContent: 'center',
        mt: 0
      }}>
        <NewsPanel />
      </Box>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        aria-labelledby="dashboard-modal"
        aria-describedby="dashboard-modal-desc"
        closeAfterTransition
        keepMounted
        disableRestoreFocus={false}
        disableEnforceFocus={false}
        hideBackdrop={false}
      >
        <Box
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Escape') setModal(null); }}
          sx={{ position: 'fixed', left: '50%', bottom: 74, transform: 'translateX(-50%)', bgcolor: 'background.paper', boxShadow: 24, borderRadius: 2, p: 0, minWidth: 320, maxWidth: 800, width: '95%' }}
        >
          {modal === 'weather' && <WeatherDetail onClose={() => setModal(null)} />}
          {modal === 'sites' && <SitesDetail />}
          {modal === 'todo' && <TodoDetail />}
          {modal === 'manage' && <ManageDetail onGoMembers={() => { setModal(null); navigate('/members'); }} onGoPermissions={() => { setModal(null); navigate('/permissions'); }} />}
        </Box>
      </Modal>
    </Box>
  );
});

export default Dashboard;
  
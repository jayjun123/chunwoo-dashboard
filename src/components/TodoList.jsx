import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Button,
  Paper,
  Typography,
  Box,
  Checkbox,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Popover,
  Chip,
  Grid,
  Alert,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { collection, query, onSnapshot, where, addDoc, updateDoc, deleteDoc, doc, getDocs, orderBy } from 'firebase/firestore';
import { db, collections } from '../firebase';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import { format, startOfDay, endOfDay, isToday, isYesterday, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';

const statusColor = (completed, planned) => {
  if (completed) return 'success.main';
  if (planned) return 'info.main';
  return 'error.main';
};

const TodoList = () => {
  const [todos, setTodos] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const [newTodo, setNewTodo] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showNoChangeAlert, setShowNoChangeAlert] = useState(false);
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;
  const isMaster = currentUser?.email === 'fire8803@naver.com' || userId === 'HpF5IrlTscYbWPsUhtdzV05sjbF2';

  // 현재 사용자의 오늘 날짜 투두리스트 가져오기
  const getCurrentUserTodos = async () => {
    if (!userId) return;
    
    const today = format(new Date(), 'yyyy-MM-dd');
    
    try {
      console.log('오늘 날짜:', today);
      
      // 오늘 투두리스트 확인 (date 필드 또는 createdAt 필드로)
      const todayQuery = query(
        collection(db, collections.todos),
        where('userId', '==', userId),
        where('date', '==', today)
      );
      
      const todaySnapshot = await getDocs(todayQuery);
      console.log('오늘 투두 개수:', todaySnapshot.size);
      
      // 오늘 투두리스트가 없으면 전날 미완료 항목을 carry over
      if (todaySnapshot.empty) {
        console.log('오늘 투두가 없어서 전날 미완료 항목을 이월합니다.');
        const yesterday = format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
        const yesterdayQuery = query(
          collection(db, collections.todos),
          where('userId', '==', userId),
          where('date', '==', yesterday),
          where('completed', '==', false)
        );
        
        const yesterdaySnapshot = await getDocs(yesterdayQuery);
        console.log('전날 미완료 항목 개수:', yesterdaySnapshot.size);
        
        // 전날 미완료 항목들을 오늘로 carry over
        for (const doc of yesterdaySnapshot.docs) {
          const todoData = doc.data();
          await addDoc(collection(db, collections.todos), {
            ...todoData,
            date: today,
            carriedOver: true,
            createdAt: new Date(),
            completed: false
          });
        }
      }
    } catch (error) {
      console.error('투두리스트 초기화 오류:', error);
    }
  };

  // 사용자 목록 가져오기 (마스터 계정용)
  const fetchAllUsers = async () => {
    if (!isMaster) return;
    
    try {
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllUsers(users);
      console.log('사용자 목록:', users); // 디버깅용
    } catch (error) {
      console.error('사용자 목록 가져오기 오류:', error);
    }
  };

  useEffect(() => {
    if (!userId) return;
    
    // 마스터 계정이면 사용자 목록 가져오기
    if (isMaster) {
      fetchAllUsers();
    }
    
    // 현재 사용자의 오늘 투두리스트 초기화
    getCurrentUserTodos();
  }, [userId, isMaster]);

  useEffect(() => {
    if (!userId) return;

    const targetUserId = (selectedUser === null || selectedUser === '') ? userId : selectedUser;

    let q;
    if (isMaster && selectedUser) {
      // 마스터 계정이 특정 사용자 선택 시
      q = query(
        collection(db, collections.todos),
        where('userId', '==', targetUserId),
        orderBy('createdAt', 'desc')
      );
    } else if (isMaster && !selectedUser) {
      // 마스터 계정이 모든 사용자 보기
      q = query(
        collection(db, collections.todos),
        orderBy('createdAt', 'desc')
      );
    } else {
      // 일반 사용자 또는 마스터 계정이 자신의 투두리스트
      q = query(
        collection(db, collections.todos),
        where('userId', '==', targetUserId),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('todos 전체:', data);
      setTodos(data);
    });

    return () => unsubscribe();
  }, [userId, selectedUser, isMaster]);

  // 일자별 그룹핑 (전체 투두 표시)
  console.log('todos 전체:', todos);
  const grouped = todos.reduce((acc, todo) => {
    let date;
    // createdAt이 Timestamp, string, Date 모두 안전하게 처리
    if (todo.date) {
      date = todo.date;
    } else if (todo.createdAt) {
      if (typeof todo.createdAt === 'string') {
        // ISO string 또는 기타 string
        date = new Date(todo.createdAt).toISOString().slice(0, 10);
      } else if (todo.createdAt.toDate) {
        date = todo.createdAt.toDate().toISOString().slice(0, 10);
      } else if (todo.createdAt instanceof Date) {
        date = todo.createdAt.toISOString().slice(0, 10);
      } else {
        // 기타 타입 (숫자 등)
        date = format(new Date(todo.createdAt), 'yyyy-MM-dd');
      }
    } else {
      date = format(new Date(), 'yyyy-MM-dd');
    }
    if (!acc[date]) acc[date] = [];
    acc[date].push(todo);
    return acc;
  }, {});
  // 모든 데이터 표시 (필터 제거)
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // 오늘 날짜 확인
  const today = format(new Date(), 'yyyy-MM-dd');
  const hasTodayTodos = grouped[today] && grouped[today].length > 0;
  console.log('오늘 날짜:', today, '오늘 투두 있음:', hasTodayTodos, '오늘 투두 개수:', hasTodayTodos ? grouped[today].length : 0);

  // 엑셀 다운로드 기능
  const handleExcelDownload = () => {
    let rows = [];
    for (const date in grouped) {
      grouped[date].forEach(todo => {
        rows.push({
          날짜: date,
          내용: todo.text,
          상태: todo.completed ? '완료' : (todo.planned ? '계획' : '미완료'),
          담당자: todo.userName || '',
          이월여부: todo.carriedOver ? '이월' : '신규',
        });
      });
    }
    if (rows.length === 0) {
      setShowNoChangeAlert(true);
      setTimeout(() => setShowNoChangeAlert(false), 3000);
      return;
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ToDo리스트');
    XLSX.writeFile(wb, isMaster ? '전체_ToDo리스트.xlsx' : '내_ToDo리스트.xlsx');
  };

  // 설정 버튼 클릭 핸들러
  const handleSettingsClick = (event) => {
    setSettingsAnchor(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setSettingsAnchor(null);
  };

  // 사용자 선택 핸들러
  const handleUserSelect = (userId) => {
    console.log('사용자 선택:', userId); // 디버깅용
    setSelectedUser(userId);
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
    setNewTodo(''); // 입력칸도 초기화
    setSettingsAnchor(null);
  };

  // 날짜 선택 핸들러
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSettingsAnchor(null);
  };

  // 마스터 계정용 설정 팝오버
  const renderSettingsPopover = () => {
    if (!isMaster) return null;

    return (
      <Popover
        open={Boolean(settingsAnchor)}
        anchorEl={settingsAnchor}
        onClose={handleSettingsClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            p: 2,
            minWidth: 250,
            bgcolor: '#fff',
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#333' }}>
          사용자 설정
        </Typography>
        
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>사용자 선택</InputLabel>
          <Select
            value={selectedUser || ''}
            onChange={(e) => handleUserSelect(e.target.value)}
            label="사용자 선택"
          >
            <MenuItem value="">내 투두리스트</MenuItem>
            {allUsers.map(user => (
              <MenuItem key={user.id} value={user.id}>
                {user.displayName || user.email || user.id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <TextField
          type="date"
          value={selectedDate}
          onChange={(e) => handleDateSelect(e.target.value)}
          size="small"
          fullWidth
          label="날짜 선택"
          sx={{ bgcolor: '#f8f9fa', borderRadius: 1, '& fieldset': { borderColor: '#e0e0e0' } }}
        />
      </Popover>
    );
  };

  // 현재 표시 중인 사용자 정보
  const getCurrentDisplayUser = () => {
    if (!isMaster || !selectedUser) return '내 투두리스트';
    const user = allUsers.find(u => u.id === selectedUser);
    return user ? (user.displayName || user.email || user.id) : '알 수 없는 사용자';
  };

  // 포스트잇 색상 배열 (연노란하얀빛)
  const postItColors = [
    '#fff9c4', // 연한 노란색
    '#fffde7', // 매우 연한 노란색
    '#fff8e1', // 연한 주황 노란색
    '#fff3e0', // 연한 주황색
    '#fafafa', // 연한 회색
    '#f5f5f5', // 매우 연한 회색
  ];

  return (
    <Box sx={{ p: 3, minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)', position: 'relative' }}>
      {/* 블랙보드 배경 효과 */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.2) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.2) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(120, 219, 255, 0.2) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />

      {/* 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
          📋 전체 투두리스트 (실시간 모니터)
        </Typography>
        {/* 마스터 계정만 회원 드롭다운 */}
        {isMaster && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: '#fff' }}>
              {getCurrentDisplayUser()}
            </Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel sx={{ color: '#fff' }}>사용자 선택</InputLabel>
              <Select
                value={selectedUser || ''}
                onChange={(e) => setSelectedUser(e.target.value)}
                label="사용자 선택"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.9)',
                  borderRadius: 1,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.7)',
                  }
                }}
              >
                <MenuItem value="">내 투두리스트</MenuItem>
                {allUsers.map(user => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.displayName || user.email || user.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
      </Box>
      {/* 포스트잇 그리드 */}
      <Grid container spacing={3} sx={{ position: 'relative', zIndex: 1 }}>
        {sortedDates.map((date, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={date}>
            <Paper
              elevation={8}
              sx={{
                p: 2,
                minHeight: 300,
                maxHeight: 400,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                background: postItColors[index % postItColors.length],
                transform: `rotate(${(Math.random() - 0.5) * 4}deg)`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: `rotate(0deg) scale(1.02)`,
                  boxShadow: '0 8px 25px rgba(0,0,0,0.4)',
                },
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #ffd54f, #ffb300, #ff8f00)',
                  borderRadius: '4px 4px 0 0'
                }
              }}
            >
              {/* 날짜 헤더 */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb: 1, borderBottom: '2px solid rgba(0,0,0,0.1)' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#333', fontSize: '1.1rem' }}>
                  {format(new Date(date), 'MM월 dd일', { locale: ko })}
                </Typography>
                {date === format(new Date(), 'yyyy-MM-dd') && (
                  <Chip
                    label="오늘"
                    size="small"
                    color="primary"
                    sx={{ bgcolor: '#2196f3', color: '#fff', fontWeight: 600 }}
                  />
                )}
              </Box>
              {/* 투두 리스트 */}
              <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
                {grouped[date].map(todo => (
                  <Box key={todo.id} sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1, 
                    mb: 1, 
                    p: 1, 
                    borderRadius: 1, 
                    bgcolor: todo.completed ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255,255,255,0.5)', 
                    border: todo.completed ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(0,0,0,0.1)', 
                    transition: 'all 0.2s ease' 
                  }}>
                    {todo.completed ? <CheckCircleIcon color="success" /> : <CancelIcon color="error" />}
                    <Typography sx={{ 
                      flex: 1, 
                      fontSize: '0.9rem', 
                      color: todo.completed ? '#666' : '#333', 
                      textDecoration: todo.completed ? 'line-through' : 'none' 
                    }}>
                      {todo.text}
                    </Typography>
                    {todo.carriedOver && (
                      <Chip label="이월" size="small" color="warning" sx={{ fontSize: '0.6rem', height: 18, bgcolor: '#ff9800', color: '#fff' }} />
                    )}
                  </Box>
                ))}
              </Box>
              {/* 통계 */}
              <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: '#666' }}>
                  완료: {grouped[date].filter(t => t.completed).length} / {grouped[date].length}
                </Typography>
                <Typography variant="caption" sx={{ color: '#666' }}>
                  진행률: {grouped[date].length > 0 ? Math.round((grouped[date].filter(t => t.completed).length / grouped[date].length) * 100) : 0}%
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default TodoList; 
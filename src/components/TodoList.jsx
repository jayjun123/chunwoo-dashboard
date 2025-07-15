import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Tooltip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Sync as SyncIcon,
  CloudSync as CloudSyncIcon,
  Google as GoogleIcon,
} from '@mui/icons-material';
import { collection, query, onSnapshot, where, addDoc, updateDoc, deleteDoc, doc, getDocs, orderBy } from 'firebase/firestore';
import { db, collections } from '../firebase';
import { devLog, devError } from '../utils/performanceUtils';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

import { useAuth } from '../contexts/AuthContext';
import { useTodo } from '../contexts/TodoContext';
import * as XLSX from 'xlsx';
import { format, startOfDay, endOfDay, isToday, isYesterday, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';

import { auth } from '../firebase';

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
  const [newTodoInputs, setNewTodoInputs] = useState({}); // 각 날짜별 입력 상태
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showNoChangeAlert, setShowNoChangeAlert] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [syncing, setSyncing] = useState(false);
  
  const { currentUser, loginWithGoogle } = useAuth();
  const { isGoogleTasksEnabled, isMasterUser, syncWithGoogleTasks } = useTodo();
  const userId = currentUser?.uid;
  const isMaster = currentUser?.email === 'fire8803@naver.com' || userId === 'HpF5IrlTscYbWPsUhtdzV05sjbF2';

  // 관리자/마스터 권한 체크 함수
  function isAdminOrMaster(user) {
    if (!user) return false;
    if (user.role === 'master' || user.role === 'admin') return true;
    if (user.email === 'fire8803@naver.com' || user.uid === 'HpF5IrlTscYbWPsUhtdzV05sjbF2') return true;
    return false;
  }
  const isAdminOrMasterUser = isAdminOrMaster(currentUser);

  // Google Tasks 동기화 처리
  const handleGoogleSync = async () => {
    if (!isMasterUser || !isGoogleTasksEnabled) {
      alert('마스터 사용자만 Google Tasks 동기화를 사용할 수 있습니다.');
      return;
    }

    try {
      setSyncing(true);
      await syncWithGoogleTasks();
      alert('Google Tasks 동기화가 완료되었습니다.');
    } catch (error) {
      console.error('Google Tasks 동기화 실패:', error);
      alert('Google Tasks 동기화에 실패했습니다: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };



  // 사용자 목록 가져오기 (마스터 계정용)
  const fetchAllUsers = useCallback(async () => {
    if (!isAdminOrMasterUser) return;
    
    try {
      // members 컬렉션에서 사용자 정보 가져오기
      const membersQuery = query(collection(db, 'members'));
      const membersSnapshot = await getDocs(membersQuery);
      const members = membersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // users 컬렉션에서도 사용자 정보 가져오기 (백업용)
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // 두 컬렉션의 데이터를 병합하여 중복 제거
      const allUsersMap = new Map();
      
      // members 컬렉션 우선
      members.forEach(member => {
        allUsersMap.set(member.id, {
          id: member.id,
          displayName: member.displayName || member.name || member.email,
          email: member.email,
          role: member.role,
          grade: member.grade
        });
      });
      
      // users 컬렉션에서 누락된 사용자 추가
      users.forEach(user => {
        if (!allUsersMap.has(user.id)) {
          allUsersMap.set(user.id, {
            id: user.id,
            displayName: user.displayName || user.name || user.email,
            email: user.email,
            role: user.role,
            grade: user.grade
          });
        }
      });
      
      const allUsers = Array.from(allUsersMap.values());
      
      // 지정된 사용자 이름 매핑 - Firebase에 실제로 존재하는 사용자만
      const userDisplayNames = {
        'HpF5IrlTscYbWPsUhtdzV05sjbF2': '성현준',
        'chunwoo8658@naver.com': '테스트',
        // Firebase에 실제로 존재하는 사용자만 추가
      };
      
      // 사용자 목록에 지정된 이름 적용
      const usersWithDisplayNames = allUsers.map(user => ({
        ...user,
        displayName: userDisplayNames[user.id] || 
                    userDisplayNames[user.email] || 
                    user.displayName || 
                    user.name || 
                    user.email || 
                    '알 수 없음'
      }));
      
      // Firebase에 실제로 존재하는 사용자만 필터링 (매핑에 있는 사용자만)
      const validUsers = usersWithDisplayNames.filter(user => 
        user.id && user.email && 
        (userDisplayNames[user.id] || userDisplayNames[user.email])
      );
      
      setAllUsers(validUsers);
      console.log('사용자 목록:', validUsers); // 디버깅용
    } catch (error) {
      console.error('사용자 목록 가져오기 오류:', error);
    }
  }, [isAdminOrMasterUser]);



  useEffect(() => {
    if (!userId) return;
    
    // 마스터 계정이면 사용자 목록 가져오기
    if (isAdminOrMasterUser) {
      fetchAllUsers();
    }
  }, [userId, isAdminOrMasterUser, fetchAllUsers]);



  useEffect(() => {
    if (!userId) return;

    // 사용자가 선택되지 않았으면 아무것도 표시하지 않음
    if (!selectedUser) {
      setTodos([]);
      return;
    }

    let q;
    // 선택된 사용자의 투두리스트만 가져오기
    q = query(
      collection(db, collections.todos),
      where('userId', '==', selectedUser),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 중복 제거: 같은 id를 가진 투두는 하나만 유지 (실제 Firestore 문서 ID 기준)
      const uniqueTodos = data.reduce((acc, todo) => {
        if (!acc.has(todo.id)) {
          acc.set(todo.id, todo);
        }
        return acc;
      }, new Map());
      
      const uniqueData = Array.from(uniqueTodos.values());
      
      // 실제로 변경된 경우에만 상태 업데이트 (불필요한 리렌더링 방지)
      setTodos(prevTodos => {
        const prevIds = new Set(prevTodos.map(t => t.id));
        const newIds = new Set(uniqueData.map(t => t.id));
        
        // 길이와 ID가 모두 같으면 변경 없음
        if (prevTodos.length === uniqueData.length && 
            uniqueData.every(todo => prevIds.has(todo.id))) {
          return prevTodos;
        }
        
        console.log('todos 업데이트:', uniqueData, '선택된 사용자:', selectedUser);
        return uniqueData;
      });
    });

    return () => unsubscribe();
  }, [userId, selectedUser]);

  // 검색어와 기간으로 필터링된 투두리스트
  const filteredTodos = todos.filter(todo => {
    // 검색어 필터링
    const matchesSearch = !searchTerm || 
      todo.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (todo.userName && todo.userName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // 기간 필터링
    let todoDate;
    if (todo.date) {
      todoDate = todo.date;
    } else if (todo.createdAt) {
      if (typeof todo.createdAt === 'string') {
        todoDate = new Date(todo.createdAt).toISOString().slice(0, 10);
      } else if (todo.createdAt.toDate) {
        todoDate = todo.createdAt.toDate().toISOString().slice(0, 10);
      } else if (todo.createdAt instanceof Date) {
        todoDate = todo.createdAt.toISOString().slice(0, 10);
      } else {
        todoDate = format(new Date(todo.createdAt), 'yyyy-MM-dd');
      }
    } else {
      todoDate = format(new Date(), 'yyyy-MM-dd');
    }
    
    const matchesDateRange = todoDate >= startDate && todoDate <= endDate;
    
    return matchesSearch && matchesDateRange;
  });

  // 일자별 그룹핑 (필터링된 투두 표시)
  console.log('필터링된 todos:', filteredTodos);
  const grouped = filteredTodos.reduce((acc, todo) => {
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
  // 필터링된 데이터 표시
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
    XLSX.writeFile(wb, isAdminOrMasterUser ? '전체_ToDo리스트.xlsx' : '내_ToDo리스트.xlsx');
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
    setTodos([]); // 투두리스트 초기화
    setSettingsAnchor(null);
  };

  // 날짜 선택 핸들러
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSettingsAnchor(null);
  };

  // 마스터 계정용 설정 팝오버
  const renderSettingsPopover = () => {
    if (!isAdminOrMasterUser) return null;

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
            onChange={(e) => {
              const userId = e.target.value;
              setSelectedUser(userId);
              setTodos([]); // 투두리스트 초기화
              // 선택된 사용자의 구글 연동 상태 로드
              if (userId) {
                loadUserGoogleSyncStatus(userId);
              }
            }}
            label="사용자 선택"
            sx={{
              bgcolor: 'transparent',
              borderRadius: 1,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255,255,255,0.3)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255,255,255,0.5)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255,255,255,0.7)',
              },
                                '& .MuiSelect-select': {
                    color: '#fff',
                    textAlign: 'left',
                  },
              '& .MuiInputLabel-root': {
                color: 'rgba(255,255,255,0.7)',
              }
            }}
          >
            {allUsers.map(user => (
              <MenuItem key={user.id} value={user.id}>
                {user.displayName}
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

        <Divider sx={{ my: 2 }} />
        
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#333' }}>
          Google Tasks 연동
        </Typography>
        
        {/* 현재 사용자 정보 표시 */}
        {isAdminOrMasterUser && selectedUser && (
          <Box sx={{ mb: 2, p: 1, bgcolor: '#e3f2fd', borderRadius: 1, border: '1px solid #2196f3' }}>
            <Typography variant="caption" sx={{ color: '#1976d2', fontWeight: 600 }}>
              👤 {getCurrentDisplayUser()} 사용자
            </Typography>
          </Box>
        )}
        
        {/* 마스터 사용자 Google Tasks 연동 상태 */}
        {isMasterUser ? (
          <Box>
            {isGoogleTasksEnabled ? (
              <Box sx={{ mb: 2, p: 1, bgcolor: '#e8f5e9', borderRadius: 1, border: '1px solid #4caf50' }}>
                <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <GoogleIcon sx={{ fontSize: 16 }} />
                  ✅ Google Tasks 연동됨
                </Typography>
                <Typography variant="caption" sx={{ color: '#2e7d32', display: 'block', mt: 0.5 }}>
                  📧 {currentUser?.email}
                </Typography>
                <Typography variant="caption" sx={{ color: '#2e7d32', display: 'block', mt: 0.5 }}>
                  마스터 계정으로 Google Tasks와 동기화됩니다
                </Typography>
              </Box>
            ) : (
              <Box sx={{ mb: 2, p: 1, bgcolor: '#fff3e0', borderRadius: 1, border: '1px solid #ff9800' }}>
                <Typography variant="caption" sx={{ color: '#e65100', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <GoogleIcon sx={{ fontSize: 16 }} />
                  ⚠️ Google Tasks 연동 대기 중
                </Typography>
                <Typography variant="caption" sx={{ color: '#e65100', display: 'block', mt: 0.5 }}>
                  Google Tasks API 설정이 필요합니다
                </Typography>
              </Box>
            )}
            
            <Button
              variant="outlined"
              size="small"
              fullWidth
              onClick={handleGoogleSync}
              disabled={syncing || !isGoogleTasksEnabled}
              startIcon={<CloudSyncIcon />}
              sx={{ mb: 1 }}
            >
              {syncing ? '동기화 중...' : 'Google Tasks 동기화'}
            </Button>
            
            <Typography variant="caption" sx={{ color: '#666', display: 'block', textAlign: 'center' }}>
              마스터 계정만 Google Tasks와 연동됩니다
            </Typography>
          </Box>
        ) : (
          <Box sx={{ mb: 2, p: 1, bgcolor: '#f3e5f5', borderRadius: 1, border: '1px solid #9c27b0' }}>
            <Typography variant="caption" sx={{ color: '#7b1fa2', fontWeight: 600 }}>
              👤 개인 투두 사용
            </Typography>
            <Typography variant="caption" sx={{ color: '#7b1fa2', display: 'block', mt: 0.5 }}>
              일반 사용자는 개인 투두를 사용합니다
            </Typography>
          </Box>
        )}
      </Popover>
    );
  };

  // 현재 표시 중인 사용자 정보
  const getCurrentDisplayUser = () => {
    if (!isAdminOrMasterUser || !selectedUser) return '사용자 선택';
    const user = allUsers.find(u => u.id === selectedUser);
    return user ? user.displayName : '알 수 없는 사용자';
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

  // 투두 추가 함수
  const handleAddTodo = async (date) => {
    const todoText = newTodoInputs[date]?.trim();
    if (!todoText) return;
    
    const targetUserId = isAdminOrMasterUser && selectedUser ? selectedUser : userId;
    
    // 중복 확인: 같은 날짜에 같은 내용의 투두가 이미 있는지 확인
    const existingTodo = todos.find(todo => 
      todo.text === todoText && 
      todo.date === date && 
      todo.userId === targetUserId
    );
    
    if (existingTodo) {
      alert('같은 날짜에 이미 동일한 할 일이 있습니다.');
      return;
    }
    
    try {
      await addDoc(collection(db, collections.todos), {
        text: todoText,
        completed: false,
        userId: targetUserId,
        date: date,
        createdAt: new Date(),
        carriedOver: false
      });
      // 해당 날짜의 입력값만 초기화
      setNewTodoInputs(prev => ({
        ...prev,
        [date]: ''
      }));
    } catch (error) {
      console.error('투두 추가 오류:', error);
    }
  };

  // 입력값 변경 함수
  const handleInputChange = (date, value) => {
    setNewTodoInputs(prev => ({
      ...prev,
      [date]: value
    }));
  };

  // 투두 삭제 함수
  const handleDeleteTodo = async (id) => {
    try {
      // 로컬 상태에서 즉시 제거 (UI 반응성 향상)
      setTodos(prev => prev.filter(todo => todo.id !== id));
      
      // Firestore에서 삭제
      await deleteDoc(doc(db, collections.todos, id));
    } catch (error) {
      console.error('투두 삭제 오류:', error);
      // 삭제 실패 시 다시 추가
      const deletedTodo = todos.find(todo => todo.id === id);
      if (deletedTodo) {
        setTodos(prev => [...prev, deletedTodo]);
      }
    }
  };

  // 투두 상태 변경 함수
  const handleToggleTodo = async (id) => {
    try {
      const todo = todos.find(t => t.id === id);
      if (!todo) return;
      
      // 로컬 상태에서 즉시 업데이트 (UI 반응성 향상)
      setTodos(prev => prev.map(t => 
        t.id === id ? { ...t, completed: !t.completed } : t
      ));
      
      // Firestore에서 업데이트
      await updateDoc(doc(db, collections.todos, id), {
        completed: !todo.completed
      });
    } catch (error) {
      console.error('투두 상태 변경 오류:', error);
      // 업데이트 실패 시 원래 상태로 되돌리기
      setTodos(prev => prev.map(t => 
        t.id === id ? { ...t, completed: todo.completed } : t
      ));
    }
  };

  const scrollFocus = (ref) => () => {
    setTimeout(() => {
      ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  return (
    <Box sx={{ 
      p: { xs: 1, sm: 2, md: 3 }, 
      pt: { xs: -59, sm: 5, md: 5 }, // 모바일에서 64px 위로 이동
      mt: { xs: 0, sm: 3, md: 3 }, // PC에서 24px 아래로 이동
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)', 
      position: 'relative' 
    }}>
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

      {/* 알림 메시지 */}
      {showNoChangeAlert && (
        <Alert 
          severity="info" 
          sx={{ 
            position: 'fixed', 
            top: 20, 
            right: 20, 
            zIndex: 9999,
            minWidth: 300
          }}
          onClose={() => setShowNoChangeAlert(false)}
        >
          다운로드할 데이터가 없습니다.
        </Alert>
      )}

      {/* 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 2, sm: 3 }, gap: { xs: 1, sm: 2 }, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
        <Typography variant="h4" sx={{ 
          fontWeight: 700, 
          color: '#fff', 
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
          fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
        }}>
          📋 전체 투두리스트 <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>(실시간 모니터)</Box>
        </Typography>
        
        {/* 엑셀 다운로드 버튼 */}
        <Button
          variant="contained"
          size="small"
          onClick={handleExcelDownload}
          sx={{
            bgcolor: '#2e7d32',
            color: '#fff',
            '&:hover': {
              bgcolor: '#1b5e20'
            },
            fontSize: { xs: '0.7rem', sm: '0.8rem' },
            px: { xs: 1, sm: 2 },
            py: { xs: 0.5, sm: 1 }
          }}
        >
          📊 엑셀 다운로드
        </Button>
        
        {/* Google Tasks 연동 상태 표시 */}
        {isMasterUser && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={isGoogleTasksEnabled ? <GoogleIcon /> : <GoogleIcon />}
              label={isGoogleTasksEnabled ? 'Google Tasks 연동됨' : 'Google Tasks 대기'}
              color={isGoogleTasksEnabled ? 'success' : 'warning'}
              size="small"
              sx={{
                color: '#fff',
                '& .MuiChip-icon': {
                  color: '#fff'
                }
              }}
            />
            <Tooltip title={isGoogleTasksEnabled ? 'Google Tasks 동기화' : 'Google Tasks API 설정 필요'}>
              <Button
                variant="contained"
                size="small"
                onClick={handleGoogleSync}
                disabled={syncing || !isGoogleTasksEnabled}
                startIcon={<CloudSyncIcon />}
                sx={{
                  bgcolor: isGoogleTasksEnabled ? '#4285f4' : '#9e9e9e',
                  color: '#fff',
                  '&:hover': {
                    bgcolor: isGoogleTasksEnabled ? '#3367d6' : '#757575'
                  },
                  '&:disabled': {
                    bgcolor: 'rgba(66, 133, 244, 0.5)'
                  },
                  fontSize: { xs: '0.7rem', sm: '0.8rem' },
                  px: { xs: 1, sm: 2 },
                  py: { xs: 0.5, sm: 1 }
                }}
              >
                {syncing ? '동기화 중...' : '동기화'}
              </Button>
            </Tooltip>
          </Box>
        )}
        
        {/* 설정 버튼 */}
        <IconButton
          onClick={handleSettingsClick}
          sx={{
            bgcolor: 'rgba(255,255,255,0.1)',
            color: '#fff',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.2)'
            },
            border: '1px solid rgba(255,255,255,0.3)'
          }}
        >
          <SettingsIcon />
        </IconButton>
        
        {/* 마스터 계정만 회원 드롭다운 */}
        {isAdminOrMasterUser && (
          <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, alignItems: 'center' }}>
            <Typography variant="body2" sx={{ 
              color: '#fff',
              fontSize: { xs: '0.8rem', sm: '0.875rem' }
            }}>
              {getCurrentDisplayUser()}
            </Typography>
            <FormControl size="small" sx={{ minWidth: { xs: 150, sm: 200 } }}>
              <InputLabel sx={{ color: '#fff' }}>사용자 선택</InputLabel>
              <Select
                value={selectedUser || ''}
                onChange={(e) => {
                  const userId = e.target.value;
                  setSelectedUser(userId);
                  setTodos([]); // 투두리스트 초기화
                }}
                label="사용자 선택"
                sx={{
                  bgcolor: 'transparent',
                  borderRadius: 1,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.7)',
                  },
                  '& .MuiSelect-select': {
                    color: '#fff',
                    textAlign: 'left',
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255,255,255,0.7)',
                  }
                }}
              >
                {allUsers.map(user => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.displayName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
      </Box>

      {/* 설정 팝오버 */}
      {renderSettingsPopover()}

      {/* 검색 및 필터 섹션 */}
      <Box sx={{ 
        mb: { xs: 2, sm: 3 }, 
        p: { xs: 1.5, sm: 2 }, 
        bgcolor: 'rgba(255,255,255,0.1)', 
        borderRadius: 2, 
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* PC 레이아웃 */}
        <Grid container spacing={{ xs: 1, sm: 2 }} alignItems="center" sx={{ display: { xs: 'none', sm: 'flex' } }}>
          {/* 시작 날짜 */}
          <Grid item xs={6} sm={3} md={2}>
            <TextField
              type="date"
              size="small"
              label="시작일"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.9)',
                  borderRadius: 1,
                  '& fieldset': {
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255,255,255,0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'rgba(255,255,255,0.7)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#333',
                  fontSize: { xs: '0.7rem', sm: '0.75rem' }
                },
                '& .MuiInputBase-input': {
                  color: '#333',
                  fontSize: { xs: '0.7rem', sm: '0.75rem' }
                }
              }}
            />
          </Grid>
          
          {/* 종료 날짜 */}
          <Grid item xs={6} sm={3} md={2}>
            <TextField
              type="date"
              size="small"
              label="종료일"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.9)',
                  borderRadius: 1,
                  '& fieldset': {
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255,255,255,0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'rgba(255,255,255,0.7)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#333',
                  fontSize: { xs: '0.7rem', sm: '0.75rem' }
                },
                '& .MuiInputBase-input': {
                  color: '#333',
                  fontSize: { xs: '0.7rem', sm: '0.75rem' }
                }
              }}
            />
          </Grid>
          
          {/* PC에서만 표시되는 검색창과 필터 초기화 */}
          <Grid item xs={0} sm={6} md={8}>
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ 
                color: 'rgba(255,255,255,0.8)', 
                fontSize: '0.7rem',
                mr: 1
              }}>
                {filteredTodos.length}개 항목
              </Typography>
              <TextField
                size="small"
                placeholder="투두 내용 또는 담당자로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  minWidth: 200,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255,255,255,0.9)',
                    borderRadius: 1,
                    '& fieldset': {
                      borderColor: 'rgba(255,255,255,0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255,255,255,0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'rgba(255,255,255,0.7)',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: '#333',
                    fontSize: '0.875rem'
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: '#666',
                    opacity: 1
                  }
                }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setSearchTerm('');
                  setStartDate(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
                  setEndDate(format(new Date(), 'yyyy-MM-dd'));
                }}
                sx={{
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.5)',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.8)',
                    bgcolor: 'rgba(255,255,255,0.1)',
                  },
                  fontSize: '0.75rem'
                }}
              >
                필터 초기화
              </Button>
            </Box>
          </Grid>
        </Grid>
        
        {/* 모바일에서만 표시되는 1줄 레이아웃 */}
        <Box sx={{ display: { xs: 'flex', sm: 'none' }, gap: 0.5, alignItems: 'center', justifyContent: 'center' }}>
          <TextField
            type="date"
            size="small"
            label="시작"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            sx={{
              width: '150px',
              minWidth: 0,
              '& .MuiInputBase-input': { fontSize: '0.8rem', p: 0 },
              '& .MuiInputLabel-root': { fontSize: '0.7rem' }
            }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="date"
            size="small"
            label="종료"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            sx={{
              width: '150px',
              minWidth: 0,
              '& .MuiInputBase-input': { fontSize: '0.8rem', p: 0 },
              '& .MuiInputLabel-root': { fontSize: '0.7rem' }
            }}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
        
        {/* 모바일에서만 표시되는 2번째 줄 */}
        <Grid container spacing={0.5} alignItems="center" sx={{ display: { xs: 'flex', sm: 'none' }, mt: 1 }}>
          {/* 검색창 */}
          <Grid item xs={8}>
            <TextField
              fullWidth
              size="small"
              placeholder="검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.9)',
                  borderRadius: 1,
                  '& fieldset': {
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255,255,255,0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'rgba(255,255,255,0.7)',
                  },
                },
                '& .MuiInputBase-input': {
                  color: '#333',
                  fontSize: '0.7rem'
                },
                '& .MuiInputBase-input::placeholder': {
                  color: '#666',
                  opacity: 1
                }
              }}
            />
          </Grid>
          
          {/* 결과 개수 */}
          <Grid item xs={2}>
            <Typography variant="caption" sx={{ 
              color: 'rgba(255,255,255,0.8)', 
              fontSize: '0.6rem',
              textAlign: 'center',
              display: 'block',
              lineHeight: '40px'
            }}>
              {filteredTodos.length}개
            </Typography>
          </Grid>
          
          {/* 필터 초기화 버튼 */}
          <Grid item xs={2}>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              onClick={() => {
                setSearchTerm('');
                setStartDate(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
                setEndDate(format(new Date(), 'yyyy-MM-dd'));
              }}
              sx={{
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.5)',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.8)',
                  bgcolor: 'rgba(255,255,255,0.1)',
                },
                fontSize: '0.6rem',
                minWidth: 'auto',
                px: 0.5
              }}
            >
              초기화
            </Button>
          </Grid>
        </Grid>
      </Box>
      {/* 포스트잇 그리드 */}
      <Grid container spacing={{ xs: 1, sm: 2, md: 3 }} sx={{ position: 'relative', zIndex: 1 }}>
        {sortedDates.map((date, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={date}>
            <Paper
              elevation={8}
              sx={{
                p: { xs: 1.5, sm: 2 },
                minHeight: { xs: 200, sm: 250, md: 300 },
                maxHeight: { xs: 280, sm: 350, md: 400 },
                width: { xs: '340px', sm: '100%' },
                mx: { xs: 'auto', sm: 0 }, // 모바일에서 중앙 정렬
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                background: postItColors[index % postItColors.length],
                transform: { xs: 'rotate(0deg)', sm: `rotate(${(Math.random() - 0.5) * 4}deg)` },
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: { xs: 'rotate(0deg) scale(1.01)', sm: 'rotate(0deg) scale(1.02)' },
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 1, sm: 2 }, pb: { xs: 0.5, sm: 1 }, borderBottom: '2px solid rgba(0,0,0,0.1)' }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 700, 
                  color: '#333', 
                  fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' } 
                }}>
                  {format(new Date(date), 'MM월 dd일', { locale: ko })}
                </Typography>
                {date === format(new Date(), 'yyyy-MM-dd') && (
                  <Chip
                    label="오늘"
                    size="small"
                    color="primary"
                    sx={{ 
                      bgcolor: '#2196f3', 
                      color: '#fff', 
                      fontWeight: 600,
                      fontSize: { xs: '0.6rem', sm: '0.7rem' },
                      height: { xs: 20, sm: 24 }
                    }}
                  />
                )}
              </Box>
              {/* 구글 로그인 상태 표시 */}
              {(() => {
                const credential = auth.currentUser?.providerData.find(
                  provider => provider.providerId === 'google.com'
                );
                
                if (credential) {
                  return (
                    <Box sx={{ 
                      mb: { xs: 1, sm: 1.5 }, 
                      p: { xs: 0.5, sm: 1 },
                      bgcolor: 'rgba(76, 175, 80, 0.1)',
                      borderRadius: 1,
                      border: '1px solid rgba(76, 175, 80, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <SyncIcon sx={{ fontSize: { xs: '0.8rem', sm: '1rem' }, color: '#4caf50' }} />
                      <Typography sx={{ 
                        fontSize: { xs: '0.6rem', sm: '0.7rem' }, 
                        color: '#4caf50',
                        fontWeight: 600
                      }}>
                        Google 계정
                      </Typography>
                    </Box>
                  );
                }
                return null;
              })()}
              {/* 투두 리스트 */}
              <Box sx={{ flex: 1, overflowY: 'auto', pr: { xs: 0.5, sm: 1 } }}>
                {grouped[date].map(todo => (
                  <Box key={todo.id} sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: { xs: 0.5, sm: 1 }, 
                    mb: { xs: 0.5, sm: 1 }, 
                    p: { xs: 0.5, sm: 1 }, 
                    borderRadius: 1, 
                    bgcolor: todo.completed ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255,255,255,0.5)', 
                    border: todo.completed ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(0,0,0,0.1)', 
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: todo.completed ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255,255,255,0.7)',
                    }
                  }}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTodo(todo.id);
                      }}
                      sx={{ p: 0.5 }}
                    >
                      {todo.completed ? 
                        <CheckCircleIcon color="success" sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }} /> : 
                        <CancelIcon color="error" sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }} />
                      }
                    </IconButton>
                    <Typography sx={{ 
                      flex: 1, 
                      fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.9rem' }, 
                      color: todo.completed ? '#666' : '#333', 
                      textDecoration: todo.completed ? 'line-through' : 'none',
                      lineHeight: { xs: 1.2, sm: 1.4 }
                    }}>
                      <span style={{ color: todo.carriedOver ? '#444' : undefined }}>
                        {todo.text}
                      </span>
                    </Typography>
                    {todo.carriedOver && (
                      <Chip 
                        label="이월" 
                        size="small" 
                        color="warning" 
                        sx={{ 
                          fontSize: { xs: '0.5rem', sm: '0.6rem' }, 
                          height: { xs: 16, sm: 18 }, 
                          bgcolor: '#ff9800', 
                          color: '#fff' 
                        }} 
                      />
                    )}
                  </Box>
                ))}
              </Box>
              {/* 통계 */}
              <Box sx={{ 
                mt: { xs: 1, sm: 2 }, 
                pt: { xs: 0.5, sm: 1 }, 
                borderTop: '1px solid rgba(0,0,0,0.1)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <Typography variant="caption" sx={{ 
                  color: '#666',
                  fontSize: { xs: '0.6rem', sm: '0.7rem' }
                }}>
                  완료: {grouped[date].filter(t => t.completed).length} / {grouped[date].length}
                </Typography>
                <Typography variant="caption" sx={{ 
                  color: '#666',
                  fontSize: { xs: '0.6rem', sm: '0.7rem' }
                }}>
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
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
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  OpenInFull as ExpandIcon,
  PushPin as PushPinIcon,
  PushPinOutlined as PushPinOutlinedIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { collection, query, onSnapshot, where, addDoc, getDocs, orderBy, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, collections } from '../firebase';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { useAuth } from '../contexts/AuthContext';
import { useTodo } from '../contexts/TodoContext';
import { isMasterUser } from '../utils/masterUtils';
import * as XLSX from 'xlsx';
import { format, startOfDay, endOfDay, isToday, isYesterday, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';

const statusColor = (completed, planned) => {
  if (completed) return 'success.main';
  if (planned) return 'info.main';
  return 'error.main';
};

const TodoList = ({ onFloatingMode }) => {
  const { todos, loading, error, addTodo, updateTodo, deleteTodo, toggleTodo } = useTodo();
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newTodos, setNewTodos] = useState({}); // 각 날짜별로 별도의 입력 상태 관리
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;
  const isMaster = isMasterUser(currentUser);
  
  // 드래그 및 리사이즈 상태
  const [dialogPosition, setDialogPosition] = useState(() => {
    const saved = localStorage.getItem('todoList_full_position');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { x: 50, y: 50 };
      }
    }
    return { x: 50, y: 50 };
  });
  const [dialogSize, setDialogSize] = useState(() => {
    const saved = localStorage.getItem('todoList_full_size');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { width: window.innerWidth - 100, height: window.innerHeight - 100 };
      }
    }
    return { width: window.innerWidth - 100, height: window.innerHeight - 100 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const resizeHandleRef = useRef(null);

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
  }, [userId, isMaster]);

  // TodoContext에서 todos 데이터를 가져오므로 별도 쿼리 불필요
  // 마스터 계정의 경우 selectedUser에 따른 필터링은 UI에서 처리

  // 일자별 그룹핑
  const grouped = todos.reduce((acc, todo) => {
    const date = todo.date || (todo.createdAt && todo.createdAt.toDate ? todo.createdAt.toDate().toISOString().slice(0, 10) : new Date(todo.createdAt).toISOString().slice(0, 10));
    if (!acc[date]) acc[date] = [];
    acc[date].push(todo);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  
  console.log('투두 그룹핑 결과:', grouped);
  console.log('정렬된 날짜:', sortedDates);

  // 미해결 항목 가져오기 (전날 미완료 항목들)
  const getUnresolvedTodos = () => {
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    return todos.filter(todo => {
      const todoDate = todo.date || (todo.createdAt && todo.createdAt.toDate ? todo.createdAt.toDate().toISOString().slice(0, 10) : new Date(todo.createdAt).toISOString().slice(0, 10));
      return todoDate === yesterday && !todo.completed;
    });
  };

  // 미해결 항목을 오늘로 carry over
  const handleCarryOverUnresolved = async () => {
    const unresolvedTodos = getUnresolvedTodos();
    if (unresolvedTodos.length === 0) {
      alert('이월할 미해결 항목이 없습니다.');
      return;
    }

    const targetUserId = isMaster && selectedUser ? selectedUser : userId;
    const today = format(new Date(), 'yyyy-MM-dd');

    try {
      for (const todo of unresolvedTodos) {
        await addDoc(collection(db, collections.todos), {
          text: todo.text,
          completed: false,
          userId: targetUserId,
          date: today,
          createdAt: new Date(),
          carriedOver: true
        });
      }
      alert(`${unresolvedTodos.length}개의 미해결 항목이 오늘 투두리스트로 이월되었습니다.`);
    } catch (error) {
      console.error('미해결 항목 이월 오류:', error);
      alert('미해결 항목 이월 중 오류가 발생했습니다.');
    }
  };

  // 투두 추가
  const handleAddTodo = async (date) => {
    const todoText = newTodos[date] || '';
    if (!todoText.trim()) return;
    
    console.log('투두 추가 시도:', {
      text: todoText.trim(),
      date: date
    });
    
    try {
      await addTodo(todoText.trim(), date);
      
      console.log('투두 추가 성공');
      // 해당 날짜의 입력창 초기화
      setNewTodos(prev => ({
        ...prev,
        [date]: ''
      }));
      
      // 성공 알림 (선택사항)
      // alert('할 일이 추가되었습니다!');
    } catch (error) {
      console.error('투두 추가 오류:', error);
      alert('할 일 추가 중 오류가 발생했습니다.');
    }
  };

  // 투두 삭제
  const handleDeleteTodo = async (id) => {
    try {
      await deleteTodo(id);
    } catch (error) {
      console.error('투두 삭제 오류:', error);
    }
  };

  // 투두 상태 변경
  const handleToggleTodo = async (id) => {
    try {
      const todo = todos.find(t => t.id === id);
      await toggleTodo(id, !todo.completed);
    } catch (error) {
      console.error('투두 상태 변경 오류:', error);
    }
  };

  // 투두 편집
  const handleEditTodo = (id) => {
    const todo = todos.find((t) => t.id === id);
    setEditingId(id);
    setEditText(todo.text);
  };

  // 투두 저장
  const handleSaveEdit = async (id) => {
    try {
      await updateTodo(id, { text: editText });
      setEditingId(null);
      setEditText('');
    } catch (error) {
      console.error('투두 수정 오류:', error);
    }
  };

  // 엑셀 다운로드 기능
  const handleExcelDownload = () => {
    let rows = [];
    sortedDates.forEach(date => {
      grouped[date].forEach(todo => {
        rows.push({
          날짜: date,
          내용: todo.text,
          상태: todo.completed ? '완료' : (todo.planned ? '계획' : '미완료'),
          담당자: todo.userName || '',
          이월여부: todo.carriedOver ? '이월' : '신규',
        });
      });
    });
    if (rows.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ToDo리스트');
    XLSX.writeFile(wb, isMaster ? '전체_ToDo리스트.xlsx' : '내_ToDo리스트.xlsx');
  };

  // 현재 표시 중인 사용자 정보
  const getCurrentDisplayUser = () => {
    if (!isMaster || !selectedUser) return '내 투두리스트';
    const user = allUsers.find(u => u.id === selectedUser);
    return user ? (user.displayName || user.email) : '알 수 없는 사용자';
  };

  // 미해결 항목 수 계산
  const unresolvedCount = getUnresolvedTodos().length;

  // 드래그 및 리사이즈 핸들러
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('button, input, textarea, [role="button"], .resize-handle')) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - dialogPosition.x,
      y: e.clientY - dialogPosition.y
    });
  }, [dialogPosition]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      const maxX = window.innerWidth - dialogSize.width;
      const maxY = window.innerHeight - dialogSize.height;
      
      setDialogPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      const newWidth = Math.max(600, Math.min(window.innerWidth - 50, resizeStart.width + deltaX));
      const newHeight = Math.max(400, Math.min(window.innerHeight - 50, resizeStart.height + deltaY));
      
      setDialogSize({ width: newWidth, height: newHeight });
      
      const maxX = window.innerWidth - newWidth;
      const maxY = window.innerHeight - newHeight;
      
      setDialogPosition(prev => ({
        x: Math.min(prev.x, maxX),
        y: Math.min(prev.y, maxY)
      }));
    }
  }, [isDragging, isResizing, dragStart, resizeStart, dialogSize]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDialogPosition(prev => {
        localStorage.setItem('todoList_full_position', JSON.stringify(prev));
        return prev;
      });
    }
    if (isResizing) {
      setIsResizing(false);
      setDialogSize(prev => {
        localStorage.setItem('todoList_full_size', JSON.stringify(prev));
        return prev;
      });
    }
  }, [isDragging, isResizing]);

  const handleResizeStart = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: dialogSize.width,
      height: dialogSize.height
    });
  }, [dialogSize]);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleMouseMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleMouseMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

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
    <Dialog
      open={true}
      maxWidth={false}
      PaperProps={{
        ref: containerRef,
        sx: {
          position: 'fixed',
          left: `${dialogPosition.x}px`,
          top: `${dialogPosition.y}px`,
          width: `${dialogSize.width}px`,
          height: `${dialogSize.height}px`,
          maxWidth: 'none',
          maxHeight: 'none',
          m: 0,
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'default',
        }
      }}
      BackdropProps={{
        sx: { backgroundColor: 'rgba(0,0,0,0.5)', pointerEvents: 'none' }
      }}
      disableEscapeKeyDown={true}
      onClose={() => {}}
      slotProps={{
        backdrop: {
          onClick: (e) => {
            e.stopPropagation();
            e.preventDefault();
          },
          sx: {
            pointerEvents: 'none'
          }
        }
      }}
    >
      <DialogTitle
        ref={headerRef}
        onMouseDown={(e) => {
          // 버튼이나 입력 요소가 아닌 경우에만 드래그 시작
          const target = e.target;
          if (target.closest('button, input, textarea, [role="button"], .MuiIconButton-root, .MuiButton-root')) {
            return;
          }
          e.preventDefault();
          handleMouseDown(e);
        }}
        onTouchStart={(e) => {
          // 버튼이나 입력 요소가 아닌 경우에만 드래그 시작
          const target = e.target;
          if (target.closest('button, input, textarea, [role="button"], .MuiIconButton-root, .MuiButton-root')) {
            return;
          }
          e.preventDefault();
          handleMouseDown(e);
        }}
        sx={{
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          bgcolor: 'primary.main',
          color: 'white',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          '& button': {
            display: 'none !important', // 모든 버튼 숨기기 (기본 닫기 버튼 포함)
          },
          '& .MuiIconButton-root': {
            display: 'inline-flex !important', // 우리가 추가한 IconButton은 표시
          }
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          📋 전체 ToDo 리스트
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <IconButton
            size="small"
            onClick={() => window.history.back()}
            sx={{ 
              color: 'white',
              display: 'inline-flex !important' // 명시적으로 표시
            }}
            title="닫기"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
          {/* 마스터 계정용 사용자 선택 */}
          {isMaster && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: '#fff' }}>
                {getCurrentDisplayUser()}
              </Typography>
              <TextField
                select
                size="small"
                value={selectedUser || ''}
                onChange={(e) => setSelectedUser(e.target.value)}
                sx={{ 
                  minWidth: 150, 
                  bgcolor: 'rgba(255,255,255,0.9)',
                  borderRadius: 1,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: 'rgba(255,255,255,0.3)',
                    },
                  }
                }}
              >
                <option value="">내 투두리스트</option>
                {allUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.displayName || user.email}
                  </option>
                ))}
              </TextField>
            </Box>
          )}
          <Button
            variant="contained"
            color="warning"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleCarryOverUnresolved}
            sx={{ 
              bgcolor: '#ff9800',
              color: '#fff',
              '&:hover': {
                bgcolor: '#f57c00'
              }
            }}
          >
            미해결 이월 ({unresolvedCount})
          </Button>
          <Button 
            variant="contained" 
            size="small"
            onClick={handleExcelDownload}
            startIcon={<ExpandIcon />}
            sx={{ 
              bgcolor: '#4caf50',
              color: '#fff',
              '&:hover': {
                bgcolor: '#388e3c'
              }
            }}
          >
            엑셀 다운로드
          </Button>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, m: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100% - 64px)' }}>
        <Box sx={{ 
          flex: 1,
          overflowY: 'auto',
          p: 3, 
          background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
          position: 'relative'
        }}>
          {/* 블랙보드 배경 효과 */}
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(120, 219, 255, 0.3) 0%, transparent 50%)',
            pointerEvents: 'none'
          }} />

          {/* 미해결 항목 알림 */}
          {unresolvedCount > 0 && (
            <Box sx={{ 
              mb: 3, 
              p: 2, 
              bgcolor: 'rgba(255, 193, 7, 0.9)', 
              borderRadius: 2, 
              border: '2px solid #ffc107',
              position: 'relative',
              zIndex: 1,
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
            }}>
              <Typography variant="body2" sx={{ color: '#e65100', fontWeight: 600 }}>
                📋 전날 미완료된 {unresolvedCount}개의 항목이 있습니다. 
                <Button 
                  size="small" 
                  variant="contained"
                  color="warning" 
                  onClick={handleCarryOverUnresolved}
                  sx={{ ml: 1, textTransform: 'none', bgcolor: '#ff9800' }}
                >
                  오늘로 이월하기
                </Button>
              </Typography>
            </Box>
          )}

          {sortedDates.length === 0 && (
            <Typography color="rgba(255,255,255,0.8)" sx={{ textAlign: 'center', py: 4, position: 'relative', zIndex: 1 }}>
              할 일이 없습니다.
            </Typography>
          )}
          
          {/* 포스트잇 그리드 */}
          {sortedDates.length > 0 && (
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
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 2,
                pb: 1,
                borderBottom: '2px solid rgba(0,0,0,0.1)'
              }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 700, 
                  color: '#333',
                  fontSize: '1.1rem'
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
                      fontWeight: 600
                    }}
                  />
                )}
              </Box>

              {/* 투두 추가 입력 */}
              <Box sx={{ display: 'flex', mb: 2, gap: 1 }}>
                <TextField
                  size="small"
                  placeholder="할 일 추가"
                  value={newTodos[date] || ''}
                  onChange={(e) => setNewTodos(prev => ({
                    ...prev,
                    [date]: e.target.value
                  }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddTodo(date);
                    }
                  }}
                  sx={{ 
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(255,255,255,0.8)',
                      '& fieldset': {
                        borderColor: 'rgba(0,0,0,0.2)',
                      },
                    }
                  }}
                />
                <IconButton 
                  size="small" 
                  onClick={() => handleAddTodo(date)}
                  sx={{ 
                    bgcolor: '#4caf50',
                    color: '#fff',
                    '&:hover': { bgcolor: '#388e3c' }
                  }}
                >
                  <AddIcon />
                </IconButton>
              </Box>

              {/* 투두 리스트 */}
              <Box sx={{ 
                flex: 1, 
                overflowY: 'auto',
                pr: 1,
                '&::-webkit-scrollbar': {
                  width: '6px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'rgba(0,0,0,0.1)',
                  borderRadius: '3px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '3px',
                },
              }}>
                {grouped[date] && grouped[date].length > 0 ? (
                  grouped[date].map(todo => (
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
                    <IconButton
                      size="small"
                      onClick={() => handleToggleTodo(todo.id)}
                      sx={{ 
                        color: todo.completed ? '#4caf50' : '#666',
                        p: 0.5
                      }}
                    >
                      {todo.completed ? <CheckCircleIcon /> : <CancelIcon />}
                    </IconButton>
                    
                    {editingId === todo.id ? (
                      <TextField
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        size="small"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(todo.id);
                        }}
                        autoFocus
                        sx={{ 
                          flex: 1,
                          '& .MuiOutlinedInput-root': {
                            bgcolor: 'rgba(255,255,255,0.9)',
                          }
                        }}
                      />
                    ) : (
                      <Typography
                        sx={{ 
                          flex: 1, 
                          fontSize: '0.9rem',
                          color: todo.completed ? '#666' : '#333', 
                          textDecoration: todo.completed ? 'line-through' : 'none',
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'rgba(0,0,0,0.05)',
                            borderRadius: 1,
                            px: 0.5
                          }
                        }}
                        onDoubleClick={() => handleEditTodo(todo.id)}
                      >
                        {todo.text}
                      </Typography>
                    )}
                    
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      {todo.carriedOver && (
                        <Chip 
                          label="이월" 
                          size="small" 
                          color="warning" 
                          sx={{ 
                            fontSize: '0.6rem', 
                            height: 18,
                            bgcolor: '#ff9800',
                            color: '#fff'
                          }} 
                        />
                      )}
                      {editingId === todo.id ? (
                        <IconButton 
                          size="small" 
                          onClick={() => handleSaveEdit(todo.id)}
                          sx={{ color: '#4caf50' }}
                        >
                          <CheckIcon />
                        </IconButton>
                      ) : (
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditTodo(todo.id)}
                          sx={{ color: '#666' }}
                        >
                          <EditIcon />
                        </IconButton>
                      )}
                      <IconButton 
                        size="small" 
                        onClick={() => handleDeleteTodo(todo.id)}
                        sx={{ color: '#f44336' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                ))
                ) : (
                  <Typography sx={{ 
                    textAlign: 'center', 
                    color: '#666', 
                    py: 4,
                    fontSize: '0.9rem'
                  }}>
                    할 일이 없습니다.
                  </Typography>
                )}
              </Box>

              {/* 통계 */}
              <Box sx={{ 
                mt: 2, 
                pt: 1, 
                borderTop: '1px solid rgba(0,0,0,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Typography variant="caption" sx={{ color: '#666' }}>
                  완료: {(grouped[date] || []).filter(t => t.completed).length} / {(grouped[date] || []).length}
                </Typography>
                <Typography variant="caption" sx={{ color: '#666' }}>
                  진행률: {(grouped[date] || []).length > 0 ? Math.round(((grouped[date] || []).filter(t => t.completed).length / (grouped[date] || []).length) * 100) : 0}%
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
            </Grid>
          )}
        </Box>
      </DialogContent>
      
      {/* 리사이즈 핸들 */}
      <Box
        ref={resizeHandleRef}
        onMouseDown={handleResizeStart}
        className="resize-handle"
        sx={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '20px',
          height: '20px',
          cursor: 'nwse-resize',
          bgcolor: 'rgba(0,0,0,0.1)',
          borderTop: '2px solid rgba(0,0,0,0.3)',
          borderLeft: '2px solid rgba(0,0,0,0.3)',
          zIndex: 1,
          '&:hover': {
            bgcolor: 'rgba(0,0,0,0.2)',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            width: '8px',
            height: '8px',
            borderRight: '2px solid rgba(0,0,0,0.5)',
            borderBottom: '2px solid rgba(0,0,0,0.5)',
          }
        }}
      />
    </Dialog>
  );
};

export default TodoList; 
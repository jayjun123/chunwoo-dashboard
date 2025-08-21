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
  Chip,
  Grid,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { collection, query, onSnapshot, where, addDoc, getDocs, orderBy, updateDoc, deleteDoc, doc } from 'firebase/firestore';
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
  const [newTodo, setNewTodo] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;
  const isMaster = currentUser?.email === 'fire8803@naver.com' || userId === 'HpF5IrlTscYbWPsUhtdzV05sjbF2';

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

  useEffect(() => {
    if (!userId) return;
    
    let q;
    const targetUserId = isMaster && selectedUser ? selectedUser : userId;
    
    if (isMaster && selectedUser) {
      // 마스터 계정이 특정 사용자 선택 시
      q = query(
        collection(db, collections.todos),
        where('userId', '==', targetUserId),
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
      setTodos(data);
    });
    
    return () => unsubscribe();
  }, [userId, isMaster, selectedUser]);

  // 일자별 그룹핑
  const grouped = todos.reduce((acc, todo) => {
    const date = todo.date || (todo.createdAt && todo.createdAt.toDate ? todo.createdAt.toDate().toISOString().slice(0, 10) : new Date(todo.createdAt).toISOString().slice(0, 10));
    if (!acc[date]) acc[date] = [];
    acc[date].push(todo);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

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
    if (!newTodo.trim()) return;
    
    const targetUserId = isMaster && selectedUser ? selectedUser : userId;
    
    try {
      await addDoc(collection(db, collections.todos), {
        text: newTodo.trim(),
        completed: false,
        userId: targetUserId,
        date: date,
        createdAt: new Date(),
        carriedOver: false
      });
      setNewTodo('');
    } catch (error) {
      console.error('투두 추가 오류:', error);
    }
  };

  // 투두 삭제
  const handleDeleteTodo = async (id) => {
    try {
      await deleteDoc(doc(db, collections.todos, id));
    } catch (error) {
      console.error('투두 삭제 오류:', error);
    }
  };

  // 투두 상태 변경
  const handleToggleTodo = async (id) => {
    try {
      const todo = todos.find(t => t.id === id);
      await updateDoc(doc(db, collections.todos, id), {
        completed: !todo.completed
      });
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
      await updateDoc(doc(db, collections.todos, id), {
        text: editText
      });
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
    <Box sx={{ 
      p: 3, 
      minHeight: '100vh',
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

      {/* 헤더 */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 3, 
        gap: 2, 
        flexWrap: 'wrap',
        position: 'relative',
        zIndex: 1
      }}>
        <Typography variant="h4" sx={{ 
          fontWeight: 700, 
          color: '#fff',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
        }}>
          📋 전체 ToDo 리스트
        </Typography>
        
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
        
        {/* 미해결 버튼 */}
        <Button
          variant="contained"
          color="warning"
          startIcon={<RefreshIcon />}
          onClick={handleCarryOverUnresolved}
          sx={{ 
            bgcolor: '#ff9800',
            color: '#fff',
            '&:hover': {
              bgcolor: '#f57c00'
            },
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
          }}
        >
          미해결 이월 ({unresolvedCount})
        </Button>
        
        <Button 
          variant="contained" 
          onClick={handleExcelDownload}
          sx={{ 
            bgcolor: '#4caf50',
            color: '#fff',
            '&:hover': {
              bgcolor: '#388e3c'
            },
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
          }}
        >
          엑셀 다운로드
        </Button>
      </Box>

      {/* 미해결 항목이 있을 때 알림 */}
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
        <Typography color="rgba(255,255,255,0.8)" sx={{ textAlign: 'center', py: 4 }}>
          할 일이 없습니다.
        </Typography>
      )}
      
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
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
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
                ))}
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
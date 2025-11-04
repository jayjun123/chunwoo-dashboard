import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Chip,
  TextField,
  Grid,
} from '@mui/material';
import {
  Close as CloseIcon,
  PushPin as PushPinIcon,
  PushPinOutlined as PushPinOutlinedIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  CalendarToday as CalendarIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import TodoList from './TodoList';
import { useTodo } from '../contexts/TodoContext';
import { useAuth } from '../contexts/AuthContext';
import { isMasterUser } from '../utils/masterUtils';
import { collection, addDoc } from 'firebase/firestore';
import { db, collections } from '../firebase';
import * as XLSX from 'xlsx';
import { format, subDays, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

const STORAGE_KEY = 'todoList_pinned';
const POSITION_STORAGE_KEY = 'todoList_position';
const SIZE_STORAGE_KEY = 'todoList_size';

const FloatingTodoList = ({ onClose }) => {
  const { todos, toggleTodo, addTodo } = useTodo();
  const { currentUser } = useAuth();
  const isMaster = isMasterUser(currentUser);
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'true';
  });
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem(POSITION_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { x: 100, y: 100 };
      }
    }
    return { x: 100, y: 100 };
  });
  const [size, setSize] = useState(() => {
    const saved = localStorage.getItem(SIZE_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { width: 400, height: 600 };
      }
    }
    return { width: 400, height: 600 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const resizeHandleRef = useRef(null);
  
  // 선택된 날짜 상태 (기본값: 오늘)
  const [selectedDate, setSelectedDate] = useState(() => {
    return format(new Date(), 'yyyy-MM-dd');
  });
  
  // 새 투두 입력 상태
  const [newTodoInput, setNewTodoInput] = useState('');
  
  // 투두 추가 함수
  const handleAddTodo = async () => {
    if (!newTodoInput.trim()) return;
    
    try {
      await addTodo(newTodoInput.trim(), selectedDate);
      setNewTodoInput('');
    } catch (error) {
      console.error('투두 추가 오류:', error);
      alert('할 일 추가 중 오류가 발생했습니다.');
    }
  };

  // 일자별 그룹핑
  const grouped = todos.reduce((acc, todo) => {
    const date = todo.date || (todo.createdAt && todo.createdAt.toDate ? todo.createdAt.toDate().toISOString().slice(0, 10) : new Date(todo.createdAt).toISOString().slice(0, 10));
    if (!acc[date]) acc[date] = [];
    acc[date].push(todo);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  
  // 선택된 날짜의 투두만 필터링
  const filteredTodos = grouped[selectedDate] || [];
  
  // 정렬: 미완료 항목을 위로, 완료된 항목을 아래로
  const sortedTodos = [...filteredTodos].sort((a, b) => {
    if (a.completed && !b.completed) return 1; // a가 완료되고 b가 미완료면 a를 뒤로
    if (!a.completed && b.completed) return -1; // a가 미완료되고 b가 완료면 a를 앞으로
    return 0; // 같은 상태면 순서 유지
  });

  // 미해결 항목 가져오기 (전날 미완료 항목들)
  const getUnresolvedTodos = () => {
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    return todos.filter(todo => {
      const todoDate = todo.date || (todo.createdAt && todo.createdAt.toDate ? todo.createdAt.toDate().toISOString().slice(0, 10) : new Date(todo.createdAt).toISOString().slice(0, 10));
      return todoDate === yesterday && !todo.completed;
    });
  };

  // 미해결 항목 수 계산
  const unresolvedCount = getUnresolvedTodos().length;

  // 미해결 항목을 오늘로 carry over (불러오기) - 중복 방지
  const handleCarryOverUnresolved = async () => {
    const unresolvedTodos = getUnresolvedTodos();
    if (unresolvedTodos.length === 0) {
      alert('이월할 미해결 항목이 없습니다.');
      return;
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const userId = currentUser?.uid;
    
    // 오늘 날짜의 기존 투두 텍스트 목록
    const todayTodos = todos.filter(todo => {
      const todoDate = todo.date || (todo.createdAt && todo.createdAt.toDate ? todo.createdAt.toDate().toISOString().slice(0, 10) : new Date(todo.createdAt).toISOString().slice(0, 10));
      return todoDate === today;
    });
    const existingTexts = new Set(todayTodos.map(t => t.text.toLowerCase().trim()));

    try {
      let addedCount = 0;
      for (const todo of unresolvedTodos) {
        // 중복 체크: 같은 텍스트가 이미 오늘 날짜에 있는지 확인
        const todoText = todo.text.toLowerCase().trim();
        if (!existingTexts.has(todoText)) {
          await addDoc(collection(db, collections.todos), {
            text: todo.text,
            completed: false,
            userId: userId,
            date: today,
            createdAt: new Date(),
            carriedOver: true
          });
          existingTexts.add(todoText); // 추가한 항목도 중복 체크에 포함
          addedCount++;
        }
      }
      if (addedCount > 0) {
        alert(`${addedCount}개의 미해결 항목이 오늘 투두리스트로 이월되었습니다.`);
      } else {
        alert('이월할 항목이 이미 오늘 투두리스트에 있습니다.');
      }
    } catch (error) {
      console.error('미해결 항목 이월 오류:', error);
      alert('미해결 항목 이월 중 오류가 발생했습니다.');
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

  // 고정 토글
  const handleTogglePin = () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    localStorage.setItem(STORAGE_KEY, String(newPinned));
  };

  // 드래그 시작
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('button, input, textarea, [role="button"], .resize-handle')) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  }, [position]);

  // 드래그 중
  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // 화면 경계 체크 (동적 크기 고려)
      const maxX = window.innerWidth - size.width;
      const maxY = window.innerHeight - size.height;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      const newWidth = Math.max(300, Math.min(800, resizeStart.width + deltaX));
      const newHeight = Math.max(300, Math.min(window.innerHeight - 100, resizeStart.height + deltaY));
      
      setSize({ width: newWidth, height: newHeight });
      
      // 크기 변경 시 위치도 조정 (화면 밖으로 나가지 않도록)
      const maxX = window.innerWidth - newWidth;
      const maxY = window.innerHeight - newHeight;
      
      setPosition(prev => ({
        x: Math.min(prev.x, maxX),
        y: Math.min(prev.y, maxY)
      }));
    }
  }, [isDragging, isResizing, dragStart, resizeStart, size]);

  // 드래그 종료
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setPosition(prev => {
        localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(prev));
        return prev;
      });
    }
    if (isResizing) {
      setIsResizing(false);
      setSize(prev => {
        localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(prev));
        return prev;
      });
    }
  }, [isDragging, isResizing]);

  // 리사이즈 시작
  const handleResizeStart = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
  }, [size]);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, size]);

  // 포스트잇 색상 배열
  const postItColors = [
    '#fff9c4', '#fffde7', '#fff8e1', '#fff3e0', '#fafafa', '#f5f5f5',
  ];

  return (
    <Paper
      ref={containerRef}
      elevation={24}
      sx={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'default',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      {/* 헤더 - 드래그 가능 */}
      <Box
        ref={headerRef}
        onMouseDown={handleMouseDown}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 0.75,
          bgcolor: 'primary.main',
          color: 'white',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
            📋 ToDo 리스트
          </Typography>
          <TextField
            type="date"
            size="small"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255,255,255,0.9)',
                color: '#333',
                fontSize: '1rem',
                height: '32px',
                '& fieldset': {
                  borderColor: 'rgba(255,255,255,0.5)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255,255,255,0.7)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'rgba(255,255,255,0.9)',
                },
              },
              width: '140px',
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={handleTogglePin}
            sx={{ color: isPinned ? 'warning.main' : 'white' }}
            title={isPinned ? '고정 해제' : '고정하기'}
          >
            {isPinned ? (
              <PushPinIcon fontSize="small" />
            ) : (
              <PushPinOutlinedIcon fontSize="small" />
            )}
          </IconButton>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ color: 'white' }}
            title="닫기"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* 내용 */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          bgcolor: 'background.paper',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(0,0,0,0.1)',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '3px',
          },
        }}
      >
        {sortedTodos.length === 0 ? (
          <Typography sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            {format(parseISO(selectedDate), 'yyyy년 MM월 dd일', { locale: ko })}의 할 일이 없습니다.
          </Typography>
        ) : (
          <Paper
            elevation={2}
            sx={{
              p: 2,
              background: postItColors[0],
              border: '1px solid rgba(0,0,0,0.1)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#333', fontSize: '1.2rem' }}>
                {format(parseISO(selectedDate), 'yyyy년 MM월 dd일', { locale: ko })} ({sortedTodos.filter(t => t.completed).length}/{sortedTodos.length})
              </Typography>
              {selectedDate === format(new Date(), 'yyyy-MM-dd') && (
                <Chip label="오늘" size="small" color="primary" sx={{ height: 20 }} />
              )}
            </Box>
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 0.75,
                maxHeight: '380px', // 8개 항목이 보이도록 (각 항목 약 45px + gap 고려)
                overflowY: 'auto',
                '&::-webkit-scrollbar': {
                  display: 'none', // 스크롤바 숨기기 (Chrome, Safari, Edge)
                },
                scrollbarWidth: 'none', // 스크롤바 숨기기 (Firefox)
                msOverflowStyle: 'none', // 스크롤바 숨기기 (IE, Edge)
              }}
            >
              {sortedTodos.map(todo => (
                <Box
                  key={todo.id}
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await toggleTodo(todo.id, todo.completed);
                    } catch (error) {
                      console.error('투두 토글 오류:', error);
                    }
                  }}
                  sx={{
                    p: 0.75,
                    borderRadius: 1,
                    bgcolor: todo.completed ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255,255,255,0.5)',
                    border: todo.completed ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: todo.completed ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255,255,255,0.7)',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: todo.completed ? '#999' : '#333',
                      textDecoration: todo.completed ? 'line-through' : 'none',
                      fontSize: '1.1rem',
                      fontWeight: todo.completed ? 400 : 500,
                      pointerEvents: 'none', // Typography의 클릭 이벤트를 막아서 부모 Box의 클릭 이벤트가 동작하도록
                    }}
                  >
                    {todo.completed ? '✓' : '○'} {todo.text}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
              <Typography variant="caption" sx={{ color: '#666' }}>
                완료: {sortedTodos.filter(t => t.completed).length} / {sortedTodos.length}
              </Typography>
            </Box>
          </Paper>
        )}
      </Box>
      
      {/* 하단 입력 필드 */}
      <Box
        sx={{
          p: 1.5,
          borderTop: '1px solid rgba(0,0,0,0.1)',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="할 일 추가"
            value={newTodoInput}
            onChange={(e) => setNewTodoInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAddTodo();
              }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '1rem',
                '& fieldset': {
                  borderColor: 'rgba(0,0,0,0.2)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(0,0,0,0.3)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main',
                },
              },
            }}
          />
          <IconButton
            size="small"
            onClick={handleAddTodo}
            disabled={!newTodoInput.trim()}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
              '&:disabled': {
                bgcolor: 'rgba(0,0,0,0.12)',
                color: 'rgba(0,0,0,0.26)',
              },
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
      
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
    </Paper>
  );
};

export default FloatingTodoList;


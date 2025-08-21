import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { FiPlus, FiTrash2, FiEdit2, FiCheck, FiClock } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useTodo } from '../contexts/TodoContext';
import { useAuth } from '../contexts/AuthContext';
import ErrorBoundary from './common/ErrorBoundary';
import LoadingSpinner from './common/LoadingSpinner';
import '../styles/Todo.css';
import {
  ListItem,
  ListItemText,
  IconButton,
  Checkbox,
  TextField,
  Box,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';

const Todo = () => {
  const { todos, loading, error, addTodo, updateTodo, deleteTodo, toggleTodo } = useTodo();
  const { currentUser } = useAuth();
  const [newTodo, setNewTodo] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created');
  
  // 터치 관련 상태 관리
  const [touchStates, setTouchStates] = useState({});

  // 디버깅 로그 추가
  console.log('=== Todo 컴포넌트 상태 ===');
  console.log('currentUser?.uid:', currentUser?.uid);
  console.log('todos 개수:', todos.length);
  console.log('todos 데이터:', todos);
  console.log('loading:', loading);
  console.log('error:', error);

  // 필터링과 정렬을 로컬에서 처리
  const filteredAndSortedTodos = useMemo(() => {
    let filtered = [...todos];
    
    // 필터링
    if (filter === 'active') {
      filtered = filtered.filter(todo => !todo.completed);
    } else if (filter === 'completed') {
      filtered = filtered.filter(todo => todo.completed);
    }
    
    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
        case 'title':
          return a.text.localeCompare(b.text);
        case 'created':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });
    
    console.log('filteredAndSortedTodos 개수:', filtered.length);
    console.log('filteredAndSortedTodos 데이터:', filtered);
    
    return filtered;
  }, [todos, filter, sortBy]);

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    try {
      await addTodo(newTodo);
      setNewTodo('');
      toast.success('할 일이 추가되었습니다.');
    } catch (err) {
      toast.error('할 일 추가 중 오류가 발생했습니다.');
    }
  };

  const handleUpdateTodo = async (id, updates) => {
    try {
      await updateTodo(id, updates);
      setEditingId(null);
      toast.success('할 일이 수정되었습니다.');
    } catch (err) {
      toast.error('할 일 수정 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteTodo = async (id) => {
    try {
      await deleteTodo(id);
      toast.success('할 일이 삭제되었습니다.');
    } catch (err) {
      toast.error('할 일 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleToggleTodo = async (id, completed) => {
    try {
      await toggleTodo(id, completed);
    } catch (err) {
      toast.error('할 일 상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(filteredAndSortedTodos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // 드래그 앤 드롭 순서 변경은 현재 구현에서 제외 (복잡성 때문)
    toast.info('순서 변경 기능은 현재 지원되지 않습니다.');
  };

  // 터치 이벤트 핸들러
  const handleTouchStart = (todoId, e) => {
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
      [todoId]: newTouchState
    }));
    
    // 전역 상태로도 저장
    window.touchStates = {
      ...window.touchStates,
      [todoId]: newTouchState
    };
    
    // 길게 누르기 타이머 설정 (1.5초)
    const timer = setTimeout(() => {
      setTouchStates(prev => ({
        ...prev,
        [todoId]: { ...prev[todoId], isLongPress: true }
      }));
      
      window.touchStates = {
        ...window.touchStates,
        [todoId]: { ...window.touchStates[todoId], isLongPress: true }
      };
      
      e.target.style.transform = 'scale(1.05)';
      e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    }, 1500);
    
    setTouchStates(prev => ({
      ...prev,
      [todoId]: { ...prev[todoId], timer }
    }));
  };

  const handleTouchMove = (todoId, e) => {
    e.stopPropagation();
    const touchState = touchStates[todoId];
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
        [todoId]: { ...prev[todoId], isLongPress: false, timer: null, isScrolling: true }
      }));
      
      window.touchStates = {
        ...window.touchStates,
        [todoId]: { ...window.touchStates[todoId], isLongPress: false, timer: null, isScrolling: true }
      };
      
      e.target.style.transform = '';
      e.target.style.boxShadow = '';
    }
  };

  const handleTouchEnd = (todoId, e) => {
    e.stopPropagation();
    const touchState = touchStates[todoId];
    
    if (touchState && touchState.timer) {
      clearTimeout(touchState.timer);
    }
    
    // 길게 누르지 않았고 스크롤하지 않았으면 클릭 이벤트 처리
    if (!touchState?.isLongPress && !touchState?.isScrolling && touchState?.startTime && (Date.now() - touchState.startTime) < 1500) {
      handleToggleTodo(todoId, !filteredAndSortedTodos.find(t => t.id === todoId)?.completed);
    }
    
    // 상태 초기화
    setTouchStates(prev => {
      const newStates = { ...prev };
      delete newStates[todoId];
      return newStates;
    });
    
    if (window.touchStates) {
      delete window.touchStates[todoId];
    }
    
    e.target.style.transform = '';
    e.target.style.boxShadow = '';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="error-container">
        <FiAlertCircle className="error-icon" />
        <h3>데이터를 불러오는 중 오류가 발생했습니다.</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="todo-container">
        <div className="todo-header">
          <h1>할 일 관리</h1>
          <div className="todo-filters">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">전체</option>
              <option value="active">진행중</option>
              <option value="completed">완료</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="created">생성일순</option>
              <option value="updated">수정일순</option>
              <option value="title">제목순</option>
            </select>
          </div>
        </div>

        <form onSubmit={handleAddTodo} className="todo-form">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="새로운 할 일을 입력하세요"
            className="todo-input"
          />
          <button type="submit" className="add-button">
            <FiPlus /> 추가
          </button>
        </form>

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
          onDragEnd={handleDragEnd}
        >
          <Droppable droppableId="todos">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="todo-list"
              >
                {filteredAndSortedTodos.map((todo, index) => (
                  <Draggable
                    key={todo.id}
                    draggableId={todo.id.toString()}
                    index={index}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`todo-item ${todo.completed ? 'completed' : ''}`}
                        style={{ marginBottom: 0, ...provided.draggableProps.style }}
                        onTouchStart={(e) => handleTouchStart(todo.id, e)}
                        onTouchMove={(e) => handleTouchMove(todo.id, e)}
                        onTouchEnd={(e) => handleTouchEnd(todo.id, e)}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // 터치 이벤트가 아닌 경우에만 클릭 처리
                          if (!touchStates[todo.id]?.startTime || touchStates[todo.id]?.isScrolling) {
                            return; // 스크롤 중이면 클릭 무시
                          }
                          handleToggleTodo(todo.id, !todo.completed);
                        }}
                      >
                        {editingId === todo.id ? (
                          <input
                            type="text"
                            defaultValue={todo.text}
                            onBlur={(e) => handleUpdateTodo(todo.id, { text: e.target.value })}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleUpdateTodo(todo.id, { text: e.target.value });
                              }
                            }}
                            autoFocus
                            className="edit-input"
                          />
                        ) : (
                          <>
                            <div className="todo-content">
                              <input
                                type="checkbox"
                                checked={todo.completed}
                                onChange={() => handleToggleTodo(todo.id, todo.completed)}
                                className="todo-checkbox"
                              />
                              <span className="todo-title">{todo.text}</span>
                            </div>
                            <div className="todo-meta">
                              <span className="todo-date">
                                <FiClock />
                                {format(new Date(todo.createdAt), 'yyyy년 MM월 dd일', { locale: ko })}
                              </span>
                              <div className="todo-actions">
                                <button
                                  onClick={() => setEditingId(todo.id)}
                                  className="edit-button"
                                >
                                  <FiEdit2 />
                                </button>
                                <button
                                  onClick={() => handleDeleteTodo(todo.id)}
                                  className="delete-button"
                                >
                                  <FiTrash2 />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                        <div className="todo-divider" />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <div className="todo-summary">
          <p>
            총 {filteredAndSortedTodos.length}개의 할 일 중 {filteredAndSortedTodos.filter(t => t.completed).length}개 완료
          </p>
          {filteredAndSortedTodos.length === 0 && (
            <div style={{ textAlign: 'center', color: '#666', marginTop: '20px', padding: '20px' }}>
              <p style={{ fontSize: '16px', marginBottom: '10px' }}>
                할 일이 없습니다
              </p>
              <p style={{ fontSize: '14px', color: '#999' }}>
                새로운 할 일을 추가해보세요!
              </p>
              {loading && <p style={{ fontSize: '12px', color: '#999' }}>로딩 중...</p>}
              {error && <p style={{ fontSize: '12px', color: '#f44336' }}>오류: {error}</p>}
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Todo; 
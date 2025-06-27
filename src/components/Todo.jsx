import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { FiPlus, FiTrash2, FiEdit2, FiCheck, FiClock } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useTodo } from '../contexts/TodoContext';
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
  const [newTodo, setNewTodo] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created');

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

        <DragDropContext onDragEnd={handleDragEnd}>
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
                                onChange={(e) => handleToggleTodo(todo.id, e.target.checked)}
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
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Todo; 
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
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db, collections } from '../firebase';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';

const statusColor = (completed, planned) => {
  if (completed) return 'success.main';
  if (planned) return 'info.main';
  return 'error.main';
};

const TodoList = () => {
  const [todos, setTodos] = useState([]);
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;
  const isMaster = currentUser?.email === 'fire8803@naver.com' || userId === 'HpF5IrlTscYbWPsUhtdzV05sjbF2';
  const [newTodo, setNewTodo] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    if (!userId) return;
    let q;
    if (isMaster) {
      q = query(collection(db, collections.todos));
    } else {
      q = query(collection(db, collections.todos), where('userId', '==', userId));
    }
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTodos(data);
    });
    return () => unsubscribe();
  }, [userId, isMaster]);

  // 일자별 그룹핑
  const grouped = todos.reduce((acc, todo) => {
    const date = todo.createdAt && todo.createdAt.toDate ? todo.createdAt.toDate() : new Date(todo.createdAt);
    const key = date.toISOString().slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(todo);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

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

  const handleAddTodo = () => {
    if (newTodo.trim()) {
      setTodos([
        ...todos,
        {
          id: Date.now(),
          text: newTodo.trim(),
          completed: false,
        },
      ]);
      setNewTodo('');
    }
  };

  const handleDeleteTodo = (id) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const handleToggleTodo = (id) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const handleEditTodo = (id) => {
    const todo = todos.find((t) => t.id === id);
    setEditingId(id);
    setEditText(todo.text);
  };

  const handleSaveEdit = (id) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, text: editText } : todo
      )
    );
    setEditingId(null);
    setEditText('');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <Typography variant="h5">전체 ToDo 리스트</Typography>
        <Button variant="outlined" onClick={handleExcelDownload}>
          엑셀 다운로드
        </Button>
      </Box>
      {sortedDates.length === 0 && (
        <Typography color="text.secondary">할 일이 없습니다.</Typography>
      )}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {sortedDates.map(date => (
          <Paper key={date} sx={{ minWidth: 260, maxWidth: 320, p: 2, flex: '1 1 260px' }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>{date.replace(/-/g, '.')} ToDo</Typography>
            {grouped[date].map(todo => (
              <Box key={todo.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {todo.completed ? <CheckCircleIcon color="success" /> : <CancelIcon color="error" />}
                <Typography sx={{ flex: 1, textDecoration: todo.completed ? 'line-through' : 'none' }}>{todo.text}</Typography>
                <Typography variant="caption" sx={{ color: statusColor(todo.completed, todo.planned) }}>
                  {todo.completed ? '완료' : (todo.planned ? '계획' : '미완료')}
                </Typography>
              </Box>
            ))}
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

export default TodoList; 
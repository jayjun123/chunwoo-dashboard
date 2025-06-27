import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  TextField,
  Button,
  Collapse,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WeatherWidget from './weather/WeatherWidget';

const Dashboard = () => {
  const theme = useTheme();
  const [expandedSection, setExpandedSection] = useState(null);
  const [todos, setTodos] = useState([
    { id: 1, text: '안전점검 실시', completed: false, time: '오늘 14:00' },
    { id: 2, text: '기성청구서 작성', completed: false, time: '내일 10:00' },
    { id: 3, text: '협력업체 미팅', completed: true, time: '내일 15:00' },
  ]);
  const [newTodo, setNewTodo] = useState('');

  const handleSectionClick = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleAddTodo = () => {
    if (newTodo.trim()) {
      setTodos([...todos, {
        id: Date.now(),
        text: newTodo,
        completed: false,
        time: '새로운 일정'
      }]);
      setNewTodo('');
    }
  };

  const handleToggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const handleDeleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={3}>
        {/* 왼쪽: 날씨 정보 */}
        <Grid item sx={{ width: { xs: '100%', md: '25%' } }}>
          <Paper
            sx={{
              width: '100%',
              minWidth: 0,
              maxWidth: '100%',
              boxSizing: 'border-box',
              p: 0,
              m: 0,
              background: 'none',
              boxShadow: 'none'
            }}
          >
            <WeatherWidget />
          </Paper>
        </Grid>

        {/* 중앙: 현장 현황 */}
        <Grid item sx={{ width: { xs: '100%', md: '50%' } }}>
          <Paper 
            sx={{ 
              p: 2,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' }
            }}
            onClick={() => handleSectionClick('sites')}
          >
            <Collapse in={expandedSection === 'sites'}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>상세 현황</Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="주요현장" 
                      secondary="A현장: 장비점검, B현장: 안전교육" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="이달 기성현황" 
                      secondary="예정: 5개, 확정: 3개, 완료: 2개" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="안전보고" 
                      secondary="C현장: 장비점검 완료, D현장: 안전교육 진행" 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="협의하기" 
                      secondary="E현장: 새글 2개, F현장: 새글 1개" 
                    />
                  </ListItem>
                </List>
              </Box>
            </Collapse>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">주요현장</Typography>
              {expandedSection === 'sites' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </Box>
            <Grid container spacing={2}>
              <Grid item sx={{ width: { xs: '50%' } }}>
                <Paper sx={{ p: 2, bgcolor: theme.palette.primary.light }}>
                  <Typography variant="subtitle2">금일현장</Typography>
                  <Typography variant="h4">12개</Typography>
                </Paper>
              </Grid>
              <Grid item sx={{ width: { xs: '50%' } }}>
                <Paper sx={{ p: 2, bgcolor: theme.palette.secondary.light }}>
                  <Typography variant="subtitle2">3월 기성현황</Typography>
                  <Typography variant="h4">8개</Typography>
                </Paper>
              </Grid>
              <Grid item sx={{ width: { xs: '50%' } }}>
                <Paper sx={{ p: 2, bgcolor: theme.palette.success.light }}>
                  <Typography variant="subtitle2">금일안전보고</Typography>
                  <Typography variant="h4">5개</Typography>
                </Paper>
              </Grid>
              <Grid item sx={{ width: { xs: '50%' } }}>
                <Paper sx={{ p: 2, bgcolor: theme.palette.info.light }}>
                  <Typography variant="subtitle2">협의 새글</Typography>
                  <Typography variant="h4">3개</Typography>
                </Paper>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* 오른쪽: ToDoList */}
        <Grid item sx={{ width: { xs: '100%', md: '25%' } }}>
          <Paper 
            sx={{ 
              p: 2, 
              height: '100%',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' }
            }}
            onClick={() => handleSectionClick('todo')}
          >
            <Collapse in={expandedSection === 'todo'}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="새로운 할 일"
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <IconButton 
                    color="primary" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddTodo();
                    }}
                  >
                    <AddIcon />
                  </IconButton>
                </Box>
                <List>
                  {todos.map((todo) => (
                    <ListItem
                      key={todo.id}
                      secondaryAction={
                        <IconButton edge="end" onClick={() => handleDeleteTodo(todo.id)}>
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={
                          <Typography
                            sx={{
                              textDecoration: todo.completed ? 'line-through' : 'none',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleToggleTodo(todo.id)}
                          >
                            {todo.text}
                          </Typography>
                        }
                        secondary={todo.time}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Collapse>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">ToDoList</Typography>
              {expandedSection === 'todo' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Tooltip,
  Chip,
  LinearProgress,
  Divider,
  useTheme
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Today as TodayIcon,
  Timeline as TimelineIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const GanttChartVisual = ({ tasks = [], selectedSite }) => {
  const theme = useTheme();
  const [zoomLevel, setZoomLevel] = useState(1);
  const [currentDate, setCurrentDate] = useState(new Date());

  // 날짜 범위 계산
  const dateRange = useMemo(() => {
    if (tasks.length === 0) {
      const today = new Date();
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date(today.getFullYear(), today.getMonth() + 1, 0)
      };
    }

    const dates = tasks.flatMap(task => [
      new Date(task.startDate),
      new Date(task.endDate)
    ]);

    const start = new Date(Math.min(...dates));
    const end = new Date(Math.max(...dates));

    // 여백 추가 (시작일 7일 전, 종료일 7일 후)
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() + 7);

    return { start, end };
  }, [tasks]);

  // 날짜 배열 생성
  const dateArray = useMemo(() => {
    const dates = [];
    const current = new Date(dateRange.start);
    
    while (current <= dateRange.end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }, [dateRange]);

  // 작업의 위치와 너비 계산
  const getTaskPosition = (task) => {
    const startDate = new Date(task.startDate);
    const endDate = new Date(task.endDate);
    
    const startIndex = Math.floor((startDate - dateRange.start) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    return {
      left: startIndex * (50 * zoomLevel),
      width: duration * (50 * zoomLevel),
      startIndex,
      duration
    };
  };

  // 상태별 색상
  const getStatusColor = (status) => {
    switch (status) {
      case '완료': return theme.palette.success.main;
      case '진행중': return theme.palette.primary.main;
      case '지연': return theme.palette.error.main;
      case '예정': return theme.palette.info.main;
      default: return theme.palette.grey[500];
    }
  };

  // 우선순위별 색상
  const getPriorityColor = (priority) => {
    switch (priority) {
      case '높음': return theme.palette.error.main;
      case '보통': return theme.palette.warning.main;
      case '낮음': return theme.palette.success.main;
      default: return theme.palette.grey[500];
    }
  };

  // 진행률에 따른 색상
  const getProgressColor = (progress) => {
    if (progress >= 80) return theme.palette.success.main;
    if (progress >= 50) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  // 오늘 날짜 표시
  const todayIndex = Math.floor((currentDate - dateRange.start) / (1000 * 60 * 60 * 24));

  // 줌 레벨 조정
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };

  if (tasks.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          공정표 차트
        </Typography>
        <Typography variant="body1" color="text.secondary">
          작업이 없습니다. 작업을 추가해주세요.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, overflow: 'auto' }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimelineIcon color="primary" />
          공정표 차트
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="확대">
            <IconButton onClick={handleZoomOut} size="small">
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="축소">
            <IconButton onClick={handleZoomIn} size="small">
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* 차트 컨테이너 */}
      <Box sx={{ 
        position: 'relative', 
        minHeight: 400,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'auto'
      }}>
        {/* 날짜 헤더 */}
        <Box sx={{ 
          position: 'sticky', 
          top: 0, 
          backgroundColor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          zIndex: 10
        }}>
          <Grid container sx={{ minWidth: dateArray.length * (50 * zoomLevel) }}>
            {/* 작업명 열 */}
            <Grid item xs={3} sx={{ 
              borderRight: 1, 
              borderColor: 'divider',
              backgroundColor: 'grey.50',
              p: 1
            }}>
              <Typography variant="subtitle2" fontWeight="bold">
                작업명
              </Typography>
            </Grid>
            
            {/* 날짜 열들 */}
            <Grid item xs={9} sx={{ display: 'flex' }}>
              {dateArray.map((date, index) => (
                <Box
                  key={index}
                  sx={{
                    width: 50 * zoomLevel,
                    minWidth: 50 * zoomLevel,
                    borderRight: 1,
                    borderColor: 'divider',
                    p: 0.5,
                    textAlign: 'center',
                    backgroundColor: date.getDay() === 0 ? 'grey.100' : 'background.paper',
                    position: 'relative'
                  }}
                >
                  <Typography variant="caption" display="block">
                    {date.getDate()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {date.toLocaleDateString('ko-KR', { weekday: 'short' })}
                  </Typography>
                  
                  {/* 오늘 날짜 표시 */}
                  {index === todayIndex && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        border: 2,
                        borderColor: 'primary.main',
                        backgroundColor: 'primary.main',
                        opacity: 0.1,
                        pointerEvents: 'none'
                      }}
                    />
                  )}
                </Box>
              ))}
            </Grid>
          </Grid>
        </Box>

        {/* 작업 행들 */}
        <Box sx={{ minWidth: dateArray.length * (50 * zoomLevel) }}>
          {tasks.map((task, taskIndex) => {
            const position = getTaskPosition(task);
            const isOverdue = new Date(task.endDate) < currentDate && task.status !== '완료';
            
            return (
              <Grid 
                key={task.id} 
                container 
                sx={{ 
                  borderBottom: 1, 
                  borderColor: 'divider',
                  minHeight: 60,
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                {/* 작업명 열 */}
                <Grid item xs={3} sx={{ 
                  borderRight: 1, 
                  borderColor: 'divider',
                  p: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <Typography variant="body2" fontWeight="bold" noWrap>
                    {task.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {task.description}
                  </Typography>
                  <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    <Chip 
                      label={task.status} 
                      size="small" 
                      sx={{ 
                        backgroundColor: getStatusColor(task.status),
                        color: 'white',
                        fontSize: '0.6rem',
                        height: 16
                      }}
                    />
                    <Chip 
                      label={task.priority} 
                      size="small" 
                      sx={{ 
                        backgroundColor: getPriorityColor(task.priority),
                        color: 'white',
                        fontSize: '0.6rem',
                        height: 16
                      }}
                    />
                  </Box>
                </Grid>
                
                {/* 차트 영역 */}
                <Grid item xs={9} sx={{ position: 'relative', minHeight: 60 }}>
                  {/* 작업 바 */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      left: position.left,
                      width: position.width,
                      height: 20,
                      backgroundColor: getStatusColor(task.status),
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: 1,
                      '&:hover': {
                        boxShadow: 3,
                        transform: 'translateY(-50%) scale(1.02)'
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    {/* 진행률 표시 */}
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${task.progress}%`,
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                        borderRadius: '4px 0 0 4px'
                      }}
                    />
                    
                    {/* 작업명 */}
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'white', 
                        fontWeight: 'bold',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                        fontSize: '0.7rem',
                        textAlign: 'center',
                        px: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {task.name}
                    </Typography>
                  </Box>

                  {/* 지연 표시 */}
                  {isOverdue && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        left: position.left + position.width,
                        width: 20,
                        height: 20,
                        backgroundColor: theme.palette.error.main,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'pulse 2s infinite'
                      }}
                    >
                      <WarningIcon sx={{ fontSize: 12, color: 'white' }} />
                    </Box>
                  )}

                  {/* 진행률 텍스트 */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      left: position.left + position.width + 30,
                      fontSize: '0.75rem',
                      color: getProgressColor(task.progress),
                      fontWeight: 'bold'
                    }}
                  >
                    {task.progress}%
                  </Box>
                </Grid>
              </Grid>
            );
          })}
        </Box>

        {/* 범례 */}
        <Box sx={{ 
          position: 'sticky', 
          bottom: 0, 
          backgroundColor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          p: 1,
          mt: 2
        }}>
          <Typography variant="subtitle2" gutterBottom>
            범례
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {[
              { status: '예정', color: getStatusColor('예정') },
              { status: '진행중', color: getStatusColor('진행중') },
              { status: '완료', color: getStatusColor('완료') },
              { status: '지연', color: getStatusColor('지연') }
            ].map((item) => (
              <Box key={item.status} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    backgroundColor: item.color,
                    borderRadius: 1
                  }}
                />
                <Typography variant="caption">{item.status}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* CSS 애니메이션 */}
      <style>
        {`
          @keyframes pulse {
            0% { transform: translateY(-50%) scale(1); }
            50% { transform: translateY(-50%) scale(1.2); }
            100% { transform: translateY(-50%) scale(1); }
          }
        `}
      </style>
    </Paper>
  );
};

export default GanttChartVisual; 
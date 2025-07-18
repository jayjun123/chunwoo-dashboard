import React, { useState, useRef, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, ComposedChart
} from 'recharts';
import { Box, Typography, Paper } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';

// 핀치 줌 훅
const usePinchZoom = () => {
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const lastDistance = useRef(0);
  const lastCenter = useRef({ x: 0, y: 0 });
  const isPinching = useRef(false);

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      isPinching.current = true;
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      lastDistance.current = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      lastCenter.current = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && isPinching.current) {
      e.preventDefault();
      
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      const currentCenter = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
      
      if (lastDistance.current > 0) {
        const newScale = scale * (currentDistance / lastDistance.current);
        setScale(Math.max(0.5, Math.min(3, newScale)));
        
        // 줌 중일 때는 패닝을 제한하여 더 자연스러운 동작
        if (Math.abs(currentDistance - lastDistance.current) > 5) {
          const deltaX = currentCenter.x - lastCenter.current.x;
          const deltaY = currentCenter.y - lastCenter.current.y;
          
          setTranslateX(prev => prev + deltaX * 0.5);
          setTranslateY(prev => prev + deltaY * 0.5);
        }
      }
      
      lastDistance.current = currentDistance;
      lastCenter.current = currentCenter;
    }
  };

  const handleTouchEnd = () => {
    isPinching.current = false;
    lastDistance.current = 0;
  };

  const resetZoom = () => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  };

  return {
    scale,
    translateX,
    translateY,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetZoom
  };
};

// 줌 가능한 차트 래퍼 컴포넌트
const ZoomableChart = ({ children, title, isMobile }) => {
  const { scale, translateX, translateY, handleTouchStart, handleTouchMove, handleTouchEnd, resetZoom } = usePinchZoom();
  const chartContainerRef = useRef(null);

  useEffect(() => {
    if (!isMobile || !chartContainerRef.current) {
      return;
    }

    const chartContainer = chartContainerRef.current;
    chartContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
    chartContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    chartContainer.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      chartContainer.removeEventListener('touchstart', handleTouchStart);
      chartContainer.removeEventListener('touchmove', handleTouchMove);
      chartContainer.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <Paper sx={{ p: 2, height: 300, position: 'relative' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{title}</Typography>
        {isMobile && scale !== 1 && (
          <Typography 
            variant="caption" 
            sx={{ 
              cursor: 'pointer', 
              color: 'primary.main',
              textDecoration: 'underline'
            }}
            onClick={resetZoom}
          >
            원래 크기
          </Typography>
        )}
      </Box>
      <Box 
        ref={chartContainerRef}
        className="zoomable-chart-container"
        sx={{ 
          height: 'calc(100% - 60px)',
          overflow: 'hidden',
          position: 'relative',
          touchAction: 'none'
        }}
      >
        <Box
          sx={{
            transform: isMobile ? `scale(${scale}) translate(${translateX}px, ${translateY}px)` : 'none',
            transformOrigin: 'center center',
            transition: isMobile ? 'none' : 'transform 0.3s ease',
            height: '100%',
            width: '100%'
          }}
        >
          {children}
        </Box>
      </Box>
    </Paper>
  );
};

// 진행률 트렌드 차트
export const ProgressTrendChart = ({ data }) => {
  const isMobile = useMediaQuery('(max-width:600px)');
  
  return (
    <ZoomableChart title="진행률 트렌드" isMobile={isMobile}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="progress" 
            stroke="#8884d8" 
            strokeWidth={2}
            name="평균 진행률"
          />
        </LineChart>
      </ResponsiveContainer>
    </ZoomableChart>
  );
};

// 현장별 진행률 차트
export const SiteProgressChart = ({ data }) => {
  const isMobile = useMediaQuery('(max-width:600px)');
  
  return (
    <ZoomableChart title="현장별 진행률" isMobile={isMobile}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="progress" fill="#82ca9d" name="진행률 (%)" />
        </BarChart>
      </ResponsiveContainer>
    </ZoomableChart>
  );
};

// 월별 성과 차트
export const MonthlyPerformanceChart = ({ data }) => {
  const isMobile = useMediaQuery('(max-width:600px)');
  
  return (
    <ZoomableChart title="월별 성과" isMobile={isMobile}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="sites" fill="#8884d8" name="현장 수" />
          <Line yAxisId="right" type="monotone" dataKey="progress" stroke="#82ca9d" name="평균 진행률" />
        </ComposedChart>
      </ResponsiveContainer>
    </ZoomableChart>
  );
};

// 현장 상태 분포 차트
export const SiteStatusPieChart = ({ data }) => {
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
  const isMobile = useMediaQuery('(max-width:600px)');

  return (
    <ZoomableChart title="현장 상태 분포" isMobile={isMobile}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </ZoomableChart>
  );
};

// 예산 대비 실적 차트
export const BudgetVsActualChart = ({ data }) => {
  const isMobile = useMediaQuery('(max-width:600px)');
  
  return (
    <ZoomableChart title="예산 대비 실적" isMobile={isMobile}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="site" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="budget" 
            stackId="1" 
            stroke="#8884d8" 
            fill="#8884d8" 
            name="예산"
          />
          <Area 
            type="monotone" 
            dataKey="actual" 
            stackId="1" 
            stroke="#82ca9d" 
            fill="#82ca9d" 
            name="실적"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ZoomableChart>
  );
};

// 실시간 현장 현황 카드
export const RealTimeStatusCard = ({ stats }) => {
  return (
    <Paper sx={{ p: 2, height: 200 }}>
      <Typography variant="h6" gutterBottom>실시간 현장 현황</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography>진행중 현장</Typography>
          <Typography variant="h6" color="primary">{stats.activeSites}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography>완료 현장</Typography>
          <Typography variant="h6" color="success.main">{stats.completedSites}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography>예정 현장</Typography>
          <Typography variant="h6" color="warning.main">{stats.pendingSites}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography>평균 진행률</Typography>
          <Typography variant="h6" color="info.main">{stats.avgProgress}%</Typography>
        </Box>
      </Box>
    </Paper>
  );
}; 
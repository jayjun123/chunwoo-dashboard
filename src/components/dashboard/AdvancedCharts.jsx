import React from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, ComposedChart
} from 'recharts';
import { Box, Typography, Paper } from '@mui/material';

// 진행률 트렌드 차트
export const ProgressTrendChart = ({ data }) => {
  return (
    <Paper sx={{ p: 2, height: 300 }}>
      <Typography variant="h6" gutterBottom>진행률 트렌드</Typography>
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
    </Paper>
  );
};

// 현장별 진행률 차트
export const SiteProgressChart = ({ data }) => {
  return (
    <Paper sx={{ p: 2, height: 300 }}>
      <Typography variant="h6" gutterBottom>현장별 진행률</Typography>
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
    </Paper>
  );
};

// 월별 성과 차트
export const MonthlyPerformanceChart = ({ data }) => {
  return (
    <Paper sx={{ p: 2, height: 300 }}>
      <Typography variant="h6" gutterBottom>월별 성과</Typography>
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
    </Paper>
  );
};

// 현장 상태 분포 차트
export const SiteStatusPieChart = ({ data }) => {
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Paper sx={{ p: 2, height: 300 }}>
      <Typography variant="h6" gutterBottom>현장 상태 분포</Typography>
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
    </Paper>
  );
};

// 예산 대비 실적 차트
export const BudgetVsActualChart = ({ data }) => {
  return (
    <Paper sx={{ p: 2, height: 300 }}>
      <Typography variant="h6" gutterBottom>예산 대비 실적</Typography>
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
    </Paper>
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
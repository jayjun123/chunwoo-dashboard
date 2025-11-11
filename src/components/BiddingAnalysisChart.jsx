import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const BiddingAnalysisChart = ({ vendors = [] }) => {
  // 실제 데이터를 차트 데이터로 변환
  const processChartData = () => {
    if (!vendors || vendors.length === 0) {
      return {
        chartData: [],
        pieData: [{ name: '동일성향', value: 0, color: '#4CAF50' }, { name: '반대성향', value: 0, color: '#9C27B0' }],
        stats: { sameTendency: 0, oppositeTendency: 0, totalCount: 0 }
      };
    }

    // 최근 10건 데이터 처리 - 투찰율과 낙찰율이 모두 있는 데이터만
    const recentVendors = vendors
      .filter(vendor => {
        const hasBidRate = vendor.bidRate && vendor.bidRate.trim() !== '';
        const hasWinningRate = vendor.winningRate && vendor.winningRate.trim() !== '';
        const hasBidDate = vendor.bidDate && vendor.bidDate.trim() !== '';
        return hasBidRate && hasWinningRate && hasBidDate;
      })
      .sort((a, b) => new Date(a.bidDate) - new Date(b.bidDate))
      .slice(0, 10);

    const chartData = recentVendors.map((vendor, index) => {
      const myRate = parseFloat(vendor.bidRate?.replace('%', '')) || 0;
      const clientRate = parseFloat(vendor.winningRate?.replace('%', '')) || 0;
      const deviation = myRate - clientRate;
      
      // 날짜 포맷팅 (YY.MM.DD)
      const date = new Date(vendor.bidDate);
      const formattedDate = `${date.getFullYear().toString().slice(-2)}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')}`;
      
      // 유효범위에 따른 날씨 아이콘
      const getWeatherIcon = (dev) => {
        const absDev = Math.abs(dev);
        if (absDev < 0.2) return '☀️';
        if (absDev < 3) return '☁️';
        if (absDev < 0.4) return '🌧️';
        return '🌨️';
      };

      return {
        date: formattedDate,
        myRate: myRate, // 퍼센트 값 그대로 사용
        clientRate: clientRate,
        rank: vendor.resultRank || 0,
        deviation: deviation,
        weather: getWeatherIcon(deviation),
        siteName: vendor.siteName,
        bidAmount: vendor.bidAmount,
        winningAmount: vendor.winningAmount
      };
    });

    // 동일성향/반대성향 계산 및 분석
    let sameTendency = 0;
    let oppositeTendency = 0;
    let totalDeviation = 0;
    let winCount = 0;
    let totalBids = recentVendors.length;

    recentVendors.forEach(vendor => {
      const myRate = parseFloat(vendor.bidRate?.replace('%', '')) || 0;
      const clientRate = parseFloat(vendor.winningRate?.replace('%', '')) || 0;
      const deviation = Math.abs(myRate - clientRate);
      totalDeviation += deviation;
      
      if (deviation <= 2) { // 2% 이내면 동일성향
        sameTendency++;
      } else {
        oppositeTendency++;
      }
      
      // 낙찰 여부 확인 (1위인 경우)
      if (vendor.resultRank === 1) {
        winCount++;
      }
    });

    const totalCount = sameTendency + oppositeTendency;
    const samePercentage = totalCount > 0 ? Math.round((sameTendency / totalCount) * 100) : 0;
    const oppositePercentage = totalCount > 0 ? Math.round((oppositeTendency / totalCount) * 100) : 0;
    const avgDeviation = totalBids > 0 ? (totalDeviation / totalBids).toFixed(1) : 0;
    const winRate = totalBids > 0 ? Math.round((winCount / totalBids) * 100) : 0;

    const pieData = [
      { name: '동일성향', value: samePercentage, color: '#4CAF50' },
      { name: '반대성향', value: oppositePercentage, color: '#9C27B0' }
    ];

    // 동적 코칭 메시지 생성
    const generateCoachingMessages = () => {
      const messages = [];
      
      // 기본 성향 분석
      if (samePercentage >= 70) {
        messages.push("1. 사정률 성향 : 발주처 성향을 매우 잘 파악하고 있습니다.");
      } else if (samePercentage >= 50) {
        messages.push("1. 사정률 성향 : 발주처 성향을 어느 정도 파악하고 있습니다.");
      } else {
        messages.push("1. 사정률 성향 : 발주처 성향 파악에 개선이 필요합니다.");
      }
      
      // 반대성향 개선 제안
      if (oppositePercentage > 0) {
        messages.push(`① 나머지 반대성향 [${oppositePercentage}]%만 잡는다면 낙찰확률은 더욱 높아집니다.`);
      }
      
      // 평균 편차 분석
      if (avgDeviation > 2) {
        messages.push("② 평균 편차가 높습니다. 발주처 낙찰분석을 더 정확히 하세요.");
      } else {
        messages.push("② 발주처 낙찰분석[그래프분석]을 통해,");
      }
      
      // 낙찰률 분석
      if (winRate >= 50) {
        messages.push("③ 현재 낙찰률이 양호합니다. 꾸준히 동일성향 확률을 높이세요.");
      } else {
        messages.push("③ 다음 낙찰지점 예측연습을 꾸준히 하여 동일성향 확률을 높이세요.");
      }
      
      // 최종 격려
      messages.push("④ 내가 노력한만큼 낙찰은 결실로 다가옵니다.");
      
      return messages;
    };

    const coachingMessages = generateCoachingMessages();

    return {
      chartData,
      pieData,
      stats: { sameTendency, oppositeTendency, totalCount, samePercentage, avgDeviation, winRate },
      coachingMessages
    };
  };

  const { chartData, pieData, stats, coachingMessages } = processChartData();
  
  // coachingMessages가 undefined일 경우 기본값 설정
  const safeCoachingMessages = coachingMessages || [
    "1. 사정률 성향 : 데이터를 분석 중입니다.",
    "① 더 많은 데이터가 필요합니다.",
    "② 발주처 낙찰분석을 통해,",
    "③ 다음 낙찰지점 예측연습을 꾸준히 하여 동일성향 확률을 높이세요.",
    "④ 내가 노력한만큼 낙찰은 결실로 다가옵니다."
  ];
  const formatRate = (rate) => {
    return (rate * 100).toFixed(2) + '%';
  };

  const getWeatherColor = (weather) => {
    switch (weather) {
      case '☀️': return '#4CAF50';
      case '☁️': return '#FF9800';
      case '🌧️': return '#2196F3';
      case '🌨️': return '#F44336';
      default: return '#757575';
    }
  };

  return (
    <Box sx={{ p: 2, pr: '40px', bgcolor: '#1a1a1a', color: '#fff', height: '320px' }}>
      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
        {/* 그래프 분석 섹션 - 왼쪽 (65%) */}
        <Box sx={{ flex: '0 0 65%' }}>
          <Paper sx={{ p: 2, bgcolor: '#2a2a2a', border: '1px solid #444', width: '100%', height: '290px' }}>
            <Typography variant="h6" sx={{ mb: 1, color: '#fff', fontWeight: 'bold', fontSize: '1rem' }}>
              나의사정률, 발주처낙찰률 그래프
            </Typography>
            
            <Box sx={{ height: 220, mb: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#fff"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#fff"
                    fontSize={12}
                    label={{ value: '사정률 %', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#fff' } }}
                    domain={[-3, 3]}
                    ticks={[-3, -2, -1, 0, 1, 2, 3]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#333', 
                      border: '1px solid #555',
                      color: '#fff',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                    formatter={(value, name) => {
                      if (name === '나의 투찰율') {
                        return [value + '%', '나의 투찰율'];
                      } else {
                        return [value + '%', '발주처 낙찰율'];
                      }
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        const data = payload[0].payload;
                        const myRate = data.myRate;
                        const clientRate = data.clientRate;
                        const difference = (myRate - clientRate).toFixed(2);
                        
                        return (
                          <div>
                            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                              📅 {label}
                            </div>
                            <div style={{ fontSize: '12px', color: '#ccc', borderTop: '1px solid #555', paddingTop: '8px' }}>
                              차이: {difference}%
                            </div>
                          </div>
                        );
                      }
                      return `📅 ${label}`;
                    }}
                  />
                  <Legend />
                  <Line 
                    dataKey="myRate" 
                    stroke="#2196F3" 
                    strokeWidth={3}
                    dot={{ fill: '#2196F3', strokeWidth: 2, r: 6 }}
                    name="나의 투찰율"
                  />
                  <Line 
                    dataKey="clientRate" 
                    stroke="#F44336" 
                    strokeWidth={3}
                    dot={{ fill: '#F44336', strokeWidth: 2, r: 6 }}
                    name="발주처 낙찰율"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>

          </Paper>
        </Box>

        {/* 투찰코칭 섹션 - 오른쪽 (35%) */}
        <Box sx={{ flex: '0 0 35%' }}>
          <Paper sx={{ p: 2, bgcolor: '#2a2a2a', border: '1px solid #444', width: '100%', height: '290px' }}>
            <Typography variant="h6" sx={{ mb: 1, color: '#fff', fontWeight: 'bold', fontSize: '1rem' }}>
              투찰코칭
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', height: 'calc(100% - 30px)' }}>
              {/* 왼쪽: 텍스트 내용 */}
              <Box sx={{ flex: 1, pr: 2 }}>
                {/* 동적 코칭 메시지 */}
                <Box sx={{ mb: 2 }}>
                  {safeCoachingMessages.map((message, index) => (
                    <Typography 
                      key={index}
                      variant={index === 0 ? "body1" : "body2"} 
                      sx={{ 
                        color: '#fff', 
                        mb: 1, 
                        lineHeight: 1.6,
                        fontWeight: index === 0 ? 'bold' : 'normal'
                      }}
                    >
                      {message}
                    </Typography>
                  ))}
                </Box>
              </Box>

              {/* 오른쪽: 파이 차트 */}
              <Box sx={{ width: 150, height: 150 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#333', 
                        border: '1px solid #555',
                        color: '#fff'
                      }}
                      formatter={(value, name) => [value + '%', name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Box>

          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default BiddingAnalysisChart;

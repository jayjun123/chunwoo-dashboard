import React, { useState, useEffect } from 'react';
import { Box, Typography, Collapse, CircularProgress } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { get5DayForecast } from '../../services/weatherService';

const WeatherWidget = () => {
  const [expanded, setExpanded] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        const data = await get5DayForecast();
        setWeatherData(data);
      } catch (error) {
        console.error('날씨 데이터 로드 실패:', error);
        // 에러 시 더미 데이터 사용
        setWeatherData({
          daily: [
            {
              date: new Date().toISOString().split('T')[0],
              dayName: '오늘',
              maxTemp: 35,
              minTemp: 28,
              sky: '맑음',
              pty: '0',
              pop: 10
            },
            {
              date: new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0],
              dayName: '내일',
              maxTemp: 36,
              minTemp: 29,
              sky: '구름많음',
              pty: '0',
              pop: 20
            },
            {
              date: new Date(Date.now() + 2*24*60*60*1000).toISOString().split('T')[0],
              dayName: '모레',
              maxTemp: 34,
              minTemp: 27,
              sky: '흐림',
              pty: '1',
              pop: 60
            },
            {
              date: new Date(Date.now() + 3*24*60*60*1000).toISOString().split('T')[0],
              dayName: '글피',
              maxTemp: 37,
              minTemp: 30,
              sky: '맑음',
              pty: '0',
              pop: 5
            },
            {
              date: new Date(Date.now() + 4*24*60*60*1000).toISOString().split('T')[0],
              dayName: '그글피',
              maxTemp: 35,
              minTemp: 28,
              sky: '구름조금',
              pty: '0',
              pop: 15
            }
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  const handleClick = () => {
    setExpanded(!expanded);
  };

  const todayWeather = weatherData?.daily?.[0];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box onClick={handleClick}>
      <Collapse in={expanded}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>주간 날씨</Typography>
          {weatherData?.daily?.slice(0, 7).map((day, index) => (
            <Box key={day.date} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>{day.dayName}</Typography>
              <Typography>{day.maxTemp}°C</Typography>
              <Typography>{day.sky}</Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">오늘의 날씨</Typography>
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>
      <Typography variant="body1">서울시 강남구</Typography>
      <Typography variant="h4" sx={{ my: 2 }}>{todayWeather?.maxTemp || 35}°C</Typography>
      <Typography variant="body2" color="text.secondary">{todayWeather?.sky || '맑음'}</Typography>
    </Box>
  );
};

export default WeatherWidget;

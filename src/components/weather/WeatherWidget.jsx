import React, { useState, useEffect } from 'react';
import { Box, Typography, Collapse, CircularProgress, Alert } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { get5DayForecast } from '../../services/weatherService';

const WeatherWidget = () => {
  const [expanded, setExpanded] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await get5DayForecast();
        setWeatherData(data);
      } catch (error) {
        console.error('날씨 데이터 로드 실패:', error);
        setError('날씨 데이터를 불러올 수 없습니다.');
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

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
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
      <Typography variant="h4" sx={{ my: 2 }}>{todayWeather?.maxTemp || '--'}°C</Typography>
      <Typography variant="body2" color="text.secondary">{todayWeather?.sky || '--'}</Typography>
    </Box>
  );
};

export default WeatherWidget;

import React, { useState, useEffect } from 'react';
import { Box, Typography, Collapse } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const WeatherWidget = () => {
  const [expanded, setExpanded] = useState(false);

  const handleClick = () => {
    setExpanded(!expanded);
  };

  return (
    <Box onClick={handleClick}>
      <Collapse in={expanded}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>주간 날씨</Typography>
          {['월', '화', '수', '목', '금', '토', '일'].map((day, index) => (
            <Box key={day} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>{day}</Typography>
              <Typography>{20 + index}°C</Typography>
              <Typography>맑음</Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">오늘의 날씨</Typography>
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>
      <Typography variant="body1">서울시 강남구</Typography>
      <Typography variant="h4" sx={{ my: 2 }}>23°C</Typography>
      <Typography variant="body2" color="text.secondary">맑음</Typography>
    </Box>
  );
};

export default WeatherWidget;

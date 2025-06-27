import React from 'react';
import CustomSchedule from './CustomSchedule';
import useMediaQuery from '@mui/material/useMediaQuery';

const isMobile = useMediaQuery('(max-width:600px)');

const Calendar = () => {
  return <CustomSchedule />;
};

export default Calendar;

<Box sx={{ width: isMobile ? '100vw' : '100%', maxWidth: isMobile ? '100vw' : 1400, mx: 0, px: 0 }}>
  {/* ...기존 캘린더 내용... */}
  <CustomCalendar ... />
  {isMobile && (
    <Box>
      {/* 공사현황/이달의 현장 관련 Box 코드 이곳으로 이동 */}
    </Box>
  )}
  {!isMobile && (
    <Box>
      {/* 공사현황/이달의 현장 관련 Box 코드 기존 위치 */}
    </Box>
  )}
</Box> 
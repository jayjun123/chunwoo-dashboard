import React from 'react';
import CustomSchedule from './CustomSchedule';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Box } from '@mui/material';

const isMobile = useMediaQuery('(max-width:600px)');

const Calendar = () => {
  return <CustomSchedule />;
};

export default Calendar;

<main
  className="MuiBox-root css-1tjg0m2"
  style={{
    height: '100%',
    width: '100%',
    margin: 0,
    padding: 0,
    boxSizing: 'border-box',
  }}
>
  {/* 왼쪽(PC)/아래쪽(모바일) 이달의 현장 */}
  <Box sx={{
    width: { xs: '100%', md: 280 },
    minWidth: { xs: '100%', md: 280 },
    maxWidth: { xs: '100%', md: 280 },
    height: { xs: 'auto', md: '100%' },
    overflowY: { xs: 'auto', md: 'auto' },
    overflowX: 'hidden',
    bgcolor: '#181c24',
    borderRadius: 2,
    p: 2,
    boxSizing: 'border-box',
    m: 0,
    // 모바일에서만 스크롤바 숨김
    ...(isMobile && {
      '::-webkit-scrollbar': { display: 'none' },
      msOverflowStyle: 'none',
      scrollbarWidth: 'none',
    })
  }}>
    {/* 이달의 현장 리스트 */}
  </Box>
  {/* 오른쪽(PC)/위쪽(모바일) 달력 */}
  <Box sx={{
    flex: 1,
    height: '100%',
    overflow: 'hidden',
    p: 0,
    m: 0,
  }}>
    {/* 달력 컴포넌트 */}
  </Box>
</main> 
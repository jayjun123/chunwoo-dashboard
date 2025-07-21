import React from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import PCKakaoDiscussion from '../components/discussions/PCKakaoDiscussion';
import MobileKakaoDiscussion from '../components/discussions/MobileKakaoDiscussion';

const Discussions = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return isMobile ? <MobileKakaoDiscussion /> : <PCKakaoDiscussion />;
};

export default Discussions; 
import React, { useState, useEffect } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import RealDiscussion from './RealDiscussion';
import MobileDiscussion from './MobileDiscussion';

const ResponsiveDiscussion = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // SSR을 위한 초기 렌더링 처리
  if (!mounted) {
    return null;
  }

  return isMobile ? <MobileDiscussion /> : <RealDiscussion />;
};

export default ResponsiveDiscussion; 
import useMediaQuery from '@mui/material/useMediaQuery';

const isMobile = useMediaQuery('(max-width:600px)');

return (
  <Box sx={{ mt: isMobile ? '0px' : '90px', position: 'static' }}>
    {/* ...기존 내용... */}
  </Box>
); 
import React from 'react';
import { Box, Typography, Container, Paper } from '@mui/material';
import MobileSidebar from '../components/MobileSidebar';

/**
 * 시스템 연동도(워크플로우 다이어그램) 페이지.
 * public/workflow-diagram.html을 iframe으로 표시합니다.
 */
const WorkflowDiagramPage = () => {
  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: 'background.default',
      position: 'relative',
    }}>
      <MobileSidebar />
      <Container
        maxWidth={false}
        sx={{
          py: 2,
          px: 1,
          ml: 0,
          mr: 0,
          maxWidth: '100%',
        }}
      >
        <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 2,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            <Typography variant="h6" component="h1">
              🔗 시스템 연동도 (워크플로우 다이어그램)
            </Typography>
          </Box>
          <Box sx={{ height: 'calc(100vh - 160px)', minHeight: 500, overflow: 'hidden' }}>
            <iframe
              src="/workflow-diagram.html"
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title="시스템 연동도"
            />
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default WorkflowDiagramPage;

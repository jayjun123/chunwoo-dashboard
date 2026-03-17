import React from 'react';
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import { DSH, cardSx } from './dshTheme';

export default function SiteSchedulePanel({ site }) {
  const start = site?.startDate ? new Date(site.startDate) : null;
  const end = site?.endDate ? new Date(site.endDate) : null;
  const events = [
    { label: '착공', date: start },
    { label: '기성등록', date: null },
    { label: '발주처 검토', date: null },
    { label: '월간 정산', date: null },
    { label: '준공예정', date: end },
  ].filter((e) => e.date || e.label === '기성등록' || e.label === '발주처 검토' || e.label === '월간 정산');

  return (
    <Box sx={{ ...cardSx, p: 2, height: '100%' }}>
      <Typography variant="subtitle2" sx={{ color: DSH.textSecondary, mb: 1 }}>
        현장일정
      </Typography>
      <List dense disablePadding>
        {events.map((ev, i) => (
          <ListItem key={i} disablePadding sx={{ py: 0.25 }}>
            <ListItemText
              primary={ev.date ? `${new Date(ev.date).toLocaleDateString('ko-KR')} [${ev.label}]` : `[${ev.label}]`}
              primaryTypographyProps={{ variant: 'body2', sx: { color: DSH.textPrimary } }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

import React from 'react';
import { Box, Typography } from '@mui/material';
import { DSH, cardSx } from './dshTheme';

export default function ProjectTimeline({ site, workDays, totalManpower }) {
  const start = site?.startDate ? new Date(site.startDate) : null;
  const end = site?.endDate ? new Date(site.endDate) : null;
  const now = new Date();
  const days = workDays ?? site?.workDays ?? null;
  const manpower = totalManpower ?? site?.totalManpower ?? site?.공수 ?? null;

  let percent = 0;
  if (start && end && end > start) {
    const total = end - start;
    const elapsed = Math.min(now - start, total);
    percent = Math.max(0, Math.min(100, (elapsed / total) * 100));
  }

  return (
    <Box sx={{ ...cardSx, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ color: DSH.textSecondary }}>
          프로젝트 일정
        </Typography>
        <Typography variant="caption" sx={{ color: DSH.textMuted }}>
          현장 투입일수 / 공수{days != null || manpower != null ? ` ${days != null ? days : '-'}일 / ${manpower != null ? Number(manpower).toLocaleString() : '-'}` : ''}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="caption" sx={{ color: DSH.textMuted }}>
          {start ? start.toLocaleDateString('ko-KR') : '-'}
        </Typography>
        <Typography variant="caption" sx={{ color: DSH.textMuted }}>
          {end ? end.toLocaleDateString('ko-KR') : '-'}
        </Typography>
      </Box>
      <Box
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: DSH.border,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${percent}%`,
            bgcolor: DSH.mint,
            borderRadius: 4,
            transition: 'width 0.3s ease',
          }}
        />
      </Box>
      <Typography variant="caption" sx={{ color: DSH.textSecondary, mt: 0.5, display: 'block' }}>
        진행률 {percent.toFixed(0)}%
      </Typography>
    </Box>
  );
}

import React from 'react';
import { Box, Typography } from '@mui/material';
import { DSH, cardSx } from './dshTheme';

export default function SiteSummaryCard({ site }) {
  if (!site) {
    return (
      <Box sx={{ ...cardSx, p: 2 }}>
        <Typography variant="body2" color="textSecondary">
          현장 정보 없음
        </Typography>
      </Box>
    );
  }

  const fields = [
    { label: '발주처', value: site.orderer ?? site.clientName ?? site.owner ?? '-' },
    { label: '공고번호', value: site.announcementNo ?? site.bidNumber ?? '-' },
    { label: '현장담당', value: site.manager ?? site.managerName ?? '-' },
    { label: '시공사', value: site.companyName ?? site.constructor ?? '-' },
    { label: '시공팀', value: site.constructionTeam ?? site.team ?? site.daemaTeam ?? site.teamName ?? '-' },
    { label: '착공일', value: site.startDate ? new Date(site.startDate).toLocaleDateString('ko-KR') : '-' },
    { label: '준공예정', value: site.endDate ? new Date(site.endDate).toLocaleDateString('ko-KR') : '-' },
  ];

  return (
    <Box sx={{ ...cardSx, p: 2 }}>
      <Typography variant="subtitle2" sx={{ color: DSH.textSecondary, mb: 1.5 }}>
        현장 요약
      </Typography>
      <Box sx={{ display: 'grid', gap: 0.75 }}>
        {fields.map(({ label, value }) => (
          <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: DSH.textMuted }}>
              {label}
            </Typography>
            <Typography variant="body2" sx={{ color: DSH.textPrimary }}>
              {value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

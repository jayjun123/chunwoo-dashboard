import React from 'react';
import { Box, Typography } from '@mui/material';
import { DSH, cardSx } from './dshTheme';
import { getContractTotal, getGisungTotal, getCostTotal } from './dshCalculations';

export default function AiInsightPanel({ site, progressList = [], costs = [] }) {
  const contract = getContractTotal(progressList, site);
  const gisungTotal = getGisungTotal(progressList);
  const costTotal = getCostTotal(costs);

  const insights = [];
  if (contract > 0) {
    insights.push(`기성률 ${Math.round((gisungTotal / contract) * 100)}% (계약 대비)`);
  }
  if (contract > 0 && costTotal > 0) {
    insights.push(`지출률 ${Math.round((costTotal / contract) * 100)}%`);
  }
  if (gisungTotal > 0 && costTotal > 0) {
    insights.push(`기성 대비 지출 ${Math.round((costTotal / gisungTotal) * 100)}%`);
  }
  if (insights.length === 0) insights.push('데이터를 입력하면 인사이트가 표시됩니다.');

  return (
    <Box sx={{ ...cardSx, p: 2 }}>
      <Typography variant="subtitle2" sx={{ color: DSH.textSecondary, mb: 1 }}>
        AI 인사이트
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2, color: DSH.textPrimary }}>
        {insights.map((text, i) => (
          <Typography key={i} component="li" variant="body2" sx={{ mb: 0.5 }}>
            {text}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

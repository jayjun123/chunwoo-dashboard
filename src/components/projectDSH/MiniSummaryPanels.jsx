import React from 'react';
import { Box, Typography } from '@mui/material';
import { DSH, cardSx } from './dshTheme';
import { getGisungTotal, getCostTotal } from './dshCalculations';

const panels = [
  { key: 'gisung', label: '기성', valueKey: 'gisungTotal', color: DSH.mint },
  { key: 'cost', label: '지출', valueKey: 'costTotal', color: DSH.amber },
  { key: 'settlement', label: '정산', valueKey: 'settlement', color: DSH.blue },
  { key: 'schedule', label: '일정', valueKey: 'schedule', color: DSH.purple },
];

function formatMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '-';
  return Math.round(Number(n)).toLocaleString();
}

export default function MiniSummaryPanels({ site, progressList = [], costs = [] }) {
  const gisungTotal = getGisungTotal(progressList);
  const costTotal = getCostTotal(costs);
  const settlement = site?.settlementAmount ?? '-';
  const schedule = site?.endDate ? new Date(site.endDate).toLocaleDateString('ko-KR') : '-';

  const values = {
    gisungTotal: formatMoney(gisungTotal),
    costTotal: formatMoney(costTotal),
    settlement: typeof settlement === 'number' ? formatMoney(settlement) : settlement,
    schedule,
  };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5 }}>
      {panels.map(({ key, label, valueKey, color }) => (
        <Box
          key={key}
          sx={{
            ...cardSx,
            p: 1.5,
            textAlign: 'center',
            borderTop: `3px solid ${color}`,
          }}
        >
          <Typography variant="caption" sx={{ color: DSH.textSecondary }}>
            {label}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, color: DSH.textPrimary }}>
            {values[valueKey]}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

import React from 'react';
import { Box, Typography } from '@mui/material';
import { DSH, cardSx } from './dshTheme';
import {
  getContractTotal,
  getGisungTotal,
  getReceiptTotal,
  getCostTotal,
  getAdvance,
} from './dshCalculations';

const kpiConfig = [
  { key: 'contract', label: '계약금액', color: DSH.blue, valueKey: 'contractAmount' },
  { key: 'advance', label: '선급금', color: DSH.blue, valueKey: 'advanceTotal' },
  { key: 'gisung', label: '기성누계', color: DSH.mint, valueKey: 'gisungTotal' },
  { key: 'cost', label: '지출누계', color: DSH.amber, valueKey: 'costTotal' },
  { key: 'receipt', label: '입금누계', color: DSH.green, valueKey: 'receiptTotal' },
];

function formatMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '-';
  return Math.round(Number(n)).toLocaleString();
}

export default function KpiCards({ site, progressList = [], costs = [] }) {
  const contractAmount = getContractTotal(progressList, site);
  const advanceTotal = getAdvance(site);
  const gisungTotal = getGisungTotal(progressList);
  const costTotal = getCostTotal(costs);
  const receiptTotal = getReceiptTotal(progressList, site);

  const values = {
    contractAmount,
    advanceTotal,
    gisungTotal,
    costTotal,
    receiptTotal,
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(5, minmax(0, 1fr))' },
        gap: 1.5,
      }}
    >
      {kpiConfig.map(({ key, label, color, valueKey }) => (
        <Box
          key={key}
          sx={{
            ...cardSx,
            minWidth: 0,
            p: 1.5,
            borderLeft: `4px solid ${color}`,
          }}
        >
          <Typography variant="caption" sx={{ color: DSH.textSecondary }}>
            {label}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color }}>
            {formatMoney(values[valueKey])}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

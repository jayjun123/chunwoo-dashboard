import React from 'react';
import { Box, Typography } from '@mui/material';
import { DSH, cardSx } from './dshTheme';
import {
  getContractTotal,
  getGisungTotal,
  getReceiptTotal,
  getCostTotal,
  getBalance,
  getAdvance,
} from './dshCalculations';

function fmt(n) {
  if (n == null || Number.isNaN(Number(n))) return '-';
  return Math.round(Number(n)).toLocaleString();
}

export default function SettlementStatusPanel({ site, progressList = [], costs = [] }) {
  const contract = getContractTotal(progressList, site);
  const advance = getAdvance(site);
  const gisungTotal = getGisungTotal(progressList);
  const costTotal = getCostTotal(costs);
  const receiptTotal = getReceiptTotal(progressList, site);
  const balance = getBalance(contract, receiptTotal);
  const rate = contract > 0 ? String(Math.round((receiptTotal / contract) * 100)) : '0';

  const items = [
    { label: '계약금액', value: fmt(contract) },
    { label: '선급금', value: fmt(advance) },
    { label: '기성누계', value: fmt(gisungTotal) },
    { label: '지출누계', value: fmt(costTotal) },
    { label: '입금누계', value: fmt(receiptTotal) },
    { label: '미수금', value: fmt(balance) },
    { label: '정산율', value: `${rate}%` },
  ];

  return (
    <Box sx={{ ...cardSx, p: 2, height: '100%' }}>
      <Typography variant="subtitle2" sx={{ color: DSH.textSecondary, mb: 1 }}>
        정산현황
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {items.map(({ label, value }) => (
          <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ color: DSH.textMuted }}>{label}</Typography>
            <Typography variant="body2" sx={{ color: DSH.textPrimary, fontWeight: 500 }}>{value}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

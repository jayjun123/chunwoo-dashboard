import React from 'react';
import { Box, Typography } from '@mui/material';
import { DSH, cardSx } from './dshTheme';
import { getContractTotal, getReceiptTotal, getBalance } from './dshCalculations';

export default function BalanceCard({ site, progressList = [] }) {
  const contractAmount = getContractTotal(progressList, site);
  const receiptTotal = getReceiptTotal(progressList, site);
  const balance = getBalance(contractAmount, receiptTotal);

  return (
    <Box
      sx={{
        ...cardSx,
        p: 2,
        borderLeft: `4px solid ${DSH.amber}`,
      }}
    >
      <Typography variant="subtitle2" sx={{ color: DSH.textSecondary }}>
        잔액
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 700, color: DSH.amber }}>
        {Math.round(Number(balance)).toLocaleString()}
      </Typography>
    </Box>
  );
}

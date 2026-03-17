import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { DSH, cardSx } from './dshTheme';
import { getTotalPayment, getGisungTotal } from './dshCalculations';

function fmt(n) {
  if (n == null || Number.isNaN(Number(n))) return '-';
  return Math.round(Number(n)).toLocaleString();
}

export default function GisungStatusPanel({ progressList = [], site }) {
  const total = getGisungTotal(progressList);
  const rows = (progressList || [])
    .slice(0, 5)
    .map((item) => {
      const amount = item.payments?.length ? getTotalPayment(item.payments) : (parseFloat(item.gisungAmount) || 0);
      const dateObj = item.updatedAt?.toDate?.() ?? item.createdAt?.toDate?.() ?? item.gisungDate?.toDate?.();
      const dateStr = dateObj ? dateObj.toLocaleDateString('ko-KR') : (item.gisungMonth || '-');
      return {
        id: item.id,
        sequence: item.sequence || item.payments?.[0]?.label || '-',
        date: dateStr,
        amount,
        status: item.paymentStatus === '입금완료' ? '입금' : '미입금',
      };
    });

  return (
    <Box sx={{ ...cardSx, p: 2, height: '100%' }}>
      <Typography variant="subtitle2" sx={{ color: DSH.textSecondary, mb: 1 }}>
        기성현황
      </Typography>
      <Table size="small" sx={{ '& .MuiTableCell-root': { borderColor: DSH.border, py: 0.5 } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ color: DSH.textMuted }}>차수</TableCell>
            <TableCell sx={{ color: DSH.textMuted }}>기성일</TableCell>
            <TableCell align="right" sx={{ color: DSH.textMuted }}>금액/상태</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell sx={{ color: DSH.textPrimary }}>{r.sequence}</TableCell>
              <TableCell sx={{ color: DSH.textPrimary }}>{String(r.date)}</TableCell>
              <TableCell align="right" sx={{ color: DSH.mint }}>{fmt(r.amount)} {r.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Typography variant="body2" sx={{ color: DSH.textSecondary, mt: 1 }}>
        합계 {fmt(total)}
      </Typography>
    </Box>
  );
}

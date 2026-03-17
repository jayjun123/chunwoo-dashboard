import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { DSH, cardSx } from './dshTheme';
import { getCostTotal } from './dshCalculations';

function fmt(n) {
  if (n == null || Number.isNaN(Number(n))) return '-';
  return Math.round(Number(n)).toLocaleString();
}

export default function CostStatusPanel({ costs = [] }) {
  const total = getCostTotal(costs);
  const rows = (costs || [])
    .map((c) => {
      const base = Number(c.totalValue) || 0;
      const health = (c.healthInsurance || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
      const date = c.date?.toDate?.() ?? c.date;
      return {
        id: c.id,
        item: c.itemType || c.description || '지출',
        date,
        dateStr: date ? new Date(date).toLocaleDateString('ko-KR') : '-',
        amount: base + health,
        category: c.itemType || '-',
      };
    })
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 5);

  return (
    <Box sx={{ ...cardSx, p: 2, height: '100%' }}>
      <Typography variant="subtitle2" sx={{ color: DSH.textSecondary, mb: 1 }}>
        지출현황
      </Typography>
      <Table size="small" sx={{ '& .MuiTableCell-root': { borderColor: DSH.border, py: 0.5 } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ color: DSH.textMuted }}>항목</TableCell>
            <TableCell sx={{ color: DSH.textMuted }}>일자</TableCell>
            <TableCell align="right" sx={{ color: DSH.textMuted }}>금액/분류</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell sx={{ color: DSH.textPrimary }}>{r.item}</TableCell>
              <TableCell sx={{ color: DSH.textPrimary }}>{r.dateStr}</TableCell>
              <TableCell align="right" sx={{ color: DSH.amber }}>{fmt(r.amount)} {r.category}</TableCell>
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

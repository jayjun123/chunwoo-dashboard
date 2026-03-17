import React from 'react';
import { Box, Typography } from '@mui/material';
import { DSH, cardSx } from './dshTheme';
import { getTotalPayment } from './dshCalculations';

export default function RecentActivity({ progressList = [], costs = [] }) {
  const gItems = (progressList || []).slice(0, 10).map((g) => {
    const amount = g.payments?.length ? getTotalPayment(g.payments) : (parseFloat(g.gisungAmount) || 0);
    return {
      id: g.id,
      type: '기성',
      title: g.gisungMonth || g.payments?.[0]?.label || '기성',
      time: g.createdAt?.toDate?.() ?? g.updatedAt?.toDate?.() ?? g.gisungMonth,
      amount,
    };
  });
  const cItems = (costs || []).slice(0, 10).map((c) => {
    const base = Number(c.totalValue) || 0;
    const health = (c.healthInsurance || []).reduce((s, item) => s + (Number(item.amount) || 0), 0);
    return {
      id: c.id,
      type: '지출',
      title: c.itemType || c.description || '지출',
      time: c.createdAt?.toDate?.() ?? c.date,
      amount: base + health,
    };
  });
  const merged = [...gItems, ...cItems]
    .filter((x) => x.time != null || x.amount > 0)
    .sort((a, b) => {
      const tA = new Date(a.time || 0).getTime();
      const tB = new Date(b.time || 0).getTime();
      return tB - tA;
    })
    .slice(0, 8);

  if (merged.length === 0) {
    return (
      <Box sx={{ ...cardSx, p: 2 }}>
        <Typography variant="subtitle2" sx={{ color: DSH.textSecondary, mb: 1 }}>
          기성활동
        </Typography>
        <Typography variant="body2" color="textSecondary">
          기성활동 없음
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ ...cardSx, p: 2 }}>
        <Typography variant="subtitle2" sx={{ color: DSH.textSecondary, mb: 1 }}>
          기성활동
        </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {merged.map((item) => (
          <Box
            key={item.id}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 0.5,
              borderBottom: `1px solid ${DSH.border}`,
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ color: DSH.textPrimary }}>
                [{item.type}] {item.title}
              </Typography>
              <Typography variant="caption" sx={{ color: DSH.textMuted }}>
                {item.time ? new Date(item.time).toLocaleString('ko-KR') : ''}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: DSH.mint }}>
              {item.amount != null ? Math.round(Number(item.amount)).toLocaleString() : '-'}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

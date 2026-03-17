import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DSH, cardSx } from './dshTheme';

/** 대시보드용 — 그래프만 표시 (추가/삭제는 물량·실물량 탭에서) */
export default function QuantityCompareChartOnly({ items = [] }) {
  const chartData = (items || [])
    .filter((i) => i.name && String(i.name).trim() !== '')
    .map((i) => ({ name: String(i.name).trim(), 계약: Number(i.contract) || 0, 실제: Number(i.actual) || 0 }));

  return (
    <Box sx={{ ...cardSx, p: 2 }}>
      <Typography variant="subtitle2" sx={{ color: DSH.textSecondary, mb: 1.5 }}>
        계약물량 vs 실제물량
      </Typography>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <XAxis dataKey="name" stroke={DSH.textSecondary} fontSize={12} />
            <YAxis stroke={DSH.textSecondary} fontSize={12} tickFormatter={(v) => Math.round(Number(v)).toLocaleString()} />
            <Tooltip
              contentStyle={{ background: DSH.card, border: `1px solid ${DSH.border}` }}
              formatter={(value) => [Math.round(Number(value)).toLocaleString(), '']}
            />
            <Legend />
            <Bar dataKey="계약" fill={DSH.blue} radius={[4, 4, 0, 0]} />
            <Bar dataKey="실제" fill={DSH.mint} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <Typography variant="body2" sx={{ color: DSH.textMuted }}>
          물량/실물량 탭에서 항목을 추가하세요.
        </Typography>
      )}
    </Box>
  );
}

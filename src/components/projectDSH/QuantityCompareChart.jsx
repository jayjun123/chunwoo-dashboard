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
import { getContractTotal, getGisungTotal } from './dshCalculations';

export default function QuantityCompareChart({ quantityInfo = [], site, progressList = [] }) {
  const contract = getContractTotal(progressList, site);
  const gisungTotal = getGisungTotal(progressList);
  const data = [
    { name: '계약', 계약: contract, 실제: 0 },
    { name: '기성', 계약: contract, 실제: gisungTotal },
  ].filter((d) => d.계약 > 0 || d.실제 > 0);

  if (data.length === 0 && quantityInfo.length === 0) {
    return (
      <Box sx={{ ...cardSx, p: 2 }}>
        <Typography variant="subtitle2" sx={{ color: DSH.textSecondary, mb: 1 }}>
          계약 vs 실제 물량
        </Typography>
        <Typography variant="body2" color="textSecondary">
          데이터 없음
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ ...cardSx, p: 2 }}>
      <Typography variant="subtitle2" sx={{ color: DSH.textSecondary, mb: 1 }}>
        계약 vs 실제
      </Typography>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <XAxis dataKey="name" stroke={DSH.textSecondary} fontSize={12} />
          <YAxis stroke={DSH.textSecondary} fontSize={12} tickFormatter={(v) => Number(v).toLocaleString()} />
          <Tooltip
            contentStyle={{ background: DSH.card, border: `1px solid ${DSH.border}` }}
            formatter={(value) => [Number(value).toLocaleString(), '']}
          />
          <Legend />
          <Bar dataKey="계약" fill={DSH.blue} radius={[4, 4, 0, 0]} />
          <Bar dataKey="실제" fill={DSH.mint} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

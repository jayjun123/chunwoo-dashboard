import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import { formatNumber } from '../../utils/formatUtils';

/**
 * 현장/전체 통합 현황 요약 박스 (계약금액, 누계기성, 지출).
 * 전체 합계는 연도별(올해 착공·올해 기성·올해 지출).
 */
export default function IntegratedStatusBox({ integratedStatus, selectedSite, isMobile }) {
  if (!integratedStatus) return null;

  const summary = integratedStatus.summary;
  const year = integratedStatus.year;
  const title = selectedSite
    ? `${selectedSite?.name} 통합 현황`
    : `${year || ''}년 전체 현장 통합 현황`.trim();

  return (
    <Box sx={{
      mb: 1,
      p: 1.5,
      bgcolor: '#424242',
      borderRadius: 1,
      border: '1px solid #616161'
    }}>
      <Typography variant="body1" sx={{ mb: 0.5, fontWeight: 'bold', color: '#ffffff', fontSize: isMobile ? '0.9rem' : '1rem' }}>
        {title}
      </Typography>
      {!selectedSite && (
        <Typography variant="caption" sx={{ display: 'block', mb: 0.75, color: '#bdbdbd', fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
          계약금액: 공사기간에 올해 포함(기간 없으면 포함) · 누계기성: 해당 현장 전체 기성+선급금 · 지출: 올해 지출
        </Typography>
      )}
      <Grid container spacing={1}>
        <Grid size={{ xs: 4 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" sx={{ color: '#4caf50', fontWeight: 'bold', fontSize: isMobile ? '1.2rem' : '1.5rem' }}>
              {summary?.totalEstimateAmount ? Math.round(summary.totalEstimateAmount).toLocaleString() : '0'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#ffffff', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>계약금액</Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 4 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" sx={{ color: '#2196f3', fontWeight: 'bold', fontSize: isMobile ? '1.2rem' : '1.5rem' }}>
              {summary?.totalClaimAmount ? Math.round(summary.totalClaimAmount).toLocaleString() : '0'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#ffffff', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>누계기성 (선급금 포함)</Typography>
          </Box>
        </Grid>
        <Grid size={{ xs: 4 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" sx={{ color: '#ff9800', fontWeight: 'bold', fontSize: isMobile ? '1.2rem' : '1.5rem' }}>
              {summary?.totalCostAmount ? Math.round(summary.totalCostAmount).toLocaleString() : '0'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#ffffff', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>지출</Typography>
          </Box>
        </Grid>
      </Grid>
      <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #616161' }}>
        <Grid container spacing={1}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Box sx={{ color: '#ffffff', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>
              계약금액: {formatNumber(summary?.totalEstimateAmount || 0, true)}
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Box sx={{ color: '#ffffff', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>
              누계기성: {formatNumber(summary?.totalClaimAmount || 0, true)} (선급금 포함)
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Box sx={{ color: '#ffffff', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>
              지출 총액: {formatNumber(summary?.totalCostAmount || 0, true)}
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

import React from 'react';
import { Box, Typography } from '@mui/material';
import { DSH, cardSx } from './dshTheme';
import { getContractTotal, getGisungTotal, getCostTotal, getReceiptTotal, getTotalPayment } from './dshCalculations';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function RiskStatusCards({ site, progressList = [], costs = [] }) {
  const contractAmount = getContractTotal(progressList, site);
  const gisungTotal = getGisungTotal(progressList);
  const costTotal = getCostTotal(costs);
  const receiptTotal = getReceiptTotal(progressList, site);

  const receiptRate = contractAmount > 0 ? Math.round((receiptTotal / contractAmount) * 100) : 0;
  const costRate = contractAmount > 0 ? Math.round((costTotal / contractAmount) * 100) : 0;
  const costOver = contractAmount > 0 && costTotal > contractAmount;
  const marginRisk = receiptRate < 80 || costRate > 80;

  const claimRisk = progressList.some(
    (item) =>
      item.claimStatus !== '청구완료' &&
      (getTotalPayment(item.payments) > 0 || (parseFloat(item.gisungAmount) || 0) > 0)
  );

  const items = [
    {
      status: marginRisk || costOver ? '주의' : '정상',
      icon: marginRisk || costOver ? <WarningAmberIcon sx={{ color: DSH.amber, fontSize: 18 }} /> : <CheckCircleIcon sx={{ color: DSH.green, fontSize: 18 }} />,
      msg: marginRisk ? `입금률 ${receiptRate}% / 지출률 ${costRate}% → 마진 주의 필요` : costOver ? '지출률 계약 대비 초과 → 비용 검토 필요' : '계약 대비 입금·지출 양호',
      color: marginRisk || costOver ? DSH.amber : DSH.green,
    },
    {
      status: claimRisk ? '위험' : '정상',
      icon: claimRisk ? <ErrorIcon sx={{ color: DSH.red, fontSize: 18 }} /> : <CheckCircleIcon sx={{ color: DSH.green, fontSize: 18 }} />,
      msg: claimRisk ? '3개월 연속 기성 청구 간격 좁아짐 → 발주처 확인 필요' : '기성 청구 간격 양호',
      color: claimRisk ? DSH.red : DSH.green,
    },
    {
      status: '정상',
      icon: <CheckCircleIcon sx={{ color: DSH.green, fontSize: 18 }} />,
      msg: '계약 변동 없음 / 정산 양호',
      color: DSH.green,
    },
  ];

  return (
    <Box sx={{ ...cardSx, p: 2, height: '100%' }}>
      <Typography variant="subtitle2" sx={{ color: DSH.textSecondary, mb: 1 }}>
        리스크 요약
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, justifyContent: 'flex-start' }}>
        {items.map((item, i) => (
          <Box
            key={i}
            sx={{
              flex: i === 0 ? '0 0 40%' : i === 1 ? '0 0 30%' : '0 0 30%',
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.5,
              py: 0.75,
              borderRadius: 1,
              border: `1px solid ${item.color}`,
              bgcolor: `${item.color}15`,
            }}
          >
            {item.icon}
            <Typography variant="caption" sx={{ color: item.color, fontWeight: 600, flexShrink: 0 }}>
              {item.status}
            </Typography>
            <Typography variant="caption" sx={{ color: DSH.textPrimary }}>
              {item.msg}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

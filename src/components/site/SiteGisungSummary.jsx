import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
} from '@mui/material';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatNumber } from '../../utils/formatUtils';

function seqNum(sequence) {
  return parseInt(String(sequence || '').replace('차', ''), 10) || 0;
}

function calcBalance(row, allRows, contractAmount, advance) {
  if (row.isException) return 0;
  const currentSeq = seqNum(row.sequence);
  const totalGisung = allRows
    .filter((g) => {
      const gSeq = seqNum(g.sequence);
      return (
        g.claimStatus === '청구완료' &&
        !g.isException &&
        gSeq > 0 &&
        gSeq <= currentSeq
      );
    })
    .reduce((sum, g) => sum + (Number(g.gisungAmount) || 0), 0);
  return (Number(contractAmount) || 0) - (Number(advance) || 0) - totalGisung;
}

/**
 * 현장상세정보 — 기타사항 아래 기성현황 요약
 * 차수 · 기성월 · 선급금 · 전회기성 · 금회기성 · 잔액 · 청구상태 · 입금확인
 */
export default function SiteGisungSummary({ selectedSite, form, isMobile }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const siteName = selectedSite?.name || form?.name || '';
  const siteId = selectedSite?.id || '';
  const contractAmount = Number(form?.contractAmount ?? selectedSite?.contractAmount ?? 0) || 0;
  const advance = Number(form?.advance ?? selectedSite?.advance ?? 0) || 0;

  useEffect(() => {
    if (!siteName && !siteId) {
      setRows([]);
      return undefined;
    }

    setLoading(true);
    let unsub = null;

    try {
      // 현장명으로 구독 (기성관리와 동일 키). siteId만 있는 문서도 클라이언트에서 병합.
      const q = siteName
        ? query(collection(db, 'gisung'), where('name', '==', siteName))
        : query(collection(db, 'gisung'), where('siteId', '==', siteId));

      unsub = onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          list.sort((a, b) => {
            const sa = seqNum(a.sequence);
            const sb = seqNum(b.sequence);
            if (sa !== sb) return sa - sb;
            return String(a.gisungMonth || '').localeCompare(String(b.gisungMonth || ''));
          });
          setRows(list);
          setLoading(false);
        },
        (err) => {
          console.warn('현장 기성현황 구독 실패:', err);
          setRows([]);
          setLoading(false);
        }
      );
    } catch (e) {
      console.warn('현장 기성현황 쿼리 실패:', e);
      setRows([]);
      setLoading(false);
    }

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [siteName, siteId]);

  const displayRows = useMemo(() => rows, [rows]);

  if (!selectedSite && !siteName) return null;

  return (
    <Box
      sx={{
        mt: 1,
        p: isMobile ? 1 : 1.25,
        bgcolor: '#2a2b32',
        borderRadius: 1,
        border: '1px solid #444',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography
          variant="caption"
          sx={{
            color: '#fff',
            fontWeight: 700,
            fontSize: isMobile ? '0.9rem' : '1rem',
          }}
        >
          기성현황
        </Typography>
        {loading && <CircularProgress size={16} sx={{ color: '#90caf9' }} />}
      </Box>

      {!loading && displayRows.length === 0 ? (
        <Typography sx={{ color: '#888', fontSize: isMobile ? '0.8rem' : '0.9rem', py: 0.5 }}>
          등록된 기성 내역이 없습니다.
        </Typography>
      ) : (
        <TableContainer
          sx={{
            maxHeight: isMobile ? 220 : 280,
            overflowX: 'auto',
            overflowY: 'auto',
            '&::-webkit-scrollbar': { height: 6, width: 6 },
            '&::-webkit-scrollbar-thumb': { bgcolor: '#555', borderRadius: 3 },
          }}
        >
          <Table size="small" stickyHeader sx={{ minWidth: isMobile ? 680 : 760 }}>
            <TableHead>
              <TableRow>
                {['차수', '기성월', '선급금', '전회기성', '금회기성', '잔액', '청구상태', '입금확인'].map((h) => (
                  <TableCell
                    key={h}
                    sx={{
                      bgcolor: '#1e1f24',
                      color: '#bbb',
                      fontWeight: 700,
                      py: 0.65,
                      px: 1,
                      fontSize: isMobile ? '0.8rem' : '0.9rem',
                      whiteSpace: 'nowrap',
                      borderBottom: '1px solid #444',
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayRows.map((row) => {
                const balance = calcBalance(row, displayRows, contractAmount, advance);
                const claimOk = row.claimStatus === '청구완료';
                const paid = row.paymentStatus === '입금완료';
                const unpaid = row.paymentStatus === '미수금';
                return (
                  <TableRow
                    key={row.id}
                    sx={{
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                      bgcolor: row.isException ? 'rgba(255,152,0,0.08)' : 'transparent',
                    }}
                  >
                    <TableCell sx={cellSx(isMobile)}>
                      <Chip
                        label={row.sequence || '-'}
                        size="small"
                        sx={{ height: 24, fontSize: isMobile ? '0.75rem' : '0.8rem', bgcolor: '#ff6b35', color: '#fff', fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell sx={cellSx(isMobile, '#90caf9')}>{row.gisungMonth || '-'}</TableCell>
                    <TableCell sx={cellSx(isMobile, '#ffd600')}>{formatNumber(advance, true)}</TableCell>
                    <TableCell sx={cellSx(isMobile, '#ce93d8')}>
                      {row.isException ? formatNumber(0, true) : formatNumber(row.prevGisung, true)}
                    </TableCell>
                    <TableCell sx={cellSx(isMobile, '#ef5350')}>
                      {formatNumber(row.gisungAmount ?? row.currentGisung, true)}
                    </TableCell>
                    <TableCell sx={cellSx(isMobile, '#66bb6a')}>{formatNumber(balance, true)}</TableCell>
                    <TableCell sx={cellSx(isMobile)}>
                      <Chip
                        label={claimOk ? '청구완료' : '미청구'}
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: isMobile ? '0.75rem' : '0.8rem',
                          bgcolor: claimOk ? '#4caf50' : '#ff9800',
                          color: '#fff',
                          fontWeight: 700,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={cellSx(isMobile)}>
                      <Chip
                        label={row.paymentStatus || '미입금'}
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: isMobile ? '0.75rem' : '0.8rem',
                          fontWeight: 700,
                          bgcolor: paid ? '#ffd600' : unpaid ? '#f44336' : '#757575',
                          color: paid ? '#000' : '#fff',
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

function cellSx(isMobile, color = '#eee') {
  return {
    color,
    py: 0.6,
    px: 1,
    fontSize: isMobile ? '0.8rem' : '0.9rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    borderBottom: '1px solid #333',
  };
}

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Container,
  TextField,
  InputAdornment,
  Paper,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import BusinessIcon from '@mui/icons-material/Business';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useProjectDSH } from '../hooks/useProjectDSH';
import KpiCards from '../components/projectDSH/KpiCards';
import RiskStatusCards from '../components/projectDSH/RiskStatusCards';
import QuantityComparePanel from '../components/projectDSH/QuantityComparePanel';
import QuantityCompareChartOnly from '../components/projectDSH/QuantityCompareChartOnly';
import { initItemsFromSiteAndQuantity } from '../components/projectDSH/QuantityComparePanel';
import BalanceCard from '../components/projectDSH/BalanceCard';
import ProjectTimeline from '../components/projectDSH/ProjectTimeline';
import SiteSummaryCard from '../components/projectDSH/SiteSummaryCard';
import AiInsightPanel from '../components/projectDSH/AiInsightPanel';
import RecentActivity from '../components/projectDSH/RecentActivity';
import GisungStatusPanel from '../components/projectDSH/GisungStatusPanel';
import CostStatusPanel from '../components/projectDSH/CostStatusPanel';
import SettlementStatusPanel from '../components/projectDSH/SettlementStatusPanel';
import SiteSchedulePanel from '../components/projectDSH/SiteSchedulePanel';

function SiteSelector({ onSelect }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'sites'));
        if (cancelled) return;
        setSites(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        if (!cancelled) setError(e?.message || '현장 목록 조회 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredSites = useMemo(() => {
    const normalizeDate = (value) => {
      if (!value) return null;
      try {
        // 문자열/타입 섞여 있어도 최대한 안전하게 파싱
        const str = String(value).replace(/[.\/]/g, '-');
        const base = str.length >= 10 ? str.slice(0, 10) : str;
        const d = new Date(base);
        return Number.isNaN(d.getTime()) ? null : d;
      } catch {
        return null;
      }
    };

    const filtered = !search.trim()
      ? sites
      : (() => {
          const q = search.toLowerCase().trim();
          return sites.filter(
            (s) =>
              (s.name || '').toLowerCase().includes(q) ||
              (s.orderer || '').toLowerCase().includes(q) ||
              (s.manager || '').toLowerCase().includes(q) ||
              (s.companyName || '').toLowerCase().includes(q) ||
              (s.announcementNo || '').toLowerCase().includes(q)
          );
        })();

    // 공사 시작일(착공일) 최근 순으로 정렬
    const sorted = [...filtered].sort((a, b) => {
      const aDate = normalizeDate(a.startDate);
      const bDate = normalizeDate(b.startDate);

      if (!aDate && !bDate) return 0;
      if (!aDate) return 1; // 시작일 없는 현장은 아래쪽으로
      if (!bDate) return -1;

      return bDate.getTime() - aDate.getTime(); // 최근(큰 날짜) 먼저
    });

    return sorted;
  }, [sites, search]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ pt: 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
        현장을 검색하여 선택하세요
      </Typography>
      <TextField
        fullWidth
        size="medium"
        placeholder="현장명, 발주처, 담당자, 공고번호로 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
        }}
        sx={{
          mb: 2,
          flexShrink: 0,
          '& .MuiOutlinedInput-root': {
            bgcolor: theme.palette.mode === 'dark' ? 'action.hover' : 'grey.50',
            borderRadius: 2,
          },
        }}
      />
      <Paper
        variant="outlined"
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          borderRadius: 2,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {filteredSites.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {search.trim() ? '검색 결과가 없습니다.' : '등록된 현장이 없습니다.'}
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {filteredSites.map((site) => (
              <ListItemButton
                key={site.id}
                onClick={() => onSelect(site.id)}
                sx={{
                  py: 1.5,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  '&:last-of-type': { borderBottom: 'none' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <BusinessIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={site.name || site.id}
                  secondary={site.orderer || site.manager ? `발주처: ${site.orderer || '-'} · 담당: ${site.manager || '-'}` : null}
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}

export default function ProjectDSH() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { site, progressList, costs, quantityInfo, scheduleWorkDays, scheduleTotalManpower, loading, error } = useProjectDSH(siteId || null);
  const [tab, setTab] = useState(0);
  const [quantityItems, setQuantityItems] = useState([]);

  useEffect(() => {
    setQuantityItems(initItemsFromSiteAndQuantity(site || null, quantityInfo || []));
  }, [siteId, site, quantityInfo]);

  const handleSelectSite = (id) => {
    navigate(`/project-dsh/${id}`, { replace: true });
  };

  if (!siteId) {
    return (
      <Container
        maxWidth="md"
        sx={{
          py: 3,
          px: isMobile ? 2 : 3,
          pb: isMobile ? 8 : 3,
          height: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Project DSH
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          현장세부내용 — 현장을 선택하면 해당 현장 대시보드를 볼 수 있습니다.
        </Typography>
        <SiteSelector onSelect={handleSelectSite} />
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error">{error.message || '데이터를 불러오지 못했습니다.'}</Alert>
      </Container>
    );
  }

  const lastUpdated = new Date().toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{
        pt: 8,              // 상단 AppBar 높이만큼 여백
        pb: 0,
        maxWidth: '100vw',
        width: '100vw',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {/* 상단 1행: 현장명(왼쪽) | 돌아가기 + 탭(오른쪽) — 상단 64px 여백으로 탭 노출 */}
      {/* pt: 8 = 64px */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          py: 1.5,
          px: isMobile ? 2 : 3,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h5" fontWeight={700}>
          {site?.name || '현장'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Box
            component="button"
            onClick={() => navigate('/project-dsh')}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.5,
              py: 0.75,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'action.hover',
              color: 'text.secondary',
              fontSize: '0.875rem',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.selected' },
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 20 }} />
            돌아가기
          </Box>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 0.5, px: 1.5 } }}
          >
            <Tab label="대시보드" />
            <Tab label="물량/실물량" />
            <Tab label="노트/히스토리" />
          </Tabs>
        </Box>
      </Box>

      {tab === 0 && (
        <Box
          sx={{
            mt: 5.5,
            pt: 0,
            display: 'flex',
            gap: 2,
            flexWrap: { xs: 'wrap', md: 'nowrap' },
            minHeight: 0,
            width: '100%',
            flex: 1,
            overflowX: 'hidden',
            overflowY: 'auto',
            px: isMobile ? 2 : 3,
          }}
        >
          {/* 왼쪽 80% (모바일에서는 100%) */}
          <Box
            sx={{
              flex: { xs: '1 1 100%', md: '1 1 80%' },
              width: { xs: '100%', md: '80%' },
              minWidth: 0,
              display: 'grid',
              gridTemplateRows: { xs: 'auto auto auto auto', md: 'auto auto auto 1fr' },
              gap: 2,
              minHeight: 0,
            }}
          >
            {/* 1행: KPI 카드 */}
            <Box sx={{ mb: 0 }}>
              <KpiCards site={site} progressList={progressList} costs={costs} />
            </Box>
            {/* 2행: 리스크 요약 80% | 프로젝트 일정 20% */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '4fr 1fr' },
                gap: 2,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <RiskStatusCards site={site} progressList={progressList} costs={costs} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <ProjectTimeline site={site} workDays={scheduleWorkDays} totalManpower={scheduleTotalManpower} />
              </Box>
            </Box>
            {/* 3행: 4개 패널 그리드 */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, minmax(0, 1fr))' },
                gap: 2,
              }}
            >
              <GisungStatusPanel site={site} progressList={progressList} />
              <CostStatusPanel costs={costs} />
              <SettlementStatusPanel site={site} progressList={progressList} costs={costs} />
              <SiteSchedulePanel site={site} />
            </Box>
            {/* 4행: 차트 - 남는 높이 전체 사용 */}
            <Box
              sx={{
                mt: 1,
                minHeight: { xs: 220, md: 260 },
                maxHeight: { xs: 280, md: 360 },
              }}
            >
              <QuantityCompareChartOnly items={quantityItems} />
            </Box>
          </Box>
          {/* 오른쪽 20%: 잔액 → 현장요약 → 인사이트 → 기성활동 → Site ID / Last Updated */}
          <Box
            sx={{
              flex: { xs: '1 1 100%', md: '0 0 20%' },
              width: { xs: '100%', md: '20%' },
              minWidth: { xs: 0, md: 240 },
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <BalanceCard site={site} progressList={progressList} />
            <SiteSummaryCard site={site} />
            <AiInsightPanel site={site} progressList={progressList} costs={costs} />
            <RecentActivity progressList={progressList} costs={costs} />
            <Box sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="caption" display="block" color="text.secondary">
                Site ID: #{siteId?.slice(-6) || '-'}
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                Last Updated: {lastUpdated}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {tab === 1 && (
        <Box
          sx={{
            flex: 1,
            mt: 5.5,
            px: isMobile ? 2 : 3,
            py: 2,
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          <QuantityComparePanel
            site={site}
            progressList={progressList}
            quantityInfo={quantityInfo}
            items={quantityItems}
            setItems={setQuantityItems}
          />
        </Box>
      )}
      {tab === 2 && (
        <Box
          sx={{
            flex: 1,
            mt: 5.5,
            px: isMobile ? 2 : 3,
            py: 2,
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          <RecentActivity progressList={progressList} costs={costs} />
        </Box>
      )}
    </Container>
  );
}

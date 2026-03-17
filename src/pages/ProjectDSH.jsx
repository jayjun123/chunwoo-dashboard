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
import { useCompanyDSH } from '../hooks/useCompanyDSH';
import KpiCards from '../components/projectDSH/KpiCards';
import RiskStatusCards from '../components/projectDSH/RiskStatusCards';
import QuantityComparePanel from '../components/projectDSH/QuantityComparePanel';
import QuantityCompareChartOnly from '../components/projectDSH/QuantityCompareChartOnly';
import { initItemsFromSiteAndQuantity, isGlassQuantityItem } from '../components/projectDSH/QuantityComparePanel';
import BalanceCard from '../components/projectDSH/BalanceCard';
import ProjectTimeline from '../components/projectDSH/ProjectTimeline';
import SiteSummaryCard from '../components/projectDSH/SiteSummaryCard';
import AiInsightPanel from '../components/projectDSH/AiInsightPanel';
import RecentActivity from '../components/projectDSH/RecentActivity';
import GisungStatusPanel from '../components/projectDSH/GisungStatusPanel';
import CostStatusPanel from '../components/projectDSH/CostStatusPanel';
import SettlementStatusPanel from '../components/projectDSH/SettlementStatusPanel';
import SiteSchedulePanel from '../components/projectDSH/SiteSchedulePanel';

function buildQuantityItemsForSites(sites = [], quantityInfoBySiteId) {
  const contractByName = new Map();
  const actualByName = new Map();

  (sites || []).forEach((site) => {
    const items = site?.items;
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      const name = (item?.name || '').toString().trim();
      if (!name) return;
      if (item?.isSpacer || item?.isTotal || item?.isVat || item?.isTotalWithVat) return;
      if (!isGlassQuantityItem(name)) return;
      const qty = Number(item?.quantity) || Number(item?.contract) || 0;
      if (!qty) return;
      contractByName.set(name, (contractByName.get(name) || 0) + qty);
    });
  });

  (sites || []).forEach((site) => {
    const list = quantityInfoBySiteId?.get?.(site.id) || [];
    list.forEach((q) => {
      const name = (q?.category || q?.name || q?.itemName || '').toString().trim();
      if (!name) return;
      if (!isGlassQuantityItem(name)) return;
      const actual = Number(q?.actual) || Number(q?.amount) || 0;
      if (actual) actualByName.set(name, (actualByName.get(name) || 0) + actual);
      if (!contractByName.has(name)) {
        const contract = Number(q?.contract) || Number(q?.contractAmount) || 0;
        if (contract) contractByName.set(name, contract);
      }
    });
  });

  const names = Array.from(new Set([...contractByName.keys(), ...actualByName.keys()]));
  return names
    .map((name, idx) => ({
      id: `sel-${idx}-${name}`,
      name,
      contract: contractByName.get(name) || 0,
      actual: actualByName.get(name) || 0,
    }))
    .filter((row) => row.name && String(row.name).trim() !== '');
}

function CompanySelector({
  companies = [],
  value,
  onChange,
}) {
  const theme = useTheme();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return companies;
    return companies.filter((c) => (c.name || '').toLowerCase().includes(q));
  }, [companies, search]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%', minHeight: 0 }}>
      <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
        회사 검색/선택
      </Typography>
      <TextField
        size="small"
        placeholder="회사명 검색"
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
        <List disablePadding>
          {filtered.map((c) => {
            const selected = value === c.name;
            return (
              <ListItemButton
                key={c.name}
                selected={selected}
                onClick={() => onChange(c.name)}
                sx={{
                  py: 1.25,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  '&:last-of-type': { borderBottom: 'none' },
                }}
              >
                <ListItemText
                  primary={c.name}
                  secondary={`${c.count}개 현장`}
                  primaryTypographyProps={{ fontWeight: selected ? 700 : 500 }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Paper>
    </Box>
  );
}

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
  const [companyList, setCompanyList] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedSiteIds, setSelectedSiteIds] = useState([]);
  const [leftTab, setLeftTab] = useState(1); // 0: 현장, 1: 회사

  useEffect(() => {
    setQuantityItems(initItemsFromSiteAndQuantity(site || null, quantityInfo || []));
  }, [siteId, site, quantityInfo]);

  useEffect(() => {
    // 회사 리스트는 siteId 없이도 미리 로딩
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'sites'));
        if (cancelled) return;
        const sitesAll = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const map = new Map();
        sitesAll.forEach((s) => {
          const name = (s?.companyName || '미지정').toString().trim() || '미지정';
          map.set(name, (map.get(name) || 0) + 1);
        });
        const list = Array.from(map.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'));
        setCompanyList(list);
        if (!selectedCompany && list.length) setSelectedCompany(list[0].name);
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [selectedCompany]);

  const companyDSH = useCompanyDSH(!siteId ? selectedCompany : '');

  const handleSelectSite = (id) => {
    navigate(`/project-dsh/${id}`, { replace: true });
  };

  if (!siteId) {
    const selectedSites = useMemo(() => {
      if (!selectedSiteIds.length) return [];
      const byId = new Map(companyDSH.sites.map((s) => [s.id, s]));
      return selectedSiteIds.map((id) => byId.get(id)).filter(Boolean);
    }, [companyDSH.sites, selectedSiteIds]);

    const topChartItems = useMemo(() => {
      if (leftTab !== 1) return [];
      if (selectedSites.length > 0) return buildQuantityItemsForSites(selectedSites, companyDSH.quantityInfoBySiteId);
      return companyDSH.companyQuantityItems;
    }, [leftTab, selectedSites, companyDSH.companyQuantityItems, companyDSH.quantityInfoBySiteId]);

    return (
      <Container
        maxWidth={false}
        disableGutters
        sx={{
          width: '100vw',
          height: 'calc(100vh - 64px)',
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {/* 좌측 2: 회사 선택 */}
        <Box
          sx={{
            width: { xs: '100%', md: '20%' },
            minWidth: { md: 260 },
            borderRight: { md: `1px solid ${theme.palette.divider}` },
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            minHeight: 0,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            현장세부내용
          </Typography>
          <Tabs
            value={leftTab}
            onChange={(_, v) => setLeftTab(v)}
            sx={{
              minHeight: 36,
              '& .MuiTab-root': { minHeight: 36, py: 0.5, px: 1.5, fontWeight: 700 },
            }}
          >
            <Tab label="현장" />
            <Tab label="회사" />
          </Tabs>

          {leftTab === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              현장을 선택하면 해당 현장 대시보드로 이동합니다.
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              회사를 선택하면 해당 회사의 현장/물량 요약을 볼 수 있습니다.
            </Typography>
          )}
          <Box sx={{ flex: 1, minHeight: 0 }}>
            {leftTab === 0 ? (
              <SiteSelector onSelect={handleSelectSite} />
            ) : (
              <CompanySelector
                companies={companyList}
                value={selectedCompany}
                onChange={(name) => {
                  setSelectedCompany(name);
                  setSelectedSiteIds([]);
                }}
              />
            )}
          </Box>
        </Box>

        {/* 우측 8: 회사 대시보드 */}
        <Box
          sx={{
            width: { xs: '100%', md: '80%' },
            p: 2,
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          {leftTab === 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                왼쪽에서 현장을 선택하세요.
              </Typography>
            </Box>
          ) : companyDSH.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : companyDSH.error ? (
            <Alert severity="error">{companyDSH.error?.message || '회사 데이터를 불러오지 못했습니다.'}</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {selectedCompany}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  총 {companyDSH.sites.length}개 현장
                </Typography>
              </Box>

              {/* 회사 KPI(계약/선급/기성/지출/입금) */}
              <Box sx={{ mt: 1 }}>
                <Typography
                  variant="h6"
                  sx={{
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: 29,
                    mb: 1,
                    letterSpacing: 0.2,
                  }}
                >
                  {selectedCompany}
                </Typography>
                <KpiCards site={companyDSH.companySite} progressList={companyDSH.gisungList} costs={companyDSH.costs} />
              </Box>

              {/* 상단 차트: 선택된 현장들 기준(없으면 회사 전체) */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  {selectedSiteIds.length > 0 ? `선택 현장 합산 물량/실물량 (${selectedSiteIds.length}개)` : '회사 합산 물량/실물량'}
                </Typography>
                {selectedSiteIds.length > 0 && (
                  <Box
                    component="button"
                    onClick={() => setSelectedSiteIds([])}
                    sx={{
                      px: 1.25,
                      py: 0.6,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                      color: 'text.primary',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      '&:hover': { bgcolor: 'action.selected' },
                    }}
                  >
                    선택 해제
                  </Box>
                )}
              </Box>
              <QuantityCompareChartOnly items={topChartItems} />

              {/* 현장 카드 목록 */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                  gap: 2,
                }}
              >
                {companyDSH.sites.map((s) => (
                  <Paper
                    key={s.id}
                    variant="outlined"
                    onClick={() => {
                      setSelectedSiteIds((prev) => {
                        const set = new Set(prev);
                        if (set.has(s.id)) set.delete(s.id);
                        else set.add(s.id);
                        return Array.from(set);
                      });
                    }}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      cursor: 'pointer',
                      borderColor: selectedSiteIds.includes(s.id) ? theme.palette.primary.main : theme.palette.divider,
                      '&:hover': { borderColor: theme.palette.primary.main },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                      <Typography sx={{ fontWeight: 700, mb: 0.5, minWidth: 0 }}>
                        {s.name || s.id}
                      </Typography>
                      <Box
                        sx={() => {
                          const raw = (s.status || '').toString().trim();
                          const label =
                            raw === '완료' ? '완료'
                              : raw === '예정' ? '예정'
                              : raw === '진행중' || raw === '진행' ? '진행'
                              : raw ? raw : '미정';

                          const color =
                            label === '완료' ? { bg: 'success.main', fg: 'success.contrastText' }
                              : label === '진행' ? { bg: 'info.main', fg: 'info.contrastText' }
                              : label === '예정' ? { bg: 'warning.main', fg: 'warning.contrastText' }
                              : { bg: 'grey.700', fg: '#fff' };

                          return {
                            flexShrink: 0,
                            px: 1,
                            py: 0.25,
                            borderRadius: 999,
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            lineHeight: 1.2,
                            bgcolor: color.bg,
                            color: color.fg,
                            border: '1px solid',
                            borderColor: 'rgba(255,255,255,0.12)',
                            mt: 0.1,
                          };
                        }}
                      >
                        {(s.status || '').toString().trim()
                          ? ((s.status || '').toString().trim() === '진행중' || (s.status || '').toString().trim() === '진행')
                            ? '진행'
                            : (s.status || '').toString().trim()
                          : '미정'}
                      </Box>
                    </Box>
                    {/* 공기(기간) */}
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                      {s.startDate || s.endDate
                        ? `${s.startDate || '-'} ~ ${s.endDate || '-'}`
                        : '공기 정보 없음'}
                    </Typography>
                    <Box sx={{ height: 8 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Box
                        component="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectSite(s.id);
                        }}
                        sx={{
                          px: 1.25,
                          py: 0.6,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'action.hover',
                          color: 'text.primary',
                          cursor: 'pointer',
                          fontSize: '0.8125rem',
                          '&:hover': { bgcolor: 'action.selected' },
                        }}
                      >
                        현장 대시보드
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>

              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                현장 카드는 여러 개 선택할 수 있고, 선택된 현장들의 합산 물량/실물량이 위 차트에 반영됩니다.
              </Typography>
            </Box>
          )}
        </Box>
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

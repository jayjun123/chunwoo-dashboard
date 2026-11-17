import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  IconButton,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { formatQuantity } from '../../utils/siteUtils';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import PlaceIcon from '@mui/icons-material/Place';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import DescriptionIcon from '@mui/icons-material/Description';
import { calculateProgress } from '../../utils/siteUtils';
import { formatNumber } from '../../utils/formatUtils';
import { extractRegionFromAddress, getSiteAddress, fetchMonthDailyWeather, resolveSiteCoords } from '../../utils/siteWeather';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';

const FILTERS = ['전체', '진행', '예정', '완료'];

const STATUS_COLOR = {
  진행: { bg: '#0e7490', text: '#fff' },
  예정: { bg: '#d97706', text: '#fff' },
  완료: { bg: '#4b5563', text: '#fff' },
  미정: { bg: '#6b7280', text: '#fff' },
};

function pad2(n) {
  return String(n).padStart(2, '0');
}

function parseSiteDate(value) {
  if (!value) return null;
  if (typeof value === 'object' && value.toDate) return value.toDate();
  const s = String(value).replace(/\./g, '-').replace(/\//g, '-');
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDotDate(value) {
  const d = parseSiteDate(value);
  if (!d) return '';
  return `${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
}

function formatFullDotDate(value) {
  const d = parseSiteDate(value);
  if (!d) return '';
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
}

function locationLabel(site) {
  const address = getSiteAddress(site);
  const region = extractRegionFromAddress(address || site?.name || '');
  if (region) return region;
  if (address) return address.split(' ').slice(0, 2).join(' ');
  return '';
}

function money(v) {
  const n = Number(v) || 0;
  return `${formatNumber(n)} 원`;
}

function timelineMeta(typeStr) {
  const t = String(typeStr || '');
  if (t.includes('회의')) return { label: '공정회의', color: '#ef4444' };
  if (t.includes('실측') || t.includes('물량')) return { label: '물량', color: '#22c55e' };
  if (t.includes('현장') || t.includes('현설')) return { label: '현장방문', color: '#22d3ee' };
  return { label: '기타', color: '#9ca3af' };
}

function weekdayKo(date) {
  return ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
}

export default function MobileSites({
  sites = [],
  filteredSites = [],
  statusTabSites,
  statusTab,
  setStatusTab,
  searchTerm,
  setSearchTerm,
  statusCounts = {},
  selectedSite,
  onSelectSite,
  onBack,
  screen = 'list',
  form = {},
  handleChange,
  isEditing,
  setIsEditing,
  siteIntegratedStatus,
  onNewSite,
  onAddItem,
  onOpenUpload,
  onOpenPhotos,
  sitePhotos = [],
  onOpenContract,
  isReadOnly,
}) {
  const [weatherByKey, setWeatherByKey] = useState({});
  const [detailWeather, setDetailWeather] = useState(null);
  const [tab, setTab] = useState('기본정보');
  const [timeline, setTimeline] = useState([]);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });

  const filter = FILTERS.includes(statusTab) ? statusTab : '진행';
  const totalCount = sites.length;
  const [localQuery, setLocalQuery] = useState(searchTerm || '');
  const composingRef = useRef(false);

  const matchesSearch = (site, q) => {
    if (!q) return true;
    return (
      site?.name?.toLowerCase().includes(q) ||
      site?.address?.toLowerCase().includes(q) ||
      site?.orderer?.toLowerCase().includes(q) ||
      site?.companyName?.toLowerCase().includes(q) ||
      site?.manager?.toLowerCase().includes(q) ||
      site?.windowCompany?.toLowerCase().includes(q)
    );
  };

  const list = useMemo(() => {
    const q = (localQuery || '').trim().toLowerCase();
    const source = filter === '전체'
      ? sites
      : (statusTabSites || filteredSites || []);
    if (!q) return source;
    return source.filter((site) => matchesSearch(site, q));
  }, [filter, sites, statusTabSites, filteredSites, localQuery]);

  const applySearch = (value) => {
    setLocalQuery(value);
  };

  useEffect(() => {
    let cancelled = false;
    const now = new Date();
    fetchMonthDailyWeather(now.getFullYear(), now.getMonth()).then((map) => {
      if (!cancelled) setWeatherByKey((prev) => ({ ...prev, default: map[today] }));
    });
    return () => { cancelled = true; };
  }, [today]);

  useEffect(() => {
    if (!selectedSite || screen !== 'detail') return;
    let cancelled = false;
    const coords = resolveSiteCoords(selectedSite);
    const now = new Date();
    fetchMonthDailyWeather(now.getFullYear(), now.getMonth(), coords || undefined).then((map) => {
      if (!cancelled) setDetailWeather(map[today] || null);
    });
    return () => { cancelled = true; };
  }, [selectedSite, screen, today]);

  useEffect(() => {
    if (!selectedSite || screen !== 'detail') {
      setTimeline([]);
      return undefined;
    }
    const col = collection(db, 'schedules');
    const q = selectedSite.id
      ? query(col, where('siteId', '==', selectedSite.id))
      : query(col, where('siteName', '==', selectedSite.name));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => String(b.date?.toDate?.() || b.date || '').localeCompare(String(a.date?.toDate?.() || a.date || '')));
      setTimeline(rows.slice(0, 40));
    }, () => {
      setTimeline([]);
    });
    return () => unsub();
  }, [selectedSite, screen]);

  const summary = siteIntegratedStatus?.summary || {};
  const progress = selectedSite ? calculateProgress(selectedSite) : null;
  const weather = detailWeather || weatherByKey.default;

  const itemRows = useMemo(() => {
    const items = form.items || [];
    const totals = {
      total: items.find((i) => i?.isTotal)?.amount,
      vat: items.find((i) => i?.isVat)?.amount,
      contract: items.find((i) => i?.isTotalWithVat)?.amount,
    };
    const lines = items.filter((i) => i && !i.isSpacer && !i.isTotal && !i.isVat && !i.isTotalWithVat && !i.isAdjustment && i.name);
    return { lines, totals };
  }, [form.items]);

  if (screen === 'detail' && (selectedSite || isEditing)) {
    const site = selectedSite || form;
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0f1419', overflow: 'hidden' }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          px: 1,
          py: 0.75,
          flexShrink: 0,
          bgcolor: '#0f1419',
          borderBottom: '1px solid #1f2937',
          position: 'sticky',
          top: 0,
          zIndex: 5,
        }}>
          <IconButton onClick={onBack} sx={{ color: '#fff', mr: 0.5 }} aria-label="뒤로">
            <ArrowBackIosNewIcon />
          </IconButton>
          <Typography onClick={onBack} sx={{ color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
            뒤로
          </Typography>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1.5, pb: 2, '&::-webkit-scrollbar': { display: 'none' } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Box sx={{ bgcolor: STATUS_COLOR[site.status]?.bg || '#0e7490', color: '#fff', px: 1, py: 0.2, borderRadius: 1, fontSize: 12, fontWeight: 800 }}>
              {site.status || '진행'}
            </Box>
            <IconButton
              size="small"
              onClick={() => handleChange({ target: { name: 'isFavorite', value: !form.isFavorite } })}
              sx={{ color: form.isFavorite ? '#fbbf24' : '#6b7280' }}
            >
              {form.isFavorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
            </IconButton>
          </Box>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 20, lineHeight: 1.3, mb: 0.75 }}>
            {site.name || '새 현장'}
          </Typography>
          {site.address && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
              <PlaceIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
              <Typography sx={{ color: '#9ca3af', fontSize: 13, flex: 1 }}>{site.address}</Typography>
              <Box
                onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(site.address)}`, '_blank')}
                sx={{ color: '#60a5fa', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                지도
              </Box>
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box>
              <Box sx={{ fontSize: 28, lineHeight: 1 }}>{weather?.icon || '☀️'}</Box>
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>
                {weather?.tmax != null ? `${weather.tmax}°C` : ''}
              </Typography>
              <Typography sx={{ color: '#9ca3af', fontSize: 12 }}>
                {weather?.tmax != null ? `${weather.tmax}° / ${weather.tmin}°` : ''}
              </Typography>
            </Box>
            <Typography sx={{ color: '#9ca3af', fontSize: 12, textAlign: 'right' }}>
              {formatFullDotDate(new Date())} ({weekdayKo(new Date())})
            </Typography>
          </Box>

          {progress != null && (
            <Box sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                <Typography sx={{ color: '#9ca3af', fontSize: 12 }}>공정률</Typography>
                <Typography sx={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{Math.round(progress)}%</Typography>
              </Box>
              <Box sx={{ height: 8, bgcolor: '#1f2937', borderRadius: 99, overflow: 'hidden' }}>
                <Box sx={{ width: `${progress}%`, height: '100%', bgcolor: '#22c55e' }} />
              </Box>
            </Box>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 1, mb: 1.5 }}>
            <Typography sx={{ color: '#9ca3af', fontSize: 13 }}>계약금액</Typography>
            <Typography sx={{ color: '#fff', fontSize: 13, textAlign: 'right', fontWeight: 700 }}>{money(summary.totalEstimateAmount || form.contractAmount)}</Typography>
            <Typography sx={{ color: '#9ca3af', fontSize: 13 }}>누계기성</Typography>
            <Typography sx={{ color: '#fff', fontSize: 13, textAlign: 'right', fontWeight: 700 }}>{money(summary.totalClaimAmount)}</Typography>
            <Typography sx={{ color: '#9ca3af', fontSize: 13 }}>지출총액</Typography>
            <Typography sx={{ color: '#fff', fontSize: 13, textAlign: 'right', fontWeight: 700 }}>{money(summary.totalCostAmount)}</Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, mb: 1.5 }}>
            {[
              { label: '현장정보', icon: <InfoOutlinedIcon />, color: '#16a34a', onClick: () => setTab('기본정보') },
              { label: '사진', icon: <PhotoCameraIcon />, color: '#ea580c', onClick: () => { setTab('사진'); onOpenPhotos && onOpenPhotos(); } },
              { label: '물량', icon: <Inventory2Icon />, color: '#7c3aed', onClick: () => setTab('물량내역') },
              { label: '서류', icon: <DescriptionIcon />, color: '#f59e0b', onClick: () => onOpenContract && onOpenContract() },
            ].map((b) => (
              <Box key={b.label} onClick={b.onClick} sx={{ textAlign: 'center', cursor: 'pointer' }}>
                <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: b.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 0.5 }}>
                  {b.icon}
                </Box>
                <Typography sx={{ color: '#d1d5db', fontSize: 11, fontWeight: 700 }}>{b.label}</Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ display: 'flex', borderBottom: '1px solid #1f2937', mb: 1.5 }}>
            {['기본정보', '진행내역', '물량내역', '사진'].map((name) => (
              <Box
                key={name}
                onClick={() => setTab(name)}
                sx={{
                  flex: 1,
                  textAlign: 'center',
                  py: 1,
                  fontSize: 13,
                  fontWeight: 800,
                  color: tab === name ? '#fff' : '#6b7280',
                  borderBottom: tab === name ? '2px solid #fff' : '2px solid transparent',
                  cursor: 'pointer',
                }}
              >
                {name}
              </Box>
            ))}
          </Box>

          {tab === '기본정보' && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ color: '#fff', fontWeight: 800 }}>기본정보</Typography>
                <Typography
                  onClick={() => setIsEditing && setIsEditing(!isEditing)}
                  sx={{ color: '#60a5fa', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  {isEditing ? '저장모드' : '수정'}
                </Typography>
              </Box>
              <InfoRow label="계약구분" value={form.contractType} />
              <InfoRow label="발주처" value={form.orderer} />
              <InfoRow label="회사명" value={form.companyName || form.company} />
              <InfoRow label="소장" value={form.manager} />
              <InfoRow label="시공팀" value={form.team} />
              <InfoRow label="창호업체" value={form.windowCompany} />
              <InfoRow label="관급/사급" value={form.workScope} />
              <InfoRow label="공고번호" value={form.announcementNo} />
              <InfoRow label="계약금액" value={money(form.contractAmount)} />
              <InfoRow label="선급금" value={money(form.advance)} />
              <InfoRow label="누계기성" value={money(summary.totalClaimAmount)} />
              <InfoRow label="안전관리비" value={money(form.safetyCost)} />
              <InfoRow label="주소" value={form.address} />
              <InfoRow label="착공일" value={formatFullDotDate(form.startDate)} />
              <InfoRow label="준공예정일" value={formatFullDotDate(form.endDate)} />
            </Box>
          )}

          {tab === '진행내역' && (
            <Box>
              {timeline.length === 0 && (
                <Typography sx={{ color: '#6b7280', fontSize: 13, py: 2 }}>등록된 진행내역이 없습니다.</Typography>
              )}
              {timeline.map((item) => {
                const meta = timelineMeta(item.type);
                const d = item.date?.toDate ? item.date.toDate() : parseSiteDate(item.date);
                return (
                  <Box key={item.id} sx={{ display: 'flex', gap: 1.25, mb: 1.5 }}>
                    <Box sx={{ width: 4, borderRadius: 99, bgcolor: meta.color, flexShrink: 0 }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ color: '#9ca3af', fontSize: 12 }}>
                        {d ? `${formatFullDotDate(d)} (${weekdayKo(d)})` : ''}
                      </Typography>
                      <Typography sx={{ color: meta.color, fontSize: 13, fontWeight: 800 }}>{meta.label}</Typography>
                      <Typography sx={{ color: '#e5e7eb', fontSize: 14 }}>
                        {item.text || item.desc || ''}
                      </Typography>
                      {item.manager || item.userName ? (
                        <Typography sx={{ color: '#9ca3af', fontSize: 12, textAlign: 'right' }}>{item.manager || item.userName}</Typography>
                      ) : null}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}

          {tab === '물량내역' && (
            <Box>
              <Typography sx={{ color: '#fff', fontWeight: 800, mb: 1 }}>총금액 (부가세별도)</Typography>
              <Typography sx={{ color: '#3b82f6', fontWeight: 800, fontSize: 22, mb: 1.5 }}>
                {money(itemRows.totals.contract || itemRows.totals.total)}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                <Box onClick={() => !isReadOnly && onAddItem && onAddItem()} sx={{ flex: 1, textAlign: 'center', bgcolor: '#111827', border: '1px solid #374151', borderRadius: 2, py: 1, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>품목추가</Box>
                <Box onClick={() => onOpenUpload && onOpenUpload()} sx={{ flex: 1, textAlign: 'center', bgcolor: '#111827', border: '1px solid #374151', borderRadius: 2, py: 1, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>엑셀업로드</Box>
              </Box>
              <Box sx={{ display: 'flex', px: 0.2, pb: 0.6, borderBottom: '1px solid #374151' }}>
                <Typography sx={{ color: '#9ca3af', fontSize: 12, flex: 1.4, fontWeight: 700 }}>품목</Typography>
                <Typography sx={{ color: '#9ca3af', fontSize: 12, width: 72, textAlign: 'right', fontWeight: 700 }}>물량</Typography>
                <Typography sx={{ color: '#9ca3af', fontSize: 12, width: 96, textAlign: 'right', fontWeight: 700 }}>금액</Typography>
              </Box>
              {itemRows.lines.map((item, idx) => {
                const qty = formatQuantity(item.quantity ?? item.qty ?? item.volume);
                const unit = item.unit ? ` ${item.unit}` : '';
                const qtyNum = Number(item.quantity ?? item.qty ?? item.volume);
                const amtNum = Number(item.amount) || 0;
                const showQty = qty && qtyNum !== 0;
                const showAmt = amtNum !== 0;
                return (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', py: 0.8, borderBottom: '1px solid #1f2937', gap: 0.5 }}>
                    <Typography sx={{ color: '#e5e7eb', fontSize: 13, flex: 1.4, pr: 0.5 }}>{item.name}</Typography>
                    <Typography sx={{ color: '#d1d5db', fontSize: 13, width: 72, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {showQty ? `${qty}${unit}` : ''}
                    </Typography>
                    <Typography sx={{ color: '#9ca3af', fontSize: 13, width: 96, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {showAmt ? money(item.amount) : ''}
                    </Typography>
                  </Box>
                );
              })}
              <Box sx={{ mt: 1.5 }}>
                <InfoRow label="총 공사비(부가세별도)" value={money(itemRows.totals.total)} />
                <InfoRow label="부가세" value={money(itemRows.totals.vat)} />
                <InfoRow label="계약금액(부가세포함)" value={money(itemRows.totals.contract)} highlight />
              </Box>
            </Box>
          )}

          {tab === '사진' && (
            <Box>
              <Box onClick={() => onOpenPhotos && onOpenPhotos()} sx={{ mb: 1.5, textAlign: 'center', bgcolor: '#111827', border: '1px solid #374151', borderRadius: 2, py: 1, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                사진 업로드
              </Box>
              {(!sitePhotos || sitePhotos.length === 0) && (
                <Typography sx={{ color: '#6b7280', fontSize: 13 }}>등록된 사진이 없습니다.</Typography>
              )}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                {(sitePhotos || []).slice(0, 12).map((photo, idx) => (
                  <Box
                    key={photo.id || photo.url || idx}
                    component="img"
                    src={photo.url || photo.thumbUrl || photo}
                    alt=""
                    sx={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 1.5 }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0f1419', overflow: 'hidden' }}>
      <Box sx={{ px: 1.5, pt: 1, pb: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexShrink: 0 }}>
        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>현장목록</Typography>
        <Typography sx={{ color: '#9ca3af', fontSize: 13 }}>총 {totalCount}건</Typography>
      </Box>
      <Box sx={{ px: 1.5, flexShrink: 0 }}>
        <Box
          sx={{
            mb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: 2,
            px: 1.25,
            minHeight: 44,
          }}
        >
          <SearchIcon sx={{ color: '#6b7280', fontSize: 20, flexShrink: 0 }} />
          <Box
            component="input"
            type="text"
            className="mobile-site-search"
            value={localQuery}
            placeholder="현장명, 주소, 발주처로 검색..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="search"
            inputMode="search"
            onChange={(e) => applySearch(e.target.value)}
            onCompositionStart={() => { composingRef.current = true; }}
            onCompositionEnd={(e) => {
              composingRef.current = false;
              applySearch(e.target.value);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            sx={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              outline: 'none',
              bgcolor: 'transparent',
              color: '#fff',
              fontSize: '16px',
              py: 1.1,
              WebkitUserSelect: 'text',
              userSelect: 'text',
              touchAction: 'manipulation',
              '&::placeholder': { color: '#6b7280' },
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mb: 1, overflowX: 'auto' }}>
          {FILTERS.map((name) => {
            const count = name === '전체' ? totalCount : (statusCounts[name] || 0);
            const active = filter === name;
            return (
              <Box
                key={name}
                onClick={() => setStatusTab(name === '전체' ? '전체' : name)}
                sx={{
                  px: 1.25,
                  py: 0.6,
                  borderRadius: 99,
                  bgcolor: active ? '#2563eb' : '#1f2937',
                  color: active ? '#fff' : '#9ca3af',
                  fontSize: 13,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {name} ({count})
              </Box>
            );
          })}
        </Box>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1.5, pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
        {list.map((site) => {
          const p = calculateProgress(site);
          const loc = locationLabel(site);
          const start = formatDotDate(site.startDate);
          const end = formatDotDate(site.endDate);
          return (
            <Box
              key={site.id}
              onClick={() => onSelectSite(site)}
              sx={{
                bgcolor: '#151b24',
                borderRadius: 2.5,
                p: 1.4,
                mb: 1,
                border: '1px solid #243044',
                cursor: 'pointer',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.4 }}>
                    <Box sx={{ bgcolor: STATUS_COLOR[site.status]?.bg || '#0e7490', px: 0.8, py: 0.15, borderRadius: 1, fontSize: 11, fontWeight: 800, color: '#fff' }}>
                      {site.status}
                    </Box>
                    <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {site.name}
                    </Typography>
                  </Box>
                  <Typography sx={{ color: '#9ca3af', fontSize: 12 }}>
                    {loc}{start && end ? `    ${start} ~ ${end}` : ''}
                  </Typography>
                </Box>
                <Box sx={{ fontSize: 22, lineHeight: 1 }}>{weatherByKey.default?.icon || '☀️'}</Box>
              </Box>
              {p != null && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Box sx={{ flex: 1, height: 7, bgcolor: '#1f2937', borderRadius: 99, overflow: 'hidden' }}>
                    <Box sx={{ width: `${p}%`, height: '100%', bgcolor: '#22c55e' }} />
                  </Box>
                  <Typography sx={{ color: '#d1d5db', fontSize: 12, fontWeight: 700, minWidth: 36, textAlign: 'right' }}>{Math.round(p)}%</Typography>
                </Box>
              )}
            </Box>
          );
        })}
        <Box
          onClick={() => onNewSite && onNewSite()}
          sx={{
            mt: 0.5,
            mb: 1,
            textAlign: 'center',
            py: 1.2,
            borderRadius: 2,
            border: '1px dashed #374151',
            color: '#9ca3af',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          + 새 현장 추가
        </Box>
      </Box>
    </Box>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.85, borderBottom: '1px solid #1f2937' }}>
      <Typography sx={{ color: '#9ca3af', fontSize: 13, flexShrink: 0 }}>{label}</Typography>
      <Typography sx={{ color: highlight ? '#3b82f6' : '#fff', fontSize: 13, fontWeight: highlight ? 800 : 600, textAlign: 'right' }}>
        {value || '-'}
      </Typography>
    </Box>
  );
}

import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, IconButton, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
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

export const DEFAULT_QUANTITY_ITEMS = [
  { id: '1', name: '복층', contract: 0, actual: 0 },
  { id: '2', name: '강화', contract: 0, actual: 0 },
  { id: '3', name: 'T', contract: 0, actual: 0 },
  { id: '4', name: '로이', contract: 0, actual: 0 },
];

let nextId = 5;

/** 강제 제외 키워드: 포함되어 있으면 무조건 제외 */
const HARD_EXCLUDE_KEYWORDS = ['시트', '코킹', '설치', '방습거울', '내측면', '필름', '몰딩'];

/** 일반 제외 키워드: 유리두께, 타격, 에칭, 필름, 실리콘 등 */
const EXCLUDE_KEYWORDS = ['유리두께', '타격', '에칭', '필름', '실리콘', '스페이서', '실란', '부착'];

/** 포함 키워드: 투명, 강화, 맑은, 복층유리, 로이유리, 로이, 반강화 + 00.0/00.00 형태 숫자 */
const INCLUDE_KEYWORDS = ['투명', '강화', '맑은', '복층유리', '로이유리', '로이', '복층', '반강화'];

/** 항목명이 유리 계열만 허용 — 포함 조건(키워드·00.0 숫자)을 먼저 보고, 해당하면 필름 등 제외 키워드 있어도 포함 */
export function isGlassQuantityItem(name) {
  const n = (name || '').toString().trim();
  if (!n) return false;
  // 시트, 코킹 등은 유리 단어가 있어도 항상 제외
  if (HARD_EXCLUDE_KEYWORDS.some((k) => n.includes(k))) return false;
  if (INCLUDE_KEYWORDS.some((k) => n.includes(k))) return true;
  if (/\d+\.\d+/.test(n)) return true;
  if (EXCLUDE_KEYWORDS.some((k) => n.includes(k))) return false;
  return false;
}

/** 물량내역(site.items)에서 계약 물량 로드 — 총계/부가세/스페이서 제외, 유리 계열만(투명·강화·맑은·복층유리·로이·00.00 등) */
export function initItemsFromSiteItems(site) {
  const items = site?.items;
  if (!Array.isArray(items) || items.length === 0) return null;
  const rows = items.filter(
    (item) =>
      !item?.isSpacer &&
      !item?.isTotal &&
      !item?.isVat &&
      !item?.isTotalWithVat &&
      (item?.name || '').toString().trim() !== '' &&
      isGlassQuantityItem(item.name)
  );
  if (rows.length === 0) return null;
  return rows.map((item, i) => ({
    id: `site-${i}-${item.name || i}`,
    name: (item.name || '').toString().trim(),
    contract: Number(item.quantity) || Number(item.contract) || 0,
    actual: 0,
  }));
}

/** quantity_info만 있을 때 (물량내역 없음) — 유리 계열만 */
export function initItemsFromQuantityInfo(quantityInfo) {
  const fromInfo = (quantityInfo || [])
    .map((q, i) => ({
      id: `qi-${q.id || i}`,
      name: (q.category || q.name || q.itemName || `항목${i + 1}`).toString().trim(),
      contract: Number(q.contract) || Number(q.contractAmount) || 0,
      actual: Number(q.actual) || Number(q.amount) || 0,
    }))
    .filter((row) => isGlassQuantityItem(row.name));
  if (fromInfo.length > 0) return fromInfo;
  return DEFAULT_QUANTITY_ITEMS.map((d, i) => ({ ...d, id: String(i + 1) }));
}

/** 물량내역(site.items) 우선, 실물량(quantityInfo)으로 actual 보강 — 유리 계열만 */
export function initItemsFromSiteAndQuantity(site, quantityInfo) {
  const fromSite = initItemsFromSiteItems(site);
  const qtyInfoList = (quantityInfo || []).filter((q) =>
    isGlassQuantityItem((q.category || q.name || q.itemName || '').toString().trim())
  );
  if (fromSite && fromSite.length > 0) {
    return fromSite.map((row) => {
      const match = qtyInfoList.find(
        (q) =>
          (q.category || q.name || q.itemName || '').toString().trim() === row.name
      );
      const actual = match
        ? Number(match.actual) || Number(match.amount) || 0
        : 0;
      return { ...row, actual };
    });
  }
  return initItemsFromQuantityInfo(quantityInfo);
}

export default function QuantityComparePanel({ quantityInfo = [], site, progressList = [], items: controlledItems, setItems: setControlledItems }) {
  const isControlled = controlledItems != null && setControlledItems != null;
  const [internalItems, setInternalItems] = useState(() => initItemsFromQuantityInfo(quantityInfo));
  const items = isControlled ? controlledItems : internalItems;
  const setItems = isControlled ? setControlledItems : setInternalItems;

  const addItem = () => {
    setItems((prev) => [...prev, { id: `new-${nextId++}`, name: '', contract: 0, actual: 0 }]);
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (id, field, value) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, [field]: field === 'name' ? value : Number(value) || 0 }
          : i
      )
    );
  };

  const chartData = items
    .filter((i) => i.name.trim() !== '')
    .map((i) => ({ name: i.name.trim(), 계약: i.contract, 실제: i.actual }));

  return (
    <Box sx={{ ...cardSx, p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ color: DSH.textSecondary }}>
          계약물량 vs 실제물량
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={addItem}
          sx={{ color: DSH.mint }}
        >
          추가
        </Button>
      </Box>

      {/* 차트 먼저 표시 */}
      {chartData.length > 0 && (
        <Box sx={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
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
        </Box>
      )}

      {/* 아래쪽에 품목/물량 입력 리스트 */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 220, overflow: 'auto' }}>
        {items.map((row) => (
          <Box
            key={row.id}
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 100px 100px 40px',
              gap: 1,
              alignItems: 'center',
            }}
          >
            <TextField
              size="small"
              placeholder="물량명"
              value={row.name}
              onChange={(e) => updateItem(row.id, 'name', e.target.value)}
              sx={{
                '& .MuiInputBase-input': { color: DSH.textPrimary, fontSize: '0.875rem' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: DSH.border },
              }}
            />
            <TextField
              size="small"
              type="number"
              placeholder="계약"
              value={row.contract || ''}
              onChange={(e) => updateItem(row.id, 'contract', e.target.value)}
              sx={{
                '& .MuiInputBase-input': { color: DSH.textPrimary, fontSize: '0.875rem' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: DSH.border },
              }}
            />
            <TextField
              size="small"
              type="number"
              placeholder="실제"
              value={row.actual || ''}
              onChange={(e) => updateItem(row.id, 'actual', e.target.value)}
              sx={{
                '& .MuiInputBase-input': { color: DSH.textPrimary, fontSize: '0.875rem' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: DSH.border },
              }}
            />
            <IconButton size="small" onClick={() => removeItem(row.id)} sx={{ color: DSH.textMuted }}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Snackbar,
  Alert,
  IconButton,
  Stack,
  InputAdornment,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeProducts,
  subscribeWarehouses,
  subscribeInvSites,
  subscribeBalances,
  subscribeMovements,
  createProduct,
  updateProduct,
  deleteProduct,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  createInvSite,
  updateInvSite,
  deleteInvSite,
  createReceipt,
  createIssue,
  ensureInvSettings,
} from '../api/inventoryService';
import {
  WAREHOUSE_TYPES,
  UNIT_OPTIONS,
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_OTHER,
  warehouseTypeLabel,
  stockStatus,
} from '../utils/inventory/collections';

const NAV = [
  { key: 'dashboard', label: '부자재 재고 확인', icon: DashboardOutlinedIcon },
  { key: 'stock', label: '재고 현황', icon: Inventory2OutlinedIcon },
  { key: 'movements', label: '입출고', icon: SwapHorizOutlinedIcon },
  { key: 'products', label: '품목', icon: CategoryOutlinedIcon },
  { key: 'warehouses', label: '창고', icon: WarehouseOutlinedIcon },
  { key: 'sites', label: '현장', icon: PlaceOutlinedIcon },
];

const ACCENT = '#2dd4bf';
const ACCENT_DIM = 'rgba(45, 212, 191, 0.12)';
const SURFACE = '#1e222b';
const SURFACE_2 = '#252a35';
const BORDER = 'rgba(255,255,255,0.06)';
const MUTED = '#8b93a7';

const emptyProduct = {
  sku: '',
  name: '',
  categoryName: '실리콘',
  categoryCustom: '',
  companyName: '',
  specification: '',
  baseUnit: 'EA',
  minStock: 0,
  reorderPoint: 0,
  safetyStock: 0,
  standardPrice: 0,
  barcode: '',
  memo: '',
};
const emptyWarehouse = {
  name: '', code: '', type: 'material_warehouse', address: '', phone: '', memo: '', isActive: true,
};
const emptySite = {
  name: '', code: '', linkedWarehouseId: '', address: '', phone: '', memo: '',
};

const formatTs = (ts) => {
  if (!ts) return '-';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '-';
  }
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: SURFACE_2,
    color: '#fff',
    '& fieldset': { borderColor: BORDER },
    '&:hover fieldset': { borderColor: 'rgba(45,212,191,0.35)' },
    '&.Mui-focused fieldset': { borderColor: ACCENT },
  },
  '& .MuiInputLabel-root': { color: MUTED },
  '& .MuiInputLabel-root.Mui-focused': { color: ACCENT },
  '& .MuiSelect-icon': { color: MUTED },
};

/** BottomBar(zIndex 20000)보다 위에서 Select 메뉴가 열리도록 */
const SELECT_Z = 30000;

const selectMenuProps = {
  disablePortal: false,
  container: typeof document !== 'undefined' ? document.body : undefined,
  PaperProps: {
    sx: {
      bgcolor: '#2a303c',
      color: '#fff',
      border: `1px solid ${BORDER}`,
      maxHeight: 320,
      zIndex: SELECT_Z,
      '& .MuiMenuItem-root': {
        color: '#e8eaef',
        fontSize: '0.9rem',
        '&:hover': { bgcolor: 'rgba(45,212,191,0.12)' },
        '&.Mui-selected': {
          bgcolor: 'rgba(45,212,191,0.2)',
          '&:hover': { bgcolor: 'rgba(45,212,191,0.28)' },
        },
      },
    },
  },
  MenuListProps: { dense: true },
  sx: { zIndex: SELECT_Z },
  style: { zIndex: SELECT_Z },
};

const thSx = {
  color: MUTED,
  fontWeight: 600,
  fontSize: '0.75rem',
  letterSpacing: '0.04em',
  borderBottom: `1px solid ${BORDER}`,
  bgcolor: SURFACE,
  py: 1.25,
  whiteSpace: 'nowrap',
};

const tdSx = {
  color: '#e8eaef',
  borderBottom: `1px solid ${BORDER}`,
  py: 1.35,
  fontSize: '0.875rem',
};

const SectionHeader = ({ title, subtitle, actions }) => (
  <Stack
    direction={{ xs: 'column', sm: 'row' }}
    justifyContent="space-between"
    alignItems={{ xs: 'stretch', sm: 'flex-end' }}
    spacing={1.5}
    sx={{ mb: 2.5 }}
  >
    <Box>
      <Typography sx={{ fontSize: '1.35rem', fontWeight: 700, color: '#f3f4f6', letterSpacing: '-0.02em' }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography sx={{ mt: 0.4, fontSize: '0.85rem', color: MUTED }}>{subtitle}</Typography>
      )}
    </Box>
    {actions && (
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {actions}
      </Stack>
    )}
  </Stack>
);

const Inventory = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { currentUser } = useAuth();
  const userId = currentUser?.uid || currentUser?.id || '';

  const [section, setSection] = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [sites, setSites] = useState([]);
  const [balances, setBalances] = useState([]);
  const [movements, setMovements] = useState([]);
  const [search, setSearch] = useState('');
  const [movementFilter, setMovementFilter] = useState('all');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const [productDialog, setProductDialog] = useState({ open: false, editId: null, form: emptyProduct });
  const [warehouseDialog, setWarehouseDialog] = useState({ open: false, editId: null, form: emptyWarehouse });
  const [siteDialog, setSiteDialog] = useState({ open: false, editId: null, form: emptySite });
  const [receiptDialog, setReceiptDialog] = useState({
    open: false,
    form: { warehouseId: '', productId: '', quantity: '', unitPrice: '', memo: '' },
  });
  const [issueDialog, setIssueDialog] = useState({
    open: false,
    form: { warehouseId: '', siteId: '', productId: '', quantity: '', purpose: '', memo: '' },
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    ensureInvSettings().catch(() => {});
    const unsubs = [
      subscribeProducts(setProducts),
      subscribeWarehouses(setWarehouses),
      subscribeInvSites(setSites),
      subscribeBalances(setBalances),
      subscribeMovements(setMovements),
    ];
    return () => unsubs.forEach((u) => u && u());
  }, []);

  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const warehouseMap = useMemo(() => Object.fromEntries(warehouses.map((w) => [w.id, w])), [warehouses]);

  const stockRows = useMemo(() => balances.map((b) => {
    const product = productMap[b.productId];
    return {
      ...b,
      productName: product?.name || '(삭제된 품목)',
      sku: product?.sku || '',
      warehouseName: warehouseMap[b.warehouseId]?.name || '-',
      minStock: product?.minStock ?? 0,
      status: stockStatus(b.quantityOnHand, product?.minStock),
    };
  }), [balances, productMap, warehouseMap]);

  const filteredStock = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stockRows;
    return stockRows.filter((r) =>
      r.productName.toLowerCase().includes(q) ||
      r.sku.toLowerCase().includes(q) ||
      r.warehouseName.toLowerCase().includes(q)
    );
  }, [stockRows, search]);

  const filteredMovements = useMemo(() => {
    if (movementFilter === 'receipt') return movements.filter((m) => m.type === 'receipt');
    if (movementFilter === 'issue') return movements.filter((m) => m.type === 'issue');
    return movements;
  }, [movements, movementFilter]);

  const dashboard = useMemo(() => {
    const totalQty = balances.reduce((s, b) => s + (Number(b.quantityOnHand) || 0), 0);
    const totalValue = balances.reduce((s, b) => s + (Number(b.totalValue) || 0), 0);
    const lowStock = stockRows.filter((r) => r.status === '부족' || r.status === '품절');
    return {
      productCount: products.length,
      warehouseCount: warehouses.length,
      totalQty,
      totalValue,
      lowCount: lowStock.length,
      lowStock: lowStock.slice(0, 8),
      recent: movements.slice(0, 12),
    };
  }, [balances, stockRows, products, warehouses, movements]);

  /** 품목별 재고 합계 (창고 합산) */
  const productStockSummary = useMemo(() => {
    const map = {};
    balances.forEach((b) => {
      const pid = b.productId;
      if (!map[pid]) {
        map[pid] = { productId: pid, quantityOnHand: 0, totalValue: 0 };
      }
      map[pid].quantityOnHand += Number(b.quantityOnHand) || 0;
      map[pid].totalValue += Number(b.totalValue) || 0;
    });
    return products.map((p) => {
      const sum = map[p.id] || { quantityOnHand: 0, totalValue: 0 };
      return {
        ...p,
        quantityOnHand: sum.quantityOnHand,
        totalValue: sum.totalValue,
        status: stockStatus(sum.quantityOnHand, p.minStock),
      };
    });
  }, [products, balances]);

  const productsByCategory = useMemo(() => {
    const groups = {};
    productStockSummary.forEach((p) => {
      const cat = (p.categoryName || '기타').trim() || '기타';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    const known = PRODUCT_CATEGORIES.filter((c) => c !== PRODUCT_CATEGORY_OTHER);
    const keys = Object.keys(groups).sort((a, b) => {
      const ia = known.indexOf(a);
      const ib = known.indexOf(b);
      const aOther = !known.includes(a);
      const bOther = !known.includes(b);
      if (!aOther && !bOther) return ia - ib;
      if (!aOther && bOther) return -1;
      if (aOther && !bOther) return 1;
      return a.localeCompare(b, 'ko');
    });
    return keys.map((category) => ({
      category,
      items: groups[category].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko')),
    }));
  }, [productStockSummary]);

  const resolveCategoryName = (form) => {
    if (form.categoryName === PRODUCT_CATEGORY_OTHER) {
      const custom = String(form.categoryCustom || '').trim();
      return custom || PRODUCT_CATEGORY_OTHER;
    }
    return form.categoryName || '실리콘';
  };

  const openProductDialog = (editId = null, product = null) => {
    if (!editId || !product) {
      setProductDialog({ open: true, editId: null, form: emptyProduct });
      return;
    }
    const cat = String(product.categoryName || '').trim();
    const isKnown = PRODUCT_CATEGORIES.includes(cat) && cat !== PRODUCT_CATEGORY_OTHER;
    setProductDialog({
      open: true,
      editId,
      form: {
        ...emptyProduct,
        ...product,
        categoryName: isKnown ? cat : PRODUCT_CATEGORY_OTHER,
        categoryCustom: isKnown ? '' : (cat === PRODUCT_CATEGORY_OTHER ? '' : cat),
        companyName: product.companyName || '',
      },
    });
  };

  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity });

  const handleSaveProduct = async () => {
    try {
      setSubmitting(true);
      const categoryName = resolveCategoryName(productDialog.form);
      const payload = {
        sku: String(productDialog.form.sku || '').trim(),
        name: productDialog.form.name,
        categoryName,
        companyName: String(productDialog.form.companyName || '').trim(),
        specification: productDialog.form.specification,
        baseUnit: productDialog.form.baseUnit,
        minStock: Number(productDialog.form.minStock) || 0,
        reorderPoint: Number(productDialog.form.reorderPoint) || 0,
        safetyStock: Number(productDialog.form.safetyStock) || 0,
        standardPrice: Number(productDialog.form.standardPrice) || 0,
        barcode: productDialog.form.barcode,
        memo: productDialog.form.memo,
      };
      if (productDialog.editId) {
        await updateProduct(userId, productDialog.editId, payload);
        showSnack('품목이 수정되었습니다.');
      } else {
        await createProduct(userId, payload);
        showSnack('품목이 등록되었습니다.');
      }
      setProductDialog({ open: false, editId: null, form: emptyProduct });
    } catch (e) {
      showSnack(e.message || '저장 실패', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveWarehouse = async () => {
    try {
      setSubmitting(true);
      if (warehouseDialog.editId) {
        await updateWarehouse(userId, warehouseDialog.editId, warehouseDialog.form);
        showSnack('창고가 수정되었습니다.');
      } else {
        await createWarehouse(userId, warehouseDialog.form);
        showSnack('창고가 등록되었습니다.');
      }
      setWarehouseDialog({ open: false, editId: null, form: emptyWarehouse });
    } catch (e) {
      showSnack(e.message || '저장 실패', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSite = async () => {
    try {
      setSubmitting(true);
      const payload = { ...siteDialog.form, linkedWarehouseId: siteDialog.form.linkedWarehouseId || null };
      if (siteDialog.editId) {
        await updateInvSite(userId, siteDialog.editId, payload);
        showSnack('현장이 수정되었습니다.');
      } else {
        await createInvSite(userId, payload);
        showSnack('현장이 등록되었습니다.');
      }
      setSiteDialog({ open: false, editId: null, form: emptySite });
    } catch (e) {
      showSnack(e.message || '저장 실패', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceipt = async () => {
    try {
      setSubmitting(true);
      await createReceipt(userId, {
        ...receiptDialog.form,
        quantity: Number(receiptDialog.form.quantity),
        unitPrice: Number(receiptDialog.form.unitPrice) || 0,
      });
      showSnack('입고가 완료되었습니다.');
      setReceiptDialog({ open: false, form: { warehouseId: '', productId: '', quantity: '', unitPrice: '', memo: '' } });
    } catch (e) {
      showSnack(e.message || '입고 실패', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssue = async () => {
    try {
      setSubmitting(true);
      await createIssue(userId, { ...issueDialog.form, quantity: Number(issueDialog.form.quantity) });
      showSnack('출고가 완료되었습니다.');
      setIssueDialog({ open: false, form: { warehouseId: '', siteId: '', productId: '', quantity: '', purpose: '', memo: '' } });
    } catch (e) {
      showSnack(e.message || '출고 실패', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const statusDot = (status) => {
    const color = status === '정상' ? '#34d399' : status === '부족' ? '#fbbf24' : '#f87171';
    return (
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color }} />
        <Typography sx={{ fontSize: '0.8rem', color }}>{status}</Typography>
      </Stack>
    );
  };

  const primaryBtn = {
    bgcolor: ACCENT,
    color: '#042f2e',
    fontWeight: 700,
    textTransform: 'none',
    boxShadow: 'none',
    '&:hover': { bgcolor: '#5eead4', boxShadow: 'none' },
  };

  const ghostBtn = {
    color: '#e5e7eb',
    borderColor: BORDER,
    textTransform: 'none',
    '&:hover': { borderColor: ACCENT, bgcolor: ACCENT_DIM },
  };

  const dialogPaper = {
    sx: { zIndex: SELECT_Z - 1 },
    PaperProps: {
      sx: {
        bgcolor: SURFACE,
        color: '#fff',
        backgroundImage: 'none',
        border: `1px solid ${BORDER}`,
        overflow: 'visible',
      },
    },
  };

  const renderTable = (headers, rows, emptyText) => (
    <Box
      sx={{
        border: `1px solid ${BORDER}`,
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: SURFACE,
      }}
    >
      <TableContainer sx={{ maxHeight: 'calc(100vh - 260px)' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {headers.map((h) => (
                <TableCell key={h} sx={thSx}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={headers.length} sx={{ ...tdSx, textAlign: 'center', color: MUTED, py: 6 }}>
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              rows
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  return (
    <Box
      sx={{
        height: 'calc(100% - 64px)',
        minHeight: 0,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        bgcolor: '#16191f',
        color: '#fff',
        overflow: 'hidden',
        mt: '64px',
        boxSizing: 'border-box',
      }}
    >
      {/* 좌측 섹션 내비 */}
      <Box
        sx={{
          width: { xs: '100%', md: 168 },
          flexShrink: 0,
          borderRight: { md: `1px solid ${BORDER}` },
          borderBottom: { xs: `1px solid ${BORDER}`, md: 'none' },
          bgcolor: '#181b22',
          px: { xs: 1.25, md: 1.5 },
          py: { xs: 1.25, md: 2 },
          display: 'flex',
          flexDirection: { xs: 'row', md: 'column' },
          gap: 0.5,
          overflowX: { xs: 'auto', md: 'visible' },
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {!isMobile && (
          <Typography
            sx={{
              px: 1,
              mb: 1.5,
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: MUTED,
              textTransform: 'uppercase',
            }}
          >
            재고관리
          </Typography>
        )}
        {NAV.map((item) => {
          const active = section === item.key;
          const Icon = item.icon;
          return (
            <Box
              key={item.key}
              component="button"
              type="button"
              onClick={() => setSection(item.key)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.25,
                py: 1,
                minWidth: { xs: 'auto', md: '100%' },
                whiteSpace: 'nowrap',
                border: 'none',
                borderRadius: 1.5,
                cursor: 'pointer',
                bgcolor: active ? ACCENT_DIM : 'transparent',
                color: active ? ACCENT : MUTED,
                fontWeight: active ? 700 : 500,
                fontSize: '0.85rem',
                transition: 'all 0.15s ease',
                '&:hover': {
                  bgcolor: active ? ACCENT_DIM : 'rgba(255,255,255,0.04)',
                  color: active ? ACCENT : '#d1d5db',
                },
              }}
            >
              <Icon sx={{ fontSize: 18 }} />
              {item.label}
            </Box>
          );
        })}
      </Box>

      {/* 본문 */}
      <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'auto', p: { xs: 1.75, md: 3 } }}>
        {section === 'dashboard' && (
          <Box>
            <SectionHeader
              title="부자재 재고 확인"
              subtitle="창고·품목 재고를 한눈에 보고 바로 조치하세요."
              actions={
                <>
                  <Button size="small" variant="outlined" sx={ghostBtn} onClick={() => setSection('movements')}>
                    입출고 바로가기
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    sx={primaryBtn}
                    startIcon={<AddIcon />}
                    onClick={() => setReceiptDialog((p) => ({ ...p, open: true }))}
                  >
                    입고
                  </Button>
                </>
              }
            />

            {/* 숫자 스트립 — 카드 대신 한 줄 구성 */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                gap: 0,
                mb: 3,
                border: `1px solid ${BORDER}`,
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: SURFACE,
              }}
            >
              {[
                { label: '품목', value: dashboard.productCount, go: 'products' },
                { label: '총 수량', value: dashboard.totalQty.toLocaleString() },
                { label: '평가금액', value: `${dashboard.totalValue.toLocaleString()}원` },
                { label: '부족·품절', value: dashboard.lowCount, go: 'stock', warn: dashboard.lowCount > 0 },
              ].map((item, i) => (
                <Box
                  key={item.label}
                  onClick={item.go ? () => setSection(item.go) : undefined}
                  sx={{
                    px: 2.5,
                    py: 2.25,
                    cursor: item.go ? 'pointer' : 'default',
                    borderLeft: i === 0 ? 'none' : { xs: 'none', md: `1px solid ${BORDER}` },
                    borderTop: { xs: i >= 2 ? `1px solid ${BORDER}` : 'none', md: 'none' },
                    borderRight: { xs: i % 2 === 0 ? `1px solid ${BORDER}` : 'none', md: 'none' },
                    '&:hover': item.go ? { bgcolor: 'rgba(255,255,255,0.02)' } : {},
                  }}
                >
                  <Typography sx={{ fontSize: '0.75rem', color: MUTED, mb: 0.75 }}>{item.label}</Typography>
                  <Typography
                    sx={{
                      fontSize: '1.65rem',
                      fontWeight: 700,
                      letterSpacing: '-0.03em',
                      color: item.warn ? '#fbbf24' : '#f9fafb',
                      lineHeight: 1.1,
                    }}
                  >
                    {item.value}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: '1fr 1.3fr' },
                gap: 2,
              }}
            >
              <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: SURFACE, p: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 1.5, fontSize: '0.95rem' }}>부족재고</Typography>
                {dashboard.lowStock.length === 0 ? (
                  <Typography sx={{ color: MUTED, fontSize: '0.85rem', py: 3, textAlign: 'center' }}>
                    부족한 재고가 없습니다
                  </Typography>
                ) : (
                  dashboard.lowStock.map((r) => (
                    <Box
                      key={`${r.warehouseId}_${r.productId}`}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 1.25,
                        borderBottom: `1px solid ${BORDER}`,
                        '&:last-child': { borderBottom: 'none' },
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{r.productName}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: MUTED, mt: 0.25 }}>
                          {r.warehouseName} · 현재 {r.quantityOnHand} / 최소 {r.minStock}
                        </Typography>
                      </Box>
                      {statusDot(r.status)}
                    </Box>
                  ))
                )}
              </Box>

              <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: SURFACE, p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>최근 입출고</Typography>
                  <Button size="small" sx={{ ...ghostBtn, minWidth: 0, px: 1 }} onClick={() => setSection('movements')}>
                    전체
                  </Button>
                </Stack>
                {dashboard.recent.length === 0 ? (
                  <Typography sx={{ color: MUTED, fontSize: '0.85rem', py: 3, textAlign: 'center' }}>
                    아직 입출고 기록이 없습니다
                  </Typography>
                ) : (
                  dashboard.recent.map((m) => (
                    <Box
                      key={m.id}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '56px 1fr auto',
                        gap: 1.25,
                        alignItems: 'center',
                        py: 1.1,
                        borderBottom: `1px solid ${BORDER}`,
                        '&:last-child': { borderBottom: 'none' },
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: m.type === 'receipt' ? ACCENT : '#fbbf24',
                        }}
                      >
                        {m.type === 'receipt' ? '입고' : '출고'}
                      </Typography>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {productMap[m.productId]?.name || '-'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: MUTED }}>
                          {warehouseMap[m.warehouseId]?.name || '-'} · {formatTs(m.createdAt)}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: m.quantityChange > 0 ? ACCENT : '#f87171' }}>
                        {m.quantityChange > 0 ? '+' : ''}{m.quantityChange}
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>
            </Box>
          </Box>
        )}

        {section === 'stock' && (
          <Box>
            <SectionHeader
              title="재고 현황"
              subtitle="창고·품목별 현재고와 평가금액을 조회합니다."
              actions={
                <TextField
                  size="small"
                  placeholder="품목, SKU, 창고 검색"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  sx={{ ...fieldSx, minWidth: { xs: '100%', sm: 260 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: MUTED, fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              }
            />
            {renderTable(
              ['품목', '창고', '현재고', '최소', '평가금액', '상태'],
              filteredStock.map((r) => (
                <TableRow key={r.id} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                  <TableCell sx={tdSx}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.productName}</Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: MUTED }}>{r.sku}</Typography>
                  </TableCell>
                  <TableCell sx={{ ...tdSx, color: MUTED }}>{r.warehouseName}</TableCell>
                  <TableCell sx={{ ...tdSx, fontWeight: 700 }}>{r.quantityOnHand}</TableCell>
                  <TableCell sx={{ ...tdSx, color: MUTED }}>{r.minStock}</TableCell>
                  <TableCell sx={{ ...tdSx, color: MUTED }}>{Number(r.totalValue || 0).toLocaleString()}</TableCell>
                  <TableCell sx={tdSx}>{statusDot(r.status)}</TableCell>
                </TableRow>
              )),
              '재고 데이터가 없습니다. 입고를 등록해 주세요.'
            )}
          </Box>
        )}

        {section === 'movements' && (
          <Box>
            <SectionHeader
              title="입출고"
              subtitle="입고·출고를 등록하고 이력을 확인합니다."
              actions={
                <>
                  <Button size="small" variant="contained" sx={primaryBtn} startIcon={<AddIcon />} onClick={() => setReceiptDialog((p) => ({ ...p, open: true }))}>
                    입고
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setIssueDialog((p) => ({ ...p, open: true }))}
                    sx={{ ...ghostBtn, borderColor: 'rgba(251,191,36,0.4)', color: '#fbbf24', '&:hover': { borderColor: '#fbbf24', bgcolor: 'rgba(251,191,36,0.08)' } }}
                  >
                    출고
                  </Button>
                </>
              }
            />
            <Stack direction="row" spacing={0.75} sx={{ mb: 2 }}>
              {[
                { k: 'all', l: '전체' },
                { k: 'receipt', l: '입고' },
                { k: 'issue', l: '출고' },
              ].map((f) => (
                <Button
                  key={f.k}
                  size="small"
                  onClick={() => setMovementFilter(f.k)}
                  sx={{
                    textTransform: 'none',
                    minWidth: 56,
                    bgcolor: movementFilter === f.k ? ACCENT_DIM : 'transparent',
                    color: movementFilter === f.k ? ACCENT : MUTED,
                    border: `1px solid ${movementFilter === f.k ? 'rgba(45,212,191,0.35)' : BORDER}`,
                    fontWeight: movementFilter === f.k ? 700 : 500,
                  }}
                >
                  {f.l}
                </Button>
              ))}
            </Stack>

            <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: SURFACE, overflow: 'hidden' }}>
              {filteredMovements.length === 0 ? (
                <Typography sx={{ color: MUTED, textAlign: 'center', py: 6, fontSize: '0.9rem' }}>
                  입출고 내역이 없습니다.
                </Typography>
              ) : (
                filteredMovements.map((m, idx) => (
                  <Box
                    key={m.id}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '72px 1fr 100px 120px' },
                      gap: { xs: 0.5, sm: 2 },
                      alignItems: 'center',
                      px: 2,
                      py: 1.5,
                      borderTop: idx === 0 ? 'none' : `1px solid ${BORDER}`,
                    }}
                  >
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: m.type === 'receipt' ? ACCENT : '#fbbf24' }}>
                      {m.type === 'receipt' ? '입고' : '출고'}
                    </Typography>
                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        {productMap[m.productId]?.name || '-'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: MUTED }}>
                        {warehouseMap[m.warehouseId]?.name || '-'}
                        {m.memo ? ` · ${m.memo}` : ''}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 700, color: m.quantityChange > 0 ? ACCENT : '#f87171' }}>
                      {m.quantityChange > 0 ? '+' : ''}{m.quantityChange} {m.unit || ''}
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: MUTED }}>{formatTs(m.createdAt)}</Typography>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        )}

        {section === 'products' && (
          <Box>
            <SectionHeader
              title="품목"
              subtitle="카테고리별·품목별 재고와 마스터를 관리합니다."
              actions={
                <Button size="small" variant="contained" sx={primaryBtn} startIcon={<AddIcon />} onClick={() => openProductDialog()}>
                  품목 등록
                </Button>
              }
            />

            {products.length === 0 ? (
              <Box sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: SURFACE, py: 6, textAlign: 'center', color: MUTED }}>
                등록된 품목이 없습니다.
              </Box>
            ) : (
              <Stack spacing={2.5}>
                {productsByCategory.map((group) => (
                  <Box key={group.category} sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, bgcolor: SURFACE, overflow: 'hidden' }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{
                        px: 2,
                        py: 1.25,
                        bgcolor: SURFACE_2,
                        borderBottom: `1px solid ${BORDER}`,
                      }}
                    >
                      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: ACCENT }}>
                        {group.category}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: MUTED }}>
                        {group.items.length}개 품목 · 합계{' '}
                        {group.items.reduce((s, p) => s + (Number(p.quantityOnHand) || 0), 0).toLocaleString()}
                      </Typography>
                    </Stack>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {['품목명', '회사', 'SKU', '단위', '현재고', '최소', '평가금액', '상태', ''].map((h) => (
                              <TableCell key={h || 'actions'} sx={thSx}>{h}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {group.items.map((p) => (
                            <TableRow key={p.id} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                              <TableCell sx={{ ...tdSx, fontWeight: 600 }}>{p.name}</TableCell>
                              <TableCell sx={{ ...tdSx, color: MUTED }}>{p.companyName || '-'}</TableCell>
                              <TableCell sx={{ ...tdSx, color: MUTED }}>{p.sku || '-'}</TableCell>
                              <TableCell sx={{ ...tdSx, color: MUTED }}>{p.baseUnit}</TableCell>
                              <TableCell sx={{ ...tdSx, fontWeight: 700 }}>{p.quantityOnHand}</TableCell>
                              <TableCell sx={{ ...tdSx, color: MUTED }}>{p.minStock}</TableCell>
                              <TableCell sx={{ ...tdSx, color: MUTED }}>{Number(p.totalValue || 0).toLocaleString()}</TableCell>
                              <TableCell sx={tdSx}>{statusDot(p.status)}</TableCell>
                              <TableCell sx={tdSx} align="right">
                                <IconButton size="small" sx={{ color: MUTED }} onClick={() => openProductDialog(p.id, p)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  sx={{ color: '#f87171' }}
                                  onClick={async () => {
                                    if (!window.confirm('품목을 삭제할까요?')) return;
                                    try {
                                      await deleteProduct(userId, p.id);
                                      showSnack('품목이 삭제되었습니다.');
                                    } catch (e) {
                                      showSnack(e.message || '삭제 실패', 'error');
                                    }
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        )}

        {section === 'warehouses' && (
          <Box>
            <SectionHeader
              title="창고"
              subtitle="본사·자재·차량 등 보관 위치를 관리합니다."
              actions={
                <Button size="small" variant="contained" sx={primaryBtn} startIcon={<AddIcon />} onClick={() => setWarehouseDialog({ open: true, editId: null, form: emptyWarehouse })}>
                  창고 등록
                </Button>
              }
            />
            {renderTable(
              ['창고명', '코드', '유형', '주소', '상태', ''],
              warehouses.map((w) => (
                <TableRow key={w.id} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                  <TableCell sx={{ ...tdSx, fontWeight: 600 }}>{w.name}</TableCell>
                  <TableCell sx={{ ...tdSx, color: MUTED }}>{w.code}</TableCell>
                  <TableCell sx={{ ...tdSx, color: MUTED }}>{warehouseTypeLabel(w.type)}</TableCell>
                  <TableCell sx={{ ...tdSx, color: MUTED }}>{w.address || '-'}</TableCell>
                  <TableCell sx={tdSx}>
                    <Chip
                      size="small"
                      label={w.isActive === false ? '중지' : '사용'}
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        bgcolor: w.isActive === false ? 'rgba(255,255,255,0.06)' : ACCENT_DIM,
                        color: w.isActive === false ? MUTED : ACCENT,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={tdSx} align="right">
                    <IconButton size="small" sx={{ color: MUTED }} onClick={() => setWarehouseDialog({ open: true, editId: w.id, form: { ...emptyWarehouse, ...w } })}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      sx={{ color: '#f87171' }}
                      onClick={async () => {
                        if (!window.confirm('창고를 삭제할까요?')) return;
                        try {
                          await deleteWarehouse(userId, w.id);
                          showSnack('창고가 삭제되었습니다.');
                        } catch (e) {
                          showSnack(e.message || '삭제 실패', 'error');
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )),
              '등록된 창고가 없습니다.'
            )}
          </Box>
        )}

        {section === 'sites' && (
          <Box>
            <SectionHeader
              title="현장"
              subtitle="출고 대상 현장과 연결 창고를 관리합니다."
              actions={
                <Button size="small" variant="contained" sx={primaryBtn} startIcon={<AddIcon />} onClick={() => setSiteDialog({ open: true, editId: null, form: emptySite })}>
                  현장 등록
                </Button>
              }
            />
            {renderTable(
              ['현장명', '코드', '연결 창고', '주소', ''],
              sites.map((s) => (
                <TableRow key={s.id} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                  <TableCell sx={{ ...tdSx, fontWeight: 600 }}>{s.name}</TableCell>
                  <TableCell sx={{ ...tdSx, color: MUTED }}>{s.code}</TableCell>
                  <TableCell sx={{ ...tdSx, color: MUTED }}>{warehouseMap[s.linkedWarehouseId]?.name || '-'}</TableCell>
                  <TableCell sx={{ ...tdSx, color: MUTED }}>{s.address || '-'}</TableCell>
                  <TableCell sx={tdSx} align="right">
                    <IconButton
                      size="small"
                      sx={{ color: MUTED }}
                      onClick={() => setSiteDialog({
                        open: true,
                        editId: s.id,
                        form: { ...emptySite, ...s, linkedWarehouseId: s.linkedWarehouseId || '' },
                      })}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      sx={{ color: '#f87171' }}
                      onClick={async () => {
                        if (!window.confirm('현장을 삭제할까요?')) return;
                        try {
                          await deleteInvSite(userId, s.id);
                          showSnack('현장이 삭제되었습니다.');
                        } catch (e) {
                          showSnack(e.message || '삭제 실패', 'error');
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )),
              '등록된 현장이 없습니다.'
            )}
          </Box>
        )}
      </Box>

      {/* 다이얼로그들 */}
      <Dialog open={productDialog.open} onClose={() => setProductDialog((p) => ({ ...p, open: false }))} maxWidth="sm" fullWidth {...dialogPaper}>
        <DialogTitle sx={{ fontWeight: 700 }}>{productDialog.editId ? '품목 수정' : '품목 등록'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel id="product-category-label">카테고리 *</InputLabel>
              <Select
                labelId="product-category-label"
                label="카테고리 *"
                value={productDialog.form.categoryName || '실리콘'}
                onChange={(e) => setProductDialog((p) => ({
                  ...p,
                  form: {
                    ...p.form,
                    categoryName: e.target.value,
                    categoryCustom: e.target.value === PRODUCT_CATEGORY_OTHER ? p.form.categoryCustom : '',
                  },
                }))}
                MenuProps={selectMenuProps}
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {productDialog.form.categoryName === PRODUCT_CATEGORY_OTHER && (
              <TextField
                label="기타 카테고리명"
                placeholder="직접 입력"
                value={productDialog.form.categoryCustom || ''}
                onChange={(e) => setProductDialog((p) => ({ ...p, form: { ...p.form, categoryCustom: e.target.value } }))}
                fullWidth
                size="small"
                sx={fieldSx}
              />
            )}
            <TextField label="SKU (선택)" value={productDialog.form.sku} onChange={(e) => setProductDialog((p) => ({ ...p, form: { ...p.form, sku: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
            <TextField label="품목명 *" value={productDialog.form.name} onChange={(e) => setProductDialog((p) => ({ ...p, form: { ...p.form, name: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
            <TextField label="회사" value={productDialog.form.companyName || ''} onChange={(e) => setProductDialog((p) => ({ ...p, form: { ...p.form, companyName: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
            <TextField label="규격" value={productDialog.form.specification} onChange={(e) => setProductDialog((p) => ({ ...p, form: { ...p.form, specification: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel>단위</InputLabel>
              <Select label="단위" value={productDialog.form.baseUnit} onChange={(e) => setProductDialog((p) => ({ ...p, form: { ...p.form, baseUnit: e.target.value } }))} MenuProps={selectMenuProps}>
                {UNIT_OPTIONS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1}>
              <TextField label="최소재고" type="number" value={productDialog.form.minStock} onChange={(e) => setProductDialog((p) => ({ ...p, form: { ...p.form, minStock: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
              <TextField label="발주점" type="number" value={productDialog.form.reorderPoint} onChange={(e) => setProductDialog((p) => ({ ...p, form: { ...p.form, reorderPoint: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
            </Stack>
            <Stack direction="row" spacing={1}>
              <TextField label="안전재고" type="number" value={productDialog.form.safetyStock} onChange={(e) => setProductDialog((p) => ({ ...p, form: { ...p.form, safetyStock: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
              <TextField label="표준단가" type="number" value={productDialog.form.standardPrice} onChange={(e) => setProductDialog((p) => ({ ...p, form: { ...p.form, standardPrice: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
            </Stack>
            <TextField label="바코드" value={productDialog.form.barcode} onChange={(e) => setProductDialog((p) => ({ ...p, form: { ...p.form, barcode: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
            <TextField label="메모" value={productDialog.form.memo} onChange={(e) => setProductDialog((p) => ({ ...p, form: { ...p.form, memo: e.target.value } }))} fullWidth size="small" multiline rows={2} sx={fieldSx} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setProductDialog((p) => ({ ...p, open: false }))} sx={{ color: MUTED }}>취소</Button>
          <Button variant="contained" disabled={submitting} onClick={handleSaveProduct} sx={primaryBtn}>저장</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={warehouseDialog.open} onClose={() => setWarehouseDialog((p) => ({ ...p, open: false }))} maxWidth="sm" fullWidth {...dialogPaper}>
        <DialogTitle sx={{ fontWeight: 700 }}>{warehouseDialog.editId ? '창고 수정' : '창고 등록'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="창고명 *" value={warehouseDialog.form.name} onChange={(e) => setWarehouseDialog((p) => ({ ...p, form: { ...p.form, name: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
            <TextField label="코드 *" value={warehouseDialog.form.code} onChange={(e) => setWarehouseDialog((p) => ({ ...p, form: { ...p.form, code: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel>유형</InputLabel>
              <Select label="유형" value={warehouseDialog.form.type} onChange={(e) => setWarehouseDialog((p) => ({ ...p, form: { ...p.form, type: e.target.value } }))} MenuProps={selectMenuProps}>
                {WAREHOUSE_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="주소" value={warehouseDialog.form.address} onChange={(e) => setWarehouseDialog((p) => ({ ...p, form: { ...p.form, address: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
            <TextField label="연락처" value={warehouseDialog.form.phone} onChange={(e) => setWarehouseDialog((p) => ({ ...p, form: { ...p.form, phone: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
            <TextField label="메모" value={warehouseDialog.form.memo} onChange={(e) => setWarehouseDialog((p) => ({ ...p, form: { ...p.form, memo: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setWarehouseDialog((p) => ({ ...p, open: false }))} sx={{ color: MUTED }}>취소</Button>
          <Button variant="contained" disabled={submitting} onClick={handleSaveWarehouse} sx={primaryBtn}>저장</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={siteDialog.open} onClose={() => setSiteDialog((p) => ({ ...p, open: false }))} maxWidth="sm" fullWidth {...dialogPaper}>
        <DialogTitle sx={{ fontWeight: 700 }}>{siteDialog.editId ? '현장 수정' : '현장 등록'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="현장명 *" value={siteDialog.form.name} onChange={(e) => setSiteDialog((p) => ({ ...p, form: { ...p.form, name: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
            <TextField label="코드 *" value={siteDialog.form.code} onChange={(e) => setSiteDialog((p) => ({ ...p, form: { ...p.form, code: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel>연결 창고</InputLabel>
              <Select label="연결 창고" value={siteDialog.form.linkedWarehouseId || ''} onChange={(e) => setSiteDialog((p) => ({ ...p, form: { ...p.form, linkedWarehouseId: e.target.value } }))} MenuProps={selectMenuProps}>
                <MenuItem value="">없음</MenuItem>
                {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="주소" value={siteDialog.form.address} onChange={(e) => setSiteDialog((p) => ({ ...p, form: { ...p.form, address: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
            <TextField label="연락처" value={siteDialog.form.phone} onChange={(e) => setSiteDialog((p) => ({ ...p, form: { ...p.form, phone: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
            <TextField label="메모" value={siteDialog.form.memo} onChange={(e) => setSiteDialog((p) => ({ ...p, form: { ...p.form, memo: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSiteDialog((p) => ({ ...p, open: false }))} sx={{ color: MUTED }}>취소</Button>
          <Button variant="contained" disabled={submitting} onClick={handleSaveSite} sx={primaryBtn}>저장</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={receiptDialog.open}
        onClose={() => setReceiptDialog((p) => ({ ...p, open: false }))}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
        {...dialogPaper}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>입고 등록</DialogTitle>
        <DialogContent sx={{ overflow: 'visible' }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {(warehouses.length === 0 || products.length === 0) && (
              <Alert severity="warning" sx={{ bgcolor: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>
                {warehouses.length === 0 && products.length === 0
                  ? '먼저 창고와 품목을 등록해 주세요.'
                  : warehouses.length === 0
                    ? '먼저 창고를 등록해 주세요.'
                    : '먼저 품목을 등록해 주세요.'}
              </Alert>
            )}
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel id="receipt-warehouse-label">창고</InputLabel>
              <Select
                labelId="receipt-warehouse-label"
                label="창고"
                value={receiptDialog.form.warehouseId || ''}
                onChange={(e) => setReceiptDialog((p) => ({ ...p, form: { ...p.form, warehouseId: e.target.value } }))}
                MenuProps={selectMenuProps}
                displayEmpty={false}
              >
                {warehouses.length === 0 ? (
                  <MenuItem disabled value="">등록된 창고 없음</MenuItem>
                ) : (
                  warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)
                )}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel id="receipt-product-label">품목</InputLabel>
              <Select
                labelId="receipt-product-label"
                label="품목"
                value={receiptDialog.form.productId || ''}
                onChange={(e) => setReceiptDialog((p) => ({ ...p, form: { ...p.form, productId: e.target.value } }))}
                MenuProps={selectMenuProps}
              >
                {products.length === 0 ? (
                  <MenuItem disabled value="">등록된 품목 없음</MenuItem>
                ) : (
                  products.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.sku ? `${p.name} (${p.sku})` : p.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <TextField label="수량 *" type="number" value={receiptDialog.form.quantity} onChange={(e) => setReceiptDialog((p) => ({ ...p, form: { ...p.form, quantity: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
            <TextField label="단가" type="number" value={receiptDialog.form.unitPrice} onChange={(e) => setReceiptDialog((p) => ({ ...p, form: { ...p.form, unitPrice: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
            <TextField label="메모" value={receiptDialog.form.memo} onChange={(e) => setReceiptDialog((p) => ({ ...p, form: { ...p.form, memo: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReceiptDialog((p) => ({ ...p, open: false }))} sx={{ color: MUTED }}>취소</Button>
          <Button variant="contained" disabled={submitting || !warehouses.length || !products.length} onClick={handleReceipt} sx={primaryBtn}>입고 완료</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={issueDialog.open}
        onClose={() => setIssueDialog((p) => ({ ...p, open: false }))}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
        {...dialogPaper}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>출고 등록</DialogTitle>
        <DialogContent sx={{ overflow: 'visible' }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel id="issue-warehouse-label">창고</InputLabel>
              <Select
                labelId="issue-warehouse-label"
                label="창고"
                value={issueDialog.form.warehouseId || ''}
                onChange={(e) => setIssueDialog((p) => ({ ...p, form: { ...p.form, warehouseId: e.target.value } }))}
                MenuProps={selectMenuProps}
              >
                {warehouses.length === 0 ? (
                  <MenuItem disabled value="">등록된 창고 없음</MenuItem>
                ) : (
                  warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)
                )}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel id="issue-site-label">현장 (선택)</InputLabel>
              <Select
                labelId="issue-site-label"
                label="현장 (선택)"
                value={issueDialog.form.siteId || ''}
                onChange={(e) => setIssueDialog((p) => ({ ...p, form: { ...p.form, siteId: e.target.value } }))}
                MenuProps={selectMenuProps}
              >
                <MenuItem value="">없음</MenuItem>
                {sites.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel id="issue-product-label">품목</InputLabel>
              <Select
                labelId="issue-product-label"
                label="품목"
                value={issueDialog.form.productId || ''}
                onChange={(e) => setIssueDialog((p) => ({ ...p, form: { ...p.form, productId: e.target.value } }))}
                MenuProps={selectMenuProps}
              >
                {products.length === 0 ? (
                  <MenuItem disabled value="">등록된 품목 없음</MenuItem>
                ) : (
                  products.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.sku ? `${p.name} (${p.sku})` : p.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <TextField label="수량 *" type="number" value={issueDialog.form.quantity} onChange={(e) => setIssueDialog((p) => ({ ...p, form: { ...p.form, quantity: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
            <TextField label="사용 목적" value={issueDialog.form.purpose} onChange={(e) => setIssueDialog((p) => ({ ...p, form: { ...p.form, purpose: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
            <TextField label="메모" value={issueDialog.form.memo} onChange={(e) => setIssueDialog((p) => ({ ...p, form: { ...p.form, memo: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setIssueDialog((p) => ({ ...p, open: false }))} sx={{ color: MUTED }}>취소</Button>
          <Button
            variant="contained"
            disabled={submitting}
            onClick={handleIssue}
            sx={{ ...primaryBtn, bgcolor: '#fbbf24', '&:hover': { bgcolor: '#f59e0b' } }}
          >
            출고 완료
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Inventory;

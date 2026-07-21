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
  TableSortLabel,
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
  Autocomplete,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
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
import { subscribeToSites } from '../api/sites';
import {
  WAREHOUSE_TYPES,
  UNIT_OPTIONS,
  UNIT_OTHER,
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_OTHER,
  SILICONE_COLORS,
  SILICONE_COLOR_OTHER,
  SILICONE_CATEGORY,
  SILICONE_SPECS,
  SILICONE_SPEC_OTHER,
  defaultUnitForCategory,
  warehouseTypeLabel,
  stockStatus,
} from '../utils/inventory/collections';

const NAV = [
  { key: 'dashboard', label: '부자재 재고 확인', icon: DashboardOutlinedIcon },
  { key: 'stock', label: '재고 현황', icon: Inventory2OutlinedIcon },
  { key: 'movements', label: '입출고', icon: SwapHorizOutlinedIcon },
  { key: 'products', label: '품목', icon: CategoryOutlinedIcon },
  { key: 'locations', label: '창고/현장', icon: WarehouseOutlinedIcon },
];

const WAREHOUSE_TYPES_FORM = WAREHOUSE_TYPES.filter((t) => t.value !== 'construction_site');

const ACCENT = '#2dd4bf';
const ACCENT_DIM = 'rgba(45, 212, 191, 0.12)';
const SURFACE = '#1e222b';
const SURFACE_2 = '#252a35';
const BORDER = 'rgba(255,255,255,0.06)';
const MUTED = '#8b93a7';

const emptyProduct = {
  name: '',
  categoryName: '실리콘',
  categoryCustom: '',
  companyName: '',
  color: '흑색',
  colorCustom: '',
  specification: '웨더용',
  specificationCustom: '',
  baseUnit: 'BOX',
  unitCustom: '',
  minStock: 0,
  reorderPoint: 0,
  safetyStock: 0,
  standardPrice: 0,
  barcode: '',
  memo: '',
};
const emptyLocation = {
  kind: 'warehouse',
  name: '',
  code: '',
  type: 'material_warehouse',
  linkedWarehouseId: '',
  linkedSiteId: '',
  address: '',
  phone: '',
  memo: '',
  isActive: true,
};

const makeLocationCode = (name, prefix = 'LOC') => {
  const base = String(name || '')
    .replace(/\s+/g, '')
    .slice(0, 10) || prefix;
  return `${base}_${Date.now().toString(36).slice(-4)}`;
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
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      '&::-webkit-scrollbar': { display: 'none', width: 0, height: 0 },
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

const autocompleteSlotProps = {
  popper: { sx: { zIndex: SELECT_Z } },
  paper: {
    sx: {
      bgcolor: '#2a303c',
      color: '#fff',
      border: '1px solid rgba(255,255,255,0.1)',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      '&::-webkit-scrollbar': { display: 'none', width: 0, height: 0 },
      '& .MuiAutocomplete-listbox': {
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        '&::-webkit-scrollbar': { display: 'none', width: 0, height: 0 },
      },
      '& .MuiAutocomplete-option': {
        fontSize: '0.875rem',
        color: '#e8eaef',
        '&[aria-selected="true"]': { bgcolor: 'rgba(45,212,191,0.2)' },
        '&.Mui-focused': { bgcolor: 'rgba(45,212,191,0.12)' },
      },
    },
  },
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

const categoryShortLabel = (cat) => {
  const map = {
    실리콘: '실리콘',
    노턴테이프: '노턴',
    마스킹테이프: '마스킹',
    셋팅블럭: '셋팅',
    로프: '로프',
    장갑: '장갑',
  };
  const name = String(cat || '').trim();
  return map[name] || name || '기타';
};

const compareValues = (a, b, field, dir) => {
  const mul = dir === 'asc' ? 1 : -1;
  const av = a?.[field];
  const bv = b?.[field];
  if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mul;
  return String(av ?? '').localeCompare(String(bv ?? ''), 'ko') * mul;
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
  const [managedSites, setManagedSites] = useState([]);
  const [balances, setBalances] = useState([]);
  const [movements, setMovements] = useState([]);
  const [search, setSearch] = useState('');
  const [movementFilter, setMovementFilter] = useState('all');
  const [productSort, setProductSort] = useState({ field: 'categoryName', dir: 'asc' });
  const [stockSort, setStockSort] = useState({ field: 'categoryName', dir: 'asc' });
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const [productDialog, setProductDialog] = useState({ open: false, editId: null, form: emptyProduct });
  const [locationDialog, setLocationDialog] = useState({ open: false, editId: null, form: emptyLocation });
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
      subscribeToSites(setManagedSites),
    ];
    return () => unsubs.forEach((u) => u && u());
  }, []);

  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const warehouseMap = useMemo(() => Object.fromEntries(warehouses.map((w) => [w.id, w])), [warehouses]);

  const locationRows = useMemo(() => {
    const wh = warehouses.map((w) => ({
      id: w.id,
      kind: 'warehouse',
      name: w.name,
      code: w.code,
      detail: warehouseTypeLabel(w.type),
      address: w.address || '',
      isActive: w.isActive !== false,
      raw: w,
    }));
    const st = sites.map((s) => ({
      id: s.id,
      kind: 'site',
      name: s.name,
      code: s.code,
      detail: warehouseMap[s.linkedWarehouseId]?.name ? `연결: ${warehouseMap[s.linkedWarehouseId].name}` : '현장',
      address: s.address || '',
      isActive: s.isActive !== false,
      raw: s,
    }));
    return [...wh, ...st].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'warehouse' ? -1 : 1;
      return String(a.name || '').localeCompare(String(b.name || ''), 'ko');
    });
  }, [warehouses, sites, warehouseMap]);

  const stockRows = useMemo(() => balances.map((b) => {
    const product = productMap[b.productId];
    return {
      ...b,
      productName: product?.name || '(삭제된 품목)',
      categoryName: product?.categoryName || '기타',
      categoryShort: categoryShortLabel(product?.categoryName),
      color: product?.color || '',
      companyName: product?.companyName || '',
      warehouseName: warehouseMap[b.warehouseId]?.name || '-',
      minStock: product?.minStock ?? 0,
      status: stockStatus(b.quantityOnHand, product?.minStock),
    };
  }), [balances, productMap, warehouseMap]);

  const filteredStock = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = stockRows;
    if (q) {
      rows = stockRows.filter((r) =>
        r.productName.toLowerCase().includes(q) ||
        r.warehouseName.toLowerCase().includes(q) ||
        (r.companyName || '').toLowerCase().includes(q) ||
        (r.color || '').toLowerCase().includes(q) ||
        (r.categoryName || '').toLowerCase().includes(q) ||
        (r.categoryShort || '').toLowerCase().includes(q)
      );
    }
    const { field, dir } = stockSort;
    return [...rows].sort((a, b) => compareValues(a, b, field, dir));
  }, [stockRows, search, stockSort]);

  const filteredMovements = useMemo(() => {
    if (movementFilter === 'receipt') return movements.filter((m) => m.type === 'receipt');
    if (movementFilter === 'issue') return movements.filter((m) => m.type === 'issue');
    return movements;
  }, [movements, movementFilter]);

  const dashboard = useMemo(() => {
    const totalQty = balances.reduce((s, b) => s + (Number(b.quantityOnHand) || 0), 0);
    const lowStock = stockRows.filter((r) => r.status === '부족' || r.status === '품절');
    return {
      productCount: products.length,
      warehouseCount: warehouses.length,
      totalQty,
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
      const categoryName = (p.categoryName || '기타').trim() || '기타';
      return {
        ...p,
        categoryName,
        categoryShort: categoryShortLabel(categoryName),
        quantityOnHand: sum.quantityOnHand,
        totalValue: sum.totalValue,
        status: stockStatus(sum.quantityOnHand, p.minStock),
      };
    });
  }, [products, balances]);

  const sortedProducts = useMemo(() => {
    const { field, dir } = productSort;
    return [...productStockSummary].sort((a, b) => {
      if (field === 'categoryName') {
        const known = PRODUCT_CATEGORIES.filter((c) => c !== PRODUCT_CATEGORY_OTHER);
        const ia = known.indexOf(a.categoryName);
        const ib = known.indexOf(b.categoryName);
        const aKnown = ia >= 0;
        const bKnown = ib >= 0;
        let catCmp = 0;
        if (aKnown && bKnown) catCmp = ia - ib;
        else if (aKnown) catCmp = -1;
        else if (bKnown) catCmp = 1;
        else catCmp = String(a.categoryName).localeCompare(String(b.categoryName), 'ko');
        if (catCmp !== 0) return dir === 'asc' ? catCmp : -catCmp;
        return String(a.name || '').localeCompare(String(b.name || ''), 'ko') * (dir === 'asc' ? 1 : -1);
      }
      return compareValues(a, b, field, dir);
    });
  }, [productStockSummary, productSort]);

  const toggleProductSort = (field) => {
    setProductSort((prev) => (
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'asc' }
    ));
  };

  const toggleStockSort = (field) => {
    setStockSort((prev) => (
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'asc' }
    ));
  };

  const resolveCategoryName = (form) => {
    if (form.categoryName === PRODUCT_CATEGORY_OTHER) {
      const custom = String(form.categoryCustom || '').trim();
      return custom || PRODUCT_CATEGORY_OTHER;
    }
    return form.categoryName || '실리콘';
  };

  const resolveColor = (form, categoryName) => {
    if (categoryName === SILICONE_CATEGORY) {
      if (form.color === SILICONE_COLOR_OTHER) {
        return String(form.colorCustom || '').trim() || SILICONE_COLOR_OTHER;
      }
      return form.color || '';
    }
    return String(form.colorCustom || form.color || '').trim();
  };

  const resolveSpecification = (form, categoryName) => {
    if (categoryName === SILICONE_CATEGORY) {
      if (form.specification === SILICONE_SPEC_OTHER) {
        return String(form.specificationCustom || '').trim() || SILICONE_SPEC_OTHER;
      }
      return form.specification || '';
    }
    return String(form.specificationCustom || form.specification || '').trim();
  };

  const resolveUnit = (form) => {
    if (form.baseUnit === UNIT_OTHER) {
      return String(form.unitCustom || '').trim() || UNIT_OTHER;
    }
    return form.baseUnit || 'EA';
  };

  const buildProductFormFromExisting = (product, { clearColor = false } = {}) => {
    const cat = String(product.categoryName || '').trim();
    const isKnown = PRODUCT_CATEGORIES.includes(cat) && cat !== PRODUCT_CATEGORY_OTHER;
    const categoryName = isKnown ? cat : PRODUCT_CATEGORY_OTHER;
    const categoryCustom = isKnown ? '' : (cat === PRODUCT_CATEGORY_OTHER ? '' : cat);
    const resolvedCat = isKnown ? cat : (categoryCustom || PRODUCT_CATEGORY_OTHER);
    const colorVal = String(product.color || '').trim();
    const specVal = String(product.specification || '').trim();
    const unitVal = String(product.baseUnit || '').trim();

    let color = '흑색';
    let colorCustom = '';
    if (resolvedCat === SILICONE_CATEGORY) {
      if (clearColor) {
        color = '흑색';
        colorCustom = '';
      } else if (SILICONE_COLORS.includes(colorVal) && colorVal !== SILICONE_COLOR_OTHER) {
        color = colorVal;
      } else if (colorVal) {
        color = SILICONE_COLOR_OTHER;
        colorCustom = colorVal === SILICONE_COLOR_OTHER ? '' : colorVal;
      }
    } else {
      color = '';
      colorCustom = clearColor ? '' : colorVal;
    }

    let specification = '웨더용';
    let specificationCustom = '';
    if (resolvedCat === SILICONE_CATEGORY) {
      if (SILICONE_SPECS.includes(specVal) && specVal !== SILICONE_SPEC_OTHER) {
        specification = specVal;
      } else if (specVal) {
        specification = SILICONE_SPEC_OTHER;
        specificationCustom = specVal === SILICONE_SPEC_OTHER ? '' : specVal;
      }
    } else {
      specification = '';
      specificationCustom = specVal;
    }

    let baseUnit = defaultUnitForCategory(resolvedCat);
    let unitCustom = '';
    if (UNIT_OPTIONS.includes(unitVal) && unitVal !== UNIT_OTHER) {
      baseUnit = unitVal;
    } else if (unitVal) {
      baseUnit = UNIT_OTHER;
      unitCustom = unitVal === UNIT_OTHER ? '' : unitVal;
    }

    return {
      ...emptyProduct,
      ...product,
      categoryName,
      categoryCustom,
      companyName: product.companyName || '',
      color,
      colorCustom,
      specification,
      specificationCustom,
      baseUnit,
      unitCustom,
    };
  };

  const openProductDialog = (editId = null, product = null) => {
    if (!editId || !product) {
      setProductDialog({ open: true, editId: null, form: emptyProduct });
      return;
    }
    setProductDialog({
      open: true,
      editId,
      form: buildProductFormFromExisting(product),
    });
  };

  const copyProductDialog = (product) => {
    setProductDialog({
      open: true,
      editId: null,
      form: buildProductFormFromExisting(product, { clearColor: true }),
    });
  };

  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity });

  const handleSaveProduct = async () => {
    try {
      setSubmitting(true);
      const categoryName = resolveCategoryName(productDialog.form);
      const color = resolveColor(productDialog.form, categoryName);
      const specification = resolveSpecification(productDialog.form, categoryName);
      const baseUnit = resolveUnit(productDialog.form);
      const payload = {
        name: productDialog.form.name,
        categoryName,
        companyName: String(productDialog.form.companyName || '').trim(),
        color,
        specification,
        baseUnit,
        minStock: Number(productDialog.form.minStock) || 0,
        reorderPoint: Number(productDialog.form.reorderPoint) || 0,
        safetyStock: Number(productDialog.form.safetyStock) || 0,
        standardPrice: Number(productDialog.form.standardPrice) || 0,
        barcode: productDialog.form.barcode,
        memo: productDialog.form.memo,
        sku: '',
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

  const productOptionLabel = (p) => {
    const parts = [categoryShortLabel(p.categoryName), p.name];
    if (p.color) parts.push(p.color);
    if (p.specification) parts.push(p.specification);
    if (p.companyName) parts.push(p.companyName);
    return parts.join(' · ');
  };

  const productDisplayName = (productId) => {
    const p = productMap[productId];
    if (!p) return '-';
    return `${categoryShortLabel(p.categoryName)} ${p.name}`;
  };

  const openLocationDialog = (row = null) => {
    if (!row) {
      setLocationDialog({ open: true, editId: null, form: { ...emptyLocation } });
      return;
    }
    if (row.kind === 'warehouse') {
      const w = row.raw;
      setLocationDialog({
        open: true,
        editId: w.id,
        form: {
          ...emptyLocation,
          kind: 'warehouse',
          name: w.name || '',
          code: w.code || '',
          type: w.type || 'material_warehouse',
          address: w.address || '',
          phone: w.phone || '',
          memo: w.memo || '',
          isActive: w.isActive !== false,
        },
      });
      return;
    }
    const s = row.raw;
    setLocationDialog({
      open: true,
      editId: s.id,
      form: {
        ...emptyLocation,
        kind: 'site',
        name: s.name || '',
        code: s.code || '',
        linkedWarehouseId: s.linkedWarehouseId || '',
        linkedSiteId: s.linkedSiteId || '',
        address: s.address || '',
        phone: s.phone || '',
        memo: s.memo || '',
      },
    });
  };

  const applyManagedSiteToForm = (siteOrName) => {
    if (!siteOrName) {
      setLocationDialog((p) => ({
        ...p,
        form: { ...p.form, name: '', linkedSiteId: '' },
      }));
      return;
    }
    if (typeof siteOrName === 'string') {
      const found = managedSites.find((s) => s.name === siteOrName);
      setLocationDialog((p) => ({
        ...p,
        form: {
          ...p.form,
          name: siteOrName,
          linkedSiteId: found?.id || '',
          address: found?.address || p.form.address,
          phone: found?.phone || p.form.phone,
        },
      }));
      return;
    }
    setLocationDialog((p) => ({
      ...p,
      form: {
        ...p.form,
        name: siteOrName.name || '',
        linkedSiteId: siteOrName.id || '',
        address: siteOrName.address || '',
        phone: siteOrName.phone || '',
      },
    }));
  };

  const handleSaveLocation = async () => {
    try {
      setSubmitting(true);
      const form = locationDialog.form;
      const name = String(form.name || '').trim();
      if (!name) throw new Error(form.kind === 'site' ? '현장명은 필수입니다.' : '창고명은 필수입니다.');

      if (form.kind === 'site') {
        const code = String(form.code || '').trim() || makeLocationCode(name, 'SITE');
        const payload = {
          name,
          code,
          linkedWarehouseId: form.linkedWarehouseId || null,
          linkedSiteId: form.linkedSiteId || null,
          address: form.address || '',
          phone: form.phone || '',
          memo: form.memo || '',
        };
        if (locationDialog.editId) {
          await updateInvSite(userId, locationDialog.editId, payload);
          showSnack('현장이 수정되었습니다.');
        } else {
          await createInvSite(userId, payload);
          showSnack('현장이 등록되었습니다.');
        }
      } else {
        const code = String(form.code || '').trim() || makeLocationCode(name, 'WH');
        const payload = {
          name,
          code,
          type: form.type || 'material_warehouse',
          address: form.address || '',
          phone: form.phone || '',
          memo: form.memo || '',
          isActive: form.isActive !== false,
        };
        if (locationDialog.editId) {
          await updateWarehouse(userId, locationDialog.editId, payload);
          showSnack('창고가 수정되었습니다.');
        } else {
          await createWarehouse(userId, payload);
          showSnack('창고가 등록되었습니다.');
        }
      }
      setLocationDialog({ open: false, editId: null, form: emptyLocation });
    } catch (e) {
      showSnack(e.message || '저장 실패', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLocation = async (row) => {
    const label = row.kind === 'site' ? '현장' : '창고';
    if (!window.confirm(`${label}을(를) 삭제할까요?`)) return;
    try {
      if (row.kind === 'site') {
        await deleteInvSite(userId, row.id);
      } else {
        await deleteWarehouse(userId, row.id);
      }
      showSnack(`${label}이(가) 삭제되었습니다.`);
    } catch (e) {
      showSnack(e.message || '삭제 실패', 'error');
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

  const renderTable = (headers, rows, emptyText, sortOpts) => {
    const colCount = headers.length;
    return (
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
                {headers.map((h) => {
                  const label = typeof h === 'string' ? h : h.label;
                  const field = typeof h === 'string' ? null : h.field;
                  const key = field || label || 'actions';
                  const sortable = Boolean(field && sortOpts?.onSort);
                  return (
                    <TableCell key={key} sx={thSx} align={h?.align}>
                      {sortable ? (
                        <TableSortLabel
                          active={sortOpts.sort?.field === field}
                          direction={sortOpts.sort?.field === field ? sortOpts.sort.dir : 'asc'}
                          onClick={() => sortOpts.onSort(field)}
                          sx={{
                            color: 'inherit !important',
                            '&.Mui-active': { color: `${ACCENT} !important` },
                            '& .MuiTableSortLabel-icon': { color: `${MUTED} !important` },
                            '&.Mui-active .MuiTableSortLabel-icon': { color: `${ACCENT} !important` },
                          }}
                        >
                          {label}
                        </TableSortLabel>
                      ) : (
                        label
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} sx={{ ...tdSx, textAlign: 'center', color: MUTED, py: 6 }}>
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
  };

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
                gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' },
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
                    borderTop: { xs: i === 2 ? `1px solid ${BORDER}` : 'none', md: 'none' },
                    borderRight: { xs: i === 0 ? `1px solid ${BORDER}` : 'none', md: 'none' },
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
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
                          {r.categoryShort ? `${r.categoryShort} ` : ''}{r.productName}
                        </Typography>
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
                          {productDisplayName(m.productId)}
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
                  placeholder="카테고리, 품목, 색상, 회사, 창고 검색"
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
              [
                { label: '카테고리', field: 'categoryName' },
                { label: '품목', field: 'productName' },
                { label: '색상', field: 'color' },
                { label: '창고', field: 'warehouseName' },
                { label: '현재고', field: 'quantityOnHand' },
                { label: '평가금액', field: 'totalValue' },
                { label: '상태', field: 'status' },
              ],
              filteredStock.map((r) => (
                <TableRow key={r.id} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                  <TableCell sx={{ ...tdSx, color: ACCENT, fontWeight: 700 }}>{r.categoryShort}</TableCell>
                  <TableCell sx={tdSx}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.productName}</Typography>
                    {r.companyName && (
                      <Typography sx={{ fontSize: '0.72rem', color: MUTED }}>{r.companyName}</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ ...tdSx, color: MUTED }}>{r.color || '-'}</TableCell>
                  <TableCell sx={{ ...tdSx, color: MUTED }}>{r.warehouseName}</TableCell>
                  <TableCell sx={{ ...tdSx, fontWeight: 700 }}>{r.quantityOnHand}</TableCell>
                  <TableCell sx={{ ...tdSx, color: MUTED }}>{Number(r.totalValue || 0).toLocaleString()}</TableCell>
                  <TableCell sx={tdSx}>{statusDot(r.status)}</TableCell>
                </TableRow>
              )),
              '재고 데이터가 없습니다. 입고를 등록해 주세요.',
              { sort: stockSort, onSort: toggleStockSort }
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
                        {productDisplayName(m.productId)}
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
              renderTable(
                [
                  { label: '카테고리', field: 'categoryName' },
                  { label: '품목명', field: 'name' },
                  { label: '색상', field: 'color' },
                  { label: '규격', field: 'specification' },
                  { label: '회사', field: 'companyName' },
                  { label: '단위', field: 'baseUnit' },
                  { label: '현재고', field: 'quantityOnHand' },
                  { label: '평가금액', field: 'totalValue' },
                  { label: '상태', field: 'status' },
                  { label: '' },
                ],
                sortedProducts.map((p) => (
                  <TableRow key={p.id} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell sx={{ ...tdSx, color: ACCENT, fontWeight: 700 }}>{p.categoryShort}</TableCell>
                    <TableCell sx={{ ...tdSx, fontWeight: 600 }}>{p.name}</TableCell>
                    <TableCell sx={{ ...tdSx, color: MUTED }}>{p.color || '-'}</TableCell>
                    <TableCell sx={{ ...tdSx, color: MUTED }}>{p.specification || '-'}</TableCell>
                    <TableCell sx={{ ...tdSx, color: MUTED }}>{p.companyName || '-'}</TableCell>
                    <TableCell sx={{ ...tdSx, color: MUTED }}>{p.baseUnit}</TableCell>
                    <TableCell sx={{ ...tdSx, fontWeight: 700 }}>{p.quantityOnHand}</TableCell>
                    <TableCell sx={{ ...tdSx, color: MUTED }}>{Number(p.totalValue || 0).toLocaleString()}</TableCell>
                    <TableCell sx={tdSx}>{statusDot(p.status)}</TableCell>
                    <TableCell sx={tdSx} align="right">
                      <IconButton
                        size="small"
                        sx={{ color: ACCENT }}
                        title="복사하여 등록"
                        onClick={() => copyProductDialog(p)}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
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
                )),
                '등록된 품목이 없습니다.',
                { sort: productSort, onSort: toggleProductSort }
              )
            )}
          </Box>
        )}

        {section === 'locations' && (
          <Box>
            <SectionHeader
              title="창고/현장"
              subtitle="보관 창고와 출고 대상 현장을 함께 관리합니다."
              actions={
                <Button size="small" variant="contained" sx={primaryBtn} startIcon={<AddIcon />} onClick={() => openLocationDialog()}>
                  등록
                </Button>
              }
            />
            {renderTable(
              ['구분', '이름', '코드', '유형/연결', '주소', '상태', ''],
              locationRows.map((row) => (
                <TableRow key={`${row.kind}_${row.id}`} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                  <TableCell sx={tdSx}>
                    <Chip
                      size="small"
                      label={row.kind === 'site' ? '현장' : '창고'}
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        bgcolor: row.kind === 'site' ? 'rgba(251,191,36,0.12)' : ACCENT_DIM,
                        color: row.kind === 'site' ? '#fbbf24' : ACCENT,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ ...tdSx, fontWeight: 600 }}>{row.name}</TableCell>
                  <TableCell sx={{ ...tdSx, color: MUTED }}>{row.code}</TableCell>
                  <TableCell sx={{ ...tdSx, color: MUTED }}>{row.detail}</TableCell>
                  <TableCell sx={{ ...tdSx, color: MUTED }}>{row.address || '-'}</TableCell>
                  <TableCell sx={tdSx}>
                    <Chip
                      size="small"
                      label={row.isActive === false ? '중지' : '사용'}
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        bgcolor: row.isActive === false ? 'rgba(255,255,255,0.06)' : ACCENT_DIM,
                        color: row.isActive === false ? MUTED : ACCENT,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={tdSx} align="right">
                    <IconButton size="small" sx={{ color: MUTED }} onClick={() => openLocationDialog(row)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" sx={{ color: '#f87171' }} onClick={() => handleDeleteLocation(row)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )),
              '등록된 창고/현장이 없습니다.'
            )}
          </Box>
        )}
      </Box>

      {/* 다이얼로그들 */}
      <Dialog open={productDialog.open} onClose={() => setProductDialog((p) => ({ ...p, open: false }))} maxWidth="sm" fullWidth {...dialogPaper}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {productDialog.editId ? '품목 수정' : '품목 등록'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel id="product-category-label">카테고리 *</InputLabel>
              <Select
                labelId="product-category-label"
                label="카테고리 *"
                value={productDialog.form.categoryName || '실리콘'}
                onChange={(e) => {
                  const next = e.target.value;
                  const nextDefaultUnit = defaultUnitForCategory(
                    next === PRODUCT_CATEGORY_OTHER ? PRODUCT_CATEGORY_OTHER : next
                  );
                  setProductDialog((p) => ({
                    ...p,
                    form: {
                      ...p.form,
                      categoryName: next,
                      categoryCustom: next === PRODUCT_CATEGORY_OTHER ? p.form.categoryCustom : '',
                      color: next === SILICONE_CATEGORY ? (p.form.color || '흑색') : '',
                      colorCustom: next === SILICONE_CATEGORY ? '' : (p.form.colorCustom || ''),
                      specification: next === SILICONE_CATEGORY ? (p.form.specification || '웨더용') : '',
                      specificationCustom: next === SILICONE_CATEGORY ? '' : (p.form.specificationCustom || ''),
                      baseUnit: nextDefaultUnit,
                      unitCustom: '',
                    },
                  }));
                }}
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
            <TextField label="품목명 *" value={productDialog.form.name} onChange={(e) => setProductDialog((p) => ({ ...p, form: { ...p.form, name: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
            {productDialog.form.categoryName === SILICONE_CATEGORY ? (
              <>
                <FormControl fullWidth size="small" sx={fieldSx}>
                  <InputLabel id="product-color-label">색상</InputLabel>
                  <Select
                    labelId="product-color-label"
                    label="색상"
                    value={productDialog.form.color || '흑색'}
                    onChange={(e) => setProductDialog((p) => ({
                      ...p,
                      form: {
                        ...p.form,
                        color: e.target.value,
                        colorCustom: e.target.value === SILICONE_COLOR_OTHER ? p.form.colorCustom : '',
                      },
                    }))}
                    MenuProps={selectMenuProps}
                  >
                    {SILICONE_COLORS.map((c) => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {productDialog.form.color === SILICONE_COLOR_OTHER && (
                  <TextField
                    label="기타 색상"
                    placeholder="직접 입력"
                    value={productDialog.form.colorCustom || ''}
                    onChange={(e) => setProductDialog((p) => ({ ...p, form: { ...p.form, colorCustom: e.target.value } }))}
                    fullWidth
                    size="small"
                    sx={fieldSx}
                  />
                )}
                <FormControl fullWidth size="small" sx={fieldSx}>
                  <InputLabel id="product-spec-label">규격</InputLabel>
                  <Select
                    labelId="product-spec-label"
                    label="규격"
                    value={productDialog.form.specification || '웨더용'}
                    onChange={(e) => setProductDialog((p) => ({
                      ...p,
                      form: {
                        ...p.form,
                        specification: e.target.value,
                        specificationCustom: e.target.value === SILICONE_SPEC_OTHER ? p.form.specificationCustom : '',
                      },
                    }))}
                    MenuProps={selectMenuProps}
                  >
                    {SILICONE_SPECS.map((s) => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {productDialog.form.specification === SILICONE_SPEC_OTHER && (
                  <TextField
                    label="기타 규격"
                    placeholder="직접 입력"
                    value={productDialog.form.specificationCustom || ''}
                    onChange={(e) => setProductDialog((p) => ({ ...p, form: { ...p.form, specificationCustom: e.target.value } }))}
                    fullWidth
                    size="small"
                    sx={fieldSx}
                  />
                )}
              </>
            ) : (
              <TextField
                label="색상"
                placeholder="직접 입력"
                value={productDialog.form.colorCustom || productDialog.form.color || ''}
                onChange={(e) => setProductDialog((p) => ({ ...p, form: { ...p.form, colorCustom: e.target.value, color: '' } }))}
                fullWidth
                size="small"
                sx={fieldSx}
              />
            )}
            <TextField label="회사" value={productDialog.form.companyName || ''} onChange={(e) => setProductDialog((p) => ({ ...p, form: { ...p.form, companyName: e.target.value } }))} fullWidth size="small" sx={fieldSx} />
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel id="product-unit-label">단위</InputLabel>
              <Select
                labelId="product-unit-label"
                label="단위"
                value={
                  UNIT_OPTIONS.includes(productDialog.form.baseUnit)
                    ? productDialog.form.baseUnit
                    : UNIT_OTHER
                }
                onChange={(e) => setProductDialog((p) => ({
                  ...p,
                  form: {
                    ...p.form,
                    baseUnit: e.target.value,
                    unitCustom: e.target.value === UNIT_OTHER ? p.form.unitCustom : '',
                  },
                }))}
                MenuProps={selectMenuProps}
              >
                {UNIT_OPTIONS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
              </Select>
            </FormControl>
            {productDialog.form.baseUnit === UNIT_OTHER && (
              <TextField
                label="기타 단위"
                placeholder="직접 입력"
                value={productDialog.form.unitCustom || ''}
                onChange={(e) => setProductDialog((p) => ({ ...p, form: { ...p.form, unitCustom: e.target.value } }))}
                fullWidth
                size="small"
                sx={fieldSx}
              />
            )}
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

      <Dialog open={locationDialog.open} onClose={() => setLocationDialog((p) => ({ ...p, open: false }))} maxWidth="sm" fullWidth {...dialogPaper}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {locationDialog.editId
            ? (locationDialog.form.kind === 'site' ? '현장 수정' : '창고 수정')
            : '창고/현장 등록'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {!locationDialog.editId && (
              <Stack direction="row" spacing={1}>
                {[
                  { k: 'warehouse', l: '창고' },
                  { k: 'site', l: '현장' },
                ].map((opt) => (
                  <Button
                    key={opt.k}
                    size="small"
                    onClick={() => setLocationDialog((p) => ({
                      ...p,
                      form: {
                        ...emptyLocation,
                        kind: opt.k,
                        type: opt.k === 'warehouse' ? 'material_warehouse' : '',
                      },
                    }))}
                    sx={{
                      textTransform: 'none',
                      flex: 1,
                      bgcolor: locationDialog.form.kind === opt.k ? ACCENT_DIM : 'transparent',
                      color: locationDialog.form.kind === opt.k ? ACCENT : MUTED,
                      border: `1px solid ${locationDialog.form.kind === opt.k ? 'rgba(45,212,191,0.35)' : BORDER}`,
                      '&:hover': { borderColor: ACCENT, bgcolor: ACCENT_DIM },
                    }}
                  >
                    {opt.l}
                  </Button>
                ))}
              </Stack>
            )}

            {locationDialog.form.kind === 'site' ? (
              <Autocomplete
                freeSolo
                options={managedSites}
                getOptionLabel={(option) => (typeof option === 'string' ? option : option?.name || '')}
                isOptionEqualToValue={(option, value) => {
                  if (typeof option === 'string' || typeof value === 'string') {
                    return (typeof option === 'string' ? option : option?.name) === (typeof value === 'string' ? value : value?.name);
                  }
                  return option?.id === value?.id;
                }}
                filterOptions={(options, { inputValue }) => {
                  const q = inputValue.trim().toLowerCase();
                  if (!q) return options.slice(0, 80);
                  return options.filter((s) => {
                    const name = (s.name || '').toLowerCase();
                    const manager = (s.manager || '').toLowerCase();
                    const address = (s.address || '').toLowerCase();
                    return name.includes(q) || manager.includes(q) || address.includes(q);
                  }).slice(0, 80);
                }}
                value={locationDialog.form.name || ''}
                onChange={(_, newValue) => applyManagedSiteToForm(newValue)}
                onInputChange={(_, newInputValue, reason) => {
                  if (reason === 'input') {
                    setLocationDialog((p) => ({
                      ...p,
                      form: { ...p.form, name: newInputValue, linkedSiteId: '' },
                    }));
                  } else if (reason === 'clear') {
                    applyManagedSiteToForm('');
                  }
                }}
                renderOption={(props, option) => (
                  <li {...props} key={option.id || option.name}>
                    <Box sx={{ py: 0.25 }}>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{option.name}</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: MUTED }}>
                        {[option.status, option.manager, option.address].filter(Boolean).join(' · ') || '현장관리'}
                      </Typography>
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="현장명 *"
                    placeholder="현장관리에서 검색하거나 직접 입력"
                    size="small"
                    sx={fieldSx}
                  />
                )}
                slotProps={autocompleteSlotProps}
              />
            ) : (
              <TextField
                label="창고명 *"
                value={locationDialog.form.name}
                onChange={(e) => setLocationDialog((p) => ({ ...p, form: { ...p.form, name: e.target.value } }))}
                fullWidth
                size="small"
                sx={fieldSx}
              />
            )}

            <TextField
              label="코드"
              placeholder="비우면 자동 생성"
              value={locationDialog.form.code}
              onChange={(e) => setLocationDialog((p) => ({ ...p, form: { ...p.form, code: e.target.value } }))}
              fullWidth
              size="small"
              sx={fieldSx}
            />

            {locationDialog.form.kind === 'warehouse' ? (
              <FormControl fullWidth size="small" sx={fieldSx}>
                <InputLabel>유형</InputLabel>
                <Select
                  label="유형"
                  value={locationDialog.form.type || 'material_warehouse'}
                  onChange={(e) => setLocationDialog((p) => ({ ...p, form: { ...p.form, type: e.target.value } }))}
                  MenuProps={selectMenuProps}
                >
                  {WAREHOUSE_TYPES_FORM.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </Select>
              </FormControl>
            ) : (
              <FormControl fullWidth size="small" sx={fieldSx}>
                <InputLabel>연결 창고</InputLabel>
                <Select
                  label="연결 창고"
                  value={locationDialog.form.linkedWarehouseId || ''}
                  onChange={(e) => setLocationDialog((p) => ({ ...p, form: { ...p.form, linkedWarehouseId: e.target.value } }))}
                  MenuProps={selectMenuProps}
                >
                  <MenuItem value="">없음</MenuItem>
                  {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                </Select>
              </FormControl>
            )}

            <TextField
              label="주소"
              value={locationDialog.form.address}
              onChange={(e) => setLocationDialog((p) => ({ ...p, form: { ...p.form, address: e.target.value } }))}
              fullWidth
              size="small"
              sx={fieldSx}
            />
            <TextField
              label="연락처"
              value={locationDialog.form.phone}
              onChange={(e) => setLocationDialog((p) => ({ ...p, form: { ...p.form, phone: e.target.value } }))}
              fullWidth
              size="small"
              sx={fieldSx}
            />
            <TextField
              label="메모"
              value={locationDialog.form.memo}
              onChange={(e) => setLocationDialog((p) => ({ ...p, form: { ...p.form, memo: e.target.value } }))}
              fullWidth
              size="small"
              sx={fieldSx}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLocationDialog((p) => ({ ...p, open: false }))} sx={{ color: MUTED }}>취소</Button>
          <Button variant="contained" disabled={submitting} onClick={handleSaveLocation} sx={primaryBtn}>저장</Button>
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
                      {productOptionLabel(p)}
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
                      {productOptionLabel(p)}
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

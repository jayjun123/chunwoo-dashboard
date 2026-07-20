/** 기존 sites 컬렉션과 충돌 방지를 위해 inv 접두사 사용 */
export const INV_COLLECTIONS = {
  products: 'invProducts',
  warehouses: 'invWarehouses',
  sites: 'invSites',
  balances: 'invBalances',
  movements: 'invMovements',
  receipts: 'invReceipts',
  issues: 'invIssues',
  settings: 'invSettings',
};

export const INVENTORY_ORG_ID =
  import.meta.env.VITE_INVENTORY_ORG_ID || 'chunwoo';

export const WAREHOUSE_TYPES = [
  { value: 'hq_warehouse', label: '본사 창고' },
  { value: 'material_warehouse', label: '자재 창고' },
  { value: 'vehicle', label: '차량' },
  { value: 'construction_site', label: '공사 현장' },
  { value: 'temporary_warehouse', label: '임시 창고' },
  { value: 'staff_storage', label: '직원 보관' },
  { value: 'disposal_hold', label: '폐기 대기' },
];

export const UNIT_OPTIONS = ['EA', 'BOX', 'ROLL', 'M', 'SET', 'KG', 'L'];

/** 품목 카테고리 (순서 고정). 기타는 직접 입력 */
export const PRODUCT_CATEGORIES = [
  '실리콘',
  '노턴테이프',
  '셋팅블럭',
  '마스킹테이프',
  '로프',
  '기타',
];

export const PRODUCT_CATEGORY_OTHER = '기타';

export function warehouseTypeLabel(type) {
  return WAREHOUSE_TYPES.find((t) => t.value === type)?.label || type || '-';
}

export function balanceDocId(organizationId, warehouseId, productId) {
  return `${organizationId}_${warehouseId}_${productId}`;
}

export function stockStatus(quantityOnHand, minStock) {
  const qty = Number(quantityOnHand) || 0;
  const min = Number(minStock) || 0;
  if (qty <= 0) return '품절';
  if (qty < min) return '부족';
  return '정상';
}

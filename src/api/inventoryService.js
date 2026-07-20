import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  query,
  where,
  limit,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  INV_COLLECTIONS,
  INVENTORY_ORG_ID,
  balanceDocId,
} from '../utils/inventory/collections';
import { calcInventoryValue, calcMovingAverageCost } from '../utils/inventory/calc';

const auditCreate = (userId) => ({
  createdAt: serverTimestamp(),
  createdBy: userId || null,
  updatedAt: serverTimestamp(),
  updatedBy: userId || null,
  isDeleted: false,
  deletedAt: null,
  deletedBy: null,
});

const auditUpdate = (userId) => ({
  updatedAt: serverTimestamp(),
  updatedBy: userId || null,
});

const softDelete = (userId) => ({
  isDeleted: true,
  deletedAt: serverTimestamp(),
  deletedBy: userId || null,
  updatedAt: serverTimestamp(),
  updatedBy: userId || null,
});

function mapDoc(snap) {
  return { id: snap.id, ...snap.data() };
}

function orgActiveQuery(colName) {
  return query(
    collection(db, colName),
    where('organizationId', '==', INVENTORY_ORG_ID),
    where('isDeleted', '==', false)
  );
}

export function subscribeCollection(colName, onData, onError) {
  try {
    return onSnapshot(
      orgActiveQuery(colName),
      (snap) => onData(snap.docs.map(mapDoc)),
      (err) => {
        console.error(`[inventory] ${colName} 구독 실패:`, err);
        onError?.(err);
      }
    );
  } catch (err) {
    console.error(`[inventory] ${colName} 구독 오류:`, err);
    onError?.(err);
    return () => {};
  }
}

export function subscribeProducts(onData, onError) {
  return subscribeCollection(INV_COLLECTIONS.products, onData, onError);
}

export function subscribeWarehouses(onData, onError) {
  return subscribeCollection(INV_COLLECTIONS.warehouses, onData, onError);
}

export function subscribeInvSites(onData, onError) {
  return subscribeCollection(INV_COLLECTIONS.sites, onData, onError);
}

export function subscribeBalances(onData, onError) {
  return subscribeCollection(INV_COLLECTIONS.balances, onData, onError);
}

export function subscribeMovements(onData, onError) {
  // orderBy 복합 인덱스 없이 동작하도록 단순 쿼리 + 클라이언트 정렬
  return onSnapshot(
    orgActiveQuery(INV_COLLECTIONS.movements),
    (snap) => {
      const rows = snap.docs.map(mapDoc).sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || 0;
        const tb = b.createdAt?.toMillis?.() || 0;
        return tb - ta;
      });
      onData(rows.slice(0, 100));
    },
    (err) => {
      console.error('[inventory] movements 구독 실패:', err);
      onError?.(err);
    }
  );
}

export async function createProduct(userId, values) {
  const sku = String(values.sku || '').trim();
  const name = String(values.name || '').trim();
  if (!name) throw new Error('품목명은 필수입니다.');

  if (sku) {
    const dup = await getDocs(
      query(
        collection(db, INV_COLLECTIONS.products),
        where('organizationId', '==', INVENTORY_ORG_ID),
        where('sku', '==', sku),
        where('isDeleted', '==', false),
        limit(1)
      )
    );
    if (!dup.empty) throw new Error('이미 사용 중인 SKU입니다.');
  }

  const ref = await addDoc(collection(db, INV_COLLECTIONS.products), {
    organizationId: INVENTORY_ORG_ID,
    sku,
    name,
    categoryName: String(values.categoryName || '기타').trim() || '기타',
    companyName: String(values.companyName || '').trim(),
    specification: values.specification || '',
    baseUnit: values.baseUnit || 'EA',
    minStock: Number(values.minStock) || 0,
    reorderPoint: Number(values.reorderPoint) || 0,
    safetyStock: Number(values.safetyStock) || 0,
    standardPrice: Number(values.standardPrice) || 0,
    barcode: values.barcode || '',
    memo: values.memo || '',
    status: 'active',
    ...auditCreate(userId),
  });
  return ref.id;
}

export async function updateProduct(userId, id, values) {
  await updateDoc(doc(db, INV_COLLECTIONS.products, id), {
    ...values,
    ...auditUpdate(userId),
  });
}

export async function deleteProduct(userId, id) {
  await updateDoc(doc(db, INV_COLLECTIONS.products, id), softDelete(userId));
}

export async function createWarehouse(userId, values) {
  if (!values.name || !values.code) throw new Error('창고명과 코드는 필수입니다.');
  const ref = await addDoc(collection(db, INV_COLLECTIONS.warehouses), {
    organizationId: INVENTORY_ORG_ID,
    name: String(values.name).trim(),
    code: String(values.code).trim(),
    type: values.type || 'material_warehouse',
    address: values.address || '',
    phone: values.phone || '',
    memo: values.memo || '',
    isActive: values.isActive !== false,
    ...auditCreate(userId),
  });
  return ref.id;
}

export async function updateWarehouse(userId, id, values) {
  await updateDoc(doc(db, INV_COLLECTIONS.warehouses, id), {
    ...values,
    ...auditUpdate(userId),
  });
}

export async function deleteWarehouse(userId, id) {
  await updateDoc(doc(db, INV_COLLECTIONS.warehouses, id), softDelete(userId));
}

export async function createInvSite(userId, values) {
  if (!values.name || !values.code) throw new Error('현장명과 코드는 필수입니다.');
  const ref = await addDoc(collection(db, INV_COLLECTIONS.sites), {
    organizationId: INVENTORY_ORG_ID,
    name: String(values.name).trim(),
    code: String(values.code).trim(),
    linkedWarehouseId: values.linkedWarehouseId || null,
    address: values.address || '',
    phone: values.phone || '',
    memo: values.memo || '',
    isActive: true,
    ...auditCreate(userId),
  });
  return ref.id;
}

export async function updateInvSite(userId, id, values) {
  await updateDoc(doc(db, INV_COLLECTIONS.sites, id), {
    ...values,
    ...auditUpdate(userId),
  });
}

export async function deleteInvSite(userId, id) {
  await updateDoc(doc(db, INV_COLLECTIONS.sites, id), softDelete(userId));
}

async function getAllowNegativeStock() {
  const snap = await getDoc(doc(db, INV_COLLECTIONS.settings, INVENTORY_ORG_ID));
  if (!snap.exists()) return false;
  return Boolean(snap.data().allowNegativeStock);
}

function idempotencyKey(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function createReceipt(userId, values) {
  const warehouseId = values.warehouseId;
  const productId = values.productId;
  const quantity = Number(values.quantity);
  const unitPrice = Number(values.unitPrice) || 0;
  if (!warehouseId || !productId) throw new Error('창고와 품목을 선택하세요.');
  if (!(quantity > 0)) throw new Error('수량은 0보다 커야 합니다.');

  const key = idempotencyKey('rcpt');
  const receiptRef = doc(collection(db, INV_COLLECTIONS.receipts));
  const balanceId = balanceDocId(INVENTORY_ORG_ID, warehouseId, productId);
  const balanceRef = doc(db, INV_COLLECTIONS.balances, balanceId);
  const movementRef = doc(collection(db, INV_COLLECTIONS.movements));
  const productRef = doc(db, INV_COLLECTIONS.products, productId);

  await runTransaction(db, async (tx) => {
    const productSnap = await tx.get(productRef);
    if (!productSnap.exists() || productSnap.data().isDeleted) {
      throw new Error('품목을 찾을 수 없습니다.');
    }
    const product = productSnap.data();
    const unit = String(product.baseUnit || 'EA');

    const balanceSnap = await tx.get(balanceRef);
    const before = balanceSnap.exists() ? Number(balanceSnap.data().quantityOnHand || 0) : 0;
    const prevAvg = balanceSnap.exists() ? Number(balanceSnap.data().averageCost || 0) : 0;
    const after = before + quantity;
    const newAvg = calcMovingAverageCost({
      existingQty: before,
      existingAvgCost: prevAvg,
      incomingQty: quantity,
      incomingUnitCost: unitPrice,
    });
    const totalValue = calcInventoryValue(after, newAvg);
    const lineSupply = quantity * unitPrice;

    tx.set(receiptRef, {
      organizationId: INVENTORY_ORG_ID,
      receiptNumber: `R-${receiptRef.id.slice(0, 8).toUpperCase()}`,
      status: 'completed',
      receiptDate: serverTimestamp(),
      warehouseId,
      managerId: userId,
      lines: [{
        productId,
        quantity,
        unit,
        unitPrice,
        supplyAmount: lineSupply,
        taxAmount: 0,
        totalAmount: lineSupply,
      }],
      memo: values.memo || '',
      idempotencyKey: key,
      ...auditCreate(userId),
    });

    if (balanceSnap.exists()) {
      tx.update(balanceRef, {
        quantityOnHand: after,
        averageCost: newAvg,
        totalValue,
        lastMovementAt: serverTimestamp(),
        ...auditUpdate(userId),
        isDeleted: false,
      });
    } else {
      tx.set(balanceRef, {
        organizationId: INVENTORY_ORG_ID,
        productId,
        warehouseId,
        quantityOnHand: after,
        averageCost: newAvg,
        totalValue,
        lastMovementAt: serverTimestamp(),
        ...auditCreate(userId),
      });
    }

    tx.set(movementRef, {
      organizationId: INVENTORY_ORG_ID,
      type: 'receipt',
      productId,
      warehouseId,
      quantityBefore: before,
      quantityChange: quantity,
      quantityAfter: after,
      unit,
      unitCost: unitPrice,
      documentType: 'receipt',
      documentId: receiptRef.id,
      relatedSiteId: null,
      idempotencyKey: key,
      memo: values.memo || '',
      ...auditCreate(userId),
    });
  });

  return receiptRef.id;
}

export async function createIssue(userId, values) {
  const warehouseId = values.warehouseId;
  const productId = values.productId;
  const quantity = Number(values.quantity);
  const siteId = values.siteId || null;
  if (!warehouseId || !productId) throw new Error('창고와 품목을 선택하세요.');
  if (!(quantity > 0)) throw new Error('수량은 0보다 커야 합니다.');

  const key = idempotencyKey('iss');
  const issueRef = doc(collection(db, INV_COLLECTIONS.issues));
  const balanceId = balanceDocId(INVENTORY_ORG_ID, warehouseId, productId);
  const balanceRef = doc(db, INV_COLLECTIONS.balances, balanceId);
  const movementRef = doc(collection(db, INV_COLLECTIONS.movements));
  const productRef = doc(db, INV_COLLECTIONS.products, productId);
  const allowNegative = await getAllowNegativeStock();

  await runTransaction(db, async (tx) => {
    const productSnap = await tx.get(productRef);
    if (!productSnap.exists() || productSnap.data().isDeleted) {
      throw new Error('품목을 찾을 수 없습니다.');
    }
    const product = productSnap.data();
    const unit = String(product.baseUnit || 'EA');

    const balanceSnap = await tx.get(balanceRef);
    const before = balanceSnap.exists() ? Number(balanceSnap.data().quantityOnHand || 0) : 0;
    if (!allowNegative && quantity > before) {
      throw new Error(`재고가 부족합니다. (현재 ${before})`);
    }
    const after = before - quantity;
    const avgCost = balanceSnap.exists() ? Number(balanceSnap.data().averageCost || 0) : 0;
    const totalValue = calcInventoryValue(Math.max(after, 0), avgCost);

    tx.set(issueRef, {
      organizationId: INVENTORY_ORG_ID,
      issueNumber: `I-${issueRef.id.slice(0, 8).toUpperCase()}`,
      status: 'completed',
      issueDate: serverTimestamp(),
      warehouseId,
      siteId,
      purpose: values.purpose || '',
      managerId: userId,
      lines: [{ productId, quantity, unit, unitCost: avgCost }],
      memo: values.memo || '',
      idempotencyKey: key,
      ...auditCreate(userId),
    });

    if (!balanceSnap.exists()) {
      if (!allowNegative) throw new Error('해당 창고에 재고가 없습니다.');
      tx.set(balanceRef, {
        organizationId: INVENTORY_ORG_ID,
        productId,
        warehouseId,
        quantityOnHand: after,
        averageCost: 0,
        totalValue: 0,
        lastMovementAt: serverTimestamp(),
        ...auditCreate(userId),
      });
    } else {
      tx.update(balanceRef, {
        quantityOnHand: after,
        totalValue,
        lastMovementAt: serverTimestamp(),
        ...auditUpdate(userId),
      });
    }

    tx.set(movementRef, {
      organizationId: INVENTORY_ORG_ID,
      type: 'issue',
      productId,
      warehouseId,
      quantityBefore: before,
      quantityChange: -quantity,
      quantityAfter: after,
      unit,
      unitCost: avgCost,
      documentType: 'issue',
      documentId: issueRef.id,
      relatedSiteId: siteId,
      idempotencyKey: key,
      memo: values.memo || values.purpose || '',
      ...auditCreate(userId),
    });
  });

  return issueRef.id;
}

export async function ensureInvSettings() {
  const ref = doc(db, INV_COLLECTIONS.settings, INVENTORY_ORG_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      organizationId: INVENTORY_ORG_ID,
      name: '천우건업',
      allowNegativeStock: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

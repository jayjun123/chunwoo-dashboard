import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { isGlassQuantityItem } from '../components/projectDSH/QuantityComparePanel';

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sumNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isAdvanceRow(item) {
  return item?.note && String(item.note).trim().includes('선급금');
}

function getTotalPayment(payments) {
  if (!Array.isArray(payments)) return 0;
  return payments.reduce((sum, p) => sum + (parseFloat(p?.amount) || 0), 0);
}

function getGisungTotal(list) {
  if (!Array.isArray(list)) return 0;
  return list
    .filter((item) => item?.claimStatus === '청구완료')
    .reduce((sum, item) => {
      if (item?.payments && item.payments.length) return sum + getTotalPayment(item.payments);
      return sum + (parseFloat(item?.gisungAmount) || 0);
    }, 0);
}

function getReceiptTotal(list, advanceSum) {
  if (!Array.isArray(list)) return advanceSum;
  const paidFromGisung = list
    .filter((item) => item?.paymentStatus === '입금완료' && !item?.isException && !isAdvanceRow(item))
    .reduce((sum, item) => sum + (parseFloat(item?.gisungAmount) || 0), 0);
  return advanceSum + paidFromGisung;
}

function getCostTotal(costs) {
  if (!Array.isArray(costs)) return 0;
  return costs.reduce((sum, cost) => {
    const base = Number(cost?.totalValue) || 0;
    const health = (cost?.healthInsurance || []).reduce((s, item) => s + (Number(item?.amount) || 0), 0);
    return sum + base + health;
  }, 0);
}

function buildCompanyQuantityItems(companySites, quantityInfoDocs) {
  const contractByName = new Map();
  const actualByName = new Map();

  // 계약(현장 물량내역 site.items 기반)
  (companySites || []).forEach((site) => {
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

  // 실제(quantity_info 기반)
  (quantityInfoDocs || []).forEach((q) => {
    const name = (q?.category || q?.name || q?.itemName || '').toString().trim();
    if (!name) return;
    if (!isGlassQuantityItem(name)) return;
    const actual = Number(q?.actual) || Number(q?.amount) || 0;
    if (!actual) return;
    actualByName.set(name, (actualByName.get(name) || 0) + actual);
    // quantity_info에 contract가 있고 site.items가 없는 경우 대비 (없을 때만)
    if (!contractByName.has(name)) {
      const contract = Number(q?.contract) || Number(q?.contractAmount) || 0;
      if (contract) contractByName.set(name, contract);
    }
  });

  const names = Array.from(new Set([...contractByName.keys(), ...actualByName.keys()]));
  return names
    .map((name, idx) => ({
      id: `co-${idx}-${name}`,
      name,
      contract: contractByName.get(name) || 0,
      actual: actualByName.get(name) || 0,
    }))
    .filter((row) => row.name && String(row.name).trim() !== '');
}

export function useCompanyDSH(companyName) {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(!!companyName);
  const [error, setError] = useState(null);

  const [gisungList, setGisungList] = useState([]);
  const [costs, setCosts] = useState([]);
  const [quantityInfo, setQuantityInfo] = useState([]);

  useEffect(() => {
    let cancelled = false;
    if (!companyName) {
      setSites([]);
      setGisungList([]);
      setCosts([]);
      setQuantityInfo([]);
      setLoading(false);
      setError(null);
      return () => {};
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const snapSites = await getDocs(collection(db, 'sites'));
        if (cancelled) return;
        const allSites = snapSites.docs.map((d) => ({ id: d.id, ...d.data() }));
        const companySites = allSites.filter((s) => (s?.companyName || '미지정').toString().trim() === companyName);
        setSites(companySites);

        const siteIds = companySites.map((s) => s.id).filter(Boolean);
        if (siteIds.length === 0) {
          setGisungList([]);
          setCosts([]);
          setQuantityInfo([]);
          setLoading(false);
          return;
        }

        const idChunks = chunk(siteIds, 10);

        // gisung
        const gisungDocs = [];
        for (const ids of idChunks) {
          const snap = await getDocs(query(collection(db, 'gisung'), where('siteId', 'in', ids)));
          snap.docs.forEach((d) => gisungDocs.push({ id: d.id, ...d.data() }));
        }
        if (cancelled) return;
        setGisungList(gisungDocs);

        // costs
        const costDocs = [];
        for (const ids of idChunks) {
          const snap = await getDocs(query(collection(db, 'costs'), where('siteId', 'in', ids)));
          snap.docs.forEach((d) => costDocs.push({ id: d.id, ...d.data() }));
        }
        if (cancelled) return;
        setCosts(costDocs);

        // quantity_info
        const qtyDocs = [];
        for (const ids of idChunks) {
          const snap = await getDocs(query(collection(db, 'quantity_info'), where('siteId', 'in', ids)));
          snap.docs.forEach((d) => qtyDocs.push({ id: d.id, ...d.data() }));
        }
        if (cancelled) return;
        setQuantityInfo(qtyDocs);

        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [companyName]);

  const totals = useMemo(() => {
    const contractAmount = sites.reduce((s, site) => s + sumNumber(site?.contractAmount), 0);
    const advanceTotal = sites.reduce((s, site) => s + sumNumber(site?.advance), 0);
    const gisungTotal = getGisungTotal(gisungList);
    const costTotal = getCostTotal(costs);
    const receiptTotal = getReceiptTotal(gisungList, advanceTotal);
    const balance = contractAmount - receiptTotal;
    return { contractAmount, advanceTotal, gisungTotal, costTotal, receiptTotal, balance };
  }, [sites, gisungList, costs]);

  const companyQuantityItems = useMemo(() => buildCompanyQuantityItems(sites, quantityInfo), [sites, quantityInfo]);

  const quantityInfoBySiteId = useMemo(() => {
    const map = new Map();
    (quantityInfo || []).forEach((q) => {
      const sid = q?.siteId;
      if (!sid) return;
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid).push(q);
    });
    return map;
  }, [quantityInfo]);

  // KpiCards 재사용을 위한 "회사 site" 형태
  const companySite = useMemo(
    () => ({
      companyName,
      contractAmount: totals.contractAmount,
      advance: totals.advanceTotal,
    }),
    [companyName, totals.contractAmount, totals.advanceTotal]
  );

  return {
    loading,
    error,
    companyName,
    sites,
    gisungList,
    costs,
    totals,
    companySite,
    companyQuantityItems,
    quantityInfoBySiteId,
  };
}


import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';
import { parseAmountNumber } from '../utils/siteUtils';

/** 서울 기준 현재 연도 (1월 1일부터 자동 전환) */
function getCurrentYearSeoul() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
  }).formatToParts(new Date());
  return Number(parts.find((p) => p.type === 'year')?.value) || new Date().getFullYear();
}

/** 시작일/날짜 값에서 연도 추출 */
function getYearFromDateValue(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    try {
      return value.toDate().getFullYear();
    } catch {
      return null;
    }
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getFullYear();
  }
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000).getFullYear();
  }
  const str = String(value).trim();
  const match = str.match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

/** 기성월(YYYY.MM. / YYYY-MM 등) 또는 createdAt에서 연도 추출 */
function getYearFromGisungRecord(gisung) {
  const fromMonth = getYearFromDateValue(gisung?.gisungMonth || gisung?.month);
  if (fromMonth) return fromMonth;
  return getYearFromDateValue(gisung?.createdAt || gisung?.updatedAt || gisung?.date);
}

/** 지출 기록 연도 */
function getYearFromCostRecord(cost) {
  return getYearFromDateValue(cost?.date || cost?.month || cost?.createdAt);
}

/**
 * 공사기간에 해당 연도가 포함되는지.
 * 시작·종료가 모두 없으면(공사기간 없음) 포함.
 */
function siteConstructionIncludesYear(site, year) {
  const startYear = getYearFromDateValue(site?.startDate);
  const endYear = getYearFromDateValue(site?.endDate);

  // 공사기간 없음 → 포함
  if (startYear == null && endYear == null) return true;

  const rangeStart = startYear ?? endYear;
  const rangeEnd = endYear ?? startYear;
  return rangeStart <= year && year <= rangeEnd;
}

/**
 * 기성/지출 데이터 로드, 현장별 입금 상태, 전체·현장 통합현황 계산.
 * @param {Array} sites - 현장 목록
 * @returns {object} gisungData, costData, paymentStatusMap, siteIntegratedStatus, totalIntegratedStatus 및 setter
 */
export function useIntegratedStatus(sites) {
  const [gisungData, setGisungData] = useState([]);
  const [costData, setCostData] = useState([]);
  const [paymentStatusMap, setPaymentStatusMap] = useState({});
  const [siteIntegratedStatus, setSiteIntegratedStatus] = useState(null);
  const [totalIntegratedStatus, setTotalIntegratedStatus] = useState(null);

  // 기성관리 데이터 로드 (첫 번째 소스: id 포함)
  useEffect(() => {
    const fetchGisungData = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'gisung'));
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGisungData(data);
        console.log('🏗️ 기성관리 데이터 로드 완료:', data.length, '개');
      } catch (error) {
        console.error('기성관리 데이터 로드 실패:', error);
      }
    };
    fetchGisungData();
  }, []);

  // 현장별 입금 상태 계산 (첫 번째 형태: totalGisung, paidGisung, paymentRate, balance)
  useEffect(() => {
    const loadPaymentStatusInline = async () => {
      try {
        const paymentMap = {};
        sites.forEach(site => {
          const siteGisungData = gisungData.filter(g => {
            if (!g.name || !site.name) return false;
            const exactMatch = g.name === site.name;
            const partialMatch = g.name.includes(site.name) || site.name.includes(g.name);
            return exactMatch || partialMatch;
          });
          if (siteGisungData.length === 0) {
            paymentMap[site.name] = { isFullyPaid: false, totalGisung: 0, paidGisung: 0, paymentRate: 0 };
            return;
          }
          const totalGisung = siteGisungData.reduce((sum, g) => sum + parseAmountNumber(g.gisungAmount), 0);
          const isAdvanceRow = (g) => g.note && String(g.note).trim().includes('선급금');
          const paidFromGisung = siteGisungData
            .filter(g => g.paymentStatus === '입금완료' && !isAdvanceRow(g))
            .reduce((sum, g) => sum + parseAmountNumber(g.gisungAmount), 0);
          const paidFromAdvanceRows = siteGisungData
            .filter(g => g.paymentStatus === '입금완료' && isAdvanceRow(g))
            .reduce((sum, g) => sum + (parseAmountNumber(g.advance) || parseAmountNumber(g.gisungAmount)), 0);
          const paidGisung = paidFromGisung + paidFromAdvanceRows;
          const advanceAmount = parseAmountNumber(site.advance);
          const totalWithAdvance = totalGisung + advanceAmount;
          const contractAmount = parseAmountNumber(site.contractAmount);
          const balance = contractAmount - advanceAmount - paidFromGisung;
          const isFullyPaid = siteGisungData.length > 0 && (balance <= 0 || Math.abs(balance) < 1);
          const paymentRate = totalWithAdvance > 0 ? ((paidGisung + advanceAmount) / totalWithAdvance) * 100 : 0;
          paymentMap[site.name] = {
            isFullyPaid,
            totalGisung,
            paidGisung,
            paymentRate,
            balance
          };
        });
        setPaymentStatusMap(paymentMap);
        console.log('💰 입금 상태 맵 업데이트 완료:', Object.keys(paymentMap).length, '개 현장');
      } catch (error) {
        console.error('입금 상태 계산 실패:', error);
      }
    };
    if (sites.length > 0 && gisungData.length > 0) {
      loadPaymentStatusInline();
    }
  }, [sites, gisungData]);

  // 기성 데이터 로드 (doc.data()만) 및 지출 데이터 로드
  const loadPaymentStatus = useCallback((gisungDataArg) => {
    const paymentMap = {};
    sites.forEach(site => {
      const siteGisungData = gisungDataArg.filter(g => {
        const gisungSiteId = g.siteId || g.siteID || null;
        const gisungName = g.name || g.siteName || '';
        const matchById = gisungSiteId && site.id && gisungSiteId === site.id;
        const matchByName =
          !!gisungName &&
          !!site.name &&
          (gisungName === site.name ||
           gisungName.includes(site.name) ||
           site.name.includes(gisungName));
        return matchById || matchByName;
      });
      if (siteGisungData.length === 0) {
        paymentMap[site.name] = { isFullyPaid: false, totalGisung: 0, paidGisung: 0, paymentRate: 0 };
        return;
      }
      const totalGisung = siteGisungData.reduce((sum, g) => sum + parseAmountNumber(g.gisungAmount), 0);
      const isAdvanceRow = (g) => g.note && String(g.note).trim().includes('선급금');
      const paidFromGisung = siteGisungData
        .filter(g => g.paymentStatus === '입금완료' && !isAdvanceRow(g))
        .reduce((sum, g) => sum + parseAmountNumber(g.gisungAmount), 0);
      const paidFromAdvanceRows = siteGisungData
        .filter(g => g.paymentStatus === '입금완료' && isAdvanceRow(g))
        .reduce((sum, g) => sum + (parseAmountNumber(g.advance) || parseAmountNumber(g.gisungAmount)), 0);
      const paidGisung = paidFromGisung + paidFromAdvanceRows;
      const advanceAmount = parseAmountNumber(site.advance);
      const totalWithAdvance = totalGisung + advanceAmount;
      const contractAmount = parseAmountNumber(site.contractAmount);
      const balance = contractAmount - advanceAmount - paidFromGisung;
      const isFullyPaid = siteGisungData.length > 0 && (balance <= 0 || Math.abs(balance) < 1);
      const paymentRate = totalWithAdvance > 0 ? ((paidGisung + advanceAmount) / totalWithAdvance) * 100 : 0;
      paymentMap[site.name] = {
        isFullyPaid,
        totalGisung: totalWithAdvance,
        paidGisung: paidGisung + advanceAmount,
        paymentRate: Math.round(paymentRate),
        balance: balance,
        contractAmount: contractAmount
      };
    });
    setPaymentStatusMap(paymentMap);
  }, [sites]);

  useEffect(() => {
    const loadGisungData = async () => {
      try {
        const gisungQuery = query(collection(db, 'gisung'));
        const gisungSnapshot = await getDocs(gisungQuery);
        const data = gisungSnapshot.docs.map(doc => doc.data());
        setGisungData(data);
        await loadPaymentStatus(data);
      } catch (error) {
        console.error('기성 데이터 로드 오류:', error);
      }
    };
    const loadCostData = async () => {
      try {
        const costQuery = query(collection(db, 'costs'));
        const costSnapshot = await getDocs(costQuery);
        const data = costSnapshot.docs.map(doc => doc.data());
        setCostData(data);
      } catch (error) {
        console.error('지출 데이터 로드 오류:', error);
      }
    };
    loadGisungData();
    loadCostData();
  }, []);

  useEffect(() => {
    if (sites.length > 0 && gisungData.length > 0) {
      loadPaymentStatus(gisungData);
    }
  }, [sites, gisungData, loadPaymentStatus]);

  // 연도별 전체 통합현황: 공사기간에 올해 포함(또는 기간없음) 계약금 + 올해 기성 + 올해 지출
  useEffect(() => {
    if (sites.length === 0) return;
    try {
      const currentYear = getCurrentYearSeoul();

      // 계약금액: 공사기간에 올해가 포함된 현장 + 공사기간 없는 현장
      const contractSites = sites.filter((site) => siteConstructionIncludesYear(site, currentYear));

      const totalContractAmount = contractSites.reduce(
        (sum, site) => sum + parseAmountNumber(site.contractAmount),
        0
      );

      // 누계기성: 공사기간에 올해 포함된 현장(기간없음 포함)의 전체 기성 + 선급금
      const contractSiteIds = new Set(contractSites.map((s) => s?.id).filter(Boolean));
      const contractSiteNames = new Set(contractSites.map((s) => s?.name).filter(Boolean));

      const matchedGisungList = gisungData.filter((gisung) => {
        const gisungSiteId = gisung.siteId || gisung.siteID || null;
        const gisungName = gisung.name || gisung.siteName || '';
        if (gisungSiteId && contractSiteIds.has(gisungSiteId)) return true;
        if (gisungName && contractSiteNames.has(gisungName)) return true;
        return false;
      });

      const isAdvanceRow = (g) => g.note && String(g.note).trim().includes('선급금');
      const totalGisungAmount = matchedGisungList.reduce((sum, gisung) => {
        if (isAdvanceRow(gisung)) {
          return sum + (parseAmountNumber(gisung.advance) || parseAmountNumber(gisung.gisungAmount));
        }
        return sum + parseAmountNumber(gisung.gisungAmount);
      }, 0);

      const totalAdvanceAmount = contractSites.reduce(
        (sum, site) => sum + parseAmountNumber(site.advance),
        0
      );
      const totalProgressAmount = totalGisungAmount + totalAdvanceAmount;

      // 올해 지출만 (착공연도 무관)
      const totalCostAmount = costData.reduce((sum, cost) => {
        if (getYearFromCostRecord(cost) !== currentYear) return sum;
        return sum + parseAmountNumber(cost.amount ?? cost.totalValue);
      }, 0);

      console.log('통합현황 계산 결과 (연도별):', {
        currentYear,
        totalContractAmount,
        totalProgressAmount,
        totalGisungAmount,
        totalAdvanceAmount,
        totalCostAmount,
        contractSitesCount: contractSites.length,
        matchedGisungCount: matchedGisungList.length,
        allGisungCount: gisungData.length,
      });

      setTotalIntegratedStatus({
        year: currentYear,
        summary: {
          totalEstimateAmount: totalContractAmount,
          totalClaimAmount: totalProgressAmount,
          totalCostAmount: totalCostAmount,
        },
      });
    } catch (error) {
      console.error('전체 통합현황 계산 오류:', error);
    }
  }, [sites, gisungData, costData]);

  return {
    gisungData,
    setGisungData,
    costData,
    paymentStatusMap,
    setPaymentStatusMap,
    siteIntegratedStatus,
    setSiteIntegratedStatus,
    totalIntegratedStatus,
  };
}

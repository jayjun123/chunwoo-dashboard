import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';
import { parseAmountNumber } from '../utils/siteUtils';

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

  // 캐시된 데이터를 사용한 통합현황 계산
  useEffect(() => {
    if (sites.length === 0) return;
    try {
      let totalContractAmount = 0;
      let totalProgressAmount = 0;
      let totalCostAmount = 0;

      totalContractAmount = sites.reduce((sum, site) => sum + (Number(site.contractAmount) || 0), 0);

      const siteIds = sites.map(site => site?.id).filter(Boolean);
      const siteNames = sites.map(site => site?.name).filter(Boolean);

      totalProgressAmount = gisungData.reduce((sum, gisung) => {
        const gisungSiteId = gisung.siteId || gisung.siteID || null;
        const gisungName = gisung.name || gisung.siteName || '';
        const matchById = gisungSiteId && siteIds.includes(gisungSiteId);
        const matchByName = gisungName && siteNames.includes(gisungName);
        if (matchById || matchByName) {
          return sum + (Number(gisung.gisungAmount) || 0);
        }
        return sum;
      }, 0);

      const totalAdvanceAmount = sites.reduce((sum, site) => sum + (Number(site.advance) || 0), 0);
      totalProgressAmount += totalAdvanceAmount;

      totalCostAmount = costData.reduce((sum, cost) => {
        const costSiteId = cost.siteId || cost.siteID || null;
        const costSiteName = cost.siteName || cost.name || '';
        const matchById = costSiteId && siteIds.includes(costSiteId);
        const matchByName = costSiteName && siteNames.includes(costSiteName);
        if (matchById || matchByName) {
          return sum + (Number(cost.amount) || 0);
        }
        return sum;
      }, 0);

      console.log('통합현황 계산 결과 (캐시 사용):', {
        totalContractAmount,
        totalProgressAmount,
        totalAdvanceAmount,
        totalCostAmount,
        sitesCount: sites.length,
        gisungDataLength: gisungData.length,
        costDataLength: costData.length,
        siteNames: siteNames
      });

      setTotalIntegratedStatus({
        summary: {
          totalEstimateAmount: totalContractAmount,
          totalClaimAmount: totalProgressAmount,
          totalCostAmount: totalCostAmount
        }
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

import { collection, query, where, getDocs, updateDoc, doc, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

// 컬렉션 이름 정의
const collections = {
  sites: 'sites',
  estimates: 'estimates',
  claims: 'claims',
  progress: 'progress',
  costs: 'costs',
  vendors: 'vendors'
};

/**
 * 견적 → 현장관리 연동
 * 견적 상태 변경 시 현장 정보 자동 업데이트
 */
export const syncEstimateToSite = async (siteName, submissionStatus, contractStatus) => {
  try {
    if (!siteName?.trim()) return;

    const siteQuery = query(
      collection(db, collections.sites),
      where('name', '==', siteName.trim())
    );
    const siteSnapshot = await getDocs(siteQuery);

    if (!siteSnapshot.empty) {
      const siteDoc = siteSnapshot.docs[0];
      const updateData = {};

      if (submissionStatus) {
        updateData.estimateStatus = submissionStatus;
      }
      if (contractStatus) {
        updateData.contractStatus = contractStatus;
      }

      if (Object.keys(updateData).length > 0) {
        updateData.updatedAt = new Date();
        await updateDoc(doc(db, collections.sites, siteDoc.id), updateData);
        console.log('견적 → 현장관리 연동 완료:', siteName);
      }
    }
  } catch (error) {
    console.error('견적 → 현장관리 연동 오류:', error);
  }
};

/**
 * 청구 → 기성 연동
 * 청구 시 기성 등록 상태 확인 및 업데이트
 */
export const syncClaimToProgress = async (claimMonth, siteName, claimAmount) => {
  try {
    if (!siteName?.trim() || !claimMonth) return;

    const progressQuery = query(
      collection(db, collections.progress),
      where('siteName', '==', siteName.trim()),
      where('month', '==', claimMonth)
    );
    const progressSnapshot = await getDocs(progressQuery);

    if (!progressSnapshot.empty) {
      const progressDoc = progressSnapshot.docs[0];
      const progressData = progressDoc.data();
      
      // 기성 대비 청구금액 계산
      const totalProgress = progressData.payments?.reduce((sum, payment) => 
        sum + (parseFloat(payment.amount) || 0), 0) || 0;
      
      const claimRatio = totalProgress > 0 ? (parseFloat(claimAmount) / totalProgress * 100) : 0;
      
      await updateDoc(doc(db, collections.progress, progressDoc.id), {
        claimAmount: parseFloat(claimAmount) || 0,
        claimRatio: Math.round(claimRatio * 100) / 100,
        lastClaimDate: new Date(),
        updatedAt: new Date()
      });
      
      console.log('청구 → 기성 연동 완료:', siteName);
    }
  } catch (error) {
    console.error('청구 → 기성 연동 오류:', error);
  }
};

/**
 * 기성 → 지출 연동
 * 기성 등록 시 지출 데이터 자동 생성
 */
export const syncProgressToCost = async (siteName, month, payments) => {
  try {
    if (!siteName?.trim() || !payments?.length) return;

    for (const payment of payments) {
      if (payment.amount && parseFloat(payment.amount) > 0) {
        const costData = {
          site: siteName.trim(),
          itemType: '기성',
          date: payment.date || new Date().toISOString().split('T')[0],
          totalValue: parseFloat(payment.amount),
          paymentType: '기성청구',
          description: `${month} 기성 ${payment.sequence || ''}차`,
          etcNote: `기성 등록 자동 생성 - ${payment.notes || ''}`,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await addDoc(collection(db, collections.costs), costData);
      }
    }
    
    console.log('기성 → 지출 연동 완료:', siteName);
  } catch (error) {
    console.error('기성 → 지출 연동 오류:', error);
  }
};

/**
 * 지출 → 현장관리 연동
 * 지출 현황을 현장별로 집계하여 현장 정보 업데이트
 */
export const syncCostToSite = async (siteName) => {
  try {
    if (!siteName?.trim()) return;

    const costQuery = query(
      collection(db, collections.costs),
      where('site', '==', siteName.trim()),
      orderBy('createdAt', 'desc')
    );
    const costSnapshot = await getDocs(costQuery);

    if (!costSnapshot.empty) {
      const costs = costSnapshot.docs.map(doc => doc.data());
      const totalCost = costs.reduce((sum, cost) => sum + (parseFloat(cost.totalValue) || 0), 0);
      
      // 현장 정보 업데이트
      const siteQuery = query(
        collection(db, collections.sites),
        where('name', '==', siteName.trim())
      );
      const siteSnapshot = await getDocs(siteQuery);

      if (!siteSnapshot.empty) {
        const siteDoc = siteSnapshot.docs[0];
        await updateDoc(doc(db, collections.sites, siteDoc.id), {
          totalCost: totalCost,
          lastCostUpdate: new Date(),
          updatedAt: new Date()
        });
        
        console.log('지출 → 현장관리 연동 완료:', siteName);
      }
    }
  } catch (error) {
    console.error('지출 → 현장관리 연동 오류:', error);
  }
};

/**
 * 현장별 통합 현황 조회
 */
export const getSiteIntegratedStatus = async (siteName) => {
  try {
    if (!siteName?.trim()) return null;

    const [estimates, claims, progress, costs] = await Promise.all([
      getDocs(query(collection(db, collections.estimates), where('siteName', '==', siteName.trim()))),
      getDocs(query(collection(db, collections.claims), where('siteName', '==', siteName.trim()))),
      getDocs(query(collection(db, 'gisung'), where('name', '==', siteName.trim()))), // 기성관리 컬렉션
      getDocs(query(collection(db, collections.costs), where('site', '==', siteName.trim())))
    ]);

    const estimateData = estimates.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const claimData = claims.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const progressData = progress.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const costData = costs.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 현장 정보에서 계약금액 가져오기
    const siteQuery = query(collection(db, collections.sites), where('name', '==', siteName.trim()));
    const siteSnapshot = await getDocs(siteQuery);
    const siteData = siteSnapshot.docs[0]?.data() || {};
    
    // 기성 데이터에서 누계 계산 (기성관리에서 가져온 데이터)
    console.log('=== 기성 데이터 디버깅 ===');
    console.log('기성 데이터 개수:', progressData.length);
    console.log('기성 데이터:', progressData);
    
    const totalProgressAmount = progressData.reduce((sum, progress) => {
      // 기성관리에서 사용하는 gisungAmount 필드 사용
      const gisungAmount = parseFloat(progress.gisungAmount) || 0;
      console.log('기성 항목:', progress.name, '차수:', progress.sequence, '금액:', gisungAmount);
      return sum + gisungAmount;
    }, 0);
    
    // 선급금을 누계기성에 포함
    const advanceAmount = parseFloat(siteData.advance) || 0;
    const totalWithAdvance = totalProgressAmount + advanceAmount;
    
    console.log('기성 누계:', totalProgressAmount);
    console.log('선급금:', advanceAmount);
    console.log('총 누계기성 (기성+선급금):', totalWithAdvance);

    return {
      siteName: siteName.trim(),
      estimates: estimateData,
      claims: claimData,
      progress: progressData,
      costs: costData,
      summary: {
        totalEstimates: estimateData.length,
        totalClaims: claimData.length,
        totalProgress: progressData.length,
        totalCosts: costData.length,
        totalEstimateAmount: parseFloat(siteData.contractAmount) || 0, // 현장의 계약금액
        totalClaimAmount: totalWithAdvance, // 기성 누계 + 선급금
        totalCostAmount: costData.reduce((sum, cost) => sum + (parseFloat(cost.totalValue) || 0), 0)
      }
    };
  } catch (error) {
    console.error('현장 통합 현황 조회 오류:', error);
    return null;
  }
};

/**
 * 월별 통합 현황 조회
 */
export const getMonthlyIntegratedStatus = async (month) => {
  try {
    if (!month) return null;

    const [estimates, claims, progress, costs] = await Promise.all([
      getDocs(query(collection(db, collections.estimates), where('receptionDate', '>=', `${month}-01`), where('receptionDate', '<=', `${month}-31`))),
      getDocs(query(collection(db, collections.claims), where('claimMonth', '==', month))),
      getDocs(query(collection(db, collections.progress), where('month', '==', month))),
      getDocs(query(collection(db, collections.costs), where('date', '>=', `${month}-01`), where('date', '<=', `${month}-31`)))
    ]);

    const estimateData = estimates.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const claimData = claims.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const progressData = progress.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const costData = costs.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return {
      month,
      estimates: estimateData,
      claims: claimData,
      progress: progressData,
      costs: costData,
      summary: {
        totalEstimates: estimateData.length,
        totalClaims: claimData.length,
        totalProgress: progressData.length,
        totalCosts: costData.length,
        totalEstimateAmount: estimateData.reduce((sum, est) => sum + (parseFloat(est.contractAmount) || 0), 0),
        totalClaimAmount: claimData.reduce((sum, claim) => sum + (parseFloat(claim.claimAmount) || 0), 0),
        totalCostAmount: costData.reduce((sum, cost) => sum + (parseFloat(cost.totalValue) || 0), 0)
      }
    };
  } catch (error) {
    console.error('월별 통합 현황 조회 오류:', error);
    return null;
  }
};

/**
 * 데이터 일관성 검사 및 복구
 */
export const checkDataConsistency = async () => {
  try {
    const issues = [];
    
    // 견적과 현장 정보 일관성 검사
    const estimates = await getDocs(collection(db, collections.estimates));
    for (const estimateDoc of estimates.docs) {
      const estimate = estimateDoc.data();
      if (estimate.siteName) {
        const siteQuery = query(collection(db, collections.sites), where('name', '==', estimate.siteName));
        const siteSnapshot = await getDocs(siteQuery);
        if (siteSnapshot.empty) {
          issues.push({
            type: '견적-현장 불일치',
            message: `견적의 현장명 "${estimate.siteName}"이 현장 목록에 없습니다.`,
            data: estimate
          });
        }
      }
    }

    // 청구와 기성 정보 일관성 검사
    const claims = await getDocs(collection(db, collections.claims));
    for (const claimDoc of claims.docs) {
      const claim = claimDoc.data();
      if (claim.siteName && claim.claimMonth) {
        const progressQuery = query(
          collection(db, collections.progress),
          where('siteName', '==', claim.siteName),
          where('month', '==', claim.claimMonth)
        );
        const progressSnapshot = await getDocs(progressQuery);
        if (progressSnapshot.empty) {
          issues.push({
            type: '청구-기성 불일치',
            message: `청구의 현장 "${claim.siteName}" ${claim.claimMonth} 기성 정보가 없습니다.`,
            data: claim
          });
        }
      }
    }

    return issues;
  } catch (error) {
    console.error('데이터 일관성 검사 오류:', error);
    return [];
  }
};

/**
 * 자동 데이터 동기화
 */
export const autoSyncData = async () => {
  try {
    console.log('자동 데이터 동기화 시작...');
    
    // 견적 데이터 동기화
    const estimates = await getDocs(collection(db, collections.estimates));
    for (const estimateDoc of estimates.docs) {
      const estimate = estimateDoc.data();
      if (estimate.siteName) {
        await syncEstimateToSite(estimate.siteName, estimate.submissionStatus, estimate.contractStatus);
      }
    }

    // 청구 데이터 동기화
    const claims = await getDocs(collection(db, collections.claims));
    for (const claimDoc of claims.docs) {
      const claim = claimDoc.data();
      if (claim.siteName && claim.claimMonth) {
        await syncClaimToProgress(claim.claimMonth, claim.siteName, claim.claimAmount);
      }
    }

    // 지출 데이터 동기화
    const costs = await getDocs(collection(db, collections.costs));
    const uniqueSites = [...new Set(costs.docs.map(doc => doc.data().site).filter(Boolean))];
    for (const siteName of uniqueSites) {
      await syncCostToSite(siteName);
    }

    console.log('자동 데이터 동기화 완료');
    return true;
  } catch (error) {
    console.error('자동 데이터 동기화 오류:', error);
    return false;
  }
}; 
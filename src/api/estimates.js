import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db, collections } from '../firebase';
import { normalizeDate } from '../utils/dateUtils';

// 거래처 연동 함수: 의뢰자와 회사명을 vendors 컬렉션에 자동 추가
const syncVendorData = async (requester, company) => {
  try {
    console.log('API 거래처 연동 시작:', { requester, company });
    
    // 1. 의뢰자 연동
    if (requester && requester.trim()) {
      const requesterQuery = query(
        collection(db, collections.vendors),
        where('name', '==', requester.trim())
      );
      const requesterSnapshot = await getDocs(requesterQuery);
      
      if (requesterSnapshot.empty) {
        console.log('API 의뢰자를 거래처에 추가:', requester);
        await addDoc(collection(db, collections.vendors), {
          name: requester.trim(),
          companyName: company || '',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } else {
        console.log('API 의뢰자가 이미 거래처에 존재함:', requester);
      }
    }
    
    // 2. 회사명 연동 (의뢰자와 다른 경우)
    if (company && company.trim() && company.trim() !== requester?.trim()) {
      const companyQuery = query(
        collection(db, collections.vendors),
        where('companyName', '==', company.trim())
      );
      const companySnapshot = await getDocs(companyQuery);
      
      if (companySnapshot.empty) {
        console.log('API 회사명을 거래처에 추가:', company);
        await addDoc(collection(db, collections.vendors), {
          name: company.trim(),
          companyName: company.trim(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } else {
        console.log('API 회사명이 이미 거래처에 존재함:', company);
      }
    }
    
    console.log('API 거래처 연동 완료');
  } catch (error) {
    console.error('API 거래처 연동 오류:', error);
    // 거래처 연동 실패해도 견적 저장은 계속 진행
  }
};

// 현장관리 연동 함수: 견적 상태를 현장 정보에 반영
const syncSiteData = async (siteName, submissionStatus, contractStatus) => {
  try {
    if (!siteName || !siteName.trim()) {
      console.log('API 현장명이 없어 현장 연동 건너뜀');
      return;
    }
    
    console.log('API 현장관리 연동 시작:', { siteName, submissionStatus, contractStatus });
    
    // 현장명으로 현장 찾기
    const siteQuery = query(
      collection(db, collections.sites),
      where('name', '==', siteName.trim())
    );
    const siteSnapshot = await getDocs(siteQuery);
    
    if (!siteSnapshot.empty) {
      const siteDoc = siteSnapshot.docs[0];
      const siteData = siteDoc.data();
      
      // 업데이트할 데이터 준비
      const updateData = {};
      
      // 제출상태 연동
      if (submissionStatus) {
        updateData.estimateStatus = submissionStatus;
        console.log('API 현장 제출상태 업데이트:', submissionStatus);
      }
      
      // 수주상태 연동
      if (contractStatus) {
        updateData.contractStatus = contractStatus;
        console.log('API 현장 수주상태 업데이트:', contractStatus);
      }
      
      // 업데이트할 데이터가 있으면 현장 정보 업데이트
      if (Object.keys(updateData).length > 0) {
        updateData.updatedAt = new Date();
        await updateDoc(doc(db, collections.sites, siteDoc.id), updateData);
        console.log('API 현장 정보 업데이트 완료');
      }
    } else {
      console.log('API 현장을 찾을 수 없음:', siteName);
    }
    
    console.log('API 현장관리 연동 완료');
  } catch (error) {
    console.error('API 현장관리 연동 오류:', error);
    // 현장 연동 실패해도 견적 저장은 계속 진행
  }
};

// 견적요청 컬렉션 참조
const estimatesCollection = collection(db, collections.estimates);

// 실시간 견적요청 목록 구독
export const subscribeToEstimates = (callback) => {
  const q = query(
    estimatesCollection,
    orderBy('receptionDate', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const estimates = [];
    snapshot.forEach((doc) => {
      estimates.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(estimates);
  });
};



// 견적요청 생성
export const createEstimate = async (estimateData) => {
  try {
    // 날짜 필드 정규화
    const normalizedData = {
      ...estimateData,
      receptionDate: normalizeDate(estimateData.receptionDate),
      submissionDeadline: normalizeDate(estimateData.submissionDeadline),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    console.log('견적 생성 - 정규화된 데이터:', normalizedData);
    
    // 1. 거래처 연동: 의뢰자와 회사명을 vendors 컬렉션에 자동 추가
    await syncVendorData(estimateData.requester, estimateData.company);
    
    const docRef = await addDoc(estimatesCollection, normalizedData);
    
    // 2. 현장관리 연동: 견적 추가 시 현장 정보 업데이트
    await syncSiteData(estimateData.siteName, estimateData.submissionStatus, estimateData.contractStatus);
    
    return docRef.id;
  } catch (error) {
    console.error('견적요청 생성 실패:', error);
    throw error;
  }
};

// 견적요청 수정
export const updateEstimate = async (estimateId, updateData) => {
  try {
    // 날짜 필드 정규화
    const normalizedData = {
      ...updateData,
      receptionDate: updateData.receptionDate ? normalizeDate(updateData.receptionDate) : undefined,
      submissionDeadline: updateData.submissionDeadline ? normalizeDate(updateData.submissionDeadline) : undefined,
      updatedAt: serverTimestamp()
    };
    
    // undefined 값 제거
    Object.keys(normalizedData).forEach(key => {
      if (normalizedData[key] === undefined) {
        delete normalizedData[key];
      }
    });
    
    console.log('견적 수정 - 정규화된 데이터:', normalizedData);
    
    // 1. 거래처 연동: 의뢰자와 회사명을 vendors 컬렉션에 자동 추가
    await syncVendorData(updateData.requester, updateData.company);
    
    const estimateRef = doc(db, collections.estimates, estimateId);
    await updateDoc(estimateRef, normalizedData);
    
    // 2. 현장관리 연동: 견적 상태 변경 시 현장 정보 업데이트
    await syncSiteData(updateData.siteName, updateData.submissionStatus, updateData.contractStatus);
  } catch (error) {
    console.error('견적요청 수정 실패:', error);
    throw error;
  }
};

// 견적요청 삭제
export const deleteEstimate = async (estimateId) => {
  try {
    const estimateRef = doc(db, collections.estimates, estimateId);
    await deleteDoc(estimateRef);
  } catch (error) {
    console.error('견적요청 삭제 실패:', error);
    throw error;
  }
};

// 견적요청 조회
export const getEstimate = async (estimateId) => {
  try {
    const estimateRef = doc(db, collections.estimates, estimateId);
    const estimateSnap = await getDoc(estimateRef);
    
    if (estimateSnap.exists()) {
      return {
        id: estimateSnap.id,
        ...estimateSnap.data()
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('견적요청 조회 실패:', error);
    throw error;
  }
};

// 견적요청 목록 조회 (필터링)
export const getEstimates = async (filters = {}) => {
  try {
    let q = estimatesCollection;
    
    // 필터 적용
    if (filters.submissionStatus) {
      q = query(q, where('submissionStatus', '==', filters.submissionStatus));
    }
    if (filters.contractStatus) {
      q = query(q, where('contractStatus', '==', filters.contractStatus));
    }
    if (filters.company) {
      q = query(q, where('company', '==', filters.company));
    }
    if (filters.siteName) {
      q = query(q, where('siteName', '==', filters.siteName));
    }
    
    // 정렬
    q = query(q, orderBy('receptionDate', 'desc'));
    
    const snapshot = await getDocs(q);
    const estimates = [];
    snapshot.forEach((doc) => {
      estimates.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return estimates;
  } catch (error) {
    console.error('견적요청 목록 조회 실패:', error);
    throw error;
  }
};

// 견적요청 통계
export const getEstimateStats = async () => {
  try {
    const snapshot = await getDocs(estimatesCollection);
    const estimates = snapshot.docs.map(doc => doc.data());
    
    const stats = {
      total: estimates.length,
      submitted: estimates.filter(e => e.submissionStatus === '제출완료').length,
      pending: estimates.filter(e => e.submissionStatus === '제출대기').length,
      contracted: estimates.filter(e => e.contractStatus === '수주').length,
      notContracted: estimates.filter(e => e.contractStatus === '미수주').length
    };
    
    return stats;
  } catch (error) {
    console.error('견적요청 통계 조회 실패:', error);
    throw error;
  }
}; 
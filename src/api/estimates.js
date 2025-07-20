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
import { db } from '../firebase';

// 견적요청 컬렉션 참조
const estimatesCollection = collection(db, 'estimates');

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
    const docRef = await addDoc(estimatesCollection, {
      ...estimateData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('견적요청 생성 실패:', error);
    throw error;
  }
};

// 견적요청 수정
export const updateEstimate = async (estimateId, updateData) => {
  try {
    const estimateRef = doc(db, 'estimates', estimateId);
    await updateDoc(estimateRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('견적요청 수정 실패:', error);
    throw error;
  }
};

// 견적요청 삭제
export const deleteEstimate = async (estimateId) => {
  try {
    const estimateRef = doc(db, 'estimates', estimateId);
    await deleteDoc(estimateRef);
  } catch (error) {
    console.error('견적요청 삭제 실패:', error);
    throw error;
  }
};

// 견적요청 조회
export const getEstimate = async (estimateId) => {
  try {
    const estimateRef = doc(db, 'estimates', estimateId);
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
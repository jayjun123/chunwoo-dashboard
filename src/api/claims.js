import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';

// 청구예정 컬렉션 참조
const claimsCollection = collection(db, 'claims');

// 실시간 청구예정 목록 구독
export const subscribeToClaims = (callback, month = null) => {
  console.log('🔍 subscribeToClaims 호출됨, month:', month);
  
  let q = claimsCollection;
  
  if (month) {
    q = query(
      claimsCollection,
      where('claimMonth', '==', month)
      // orderBy 제거하여 인덱스 오류 방지
    );
  } else {
    q = query(
      claimsCollection,
      orderBy('claimMonth', 'desc')
    );
  }

  console.log('🔍 Firestore 쿼리 생성됨');

  return onSnapshot(q, (snapshot) => {
    console.log('🔍 Firestore 스냅샷 수신, 문서 수:', snapshot.size);
    const claims = [];
    snapshot.forEach((doc) => {
      claims.push({
        id: doc.id,
        ...doc.data()
      });
    });
    console.log('🔍 처리된 claims 데이터:', claims.length, '개');
    callback(claims);
  }, (error) => {
    console.error('🔍 Firestore 구독 에러:', error);
    // 에러 발생 시에도 빈 배열로 콜백 호출하여 로딩 상태 해제
    callback([]);
  });
};

// 청구예정 생성
export const createClaim = async (claimData) => {
  try {
    const docRef = await addDoc(claimsCollection, {
      ...claimData,
      claimStatus: 'X', // 기본값은 X
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('청구예정 생성 실패:', error);
    throw error;
  }
};

// 청구예정 수정
export const updateClaim = async (claimId, updateData) => {
  try {
    const claimRef = doc(db, 'claims', claimId);
    await updateDoc(claimRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('청구예정 수정 실패:', error);
    throw error;
  }
};

// 청구예정 삭제
export const deleteClaim = async (claimId) => {
  try {
    const claimRef = doc(db, 'claims', claimId);
    await deleteDoc(claimRef);
  } catch (error) {
    console.error('청구예정 삭제 실패:', error);
    throw error;
  }
};

// 청구예정 조회
export const getClaim = async (claimId) => {
  try {
    const claimRef = doc(db, 'claims', claimId);
    const claimSnap = await getDoc(claimRef);
    
    if (claimSnap.exists()) {
      return {
        id: claimSnap.id,
        ...claimSnap.data()
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('청구예정 조회 실패:', error);
    throw error;
  }
};

// 청구예정 목록 조회 (필터링)
export const getClaims = async (filters = {}) => {
  try {
    let q = claimsCollection;
    
    // 필터 적용
    if (filters.claimMonth) {
      q = query(q, where('claimMonth', '==', filters.claimMonth));
    }
    if (filters.claimStatus) {
      q = query(q, where('claimStatus', '==', filters.claimStatus));
    }
    if (filters.siteName) {
      q = query(q, where('siteName', '==', filters.siteName));
    }
    
    // 정렬 - 복합 인덱스 오류 방지를 위해 단일 필드로 정렬
    q = query(q, orderBy('claimMonth', 'desc'));
    
    const snapshot = await getDocs(q);
    const claims = [];
    snapshot.forEach((doc) => {
      claims.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return claims;
  } catch (error) {
    console.error('청구예정 목록 조회 실패:', error);
    throw error;
  }
};

// 청구예정 통계
export const getClaimStats = async (month = null) => {
  try {
    let q = claimsCollection;
    if (month) {
      q = query(q, where('claimMonth', '==', month));
    }
    
    const snapshot = await getDocs(q);
    const claims = snapshot.docs.map(doc => doc.data());
    
    console.log('청구예정 통계 - 모든 청구 데이터:', claims.map(c => ({
      siteName: c.siteName,
      claimAmount: c.claimAmount,
      claimStatus: c.claimStatus
    })));
    
    const totalAmount = claims.reduce((sum, c) => {
      const amount = Number(c.claimAmount || 0);
      console.log(`청구금액 누적: ${sum} + ${amount} = ${sum + amount}`);
      return sum + amount;
    }, 0);
    
    console.log('최종 총액:', totalAmount);
    
    const stats = {
      total: claims.length,
      claimed: claims.filter(c => c.claimStatus === 'O').length,
      notClaimed: claims.filter(c => c.claimStatus === 'X').length,
      totalAmount: totalAmount
    };
    
    console.log('통계 결과:', stats);
    
    return stats;
  } catch (error) {
    console.error('청구예정 통계 조회 실패:', error);
    throw error;
  }
};

// 기성 등록 여부 확인 및 청구 상태 업데이트
export const checkProgressAndUpdateClaim = async (month, siteName) => {
  try {
    // 기성관리에서 해당 월, 현장의 기성 데이터 확인
    const progressQuery = query(
      collection(db, 'progress'),
      where('siteName', '==', siteName),
      where('month', '==', month)
    );
    
    const progressSnapshot = await getDocs(progressQuery);
    const hasProgress = !progressSnapshot.empty;
    
    // 청구예정에서 해당 현장 찾기
    const claimQuery = query(
      collection(db, 'claims'),
      where('claimMonth', '==', month),
      where('siteName', '==', siteName)
    );
    
    const claimSnapshot = await getDocs(claimQuery);
    
    if (!claimSnapshot.empty) {
      const claimDoc = claimSnapshot.docs[0];
      const newStatus = hasProgress ? 'O' : 'X';
      
      // 상태가 변경된 경우에만 업데이트
      if (claimDoc.data().claimStatus !== newStatus) {
        await updateDoc(doc(db, 'claims', claimDoc.id), {
          claimStatus: newStatus,
          updatedAt: serverTimestamp()
        });
      }
    }
    
    return hasProgress;
  } catch (error) {
    console.error('기성 등록 확인 및 청구 상태 업데이트 실패:', error);
    throw error;
  }
};

// 월별 청구예정 목록 조회
export const getClaimsByMonth = async (month) => {
  try {
    const q = query(
      claimsCollection,
      where('claimMonth', '==', month),
      orderBy('siteName', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const claims = [];
    snapshot.forEach((doc) => {
      claims.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return claims;
  } catch (error) {
    console.error('월별 청구예정 조회 실패:', error);
    throw error;
  }
}; 
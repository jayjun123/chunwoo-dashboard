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
  
  // 모든 데이터를 가져온 후 클라이언트에서 필터링
  let q = query(claimsCollection);

  console.log('🔍 Firestore 쿼리 생성됨');

  return onSnapshot(q, (snapshot) => {
    console.log('🔍 Firestore 스냅샷 수신, 문서 수:', snapshot.size);
    const claims = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      claims.push({
        id: doc.id,
        ...data
      });
    });
    
    // 클라이언트에서 월별 필터링
    let filteredClaims = claims;
    if (month) {
      filteredClaims = claims.filter(claim => {
        // claimMonth 필드가 있는 경우
        if (claim.claimMonth) {
          return claim.claimMonth === month;
        }
        // claimMonth 필드가 없는 경우, createdAt이나 다른 날짜 필드로 추정
        // 또는 기본적으로 현재 월로 간주
        console.log(`⚠️ claimMonth 필드가 없는 데이터 발견: ${claim.siteName}, ID: ${claim.id}`);
        return false; // claimMonth가 없는 데이터는 필터링에서 제외
      });
    }
    
    console.log('🔍 처리된 claims 데이터:', filteredClaims.length, '개 (전체:', claims.length, '개)');
    callback(filteredClaims);
  }, (error) => {
    console.error('🔍 Firestore 구독 에러:', error);
    // 에러 발생 시에도 빈 배열로 콜백 호출하여 로딩 상태 해제
    callback([]);
  });
};

// 기존 데이터에 claimMonth 필드 추가 (마이그레이션용)
export const migrateClaimsData = async () => {
  try {
    console.log('🔄 Claims 데이터 마이그레이션 시작');
    const snapshot = await getDocs(claimsCollection);
    const claimsToUpdate = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.claimMonth) {
        // createdAt 날짜를 기반으로 claimMonth 생성
        let claimMonth;
        if (data.createdAt) {
          const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
          claimMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else {
          // createdAt도 없으면 현재 월로 설정
          const now = new Date();
          claimMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }
        
        claimsToUpdate.push({
          id: doc.id,
          claimMonth: claimMonth,
          siteName: data.siteName
        });
      }
    });
    
    console.log(`🔄 마이그레이션 대상: ${claimsToUpdate.length}개`);
    
    // 배치 업데이트
    for (const claim of claimsToUpdate) {
      await updateDoc(doc(claimsCollection, claim.id), {
        claimMonth: claim.claimMonth
      });
      console.log(`✅ ${claim.siteName} (${claim.id}) -> claimMonth: ${claim.claimMonth}`);
    }
    
    console.log('🔄 Claims 데이터 마이그레이션 완료');
    return claimsToUpdate.length;
  } catch (error) {
    console.error('❌ Claims 데이터 마이그레이션 실패:', error);
    throw error;
  }
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
    
    // 이월된 현장의 금액은 총액에서 제외
    const totalAmount = claims.reduce((sum, c) => {
      if (c.claimStatus === '이월') {
        console.log(`이월 현장 제외: ${c.siteName} - ${c.claimAmount}`);
        return sum; // 이월된 현장은 총액에 포함하지 않음
      }
      const amount = Number(c.claimAmount || 0);
      console.log(`청구금액 누적: ${sum} + ${amount} = ${sum + amount}`);
      return sum + amount;
    }, 0);
    
    console.log('최종 총액:', totalAmount);
    
    const stats = {
      total: claims.length,
      claimed: claims.filter(c => c.claimStatus === 'O').length,
      notClaimed: claims.filter(c => c.claimStatus === '이월').length, // 이월 상태만 카운트
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
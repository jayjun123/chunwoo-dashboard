import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// 인덱스 상태 확인
export const checkIndexStatus = async () => {
  try {
    // 테스트 쿼리 실행
    const testQuery = query(
      collection(db, 'progress'),
      where('siteId', '==', 'test'),
      where('date', '>=', '2024-01-01'),
      where('date', '<=', '2024-12-31')
    );
    
    await getDocs(testQuery);
    return { hasIndex: true, message: '인덱스가 정상적으로 작동합니다.' };
  } catch (error) {
    if (error.code === 'failed-precondition' || error.message.includes('index')) {
      return { 
        hasIndex: false, 
        message: '인덱스가 생성되지 않았습니다. Firebase Console에서 인덱스를 생성해주세요.',
        error: error
      };
    }
    return { 
      hasIndex: false, 
      message: '알 수 없는 오류가 발생했습니다.',
      error: error
    };
  }
};

// 최적화된 쿼리 실행 (인덱스 상태에 따라 자동 전환)
export const executeOptimizedQuery = async (collectionName, conditions, fallbackQuery) => {
  try {
    // 최적화된 쿼리 시도
    const optimizedQuery = query(collection(db, collectionName), ...conditions);
    const snapshot = await getDocs(optimizedQuery);
    return {
      success: true,
      data: snapshot.docs.map(doc => doc.data()),
      optimized: true
    };
  } catch (error) {
    console.warn('최적화된 쿼리 실패, 대체 쿼리 사용:', error);
    
    // 대체 쿼리 실행
    try {
      const fallbackSnapshot = await getDocs(fallbackQuery);
      return {
        success: true,
        data: fallbackSnapshot.docs.map(doc => doc.data()),
        optimized: false,
        warning: '인덱스가 없어 성능이 저하될 수 있습니다.'
      };
    } catch (fallbackError) {
      return {
        success: false,
        error: fallbackError,
        message: '쿼리 실행에 실패했습니다.'
      };
    }
  }
};

// 인덱스 생성 링크 생성
export const getIndexCreationLink = (projectId, collectionName, fields) => {
  const fieldConfig = fields.map(field => 
    `field-path=${field.path},order=${field.order}`
  ).join(',');
  
  return `https://console.firebase.google.com/v1/r/project/${projectId}/firestore/indexes?create_composite=Ck9wcm9qZWN0cy9jaHVud29vby1lZGY5Zi9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMv${collectionName}/aW5kZXhlcy9fEAEaCgoGc2l0ZUlkEAEaCAoEZGF0ZRACGgwKCF9fbmFtZV9fEAI`;
};

// 필요한 인덱스 목록
export const requiredIndexes = [
  {
    collection: 'progress',
    fields: [
      { path: 'siteId', order: 'ASCENDING' },
      { path: 'date', order: 'ASCENDING' }
    ],
    description: '현장별 기간별 기성 현황 조회'
  },
  {
    collection: 'discussions',
    fields: [
      { path: 'type', order: 'ASCENDING' },
      { path: 'timestamp', order: 'DESCENDING' }
    ],
    description: '협의방 목록 조회 (최신순)'
  },
  {
    collection: 'discussions',
    fields: [
      { path: 'roomId', order: 'ASCENDING' },
      { path: 'timestamp', order: 'ASCENDING' }
    ],
    description: '협의방 메시지 조회 (시간순)'
  }
]; 
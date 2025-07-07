import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, limit, where, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Firebase 설정 (직접 설정값 사용)
const firebaseConfig = {
  apiKey: "AIzaSyATCGXGD2_teiJFdpng9J2_fvZRItPef0w",
  authDomain: "chunwooo-ebaseapp.com",
  projectId: "chunwooo-edf9f",
  storageBucket: "chunwooo-edf9f.firebasestorage.app",
  messagingSenderId: "417029078660",
  appId: "1:417029078660:web:00e23d79af77876e598cd1",
  measurementId: "G-653CL9XWFH"
};

console.log('Firebase 설정 로드:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  apiKey: firebaseConfig.apiKey ? '설정됨' : '설정되지 않음'
});

// Firebase 앱 초기화
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase 앱이 성공적으로 초기화되었습니다.');
} catch (error) {
  console.error('❌ Firebase 앱 초기화 실패:', error);
  throw error;
}

// Firebase 서비스 초기화
export const auth = getAuth(app);

// 강력한 지속성 설정 (새로고침 시 로그인 유지)
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('✅ Firebase Auth 지속성 설정 완료 (browserLocalPersistence)');
  })
  .catch((error) => {
    console.error('❌ Firebase Auth 지속성 설정 실패:', error);
  });

export const db = getFirestore(app);
export const storage = getStorage(app);

// Analytics 초기화 (지원되는 환경에서만)
let analytics = null;
isSupported().then(yes => yes ? analytics = getAnalytics(app) : null);

export { analytics };

// 개발 환경에서 Firestore 에뮬레이터 설정 (선택사항)
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIRESTORE_EMULATOR === 'true') {
  try {
    import('firebase/firestore').then(({ connectFirestoreEmulator }) => {
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('Firestore 에뮬레이터에 연결되었습니다.');
    });
  } catch (error) {
    console.warn('Firestore 에뮬레이터 연결 실패:', error);
  }
}

// 데이터베이스 컬렉션 구조
export const collections = {
  sites: 'sites',           // 현장 정보
  progress: 'progress',     // 기성 현황
  discussions: 'discussions', // 협의 게시판
  safety: 'safety',         // 안전 관리
  todos: 'todos',           // 할일 목록
  weather: 'weather',       // 날씨 정보
  members: 'members',       // 회원 정보
  permissions: 'permissions', // 권한 관리
  costs: 'costs',           // 지출 관리
  documents: 'documents',   // 문서 관리
  schedules: 'schedules',   // 일정 관리
  vendors: 'vendors',       // 거래처 관리
  gisung: 'gisung'          // 기성 관리
};

// 최적화된 쿼리 함수들
export const queries = {
  // 현장 목록 조회 (페이지네이션)
  getSites: (lastDoc = null, pageSize = 20) => {
    let q = query(
      collection(db, collections.sites),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );
    if (lastDoc) {
      q = query(q, where('createdAt', '<', lastDoc.createdAt));
    }
    return q;
  },

  // 활성 현장 조회
  getActiveSites: () => {
    return query(
      collection(db, collections.sites),
      where('status', '==', '진행중'),
      orderBy('createdAt', 'desc')
    );
  },

  // 기성 현황 조회 (현장별)
  getProgressBySite: (siteId) => {
    return query(
      collection(db, collections.progress),
      where('siteId', '==', siteId),
      orderBy('date', 'desc'),
      limit(20)
    );
  },

  // 협의 게시판 조회 (페이지네이션)
  getDiscussions: (lastDoc = null, pageSize = 20) => {
    let q = query(
      collection(db, collections.discussions),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );
    if (lastDoc) {
      q = query(q, where('createdAt', '<', lastDoc.createdAt));
    }
    return q;
  },

  // 안전 관리 조회 (미해결 항목)
  getUnresolvedSafety: () => {
    return query(
      collection(db, collections.safety),
      where('resolved', '==', false),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  },

  // 할일 목록 조회 (사용자별)
  getTodosByUser: (userId) => {
    return query(
      collection(db, collections.todos),
      where('userId', '==', userId),
      where('completed', '==', false),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  },

  // 지출 내역 조회 (현장별)
  getCostsBySite: (siteId) => {
    return query(
      collection(db, collections.costs),
      where('siteId', '==', siteId),
      orderBy('date', 'desc'),
      limit(50)
    );
  },

  // 문서 조회 (사용자별)
  getDocumentsByUser: (userId) => {
    return query(
      collection(db, collections.documents),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  },

  // 일정 조회 (사용자별)
  getSchedulesByUser: (userId) => {
    return query(
      collection(db, collections.schedules),
      where('userId', '==', userId),
      orderBy('startDate', 'asc'),
      limit(50)
    );
  }
};

// 초기 데이터 구조
export const initialData = {
  sites: {
    active: 0,
    completedToday: 0,
    completedMonth: 0,
    total: 0
  },
  progress: {
    current: 0,
    target: 0,
    percentage: 0
  },
  discussions: {
    new: 0,
    total: 0
  },
  safety: {
    new: 0,
    total: 0
  },
  todos: {
    completed: 0,
    total: 0,
    items: []
  },
  costs: {
    total: 0,
    monthly: 0,
    items: []
  }
};

// Firebase 연결 상태 모니터링
export const monitorConnection = () => {
  const unsubscribe = auth.onAuthStateChanged((user) => {
    if (user) {
      console.log('Firebase 연결 상태: 연결됨');
    } else {
      console.log('Firebase 연결 상태: 연결되지 않음');
    }
  });

  return unsubscribe;
};

export default app; 
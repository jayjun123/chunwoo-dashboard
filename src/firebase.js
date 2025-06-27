import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, orderBy, limit, where, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

// 환경변수 디버깅 - 더 자세한 정보
console.log('=== Firebase 환경변수 디버깅 ===');
console.log('import.meta.env:', import.meta.env);
console.log('VITE_FIREBASE_API_KEY:', import.meta.env.VITE_FIREBASE_API_KEY);
console.log('VITE_FIREBASE_AUTH_DOMAIN:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
console.log('VITE_FIREBASE_PROJECT_ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
console.log('VITE_FIREBASE_STORAGE_BUCKET:', import.meta.env.VITE_FIREBASE_STORAGE_BUCKET);
console.log('VITE_FIREBASE_MESSAGING_SENDER_ID:', import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID);
console.log('VITE_FIREBASE_APP_ID:', import.meta.env.VITE_FIREBASE_APP_ID);
console.log('VITE_FIREBASE_MEASUREMENT_ID:', import.meta.env.VITE_FIREBASE_MEASUREMENT_ID);
console.log('================================');

// 환경변수가 로드되지 않을 경우 하드코딩된 설정 사용 (임시)
const fallbackConfig = {
  apiKey: "AIzaSyATCGXGD2_teiJFdpng9J2_fvZRItPef0w",
  authDomain: "chunwooo-ebaseapp.com",
  projectId: "chunwooo-edf9f",
  storageBucket: "chunwooo-erebasestorage.app",
  messagingSenderId: "417029078660",
  appId: "1:417029078660:web:00e23d79af77876e598cd1",
  measurementId: "G-653CL9XWFH"
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || fallbackConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || fallbackConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || fallbackConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || fallbackConfig.measurementId
};

// 설정 검증 - 더 엄격한 검증
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

if (missingFields.length > 0) {
  console.error('누락된 Firebase 설정:', missingFields);
  throw new Error(`Firebase 설정이 누락되었습니다: ${missingFields.join(', ')}`);
}

if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'undefined') {
  throw new Error('Firebase API 키가 설정되지 않았습니다. 환경변수 VITE_FIREBASE_API_KEY를 확인해주세요.');
}

console.log('Firebase 설정 완료:', {
  apiKey: firebaseConfig.apiKey ? '설정됨' : '설정되지 않음',
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId
});

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);

// Firestore 설정 개선
export const db = getFirestore(app);

// Firestore 연결 안정성을 위한 설정
const firestoreSettings = {
  // 실시간 리스너 연결 안정성 향상
  experimentalForceLongPolling: true, // 긴 폴링 사용으로 연결 안정성 향상
  useFetchStreams: false, // 스트림 대신 일반 HTTP 요청 사용
  cacheSizeBytes: 50 * 1024 * 1024, // 캐시 크기 증가 (50MB)
};

// 개발 환경에서 에뮬레이터 연결 (필요시)
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIRESTORE_EMULATOR === 'true') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
  } catch (error) {
    console.warn('Firestore 에뮬레이터 연결 실패:', error);
  }
}

export const storage = getStorage(app);

export const initializeAnalytics = async () => {
  if (await isSupported()) {
    return getAnalytics(app);
  }
  return null;
};

// 데이터베이스 컬렉션 구조
export const collections = {
  sites: 'sites',           // 현장 정보
  progress: 'progress',     // 기성 현황
  discussions: 'discussions', // 협의 게시판
  safety: 'safety',         // 안전 관리
  todos: 'todos',           // 할일 목록
  weather: 'weather',       // 날씨 정보
  members: 'members',       // 회원 정보
  permissions: 'permissions' // 권한 관리
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
  }
};

export default app; 
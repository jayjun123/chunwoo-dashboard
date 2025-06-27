import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, orderBy, limit, where, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

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
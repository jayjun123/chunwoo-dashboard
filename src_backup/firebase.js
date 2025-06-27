import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Vite 환경: 환경변수는 import.meta.env.VITE_... 만 사용
console.log('FIREBASE_API_KEY:', import.meta.env.VITE_FIREBASE_API_KEY);
console.log('FIREBASE_AUTH_DOMAIN:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
console.log('FIREBASE_PROJECT_ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// 환경 변수 검증
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];
const missingEnvVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Firebase 앱이 이미 초기화되어 있는지 확인
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Google Analytics는 브라우저 환경에서만 초기화
export const analytics = async () => {
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
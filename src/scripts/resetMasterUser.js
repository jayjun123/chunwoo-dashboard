import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Firebase 설정 (환경변수 사용)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 새로운 마스터 계정 생성
async function createMasterUser() {
  try {
    const email = 'master@construction.com';
    const password = 'master123!';
    const name = '마스터 관리자';
    const organization = '건설현장관리시스템';

    console.log('🔧 새로운 마스터 계정 생성 중...');

    // Firebase Auth로 사용자 생성
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log('✅ Firebase Auth 사용자 생성 완료:', user.uid);

    // Firestore에 마스터 사용자 정보 저장
    const userData = {
      email: email,
      name: name,
      organization: organization,
      role: 'admin', // 마스터 권한
      grade: '마스터',
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      lastLoginAt: new Date(),
      permissions: ['all'] // 모든 권한
    };

    // Firestore에 사용자 정보 저장
    await setDoc(doc(db, 'members', user.uid), userData);

    console.log('✅ Firestore 사용자 정보 저장 완료');
    console.log('\n🎉 마스터 계정 생성 완료!');
    console.log('='.repeat(50));
    console.log('📧 이메일:', email);
    console.log('🔑 비밀번호:', password);
    console.log('👤 이름:', name);
    console.log('🏢 소속:', organization);
    console.log('🔐 권한:', '마스터 (관리자)');
    console.log('='.repeat(50));
    console.log('\n🌐 브라우저에서 http://localhost:3003 접속 후 로그인하세요!');

  } catch (error) {
    console.error('❌ 마스터 계정 생성 실패:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('⚠️ 이미 존재하는 이메일입니다.');
      console.log('📧 이메일: master@construction.com');
      console.log('🔑 비밀번호: master123!');
    }
  }
}

// 스크립트 실행
createMasterUser(); 
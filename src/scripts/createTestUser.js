import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Firebase 설정 (개발 환경용)
const firebaseConfig = {
  apiKey: "AIzaSyATCGXGD2_teiJFdpng9J2_fvZRItPef0w",
  authDomain: "chunwooo-ebaseapp.com",
  projectId: "chunwooo-edf9f",
  storageBucket: "chunwooo-erebasestorage.app",
  messagingSenderId: "417029078660",
  appId: "1:417029078660:web:00e23d79af77876e598cd1",
  measurementId: "G-653CL9XWFH"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 테스트 사용자 생성 함수
async function createTestUser() {
  try {
    const email = 'admin@test.com';
    const password = 'admin123!';
    const name = '관리자';
    const organization = '테스트 건설';

    console.log('테스트 사용자 생성 중...');

    // Firebase Auth로 사용자 생성
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log('Firebase Auth 사용자 생성 완료:', user.uid);

    // Firestore에 추가 사용자 정보 저장
    const userData = {
      email: email,
      name: name,
      organization: organization,
      role: 'admin', // 관리자 권한
      grade: '관리자',
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      lastLoginAt: new Date()
    };

    // Firestore에 사용자 정보 저장
    await setDoc(doc(db, 'members', user.uid), userData);

    console.log('Firestore 사용자 정보 저장 완료');
    console.log('✅ 테스트 사용자 생성 완료!');
    console.log('📧 이메일:', email);
    console.log('🔑 비밀번호:', password);
    console.log('👤 이름:', name);
    console.log('🏢 소속:', organization);
    console.log('🔐 권한:', '관리자');

  } catch (error) {
    console.error('❌ 테스트 사용자 생성 실패:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('⚠️ 이미 존재하는 이메일입니다.');
      console.log('📧 이메일: admin@test.com');
      console.log('🔑 비밀번호: admin123!');
    }
  }
}

// 스크립트 실행
createTestUser(); 
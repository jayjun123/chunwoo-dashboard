import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Firebase 설정
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

// 사용자 계정 확인 함수
async function checkUsers() {
  try {
    console.log('🔍 Firebase 사용자 계정 확인 중...');
    
    // Firestore에서 사용자 목록 가져오기
    const usersSnapshot = await getDocs(collection(db, 'members'));
    
    console.log('📋 등록된 사용자 목록:');
    console.log('='.repeat(50));
    
    if (usersSnapshot.empty) {
      console.log('❌ 등록된 사용자가 없습니다.');
      return;
    }
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      console.log(`👤 사용자 ID: ${doc.id}`);
      console.log(`📧 이메일: ${userData.email}`);
      console.log(`👤 이름: ${userData.name}`);
      console.log(`🏢 소속: ${userData.organization}`);
      console.log(`🔐 권한: ${userData.role}`);
      console.log(`📅 생성일: ${userData.createdAt?.toDate?.() || userData.createdAt}`);
      console.log('-'.repeat(30));
    });
    
    // 특정 이메일로 로그인 테스트
    const testEmails = ['fire8803@naver.com', 'admin@test.com'];
    
    console.log('\n🔐 로그인 테스트:');
    console.log('='.repeat(50));
    
    for (const email of testEmails) {
      try {
        // 임시로 테스트 비밀번호로 시도
        const testPasswords = ['123456', 'password', 'admin123', 'test123'];
        
        for (const password of testPasswords) {
          try {
            await signInWithEmailAndPassword(auth, email, password);
            console.log(`✅ 로그인 성공: ${email} / ${password}`);
            break;
          } catch (error) {
            if (error.code === 'auth/user-not-found') {
              console.log(`❌ 사용자 없음: ${email}`);
              break;
            } else if (error.code === 'auth/wrong-password') {
              // 비밀번호가 틀린 경우 계속 시도
              continue;
            } else {
              console.log(`❌ 로그인 실패: ${email} - ${error.message}`);
              break;
            }
          }
        }
      } catch (error) {
        console.log(`❌ 계정 확인 실패: ${email} - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 사용자 확인 중 오류 발생:', error);
  }
}

// 스크립트 실행
checkUsers(); 
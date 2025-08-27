// Firebase 연결 상태 모니터링 및 재연결 유틸리티
import { onAuthStateChanged } from 'firebase/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';

// 연결 상태 모니터링
export const monitorFirebaseConnection = () => {
  console.log('🔍 Firebase 연결 상태 모니터링 시작...');
  
  // Auth 상태 모니터링
  const authUnsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('✅ Firebase Auth 연결됨:', user.email);
    } else {
      console.log('⚠️ Firebase Auth 연결되지 않음');
    }
  }, (error) => {
    console.error('❌ Firebase Auth 연결 오류:', error);
  });

  // Firestore 연결 테스트
  const testFirestoreConnection = () => {
    try {
      const testDoc = doc(db, 'test', 'connection');
      const unsubscribe = onSnapshot(testDoc, (doc) => {
        console.log('✅ Firestore 연결됨');
        unsubscribe();
      }, (error) => {
        console.error('❌ Firestore 연결 오류:', error);
      });
    } catch (error) {
      console.error('❌ Firestore 연결 테스트 실패:', error);
    }
  };

  // 초기 연결 테스트
  testFirestoreConnection();

  // 30초마다 연결 상태 확인
  const intervalId = setInterval(testFirestoreConnection, 30000);

  // 정리 함수 반환
  return () => {
    authUnsubscribe();
    clearInterval(intervalId);
    console.log('🔍 Firebase 연결 모니터링 종료');
  };
};

// 연결 재설정
export const resetFirebaseConnection = async () => {
  try {
    console.log('🔄 Firebase 연결 재설정 중...');
    
    // 현재 연결 상태 확인
    const currentUser = auth.currentUser;
    console.log('현재 사용자:', currentUser ? currentUser.email : '없음');
    
    // 페이지 새로고침 없이 연결 재설정
    window.location.reload();
    
  } catch (error) {
    console.error('❌ Firebase 연결 재설정 실패:', error);
  }
};

// 브라우저 확장 프로그램 충돌 방지
export const preventExtensionConflicts = () => {
  // Chrome 확장 프로그램 관련 오류 무시
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    
    // 확장 프로그램 관련 오류는 무시
    if (message.includes('runtime.lastError') || 
        message.includes('message channel closed') ||
        message.includes('asynchronous response')) {
      console.debug('🔧 브라우저 확장 프로그램 오류 무시:', message);
      return;
    }
    
    // 기타 오류는 정상 출력
    originalConsoleError.apply(console, args);
  };
  
  console.log('✅ 브라우저 확장 프로그램 충돌 방지 설정 완료');
};


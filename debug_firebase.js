// Firebase 디버깅 스크립트
// 브라우저 콘솔에서 실행하세요

// 1. 현재 사용자 정보 확인
const checkCurrentUser = () => {
  try {
    // 로컬 스토리지에서 Firebase 인증 정보 확인
    const firebaseAuthData = localStorage.getItem('firebase:authUser:AIzaSyATCGXGD2_teiJFdpng9J2_fvZRItPef0w:[DEFAULT]');
    
    if (firebaseAuthData) {
      const authData = JSON.parse(firebaseAuthData);
      console.log('🔍 현재 로그인한 사용자:');
      console.log('- 이메일:', authData.email);
      console.log('- UID:', authData.uid);
      console.log('- 이메일 인증:', authData.emailVerified);
      
      // 토큰 정보 확인
      if (authData.stsTokenManager) {
        console.log('- 액세스 토큰 만료:', new Date(authData.stsTokenManager.expirationTime));
      }
      
      return authData;
    } else {
      console.log('❌ 로그인된 사용자가 없습니다.');
      return null;
    }
  } catch (error) {
    console.error('❌ 사용자 정보 확인 중 오류:', error);
    return null;
  }
};

// 2. Firestore 데이터 확인 (간접 방법)
const checkFirestoreData = async () => {
  try {
    // 네트워크 요청을 통해 Firestore 데이터 확인
    const response = await fetch('/api/debug/firestore', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('🔍 Firestore 데이터:', data);
    } else {
      console.log('⚠️ Firestore 데이터 확인 실패');
    }
  } catch (error) {
    console.error('❌ Firestore 데이터 확인 중 오류:', error);
  }
};

// 3. 권한 확인
const checkPermissions = () => {
  const user = checkCurrentUser();
  
  if (user) {
    console.log('🔍 권한 확인:');
    console.log('- 이메일:', user.email);
    
    // fire8803@naver.com은 마스터 권한
    if (user.email === 'fire8803@naver.com') {
      console.log('✅ 마스터 권한 확인됨');
      console.log('- 역할: master');
      console.log('- 등급: 마스터');
    } else {
      console.log('⚠️ 일반 사용자 권한');
    }
  }
};

// 4. 전체 디버깅 실행
const runDebug = () => {
  console.log('=== Firebase 디버깅 시작 ===');
  checkCurrentUser();
  checkPermissions();
  console.log('=== Firebase 디버깅 완료 ===');
};

// 전역 함수로 등록
window.debugFirebase = runDebug;
window.checkCurrentUser = checkCurrentUser;
window.checkPermissions = checkPermissions;

console.log('✅ Firebase 디버깅 스크립트 로드됨');
console.log('사용법: debugFirebase() 실행');



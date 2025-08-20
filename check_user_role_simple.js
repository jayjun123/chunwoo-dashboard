// 브라우저 콘솔에서 직접 실행하세요
// Firebase가 이미 초기화되어 있다고 가정합니다

const checkUserRoleSimple = async () => {
  try {
    // 이미 초기화된 Firebase 앱 사용
    const auth = window.app.auth();
    const user = auth.currentUser;
    
    if (!user) {
      console.log('❌ 로그인된 사용자가 없습니다.');
      return;
    }
    
    console.log('🔍 현재 로그인한 사용자 정보:');
    console.log('- 이메일:', user.email);
    console.log('- UID:', user.uid);
    console.log('- 이메일 인증:', user.emailVerified);
    
    // 사용자 토큰 정보 확인
    const token = await user.getIdTokenResult();
    console.log('🔍 사용자 토큰 정보:');
    console.log('- 토큰 클레임:', token.claims);
    console.log('- 역할:', token.claims.role);
    console.log('- 등급:', token.claims.grade);
    
    // members 컬렉션에서 사용자 정보 확인
    const db = window.app.firestore();
    const membersRef = db.collection('members');
    const snapshot = await membersRef.where('email', '==', user.email).get();
    
    if (!snapshot.empty) {
      const memberData = snapshot.docs[0].data();
      console.log('🔍 members 컬렉션 정보:');
      console.log('- 역할:', memberData.role);
      console.log('- 등급:', memberData.grade);
      console.log('- 전체 데이터:', memberData);
    } else {
      console.log('⚠️ members 컬렉션에서 사용자를 찾을 수 없습니다.');
    }
    
  } catch (error) {
    console.error('❌ 권한 확인 중 오류:', error);
  }
};

// 스크립트 실행
checkUserRoleSimple();


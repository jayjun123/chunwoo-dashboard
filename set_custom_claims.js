const admin = require('firebase-admin');

// Firebase Admin SDK 초기화
const serviceAccount = require('./serviceAccountKey.json'); // 서비스 계정 키 파일이 필요합니다

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://chunwooo-edf9f-default-rtdb.firebaseio.com"
});

const setCustomClaims = async () => {
  try {
    console.log('🔧 커스텀 클레임 설정 시작...');
    
    // fire8803@naver.com 사용자의 UID 찾기
    const userRecord = await admin.auth().getUserByEmail('fire8803@naver.com');
    console.log('사용자 정보:', userRecord.uid, userRecord.email);
    
    // 커스텀 클레임 설정
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'master',
      grade: '마스터'
    });
    
    console.log('✅ fire8803@naver.com 사용자에게 master 권한이 설정되었습니다.');
    console.log('사용자는 다시 로그인해야 새로운 권한이 적용됩니다.');
    
    // 설정된 클레임 확인
    const updatedUser = await admin.auth().getUser(userRecord.uid);
    console.log('설정된 커스텀 클레임:', updatedUser.customClaims);
    
  } catch (error) {
    console.error('❌ 커스텀 클레임 설정 실패:', error);
  }
  
  process.exit(0);
};

setCustomClaims();


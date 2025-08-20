// 브라우저 콘솔에서 실행할 수 있는 Firebase Storage 테스트 스크립트
(async function testFirebaseStorage() {
  try {
    console.log('🔍 Firebase Storage 접근 테스트 시작...');
    
    // Firebase 모듈 가져오기
    const { ref, getDownloadURL } = await import('firebase/storage');
    const { storage } = await import('./src/firebase.js');
    
    console.log('✅ Firebase 모듈 로드 완료');
    
    // 템플릿 파일들 테스트
    const templates = [
      'templates/NEWgisung.xlsx',
      'templates/견적서.xlsx',
      'templates/납품계약서 갑지.xlsx'
    ];
    
    for (const templatePath of templates) {
      try {
        console.log(`📋 ${templatePath} 테스트 중...`);
        
        const storageRef = ref(storage, templatePath);
        const downloadURL = await getDownloadURL(storageRef);
        
        console.log(`✅ ${templatePath} 접근 성공:`, downloadURL);
        
      } catch (error) {
        console.error(`❌ ${templatePath} 접근 실패:`, error.message);
        console.error('상세 오류:', error);
      }
    }
    
    console.log('🎉 Firebase Storage 테스트 완료!');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
})();


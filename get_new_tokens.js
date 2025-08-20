// Firebase Storage에서 새로운 다운로드 토큰을 가져오는 스크립트
// 브라우저 콘솔에서 실행하세요

(async function getNewTokens() {
  try {
    console.log('🔑 Firebase Storage 새로운 토큰 가져오기 시작...');
    
    // 현재 페이지에서 Firebase 모듈 가져오기
    const { ref, getDownloadURL } = await import('firebase/storage');
    const { storage } = await import('./src/firebase.js');
    
    // 토큰을 가져올 파일 목록
    const files = [
      'templates/estimate.xlsx',
      'templates/gisung.xlsx',
      'templates/contract_gabji.xlsx'
    ];
    
    console.log('📋 토큰을 가져올 파일들:', files);
    
    for (const filePath of files) {
      try {
        console.log(`\n🔍 ${filePath} 토큰 가져오는 중...`);
        
        const fileRef = ref(storage, filePath);
        const downloadURL = await getDownloadURL(fileRef);
        
        console.log(`✅ ${filePath} 다운로드 URL:`, downloadURL);
        
        // 토큰 추출
        const tokenMatch = downloadURL.match(/token=([^&]+)/);
        if (tokenMatch) {
          console.log(`🔑 ${filePath} 토큰:`, tokenMatch[1]);
        }
        
      } catch (error) {
        console.error(`❌ ${filePath} 토큰 가져오기 실패:`, error.message);
      }
    }
    
    console.log('\n🎉 모든 토큰 가져오기 완료!');
    
  } catch (error) {
    console.error('❌ 토큰 가져오기 실패:', error);
  }
})();

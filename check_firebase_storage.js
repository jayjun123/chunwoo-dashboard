// Firebase Storage에 NEWgisung.xlsx 파일이 있는지 확인하는 스크립트
// 브라우저 콘솔에서 실행하세요

const checkFirebaseStorage = async () => {
  try {
    console.log('🔍 Firebase Storage 파일 확인 시작...');
    
    // Firebase 모듈 동적 import
    const { getStorage, ref, listAll, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');
    
    // Firebase Storage 초기화
    const storage = getStorage();
    
    // templates 폴더의 모든 파일 목록 가져오기
    const templatesRef = ref(storage, 'templates');
    const result = await listAll(templatesRef);
    
    console.log('📋 templates 폴더의 파일들:');
    result.items.forEach(item => {
      console.log(`- ${item.name}`);
    });
    
    // NEWgisung.xlsx 파일이 있는지 확인
    const gisungFile = result.items.find(item => item.name === 'NEWgisung.xlsx');
    
    if (gisungFile) {
      console.log('✅ NEWgisung.xlsx 파일이 Firebase Storage에 존재합니다!');
      
      // 파일 다운로드 URL 가져오기
      try {
        const downloadURL = await getDownloadURL(gisungFile);
        console.log('📥 다운로드 URL:', downloadURL);
        
        // 파일 접근 테스트
        const response = await fetch(downloadURL);
        if (response.ok) {
          console.log('✅ 파일 접근 성공!');
          console.log('📊 파일 크기:', response.headers.get('content-length'), 'bytes');
        } else {
          console.log('❌ 파일 접근 실패:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('❌ 다운로드 URL 가져오기 실패:', error);
      }
    } else {
      console.log('❌ NEWgisung.xlsx 파일이 Firebase Storage에 없습니다!');
      console.log('📤 파일을 업로드해야 합니다.');
    }
    
    return gisungFile ? true : false;
    
  } catch (error) {
    console.error('❌ Firebase Storage 확인 실패:', error);
    return false;
  }
};

// 스크립트 실행
checkFirebaseStorage();

























<<<<<<< HEAD


=======
>>>>>>> ae5decb092edae570c53532171b77e663caa0146








































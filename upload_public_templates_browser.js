// 브라우저에서 실행할 수 있는 public 폴더 템플릿 업로드 스크립트
// 브라우저 개발자 도구 콘솔에서 실행하세요

// 전역 함수로 등록
window.uploadPublicTemplates = async () => {
  try {
    console.log('🚀 public 폴더 템플릿 파일 업로드 시작...');
    
    // Firebase 앱과 스토리지 가져오기
    const { getStorage, ref, uploadBytes, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');
    
    // Firebase 앱 인스턴스 가져오기 (기존 앱이 있다고 가정)
    const app = window.firebaseApp || firebase.app();
    const storage = getStorage(app);
    
    // 1. LONG.xlsx 업로드 (L 롱기성)
    console.log('📤 LONG.xlsx 업로드 중...');
    
    // public 폴더의 파일을 fetch로 가져오기
    const longResponse = await fetch('/LONG.xlsx');
    if (!longResponse.ok) {
      throw new Error('LONG.xlsx 파일을 가져올 수 없습니다.');
    }
    
    const longBlob = await longResponse.blob();
    const longStorageRef = ref(storage, 'templates/LONG.xlsx');
    
    await uploadBytes(longStorageRef, longBlob);
    const longDownloadURL = await getDownloadURL(longStorageRef);
    
    console.log('✅ LONG.xlsx 업로드 완료');
    console.log('📥 다운로드 URL:', longDownloadURL);
    
    // 2. NEW.xlsx 업로드 (N 뉴기성)
    console.log('📤 NEW.xlsx 업로드 중...');
    
    const newResponse = await fetch('/NEW.xlsx');
    if (!newResponse.ok) {
      throw new Error('NEW.xlsx 파일을 가져올 수 없습니다.');
    }
    
    const newBlob = await newResponse.blob();
    const newStorageRef = ref(storage, 'templates/NEW.xlsx');
    
    await uploadBytes(newStorageRef, newBlob);
    const newDownloadURL = await getDownloadURL(newStorageRef);
    
    console.log('✅ NEW.xlsx 업로드 완료');
    console.log('📥 다운로드 URL:', newDownloadURL);
    
    console.log('\n🎉 모든 템플릿 파일 업로드 완료!');
    console.log('📋 업로드된 파일:');
    console.log('- LONG.xlsx (L 롱기성) - 21개 이상 물량');
    console.log('- NEW.xlsx (N 뉴기성) - 20개 이하 물량');
    
    // 템플릿 사용 가이드 출력
    console.log('\n📖 템플릿 사용 가이드:');
    console.log('• 물량 20개 이하: NEW.xlsx (N 표시)');
    console.log('• 물량 21개 이상: LONG.xlsx (L 표시)');
    console.log('• 현장 저장 시 자동으로 templateType이 설정됩니다.');
    
    // 성공 메시지 표시
    alert('🎉 템플릿 파일 업로드가 완료되었습니다!\n\nLONG.xlsx와 NEW.xlsx가 Firebase Storage에 성공적으로 업로드되었습니다.');
    
  } catch (error) {
    console.error('❌ 템플릿 업로드 실패:', error);
    alert(`❌ 템플릿 업로드 실패: ${error.message}`);
  }
};

// 사용법 안내
console.log('📖 사용법:');
console.log('uploadPublicTemplates() 함수를 실행하세요.');
console.log('이 함수는 public 폴더의 LONG.xlsx와 NEW.xlsx를 Firebase Storage에 업로드합니다.');
























<<<<<<< HEAD


=======
>>>>>>> ae5decb092edae570c53532171b77e663caa0146
























































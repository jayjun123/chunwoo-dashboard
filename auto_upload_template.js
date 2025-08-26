// 브라우저 개발자 도구에서 실행할 수 있는 템플릿 자동 업로드 코드
// F12 → Console에서 이 코드를 복사해서 붙여넣고 실행하세요

(async function autoUploadTemplate() {
  try {
    console.log('🚀 로컬 템플릿 자동 업로드 시작...');
    
    // Firebase 관련 모듈들 (이미 로드된 것들 사용)
    const { ref, uploadBytes, getStorage } = window.firebaseStorage || {};
    
    if (!ref || !uploadBytes || !getStorage) {
      throw new Error('Firebase Storage 모듈이 로드되지 않았습니다.');
    }
    
    const storage = getStorage();
    
    // public 폴더에서 템플릿 파일 가져오기
    const response = await fetch('/NEWgisung.xlsx');
    
    if (!response.ok) {
      throw new Error(`템플릿 파일을 찾을 수 없습니다: ${response.status}`);
    }
    
    const templateBuffer = await response.arrayBuffer();
    console.log('📥 템플릿 파일 로드 완료, 크기:', templateBuffer.byteLength, 'bytes');
    
    // Blob으로 변환
    const templateBlob = new Blob([templateBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    console.log('📤 파이어베이스에 템플릿 업로드 중...');
    
    // 파이어베이스에 업로드
    const templateRef = ref(storage, 'templates/NEWgisung.xlsx');
    const snapshot = await uploadBytes(templateRef, templateBlob);
    
    console.log('✅ 템플릿 파일 업로드 완료!');
    console.log('📂 저장 경로:', snapshot.metadata.fullPath);
    console.log('📊 파일 크기:', snapshot.metadata.size, 'bytes');
    
    alert(`✅ 성공! 로컬 템플릿이 파이어베이스에 업로드되었습니다!\n📂 경로: ${snapshot.metadata.fullPath}\n📊 크기: ${snapshot.metadata.size} bytes`);
    
    return {
      success: true,
      message: '로컬 템플릿이 성공적으로 파이어베이스에 업로드되었습니다!',
      path: snapshot.metadata.fullPath,
      size: snapshot.metadata.size
    };
  } catch (error) {
    console.error('❌ 로컬 템플릿 업로드 실패:', error);
    alert(`❌ 업로드 실패: ${error.message}`);
    throw error;
  }
})();
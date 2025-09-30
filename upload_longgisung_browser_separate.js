// 브라우저에서 LONGgisung.xlsx 파일을 별도 파일명으로 업로드하는 스크립트
// F12 → Console에서 이 코드를 복사해서 붙여넣고 실행하세요

(async function uploadLongGisungTemplate() {
  try {
    console.log('🚀 LONGgisung.xlsx 템플릿 업로드 시작...');
    
    // Firebase 관련 모듈들 (이미 로드된 것들 사용)
    const { ref, uploadBytes, getStorage, deleteObject } = window.firebaseStorage || {};
    
    if (!ref || !uploadBytes || !getStorage || !deleteObject) {
      throw new Error('Firebase Storage 모듈이 로드되지 않았습니다.');
    }
    
    const storage = getStorage();
    
    // public 폴더의 LONGgisung.xlsx 파일 가져오기
    const response = await fetch('/LONGgisung.xlsx');
    
    if (!response.ok) {
      throw new Error('LONGgisung.xlsx 파일을 찾을 수 없습니다.');
    }
    
    const templateBuffer = await response.arrayBuffer();
    console.log('📥 LONGgisung.xlsx 파일 로드 완료, 크기:', templateBuffer.byteLength, 'bytes');
    
    // Blob으로 변환
    const templateBlob = new Blob([templateBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    // Firebase Storage 경로 (별도 파일명으로 저장)
    const storagePath = 'templates/LONGgisung.xlsx';
    const templateRef = ref(storage, storagePath);
    
    // 기존 파일 삭제 시도
    try {
      await deleteObject(templateRef);
      console.log('🗑️ 기존 LONGgisung.xlsx 삭제 완료');
    } catch (deleteError) {
      console.log('ℹ️ 기존 LONGgisung.xlsx이 없습니다.');
    }
    
    console.log('📤 LONGgisung.xlsx을 별도 파일명으로 업로드 중...');
    
    // 파이어베이스에 업로드
    const snapshot = await uploadBytes(templateRef, templateBlob);
    
    console.log('✅ LONGgisung.xlsx 템플릿 업로드 완료!');
    console.log('📂 저장 경로:', snapshot.metadata.fullPath);
    console.log('📊 파일 크기:', snapshot.metadata.size, 'bytes');
    console.log('🕒 업로드 시간:', snapshot.metadata.timeCreated);
    
    alert(`✅ 성공! LONGgisung.xlsx 템플릿이 Firebase Storage에 업로드되었습니다!\n📂 경로: ${snapshot.metadata.fullPath}\n📊 크기: ${snapshot.metadata.size} bytes\n📋 이제 물량 데이터가 20개를 초과하면 자동으로 LONGgisung 템플릿을 사용합니다.`);
    
    return {
      success: true,
      message: 'LONGgisung.xlsx 템플릿이 성공적으로 Firebase Storage에 업로드되었습니다!',
      path: snapshot.metadata.fullPath,
      size: snapshot.metadata.size
    };
  } catch (error) {
    console.error('❌ LONGgisung.xlsx 템플릿 업로드 실패:', error);
    alert(`❌ 업로드 실패: ${error.message}`);
    throw error;
  }
})();

























<<<<<<< HEAD


=======
>>>>>>> ae5decb092edae570c53532171b77e663caa0146







































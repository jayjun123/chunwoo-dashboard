// 브라우저 콘솔에서 실행할 수 있는 템플릿 재업로드 스크립트
// F12 → Console에서 이 코드를 복사해서 붙여넣고 실행하세요

(async function reuploadTemplate() {
  try {
    console.log('🔄 기성금 템플릿 재업로드 시작...');
    
    // Firebase 모듈 가져오기
    const { ref, uploadBytes, deleteObject, getStorage } = await import('firebase/storage');
    const { storage } = await import('./src/firebase.js');
    
    const templateRef = ref(storage, 'templates/NEWgisung.xlsx');
    
    // 1. 기존 템플릿 삭제
    try {
      await deleteObject(templateRef);
      console.log('🗑️ 기존 템플릿 삭제 완료');
    } catch (deleteError) {
      console.warn('⚠️ 기존 템플릿 삭제 실패 (무시):', deleteError);
    }
    
    // 2. public 폴더에서 새 템플릿 가져오기
    const response = await fetch('/NEWgisung.xlsx');
    
    if (!response.ok) {
      throw new Error(`템플릿 파일을 찾을 수 없습니다: ${response.status}`);
    }
    
    const templateBuffer = await response.arrayBuffer();
    console.log('📥 템플릿 파일 로드 완료, 크기:', templateBuffer.byteLength, 'bytes');
    
    // 3. Blob으로 변환
    const templateBlob = new Blob([templateBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    // 4. File 객체로 변환
    const templateFile = new File([templateBlob], 'NEWgisung.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    console.log('📤 파이어베이스에 새 템플릿 업로드 중...');
    
    // 5. 파이어베이스에 업로드
    const snapshot = await uploadBytes(templateRef, templateFile);
    
    console.log('✅ 템플릿 재업로드 완료!');
    console.log('📂 저장 경로:', snapshot.metadata.fullPath);
    console.log('📊 파일 크기:', snapshot.metadata.size, 'bytes');
    console.log('🕒 업로드 시간:', snapshot.metadata.timeCreated);
    
    alert(`✅ 성공! 템플릿이 재업로드되었습니다!\n📂 경로: ${snapshot.metadata.fullPath}\n📊 크기: ${snapshot.metadata.size} bytes`);
    
    return {
      success: true,
      path: snapshot.metadata.fullPath,
      size: snapshot.metadata.size,
      timeCreated: snapshot.metadata.timeCreated
    };
    
  } catch (error) {
    console.error('❌ 템플릿 재업로드 실패:', error);
    alert(`❌ 템플릿 재업로드 실패: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
})();

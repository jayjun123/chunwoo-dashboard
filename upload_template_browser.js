// 브라우저에서 실행할 수 있는 템플릿 업로드 스크립트
// 브라우저 콘솔에서 실행하세요

const uploadTemplateToFirebase = async () => {
  try {
    console.log('🚀 NEWgisung.xlsx 템플릿 업로드 시작...');
    
    // Firebase 모듈 동적 import
    const { getStorage, ref, uploadBytes, deleteObject } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');
    
    // Firebase Storage 초기화 (기존 앱 사용)
    const storage = getStorage();
    
    // public 폴더의 NEWgisung.xlsx 파일 가져오기
    const response = await fetch('/NEWgisung.xlsx');
    if (!response.ok) {
      throw new Error('NEWgisung.xlsx 파일을 찾을 수 없습니다.');
    }
    
    const fileBlob = await response.blob();
    console.log('📦 파일 크기:', fileBlob.size, 'bytes');
    
    // Firebase Storage 경로
    const storagePath = 'templates/NEWgisung.xlsx';
    console.log('☁️ Firebase Storage 경로:', storagePath);
    
    // 기존 파일 삭제 (있는 경우)
    const templateRef = ref(storage, storagePath);
    try {
      await deleteObject(templateRef);
      console.log('🗑️ 기존 템플릿 삭제 완료');
    } catch (deleteError) {
      console.warn('⚠️ 기존 템플릿 삭제 실패 (무시):', deleteError);
    }
    
    // 새 파일 업로드
    console.log('📤 새 템플릿 업로드 중...');
    const snapshot = await uploadBytes(templateRef, fileBlob, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    console.log('✅ 템플릿 업로드 완료!');
    console.log('📂 저장 경로:', snapshot.metadata.fullPath);
    console.log('📊 파일 크기:', snapshot.metadata.size, 'bytes');
    console.log('🕒 업로드 시간:', snapshot.metadata.timeCreated);
    
    console.log('🎉 NEWgisung.xlsx 템플릿 Firebase Storage 업로드 완료!');
    
    return true;
    
  } catch (error) {
    console.error('❌ 템플릿 업로드 실패:', error);
    return false;
  }
};

// 스크립트 실행
uploadTemplateToFirebase();

























<<<<<<< HEAD


=======
>>>>>>> ae5decb092edae570c53532171b77e663caa0146



















































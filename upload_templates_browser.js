// 브라우저 콘솔에서 실행할 수 있는 템플릿 업로드 스크립트
// F12 → Console에서 이 코드를 복사해서 붙여넣고 실행하세요

(async function uploadTemplatesToFirebase() {
  try {
    console.log('🚀 Firebase Storage 템플릿 업로드 시작...');
    
    // 현재 페이지에서 Firebase 모듈 가져오기
    const { ref, uploadBytes, deleteObject, getDownloadURL } = await import('firebase/storage');
    const { storage } = await import('./src/firebase.js');
    
    // 업로드할 템플릿 목록
    const templates = [
      { name: 'estimate.xlsx', path: '/견적서.xlsx' },
      { name: 'gisung.xlsx', path: '/NEWgisung.xlsx' }
    ];
    
    console.log('📋 업로드할 템플릿:', templates.map(t => t.name));
    
    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      console.log(`\n📤 ${i + 1}/${templates.length}: ${template.name} 업로드 중...`);
      
      try {
        // 1. 기존 파일 삭제 시도
        try {
          const existingRef = ref(storage, `templates/${template.name}`);
          await deleteObject(existingRef);
          console.log(`🗑️ 기존 ${template.name} 삭제 완료`);
        } catch (deleteError) {
          console.warn(`⚠️ 기존 ${template.name} 삭제 실패 (무시):`, deleteError.message);
        }
        
        // 2. public 폴더에서 파일 가져오기
        const response = await fetch(template.path);
        if (!response.ok) {
          throw new Error(`파일을 찾을 수 없습니다: ${template.path} (${response.status})`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        console.log(`📥 ${template.name} 로드 완료, 크기: ${arrayBuffer.byteLength} bytes`);
        
        // 3. File 객체로 변환
        const file = new File([arrayBuffer], template.name, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        
        // 4. Firebase Storage에 업로드
        const storageRef = ref(storage, `templates/${template.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        console.log(`✅ ${template.name} 업로드 완료`);
        
        // 5. 다운로드 URL 확인
        const downloadURL = await getDownloadURL(storageRef);
        console.log(`🔗 ${template.name} 다운로드 URL:`, downloadURL);
        
      } catch (error) {
        console.error(`❌ ${template.name} 업로드 실패:`, error.message);
        throw error;
      }
    }
    
    console.log('\n🎉 모든 템플릿 업로드 완료!');
    alert('✅ 모든 템플릿이 Firebase Storage에 성공적으로 업로드되었습니다!');
    
  } catch (error) {
    console.error('❌ 템플릿 업로드 실패:', error);
    alert(`❌ 템플릿 업로드 실패: ${error.message}`);
  }
})();

// Firebase Storage 템플릿 파일 확인 스크립트
import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
import { storage } from './src/firebase.js';

const checkFirebaseTemplates = async () => {
  try {
    console.log('🔍 Firebase Storage 템플릿 파일 확인 중...');
    
    const storageRef = getStorage();
    const templatesRef = ref(storageRef, 'templates');
    
    // templates 폴더의 모든 파일 목록 가져오기
    const result = await listAll(templatesRef);
    
    console.log('📁 templates 폴더 파일 목록:');
    result.items.forEach((itemRef) => {
      console.log(`- ${itemRef.name}`);
    });
    
    console.log(`\n📊 총 ${result.items.length}개의 파일 발견`);
    
    // 각 파일의 다운로드 URL 확인
    for (const itemRef of result.items) {
      try {
        const downloadURL = await getDownloadURL(itemRef);
        console.log(`\n📥 ${itemRef.name}:`);
        console.log(`   URL: ${downloadURL}`);
      } catch (error) {
        console.log(`\n❌ ${itemRef.name}: 접근 불가 - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Firebase Storage 확인 실패:', error);
  }
};

// 스크립트 실행
checkFirebaseTemplates();


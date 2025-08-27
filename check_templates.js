// Firebase Storage 템플릿 파일 확인
import { getStorage, ref, listAll, getMetadata } from 'firebase/storage';
import { storage } from './src/firebase.js';

const checkTemplates = async () => {
  try {
    console.log('🔍 Firebase Storage 템플릿 파일 확인 중...');
    
    const templatesRef = ref(storage, 'templates');
    const templatesList = await listAll(templatesRef);
    
    console.log('📁 templates 폴더 내용:');
    templatesList.items.forEach(item => {
      console.log(`- ${item.name}`);
    });
    
    // 각 템플릿 파일의 메타데이터 확인
    for (const item of templatesList.items) {
      try {
        const metadata = await getMetadata(item);
        console.log(`\n📄 ${item.name} 메타데이터:`);
        console.log(`- 크기: ${metadata.size} bytes`);
        console.log(`- 생성일: ${metadata.timeCreated}`);
        console.log(`- 수정일: ${metadata.updated}`);
        console.log(`- 전체 경로: ${metadata.fullPath}`);
      } catch (error) {
        console.error(`❌ ${item.name} 메타데이터 조회 실패:`, error);
      }
    }
    
  } catch (error) {
    console.error('❌ 템플릿 확인 실패:', error);
  }
};

// 전역 함수로 등록
window.checkTemplates = checkTemplates;

console.log('✅ 템플릿 확인 스크립트 로드 완료');
console.log('🚀 브라우저 콘솔에서 다음 명령어를 실행하세요:');
console.log('checkTemplates()');


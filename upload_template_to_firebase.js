// 파이어베이스에 템플릿 업로드 스크립트
import { uploadLocalTemplateToFirebase } from './src/utils/gisungTemplateUtils.js';

async function uploadTemplate() {
  try {
    console.log('🚀 파이어베이스에 템플릿 업로드 시작...');
    
    const result = await uploadLocalTemplateToFirebase();
    
    console.log('✅ 업로드 성공!');
    console.log('📂 경로:', result.path);
    console.log('📊 크기:', result.size, 'bytes');
    console.log('💬 메시지:', result.message);
    
  } catch (error) {
    console.error('❌ 업로드 실패:', error.message);
  }
}

// 스크립트 실행
uploadTemplate();


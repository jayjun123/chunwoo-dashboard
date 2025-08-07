import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import fs from 'fs';
import path from 'path';

// Firebase 설정 (firebase.js에서 가져와야 함)
const firebaseConfig = {
  // 실제 설정은 src/firebase.js에서 가져와야 함
  // 여기서는 환경변수 또는 설정 파일에서 로드
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function uploadTemplateToFirebase() {
  try {
    console.log('🚀 로컬 템플릿 자동 업로드 시작...');
    
    // public 폴더의 템플릿 파일 경로
    const templatePath = path.join(process.cwd(), 'public', 'gisung.xlsx');
    
    // 파일 존재 확인
    if (!fs.existsSync(templatePath)) {
      throw new Error(`템플릿 파일을 찾을 수 없습니다: ${templatePath}`);
    }
    
    // 파일 읽기
    const templateBuffer = fs.readFileSync(templatePath);
    console.log('📥 템플릿 파일 로드 완료, 크기:', templateBuffer.length, 'bytes');
    
    // 파이어베이스에 업로드
    const templateRef = ref(storage, 'templates/gisung.xlsx');
    const snapshot = await uploadBytes(templateRef, templateBuffer);
    
    console.log('✅ 템플릿 파일 업로드 완료!');
    console.log('📂 저장 경로:', snapshot.metadata.fullPath);
    console.log('📊 파일 크기:', snapshot.metadata.size, 'bytes');
    
    return {
      success: true,
      message: '로컬 템플릿이 성공적으로 파이어베이스에 업로드되었습니다!',
      path: snapshot.metadata.fullPath,
      size: snapshot.metadata.size
    };
  } catch (error) {
    console.error('❌ 로컬 템플릿 업로드 실패:', error);
    throw error;
  }
}

// 스크립트 실행
uploadTemplateToFirebase()
  .then(result => {
    console.log('🎉 업로드 성공:', result.message);
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 업로드 실패:', error.message);
    process.exit(1);
  });
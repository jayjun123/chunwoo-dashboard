import { ref, uploadBytes } from 'firebase/storage';
import { storage } from './src/firebase.js';
import fs from 'fs';

async function uploadTemplate() {
  try {
    console.log('📤 템플릿 업로드 시작...');
    
    // 로컬 파일 읽기
    const fileBuffer = fs.readFileSync('./public/gisung.xlsx');
    
    // Firebase Storage에 업로드
    const templateRef = ref(storage, 'templates/gisung.xlsx');
    await uploadBytes(templateRef, fileBuffer);
    
    console.log('✅ 템플릿 업로드 완료');
  } catch (error) {
    console.error('❌ 템플릿 업로드 실패:', error);
  }
}

uploadTemplate(); 
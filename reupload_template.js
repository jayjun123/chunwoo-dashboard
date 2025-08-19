import { initializeApp } from 'firebase/app';
import { getStorage, ref, deleteObject, uploadBytes } from 'firebase/storage';
import fs from 'fs';
import path from 'path';

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyATCGXGD2_teiJFdpng9J2_fvZRItPef0w",
  authDomain: "chunwooo-edf9f.firebaseapp.com",
  projectId: "chunwooo-edf9f",
  storageBucket: "chunwooo-edf9f.firebasestorage.app",
  messagingSenderId: "417029078660",
  appId: "1:417029078660:web:00e23d79af77876e598cd1",
  measurementId: "G-653CL9XWFH"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function reuploadTemplate() {
  try {
    console.log('🗑️ 기존 템플릿 삭제 시작...');
    
    // 1. 기존 템플릿 삭제
    try {
      const templateRef = ref(storage, 'templates/NEWgisung.xlsx');
      await deleteObject(templateRef);
      console.log('✅ 기존 NEWgisung.xlsx 템플릿 삭제 완료!');
    } catch (error) {
      if (error.code === 'storage/object-not-found') {
        console.log('ℹ️ 삭제할 템플릿이 없습니다.');
      } else {
        console.error('❌ 템플릿 삭제 실패:', error);
        return;
      }
    }
    
    // 2. 로컬 파일 확인
    const templatePath = path.join(process.cwd(), 'public', 'NEWgisung.xlsx');
    console.log('📁 로컬 템플릿 경로:', templatePath);
    
    if (!fs.existsSync(templatePath)) {
      console.error('❌ public 폴더에 NEWgisung.xlsx 파일이 없습니다.');
      return;
    }
    
    const stats = fs.statSync(templatePath);
    console.log('📊 로컬 템플릿 파일 크기:', stats.size, 'bytes');
    
    if (stats.size < 1000) {
      console.error('❌ 로컬 템플릿 파일이 너무 작습니다.');
      return;
    }
    
    // 3. 새로 업로드
    console.log('📤 파이어베이스에 새 템플릿 업로드 중...');
    
    const fileBuffer = fs.readFileSync(templatePath);
    const templateRef = ref(storage, 'templates/NEWgisung.xlsx');
    
    const snapshot = await uploadBytes(templateRef, fileBuffer);
    
    console.log('✅ 새 템플릿 업로드 완료!');
    console.log('📂 저장 경로:', snapshot.metadata.fullPath);
    console.log('📊 파일 크기:', snapshot.metadata.size, 'bytes');
    console.log('🕒 업로드 시간:', snapshot.metadata.timeCreated);
    
  } catch (error) {
    console.error('❌ 템플릿 재업로드 실패:', error);
  }
}

// 스크립트 실행
reuploadTemplate();

// 로컬 LONGgisung.xlsx 파일을 Firebase Storage에 업로드
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, deleteObject } from 'firebase/storage';
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

async function uploadLongGisungTemplate() {
  try {
    console.log('🚀 LONGgisung.xlsx 파일 업로드 시작...');
    
    // 로컬 파일 경로
    const localFilePath = path.join(process.cwd(), 'public', 'LONGgisung.xlsx');
    
    // 파일 존재 확인
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`파일을 찾을 수 없습니다: ${localFilePath}`);
    }
    
    console.log('📁 로컬 파일 경로:', localFilePath);
    
    // 파일 읽기
    const fileBuffer = fs.readFileSync(localFilePath);
    console.log('📊 파일 크기:', fileBuffer.length, 'bytes');
    
    // 기존 파일 삭제 (있는 경우)
    try {
      const existingRef = ref(storage, 'templates/NEWgisung.xlsx');
      await deleteObject(existingRef);
      console.log('🗑️ 기존 NEWgisung.xlsx 삭제 완료');
    } catch (deleteError) {
      console.log('ℹ️ 기존 NEWgisung.xlsx이 없습니다.');
    }
    
    // Firebase Storage에 업로드
    console.log('📤 Firebase Storage에 업로드 중...');
    
    const templateRef = ref(storage, 'templates/NEWgisung.xlsx');
    const snapshot = await uploadBytes(templateRef, fileBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    console.log('✅ 업로드 완료!');
    console.log('📂 저장 경로:', snapshot.metadata.fullPath);
    console.log('📊 업로드된 파일 크기:', snapshot.metadata.size, 'bytes');
    
    console.log('\n🎉 LONGgisung.xlsx을 NEWgisung.xlsx로 업로드 완료!');
    
  } catch (error) {
    console.error('❌ 파일 업로드 실패:', error);
  }
}

// 스크립트 실행
uploadLongGisungTemplate();

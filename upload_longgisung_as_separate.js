// LONGgisung.xlsx 파일을 Firebase Storage에 별도 파일명으로 업로드하는 스크립트
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
    console.log('🚀 LONGgisung.xlsx 템플릿 업로드 시작...');
    
    // 로컬 파일 경로
    const localFilePath = path.join(process.cwd(), 'public', 'LONGgisung.xlsx');
    
    // 파일 존재 확인
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`LONGgisung.xlsx 파일을 찾을 수 없습니다: ${localFilePath}`);
    }
    
    console.log('📁 로컬 파일 읽는 중...');
    const fileBuffer = fs.readFileSync(localFilePath);
    console.log('📊 파일 크기:', fileBuffer.length, 'bytes');
    
    // Firebase Storage 경로 (별도 파일명으로 저장)
    const storagePath = 'templates/LONGgisung.xlsx';
    const templateRef = ref(storage, storagePath);
    
    // 기존 파일 삭제 시도
    try {
      await deleteObject(templateRef);
      console.log('🗑️ 기존 LONGgisung.xlsx 삭제 완료');
    } catch (deleteError) {
      console.log('ℹ️ 기존 LONGgisung.xlsx이 없습니다.');
    }
    
    // 새 파일 업로드
    console.log('📤 Firebase Storage에 업로드 중...');
    const snapshot = await uploadBytes(templateRef, fileBuffer);
    
    console.log('✅ LONGgisung.xlsx 템플릿 업로드 완료!');
    console.log('📂 저장 경로:', snapshot.metadata.fullPath);
    console.log('📊 파일 크기:', snapshot.metadata.size, 'bytes');
    console.log('🕒 업로드 시간:', snapshot.metadata.timeCreated);
    
    console.log('\n🎉 LONGgisung.xlsx 템플릿 Firebase Storage 업로드 완료!');
    console.log('📋 이제 물량 데이터가 20개를 초과하면 자동으로 LONGgisung 템플릿을 사용합니다.');
    
  } catch (error) {
    console.error('❌ LONGgisung.xlsx 템플릿 업로드 실패:', error);
    process.exit(1);
  }
}

uploadLongGisungTemplate();




















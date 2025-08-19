// NEWgisung.xlsx 파일을 Firebase Storage에 업로드하는 스크립트
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

async function uploadNewGisungTemplate() {
  try {
    console.log('🚀 NEWgisung.xlsx 템플릿 업로드 시작...');
    
    // 파일 경로
    const filePath = 'D:\\MyProject\\MyProject\\public\\NEWgisung.xlsx';
    
    // 파일 존재 확인
    if (!fs.existsSync(filePath)) {
      throw new Error(`템플릿 파일을 찾을 수 없습니다: ${filePath}`);
    }
    
    console.log('📁 파일 경로:', filePath);
    
    // 파일 읽기
    const fileBuffer = fs.readFileSync(filePath);
    console.log('📦 파일 크기:', fileBuffer.length, 'bytes');
    
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
    const snapshot = await uploadBytes(templateRef, fileBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    console.log('✅ 템플릿 업로드 완료!');
    console.log('📂 저장 경로:', snapshot.metadata.fullPath);
    console.log('📊 파일 크기:', snapshot.metadata.size, 'bytes');
    console.log('🕒 업로드 시간:', snapshot.metadata.timeCreated);
    
    console.log('🎉 NEWgisung.xlsx 템플릿 Firebase Storage 업로드 완료!');
    
  } catch (error) {
    console.error('❌ 템플릿 업로드 실패:', error);
    process.exit(1);
  }
}

// 스크립트 실행
uploadNewGisungTemplate();

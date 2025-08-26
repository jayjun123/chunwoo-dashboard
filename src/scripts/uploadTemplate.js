/**
 * 파이어베이스 Storage에 기성금 템플릿 파일 업로드 스크립트
 * 
 * 사용법:
 * 1. gisung.xlsx 파일을 프로젝트 루트에 위치시킵니다
 * 2. 이 스크립트를 실행합니다: node src/scripts/uploadTemplate.js
 */

import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { readFileSync } from 'fs';
import { join } from 'path';

// Firebase 설정 (firebase.js와 동일한 설정 사용)
const firebaseConfig = {
  apiKey: "AIzaSyATCGXGD2_teiJFdpng9J2_fvZRItPef0w",
  authDomain: "chunwooo-edf9f.firebaseapp.com",
  projectId: "chunwooo-edf9f",
  storageBucket: "chunwooo-edf9f.firebasestorage.app",
  messagingSenderId: "417029078660",
  appId: "1:417029078660:web:00e23d79af77876e598cd1",
  measurementId: "G-653CL9XWFH"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function uploadTemplate() {
  try {
    console.log('🚀 템플릿 파일 업로드를 시작합니다...');
    
    // 템플릿 파일 경로
    const templatePath = join(process.cwd(), 'gisung.xlsx');
    
    // 파일 읽기
    console.log('📁 템플릿 파일을 읽는 중...');
    const fileBuffer = readFileSync(templatePath);
    
    // 파이어베이스 Storage에 업로드
    console.log('☁️ 파이어베이스 Storage에 업로드 중...');
    const templateRef = ref(storage, 'templates/NEWgisung.xlsx');
    const snapshot = await uploadBytes(templateRef, fileBuffer);
    
    console.log('✅ 템플릿 파일 업로드 완료!');
    console.log('📂 저장 경로:', snapshot.metadata.fullPath);
    console.log('📊 파일 크기:', snapshot.metadata.size, 'bytes');
    console.log('🕒 업로드 시간:', snapshot.metadata.timeCreated);
    
  } catch (error) {
    console.error('❌ 템플릿 파일 업로드 실패:', error);
    process.exit(1);
  }
}

// 스크립트 실행
uploadTemplate(); 
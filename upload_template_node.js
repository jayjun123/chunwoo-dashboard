// Node.js 환경용 파이어베이스 템플릿 업로드 스크립트
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import fs from 'fs';

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

async function uploadTemplate() {
  try {
    console.log('📤 템플릿 업로드 시작...');
    
    // 기성금 템플릿 업로드
    console.log('📊 기성금 템플릿 업로드 중...');
    const gisungBuffer = fs.readFileSync('./public/gisung.xlsx');
    const gisungRef = ref(storage, 'templates/gisung.xlsx');
    const gisungSnapshot = await uploadBytes(gisungRef, gisungBuffer);
    console.log('✅ 기성금 템플릿 업로드 완료');
    console.log('📊 업로드된 파일 크기:', gisungSnapshot.metadata.size, 'bytes');
    
    // 납품계약서 템플릿 업로드 (올바른 파일명으로)
    console.log('📋 납품계약서 템플릿 업로드 중...');
    const contractBuffer = fs.readFileSync('./public/(납품계약서).xlsx');
    const contractRef = ref(storage, 'templates/(납품계약서).xlsx');
    const contractSnapshot = await uploadBytes(contractRef, contractBuffer);
    console.log('✅ 납품계약서 템플릿 업로드 완료');
    console.log('📊 업로드된 파일 크기:', contractSnapshot.metadata.size, 'bytes');
    
    console.log('🎉 모든 템플릿 업로드 완료!');
  } catch (error) {
    console.error('❌ 템플릿 업로드 실패:', error);
  }
}

uploadTemplate();


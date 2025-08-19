// Node.js 환경용 견적서 템플릿 업로드 스크립트
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

async function uploadEstimateTemplate() {
  try {
    console.log('📤 견적서 템플릿 업로드 시작...');
    
    // 견적서 템플릿 업로드
    console.log('📊 견적서 템플릿 업로드 중...');
    const estimateBuffer = fs.readFileSync('./public/견적서.xlsx');
    const estimateRef = ref(storage, 'templates/견적서.xlsx');
    const estimateSnapshot = await uploadBytes(estimateRef, estimateBuffer);
    console.log('✅ 견적서 템플릿 업로드 완료');
    console.log('📊 업로드된 파일 크기:', estimateSnapshot.metadata.size, 'bytes');
    
    console.log('🎉 견적서 템플릿 업로드 완료!');
  } catch (error) {
    console.error('❌ 견적서 템플릿 업로드 실패:', error);
  }
}

uploadEstimateTemplate();

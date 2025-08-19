// 기존 견적서 템플릿을 그대로 복사 (공유 수식 문제 해결)
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import fs from 'fs';

const firebaseConfig = {
  apiKey: "AIzaSyATCGXGD2_teiJFdpng9J2_fvZRItPef0w",
  authDomain: "chunwooo-edf9f.firebaseapp.com",
  projectId: "chunwooo-edf9f",
  storageBucket: "chunwooo-edf9f.firebasestorage.app",
  messagingSenderId: "417029078660",
  appId: "1:417029078660:web:00e23d79af77876e598cd1",
  measurementId: "G-653CL9XWFH"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function copyEstimateTemplate() {
  try {
    console.log('📋 견적서 템플릿 복사 시작...');
    
    // 기존 템플릿을 그대로 읽기
    const templateBuffer = fs.readFileSync('./public/견적서.xlsx');
    console.log('📥 기존 템플릿 읽기 완료:', templateBuffer.length, 'bytes');
    
    // 파이어베이스에 업로드 (기존 파일 덮어쓰기)
    const templateRef = ref(storage, 'templates/견적서.xlsx');
    await uploadBytes(templateRef, templateBuffer);
    console.log('✅ 견적서 템플릿 업로드 완료');
    
    console.log('🎉 견적서 템플릿 복사 완료!');
    
  } catch (error) {
    console.error('❌ 견적서 템플릿 복사 실패:', error);
  }
}

copyEstimateTemplate();

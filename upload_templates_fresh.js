// 퍼블릭 폴더의 템플릿들을 Firebase로 업로드
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

async function uploadTemplatesFresh() {
  try {
    console.log('📤 템플릿 업로드 시작...');
    
    // 견적서 템플릿 업로드
    console.log('📋 견적서 템플릿 업로드 중...');
    const estimateBuffer = fs.readFileSync('./public/견적서.xlsx');
    const estimateRef = ref(storage, 'templates/견적서.xlsx');
    const estimateSnapshot = await uploadBytes(estimateRef, estimateBuffer);
    console.log('✅ 견적서 템플릿 업로드 완료');
    console.log('📊 업로드된 파일 크기:', estimateSnapshot.metadata.size, 'bytes');
    
    // 납품계약서 템플릿 업로드
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

uploadTemplatesFresh();

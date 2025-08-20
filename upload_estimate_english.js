// 견적서를 estimate.xlsx로 Firebase Storage에 업로드하는 스크립트
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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

async function uploadEstimateEnglish() {
  try {
    console.log('📤 견적서 템플릿 Firebase Storage 업로드 시작...');
    
    // 파일 경로
    const filePath = path.join(process.cwd(), 'public', '견적서.xlsx');
    
    // 파일 존재 확인
    if (!fs.existsSync(filePath)) {
      console.error('❌ 파일을 찾을 수 없습니다:', filePath);
      return;
    }
    
    // 파일 읽기
    const fileBuffer = fs.readFileSync(filePath);
    console.log('📁 파일 경로:', filePath);
    console.log('📦 파일 크기:', fileBuffer.length, 'bytes');
    
    // Firebase Storage 경로 (영어 이름으로)
    const storagePath = 'templates/estimate.xlsx';
    console.log('☁️ Firebase Storage 경로:', storagePath);
    
    // 파일 업로드
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, fileBuffer);
    console.log('📤 업로드 완료:', snapshot.metadata.name);
    
    // 다운로드 URL 가져오기
    const downloadURL = await getDownloadURL(storageRef);
    console.log('🔗 다운로드 URL:', downloadURL);
    
    console.log('🎉 견적서 템플릿 Firebase Storage 업로드 완료!');
    console.log('📋 사용할 URL:', downloadURL);
    
  } catch (error) {
    console.error('❌ 업로드 실패:', error);
  }
}

uploadEstimateEnglish();

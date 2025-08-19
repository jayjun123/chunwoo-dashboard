import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import fs from 'fs';
import path from 'path';

// Firebase 설정 (실제 프로젝트 설정)
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

// 인감 이미지 파일 목록
const stampImages = [
  'A.png',
  '네모.png',
  '동.png',
  '별.png',
  '삼각.png',
  '스페이드.png',
  '클로버.png',
  '하트.png',
  '11.png'
];

async function uploadStampImages() {
  console.log('🖊️ 인감 이미지 Firebase Storage 업로드 시작...');
  
  for (const imageName of stampImages) {
    try {
      const imagePath = path.join(process.cwd(), 'public', imageName);
      
      // 파일 존재 확인
      if (!fs.existsSync(imagePath)) {
        console.warn(`⚠️ 파일이 존재하지 않습니다: ${imageName}`);
        continue;
      }
      
      console.log(`📤 ${imageName} 업로드 중...`);
      
      // 파일 읽기
      const imageBuffer = fs.readFileSync(imagePath);
      
      // Firebase Storage에 업로드
      const stampsRef = ref(storage, `stamps/${imageName}`);
      await uploadBytes(stampsRef, imageBuffer);
      
      // 업로드 URL 확인
      const downloadURL = await getDownloadURL(stampsRef);
      console.log(`✅ ${imageName} 업로드 완료: ${downloadURL}`);
      
    } catch (error) {
      console.error(`❌ ${imageName} 업로드 실패:`, error.message);
    }
  }
  
  console.log('🎉 인감 이미지 업로드 완료!');
}

// 스크립트 실행
uploadStampImages().catch(console.error);

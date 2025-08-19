// NEWgisung.xlsx 템플릿을 Firebase Storage에 업로드하는 스크립트
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import fs from 'fs';
import path from 'path';

// Firebase 설정 (실제 설정)
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

async function uploadGisungTemplate() {
  try {
    console.log('📤 NEWgisung.xlsx 템플릿 업로드 시작...');
    
    // 파일 경로
    const filePath = path.join(process.cwd(), 'public', 'NEWgisung.xlsx');
    
    // 파일 존재 확인
    if (!fs.existsSync(filePath)) {
      throw new Error('NEWgisung.xlsx 파일을 찾을 수 없습니다.');
    }
    
    console.log('📁 파일 경로:', filePath);
    
    // 파일 읽기
    const fileBuffer = fs.readFileSync(filePath);
    console.log('📄 파일 크기:', fileBuffer.length, 'bytes');
    
    // Firebase Storage에 업로드
    const storageRef = ref(storage, 'templates/NEWgisung.xlsx');
    const snapshot = await uploadBytes(storageRef, fileBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    console.log('✅ 파일 업로드 완료:', snapshot.metadata.name);
    
    // 다운로드 URL 가져오기
    const downloadURL = await getDownloadURL(storageRef);
    console.log('🔗 다운로드 URL:', downloadURL);
    
    console.log('✅ NEWgisung.xlsx 템플릿 업로드 완료!');
    
  } catch (error) {
    console.error('❌ 템플릿 업로드 실패:', error);
    process.exit(1);
  }
}

// 스크립트 실행
uploadGisungTemplate();

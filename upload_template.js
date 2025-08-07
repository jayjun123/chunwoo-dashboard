import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase 설정 (firebase.js에서 가져온 설정)
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
    
    // public 폴더의 gisung.xlsx 파일 경로
    const templatePath = path.join(__dirname, 'public', 'gisung.xlsx');
    
    // 파일 존재 확인
    if (!fs.existsSync(templatePath)) {
      throw new Error('템플릿 파일을 찾을 수 없습니다: ' + templatePath);
    }
    
    console.log('📁 템플릿 파일 경로:', templatePath);
    
    // 파일 읽기
    const fileBuffer = fs.readFileSync(templatePath);
    console.log('📊 파일 크기:', fileBuffer.length, 'bytes');
    
    // Firebase Storage에 업로드
    const storageRef = ref(storage, 'templates/gisung.xlsx');
    
    console.log('📤 Firebase Storage에 업로드 중...');
    const snapshot = await uploadBytes(storageRef, fileBuffer);
    
    console.log('✅ 업로드 완료!');
    console.log('📊 업로드된 파일 크기:', snapshot.metadata.size, 'bytes');
    
    // 다운로드 URL 확인
    const downloadURL = await getDownloadURL(storageRef);
    console.log('🔗 다운로드 URL:', downloadURL);
    
    console.log('🎉 템플릿 업로드가 성공적으로 완료되었습니다!');
    
  } catch (error) {
    console.error('❌ 템플릿 업로드 실패:', error);
    process.exit(1);
  }
}

// 스크립트 실행
uploadTemplate(); 
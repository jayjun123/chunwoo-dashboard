import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

async function uploadGisungTemplate() {
  try {
    console.log('📤 기성금 청구서 양식 업로드 시작...');
    
    // 템플릿 파일 경로
    const templatePath = join(__dirname, 'public', 'NEWgisung.xlsx');
    
    // 파일 읽기
    const fileBuffer = readFileSync(templatePath);
    console.log('✅ 파일 읽기 완료:', templatePath);
    
    // Firebase Storage에 업로드
    const storageRef = ref(storage, 'templates/NEWgisung.xlsx');
    const snapshot = await uploadBytes(storageRef, fileBuffer);
    console.log('✅ 파일 업로드 완료');
    
    // 다운로드 URL 가져오기
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('✅ 다운로드 URL 생성 완료');
    
    // 토큰 추출
    const url = new URL(downloadURL);
    const token = url.searchParams.get('token');
    
    console.log('🎉 기성금 청구서 양식 업로드 성공!');
    console.log('📥 다운로드 URL:', downloadURL);
    console.log('🔑 토큰:', token);
    
    return { success: true, url: downloadURL, token };
    
  } catch (error) {
    console.error('❌ 기성금 청구서 양식 업로드 실패:', error);
    return { success: false, error: error.message };
  }
}

// 스크립트 실행
uploadGisungTemplate().then(result => {
  if (result.success) {
    console.log('✅ 업로드 완료!');
    process.exit(0);
  } else {
    console.error('❌ 업로드 실패!');
    process.exit(1);
  }
});

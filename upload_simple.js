import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// 템플릿 파일 목록
const templates = [
  'NEWgisung.xlsx',
  '견적서.xlsx', 
  '납품계약서 갑지.xlsx'
];

async function uploadTemplates() {
  console.log('🚀 템플릿 업로드 시작...');
  
  for (const templateName of templates) {
    try {
      console.log(`📤 ${templateName} 업로드 중...`);
      
      // public 폴더에서 파일 읽기
      const filePath = path.join(__dirname, 'public', templateName);
      const fileBuffer = fs.readFileSync(filePath);
      
      // Firebase Storage에 업로드
      const storageRef = ref(storage, `templates/${templateName}`);
      await uploadBytes(storageRef, fileBuffer);
      
      // 다운로드 URL 가져오기
      const downloadURL = await getDownloadURL(storageRef);
      console.log(`✅ ${templateName} 완료: ${downloadURL}`);
      
    } catch (error) {
      console.error(`❌ ${templateName} 실패:`, error.message);
    }
  }
  
  console.log('🎉 모든 템플릿 업로드 완료!');
}

uploadTemplates().catch(console.error);

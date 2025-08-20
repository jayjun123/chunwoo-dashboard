import { initializeApp } from 'firebase/app';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';

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

// 템플릿 파일 목록
const templates = [
  'NEWgisung.xlsx',
  '견적서.xlsx', 
  '납품계약서 갑지.xlsx'
];

async function testTemplates() {
  console.log('🔍 Firebase Storage 템플릿 확인 중...');
  
  for (const templateName of templates) {
    try {
      console.log(`📋 ${templateName} 확인 중...`);
      
      const storageRef = ref(storage, `templates/${templateName}`);
      const downloadURL = await getDownloadURL(storageRef);
      
      console.log(`✅ ${templateName} 확인 완료: ${downloadURL}`);
      
    } catch (error) {
      console.error(`❌ ${templateName} 확인 실패:`, error.message);
    }
  }
  
  console.log('🎉 템플릿 확인 완료!');
}

testTemplates().catch(console.error);


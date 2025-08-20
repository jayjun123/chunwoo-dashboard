// Firebase Storage에 업로드된 파일들 확인
import { initializeApp } from 'firebase/app';
import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';

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

const checkStorageFiles = async () => {
  try {
    console.log('🔍 Firebase Storage 파일 목록 확인 중...');
    
    // templates 폴더의 모든 파일 확인
    const templatesRef = ref(storage, 'templates');
    const result = await listAll(templatesRef);
    
    console.log('\n📁 templates 폴더에 있는 파일들:');
    for (const item of result.items) {
      console.log(`- ${item.name}`);
      
      try {
        const downloadURL = await getDownloadURL(item);
        console.log(`  ✅ 다운로드 URL: ${downloadURL}`);
        
        // URL에서 토큰 추출
        const tokenMatch = downloadURL.match(/token=([^&]+)/);
        if (tokenMatch) {
          console.log(`  🔑 토큰: ${tokenMatch[1]}`);
        }
        
      } catch (error) {
        console.log(`  ❌ 다운로드 URL 가져오기 실패: ${error.message}`);
      }
    }
    
    console.log('\n🎉 파일 목록 확인 완료!');
    
  } catch (error) {
    console.error('❌ 파일 목록 확인 실패:', error);
  }
};

// 스크립트 실행
checkStorageFiles();

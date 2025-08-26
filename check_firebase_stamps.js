// Firebase Storage 인감 이미지 확인
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

async function checkFirebaseStamps() {
  try {
    console.log('🔍 Firebase Storage 인감 이미지 확인...');
    
    // stamps 폴더의 모든 파일 목록 가져오기
    const stampsRef = ref(storage, 'stamps');
    const result = await listAll(stampsRef);
    
    console.log('\n📋 Firebase Storage에 업로드된 인감 이미지들:');
    console.log('='.repeat(50));
    
    for (const item of result.items) {
      const downloadURL = await getDownloadURL(item);
      console.log(`📁 ${item.name}: ${downloadURL}`);
    }
    
    console.log(`\n✅ 총 ${result.items.length}개의 인감 이미지 발견`);
    
  } catch (error) {
    console.error('❌ 확인 실패:', error);
  }
}

// 스크립트 실행
checkFirebaseStamps();

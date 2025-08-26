import { initializeApp } from 'firebase/app';
import { getStorage, ref, deleteObject } from 'firebase/storage';

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

async function deleteOldTemplate() {
  try {
    console.log('🗑️ 파이어베이스에서 gisung.xlsx 파일 삭제 시작...');
    
    // NEWgisung.xlsx 파일 참조
    const oldTemplateRef = ref(storage, 'templates/NEWgisung.xlsx');
    
    // 파일 삭제
    await deleteObject(oldTemplateRef);
    
    console.log('✅ gisung.xlsx 파일 삭제 완료!');
    console.log('📂 삭제된 경로: templates/NEWgisung.xlsx');
    
  } catch (error) {
    if (error.code === 'storage/object-not-found') {
      console.log('ℹ️ gisung.xlsx 파일이 이미 존재하지 않습니다.');
    } else {
      console.error('❌ 파일 삭제 실패:', error);
    }
  }
}

// 스크립트 실행
deleteOldTemplate();

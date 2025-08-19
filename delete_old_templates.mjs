import { initializeApp } from 'firebase/app';
import { getStorage, ref, listAll, deleteObject } from 'firebase/storage';

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

async function deleteOldTemplates() {
  try {
    console.log('🗑️ 예전 템플릿 삭제 시작...');
    
    // templates 폴더의 모든 파일 목록 가져오기
    const templatesRef = ref(storage, 'templates');
    const result = await listAll(templatesRef);
    
    console.log('📁 templates 폴더 파일 목록:');
    result.items.forEach(item => {
      console.log(`  - ${item.name}`);
    });
    
    // gisung.xlsx 파일만 삭제
    const filesToDelete = result.items.filter(item => item.name === 'gisung.xlsx');
    
    if (filesToDelete.length === 0) {
      console.log('✅ 삭제할 파일이 없습니다. (gisung.xlsx 파일이 없음)');
      return;
    }
    
    if (filesToDelete.length === 0) {
      console.log('✅ 삭제할 파일이 없습니다.');
      return;
    }
    
    console.log(`🗑️ 삭제할 파일들 (${filesToDelete.length}개):`);
    filesToDelete.forEach(item => {
      console.log(`  - ${item.name}`);
    });
    
    // 파일들 삭제
    const deletePromises = filesToDelete.map(item => deleteObject(item));
    await Promise.all(deletePromises);
    
    console.log('✅ 예전 템플릿 삭제 완료!');
    
    // 삭제 후 남은 파일 확인
    const remainingResult = await listAll(templatesRef);
    console.log('📁 삭제 후 남은 파일들:');
    remainingResult.items.forEach(item => {
      console.log(`  - ${item.name}`);
    });
    
  } catch (error) {
    console.error('❌ 예전 템플릿 삭제 실패:', error);
  }
}

// 스크립트 실행
deleteOldTemplates().then(() => {
  console.log('✅ 작업 완료!');
  process.exit(0);
}).catch(error => {
  console.error('❌ 작업 실패!', error);
  process.exit(1);
});

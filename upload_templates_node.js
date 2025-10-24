// Node.js 환경에서 실행할 수 있는 템플릿 업로드 스크립트
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeApp } from 'firebase/app';
import fs from 'fs';
import path from 'path';

// Firebase 설정 (하드코딩)
const firebaseConfig = {
  apiKey: "AIzaSyATCGXGD2_teiJFdpng9J2_fvZRItPef0w",
  authDomain: "chunwooo-edf9f.firebaseapp.com",
  projectId: "chunwooo-edf9f",
  storageBucket: "chunwooo-edf9f.firebasestorage.app",
  messagingSenderId: "417029078660",
  appId: "1:417029078660:web:00e23d79af77876e598cd1",
  measurementId: "G-653CL9XWFH"
};

const uploadTemplatesNode = async () => {
  try {
    console.log('🚀 템플릿 파일 Node.js 업로드 시작...');
    
    // Firebase 앱 초기화
    const app = initializeApp(firebaseConfig);
    const storage = getStorage(app);
    
    // 1. LONG.xlsx 업로드 (L 롱기성)
    console.log('📤 LONG.xlsx 업로드 중...');
    const longFilePath = path.join(process.cwd(), 'public', 'LONG.xlsx');
    
    if (!fs.existsSync(longFilePath)) {
      throw new Error('LONG.xlsx 파일을 찾을 수 없습니다. public 폴더를 확인해주세요.');
    }
    
    const longFileBuffer = fs.readFileSync(longFilePath);
    const longStorageRef = ref(storage, 'templates/LONG.xlsx');
    
    await uploadBytes(longStorageRef, longFileBuffer);
    const longDownloadURL = await getDownloadURL(longStorageRef);
    
    console.log('✅ LONG.xlsx 업로드 완료');
    console.log('📥 다운로드 URL:', longDownloadURL);
    
    // 2. NEW.xlsx 업로드 (N 뉴기성)
    console.log('📤 NEW.xlsx 업로드 중...');
    const newFilePath = path.join(process.cwd(), 'public', 'NEW.xlsx');
    
    if (!fs.existsSync(newFilePath)) {
      throw new Error('NEW.xlsx 파일을 찾을 수 없습니다. public 폴더를 확인해주세요.');
    }
    
    const newFileBuffer = fs.readFileSync(newFilePath);
    const newStorageRef = ref(storage, 'templates/NEW.xlsx');
    
    await uploadBytes(newStorageRef, newFileBuffer);
    const newDownloadURL = await getDownloadURL(newStorageRef);
    
    console.log('✅ NEW.xlsx 업로드 완료');
    console.log('📥 다운로드 URL:', newDownloadURL);
    
    console.log('\n🎉 모든 템플릿 파일 업로드 완료!');
    console.log('📋 업로드된 파일:');
    console.log('- LONG.xlsx (L 롱기성) - 21개 이상 물량');
    console.log('- NEW.xlsx (N 뉴기성) - 20개 이하 물량');
    
    // 템플릿 사용 가이드 출력
    console.log('\n📖 템플릿 사용 가이드:');
    console.log('• 물량 20개 이하: NEW.xlsx (N 표시)');
    console.log('• 물량 21개 이상: LONG.xlsx (L 표시)');
    console.log('• 현장 저장 시 자동으로 templateType이 설정됩니다.');
    
    // 성공 메시지
    console.log('\n🎯 이제 기성금청구서 생성이 정상적으로 작동할 것입니다!');
    
  } catch (error) {
    console.error('❌ 템플릿 업로드 실패:', error);
    throw error;
  }
};

// 즉시 실행
uploadTemplatesNode()
  .then(() => {
    console.log('🎯 스크립트 실행 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 스크립트 실행 실패:', error);
    process.exit(1);
  });
























<<<<<<< HEAD


=======
>>>>>>> ae5decb092edae570c53532171b77e663caa0146











































































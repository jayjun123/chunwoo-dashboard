const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const fs = require('fs');
const path = require('path');

// Firebase 설정 (src/firebase.js와 동일)
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

async function uploadNapfoomTemplate() {
  try {
    console.log('📤 NAPFOOM 템플릿 Firebase Storage 업로드 시작...');
    
    // 파일 경로
    const templatePath = path.join(__dirname, 'public', 'NAPFOOM.xlsx');
    
    // 파일 존재 확인
    if (!fs.existsSync(templatePath)) {
      throw new Error(`템플릿 파일을 찾을 수 없습니다: ${templatePath}`);
    }
    
    console.log('📁 파일 경로:', templatePath);
    
    // 파일 읽기
    const fileBuffer = fs.readFileSync(templatePath);
    console.log('📦 파일 크기:', fileBuffer.length, 'bytes');
    
    // Firebase Storage에 업로드
    const storageRef = ref(storage, 'templates/napfoom.xlsx');
    console.log('☁️ Firebase Storage 경로:', storageRef.fullPath);
    
    const snapshot = await uploadBytes(storageRef, fileBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    console.log('📤 업로드 완료:', snapshot.metadata.name);
    
    // 다운로드 URL 가져오기
    const downloadURL = await getDownloadURL(storageRef);
    console.log('🔗 다운로드 URL:', downloadURL);
    
    console.log('🎉 NAPFOOM 템플릿 Firebase Storage 업로드 완료!');
    console.log('📋 사용할 URL:', downloadURL);
    
  } catch (error) {
    console.error('❌ 업로드 실패:', error);
    process.exit(1);
  }
}

// 스크립트 실행
uploadNapfoomTemplate();


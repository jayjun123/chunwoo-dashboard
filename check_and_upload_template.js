import { initializeApp } from 'firebase/app';
import { getStorage, ref, getDownloadURL, uploadBytes, deleteObject } from 'firebase/storage';
import fs from 'fs';
import path from 'path';

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

async function checkAndUploadTemplate() {
  try {
    console.log('🔍 템플릿 상태 확인 시작...');
    
    // 1. 파이어베이스에서 템플릿 확인
    try {
      const templateRef = ref(storage, 'templates/NEWgisung.xlsx');
      const downloadURL = await getDownloadURL(templateRef);
      console.log('✅ 파이어베이스에 NEWgisung.xlsx 템플릿이 존재합니다.');
      console.log('📂 다운로드 URL:', downloadURL);
      
      // 템플릿 파일 크기 확인
      const response = await fetch(downloadURL);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        console.log('📊 템플릿 파일 크기:', buffer.byteLength, 'bytes');
        
        if (buffer.byteLength < 1000) {
          console.warn('⚠️ 템플릿 파일이 너무 작습니다. 다시 업로드합니다.');
          throw new Error('템플릿 파일이 손상되었습니다.');
        }
      }
      
      console.log('✅ 템플릿 상태 정상');
      return;
      
    } catch (error) {
      if (error.code === 'storage/object-not-found') {
        console.log('❌ 파이어베이스에 NEWgisung.xlsx 템플릿이 없습니다.');
      } else {
        console.log('❌ 템플릿 확인 실패:', error.message);
      }
    }
    
    // 2. 로컬 파일 확인
    const templatePath = path.join(process.cwd(), 'public', 'NEWgisung.xlsx');
    console.log('📁 로컬 템플릿 경로:', templatePath);
    
    if (!fs.existsSync(templatePath)) {
      console.error('❌ 로컬에 NEWgisung.xlsx 파일이 없습니다.');
      console.log('📝 public 폴더에 NEWgisung.xlsx 파일을 넣어주세요.');
      return;
    }
    
    const stats = fs.statSync(templatePath);
    console.log('📊 로컬 템플릿 파일 크기:', stats.size, 'bytes');
    
    if (stats.size < 1000) {
      console.error('❌ 로컬 템플릿 파일이 너무 작습니다.');
      return;
    }
    
    // 3. 파이어베이스에 업로드
    console.log('📤 파이어베이스에 템플릿 업로드 중...');
    
    const fileBuffer = fs.readFileSync(templatePath);
    const templateRef = ref(storage, 'templates/NEWgisung.xlsx');
    
    const snapshot = await uploadBytes(templateRef, fileBuffer);
    
    console.log('✅ 템플릿 업로드 완료!');
    console.log('📂 저장 경로:', snapshot.metadata.fullPath);
    console.log('📊 파일 크기:', snapshot.metadata.size, 'bytes');
    console.log('🕒 업로드 시간:', snapshot.metadata.timeCreated);
    
  } catch (error) {
    console.error('❌ 템플릿 확인/업로드 실패:', error);
  }
}

// 스크립트 실행
checkAndUploadTemplate();

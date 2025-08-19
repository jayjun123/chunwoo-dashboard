// Node.js: Firebase Storage 템플릿 재등록(삭제 후 업로드)
import { initializeApp } from 'firebase/app';
import { getStorage, ref, deleteObject, uploadBytes } from 'firebase/storage';
import { readFileSync } from 'fs';
import { join } from 'path';

const firebaseConfig = {
  apiKey: "AIzaSyATCGXGD2_teiJFdpng9J2_fvZRItPef0w",
  authDomain: "chunwooo-edf9f.firebaseapp.com",
  projectId: "chunwooo-edf9f",
  storageBucket: "chunwooo-edf9f.firebasestorage.app",
  messagingSenderId: "417029078660",
  appId: "1:417029078660:web:00e23d79af77876e598cd1",
  measurementId: "G-653CL9XWFH"
};

async function refreshTemplate() {
  console.log('🚀 Firebase 초기화...');
  const app = initializeApp(firebaseConfig);
  const storage = getStorage(app);

  const objectPath = 'templates/gisung.xlsx';
  const templateRef = ref(storage, objectPath);

  // 1) 기존 파일 삭제
  try {
    console.log('🗑️ 기존 템플릿 삭제 시도:', objectPath);
    await deleteObject(templateRef);
    console.log('✅ 기존 템플릿 삭제 완료');
  } catch (err) {
    console.warn('⚠️ 삭제 중 경고(없거나 권한문제일 수 있음):', err?.message || err);
  }

  // 2) public에서 읽어서 재업로드
  console.log('📁 public/gisung.xlsx 읽는 중...');
  const templatePath = join(process.cwd(), 'public', 'gisung.xlsx');
  const buffer = readFileSync(templatePath);
  console.log('📊 로컬 파일 크기:', buffer.length, 'bytes');

  console.log('☁️ Firebase Storage 업로드 중...');
  const snapshot = await uploadBytes(templateRef, buffer);
  console.log('✅ 업로드 완료');
  console.log('📂 경로:', snapshot.metadata.fullPath);
  console.log('📏 크기:', snapshot.metadata.size, 'bytes');
  console.log('🕒 시간:', snapshot.metadata.timeCreated);
}

refreshTemplate().catch(e => {
  console.error('❌ 재업로드 실패:', e);
  process.exit(1);
});


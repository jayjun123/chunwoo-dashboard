// public 폴더의 템플릿 파일들을 Firebase Storage에 업로드하는 스크립트
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './src/firebase.js';
import fs from 'fs';
import path from 'path';

const uploadPublicTemplates = async () => {
  try {
    console.log('🚀 public 폴더 템플릿 파일 업로드 시작...');
    
    const storageRef = getStorage();
    
    // 1. LONG.xlsx 업로드 (L 롱기성)
    console.log('📤 LONG.xlsx 업로드 중...');
    const longFilePath = path.join(process.cwd(), 'public', 'LONG.xlsx');
    
    if (!fs.existsSync(longFilePath)) {
      throw new Error('LONG.xlsx 파일을 찾을 수 없습니다.');
    }
    
    const longFileBuffer = fs.readFileSync(longFilePath);
    const longStorageRef = ref(storageRef, 'templates/LONG.xlsx');
    
    await uploadBytes(longStorageRef, longFileBuffer);
    const longDownloadURL = await getDownloadURL(longStorageRef);
    
    console.log('✅ LONG.xlsx 업로드 완료');
    console.log('📥 다운로드 URL:', longDownloadURL);
    
    // 2. NEW.xlsx 업로드 (N 뉴기성)
    console.log('📤 NEW.xlsx 업로드 중...');
    const newFilePath = path.join(process.cwd(), 'public', 'NEW.xlsx');
    
    if (!fs.existsSync(newFilePath)) {
      throw new Error('NEW.xlsx 파일을 찾을 수 없습니다.');
    }
    
    const newFileBuffer = fs.readFileSync(newFilePath);
    const newStorageRef = ref(storageRef, 'templates/NEW.xlsx');
    
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
    
  } catch (error) {
    console.error('❌ 템플릿 업로드 실패:', error);
    throw error;
  }
};

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  uploadPublicTemplates()
    .then(() => {
      console.log('🎯 스크립트 실행 완료!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export default uploadPublicTemplates;




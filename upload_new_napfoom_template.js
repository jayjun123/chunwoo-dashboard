const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Firebase 초기화
const serviceAccount = require('./firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'your-project-id.appspot.com' // 실제 프로젝트 ID로 변경
  });
}

const bucket = admin.storage().bucket();

async function uploadNewNapfoomTemplate() {
  try {
    console.log('📤 새로운 NAPFOOM.xlsx 템플릿 업로드 시작...');
    
    // 파일 경로
    const filePath = path.join(__dirname, 'public', 'NAPFOOM.xlsx');
    
    // 파일 존재 확인
    if (!fs.existsSync(filePath)) {
      console.error('❌ NAPFOOM.xlsx 파일을 찾을 수 없습니다:', filePath);
      return;
    }
    
    // 파일 읽기
    const fileBuffer = fs.readFileSync(filePath);
    
    // Firebase Storage에 업로드
    const fileName = 'templates/NAPFOOM.xlsx';
    const file = bucket.file(fileName);
    
    await file.save(fileBuffer, {
      metadata: {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        cacheControl: 'public, max-age=31536000'
      }
    });
    
    // 공개 URL 생성
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    
    console.log('✅ 새로운 NAPFOOM.xlsx 템플릿 업로드 완료!');
    console.log('📎 공개 URL:', publicUrl);
    
    // 다운로드 URL도 생성
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2500' // 매우 긴 만료일
    });
    
    console.log('🔗 다운로드 URL:', url);
    
  } catch (error) {
    console.error('❌ 템플릿 업로드 실패:', error);
  }
}

uploadNewNapfoomTemplate();


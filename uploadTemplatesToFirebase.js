// 실제 Firebase 프로젝트에 템플릿 파일 업로드 스크립트
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import fs from 'fs';
import path from 'path';

// 실제 Firebase 설정 (chunwooo-edf9f 프로젝트)
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

// 업로드할 템플릿 파일 목록
const templateFiles = [
  {
    localPath: './public/(N)견적서.xlsx',
    storagePath: 'templates/(N)견적서.xlsx',
    description: 'N 타입 견적서 템플릿'
  },
  {
    localPath: './public/(L)견적서.xlsx',
    storagePath: 'templates/(L)견적서.xlsx',
    description: 'L 타입 견적서 템플릿'
  },
  {
    localPath: './public/(N)납품계약서.xlsx',
    storagePath: 'templates/(N)납품계약서.xlsx',
    description: 'N 타입 납품계약서 템플릿'
  },
  {
    localPath: './public/(L)납품계약서.xlsx',
    storagePath: 'templates/(L)납품계약서.xlsx',
    description: 'L 타입 납품계약서 템플릿'
  }
];

// 파일 업로드 함수
async function uploadTemplateFile(localPath, storagePath, description) {
  try {
    console.log(`📤 ${description} 업로드 시작...`);
    
    // 파일 존재 확인
    if (!fs.existsSync(localPath)) {
      throw new Error(`파일을 찾을 수 없습니다: ${localPath}`);
    }
    
    // 파일 읽기
    const fileBuffer = fs.readFileSync(localPath);
    console.log(`📁 파일 크기: ${(fileBuffer.length / 1024).toFixed(2)} KB`);
    
    // 스토리지 참조 생성
    const storageRef = ref(storage, storagePath);
    
    // 파일 업로드
    const snapshot = await uploadBytes(storageRef, fileBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      metadata: {
        description: description,
        uploadedAt: new Date().toISOString()
      }
    });
    
    console.log(`✅ ${description} 업로드 완료!`);
    console.log(`📊 업로드된 바이트: ${snapshot.bytesTransferred}`);
    
    // 다운로드 URL 가져오기
    const downloadURL = await getDownloadURL(storageRef);
    console.log(`🔗 다운로드 URL: ${downloadURL}`);
    
    return {
      success: true,
      storagePath,
      downloadURL,
      description
    };
    
  } catch (error) {
    console.error(`❌ ${description} 업로드 실패:`, error.message);
    return {
      success: false,
      storagePath,
      error: error.message,
      description
    };
  }
}

// 메인 업로드 함수
async function uploadAllTemplates() {
  console.log('🚀 Firebase 스토리지 템플릿 업로드 시작...');
  console.log(`📋 프로젝트: ${firebaseConfig.projectId}`);
  console.log(`🌐 스토리지: ${firebaseConfig.storageBucket}\n`);
  
  const results = [];
  
  for (const template of templateFiles) {
    const result = await uploadTemplateFile(
      template.localPath,
      template.storagePath,
      template.description
    );
    results.push(result);
    console.log(''); // 구분선
  }
  
  // 결과 요약
  console.log('📋 업로드 결과 요약:');
  console.log('='.repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  
  if (successCount > 0) {
    console.log('\n📥 성공한 파일들의 다운로드 URL:');
    console.log('='.repeat(60));
    results.filter(r => r.success).forEach(result => {
      console.log(`\n${result.description}:`);
      console.log(result.downloadURL);
    });
  }
  
  if (failCount > 0) {
    console.log('\n⚠️ 실패한 파일들:');
    console.log('='.repeat(40));
    results.filter(r => !r.success).forEach(result => {
      console.log(`- ${result.description}: ${result.error}`);
    });
  }
  
  console.log('\n🎯 다음 단계:');
  console.log('1. 성공한 파일들의 다운로드 URL을 복사');
  console.log('2. materialUploadUtils.js, contractGabjiUtils.js, napfoomUtils.js 파일의 templateUrl 업데이트');
  console.log('3. 코드에서 새로운 URL 사용');
  
  // 성공한 URL들을 파일로 저장
  if (successCount > 0) {
    const urlsData = results.filter(r => r.success).map(result => ({
      description: result.description,
      storagePath: result.storagePath,
      downloadURL: result.downloadURL
    }));
    
    const urlsContent = `// Firebase Storage 템플릿 다운로드 URL
// 생성일: ${new Date().toISOString()}
// 프로젝트: ${firebaseConfig.projectId}

export const templateUrls = {
${urlsData.map(url => `  // ${url.description}
  "${url.storagePath.replace('templates/', '').replace('.xlsx', '')}": "${url.downloadURL}"`).join(',\n')}
};

// 사용 예시:
// import { templateUrls } from './templateUrls.js';
// const estimateNUrl = templateUrls['(N)견적서'];
// const estimateLUrl = templateUrls['(L)견적서'];
`;

    fs.writeFileSync('./templateUrls.js', urlsContent);
    console.log('\n💾 다운로드 URL이 templateUrls.js 파일에 저장되었습니다.');
  }
}

// 스크립트 실행
uploadAllTemplates().catch(console.error);

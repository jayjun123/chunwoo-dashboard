#!/usr/bin/env node

/**
 * 환경변수 설정 스크립트
 * 아이패드 IPA 빌드를 위한 환경변수 설정
 */

const fs = require('fs');
const path = require('path');

// 환경변수 템플릿
const envTemplate = `# Firebase 설정
VITE_FIREBASE_API_KEY=AIzaSyATCGXGD2_teiJFdpng9J2_fvZRItPef0w
VITE_FIREBASE_AUTH_DOMAIN=chunwooo-edf9f.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=chunwooo-edf9f
VITE_FIREBASE_STORAGE_BUCKET=chunwooo-edf9f.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=417029078660
VITE_FIREBASE_APP_ID=1:417029078660:web:00e23d79af77876e598cd1
VITE_FIREBASE_MEASUREMENT_ID=G-653CL9XWFH

# 마스터 이메일 설정 (중요!)
VITE_MASTER_EMAIL=fire8803@naver.com

# Google Tasks API (선택사항)
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here

# 개발 환경 설정
VITE_API_URL=http://localhost:3001/api
VITE_USE_FIRESTORE_EMULATOR=false
`;

// .env 파일 생성
function createEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  
  try {
    if (fs.existsSync(envPath)) {
      console.log('⚠️  .env 파일이 이미 존재합니다.');
      console.log('   기존 파일을 백업하고 새로 생성합니다.');
      
      // 백업 파일 생성
      const backupPath = path.join(process.cwd(), '.env.backup');
      fs.copyFileSync(envPath, backupPath);
      console.log(`✅ 기존 .env 파일을 ${backupPath}로 백업했습니다.`);
    }
    
    fs.writeFileSync(envPath, envTemplate);
    console.log('✅ .env 파일이 성공적으로 생성되었습니다.');
    console.log('📝 마스터 이메일: fire8803@naver.com');
    
  } catch (error) {
    console.error('❌ .env 파일 생성 실패:', error.message);
    process.exit(1);
  }
}

// 환경변수 검증
function validateEnv() {
  const envPath = path.join(process.cwd(), '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env 파일이 없습니다. 먼저 setup-env.js를 실행하세요.');
    return false;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_MASTER_EMAIL'
  ];
  
  const missingVars = requiredVars.filter(varName => 
    !envContent.includes(varName) || 
    envContent.includes(`${varName}=your_`) ||
    envContent.includes(`${varName}=`)
  );
  
  if (missingVars.length > 0) {
    console.log('❌ 누락된 환경변수:', missingVars);
    return false;
  }
  
  console.log('✅ 모든 필수 환경변수가 설정되어 있습니다.');
  return true;
}

// 빌드 환경 확인
function checkBuildEnvironment() {
  console.log('🔍 빌드 환경 확인:');
  console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');
  console.log('- 현재 디렉토리:', process.cwd());
  
  // package.json 확인
  const packagePath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    console.log('- 프로젝트 이름:', packageJson.name);
    console.log('- 빌드 스크립트:', packageJson.scripts?.build || '없음');
  }
}

// 메인 실행
function main() {
  const command = process.argv[2];
  
  console.log('🚀 환경변수 설정 도구');
  console.log('========================');
  
  switch (command) {
    case 'create':
      createEnvFile();
      break;
      
    case 'validate':
      validateEnv();
      break;
      
    case 'check':
      checkBuildEnvironment();
      break;
      
    default:
      console.log('사용법:');
      console.log('  node setup-env.js create   - .env 파일 생성');
      console.log('  node setup-env.js validate - 환경변수 검증');
      console.log('  node setup-env.js check    - 빌드 환경 확인');
      break;
  }
}

main();

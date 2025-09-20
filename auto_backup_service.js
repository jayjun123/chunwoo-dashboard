import { initializeApp, cert } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase 서비스 계정 키 (실제 키로 교체 필요)
const serviceAccount = {
  "type": "service_account",
  "project_id": "chunwooo-edf9f",
  "private_key_id": "YOUR_PRIVATE_KEY_ID",
  "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@chunwooo-edf9f.iam.gserviceaccount.com",
  "client_id": "YOUR_CLIENT_ID",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40chunwooo-edf9f.iam.gserviceaccount.com"
};

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

// Firebase 초기화 (서비스 계정 사용)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// 백업할 컬렉션 목록
const collectionsToBackup = [
  'sites',
  'gisung', 
  'claims',
  'documents',
  'discussions',
  'safety',
  'estimates',
  'progress',
  'users',
  'templates'
];

// 백업 디렉토리 생성
const createBackupDirectory = () => {
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
};

// Firestore 컬렉션 백업
const backupFirestoreCollection = async (collectionName) => {
  try {
    console.log(`📊 ${collectionName} 컬렉션 백업 시작...`);
    
    const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    const documents = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      // Firestore Timestamp를 ISO 문자열로 변환
      const processedData = {};
      Object.keys(data).forEach(key => {
        if (data[key] && typeof data[key] === 'object' && data[key].toDate) {
          processedData[key] = data[key].toDate().toISOString();
        } else {
          processedData[key] = data[key];
        }
      });
      
      documents.push({
        id: doc.id,
        ...processedData
      });
    });
    
    console.log(`✅ ${collectionName}: ${documents.length}개 문서 백업 완료`);
    return documents;
  } catch (error) {
    console.error(`❌ ${collectionName} 백업 실패:`, error);
    return [];
  }
};

// Storage 파일 목록 백업
const backupStorageFiles = async () => {
  try {
    console.log('📁 Storage 파일 목록 백업 시작...');
    
    const storageRefs = [
      'documents',
      'sites/photos',
      'templates',
      'stamps',
      'safety',
      'discussion_files'
    ];
    
    const fileList = {};
    
    for (const storagePath of storageRefs) {
      try {
        const listRef = ref(storage, storagePath);
        const result = await listAll(listRef);
        
        const files = [];
        for (const item of result.items) {
          try {
            const url = await getDownloadURL(item);
            files.push({
              name: item.name,
              fullPath: item.fullPath,
              url: url
            });
          } catch (urlError) {
            console.warn(`⚠️ 파일 URL 가져오기 실패: ${item.fullPath}`);
          }
        }
        
        fileList[storagePath] = files;
        console.log(`✅ ${storagePath}: ${files.length}개 파일 목록 백업 완료`);
      } catch (error) {
        console.warn(`⚠️ ${storagePath} 경로 접근 실패:`, error.message);
      }
    }
    
    return fileList;
  } catch (error) {
    console.error('❌ Storage 백업 실패:', error);
    return {};
  }
};

// 백업 메타데이터 생성
const createBackupMetadata = () => {
  return {
    backupDate: new Date().toISOString(),
    backupVersion: '1.0',
    collections: collectionsToBackup,
    totalCollections: collectionsToBackup.length,
    backupType: 'full',
    description: 'Firebase 전체 데이터 자동 백업 (서비스 계정)'
  };
};

// 메인 백업 함수
const performBackup = async () => {
  const startTime = Date.now();
  console.log('🚀 Firebase 자동 백업 시작 (서비스 계정)...');
  console.log('📅 백업 시간:', new Date().toLocaleString('ko-KR'));
  
  try {
    const backupDir = createBackupDirectory();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFolder = path.join(backupDir, `backup_${timestamp}`);
    
    // 백업 폴더 생성
    if (!fs.existsSync(backupFolder)) {
      fs.mkdirSync(backupFolder, { recursive: true });
    }
    
    // Firestore 데이터 백업
    const firestoreData = {};
    for (const collectionName of collectionsToBackup) {
      firestoreData[collectionName] = await backupFirestoreCollection(collectionName);
    }
    
    // Storage 파일 목록 백업
    const storageData = await backupStorageFiles();
    
    // 백업 메타데이터
    const metadata = createBackupMetadata();
    metadata.totalDocuments = Object.values(firestoreData).reduce((sum, docs) => sum + docs.length, 0);
    metadata.totalStorageFiles = Object.values(storageData).reduce((sum, files) => sum + files.length, 0);
    metadata.backupDuration = Date.now() - startTime;
    
    // 백업 파일 저장
    const backupData = {
      metadata,
      firestore: firestoreData,
      storage: storageData
    };
    
    const backupFile = path.join(backupFolder, 'backup_data.json');
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
    
    // 백업 요약 파일 생성
    const summaryFile = path.join(backupFolder, 'backup_summary.txt');
    const summary = `
Firebase 자동 백업 완료 (서비스 계정)
=====================================

백업 시간: ${new Date().toLocaleString('ko-KR')}
백업 폴더: ${backupFolder}

📊 Firestore 데이터:
${Object.entries(firestoreData).map(([collection, docs]) => 
  `  - ${collection}: ${docs.length}개 문서`
).join('\n')}

📁 Storage 파일:
${Object.entries(storageData).map(([path, files]) => 
  `  - ${path}: ${files.length}개 파일`
).join('\n')}

총 문서 수: ${metadata.totalDocuments}개
총 파일 수: ${metadata.totalStorageFiles}개
백업 소요 시간: ${metadata.backupDuration}ms

백업 파일: backup_data.json
    `;
    
    fs.writeFileSync(summaryFile, summary, 'utf8');
    
    console.log('🎉 백업 완료!');
    console.log('📁 백업 위치:', backupFolder);
    console.log('📊 총 문서 수:', metadata.totalDocuments);
    console.log('📁 총 파일 수:', metadata.totalStorageFiles);
    console.log('⏱️ 소요 시간:', metadata.backupDuration, 'ms');
    
    // 백업 완료 - 자동 삭제 기능 비활성화 (백업 파일은 중요 자산)
    console.log('💾 백업 파일은 중요 자산이므로 자동 삭제하지 않습니다.');
    
  } catch (error) {
    console.error('❌ 백업 실패:', error);
  }
};

// 이전 백업 정리
const cleanupOldBackups = (backupDir) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const backupFolders = fs.readdirSync(backupDir)
      .filter(folder => folder.startsWith('backup_'))
      .map(folder => ({
        name: folder,
        path: path.join(backupDir, folder),
        date: new Date(folder.replace('backup_', '').replace(/-/g, ':'))
      }))
      .filter(folder => folder.date < thirtyDaysAgo);
    
    if (backupFolders.length > 0) {
      console.log('🧹 30일 이상 된 백업 정리 중...');
      backupFolders.forEach(folder => {
        try {
          fs.rmSync(folder.path, { recursive: true, force: true });
          console.log(`🗑️ 삭제됨: ${folder.name}`);
        } catch (error) {
          console.warn(`⚠️ 삭제 실패: ${folder.name}`, error.message);
        }
      });
    }
  } catch (error) {
    console.warn('⚠️ 백업 정리 실패:', error.message);
  }
};

// 수동 백업 실행
const manualBackup = () => {
  console.log('🔧 수동 백업 실행 (서비스 계정)...');
  performBackup();
};

// 스크립트 실행
if (process.argv.includes('--manual')) {
  manualBackup();
} else {
  console.log('💡 사용법: node auto_backup_service.js --manual');
  console.log('💡 먼저 Firebase Console에서 서비스 계정 키를 다운로드하고');
  console.log('💡 serviceAccount 객체의 값들을 실제 키로 교체하세요.');
}

export { performBackup, manualBackup };

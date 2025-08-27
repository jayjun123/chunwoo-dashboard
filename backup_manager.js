import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    description: 'Firebase 전체 데이터 자동 백업'
  };
};

// 메인 백업 함수
const performBackup = async () => {
  const startTime = Date.now();
  console.log('🚀 Firebase 자동 백업 시작...');
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
Firebase 자동 백업 완료
=======================

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
    
    return backupFolder;
    
  } catch (error) {
    console.error('❌ 백업 실패:', error);
    return null;
  }
};

// 백업 목록 조회
const listBackups = () => {
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    return [];
  }
  
  const backups = fs.readdirSync(backupDir)
    .filter(folder => folder.startsWith('backup_'))
    .map(folder => {
      const backupPath = path.join(backupDir, folder);
      const summaryFile = path.join(backupPath, 'backup_summary.txt');
      
      let summary = '';
      if (fs.existsSync(summaryFile)) {
        summary = fs.readFileSync(summaryFile, 'utf8');
      }
      
      return {
        name: folder,
        path: backupPath,
        date: new Date(folder.replace('backup_', '').replace(/-/g, ':')),
        summary
      };
    })
    .sort((a, b) => b.date - a.date);
  
  return backups;
};

// 이전 백업 정리
const cleanupOldBackups = (days = 30) => {
  try {
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      return;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const backupFolders = fs.readdirSync(backupDir)
      .filter(folder => folder.startsWith('backup_'))
      .map(folder => ({
        name: folder,
        path: path.join(backupDir, folder),
        date: new Date(folder.replace('backup_', '').replace(/-/g, ':'))
      }))
      .filter(folder => folder.date < cutoffDate);
    
    if (backupFolders.length > 0) {
      console.log(`🧹 ${days}일 이상 된 백업 정리 중...`);
      backupFolders.forEach(folder => {
        try {
          fs.rmSync(folder.path, { recursive: true, force: true });
          console.log(`🗑️ 삭제됨: ${folder.name}`);
        } catch (error) {
          console.warn(`⚠️ 삭제 실패: ${folder.name}`, error.message);
        }
      });
      console.log(`✅ ${backupFolders.length}개 백업 정리 완료`);
    } else {
      console.log(`✅ ${days}일 이상 된 백업이 없습니다.`);
    }
  } catch (error) {
    console.warn('⚠️ 백업 정리 실패:', error.message);
  }
};

// 백업 통계
const getBackupStats = () => {
  const backups = listBackups();
  const backupDir = path.join(__dirname, 'backups');
  
  if (!fs.existsSync(backupDir)) {
    return {
      totalBackups: 0,
      totalSize: 0,
      oldestBackup: null,
      newestBackup: null
    };
  }
  
  let totalSize = 0;
  backups.forEach(backup => {
    try {
      const stats = fs.statSync(backup.path);
      totalSize += stats.size;
    } catch (error) {
      console.warn(`⚠️ 백업 크기 계산 실패: ${backup.name}`);
    }
  });
  
  return {
    totalBackups: backups.length,
    totalSize: totalSize,
    oldestBackup: backups.length > 0 ? backups[backups.length - 1] : null,
    newestBackup: backups.length > 0 ? backups[0] : null
  };
};

// CLI 인터페이스
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

const showMenu = () => {
  console.log('\n========================================');
  console.log('           Firebase 백업 관리자');
  console.log('========================================');
  console.log('1. 새 백업 생성');
  console.log('2. 백업 목록 조회');
  console.log('3. 백업 통계');
  console.log('4. 오래된 백업 정리');
  console.log('5. 자동 백업 스케줄러 설정');
  console.log('6. 종료');
  console.log('========================================');
};

const showBackupList = () => {
  const backups = listBackups();
  
  if (backups.length === 0) {
    console.log('\n❌ 백업이 없습니다.');
    return;
  }
  
  console.log('\n📋 백업 목록:');
  console.log('========================================');
  
  backups.forEach((backup, index) => {
    console.log(`${index + 1}. ${backup.name}`);
    console.log(`   📅 ${backup.date.toLocaleString('ko-KR')}`);
    console.log(`   📁 ${backup.path}`);
    console.log('');
  });
};

const showBackupStats = () => {
  const stats = getBackupStats();
  
  console.log('\n📊 백업 통계:');
  console.log('========================================');
  console.log(`총 백업 수: ${stats.totalBackups}개`);
  console.log(`총 크기: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  if (stats.newestBackup) {
    console.log(`최신 백업: ${stats.newestBackup.date.toLocaleString('ko-KR')}`);
  }
  
  if (stats.oldestBackup) {
    console.log(`최초 백업: ${stats.oldestBackup.date.toLocaleString('ko-KR')}`);
  }
  
  console.log('========================================');
};

const main = async () => {
  while (true) {
    showMenu();
    
    const choice = await question('\n선택하세요 (1-6): ');
    
    switch (choice.trim()) {
      case '1':
        console.log('\n🚀 새 백업을 생성합니다...');
        const backupPath = await performBackup();
        if (backupPath) {
          console.log(`✅ 백업이 완료되었습니다: ${backupPath}`);
        }
        break;
        
      case '2':
        showBackupList();
        break;
        
      case '3':
        showBackupStats();
        break;
        
      case '4':
        const days = await question('몇 일 이상 된 백업을 정리하시겠습니까? (기본값: 30): ');
        const cleanupDays = parseInt(days) || 30;
        cleanupOldBackups(cleanupDays);
        break;
        
      case '5':
        console.log('\n📅 자동 백업 스케줄러를 설정합니다...');
        console.log('Windows 작업 스케줄러에 등록하려면 setup_backup_scheduler.bat을 실행하세요.');
        break;
        
      case '6':
        console.log('\n👋 백업 관리자를 종료합니다.');
        rl.close();
        return;
        
      default:
        console.log('\n❌ 잘못된 선택입니다. 1-6 중에서 선택해주세요.');
    }
    
    await question('\n계속하려면 Enter를 누르세요...');
  }
};

// 스크립트 실행
if (process.argv.includes('--cli')) {
  main().catch(console.error);
} else {
  console.log('Firebase 백업 관리자');
  console.log('사용법: node backup_manager.js --cli');
}

export { performBackup, listBackups, cleanupOldBackups, getBackupStats };

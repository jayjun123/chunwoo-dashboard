import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, deleteObject } from 'firebase/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// 백업 파일 로드
const loadBackupData = (backupPath) => {
  try {
    const backupFile = path.join(backupPath, 'backup_data.json');
    if (!fs.existsSync(backupFile)) {
      throw new Error('백업 파일을 찾을 수 없습니다: backup_data.json');
    }
    
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    console.log('✅ 백업 파일 로드 완료');
    console.log('📅 백업 날짜:', backupData.metadata.backupDate);
    console.log('📊 총 문서 수:', backupData.metadata.totalDocuments);
    
    return backupData;
  } catch (error) {
    console.error('❌ 백업 파일 로드 실패:', error);
    throw error;
  }
};

// Firestore 데이터 복원
const restoreFirestoreData = async (firestoreData, options = {}) => {
  const { clearExisting = false, collections = [] } = options;
  
  console.log('🔄 Firestore 데이터 복원 시작...');
  
  for (const [collectionName, documents] of Object.entries(firestoreData)) {
    if (collections.length > 0 && !collections.includes(collectionName)) {
      console.log(`⏭️ ${collectionName} 컬렉션 건너뛰기`);
      continue;
    }
    
    try {
      console.log(`📊 ${collectionName} 컬렉션 복원 중...`);
      
      // 기존 데이터 삭제 (옵션)
      if (clearExisting) {
        console.log(`🗑️ ${collectionName} 기존 데이터 삭제 중...`);
        const existingDocs = await getDocs(collection(db, collectionName));
        const deletePromises = existingDocs.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        console.log(`✅ ${collectionName} 기존 데이터 삭제 완료`);
      }
      
      // 새 데이터 추가
      let restoredCount = 0;
      for (const document of documents) {
        try {
          const { id, ...data } = document;
          
          // ISO 문자열을 Date 객체로 변환
          const processedData = {};
          Object.keys(data).forEach(key => {
            if (typeof data[key] === 'string' && data[key].match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
              processedData[key] = new Date(data[key]);
            } else {
              processedData[key] = data[key];
            }
          });
          
          await addDoc(collection(db, collectionName), processedData);
          restoredCount++;
        } catch (error) {
          console.warn(`⚠️ 문서 복원 실패 (${collectionName}):`, error.message);
        }
      }
      
      console.log(`✅ ${collectionName}: ${restoredCount}개 문서 복원 완료`);
    } catch (error) {
      console.error(`❌ ${collectionName} 복원 실패:`, error);
    }
  }
};

// Storage 파일 복원 (URL에서 다운로드)
const restoreStorageFiles = async (storageData, options = {}) => {
  const { clearExisting = false, paths = [] } = options;
  
  console.log('🔄 Storage 파일 복원 시작...');
  
  for (const [storagePath, files] of Object.entries(storageData)) {
    if (paths.length > 0 && !paths.includes(storagePath)) {
      console.log(`⏭️ ${storagePath} 경로 건너뛰기`);
      continue;
    }
    
    try {
      console.log(`📁 ${storagePath} 파일 복원 중...`);
      
      // 기존 파일 삭제 (옵션)
      if (clearExisting) {
        console.log(`🗑️ ${storagePath} 기존 파일 삭제 중...`);
        try {
          const listRef = ref(storage, storagePath);
          const result = await listAll(listRef);
          const deletePromises = result.items.map(item => deleteObject(item));
          await Promise.all(deletePromises);
          console.log(`✅ ${storagePath} 기존 파일 삭제 완료`);
        } catch (error) {
          console.warn(`⚠️ ${storagePath} 기존 파일 삭제 실패:`, error.message);
        }
      }
      
      // 파일 복원 (URL에서 다운로드)
      let restoredCount = 0;
      for (const file of files) {
        try {
          if (file.url) {
            // URL에서 파일 다운로드
            const response = await fetch(file.url);
            const blob = await response.blob();
            
            // Storage에 업로드
            const storageRef = ref(storage, file.fullPath);
            await uploadBytes(storageRef, blob);
            
            restoredCount++;
          }
        } catch (error) {
          console.warn(`⚠️ 파일 복원 실패 (${file.name}):`, error.message);
        }
      }
      
      console.log(`✅ ${storagePath}: ${restoredCount}개 파일 복원 완료`);
    } catch (error) {
      console.error(`❌ ${storagePath} 복원 실패:`, error);
    }
  }
};

// 백업 목록 조회
const listBackups = () => {
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    console.log('❌ 백업 디렉토리가 없습니다.');
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

// 메인 복원 함수
const performRestore = async (backupPath, options = {}) => {
  const startTime = Date.now();
  console.log('🚀 Firebase 데이터 복원 시작...');
  console.log('📁 백업 경로:', backupPath);
  console.log('📅 복원 시간:', new Date().toLocaleString('ko-KR'));
  
  try {
    // 백업 데이터 로드
    const backupData = loadBackupData(backupPath);
    
    // Firestore 데이터 복원
    if (backupData.firestore) {
      await restoreFirestoreData(backupData.firestore, options);
    }
    
    // Storage 파일 복원
    if (backupData.storage) {
      await restoreStorageFiles(backupData.storage, options);
    }
    
    const duration = Date.now() - startTime;
    console.log('🎉 복원 완료!');
    console.log('⏱️ 소요 시간:', duration, 'ms');
    
  } catch (error) {
    console.error('❌ 복원 실패:', error);
  }
};

// CLI 인터페이스
const main = () => {
  const args = process.argv.slice(2);
  
  if (args.includes('--list')) {
    // 백업 목록 조회
    console.log('📋 사용 가능한 백업 목록:');
    console.log('================================');
    
    const backups = listBackups();
    if (backups.length === 0) {
      console.log('❌ 백업이 없습니다.');
      return;
    }
    
    backups.forEach((backup, index) => {
      console.log(`${index + 1}. ${backup.name}`);
      console.log(`   📅 ${backup.date.toLocaleString('ko-KR')}`);
      console.log(`   📁 ${backup.path}`);
      console.log('');
    });
    
    return;
  }
  
  if (args.includes('--restore')) {
    // 복원 실행
    const backupIndex = args.indexOf('--restore') + 1;
    const backupName = args[backupIndex];
    
    if (!backupName) {
      console.log('❌ 백업 이름을 지정해주세요.');
      console.log('사용법: node restore_backup.js --restore <백업이름>');
      return;
    }
    
    const backupPath = path.join(__dirname, 'backups', backupName);
    if (!fs.existsSync(backupPath)) {
      console.log(`❌ 백업을 찾을 수 없습니다: ${backupName}`);
      return;
    }
    
    const options = {
      clearExisting: args.includes('--clear'),
      collections: args.includes('--collections') ? args[args.indexOf('--collections') + 1].split(',') : [],
      paths: args.includes('--paths') ? args[args.indexOf('--paths') + 1].split(',') : []
    };
    
    performRestore(backupPath, options);
    return;
  }
  
  // 도움말
  console.log('Firebase 백업 복원 도구');
  console.log('========================');
  console.log('');
  console.log('사용법:');
  console.log('  node restore_backup.js --list                    # 백업 목록 조회');
  console.log('  node restore_backup.js --restore <백업이름>      # 백업 복원');
  console.log('');
  console.log('옵션:');
  console.log('  --clear                                          # 기존 데이터 삭제 후 복원');
  console.log('  --collections sites,gisung,claims               # 특정 컬렉션만 복원');
  console.log('  --paths documents,templates                     # 특정 Storage 경로만 복원');
  console.log('');
  console.log('예시:');
  console.log('  node restore_backup.js --list');
  console.log('  node restore_backup.js --restore backup_2025-01-27T10-30-00-000Z');
  console.log('  node restore_backup.js --restore backup_2025-01-27T10-30-00-000Z --clear');
  console.log('  node restore_backup.js --restore backup_2025-01-27T10-30-00-000Z --collections sites,gisung');
};

// 스크립트 실행
if (process.argv.length > 2) {
  main();
} else {
  console.log('Firebase 백업 복원 도구');
  console.log('사용법: node restore_backup.js --help');
}

export { performRestore, listBackups, loadBackupData };

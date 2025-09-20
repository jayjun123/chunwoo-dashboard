import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 백업 파일 보호 설정
const BACKUP_DIR = path.join(__dirname, 'backups');
const PROTECTION_FILE = path.join(BACKUP_DIR, 'DO_NOT_DELETE.txt');

// 백업 폴더 보호 파일 생성
const createProtectionFile = () => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const protectionContent = `
⚠️  중요: 이 폴더의 백업 파일들은 절대 삭제하지 마세요! ⚠️

이 폴더에는 Firebase 데이터의 백업 파일들이 저장되어 있습니다.
이 파일들은 귀중한 자산이며, 데이터 복구에 필수적입니다.

📁 백업 파일 구조:
- backup_YYYY-MM-DDTHH-mm-ss-sssZ/
  ├── backup_data.json      # 전체 데이터 (JSON)
  └── backup_summary.txt    # 백업 요약

🔒 보안 주의사항:
- 백업 파일에는 민감한 데이터가 포함될 수 있습니다
- 이 파일들을 안전한 위치에 보관하세요
- 정기적으로 백업 파일의 무결성을 확인하세요
- 외부 저장소(클라우드, 외장하드)에도 복사본을 보관하세요

📅 생성일: ${new Date().toLocaleString('ko-KR')}
🛡️ 보호 상태: 활성화
    `;

    fs.writeFileSync(PROTECTION_FILE, protectionContent, 'utf8');
    console.log('🛡️ 백업 폴더 보호 파일 생성 완료');
  } catch (error) {
    console.error('❌ 보호 파일 생성 실패:', error);
  }
};

// 백업 파일 무결성 검사
const checkBackupIntegrity = () => {
  try {
    console.log('🔍 백업 파일 무결성 검사 시작...');
    
    if (!fs.existsSync(BACKUP_DIR)) {
      console.log('📁 백업 폴더가 존재하지 않습니다.');
      return;
    }

    const backupFolders = fs.readdirSync(BACKUP_DIR)
      .filter(folder => folder.startsWith('backup_'))
      .map(folder => ({
        name: folder,
        path: path.join(BACKUP_DIR, folder),
        dataFile: path.join(BACKUP_DIR, folder, 'backup_data.json'),
        summaryFile: path.join(BACKUP_DIR, folder, 'backup_summary.txt')
      }));

    console.log(`📊 총 ${backupFolders.length}개의 백업 폴더 발견`);

    backupFolders.forEach(backup => {
      const issues = [];
      
      // 데이터 파일 확인
      if (!fs.existsSync(backup.dataFile)) {
        issues.push('❌ backup_data.json 파일 누락');
      } else {
        try {
          const data = JSON.parse(fs.readFileSync(backup.dataFile, 'utf8'));
          if (!data.metadata || !data.firestore) {
            issues.push('❌ 백업 데이터 구조 손상');
          }
        } catch (error) {
          issues.push('❌ backup_data.json 파일 손상');
        }
      }

      // 요약 파일 확인
      if (!fs.existsSync(backup.summaryFile)) {
        issues.push('❌ backup_summary.txt 파일 누락');
      }

      if (issues.length === 0) {
        console.log(`✅ ${backup.name}: 정상`);
      } else {
        console.log(`⚠️ ${backup.name}: ${issues.join(', ')}`);
      }
    });

  } catch (error) {
    console.error('❌ 무결성 검사 실패:', error);
  }
};

// 백업 파일 백업 (이중 백업)
const backupBackupFiles = () => {
  try {
    console.log('💾 백업 파일 이중 백업 시작...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupBackupDir = path.join(__dirname, `backup_backup_${timestamp}`);
    
    if (!fs.existsSync(backupBackupDir)) {
      fs.mkdirSync(backupBackupDir, { recursive: true });
    }

    // 백업 폴더 전체 복사
    const { execSync } = await import('child_process');
    execSync(`xcopy "${BACKUP_DIR}" "${backupBackupDir}" /E /I /H /Y`, { stdio: 'inherit' });
    
    console.log(`✅ 백업 파일 이중 백업 완료: ${backupBackupDir}`);
    
  } catch (error) {
    console.error('❌ 이중 백업 실패:', error);
  }
};

// 백업 폴더 크기 확인
const checkBackupSize = () => {
  try {
    console.log('📏 백업 폴더 크기 확인...');
    
    if (!fs.existsSync(BACKUP_DIR)) {
      console.log('📁 백업 폴더가 존재하지 않습니다.');
      return;
    }

    const { execSync } = await import('child_process');
    const sizeOutput = execSync(`dir "${BACKUP_DIR}" /s /-c`, { encoding: 'utf8' });
    
    // 크기 정보 추출
    const lines = sizeOutput.split('\n');
    const totalLine = lines.find(line => line.includes('총 파일'));
    
    if (totalLine) {
      console.log(`📊 ${totalLine.trim()}`);
    }

  } catch (error) {
    console.error('❌ 크기 확인 실패:', error);
  }
};

// 메인 함수
const main = () => {
  console.log('🛡️ 백업 파일 보호 시스템 시작...');
  
  // 보호 파일 생성
  createProtectionFile();
  
  // 무결성 검사
  checkBackupIntegrity();
  
  // 크기 확인
  checkBackupSize();
  
  console.log('✅ 백업 파일 보호 시스템 완료');
};

// 스크립트 실행
if (process.argv.includes('--check')) {
  checkBackupIntegrity();
} else if (process.argv.includes('--backup')) {
  backupBackupFiles();
} else if (process.argv.includes('--size')) {
  checkBackupSize();
} else {
  main();
}

export { createProtectionFile, checkBackupIntegrity, backupBackupFiles, checkBackupSize };


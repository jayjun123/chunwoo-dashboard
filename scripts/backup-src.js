/**
 * src 코드 백업 (수정 전 안전용)
 *
 * 사용: npm run backup   또는  node scripts/backup-src.js
 * 백업 위치: ./backups/code-YYYY-MM-DD_HH-mm-ss/
 * - src/ 전체 복사
 * - vite.config.js, firebase.json, firestore.rules, storage.rules, firestore.indexes.json 복사
 *
 * 복구: 백업 폴더의 src를 프로젝트 src 위에 덮어쓰면 됨 (필요한 파일만 골라서 복사 가능)
 */

import { cpSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const backupsDir = join(projectRoot, 'backups');

function timestamp() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}_${h}-${min}-${s}`;
}

const extraFiles = [
  'vite.config.js',
  'firebase.json',
  'firestore.rules',
  'storage.rules',
  'firestore.indexes.json',
  'package.json',
];

try {
  const name = `code-${timestamp()}`;
  const dest = join(backupsDir, name);

  mkdirSync(dest, { recursive: true });

  // src 전체 복사
  const srcPath = join(projectRoot, 'src');
  if (existsSync(srcPath)) {
    cpSync(srcPath, join(dest, 'src'), { recursive: true });
    console.log('✅ src/ 백업 완료');
  } else {
    console.warn('⚠️ src/ 폴더가 없습니다.');
  }

  // 중요 설정 파일 복사
  for (const file of extraFiles) {
    const from = join(projectRoot, file);
    if (existsSync(from)) {
      cpSync(from, join(dest, file));
      console.log('✅', file);
    }
  }

  console.log('\n📁 백업 위치:', dest);
  console.log('   복구: 해당 폴더에서 필요한 파일/폴더를 프로젝트로 복사하면 됩니다.\n');
} catch (err) {
  console.error('백업 실패:', err.message);
  process.exit(1);
}

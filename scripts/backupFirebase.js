/**
 * Firebase 전체 데이터 백업 (Firestore)
 *
 * 사용 방법:
 * 1. Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성
 * 2. 키 파일을 프로젝트 밖 안전한 곳에 저장 (예: C:\keys\chunwooo-firebase-adminsdk.json)
 * 3. 실행:
 *    set GOOGLE_APPLICATION_CREDENTIALS=C:\keys\chunwooo-firebase-adminsdk.json
 *    node scripts/backupFirebase.js
 *    또는
 *    node scripts/backupFirebase.js C:\path\to\serviceAccountKey.json
 *
 * 백업 위치: ./backup/firestore-YYYY-MM-DD_HH-mm-ss/
 * - 각 컬렉션별 JSON 파일 (documents는 id + data 형태로 저장)
 */

import admin from 'firebase-admin';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

function getServiceAccountPath() {
  const candidates = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    process.argv[2],
    join(projectRoot, 'serviceAccountKey.json'),
  ].filter(Boolean);
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return candidates[candidates.length - 1] || join(projectRoot, 'serviceAccountKey.json');
}

function serializeDoc(doc) {
  const data = doc.data();
  const out = { id: doc.id };
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v.toDate === 'function') {
      out[k] = v.toDate().toISOString();
    } else if (v && typeof v.toMillis === 'function') {
      out[k] = new Date(v.toMillis()).toISOString();
    } else if (v && typeof v === 'object' && v.seconds != null) {
      out[k] = new Date(v.seconds * 1000).toISOString();
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function backupCollection(db, collectionId) {
  const colRef = db.collection(collectionId);
  const snapshot = await colRef.get();
  const docs = snapshot.docs.map((doc) => serializeDoc(doc));
  return docs;
}

async function main() {
  const keyPath = getServiceAccountPath();
  let serviceAccount;
  try {
    const keyContent = readFileSync(keyPath, 'utf8');
    serviceAccount = JSON.parse(keyContent);
  } catch (e) {
    console.error('서비스 계정 키 파일을 읽을 수 없습니다:', keyPath);
    console.error(e.message);
    console.error('\nFirebase 콘솔 → 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성" 후');
    console.error('환경변수 GOOGLE_APPLICATION_CREDENTIALS 또는 인자로 키 파일 경로를 지정하세요.');
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const db = admin.firestore();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = join(projectRoot, 'backup', `firestore-${timestamp}`);
  mkdirSync(backupDir, { recursive: true });
  console.log('백업 폴더:', backupDir);

  const collectionsSnapshot = await db.listCollections();
  const collectionIds = collectionsSnapshot.map((col) => col.id);
  console.log('컬렉션 목록:', collectionIds.join(', '));

  const manifest = { exportedAt: new Date().toISOString(), projectId: db.projectId, collections: {} };

  for (const collectionId of collectionIds) {
    try {
      const docs = await backupCollection(db, collectionId);
      manifest.collections[collectionId] = docs.length;
      const outPath = join(backupDir, `${collectionId}.json`);
      writeFileSync(outPath, JSON.stringify(docs, null, 2), 'utf8');
      console.log(`  ${collectionId}: ${docs.length} documents`);
    } catch (err) {
      console.error(`  ${collectionId}: 오류`, err.message);
      manifest.collections[collectionId] = { error: err.message };
    }
  }

  const manifestPath = join(backupDir, '_manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('\n백업 완료. manifest:', manifestPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

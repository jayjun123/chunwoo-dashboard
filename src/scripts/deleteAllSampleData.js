import { db } from '../firebase.js';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const collectionsToDelete = [
  'todos',
  'progress',
  'discussions',
  'safety',
  'weather',
  // 필요시 추가: 'sites', 'users', ...
];

async function deleteAllDocs(collectionName) {
  const colRef = collection(db, collectionName);
  const snapshot = await getDocs(colRef);
  const batch = [];
  snapshot.forEach((docSnap) => {
    batch.push(deleteDoc(doc(db, collectionName, docSnap.id)));
  });
  await Promise.all(batch);
  console.log(`${collectionName} 컬렉션의 모든 문서 삭제 완료`);
}

export async function deleteAllSampleData() {
  for (const col of collectionsToDelete) {
    await deleteAllDocs(col);
  }
  console.log('모든 샘플 데이터 일괄 삭제 완료');
}

// 직접 실행하려면 아래 주석 해제
// deleteAllSampleData();
deleteAllSampleData(); 
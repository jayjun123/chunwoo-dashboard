import { db, collections } from '../firebase.js';
import { collection, getDocs, deleteDoc } from 'firebase/firestore';

const keepOneAndDeleteRest = async (colName) => {
  const colRef = collection(db, colName);
  const snapshot = await getDocs(colRef);
  if (snapshot.size <= 1) return; // 1개 이하면 삭제 안함
  let first = true;
  for (const docSnap of snapshot.docs) {
    if (first) {
      first = false;
      continue;
    }
    await deleteDoc(docSnap.ref);
  }
  console.log(`${colName} 컬렉션: 1개만 남기고 모두 삭제 완료`);
};

const main = async () => {
  await keepOneAndDeleteRest('progress');
  await keepOneAndDeleteRest('safety');
  await keepOneAndDeleteRest('sites');
  await keepOneAndDeleteRest('todos');
};

main(); 
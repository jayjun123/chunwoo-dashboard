import { db } from '../firebase.js';
import { collection, getDocs, deleteDoc } from 'firebase/firestore';

const run = async () => {
  const snapshot = await getDocs(collection(db, 'sites'));
  const filtered = snapshot.docs.filter(docSnap => docSnap.data().team === '시공팀A');
  if (filtered.length <= 1) return;
  let first = true;
  for (const docSnap of filtered) {
    if (first) { first = false; continue; }
    await deleteDoc(docSnap.ref);
  }
  console.log('시공팀A 현장 중복 삭제 완료');
};
run(); 
import { db } from '../firebase.js';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

async function addStatusUpdatedAtToSites() {
  const colRef = collection(db, 'sites');
  const snapshot = await getDocs(colRef);
  const batch = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (!data.statusUpdatedAt) {
      const baseDate = data.updatedAt || data.createdAt || new Date().toISOString();
      batch.push(updateDoc(doc(db, 'sites', docSnap.id), { statusUpdatedAt: baseDate }));
    }
  });
  await Promise.all(batch);
  console.log('모든 sites 문서에 statusUpdatedAt 필드 추가 완료');
}

addStatusUpdatedAtToSites(); 
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

async function addStatusUpdatedAtToSites() {
  const colRef = collection(db, 'sites');
  const snapshot = await getDocs(colRef);
  const batch = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (!data.statusUpdatedAt) {
      const baseDate = data.updatedAt || data.createdAt || new Date().toISOString();
      batch.push(updateDoc(doc(db, 'sites', docSnap.id), { statusUpdatedAt: baseDate }));
    }
  });
  await Promise.all(batch);
  console.log('모든 sites 문서에 statusUpdatedAt 필드 추가 완료');
}

addStatusUpdatedAtToSites(); 
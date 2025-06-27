import { db } from '../firebase.js';
import { collection, getDocs, deleteDoc } from 'firebase/firestore';

const collectionsToClear = [
  'gisung', // 기성현황
  'costs',
  'discussions', // 협의
  'safety_inspections', // 안전점검
  'safety_accidents', // 안전사고
  'safety_education', // 안전교육
  'safety_costs', // 안전관리비
  'todos', // 투두
  'documents',
  'schedules',
  'weather',
  'progress', // 추가: progress
  'safety',   // 추가: safety
  'sites',    // 추가: sites
];

const cleanupAll = async () => {
  for (const col of collectionsToClear) {
    const snapshot = await getDocs(collection(db, col));
    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref);
    }
    console.log(`${col} 컬렉션 전체 삭제 완료`);
  }
  console.log('모든 주요 컬렉션 데이터 전체 삭제 완료');
};

cleanupAll(); 
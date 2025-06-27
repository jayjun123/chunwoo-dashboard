import { db } from '../firebase.js';
import { collection, addDoc } from 'firebase/firestore';

// const run = async () => {
//   // cost 샘플
//   await addDoc(collection(db, 'costs'), {
//     name: '샘플 비용',
//     budget: 1000000,
//     actual: 500000,
//     description: '예시 비용 항목',
//     createdAt: new Date().toISOString(),
//     updatedAt: new Date().toISOString(),
//   });
//   // gisung 샘플
//   await addDoc(collection(db, 'gisung'), {
//     name: '샘플 기성',
//     contractAmount: 10000000,
//     payments: [
//       { label: '1차 기성', amount: 3000000 },
//       { label: '2차 기성', amount: 2000000 }
//     ],
//     advance: 0,
//     prevGisung: 0,
//     gisungMonth: '',
//     gisungAmount: 0,
//     note: '',
//     createdAt: new Date().toISOString(),
//     updatedAt: new Date().toISOString(),
//   });
//   console.log('costs, gisung 컬렉션 샘플 생성 완료');
// };
// run(); 
import { collection, addDoc } from 'firebase/firestore';

// const run = async () => {
//   // cost 샘플
//   await addDoc(collection(db, 'costs'), {
//     name: '샘플 비용',
//     budget: 1000000,
//     actual: 500000,
//     description: '예시 비용 항목',
//     createdAt: new Date().toISOString(),
//     updatedAt: new Date().toISOString(),
//   });
//   // gisung 샘플
//   await addDoc(collection(db, 'gisung'), {
//     name: '샘플 기성',
//     contractAmount: 10000000,
//     payments: [
//       { label: '1차 기성', amount: 3000000 },
//       { label: '2차 기성', amount: 2000000 }
//     ],
//     advance: 0,
//     prevGisung: 0,
//     gisungMonth: '',
//     gisungAmount: 0,
//     note: '',
//     createdAt: new Date().toISOString(),
//     updatedAt: new Date().toISOString(),
//   });
//   console.log('costs, gisung 컬렉션 샘플 생성 완료');
// };
// run(); 
import { db } from '../firebase.js';
import { collection, addDoc } from 'firebase/firestore';

async function addSampleData() {
  // sites
  await addDoc(collection(db, 'sites'), {
    name: '테스트현장',
    status: '진행중',
    createdAt: new Date().toISOString(),
    statusUpdatedAt: new Date().toISOString(),
    address: '서울시 강남구',
    manager: '홍길동',
  });
  // progress
  await addDoc(collection(db, 'progress'), {
    siteId: '테스트현장',
    type: '청구',
    amount: 1000000,
    date: new Date().toISOString(),
    current: 50,
    target: 100
  });
  // discussions
  await addDoc(collection(db, 'discussions'), {
    title: '협의 테스트',
    content: '협의 내용 예시',
    createdAt: new Date().toISOString(),
    read: false
  });
  // safety
  await addDoc(collection(db, 'safety'), {
    title: '안전 테스트',
    content: '안전관리 내용 예시',
    createdAt: new Date().toISOString(),
    resolved: false
  });
  // todos
  await addDoc(collection(db, 'todos'), {
    text: '할일 테스트',
    completed: false,
    createdAt: new Date().toISOString()
  });
  console.log('샘플 데이터 1개씩 추가 완료');
}

addSampleData(); 
import { collection, addDoc } from 'firebase/firestore';

async function addSampleData() {
  // sites
  await addDoc(collection(db, 'sites'), {
    name: '테스트현장',
    status: '진행중',
    createdAt: new Date().toISOString(),
    statusUpdatedAt: new Date().toISOString(),
    address: '서울시 강남구',
    manager: '홍길동',
  });
  // progress
  await addDoc(collection(db, 'progress'), {
    siteId: '테스트현장',
    type: '청구',
    amount: 1000000,
    date: new Date().toISOString(),
    current: 50,
    target: 100
  });
  // discussions
  await addDoc(collection(db, 'discussions'), {
    title: '협의 테스트',
    content: '협의 내용 예시',
    createdAt: new Date().toISOString(),
    read: false
  });
  // safety
  await addDoc(collection(db, 'safety'), {
    title: '안전 테스트',
    content: '안전관리 내용 예시',
    createdAt: new Date().toISOString(),
    resolved: false
  });
  // todos
  await addDoc(collection(db, 'todos'), {
    text: '할일 테스트',
    completed: false,
    createdAt: new Date().toISOString()
  });
  console.log('샘플 데이터 1개씩 추가 완료');
}

addSampleData(); 
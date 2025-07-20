const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyATCGXGD2_teiJFdpng9J2_fvZRItPef0w",
  authDomain: "chunwooo-ebaseapp.com",
  projectId: "chunwooo-edf9f",
  storageBucket: "chunwooo-edf9f.firebasestorage.app",
  messagingSenderId: "417029078660",
  appId: "1:417029078660:web:00e23d79af77876e598cd1",
  measurementId: "G-653CL9XWFH"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const createTestClaims = async () => {
  try {
    const claimsCollection = collection(db, 'claims');
    
    const testClaims = [
      {
        claimMonth: '2025-07',
        siteName: '테스트 현장 1',
        manager: '김관리',
        sequence: '1차',
        progressRate: '85',
        claimAmount: '50000000',
        claimStatus: 'X',
        notes: '테스트 청구예정 1',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        claimMonth: '2025-07',
        siteName: '테스트 현장 2',
        manager: '이소장',
        sequence: '2차',
        progressRate: '92',
        claimAmount: '75000000',
        claimStatus: 'O',
        notes: '테스트 청구예정 2',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        claimMonth: '2025-08',
        siteName: '테스트 현장 3',
        manager: '박현장',
        sequence: '1차',
        progressRate: '78',
        claimAmount: '30000000',
        claimStatus: 'X',
        notes: '테스트 청구예정 3',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];

    console.log('테스트 청구 데이터 생성 시작...');
    
    for (const claimData of testClaims) {
      const docRef = await addDoc(claimsCollection, claimData);
      console.log('청구 데이터 생성됨:', docRef.id, claimData.siteName);
    }
    
    console.log('모든 테스트 청구 데이터 생성 완료!');
  } catch (error) {
    console.error('테스트 청구 데이터 생성 실패:', error);
  }
};

// 스크립트 실행
createTestClaims(); 
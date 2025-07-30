const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyATCGXGD2_teiJFdpng9J2_fvZRItPef0w",
  authDomain: "chunwooo-edf9f.firebaseapp.com",
  projectId: "chunwooo-edf9f",
  storageBucket: "chunwooo-edf9f.firebasestorage.app",
  messagingSenderId: "417029078660",
  appId: "1:417029078660:web:00e23d79af77876e598cd1",
  measurementId: "G-653CL9XWFH"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const deleteVendorsCollection = async () => {
  try {
    console.log('=== vendors 컬렉션 삭제 시작 ===');
    
    // vendors 컬렉션의 모든 문서 조회
    const vendorsQuery = collection(db, 'vendors');
    const vendorsSnapshot = await getDocs(vendorsQuery);
    
    console.log(`총 ${vendorsSnapshot.docs.length}개의 vendors 문서를 삭제합니다.`);
    
    // 각 문서 삭제
    const deletePromises = vendorsSnapshot.docs.map(async (docSnapshot) => {
      const data = docSnapshot.data();
      console.log(`삭제 중: ${docSnapshot.id} - ${data.name || data.companyName || '이름 없음'}`);
      await deleteDoc(doc(db, 'vendors', docSnapshot.id));
    });
    
    await Promise.all(deletePromises);
    
    console.log('=== vendors 컬렉션 삭제 완료 ===');
    console.log(`총 ${vendorsSnapshot.docs.length}개의 문서가 삭제되었습니다.`);
    
  } catch (error) {
    console.error('vendors 컬렉션 삭제 중 오류 발생:', error);
  }
};

// 스크립트 실행
deleteVendorsCollection(); 
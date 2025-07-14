const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

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

const checkImportantSites = async () => {
  try {
    console.log('=== 주요현장 데이터 확인 ===');
    
    // 1. 모든 현장 조회
    const allSitesSnapshot = await getDocs(collection(db, 'sites'));
    console.log(`전체 현장 수: ${allSitesSnapshot.docs.length}개`);
    
    // 2. isFavorite가 true인 현장 조회
    const importantSitesQuery = query(collection(db, 'sites'), where('isFavorite', '==', true));
    const importantSitesSnapshot = await getDocs(importantSitesQuery);
    console.log(`주요현장 수: ${importantSitesSnapshot.docs.length}개`);
    
    // 3. isStarred가 true인 현장 조회 (기존 필드)
    const starredSitesQuery = query(collection(db, 'sites'), where('isStarred', '==', true));
    const starredSitesSnapshot = await getDocs(starredSitesQuery);
    console.log(`isStarred 현장 수: ${starredSitesSnapshot.docs.length}개`);
    
    // 4. 각 현장의 필드 상태 출력
    console.log('\n=== 현장별 필드 상태 ===');
    allSitesSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.name || '이름없음'}`);
      console.log(`   - isFavorite: ${data.isFavorite || false}`);
      console.log(`   - isStarred: ${data.isStarred || false}`);
      console.log(`   - ID: ${doc.id}`);
      console.log('');
    });
    
    // 5. 주요현장 목록 출력
    if (importantSitesSnapshot.docs.length > 0) {
      console.log('=== 주요현장 목록 ===');
      importantSitesSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. ${data.name} (ID: ${doc.id})`);
      });
    } else {
      console.log('⚠️  주요현장이 없습니다!');
    }
    
  } catch (error) {
    console.error('데이터 확인 중 오류 발생:', error);
  }
};

// 스크립트 실행
checkImportantSites(); 
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const migrateIsStarredToIsFavorite = async () => {
  try {
    console.log('마이그레이션 시작: isStarred → isFavorite');
    
    // 모든 sites 컬렉션 조회
    const sitesSnapshot = await getDocs(collection(db, 'sites'));
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const siteDoc of sitesSnapshot.docs) {
      const siteData = siteDoc.data();
      
      // isStarred 필드가 있고 isFavorite 필드가 없는 경우에만 마이그레이션
      if (siteData.hasOwnProperty('isStarred') && !siteData.hasOwnProperty('isFavorite')) {
        console.log(`마이그레이션 중: ${siteData.name} (ID: ${siteDoc.id})`);
        
        await updateDoc(doc(db, 'sites', siteDoc.id), {
          isFavorite: siteData.isStarred,
          // isStarred 필드는 제거하지 않고 유지 (하위 호환성)
        });
        
        updatedCount++;
      } else {
        skippedCount++;
      }
    }
    
    console.log(`마이그레이션 완료:`);
    console.log(`- 업데이트된 현장: ${updatedCount}개`);
    console.log(`- 건너뛴 현장: ${skippedCount}개`);
    console.log(`- 총 현장: ${sitesSnapshot.docs.length}개`);
    
  } catch (error) {
    console.error('마이그레이션 중 오류 발생:', error);
  }
};

// 스크립트 실행
migrateIsStarredToIsFavorite(); 
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

// Firebase 설정 (환경변수 사용)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const checkMexicanaSite = async () => {
  try {
    console.log('=== 멕시카나 현장 데이터 확인 ===');
    
    // 1. 멕시카나 현장 조회
    const mexicanaQuery = query(collection(db, 'sites'), where('name', '==', '멕시카나'));
    const mexicanaSnapshot = await getDocs(mexicanaQuery);
    
    if (mexicanaSnapshot.docs.length === 0) {
      console.log('❌ 멕시카나 현장을 찾을 수 없습니다.');
      
      // 2. 멕시카나가 포함된 모든 현장 조회
      const allSitesSnapshot = await getDocs(collection(db, 'sites'));
      const mexicanaSites = allSitesSnapshot.docs.filter(doc => 
        doc.data().name && doc.data().name.includes('멕시카나')
      );
      
      if (mexicanaSites.length > 0) {
        console.log('🔍 멕시카나가 포함된 현장들:');
        mexicanaSites.forEach((doc, index) => {
          const data = doc.data();
          console.log(`${index + 1}. ${data.name}`);
          console.log(`   - ID: ${doc.id}`);
          console.log(`   - endDate: ${data.endDate} (타입: ${typeof data.endDate})`);
          console.log(`   - isFavorite: ${data.isFavorite}`);
          console.log(`   - 전체 데이터:`, data);
          console.log('');
        });
      } else {
        console.log('❌ 멕시카나가 포함된 현장도 없습니다.');
      }
      
      return;
    }
    
    // 3. 멕시카나 현장 상세 정보 출력
    mexicanaSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`🔍 멕시카나 현장 ${index + 1}:`);
      console.log(`   - ID: ${doc.id}`);
      console.log(`   - 이름: ${data.name}`);
      console.log(`   - endDate: ${data.endDate} (타입: ${typeof data.endDate})`);
      console.log(`   - isFavorite: ${data.isFavorite}`);
      console.log(`   - 전체 데이터:`, data);
      console.log('');
      
      // 날짜 비교 테스트
      const today = new Date();
      let endDate;
      
      if (typeof data.endDate === 'string') {
        if (data.endDate.includes('-')) {
          endDate = new Date(data.endDate);
        } else if (data.endDate.includes('/')) {
          endDate = new Date(data.endDate);
        } else if (data.endDate.length === 8) {
          const year = data.endDate.substring(0, 4);
          const month = data.endDate.substring(4, 6);
          const day = data.endDate.substring(6, 8);
          endDate = new Date(`${year}-${month}-${day}`);
        } else {
          endDate = new Date(data.endDate);
        }
      } else if (data.endDate instanceof Date) {
        endDate = data.endDate;
      } else {
        endDate = data.endDate.toDate ? data.endDate.toDate() : new Date(data.endDate);
      }
      
      console.log(`   - today: ${today}`);
      console.log(`   - endDate 파싱: ${endDate}`);
      console.log(`   - 비교 결과: ${today <= endDate ? '표시됨' : '숨겨짐'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('데이터 확인 중 오류 발생:', error);
  }
};

// 스크립트 실행
checkMexicanaSite();

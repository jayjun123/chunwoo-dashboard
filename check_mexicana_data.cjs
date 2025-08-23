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

const checkMexicanaData = async () => {
  try {
    console.log('=== 멕시카나 현장 데이터 확인 ===');
    
    // 1. 멕시카나 현장 조회
    const mexicanaQuery = query(collection(db, 'sites'), where('name', '==', '멕시카나 지하 출입구 케노피'));
    const mexicanaSnapshot = await getDocs(mexicanaQuery);
    
    if (mexicanaSnapshot.empty) {
      console.log('❌ 멕시카나 현장을 찾을 수 없습니다.');
      
      // 모든 현장 조회
      const allSitesQuery = query(collection(db, 'sites'));
      const allSitesSnapshot = await getDocs(allSitesQuery);
      
      console.log('🔍 모든 현장 목록:');
      allSitesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`- ${data.name} (ID: ${doc.id})`);
        if (data.name && data.name.includes('멕시카나')) {
          console.log(`  멕시카나 관련 현장 발견:`, data);
        }
      });
      return;
    }
    
    mexicanaSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log('✅ 멕시카나 현장 데이터:');
      console.log('ID:', doc.id);
      console.log('전체 데이터:', JSON.stringify(data, null, 2));
      
      // 날짜 관련 필드 확인
      console.log('\n📅 날짜 관련 필드:');
      Object.keys(data).forEach(key => {
        if (key.toLowerCase().includes('date') || key.toLowerCase().includes('end') || key.toLowerCase().includes('finish')) {
          console.log(`${key}: ${data[key]} (타입: ${typeof data[key]})`);
        }
      });
      
      // 현재 날짜와 비교
      const today = new Date();
      console.log('\n📊 날짜 비교:');
      console.log('현재 날짜:', today);
      
      if (data.endDate) {
        const endDate = new Date(data.endDate + 'T00:00:00');
        console.log('종료 날짜:', endDate);
        console.log('비교 결과:', today > endDate ? '종료됨' : '진행중');
      }
      
      if (data.finishDate) {
        const finishDate = new Date(data.finishDate + 'T00:00:00');
        console.log('완료 날짜:', finishDate);
        console.log('비교 결과:', today > finishDate ? '종료됨' : '진행중');
      }
    });
    
  } catch (error) {
    console.error('오류 발생:', error);
  }
};

checkMexicanaData();

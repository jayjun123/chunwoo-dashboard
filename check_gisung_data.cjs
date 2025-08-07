const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBqBqBqBqBqBqBqBqBqBqBqBqBqBqBqBq",
  authDomain: "chunwoo-12345.firebaseapp.com",
  projectId: "chunwoo-12345",
  storageBucket: "chunwoo-12345.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijklmnop"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkGisungData() {
  try {
    console.log('🔍 기성 데이터 확인 시작...');
    
    // 전체 기성 데이터 가져오기
    const gisungCollection = collection(db, 'gisung');
    const q = query(gisungCollection);
    const gisungSnapshot = await getDocs(q);
    const gisungData = gisungSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log('📊 전체 기성 데이터:', gisungData.length, '개');
    
    // gisungMonth 값들 확인
    const gisungMonths = [...new Set(gisungData.map(g => g.gisungMonth))];
    console.log('📅 gisungMonth 값들:', gisungMonths);
    
    // 5월 데이터 확인
    const mayData = gisungData.filter(g => g.gisungMonth === '2025-05');
    console.log('📅 5월 데이터:', mayData.length, '개');
    
    if (mayData.length > 0) {
      console.log('📋 5월 데이터 샘플:', mayData.slice(0, 3));
    }
    
    // 다른 형식의 5월 데이터 확인
    const mayDataAlt1 = gisungData.filter(g => g.gisungMonth === '2025.05');
    const mayDataAlt2 = gisungData.filter(g => g.gisungMonth === '2025/05');
    const mayDataAlt3 = gisungData.filter(g => g.gisungMonth && g.gisungMonth.includes('2025') && g.gisungMonth.includes('05'));
    
    console.log('📅 2025.05 형식:', mayDataAlt1.length, '개');
    console.log('📅 2025/05 형식:', mayDataAlt2.length, '개');
    console.log('📅 2025-05 포함:', mayDataAlt3.length, '개');
    
    // 샘플 데이터의 전체 구조 확인
    if (gisungData.length > 0) {
      console.log('📋 첫 번째 데이터 구조:', gisungData[0]);
    }
    
  } catch (error) {
    console.error('❌ 데이터 확인 실패:', error);
  }
}

checkGisungData(); 
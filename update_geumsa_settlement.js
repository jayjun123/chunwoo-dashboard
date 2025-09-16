const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, query, where } = require('firebase/firestore');

// Firebase 설정
const firebaseConfig = {
  // 여기에 Firebase 설정을 추가하세요
  apiKey: "AIzaSyBvQZvQZvQZvQZvQZvQZvQZvQZvQZvQZvQ",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateGeumsaSettlement() {
  try {
    console.log('금사동 현장 찾는 중...');
    
    // 모든 현장 가져오기
    const sitesSnapshot = await getDocs(collection(db, 'sites'));
    const sites = sitesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // 금사동이 포함된 현장 찾기
    const geumsaSites = sites.filter(site => 
      site.name && site.name.includes('금사동')
    );
    
    console.log('금사동 현장들:', geumsaSites.map(s => s.name));
    
    if (geumsaSites.length === 0) {
      console.log('금사동 현장을 찾을 수 없습니다.');
      return;
    }
    
    // 각 금사동 현장의 정산을 ON으로 설정
    for (const site of geumsaSites) {
      console.log(`현장 "${site.name}" 정산을 ON으로 설정 중...`);
      
      await updateDoc(doc(db, 'sites', site.id), {
        settlementEnabled: true,
        settlementPageCreated: true,
        settlementUpdatedAt: new Date()
      });
      
      console.log(`현장 "${site.name}" 정산 설정 완료`);
    }
    
    console.log('모든 금사동 현장의 정산 설정이 완료되었습니다.');
    
  } catch (error) {
    console.error('오류 발생:', error);
  }
}

// 스크립트 실행
updateGeumsaSettlement();

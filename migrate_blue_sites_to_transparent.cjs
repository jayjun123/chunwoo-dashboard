const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc, query, where } = require('firebase/firestore');

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

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 파란색 색상들을 정의 (일반적인 파란색 계열)
const blueColors = [
  '#3b82f6',  // 기본 파란색
  '#2563eb',  // 진한 파란색
  '#1d4ed8',  // 더 진한 파란색
  '#1e40af',  // 매우 진한 파란색
  '#1e3a8a',  // 가장 진한 파란색
  '#0ea5e9',  // 하늘색
  '#0284c7',  // 진한 하늘색
  '#0369a1',  // 더 진한 하늘색
  '#075985',  // 매우 진한 하늘색
  '#0c4a6e',  // 가장 진한 하늘색
  '#06b6d4',  // 청록색
  '#0891b2',  // 진한 청록색
  '#0e7490',  // 더 진한 청록색
  '#155e75',  // 매우 진한 청록색
  '#164e63',  // 가장 진한 청록색
  '#8b5cf6',  // 보라색 (파란색과 유사)
  '#7c3aed',  // 진한 보라색
  '#6d28d9',  // 더 진한 보라색
  '#5b21b6',  // 매우 진한 보라색
  '#4c1d95',  // 가장 진한 보라색
  '#6366f1',  // 인디고색
  '#4f46e5',  // 진한 인디고색
  '#4338ca',  // 더 진한 인디고색
  '#3730a3',  // 매우 진한 인디고색
  '#312e81'   // 가장 진한 인디고색
];

async function migrateBlueSitesToTransparent() {
  try {
    console.log('🚀 파란색 현장들을 배경없음으로 마이그레이션 시작...');
    
    // sites 컬렉션에서 모든 현장 데이터 가져오기
    const sitesRef = collection(db, 'sites');
    const sitesSnapshot = await getDocs(sitesRef);
    
    if (sitesSnapshot.empty) {
      console.log('📝 현장 데이터가 없습니다.');
      return;
    }
    
    console.log(`📊 총 ${sitesSnapshot.size}개의 현장을 확인했습니다.`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // 각 현장을 확인하고 파란색인 경우 transparent로 변경
    for (const siteDoc of sitesSnapshot.docs) {
      const siteData = siteDoc.data();
      const siteId = siteDoc.id;
      const siteName = siteData.name || '이름없음';
      const currentColor = siteData.customColor;
      
      console.log(`\n🔍 현장 확인: ${siteName} (ID: ${siteId})`);
      console.log(`   현재 색상: ${currentColor || '설정되지 않음'}`);
      
      // customColor가 설정되어 있고 파란색 계열인 경우
      if (currentColor && blueColors.includes(currentColor.toLowerCase())) {
        console.log(`   🎨 파란색 감지! ${currentColor} → transparent로 변경`);
        
        try {
          // 색상을 transparent로 변경
          await updateDoc(doc(db, 'sites', siteId), {
            customColor: 'transparent',
            updatedAt: new Date()
          });
          
          console.log(`   ✅ 색상 변경 완료: ${siteName}`);
          updatedCount++;
        } catch (error) {
          console.error(`   ❌ 색상 변경 실패: ${siteName}`, error);
        }
      } else {
        console.log(`   ⏭️ 파란색이 아니거나 색상이 설정되지 않음 - 건너뜀`);
        skippedCount++;
      }
    }
    
    console.log('\n🎉 마이그레이션 완료!');
    console.log(`📊 결과 요약:`);
    console.log(`   - 변경된 현장: ${updatedCount}개`);
    console.log(`   - 건너뛴 현장: ${skippedCount}개`);
    console.log(`   - 총 현장: ${sitesSnapshot.size}개`);
    
    if (updatedCount > 0) {
      console.log('\n💡 변경된 현장들은 이제 배경색 없이 표시됩니다.');
      console.log('   필요시 일정관리에서 새로운 색상을 선택할 수 있습니다.');
    }
    
  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error);
  }
}

// 스크립트 실행
if (require.main === module) {
  migrateBlueSitesToTransparent()
    .then(() => {
      console.log('\n🏁 마이그레이션 스크립트 실행 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 마이그레이션 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

module.exports = { migrateBlueSitesToTransparent };

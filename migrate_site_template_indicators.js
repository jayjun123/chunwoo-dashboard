// 기존 현장들의 물량 데이터 개수에 따라 L/N 표시 마이그레이션
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// 현장 데이터에 templateType 필드 추가
const migrateSiteTemplateIndicators = async () => {
  try {
    console.log('🚀 현장 템플릿 표시 마이그레이션 시작...');
    
    // 모든 현장 데이터 가져오기
    const sitesSnapshot = await getDocs(collection(db, 'sites'));
    const sites = sitesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📊 총 ${sites.length}개의 현장 데이터 발견`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const site of sites) {
      try {
        console.log(`\n🔍 현장 처리 중: ${site.name || site.id}`);
        
        // 물량 데이터 개수 확인
        const items = site.items || [];
        const itemCount = items.length;
        
        // templateType 결정
        let templateType = 'N'; // 기본값
        if (itemCount > 20) {
          templateType = 'L';
        }
        
        console.log(`📋 물량 데이터: ${itemCount}개 → ${templateType} 템플릿`);
        
        // 이미 templateType이 설정되어 있고 변경사항이 없으면 스킵
        if (site.templateType === templateType) {
          console.log(`⏭️ 이미 올바른 templateType 설정됨: ${templateType}`);
          skippedCount++;
          continue;
        }
        
        // templateType 업데이트
        await updateDoc(doc(db, 'sites', site.id), {
          templateType: templateType,
          updatedAt: new Date()
        });
        
        console.log(`✅ templateType 업데이트 완료: ${templateType}`);
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ 현장 ${site.name || site.id} 처리 실패:`, error);
      }
    }
    
    console.log('\n🎉 마이그레이션 완료!');
    console.log(`📊 총 현장: ${sites.length}개`);
    console.log(`✅ 업데이트: ${updatedCount}개`);
    console.log(`⏭️ 스킵: ${skippedCount}개`);
    
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
  }
};

// 실행
migrateSiteTemplateIndicators();

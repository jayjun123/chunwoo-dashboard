// 영주자이시그니처 현장의 물량 데이터 확인
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './src/firebase.js';

const check영주자이시그니처 = async () => {
  try {
    console.log('🔍 영주자이시그니처 현장 데이터 확인 중...');
    
    // 1. 현장 정보 조회
    const sitesQuery = query(collection(db, 'sites'), where('name', '==', '영주자이시그니처'));
    const sitesSnapshot = await getDocs(sitesQuery);
    
    if (sitesSnapshot.empty) {
      console.log('❌ 영주자이시그니처 현장을 찾을 수 없습니다.');
      
      // 모든 현장 조회해서 비슷한 이름 찾기
      const allSitesSnapshot = await getDocs(collection(db, 'sites'));
      console.log('🔍 모든 현장 목록:');
      allSitesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.name && (data.name.includes('영주') || data.name.includes('자이') || data.name.includes('시그니처'))) {
          console.log(`  영주자이시그니처 관련 현장 발견:`, data);
        }
      });
      return;
    }
    
    const site = sitesSnapshot.docs[0];
    const siteData = site.data();
    
    console.log('✅ 영주자이시그니처 현장 발견:', {
      id: site.id,
      name: siteData.name,
      contractAmount: siteData.contractAmount,
      items: siteData.items ? siteData.items.length : 0,
      hasItems: !!siteData.items,
      itemsArray: Array.isArray(siteData.items)
    });
    
    // 2. 물량 데이터 상세 확인
    if (siteData.items && Array.isArray(siteData.items)) {
      console.log('📊 물량 데이터 상세:');
      siteData.items.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.name || '이름없음'} - ${item.specification || '규격없음'} - ${item.quantity || 0}${item.unit || ''}`);
      });
    } else {
      console.log('⚠️ 물량 데이터가 없거나 배열이 아닙니다:', siteData.items);
    }
    
    // 3. materialEstimates 컬렉션에서도 확인
    const materialQuery = query(collection(db, 'materialEstimates'), where('siteId', '==', site.id));
    const materialSnapshot = await getDocs(materialQuery);
    
    if (!materialSnapshot.empty) {
      const materialData = materialSnapshot.docs[0].data();
      console.log('📋 materialEstimates 컬렉션 데이터:', {
        siteId: materialData.siteId,
        siteName: materialData.siteName,
        itemsCount: materialData.items ? materialData.items.length : 0,
        summary: materialData.summary
      });
      
      if (materialData.items && Array.isArray(materialData.items)) {
        console.log('📊 materialEstimates 물량 데이터:');
        materialData.items.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.name || '이름없음'} - ${item.specification || '규격없음'} - ${item.quantity || 0}${item.unit || ''}`);
        });
      }
    } else {
      console.log('⚠️ materialEstimates 컬렉션에 데이터가 없습니다.');
    }
    
    // 4. 현장의 모든 필드 확인
    console.log('🔍 현장의 모든 필드:');
    Object.keys(siteData).forEach(key => {
      const value = siteData[key];
      if (Array.isArray(value)) {
        console.log(`  ${key}: 배열 (${value.length}개 항목)`);
      } else if (typeof value === 'object' && value !== null) {
        console.log(`  ${key}: 객체`, value);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    });
    
  } catch (error) {
    console.error('❌ 확인 실패:', error);
  }
};

// 전역 함수로 등록
window.check영주자이시그니처 = check영주자이시그니처;

console.log('✅ 영주자이시그니처 현장 확인 함수가 등록되었습니다.');
console.log('사용법: check영주자이시그니처()');

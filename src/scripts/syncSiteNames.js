import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';

// 현장명과 기성 데이터 동기화 스크립트
export const syncSiteNames = async () => {
  try {
    console.log('현장명 동기화 시작...');
    
    // 1. 모든 현장 데이터 조회
    const sitesSnapshot = await getDocs(collection(db, 'sites'));
    const sites = sitesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('현장 데이터:', sites.map(site => ({ id: site.id, name: site.name })));
    
    // 2. 모든 기성 데이터 조회
    const gisungSnapshot = await getDocs(collection(db, 'gisung'));
    const gisungData = gisungSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('기성 데이터:', gisungData.map(gisung => ({ id: gisung.id, name: gisung.name, siteId: gisung.siteId })));
    
    // 3. 현장명과 기성 데이터 매칭 및 업데이트
    const updatePromises = [];
    
    for (const gisung of gisungData) {
      // siteId로 현장 찾기
      const matchingSite = sites.find(site => site.id === gisung.siteId);
      
      if (matchingSite && gisung.name !== matchingSite.name) {
        console.log(`기성 데이터 업데이트: ${gisung.name} → ${matchingSite.name}`);
        
        updatePromises.push(
          updateDoc(doc(db, 'gisung', gisung.id), {
            name: matchingSite.name,
            updatedAt: new Date()
          })
        );
      }
    }
    
    // 4. 일괄 업데이트 실행
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      console.log(`${updatePromises.length}개의 기성 데이터 업데이트 완료`);
    } else {
      console.log('업데이트할 데이터가 없습니다.');
    }
    
    console.log('현장명 동기화 완료!');
    
  } catch (error) {
    console.error('현장명 동기화 실패:', error);
  }
};

// 스크립트 실행 (브라우저 콘솔에서 실행)
if (typeof window !== 'undefined') {
  window.syncSiteNames = syncSiteNames;
} 
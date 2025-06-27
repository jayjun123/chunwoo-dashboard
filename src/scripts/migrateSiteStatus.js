import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase.js';

// 상태값 마이그레이션 함수
export const migrateSiteStatus = async () => {
  try {
    console.log('현장 상태값 마이그레이션을 시작합니다...');
    
    const sitesSnapshot = await getDocs(collection(db, 'sites'));
    let updatedCount = 0;
    
    for (const siteDoc of sitesSnapshot.docs) {
      const siteData = siteDoc.data();
      let needsUpdate = false;
      let newStatus = siteData.status;
      
      // 기존 상태값을 새로운 옵션에 맞게 변경
      if (siteData.status === '진행') {
        newStatus = '진행중';
        needsUpdate = true;
      } else if (siteData.status === '예정') {
        newStatus = '계획';
        needsUpdate = true;
      }
      
      // 업데이트가 필요한 경우에만 실행
      if (needsUpdate) {
        await updateDoc(doc(db, 'sites', siteDoc.id), {
          status: newStatus,
          updatedAt: new Date()
        });
        updatedCount++;
        console.log(`현장 "${siteData.name}" 상태 업데이트: ${siteData.status} → ${newStatus}`);
      }
    }
    
    console.log(`마이그레이션 완료! ${updatedCount}개의 현장이 업데이트되었습니다.`);
    return updatedCount;
    
  } catch (error) {
    console.error('마이그레이션 중 오류 발생:', error);
    throw error;
  }
};

// 스크립트 실행 (개발 환경에서만)
if (process.env.NODE_ENV === 'development') {
  migrateSiteStatus()
    .then(count => {
      console.log(`총 ${count}개의 현장 상태가 업데이트되었습니다.`);
      process.exit(0);
    })
    .catch(error => {
      console.error('마이그레이션 실패:', error);
      process.exit(1);
    });
} 
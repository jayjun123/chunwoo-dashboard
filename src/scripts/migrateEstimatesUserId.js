import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, collections } from '../firebase';

// 기존 견적 데이터에 userId 필드 추가하는 마이그레이션 스크립트
export const migrateEstimatesUserId = async (targetUserId) => {
  try {
    console.log('견적 데이터 userId 마이그레이션 시작');
    
    // 모든 견적 데이터 가져오기
    const estimatesQuery = collection(db, collections.estimates);
    const querySnapshot = await getDocs(estimatesQuery);
    
    console.log(`총 ${querySnapshot.size}개의 견적 데이터 발견`);
    
    let updatedCount = 0;
    
    for (const docSnapshot of querySnapshot.docs) {
      const estimateData = docSnapshot.data();
      
      // userId가 없거나 빈 값인 경우에만 업데이트
      if (!estimateData.userId || estimateData.userId === '') {
        try {
          await updateDoc(doc(db, collections.estimates, docSnapshot.id), {
            userId: targetUserId,
            updatedAt: new Date()
          });
          updatedCount++;
          console.log(`견적 업데이트 완료: ${docSnapshot.id}`);
        } catch (error) {
          console.error(`견적 업데이트 실패: ${docSnapshot.id}`, error);
        }
      } else {
        console.log(`견적 이미 userId 있음: ${docSnapshot.id} (${estimateData.userId})`);
      }
    }
    
    console.log(`마이그레이션 완료: ${updatedCount}개 견적 업데이트됨`);
    return updatedCount;
    
  } catch (error) {
    console.error('견적 데이터 마이그레이션 실패:', error);
    throw error;
  }
};

// 브라우저에서 실행할 수 있는 함수
window.migrateEstimatesUserId = migrateEstimatesUserId; 
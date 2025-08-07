import { collection, getDocs, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

// 차수 계산 함수
const calculateSequence = (costs, siteName, itemType, currentDate) => {
  // 같은 현장, 같은 항목의 기존 데이터 필터링
  const sameSiteItemCosts = costs.filter(cost => 
    cost.site === siteName && cost.itemType === itemType
  );
  
  if (sameSiteItemCosts.length === 0) return '1차';
  
  // 날짜 순으로 정렬
  const sortedCosts = sameSiteItemCosts.sort((a, b) => {
    const dateA = new Date(a.date || 0);
    const dateB = new Date(b.date || 0);
    return dateA - dateB;
  });
  
  // 현재 날짜보다 이전인 항목들만 필터링
  const currentDateObj = new Date(currentDate);
  const previousCosts = sortedCosts.filter(cost => {
    const costDate = new Date(cost.date || 0);
    return costDate <= currentDateObj;
  });
  
  if (previousCosts.length === 0) return '1차';
  
  // 이전 항목들 중 가장 큰 차수 찾기
  let maxSequence = 0;
  previousCosts.forEach(cost => {
    const match = (cost.sequence || '').match(/(\d+)차/);
    if (match) {
      const sequenceNum = parseInt(match[1]);
      if (sequenceNum > maxSequence) {
        maxSequence = sequenceNum;
      }
    }
  });
  
  return `${maxSequence + 1}차`;
};

// 기존 지출 데이터에 차수 추가
export const addSequenceToCosts = async () => {
  try {
    console.log('지출 데이터 차수 추가 시작...');
    
    // 모든 지출 데이터 조회
    const costsSnapshot = await getDocs(collection(db, 'costs'));
    const costs = costsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('총 지출 데이터:', costs.length, '개');
    
    // 현장명과 항목별로 그룹화
    const groupedCosts = {};
    costs.forEach(cost => {
      const key = `${cost.site}_${cost.itemType}`;
      if (!groupedCosts[key]) {
        groupedCosts[key] = [];
      }
      groupedCosts[key].push(cost);
    });
    
    // 각 그룹별로 날짜 순 정렬 후 차수 계산
    const updatePromises = [];
    
    Object.keys(groupedCosts).forEach(key => {
      const [siteName, itemType] = key.split('_');
      const groupCosts = groupedCosts[key];
      
      // 날짜 순으로 정렬
      const sortedCosts = groupCosts.sort((a, b) => {
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateA - dateB;
      });
      
      // 각 항목에 차수 추가
      sortedCosts.forEach((cost, index) => {
        if (!cost.sequence) {
          const sequence = `${index + 1}차`;
          updatePromises.push(
            updateDoc(doc(db, 'costs', cost.id), {
              sequence: sequence,
              updatedAt: new Date()
            })
          );
          console.log(`${siteName} - ${itemType} - ${cost.date}: ${sequence}`);
        }
      });
    });
    
    // 일괄 업데이트 실행
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      console.log(`${updatePromises.length}개의 지출 데이터에 차수 추가 완료`);
    } else {
      console.log('차수가 이미 설정된 데이터만 존재합니다.');
    }
    
    console.log('지출 데이터 차수 추가 완료!');
    
  } catch (error) {
    console.error('지출 데이터 차수 추가 실패:', error);
  }
};

// 전역 함수로 노출 (브라우저 콘솔에서 실행 가능)
if (typeof window !== 'undefined') {
  window.addSequenceToCosts = addSequenceToCosts;
} 
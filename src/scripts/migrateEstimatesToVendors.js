import { collection, getDocs, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { db, collections } from '../firebase';

const migrateEstimatesToVendors = async () => {
  try {
    console.log('=== 견적 데이터 거래처 마이그레이션 시작 ===');
    
    // 1. 모든 견적 데이터 가져오기
    const estimatesQuery = query(collection(db, collections.estimates));
    const estimatesSnapshot = await getDocs(estimatesQuery);
    
    console.log(`총 ${estimatesSnapshot.size}개의 견적 데이터 발견`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // 2. 각 견적 데이터 처리
    for (const estimateDoc of estimatesSnapshot.docs) {
      const estimateData = estimateDoc.data();
      const { requester, company } = estimateData;
      
      try {
        // 의뢰자 처리
        if (requester && requester.trim()) {
          const parts = requester.trim().split(' ');
          const personName = parts[0];
          const title = parts.slice(1).join(' ');
          
          console.log(`견적 ID: ${estimateDoc.id}, 의뢰자: ${requester} -> 이름: ${personName}, 직함: ${title}`);
          
          // 기존에 같은 이름의 사람이 있는지 확인
          const existingQuery = query(
            collection(db, collections.vendors),
            where('name', '==', personName)
          );
          const existingSnapshot = await getDocs(existingQuery);
          
          if (existingSnapshot.empty) {
            // 새로운 거래처 추가
            await addDoc(collection(db, collections.vendors), {
              name: personName,
              title: title,
              fullName: requester.trim(),
              companyName: company && company.trim() ? company.trim() : '',
              createdAt: new Date(),
              updatedAt: new Date()
            });
            console.log(`새로운 거래처 추가: ${personName}`);
          } else {
            // 기존 거래처 업데이트
            const existingDoc = existingSnapshot.docs[0];
            await updateDoc(doc(db, collections.vendors, existingDoc.id), {
              title: title,
              fullName: requester.trim(),
              companyName: company && company.trim() ? company.trim() : '',
              updatedAt: new Date()
            });
            console.log(`기존 거래처 업데이트: ${personName}`);
          }
        }
        
        // 회사명 처리 (의뢰자와 다른 경우)
        if (company && company.trim()) {
          const parts = requester ? requester.trim().split(' ') : [];
          const personName = parts[0] || '';
          
          if (company.trim() !== personName) {
            console.log(`견적 ID: ${estimateDoc.id}, 회사명: ${company}`);
            
            // 기존에 같은 회사명이 있는지 확인
            const companyQuery = query(
              collection(db, collections.vendors),
              where('name', '==', company.trim())
            );
            const companySnapshot = await getDocs(companyQuery);
            
            if (companySnapshot.empty) {
              // 회사명을 별도 거래처로 추가
              await addDoc(collection(db, collections.vendors), {
                name: company.trim(),
                companyName: company.trim(),
                createdAt: new Date(),
                updatedAt: new Date()
              });
              console.log(`회사명을 별도 거래처로 추가: ${company}`);
            }
          }
        }
        
        successCount++;
      } catch (error) {
        console.error(`견적 ID ${estimateDoc.id} 처리 중 오류:`, error);
        errorCount++;
      }
    }
    
    console.log('=== 마이그레이션 완료 ===');
    console.log(`성공: ${successCount}개, 실패: ${errorCount}개`);
    
    return { successCount, errorCount };
  } catch (error) {
    console.error('마이그레이션 중 오류:', error);
    throw error;
  }
};

export default migrateEstimatesToVendors; 
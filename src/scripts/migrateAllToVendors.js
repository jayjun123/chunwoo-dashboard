import { collection, getDocs, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const migrateAllToVendors = async () => {
  try {
    console.log('=== 전체 데이터 거래처 마이그레이션 시작 ===');
    
    let totalSuccess = 0;
    let totalError = 0;
    
    // 1. 견적 데이터 마이그레이션
    console.log('--- 견적 데이터 마이그레이션 시작 ---');
    const estimatesQuery = query(collection(db, 'estimates'));
    const estimatesSnapshot = await getDocs(estimatesQuery);
    
    console.log(`총 ${estimatesSnapshot.size}개의 견적 데이터 발견`);
    
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
            collection(db, 'vendors'),
            where('name', '==', personName)
          );
          const existingSnapshot = await getDocs(existingQuery);
          
          if (existingSnapshot.empty) {
            // 새로운 거래처 추가
            await addDoc(collection(db, 'vendors'), {
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
            await updateDoc(doc(db, 'vendors', existingDoc.id), {
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
              collection(db, 'vendors'),
              where('name', '==', company.trim())
            );
            const companySnapshot = await getDocs(companyQuery);
            
            if (companySnapshot.empty) {
              // 회사명을 별도 거래처로 추가
              await addDoc(collection(db, 'vendors'), {
                name: company.trim(),
                companyName: company.trim(),
                createdAt: new Date(),
                updatedAt: new Date()
              });
              console.log(`회사명을 별도 거래처로 추가: ${company}`);
            }
          }
        }
        
        totalSuccess++;
      } catch (error) {
        console.error(`견적 ID ${estimateDoc.id} 처리 중 오류:`, error);
        totalError++;
      }
    }
    
    // 2. 현장 데이터 마이그레이션
    console.log('--- 현장 데이터 마이그레이션 시작 ---');
    const sitesQuery = query(collection(db, 'sites'));
    const sitesSnapshot = await getDocs(sitesQuery);
    
    console.log(`총 ${sitesSnapshot.size}개의 현장 데이터 발견`);
    
    for (const siteDoc of sitesSnapshot.docs) {
      const siteData = siteDoc.data();
      const { manager, name: siteName } = siteData;
      
      try {
        // 관리자 처리
        if (manager && manager.trim()) {
          const parts = manager.trim().split(' ');
          const personName = parts[0];
          const title = parts.slice(1).join(' ');
          
          console.log(`현장 ID: ${siteDoc.id}, 관리자: ${manager} -> 이름: ${personName}, 직함: ${title}`);
          
          // 기존에 같은 이름의 사람이 있는지 확인
          const existingQuery = query(
            collection(db, 'vendors'),
            where('name', '==', personName)
          );
          const existingSnapshot = await getDocs(existingQuery);
          
          if (existingSnapshot.empty) {
            // 새로운 거래처 추가
            await addDoc(collection(db, 'vendors'), {
              name: personName,
              title: title,
              fullName: manager.trim(),
              companyName: siteName && siteName.trim() ? siteName.trim() : '',
              createdAt: new Date(),
              updatedAt: new Date()
            });
            console.log(`새로운 거래처 추가: ${personName}`);
          } else {
            // 기존 거래처 업데이트
            const existingDoc = existingSnapshot.docs[0];
            await updateDoc(doc(db, 'vendors', existingDoc.id), {
              title: title,
              fullName: manager.trim(),
              companyName: siteName && siteName.trim() ? siteName.trim() : '',
              updatedAt: new Date()
            });
            console.log(`기존 거래처 업데이트: ${personName}`);
          }
        }
        
        // 현장명(회사명) 처리 (관리자와 다른 경우)
        if (siteName && siteName.trim()) {
          const parts = manager ? manager.trim().split(' ') : [];
          const personName = parts[0] || '';
          
          if (siteName.trim() !== personName) {
            console.log(`현장 ID: ${siteDoc.id}, 현장명: ${siteName}`);
            
            // 기존에 같은 현장명이 있는지 확인
            const siteNameQuery = query(
              collection(db, 'vendors'),
              where('name', '==', siteName.trim())
            );
            const siteNameSnapshot = await getDocs(siteNameQuery);
            
            if (siteNameSnapshot.empty) {
              // 현장명을 별도 거래처로 추가
              await addDoc(collection(db, 'vendors'), {
                name: siteName.trim(),
                companyName: siteName.trim(),
                createdAt: new Date(),
                updatedAt: new Date()
              });
              console.log(`현장명을 별도 거래처로 추가: ${siteName}`);
            }
          }
        }
        
        totalSuccess++;
      } catch (error) {
        console.error(`현장 ID ${siteDoc.id} 처리 중 오류:`, error);
        totalError++;
      }
    }
    
    console.log('=== 전체 마이그레이션 완료 ===');
    console.log(`총 성공: ${totalSuccess}개, 총 실패: ${totalError}개`);
    
    return { totalSuccess, totalError };
  } catch (error) {
    console.error('전체 마이그레이션 중 오류:', error);
    throw error;
  }
};

export default migrateAllToVendors; 
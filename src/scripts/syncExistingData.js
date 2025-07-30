import { collection, getDocs, addDoc, updateDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const syncExistingData = async () => {
  try {
    console.log('=== 기존 데이터 연동 시작 ===');
    
    // 1. 기존 vendors 컬렉션에서 데이터 가져오기
    console.log('1. vendors 컬렉션에서 데이터 가져오기...');
    const vendorsQuery = query(collection(db, 'vendors'), orderBy('name', 'asc'));
    const vendorsSnapshot = await getDocs(vendorsQuery);
    
    let vendorsCount = 0;
    for (const vendorDoc of vendorsSnapshot.docs) {
      const vendorData = vendorDoc.data();
      if (vendorData.name && vendorData.name.trim()) {
        try {
          const requesterData = {
            name: vendorData.name.trim(),
            title: vendorData.position && vendorData.position.trim() ? vendorData.position.trim() : '',
            fullName: vendorData.position && vendorData.position.trim() ? 
              `${vendorData.name.trim()} ${vendorData.position.trim()}` : vendorData.name.trim(),
            company: vendorData.companyName && vendorData.companyName.trim() ? vendorData.companyName.trim() : '',
            source: 'vendor_management_sync',
            createdAt: vendorData.createdAt || new Date(),
            updatedAt: new Date()
          };
          
          // 기존에 같은 이름의 의뢰자가 있는지 확인
          const existingQuery = query(
            collection(db, 'requesters'),
            where('name', '==', vendorData.name.trim())
          );
          const existingSnapshot = await getDocs(existingQuery);
          
          if (existingSnapshot.empty) {
            await addDoc(collection(db, 'requesters'), requesterData);
            vendorsCount++;
            console.log(`vendors에서 의뢰자 추가: ${vendorData.name}`);
          }
        } catch (error) {
          console.error(`vendors 데이터 처리 오류 (${vendorData.name}):`, error);
        }
      }
    }
    
    // 2. 기존 sites 컬렉션에서 데이터 가져오기
    console.log('2. sites 컬렉션에서 데이터 가져오기...');
    const sitesQuery = query(collection(db, 'sites'), orderBy('name', 'asc'));
    const sitesSnapshot = await getDocs(sitesQuery);
    
    let sitesCount = 0;
    for (const siteDoc of sitesSnapshot.docs) {
      const siteData = siteDoc.data();
      if (siteData.manager && siteData.manager.trim()) {
        try {
          const requesterData = {
            name: siteData.manager.trim(),
            title: '',
            fullName: siteData.manager.trim(),
            company: siteData.companyName && siteData.companyName.trim() ? siteData.companyName.trim() : '',
            source: 'sites_sync',
            createdAt: siteData.createdAt || new Date(),
            updatedAt: new Date()
          };
          
          // 기존에 같은 이름의 의뢰자가 있는지 확인
          const existingQuery = query(
            collection(db, 'requesters'),
            where('name', '==', siteData.manager.trim())
          );
          const existingSnapshot = await getDocs(existingQuery);
          
          if (existingSnapshot.empty) {
            await addDoc(collection(db, 'requesters'), requesterData);
            sitesCount++;
            console.log(`sites에서 의뢰자 추가: ${siteData.manager}`);
          }
        } catch (error) {
          console.error(`sites 데이터 처리 오류 (${siteData.manager}):`, error);
        }
      }
    }
    
    // 3. 기존 estimates 컬렉션에서 데이터 가져오기
    console.log('3. estimates 컬렉션에서 데이터 가져오기...');
    const estimatesQuery = query(collection(db, 'estimates'), orderBy('receptionDate', 'desc'));
    const estimatesSnapshot = await getDocs(estimatesQuery);
    
    let estimatesCount = 0;
    for (const estimateDoc of estimatesSnapshot.docs) {
      const estimateData = estimateDoc.data();
      if (estimateData.requester && estimateData.requester.trim()) {
        try {
          // 의뢰자에서 이름과 직위 분리
          const parts = estimateData.requester.trim().split(' ');
          const personName = parts[0];
          const title = parts.length >= 2 ? parts.slice(1).join(' ') : '';
          
          const requesterData = {
            name: personName,
            title: title,
            fullName: estimateData.requester.trim(),
            company: estimateData.company && estimateData.company.trim() ? estimateData.company.trim() : '',
            source: 'estimates_sync',
            createdAt: estimateData.createdAt || new Date(),
            updatedAt: new Date()
          };
          
          // 기존에 같은 이름의 의뢰자가 있는지 확인
          const existingQuery = query(
            collection(db, 'requesters'),
            where('name', '==', personName)
          );
          const existingSnapshot = await getDocs(existingQuery);
          
          if (existingSnapshot.empty) {
            await addDoc(collection(db, 'requesters'), requesterData);
            estimatesCount++;
            console.log(`estimates에서 의뢰자 추가: ${personName}`);
          }
        } catch (error) {
          console.error(`estimates 데이터 처리 오류 (${estimateData.requester}):`, error);
        }
      }
    }
    
    console.log('=== 기존 데이터 연동 완료 ===');
    console.log(`총 ${vendorsCount + sitesCount + estimatesCount}개의 의뢰자 데이터가 연동되었습니다.`);
    console.log(`- vendors에서: ${vendorsCount}개`);
    console.log(`- sites에서: ${sitesCount}개`);
    console.log(`- estimates에서: ${estimatesCount}개`);
    
  } catch (error) {
    console.error('기존 데이터 연동 중 오류 발생:', error);
  }
};

// 스크립트 실행
syncExistingData(); 
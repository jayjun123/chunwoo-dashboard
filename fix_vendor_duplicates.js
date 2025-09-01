const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy } = require('firebase/firestore');

// Firebase 설정
const firebaseConfig = {
  // 여기에 Firebase 설정을 입력하세요
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 거래처 중복 데이터 정리 함수
async function fixVendorDuplicates() {
  try {
    console.log('=== 거래처 중복 데이터 정리 시작 ===');
    
    // vendors 컬렉션에서 모든 데이터 가져오기
    const vendorsQuery = query(collection(db, 'vendors'), orderBy('createdAt', 'desc'));
    const vendorsSnapshot = await getDocs(vendorsQuery);
    
    if (vendorsSnapshot.empty) {
      console.log('거래처 데이터가 없습니다.');
      return;
    }
    
    const vendors = vendorsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`총 ${vendors.length}개의 거래처 데이터를 확인합니다.`);
    
    // 중복 데이터 찾기
    const duplicates = [];
    const seen = new Map();
    
    vendors.forEach(vendor => {
      // 이름 + 직위 + 회사명으로 중복 체크
      const key = `${vendor.name || ''}-${vendor.position || ''}-${vendor.companyName || ''}`;
      
      if (seen.has(key)) {
        duplicates.push({
          original: seen.get(key),
          duplicate: vendor,
          key: key
        });
      } else {
        seen.set(key, vendor);
      }
    });
    
    console.log(`중복 데이터 ${duplicates.length}개를 발견했습니다.`);
    
    if (duplicates.length === 0) {
      console.log('중복 데이터가 없습니다.');
      return;
    }
    
    // 중복 데이터 정리
    for (const duplicate of duplicates) {
      console.log(`\n중복 데이터 처리 중:`);
      console.log(`  원본: ${duplicate.original.name} ${duplicate.original.position} (${duplicate.original.companyName})`);
      console.log(`  중복: ${duplicate.duplicate.name} ${duplicate.duplicate.position} (${duplicate.duplicate.companyName})`);
      
      // 더 많은 정보를 가진 데이터를 유지하고 중복 데이터 삭제
      const originalInfo = Object.values(duplicate.original).filter(v => v && v.toString().trim()).length;
      const duplicateInfo = Object.values(duplicate.duplicate).filter(v => v && v.toString().trim()).length;
      
      if (duplicateInfo > originalInfo) {
        // 중복 데이터가 더 많은 정보를 가지고 있으면 원본을 업데이트
        console.log(`  중복 데이터가 더 많은 정보를 가지고 있어 원본을 업데이트합니다.`);
        await updateDoc(doc(db, 'vendors', duplicate.original.id), duplicate.duplicate);
        await deleteDoc(doc(db, 'vendors', duplicate.duplicate.id));
      } else {
        // 원본 데이터를 유지하고 중복 데이터 삭제
        console.log(`  원본 데이터를 유지하고 중복 데이터를 삭제합니다.`);
        await deleteDoc(doc(db, 'vendors', duplicate.duplicate.id));
      }
    }
    
    console.log('\n=== 거래처 중복 데이터 정리 완료 ===');
    
    // 정리 후 데이터 확인
    const finalVendorsSnapshot = await getDocs(query(collection(db, 'vendors'), orderBy('createdAt', 'desc')));
    const finalVendors = finalVendorsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`정리 후 총 ${finalVendors.length}개의 거래처 데이터가 남았습니다.`);
    
    // 데이터 샘플 출력
    console.log('\n정리된 데이터 샘플:');
    finalVendors.slice(0, 5).forEach((vendor, index) => {
      console.log(`${index + 1}. ${vendor.name} ${vendor.position} (${vendor.companyName})`);
    });
    
  } catch (error) {
    console.error('거래처 중복 데이터 정리 중 오류 발생:', error);
  }
}

// 견적페이지 의뢰자 데이터도 정리
async function fixRequesterDuplicates() {
  try {
    console.log('\n=== 견적페이지 의뢰자 중복 데이터 정리 시작 ===');
    
    const requestersQuery = query(collection(db, 'requesters'), orderBy('createdAt', 'desc'));
    const requestersSnapshot = await getDocs(requestersQuery);
    
    if (requestersSnapshot.empty) {
      console.log('의뢰자 데이터가 없습니다.');
      return;
    }
    
    const requesters = requestersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`총 ${requesters.length}개의 의뢰자 데이터를 확인합니다.`);
    
    // 중복 데이터 찾기 (이름 + 회사명으로)
    const duplicates = [];
    const seen = new Map();
    
    requesters.forEach(requester => {
      const key = `${requester.name || ''}-${requester.company || ''}`;
      
      if (seen.has(key)) {
        duplicates.push({
          original: seen.get(key),
          duplicate: requester,
          key: key
        });
      } else {
        seen.set(key, requester);
      }
    });
    
    console.log(`중복 의뢰자 데이터 ${duplicates.length}개를 발견했습니다.`);
    
    if (duplicates.length === 0) {
      console.log('중복 의뢰자 데이터가 없습니다.');
      return;
    }
    
    // 중복 데이터 정리
    for (const duplicate of duplicates) {
      console.log(`\n중복 의뢰자 데이터 처리 중:`);
      console.log(`  원본: ${duplicate.original.name} (${duplicate.original.company})`);
      console.log(`  중복: ${duplicate.duplicate.name} (${duplicate.duplicate.company})`);
      
      // 더 많은 정보를 가진 데이터를 유지하고 중복 데이터 삭제
      const originalInfo = Object.values(duplicate.original).filter(v => v && v.toString().trim()).length;
      const duplicateInfo = Object.values(duplicate.duplicate).filter(v => v && v.toString().trim()).length;
      
      if (duplicateInfo > originalInfo) {
        console.log(`  중복 데이터가 더 많은 정보를 가지고 있어 원본을 업데이트합니다.`);
        await updateDoc(doc(db, 'requesters', duplicate.original.id), duplicate.duplicate);
        await deleteDoc(doc(db, 'requesters', duplicate.duplicate.id));
      } else {
        console.log(`  원본 데이터를 유지하고 중복 데이터를 삭제합니다.`);
        await deleteDoc(doc(db, 'requesters', duplicate.duplicate.id));
      }
    }
    
    console.log('\n=== 견적페이지 의뢰자 중복 데이터 정리 완료 ===');
    
  } catch (error) {
    console.error('의뢰자 중복 데이터 정리 중 오류 발생:', error);
  }
}

// 메인 실행 함수
async function main() {
  try {
    await fixVendorDuplicates();
    await fixRequesterDuplicates();
    console.log('\n🎉 모든 중복 데이터 정리가 완료되었습니다!');
  } catch (error) {
    console.error('❌ 중복 데이터 정리 중 오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = { fixVendorDuplicates, fixRequesterDuplicates };

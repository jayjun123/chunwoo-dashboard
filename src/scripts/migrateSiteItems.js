import { collection, getDocs, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';

// 기존 물량데이터를 새로운 siteItems 컬렉션으로 마이그레이션
export const migrateSiteItems = async () => {
  try {
    console.log('🚀 물량데이터 마이그레이션 시작...');
    
    // sites 컬렉션에서 모든 현장 데이터 가져오기
    const sitesSnapshot = await getDocs(collection(db, 'sites'));
    const sites = sitesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`📊 총 ${sites.length}개 현장 발견`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const site of sites) {
      console.log(`🔍 현장 처리 중: ${site.name} (${site.id})`);
      
      // 기존 items 필드가 있는지 확인
      if (site.items && Array.isArray(site.items) && site.items.length > 0) {
        console.log(`  - 기존 물량데이터 발견: ${site.items.length}개 항목`);
        
        try {
          // 기존 siteItems 데이터 삭제 (중복 방지)
          const existingItemsQuery = query(
            collection(db, 'siteItems'), 
            where('siteId', '==', site.id)
          );
          const existingItemsSnapshot = await getDocs(existingItemsQuery);
          
          if (!existingItemsSnapshot.empty) {
            console.log(`  - 기존 siteItems 데이터 삭제 중: ${existingItemsSnapshot.size}개`);
            const deletePromises = existingItemsSnapshot.docs.map(doc => 
              deleteDoc(doc.ref)
            );
            await Promise.all(deletePromises);
          }
          
          // 새로운 siteItems 컬렉션에 데이터 저장
          const savePromises = site.items.map((item, index) => {
            const itemData = {
              siteId: site.id,
              siteName: site.name,
              name: item.name || '',
              specification: item.specification || '',
              unit: item.unit || '',
              quantity: Number(item.quantity) || 0,
              price: Number(item.price) || 0,
              unitPrice: Number(item.unitPrice || item.price) || 0,
              sequence: index + 1,
              createdAt: new Date(),
              updatedAt: new Date(),
              migrated: true // 마이그레이션 표시
            };
            return addDoc(collection(db, 'siteItems'), itemData);
          });
          
          await Promise.all(savePromises);
          
          // 현장 데이터 업데이트 (items 필드 제거, 참조 정보 추가)
          await updateDoc(doc(db, 'sites', site.id), {
            hasItems: true,
            itemCount: site.items.length,
            itemsMigrated: true,
            updatedAt: new Date()
          });
          
          console.log(`  ✅ 마이그레이션 완료: ${site.items.length}개 항목`);
          migratedCount++;
          
        } catch (error) {
          console.error(`  ❌ 마이그레이션 실패: ${site.name}`, error);
        }
      } else {
        console.log(`  - 물량데이터 없음, 건너뜀`);
        skippedCount++;
      }
    }
    
    console.log('🎉 마이그레이션 완료!');
    console.log(`📊 결과:`);
    console.log(`  - 마이그레이션된 현장: ${migratedCount}개`);
    console.log(`  - 건너뛴 현장: ${skippedCount}개`);
    console.log(`  - 총 처리된 현장: ${migratedCount + skippedCount}개`);
    
    return { migratedCount, skippedCount };
    
  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error);
    throw error;
  }
};

// 마이그레이션 실행 (브라우저 콘솔에서 호출)
if (typeof window !== 'undefined') {
  window.migrateSiteItems = migrateSiteItems;
} 
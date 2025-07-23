import { db } from '../firebase.js';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

// 현장 상태 마이그레이션 함수
export const migrateSiteStatus = async () => {
  try {
    console.log('🚀 현장 상태 마이그레이션 시작...');
    
    // 모든 현장 데이터 가져오기
    const sitesSnapshot = await getDocs(collection(db, 'sites'));
    const sites = sitesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📊 총 ${sites.length}개의 현장 발견`);
    
    // '진행상황' 상태인 현장들 찾기
    const sitesToUpdate = sites.filter(site => site.status === '진행상황');
    
    console.log(`🔄 '진행상황' 상태인 현장 ${sitesToUpdate.length}개 발견`);
    
    if (sitesToUpdate.length === 0) {
      console.log('✅ 업데이트할 현장이 없습니다.');
      return;
    }
    
    // 각 현장의 상태를 '예정'으로 변경
    const updatePromises = sitesToUpdate.map(async (site) => {
      try {
        const siteRef = doc(db, 'sites', site.id);
        await updateDoc(siteRef, {
          status: '예정',
          updatedAt: new Date()
        });
        console.log(`✅ ${site.name} (${site.id}): 진행상황 → 예정`);
        return { success: true, siteId: site.id, siteName: site.name };
      } catch (error) {
        console.error(`❌ ${site.name} (${site.id}) 업데이트 실패:`, error);
        return { success: false, siteId: site.id, siteName: site.name, error };
      }
    });
    
    const results = await Promise.all(updatePromises);
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log('\n📈 마이그레이션 결과:');
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${failCount}개`);
    
    if (failCount > 0) {
      console.log('\n❌ 실패한 현장들:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.siteName} (${r.siteId}): ${r.error?.message}`);
      });
    }
    
    console.log('\n🎉 현장 상태 마이그레이션 완료!');
    
    // 성공한 경우 페이지 새로고침
    if (successCount > 0) {
      setTimeout(() => {
        if (confirm('마이그레이션이 완료되었습니다. 페이지를 새로고침하시겠습니까?')) {
          window.location.reload();
        }
      }, 1000);
    }
    
  } catch (error) {
    console.error('💥 마이그레이션 중 오류 발생:', error);
  }
};

// 전역 함수로 등록 (브라우저 콘솔에서 실행 가능)
if (typeof window !== 'undefined') {
  window.migrateSiteStatus = migrateSiteStatus;
  console.log('🔧 마이그레이션 함수가 등록되었습니다. 브라우저 콘솔에서 migrateSiteStatus()를 실행하세요.');
} 
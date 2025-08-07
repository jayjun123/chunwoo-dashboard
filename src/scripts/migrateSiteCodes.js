import { collection, getDocs, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

// 기존 현장들에 고유 번호 추가
export const migrateSiteCodes = async () => {
  try {
    console.log('🚀 현장 고유번호 마이그레이션 시작...');
    
    // sites 컬렉션에서 모든 현장 데이터 가져오기
    const sitesSnapshot = await getDocs(collection(db, 'sites'));
    const sites = sitesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`📊 총 ${sites.length}개 현장 발견`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // 고유번호가 없는 현장들만 필터링
    const sitesWithoutCode = sites.filter(site => !site.siteCode);
    console.log(`📊 고유번호가 없는 현장: ${sitesWithoutCode.length}개`);
    
    for (const site of sitesWithoutCode) {
      console.log(`🔍 현장 처리 중: ${site.name} (${site.id})`);
      
      try {
        // 고유번호 생성 (현장명 기반)
        const siteCode = generateSiteCodeFromName(site.name, site.id);
        
        // 현장 데이터 업데이트
        await updateDoc(doc(db, 'sites', site.id), {
          siteCode: siteCode,
          updatedAt: new Date().toISOString()
        });
        
        console.log(`  ✅ 고유번호 추가 완료: ${siteCode}`);
        updatedCount++;
        
      } catch (error) {
        console.error(`  ❌ 고유번호 추가 실패: ${site.name}`, error);
      }
    }
    
    // 이미 고유번호가 있는 현장들
    const sitesWithCode = sites.filter(site => site.siteCode);
    skippedCount = sitesWithCode.length;
    
    console.log('🎉 고유번호 마이그레이션 완료!');
    console.log(`📊 결과:`);
    console.log(`  - 고유번호 추가된 현장: ${updatedCount}개`);
    console.log(`  - 이미 고유번호가 있는 현장: ${skippedCount}개`);
    console.log(`  - 총 처리된 현장: ${updatedCount + skippedCount}개`);
    
    return { updatedCount, skippedCount };
    
  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error);
    throw error;
  }
};

// 현장명과 ID를 기반으로 고유번호 생성
const generateSiteCodeFromName = (siteName, siteId) => {
  if (!siteName) {
    return `SITE${siteId.slice(-6)}`;
  }
  
  // 현장명에서 첫 글자 추출
  const firstChar = siteName.charAt(0);
  
  // 현장명에서 숫자 추출
  const numbers = siteName.match(/\d+/g);
  const numberPart = numbers ? numbers[0] : '001';
  
  // ID의 마지막 3자리
  const idSuffix = siteId.slice(-3);
  
  // 고유번호 생성 (예: A001-123)
  return `${firstChar}${numberPart.padStart(3, '0')}-${idSuffix}`;
};

// 마이그레이션 실행 (브라우저 콘솔에서 호출)
if (typeof window !== 'undefined') {
  window.migrateSiteCodes = migrateSiteCodes;
} 
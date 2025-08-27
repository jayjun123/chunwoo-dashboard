// 현장의 templateType 필드 상태 확인
import { collection, getDocs } from 'firebase/firestore';
import { db } from './src/firebase.js';

const checkTemplateTypes = async () => {
  try {
    console.log('🔍 현장 templateType 상태 확인 중...');
    
    // 모든 현장 데이터 가져오기
    const sitesSnapshot = await getDocs(collection(db, 'sites'));
    const sites = sitesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📊 총 ${sites.length}개의 현장 데이터 발견`);
    
    // 꿀벌 현장 찾기
    const honeybeeSite = sites.find(site => 
      site.name && site.name.includes('꿀벌')
    );
    
    if (honeybeeSite) {
      console.log('\n🍯 꿀벌 현장 정보:');
      console.log('현장명:', honeybeeSite.name);
      console.log('물량 데이터 개수:', honeybeeSite.items ? honeybeeSite.items.length : 0);
      console.log('templateType 필드:', honeybeeSite.templateType || '설정되지 않음');
      console.log('물량 데이터:', honeybeeSite.items);
    }
    
    // templateType이 설정되지 않은 현장들
    const sitesWithoutTemplateType = sites.filter(site => !site.templateType);
    console.log(`\n⚠️ templateType이 설정되지 않은 현장: ${sitesWithoutTemplateType.length}개`);
    
    sitesWithoutTemplateType.forEach(site => {
      const itemCount = site.items ? site.items.length : 0;
      console.log(`- ${site.name}: ${itemCount}개 물량 (templateType: ${site.templateType || '없음'})`);
    });
    
  } catch (error) {
    console.error('❌ 확인 실패:', error);
  }
};

// 전역 함수로 등록
window.checkTemplateTypes = checkTemplateTypes;

console.log('✅ 확인 스크립트 로드 완료');
console.log('🚀 브라우저 콘솔에서 다음 명령어를 실행하세요:');
console.log('checkTemplateTypes()');


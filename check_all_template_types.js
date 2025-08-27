// 모든 현장의 templateType 확인
import { collection, getDocs } from 'firebase/firestore';
import { db } from './src/firebase.js';

const checkAllTemplateTypes = async () => {
  try {
    console.log('🔍 모든 현장의 templateType 확인 중...');
    
    // 모든 현장 데이터 가져오기
    const sitesSnapshot = await getDocs(collection(db, 'sites'));
    const sites = sitesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📊 총 ${sites.length}개의 현장 데이터 발견`);
    
    // templateType별 분류
    const nTemplates = sites.filter(site => site.templateType === 'N');
    const lTemplates = sites.filter(site => site.templateType === 'L');
    const noTemplate = sites.filter(site => !site.templateType);
    
    console.log('\n📋 templateType 분류:');
    console.log(`- N 템플릿: ${nTemplates.length}개`);
    console.log(`- L 템플릿: ${lTemplates.length}개`);
    console.log(`- 설정 안됨: ${noTemplate.length}개`);
    
    // N 템플릿 현장들
    if (nTemplates.length > 0) {
      console.log('\n🟢 N 템플릿 현장들:');
      nTemplates.forEach(site => {
        const itemCount = site.items ? site.items.length : 0;
        console.log(`- ${site.name}: ${itemCount}개 물량`);
      });
    }
    
    // L 템플릿 현장들
    if (lTemplates.length > 0) {
      console.log('\n🟠 L 템플릿 현장들:');
      lTemplates.forEach(site => {
        const itemCount = site.items ? site.items.length : 0;
        console.log(`- ${site.name}: ${itemCount}개 물량`);
      });
    }
    
    // templateType이 없는 현장들
    if (noTemplate.length > 0) {
      console.log('\n⚠️ templateType이 설정되지 않은 현장들:');
      noTemplate.forEach(site => {
        const itemCount = site.items ? site.items.length : 0;
        console.log(`- ${site.name}: ${itemCount}개 물량`);
      });
    }
    
    // 문제 진단
    if (lTemplates.length === sites.length) {
      console.log('\n❌ 문제 발견: 모든 현장이 L 템플릿으로 설정됨!');
      console.log('🔧 해결방법: L/N 업데이트 버튼을 다시 클릭하세요.');
    } else if (noTemplate.length > 0) {
      console.log('\n⚠️ 문제 발견: templateType이 설정되지 않은 현장이 있음!');
      console.log('🔧 해결방법: L/N 업데이트 버튼을 클릭하세요.');
    } else {
      console.log('\n✅ 정상: N/L 템플릿이 적절히 분류됨');
    }
    
  } catch (error) {
    console.error('❌ 확인 실패:', error);
  }
};

// 전역 함수로 등록
window.checkAllTemplateTypes = checkAllTemplateTypes;

console.log('✅ templateType 확인 스크립트 로드 완료');
console.log('🚀 브라우저 콘솔에서 다음 명령어를 실행하세요:');
console.log('checkAllTemplateTypes()');


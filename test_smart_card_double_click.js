// 스마트카드 더블클릭 기능 테스트 스크립트
// 브라우저 콘솔에서 실행하세요

const testSmartCardDoubleClick = () => {
  console.log('🔍 스마트카드 더블클릭 기능 테스트 시작...');
  
  // 1. 현장명이 표시된 요소들 찾기
  const siteNameElements = document.querySelectorAll('td, .MuiTypography-root');
  const siteNameTexts = [];
  
  siteNameElements.forEach(element => {
    const text = element.textContent?.trim();
    if (text && text.length > 0 && text.length < 50) {
      siteNameTexts.push({
        element: element,
        text: text
      });
    }
  });
  
  console.log('📊 발견된 현장명 요소들:', siteNameTexts.length + '개');
  siteNameTexts.slice(0, 5).forEach((item, index) => {
    console.log(`  ${index + 1}. "${item.text}"`);
  });
  
  // 2. 더블클릭 이벤트 리스너 확인
  const elementsWithDoubleClick = [];
  siteNameTexts.forEach(item => {
    const listeners = getEventListeners ? getEventListeners(item.element) : null;
    if (listeners && listeners.dblclick) {
      elementsWithDoubleClick.push(item);
    }
  });
  
  console.log('🔍 더블클릭 이벤트가 설정된 요소들:', elementsWithDoubleClick.length + '개');
  
  // 3. 테스트 더블클릭 시뮬레이션
  if (siteNameTexts.length > 0) {
    const testElement = siteNameTexts[0];
    console.log(`🖱️ 테스트 더블클릭 시뮬레이션: "${testElement.text}"`);
    
    const doubleClickEvent = new MouseEvent('dblclick', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    
    testElement.element.dispatchEvent(doubleClickEvent);
    console.log('✅ 더블클릭 이벤트 발생 완료');
  }
  
  // 4. SiteInfoPopup 컴포넌트 확인
  const popupElements = document.querySelectorAll('[role="dialog"], .MuiDialog-root');
  console.log('🔍 발견된 팝업 요소들:', popupElements.length + '개');
  
  popupElements.forEach((popup, index) => {
    console.log(`  ${index + 1}. ${popup.className || popup.tagName}`);
  });
  
  console.log('🎯 테스트 완료!');
  console.log('💡 팁: 더블클릭 후 팝업이 나타나는지 확인해보세요.');
};

// 테스트 실행
testSmartCardDoubleClick();





// 스마트카드 더블클릭 기능 테스트 스크립트
// 브라우저 콘솔에서 실행하세요

const testSmartCardDoubleClick = () => {
  console.log('🔍 스마트카드 더블클릭 기능 테스트 시작...');
  
  // 1. 현장 카드 요소들 찾기
  const siteCards = document.querySelectorAll('[onDoubleClick*="handleSiteDoubleClick"]');
  console.log(`📊 발견된 현장 카드 개수: ${siteCards.length}개`);
  
  if (siteCards.length === 0) {
    console.log('⚠️ 현장 카드를 찾을 수 없습니다. 일정관리 페이지에서 실행해주세요.');
    return;
  }
  
  // 2. 각 카드의 더블클릭 이벤트 확인
  siteCards.forEach((card, index) => {
    console.log(`🔍 카드 ${index + 1}:`, {
      element: card,
      hasDoubleClick: !!card.onDoubleClick,
      textContent: card.textContent?.trim().substring(0, 50) + '...'
    });
  });
  
  // 3. SiteInfoPopup 컴포넌트 확인
  const siteInfoPopup = document.querySelector('[data-testid="site-info-popup"]') || 
                       document.querySelector('.MuiDialog-root');
  
  if (siteInfoPopup) {
    console.log('✅ SiteInfoPopup 컴포넌트가 렌더링되어 있습니다.');
  } else {
    console.log('⚠️ SiteInfoPopup 컴포넌트를 찾을 수 없습니다.');
  }
  
  // 4. 더블클릭 이벤트 시뮬레이션 (첫 번째 카드)
  if (siteCards.length > 0) {
    console.log('🖱️ 첫 번째 현장 카드에 더블클릭 이벤트 시뮬레이션...');
    
    // 더블클릭 이벤트 생성
    const doubleClickEvent = new MouseEvent('dblclick', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    
    // 이벤트 발생
    siteCards[0].dispatchEvent(doubleClickEvent);
    
    console.log('✅ 더블클릭 이벤트가 발생되었습니다.');
    console.log('📋 팝업이 열렸는지 확인해주세요.');
  }
  
  console.log('🎯 테스트 완료!');
};

// 테스트 실행
testSmartCardDoubleClick();


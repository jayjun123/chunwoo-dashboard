// 월별 기성에서 스마트카드 더블클릭 기능 테스트 스크립트
// 브라우저 콘솔에서 실행하세요

const testMonthlyGisungDoubleClick = () => {
  console.log('🔍 월별 기성 스마트카드 더블클릭 기능 테스트 시작...');
  
  // 1. 현장명 셀 요소들 찾기 (데스크톱 테이블)
  const desktopSiteCells = document.querySelectorAll('td[title="더블클릭하여 현장 정보 보기"]');
  console.log(`📊 데스크톱 테이블에서 발견된 현장명 셀 개수: ${desktopSiteCells.length}개`);
  
  // 2. 모바일 카드에서 현장명 요소들 찾기
  const mobileSiteNames = document.querySelectorAll('h6[title="더블클릭하여 현장 정보 보기"]');
  console.log(`📊 모바일 카드에서 발견된 현장명 개수: ${mobileSiteNames.length}개`);
  
  if (desktopSiteCells.length === 0 && mobileSiteNames.length === 0) {
    console.log('⚠️ 현장명 요소를 찾을 수 없습니다. 기성현황 페이지에서 실행해주세요.');
    return;
  }
  
  // 3. 각 요소의 더블클릭 이벤트 확인
  if (desktopSiteCells.length > 0) {
    console.log('🔍 데스크톱 테이블 현장명 셀들:');
    desktopSiteCells.forEach((cell, index) => {
      console.log(`  셀 ${index + 1}:`, {
        textContent: cell.textContent?.trim(),
        hasDoubleClick: !!cell.onDoubleClick,
        cursor: cell.style.cursor
      });
    });
  }
  
  if (mobileSiteNames.length > 0) {
    console.log('🔍 모바일 카드 현장명들:');
    mobileSiteNames.forEach((name, index) => {
      console.log(`  현장명 ${index + 1}:`, {
        textContent: name.textContent?.trim(),
        hasDoubleClick: !!name.onDoubleClick,
        cursor: name.style.cursor
      });
    });
  }
  
  // 4. SiteInfoPopup 컴포넌트 확인
  const siteInfoPopup = document.querySelector('[data-testid="site-info-popup"]') || 
                       document.querySelector('.MuiDialog-root');
  
  if (siteInfoPopup) {
    console.log('✅ SiteInfoPopup 컴포넌트가 렌더링되어 있습니다.');
  } else {
    console.log('⚠️ SiteInfoPopup 컴포넌트를 찾을 수 없습니다.');
  }
  
  // 5. 더블클릭 이벤트 시뮬레이션 (첫 번째 요소)
  const firstElement = desktopSiteCells[0] || mobileSiteNames[0];
  if (firstElement) {
    console.log('🖱️ 첫 번째 현장명에 더블클릭 이벤트 시뮬레이션...');
    console.log('대상 요소:', firstElement.textContent?.trim());
    
    // 더블클릭 이벤트 생성
    const doubleClickEvent = new MouseEvent('dblclick', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    
    // 이벤트 발생
    firstElement.dispatchEvent(doubleClickEvent);
    
    console.log('✅ 더블클릭 이벤트가 발생되었습니다.');
    console.log('📋 현장 정보 팝업이 열렸는지 확인해주세요.');
  }
  
  console.log('🎯 테스트 완료!');
  console.log('💡 팁: 현장명에 마우스를 올리면 커서가 포인터로 변경되고, 더블클릭하면 현장 정보 팝업이 열립니다.');
};

// 테스트 실행
testMonthlyGisungDoubleClick();





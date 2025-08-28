// 기성등록 현장명 입력과 스마트카드 더블클릭 기능 테스트 스크립트
// 브라우저 콘솔에서 실행하세요

const testGisungFixes = () => {
  console.log('🔍 기성등록 현장명 입력과 스마트카드 더블클릭 기능 테스트 시작...');
  
  // 1. 현장명 입력 필드 확인
  const siteNameInput = document.querySelector('input[placeholder*="현장명"], input[aria-label*="현장명"]');
  if (siteNameInput) {
    console.log('✅ 현장명 입력 필드 발견:', {
      value: siteNameInput.value,
      placeholder: siteNameInput.placeholder,
      disabled: siteNameInput.disabled
    });
  } else {
    console.log('⚠️ 현장명 입력 필드를 찾을 수 없습니다.');
  }
  
  // 2. 현장명 셀들 확인 (데스크톱)
  const desktopSiteCells = document.querySelectorAll('td[title="더블클릭하여 현장 정보 보기"]');
  console.log(`📊 데스크톱 테이블 현장명 셀 개수: ${desktopSiteCells.length}개`);
  
  // 3. 모바일 현장명 확인
  const mobileSiteNames = document.querySelectorAll('h6[title="더블클릭하여 현장 정보 보기"]');
  console.log(`📊 모바일 카드 현장명 개수: ${mobileSiteNames.length}개`);
  
  // 4. 각 현장명의 내용 확인
  if (desktopSiteCells.length > 0) {
    console.log('🔍 데스크톱 현장명들:');
    desktopSiteCells.forEach((cell, index) => {
      const siteName = cell.textContent?.trim();
      console.log(`  ${index + 1}. "${siteName}" ${siteName ? '✅' : '❌ (빈 값)'}`);
    });
  }
  
  if (mobileSiteNames.length > 0) {
    console.log('🔍 모바일 현장명들:');
    mobileSiteNames.forEach((name, index) => {
      const siteName = name.textContent?.trim();
      console.log(`  ${index + 1}. "${siteName}" ${siteName ? '✅' : '❌ (빈 값)'}`);
    });
  }
  
  // 5. SiteInfoPopup 컴포넌트 확인
  const siteInfoPopup = document.querySelector('.MuiDialog-root');
  if (siteInfoPopup) {
    console.log('✅ SiteInfoPopup 컴포넌트가 렌더링되어 있습니다.');
  } else {
    console.log('⚠️ SiteInfoPopup 컴포넌트를 찾을 수 없습니다.');
  }
  
  // 6. 더블클릭 테스트 (첫 번째 유효한 현장명)
  const validSiteName = desktopSiteCells[0] || mobileSiteNames[0];
  if (validSiteName && validSiteName.textContent?.trim()) {
    console.log('🖱️ 유효한 현장명에 더블클릭 테스트...');
    console.log('대상:', validSiteName.textContent?.trim());
    
    const doubleClickEvent = new MouseEvent('dblclick', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    
    validSiteName.dispatchEvent(doubleClickEvent);
    console.log('✅ 더블클릭 이벤트 발생 완료');
  } else {
    console.log('⚠️ 테스트할 수 있는 유효한 현장명이 없습니다.');
  }
  
  console.log('🎯 테스트 완료!');
  console.log('💡 팁:');
  console.log('  1. 현장명을 입력할 때 빈 값이어도 저장되지 않도록 유효성 검사가 추가되었습니다.');
  console.log('  2. 스마트카드 더블클릭 시 현장명이 비어있으면 경고 메시지가 표시됩니다.');
  console.log('  3. 현장명에 마우스를 올리면 커서가 포인터로 변경됩니다.');
};

// 테스트 실행
testGisungFixes();


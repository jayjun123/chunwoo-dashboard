// 현재 수정된 현장명 입력 기능 테스트 스크립트
// 브라우저 콘솔에서 실행하세요

const testCurrentFix = () => {
  console.log('🔍 현재 수정된 현장명 입력 기능 테스트 시작...');
  
  // 1. Autocomplete 컴포넌트 찾기
  const autocomplete = document.querySelector('input[aria-label*="현장명"], input[placeholder*="현장명"]');
  if (autocomplete) {
    console.log('✅ 현장명 입력 필드 발견:', {
      value: autocomplete.value,
      placeholder: autocomplete.placeholder,
      ariaLabel: autocomplete.getAttribute('aria-label')
    });
    
    // 2. 현재 값 확인
    console.log('📊 현재 입력된 현장명:', `"${autocomplete.value}"`);
    
    // 3. 테스트 입력 시뮬레이션
    console.log('🖱️ 테스트 현장명 입력 시뮬레이션...');
    
    // 입력 이벤트 생성
    const inputEvent = new Event('input', { bubbles: true });
    const changeEvent = new Event('change', { bubbles: true });
    
    // 테스트 값 설정
    const testValue = '테스트 현장명';
    autocomplete.value = testValue;
    
    // 이벤트 발생
    autocomplete.dispatchEvent(inputEvent);
    autocomplete.dispatchEvent(changeEvent);
    
    console.log('✅ 테스트 입력 완료:', testValue);
    console.log('📊 입력 후 값:', `"${autocomplete.value}"`);
    
  } else {
    console.log('⚠️ 현장명 입력 필드를 찾을 수 없습니다.');
    console.log('💡 팁: 기성등록 팝업이 열려있는지 확인해주세요.');
  }
  
  // 4. formData 상태 확인 (React DevTools에서 확인 가능)
  console.log('💡 팁: React DevTools에서 formData 상태를 확인해보세요.');
  console.log('💡 팁: 콘솔에서 "formData"를 입력하면 현재 상태를 볼 수 있습니다.');
  
  console.log('🎯 테스트 완료!');
};

// 테스트 실행
testCurrentFix();

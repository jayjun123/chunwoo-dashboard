// 투두리스트 리셋 기능 테스트 스크립트
// 브라우저 콘솔에서 실행하세요

const testTodoReset = () => {
  console.log('=== 투두리스트 리셋 기능 테스트 ===');
  
  // 1. 한국 시간 계산 테스트
  const getKoreanTime = () => {
    const now = new Date();
    const koreanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    return koreanTime;
  };
  
  const koreanTime = getKoreanTime();
  console.log('현재 한국 시간:', koreanTime.toLocaleString());
  console.log('오늘 날짜:', `${koreanTime.getFullYear()}-${koreanTime.getMonth() + 1}-${koreanTime.getDate()}`);
  
  // 2. 다음 자정까지의 시간 계산 테스트
  const tomorrow = new Date(koreanTime);
  tomorrow.setDate(koreanTime.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const timeUntilMidnight = tomorrow.getTime() - koreanTime.getTime();
  const hoursUntilMidnight = Math.floor(timeUntilMidnight / (1000 * 60 * 60));
  const minutesUntilMidnight = Math.floor((timeUntilMidnight % (1000 * 60 * 60)) / (1000 * 60));
  
  console.log('다음 자정까지:', `${hoursUntilMidnight}시간 ${minutesUntilMidnight}분`);
  
  // 3. localStorage 상태 확인
  const lastReset = localStorage.getItem('lastTodoReset');
  const yesterdayTodos = localStorage.getItem('yesterdayIncompleteTodos');
  
  console.log('마지막 리셋 시간:', lastReset ? new Date(lastReset).toLocaleString() : '없음');
  console.log('전날 미완료 투두:', yesterdayTodos ? JSON.parse(yesterdayTodos).length + '개' : '없음');
  
  // 4. 리셋 조건 시뮬레이션
  if (lastReset) {
    const lastResetDate = new Date(lastReset);
    const lastResetKorean = new Date(lastResetDate.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    
    const shouldReset = (
      lastResetKorean.getFullYear() !== koreanTime.getFullYear() ||
      lastResetKorean.getMonth() !== koreanTime.getMonth() ||
      lastResetKorean.getDate() !== koreanTime.getDate()
    );
    
    console.log('리셋 필요 여부:', shouldReset ? '예' : '아니오');
    console.log('마지막 리셋 날짜:', `${lastResetKorean.getFullYear()}-${lastResetKorean.getMonth() + 1}-${lastResetKorean.getDate()}`);
    console.log('오늘 날짜:', `${koreanTime.getFullYear()}-${koreanTime.getMonth() + 1}-${koreanTime.getDate()}`);
  } else {
    console.log('리셋 필요 여부: 예 (첫 실행)');
  }
  
  console.log('=== 테스트 완료 ===');
  console.log('수정 사항:');
  console.log('1. 한국 시간 계산을 toLocaleString("en-US", {timeZone: "Asia/Seoul"})로 변경');
  console.log('2. 정확한 자정 타이머 설정 추가');
  console.log('3. 매분 백업 체크 유지');
  console.log('4. 상세한 로깅 추가');
};

// 스크립트 실행
testTodoReset();

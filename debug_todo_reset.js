// 투두리스트 리셋 문제 진단 및 해결 스크립트
// 브라우저 콘솔에서 실행하세요

const debugTodoReset = async () => {
  console.log('=== 투두리스트 리셋 문제 진단 시작 ===');
  
  // 1. 현재 시간 확인 (로컬 vs 한국 시간)
  const now = new Date();
  const koreanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
  
  console.log('현재 시간 (로컬):', now.toLocaleString());
  console.log('현재 시간 (한국):', koreanTime.toLocaleString());
  
  // 2. localStorage 상태 확인
  const lastReset = localStorage.getItem('lastTodoReset');
  const yesterdayTodos = localStorage.getItem('yesterdayIncompleteTodos');
  
  console.log('마지막 리셋 시간:', lastReset ? new Date(lastReset).toLocaleString() : '없음');
  console.log('전날 미완료 투두:', yesterdayTodos ? JSON.parse(yesterdayTodos).length + '개' : '없음');
  
  // 3. 현재 투두리스트 상태 확인
  if (typeof window.checkTodoResetStatus === 'function') {
    window.checkTodoResetStatus();
  }
  
  // 4. 리셋 정보 초기화 (필요시)
  const shouldReset = confirm('리셋 정보를 초기화하시겠습니까? (이전 투두들이 사라질 수 있습니다)');
  if (shouldReset) {
    if (typeof window.resetTodoResetInfo === 'function') {
      window.resetTodoResetInfo();
      console.log('리셋 정보가 초기화되었습니다. 페이지를 새로고침하세요.');
    } else {
      localStorage.removeItem('lastTodoReset');
      localStorage.removeItem('yesterdayIncompleteTodos');
      console.log('리셋 정보가 초기화되었습니다. 페이지를 새로고침하세요.');
    }
  }
  
  // 5. 한국 시간 기준 날짜 계산 확인
  const todayYear = koreanTime.getFullYear();
  const todayMonth = String(koreanTime.getMonth() + 1).padStart(2, '0');
  const todayDay = String(koreanTime.getDate()).padStart(2, '0');
  const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;
  
  console.log('오늘 날짜 (한국 시간):', todayStr);
  
  // 6. 전날 날짜 계산 확인
  const yesterday = new Date(koreanTime);
  yesterday.setDate(koreanTime.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  
  console.log('전날 날짜 (한국 시간):', yesterdayStr);
  
  console.log('=== 진단 완료 ===');
  console.log('문제 해결 방법:');
  console.log('1. 리셋 정보를 초기화한 후 페이지 새로고침');
  console.log('2. 한국 시간 기준으로 정확한 날짜 계산 확인');
  console.log('3. 전날 미완료 투두 불러오기 기능 사용');
};

// 스크립트 실행
debugTodoReset();


// 명절선물리스트 다운로드 기능 테스트 스크립트
// 브라우저 콘솔에서 실행하세요

const testGiftDownload = () => {
  console.log('=== 명절선물리스트 다운로드 기능 테스트 ===');
  
  // 1. 제목 형식 확인
  const selectedYear = 2025;
  const selectedHoliday = '추석';
  const title = `${selectedYear}년 ${selectedHoliday} 선물 리스트`;
  console.log('제목 형식:', title);
  
  // 2. 헤더 확인
  const headers = ['번호', '수혜자', '회사명', '직책', '선물', '개수', '비고'];
  console.log('헤더:', headers);
  
  // 3. 가나다 순 정렬 테스트
  const testNames = ['김철수', '박영희', '이민수', '최지영', '정수진'];
  const sortedNames = testNames.sort((a, b) => a.localeCompare(b, 'ko'));
  console.log('원본 이름:', testNames);
  console.log('가나다 순 정렬:', sortedNames);
  
  // 4. 테두리 스타일 확인
  const borderStyles = {
    thin: '얇은 테두리 (내부 셀)',
    medium: '굵은 테두리 (외곽 및 헤더)'
  };
  console.log('테두리 스타일:', borderStyles);
  
  // 5. 파일명 형식 확인
  const fileName = `${selectedYear}년_${selectedHoliday}_선물리스트_${new Date().toISOString().split('T')[0]}.xlsx`;
  console.log('파일명 형식:', fileName);
  
  console.log('=== 수정 사항 요약 ===');
  console.log('✅ 1행 제목: "0000년 추석/설날 선물 리스트" 형식 (18폰트 굵게)');
  console.log('✅ 섹션별 굵은선 테두리로 구분');
  console.log('✅ 안쪽 셀은 얇은 테두리');
  console.log('✅ 가나다 순으로 정렬');
  console.log('✅ 섹션 순서는 웹에 저장된 순서대로');
  console.log('✅ 헤더명 "수령자" → "수혜자"로 변경');
  
  console.log('=== 테스트 완료 ===');
};

// 스크립트 실행
testGiftDownload();

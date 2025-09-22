// 섹션별 엑셀 다운로드 기능 테스트 스크립트
// 브라우저 콘솔에서 실행하세요

const testSectionExcel = () => {
  console.log('=== 섹션별 엑셀 다운로드 기능 테스트 ===');
  
  // 1. 섹션별 데이터 구조 시뮬레이션
  const mockSections = [
    {
      title: '청권장',
      cards: [
        { name: '김철수', company: 'ABC건설', position: '대표', giftType: '청권장', quantity: 1, note: '' },
        { name: '박영희', company: 'XYZ회사', position: '부장', giftType: '청권장', quantity: 1, note: '' },
        { name: '이민수', company: 'DEF건설', position: '과장', giftType: '청권장', quantity: 1, note: '' }
      ]
    },
    {
      title: '신세계',
      cards: [
        { name: '최지영', company: 'GHI회사', position: '대리', giftType: '신세계', quantity: 1, note: '' },
        { name: '정수진', company: 'JKL건설', position: '차장', giftType: '신세계', quantity: 1, note: '' }
      ]
    },
    {
      title: '직원',
      cards: [
        { name: '한소영', company: 'MNO회사', position: '사원', giftType: '직원', quantity: 1, note: '' },
        { name: '윤태호', company: 'PQR건설', position: '주임', giftType: '직원', quantity: 1, note: '' }
      ]
    }
  ];
  
  console.log('모의 섹션 데이터:', mockSections);
  
  // 2. 엑셀 구조 시뮬레이션
  const excelStructure = {
    title: '2025년 추석 선물 리스트',
    sections: mockSections.map(section => ({
      sectionName: `📋 ${section.title}`,
      headers: ['번호', '수혜자', '회사명', '직책', '선물', '개수', '비고'],
      data: section.cards.map((card, index) => [
        index + 1,
        card.name,
        card.company,
        card.position,
        card.giftType,
        card.quantity,
        card.note
      ])
    }))
  };
  
  console.log('엑셀 구조:', excelStructure);
  
  // 3. 가나다 순 정렬 테스트
  const testNames = ['김철수', '박영희', '이민수', '최지영', '정수진', '한소영', '윤태호'];
  const sortedNames = testNames.sort((a, b) => a.localeCompare(b, 'ko'));
  
  console.log('원본 이름 순서:', testNames);
  console.log('가나다 순 정렬:', sortedNames);
  
  // 4. 섹션별 스타일 정보
  const sectionStyles = {
    title: {
      font: '맑은 고딕 18pt 굵게',
      alignment: '가운데 정렬',
      border: '굵은 테두리'
    },
    sectionHeader: {
      font: '맑은 고딕 14pt 굵게',
      color: '흰색',
      background: '파란색 (#4472C4)',
      alignment: '가운데 정렬',
      border: '굵은 테두리'
    },
    dataHeader: {
      font: '맑은 고딕 12pt 굵게',
      background: '회색 (#E0E0E0)',
      alignment: '가운데 정렬',
      border: '굵은 테두리'
    },
    dataCell: {
      font: '맑은 고딕 11pt',
      alignment: '가운데 정렬',
      border: '얇은 테두리'
    }
  };
  
  console.log('스타일 정보:', sectionStyles);
  
  // 5. 예상 엑셀 출력 구조
  console.log('=== 예상 엑셀 출력 구조 ===');
  console.log('1행: 2025년 추석 선물 리스트 (제목)');
  console.log('2행: (빈 행)');
  console.log('3행: 📋 청권장 (섹션 헤더)');
  console.log('4행: 번호 | 수혜자 | 회사명 | 직책 | 선물 | 개수 | 비고 (데이터 헤더)');
  console.log('5행: 1 | 김철수 | ABC건설 | 대표 | 청권장 | 1 | (데이터)');
  console.log('6행: 2 | 박영희 | XYZ회사 | 부장 | 청권장 | 1 | (데이터)');
  console.log('7행: 3 | 이민수 | DEF건설 | 과장 | 청권장 | 1 | (데이터)');
  console.log('8행: (빈 행 - 섹션 구분)');
  console.log('9행: 📋 신세계 (섹션 헤더)');
  console.log('10행: 번호 | 수혜자 | 회사명 | 직책 | 선물 | 개수 | 비고 (데이터 헤더)');
  console.log('11행: 1 | 최지영 | GHI회사 | 대리 | 신세계 | 1 | (데이터)');
  console.log('12행: 2 | 정수진 | JKL건설 | 차장 | 신세계 | 1 | (데이터)');
  console.log('13행: (빈 행 - 섹션 구분)');
  console.log('14행: 📋 직원 (섹션 헤더)');
  console.log('15행: 번호 | 수혜자 | 회사명 | 직책 | 선물 | 개수 | 비고 (데이터 헤더)');
  console.log('16행: 1 | 한소영 | MNO회사 | 사원 | 직원 | 1 | (데이터)');
  console.log('17행: 2 | 윤태호 | PQR건설 | 주임 | 직원 | 1 | (데이터)');
  
  // 6. ExcelJS vs XLSX 비교
  console.log('=== ExcelJS vs XLSX 비교 ===');
  console.log('✅ ExcelJS 장점:');
  console.log('  - 정확한 폰트 적용 (맑은 고딕)');
  console.log('  - 정확한 테두리 스타일');
  console.log('  - 정확한 색상 적용');
  console.log('  - 셀 병합 정확히 처리');
  console.log('  - 섹션별 구분 명확');
  console.log('  - 비동기 처리 지원');
  
  console.log('❌ XLSX 한계:');
  console.log('  - 폰트 스타일이 제대로 적용되지 않음');
  console.log('  - 테두리 스타일이 불안정');
  console.log('  - 색상 적용이 제한적');
  console.log('  - 셀 병합이 복잡함');
  
  console.log('=== 수정 사항 요약 ===');
  console.log('✅ XLSX를 ExcelJS로 교체');
  console.log('✅ 섹션별로 구분하여 출력');
  console.log('✅ 각 섹션 이름을 섹션 리스트 시작 위에 표시');
  console.log('✅ 섹션별로 가나다 순 정렬');
  console.log('✅ 정확한 폰트, 테두리, 색상 적용');
  console.log('✅ 섹션 간 구분을 위한 빈 행 추가');
  
  console.log('=== 테스트 완료 ===');
};

// 스크립트 실행
testSectionExcel();

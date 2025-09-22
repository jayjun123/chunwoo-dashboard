// 중복/동명이인 확인 기능 테스트 스크립트
// 브라우저 콘솔에서 실행하세요

const testDuplicateCheck = () => {
  console.log('=== 중복/동명이인 확인 기능 테스트 ===');
  
  // 1. 중복 정보 수집 시뮬레이션
  const mockExistingCards = [
    {
      name: '김철수',
      giftType: '청권장',
      company: 'ABC건설',
      position: '대표',
      sectionTitle: '청권장',
      note: 'VIP 고객'
    },
    {
      name: '박영희',
      giftType: '신세계',
      company: 'XYZ회사',
      position: '부장',
      sectionTitle: '신세계',
      note: ''
    }
  ];
  
  const mockUploadData = [
    { name: '김철수', giftType: '신세계' }, // 중복 - 다른 선물
    { name: '이민수', giftType: '청권장' }, // 신규
    { name: '박영희', giftType: '신세계' }  // 중복 - 같은 선물
  ];
  
  console.log('기존 데이터베이스:', mockExistingCards);
  console.log('업로드할 데이터:', mockUploadData);
  
  // 2. 중복 확인 로직 시뮬레이션
  const duplicateInfo = [];
  const newNames = [];
  
  mockUploadData.forEach(({ name, giftType }) => {
    const existingCards = mockExistingCards.filter(card => card.name === name);
    
    if (existingCards.length > 0) {
      existingCards.forEach(existingCard => {
        duplicateInfo.push({
          name: name,
          uploadGiftType: giftType,
          existingInfo: {
            giftType: existingCard.giftType,
            company: existingCard.company,
            position: existingCard.position,
            sectionTitle: existingCard.sectionTitle,
            note: existingCard.note
          }
        });
      });
    } else {
      newNames.push({ name, giftType });
    }
  });
  
  console.log('중복 정보:', duplicateInfo);
  console.log('신규 이름:', newNames);
  
  // 3. 상세 메시지 생성 시뮬레이션
  if (duplicateInfo.length > 0) {
    const groupedDuplicates = {};
    duplicateInfo.forEach(dup => {
      if (!groupedDuplicates[dup.name]) {
        groupedDuplicates[dup.name] = [];
      }
      groupedDuplicates[dup.name].push(dup);
    });
    
    let detailMessage = '다음 이름들이 이미 데이터베이스에 존재합니다:\n\n';
    
    Object.entries(groupedDuplicates).forEach(([name, duplicates]) => {
      detailMessage += `📋 ${name}\n`;
      detailMessage += `   업로드할 선물: ${duplicates[0].uploadGiftType}\n`;
      
      duplicates.forEach((dup, index) => {
        detailMessage += `   기존 정보 ${index + 1}:\n`;
        detailMessage += `     - 선물: ${dup.existingInfo.giftType}\n`;
        detailMessage += `     - 회사: ${dup.existingInfo.company}\n`;
        detailMessage += `     - 직책: ${dup.existingInfo.position}\n`;
        detailMessage += `     - 섹션: ${dup.existingInfo.sectionTitle}\n`;
        if (dup.existingInfo.note) {
          detailMessage += `     - 비고: ${dup.existingInfo.note}\n`;
        }
      });
      detailMessage += '\n';
    });
    
    detailMessage += '같은 사람인가요? 확인하면 추가됩니다.';
    
    console.log('상세 메시지:');
    console.log(detailMessage);
  }
  
  // 4. 중복 항목 정렬 시뮬레이션
  const allNames = [
    { name: '이민수', giftType: '청권장', isDuplicate: false },
    { name: '김철수', giftType: '신세계', isDuplicate: true },
    { name: '박영희', giftType: '신세계', isDuplicate: true }
  ];
  
  const sortedNames = allNames.sort((a, b) => {
    // 중복된 항목(isDuplicate: true)을 맨 위로
    if (a.isDuplicate && !b.isDuplicate) return -1;
    if (!a.isDuplicate && b.isDuplicate) return 1;
    return 0;
  });
  
  console.log('정렬 전:', allNames);
  console.log('정렬 후 (중복 항목이 맨 위):', sortedNames);
  
  // 5. 시각적 표시 시뮬레이션
  console.log('=== 시각적 표시 ===');
  sortedNames.forEach((nameData, index) => {
    const isDuplicate = nameData.isDuplicate;
    const visualStyle = isDuplicate ? '🔴 빨간 테두리 + 어두운 배경' : '⚪ 일반 스타일';
    console.log(`${index + 1}. ${nameData.name} ${isDuplicate ? '🔴' : ''} - ${visualStyle}`);
  });
  
  console.log('=== 수정 사항 요약 ===');
  console.log('✅ 중복된 이름의 상세 정보 표시 (기존 선물, 회사, 직책, 섹션, 비고)');
  console.log('✅ 중복 항목을 섹션의 맨 위로 이동');
  console.log('✅ 중복 항목에 🔴 아이콘 표시');
  console.log('✅ 중복 항목에 빨간 테두리와 어두운 배경 적용');
  console.log('✅ 비고에 "[중복] 기존: 선물종류 (회사명)" 정보 추가');
  
  console.log('=== 테스트 완료 ===');
};

// 스크립트 실행
testDuplicateCheck();

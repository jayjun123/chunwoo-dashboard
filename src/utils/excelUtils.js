import * as XLSX from 'xlsx';

// 전문적인 엑셀 디자인으로 내보내기
export const exportToExcel = (data, sheetName, fileName, options = {}) => {
  try {
    // 데이터 검증
    if (!data || !Array.isArray(data)) {
      throw new Error('유효하지 않은 데이터입니다. 배열 형태의 데이터가 필요합니다.');
    }
    
    if (data.length === 0) {
      throw new Error('내보낼 데이터가 없습니다.');
    }
    
    // 데이터 정리 (undefined, null 값 처리)
    const cleanData = data.map((row) => {
      const cleanRow = {};
      Object.keys(row).forEach(key => {
        const value = row[key];
        if (value === undefined || value === null) {
          cleanRow[key] = '';
        } else if (typeof value === 'object' && value !== null) {
          // 객체나 배열인 경우 문자열로 변환
          cleanRow[key] = JSON.stringify(value);
        } else {
          cleanRow[key] = value;
        }
      });
      return cleanRow;
    });
    
    const wb = XLSX.utils.book_new();
    
    // 워크시트 생성
    const ws = XLSX.utils.json_to_sheet(cleanData);
    
    // 전문적인 엑셀 디자인 적용
    applyExcelStyling(ws, cleanData, options);
    
    // 워크북에 시트 추가
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // 파일명에 날짜 추가
    const dateStr = new Date().toISOString().split('T')[0];
    const finalFileName = fileName ? `${fileName}_${dateStr}.xlsx` : `export_${dateStr}.xlsx`;
    
    // 엑셀 파일 다운로드
    XLSX.writeFile(wb, finalFileName);
    
    return { success: true, fileName: finalFileName };
  } catch (error) {
    console.error('엑셀 내보내기 실패:', error);
    return { success: false, error: error.message };
  }
};

// 전문적인 엑셀 스타일링 적용
const applyExcelStyling = (ws, data, options) => {
  try {
    // 워크시트 범위 확인
    if (!ws['!ref']) {
      return;
    }
    
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // 헤더 스타일링 (첫 번째 행)
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      
      ws[cellAddress].s = {
        font: {
          name: '맑은 고딕',
          sz: 12,
          bold: true,
          color: { rgb: 'FFFFFF' }
        },
        fill: {
          fgColor: { rgb: '4472C4' }
        },
        alignment: {
          horizontal: 'center',
          vertical: 'center'
        },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };
    }
    
    // 데이터 행 스타일링
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellAddress]) continue;
        
        ws[cellAddress].s = {
          font: {
            name: '맑은 고딕',
            sz: 10
          },
          alignment: {
            horizontal: 'center',
            vertical: 'center'
          },
          border: {
            top: { style: 'thin', color: { rgb: 'D0D0D0' } },
            bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
            left: { style: 'thin', color: { rgb: 'D0D0D0' } },
            right: { style: 'thin', color: { rgb: 'D0D0D0' } }
          }
        };
      }
    }
    
    // 열 너비 자동 조정
    const colWidths = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      let maxWidth = 10;
      for (let row = range.s.r; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (ws[cellAddress] && ws[cellAddress].v) {
          const cellValue = String(ws[cellAddress].v);
          maxWidth = Math.max(maxWidth, cellValue.length);
        }
      }
      colWidths.push({ wch: Math.min(maxWidth + 2, 50) });
    }
    
    ws['!cols'] = colWidths;
  } catch (error) {
    console.error('엑셀 스타일링 적용 실패:', error);
  }
};

// 캘린더 데이터를 엑셀로 내보내기
export const exportCalendarToExcel = (calendarItems, year, month, fileName) => {
  try {
    const wb = XLSX.utils.book_new();
    
    // 메인 캘린더 시트 생성
    const calendarSheet = createCalendarSheet(calendarItems, year, month);
    XLSX.utils.book_append_sheet(wb, calendarSheet, `${year}년${month}월_일정`);
    
    // 요약 시트 생성
    const summarySheet = createSummarySheet(calendarItems, year, month);
    XLSX.utils.book_append_sheet(wb, summarySheet, '요약');
    
    // 파일명 생성
    const dateStr = new Date().toISOString().split('T')[0];
    const finalFileName = fileName ? `${fileName}_${year}년${month}월_${dateStr}.xlsx` : `calendar_${year}년${month}월_${dateStr}.xlsx`;
    
    // 파일 다운로드
    XLSX.writeFile(wb, finalFileName);
    
    return { success: true, fileName: finalFileName };
  } catch (error) {
    console.error('캘린더 엑셀 내보내기 실패:', error);
    return { success: false, error: error.message };
  }
};

// 캘린더 시트 생성
const createCalendarSheet = (calendarItems, year, month) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  
  const calendarData = [];
  
  // 헤더 추가
  calendarData.push(['일', '월', '화', '수', '목', '금', '토']);
  
  // 빈 셀로 시작
  let currentRow = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    currentRow.push('');
  }
  
  // 날짜와 일정 추가
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    
    // 해당 날짜의 일정 찾기
    const dayItems = calendarItems.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate.getDate() === day && 
             itemDate.getMonth() === month - 1 && 
             itemDate.getFullYear() === year;
    });
    
    const dayContent = dayItems.length > 0 
      ? `${day}\n${dayItems.map(item => item.title).join('\n')}`
      : day.toString();
    
    currentRow.push(dayContent);
    
    // 토요일이거나 마지막 날이면 다음 행으로
    if (dayOfWeek === 6 || day === daysInMonth) {
      // 7개가 되도록 빈 셀 추가
      while (currentRow.length < 7) {
        currentRow.push('');
      }
      calendarData.push(currentRow);
      currentRow = [];
    }
  }
  
  const ws = XLSX.utils.aoa_to_sheet(calendarData);
  
  // 스타일링 적용
  const range = XLSX.utils.decode_range(ws['!ref']);
  
  // 헤더 스타일링
  for (let col = 0; col < 7; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (ws[cellAddress]) {
      ws[cellAddress].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4472C4' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }
  }
  
  // 열 너비 설정
  ws['!cols'] = Array(7).fill({ wch: 15 });
  
  return ws;
};

// 요약 시트 생성
const createSummarySheet = (calendarItems, year, month) => {
  const summaryData = [
    ['항목', '개수'],
    ['전체 일정', calendarItems.length],
    ['완료된 일정', calendarItems.filter(item => item.completed).length],
    ['미완료 일정', calendarItems.filter(item => !item.completed).length]
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(summaryData);
  
  // 스타일링 적용
  const range = XLSX.utils.decode_range(ws['!ref']);
  
  // 헤더 스타일링
  for (let col = 0; col < 2; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (ws[cellAddress]) {
      ws[cellAddress].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4472C4' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }
  }
  
  // 열 너비 설정
  ws['!cols'] = [{ wch: 20 }, { wch: 10 }];
  
  return ws;
}; 

// 한글 금액 변환 함수 (NUMBERSTRING 대체)
export const convertToKoreanCurrency = (amount) => {
  // 입력값 검증 및 변환
  const numAmount = Number(amount) || 0;
  
  if (numAmount === 0) return '영원정';
  
  const units = ['', '만', '억', '조'];
  const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const positions = ['', '십', '백', '천'];
  
  let result = '';
  let unitIndex = 0;
  let tempAmount = Math.abs(numAmount); // 절대값 사용
  
  while (tempAmount > 0) {
    const section = tempAmount % 10000;
    if (section > 0) {
      let sectionStr = '';
      let tempSection = section;
      let positionIndex = 0;
      
      while (tempSection > 0) {
        const digit = tempSection % 10;
        if (digit > 0) {
          if (digit > 1 || positionIndex === 0) {
            sectionStr = digits[digit] + sectionStr;
          }
          if (positionIndex > 0) {
            sectionStr = positions[positionIndex] + sectionStr;
          }
        }
        tempSection = Math.floor(tempSection / 10);
        positionIndex++;
      }
      
      if (unitIndex > 0) {
        sectionStr += units[unitIndex];
      }
      result = sectionStr + result;
    }
    
    tempAmount = Math.floor(tempAmount / 10000);
    unitIndex++;
  }
  
  // 음수인 경우 처리
  if (numAmount < 0) {
    result = '마이너스 ' + result;
  }
  
  return result + '원정';
};

// 기성금청구서 엑셀 생성 (가로 A4 용지 2시트)
export const generateGisungExcel = (siteData, gisungData) => {
  const workbook = XLSX.utils.book_new();
  
  // 갑지 시트 생성
  const gapjiData = createGapjiSheet(siteData, gisungData);
  const gapjiSheet = XLSX.utils.aoa_to_sheet(gapjiData);
  
  // 수식 적용
  applyFormulasToGapjiSheet(gapjiSheet);
  
  // 기성금 내역서 시트 생성
  const detailData = createDetailSheet(siteData, gisungData);
  const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
  
  // 기성금 내역서에 수식 적용
  applyFormulasToDetailSheet(detailSheet);
  
  // 스타일링 및 병합 적용
  applyGisungStyling(gapjiSheet, detailSheet);
  
  // 시트 추가
  XLSX.utils.book_append_sheet(workbook, gapjiSheet, '갑지');
  XLSX.utils.book_append_sheet(workbook, detailSheet, '기성금 내역서');
  
  // 시트 간 참조 설정
  setSheetReferences(workbook, gapjiSheet, detailSheet);
  
  return workbook;
};


// 갑지 시트에 수식 적용하는 함수
const applyFormulasToGapjiSheet = (worksheet) => {
  // F열에 수식 적용 (단수정리 항목들의 금액 계산) - F5부터 F10까지
  for (let row = 4; row <= 9; row++) { // F5~F10
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 5 }); // F열
    worksheet[cellAddress] = {
      f: `=D${row + 1}*E${row + 1}`, // 수식
      v: 0 // 기본값
    };
  }
  
  // H26에 총공사계 수식
  const totalCell = XLSX.utils.encode_cell({ r: 25, c: 7 }); // H26
  worksheet[totalCell] = {
    f: `=SUM(F5:F10)`, // F5~F10 합계
    v: 0
  };
  
  // H27에 부가세 수식
  const vatCell = XLSX.utils.encode_cell({ r: 26, c: 7 }); // H27
  worksheet[vatCell] = {
    f: `=H26*0.1`, // 총공사계 * 10%
    v: 0
  };
  
  // H28에 계약금액 수식
  const contractCell = XLSX.utils.encode_cell({ r: 27, c: 7 }); // H28
  worksheet[contractCell] = {
    f: `=H26+H27`, // 총공사계 + 부가세
    v: 0
  };
  
  // H32에 잔액 수식
  const balanceCell = XLSX.utils.encode_cell({ r: 31, c: 7 }); // H32
  worksheet[balanceCell] = {
    f: `=H28-H31`, // 계약금액 - 기성누계
    v: 0
  };
};

// 기성금 내역서에 수식 적용하는 함수
const applyFormulasToDetailSheet = (worksheet) => {
  // F열에 수식 적용 (계약금액 - 금액) - F6부터 F20까지 (단수정리까지)
  for (let row = 5; row <= 19; row++) { // F6~F20
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 5 }); // F열
    worksheet[cellAddress] = {
      f: `=D${row + 1}*E${row + 1}`, // 수식
      v: 0 // 기본값
    };
  }
  
  // 선급금, 총공사비, 부가세, 총계 수식 적용
  // 선급금은 이미 값으로 설정됨 (F22)
  
  // 총공사비 수식 (F23) - 단수정리까지 포함
  const detailTotalCell = XLSX.utils.encode_cell({ r: 22, c: 5 }); // F23
  worksheet[detailTotalCell] = {
    f: '=SUM(F6:F20)', // 단수정리까지 포함한 합계
    v: 0
  };
  
  // 부가세 수식 (F24) - 총공사비의 10%
  const detailVatCell = XLSX.utils.encode_cell({ r: 23, c: 5 }); // F24
  worksheet[detailVatCell] = {
    f: '=F23*0.1', // 총공사비 * 10%
    v: 0
  };
  
  // 총계 수식 (F25) - 총공사비 + 부가세
  const detailGrandTotalCell = XLSX.utils.encode_cell({ r: 24, c: 5 }); // F25
  worksheet[detailGrandTotalCell] = {
    f: '=F23+F24', // 총공사비 + 부가세
    v: 0
  };
  
  // J열에 수식 적용 (전회기성 - 금액) - J6부터 J20까지
  for (let row = 5; row <= 19; row++) { // J6~J20
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 9 }); // J열
    worksheet[cellAddress] = {
      f: `=G${row + 1}*E${row + 1}`, // 수식
      v: 0 // 기본값
    };
  }
  
  // H열에 수식 적용 (전회기성 - 금액) - H6부터 H20까지
  for (let row = 5; row <= 19; row++) { // H6~H20
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 7 }); // H열
    worksheet[cellAddress] = {
      f: `=G${row + 1}*E${row + 1}`, // 수식
      v: 0 // 기본값
    };
  }
  
  // J열에 수식 적용 (전회기성 - 금액) - J6부터 J20까지
  for (let row = 5; row <= 19; row++) { // J6~J20
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 9 }); // J열
    worksheet[cellAddress] = {
      f: `=G${row + 1}*E${row + 1}`, // 수식
      v: 0 // 기본값
    };
  }
  
  // K열에 수식 적용 (금회기성 - 수량) - K6부터 K20까지
  for (let row = 5; row <= 19; row++) { // K6~K20
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 10 }); // K열
    worksheet[cellAddress] = {
      f: `=G${row + 1}`, // 수식 (전회기성 수량과 동일)
      v: 0 // 기본값
    };
  }
  
  // L열에 수식 적용 (금회기성 - 금액) - L6부터 L20까지
  for (let row = 5; row <= 19; row++) { // L6~L20
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 11 }); // L열
    worksheet[cellAddress] = {
      f: `=K${row + 1}*E${row + 1}`, // 수식
      v: 0 // 기본값
    };
  }
  
  // M열에 수식 적용 (합계 - 수량) - M6부터 M20까지
  for (let row = 5; row <= 19; row++) { // M6~M20
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 12 }); // M열
    worksheet[cellAddress] = {
      f: `=G${row + 1}+K${row + 1}`, // 수식
      v: 0 // 기본값
    };
  }
  
  // 25행에 선급금 추가
  const advanceRow = 24; // 25행 (0부터 시작하므로 24)
  const advanceCell = XLSX.utils.encode_cell({ r: advanceRow, c: 0 }); // A25
  worksheet[advanceCell] = {
    v: '선급금'
  };
  
  // 26행에 총공사계 추가
  const totalRow = 25; // 26행
  const totalCell = XLSX.utils.encode_cell({ r: totalRow, c: 0 }); // A26
  worksheet[totalCell] = {
    v: '총공사계'
  };
  
  // 27행에 부가세 추가
  const vatRow = 26; // 27행
  const vatCell = XLSX.utils.encode_cell({ r: vatRow, c: 0 }); // A27
  worksheet[vatCell] = {
    v: '부가세'
  };
  
  // 28행에 계약금액 추가
  const contractRow = 27; // 28행
  const contractCell = XLSX.utils.encode_cell({ r: contractRow, c: 0 }); // A28
  worksheet[contractCell] = {
    v: '계약금액'
  };
};

// 갑지 시트 데이터 생성 (세로 A4 용지에 맞춤)
const createGapjiSheet = (siteData, gisungData) => {
  const data = [];
  
  // 데이터 검증 및 기본값 설정
  const safeSiteData = siteData || {};
  const safeGisungData = Array.isArray(gisungData) ? gisungData : [];
  
  // 제목 (A1:H1 병합)
  data.push(['기성금 청구서', '', '', '', '', '', '', '']);
  data.push([]);
  
  // 기본 정보 (세로 A4 용지에 맞춰 배치)
  data.push(['공사명', '', '', '', '', '', '', safeSiteData.siteName || safeSiteData.name || '현장명']);
  data.push(['시공사', '', '', '', '', '', '', safeSiteData.contractor || '시공사명']);
  data.push(['하도급 공사명', '', '', '', '', '', '', safeSiteData.subContractor || '하도급 공사명']);
  data.push(['계약일자', '', '', '', '', '', '', safeSiteData.contractDate || safeSiteData.startDate || '']);
  data.push(['준공일자', '', '', '', '', '', '', safeSiteData.completionDate || safeSiteData.endDate || '']);
  data.push([]);
  
  // 단수정리 항목들 (F5부터 시작, 동적으로 행 계산)
  const tanuItems = [
    { name: '단수정리1', specification: '', unit: 'M²', quantity: 0, unitPrice: 0 },
    { name: '단수정리2', specification: '', unit: 'M²', quantity: 0, unitPrice: 0 },
    { name: '단수정리3', specification: '', unit: 'M²', quantity: 0, unitPrice: 0 },
    { name: 'NEGO1', specification: '', unit: 'M²', quantity: 0, unitPrice: 0 },
    { name: 'NEGO2', specification: '', unit: 'M²', quantity: 0, unitPrice: 0 },
    { name: 'NEGO3', specification: '', unit: 'M²', quantity: 0, unitPrice: 0 }
  ];
  
  // 단수정리 항목들을 데이터에 추가 (F5부터 시작)
  let currentRow = 5; // F5부터 시작
  const targetRow = 25; // 목표 행
  
  tanuItems.forEach((item, index) => {
    // 25행을 넘어가면 2칸 빈칸을 남기고 다시 시작
    if (currentRow >= targetRow) {
      data.push(['', '', '', '', '', '', '', '']); // 빈 행 1
      data.push(['', '', '', '', '', '', '', '']); // 빈 행 2
      currentRow = 5; // 다시 F5부터 시작
    }
    
    const row = ['', '', '', '', '', '', '', ''];
    row[0] = item.name; // A열: 품명
    row[1] = item.specification; // B열: 규격
    row[2] = item.unit; // C열: 단위
    row[3] = item.quantity; // D열: 수량
    row[4] = item.unitPrice; // E열: 단가
    row[5] = 0; // F열: 금액 (수식은 나중에 적용)
    data.push(row);
    currentRow++;
  });
  
  // 25행에 선급금 배치
  while (data.length < targetRow - 1) {
    data.push(['', '', '', '', '', '', '', '']);
  }
  
  // 25행에 선급금 배치
  data.push(['선급금', '', '', '', '', '', '', 0]);
  
  // 26행에 총공사계
  data.push(['총공사계', '', '', '', '', '', '', 0]);
  
  // 27행에 부가세
  data.push(['부가가치세', '', '', '', '', '', '', 0]);
  
  // 28행에 계약금액
  data.push(['계약금액', '', '', '', '', '', '', 0]);
  
  // 전회기성, 금회기성, 기성누계 등 추가
  const previousAmount = safeGisungData.length > 1 
    ? safeGisungData.slice(0, -1).reduce((sum, item) => sum + Number(item.gisungAmount || 0), 0)
    : 0;
    
  const currentAmount = safeGisungData.length > 0 
    ? Number(safeGisungData[safeGisungData.length - 1].gisungAmount || 0) 
    : 0;
  
  const totalGisungAmount = safeGisungData.reduce((sum, item) => sum + Number(item.gisungAmount || 0), 0);
  
  data.push(['전회기성', '', '', '', '', '', '', previousAmount]);
  data.push(['금회기성', '', '', '', '', '', '', currentAmount]);
  data.push(['기성누계', '', '', '', '', '', '', totalGisungAmount]);
  data.push(['선급금공제', '', '', '', '', '', '', 0]);
  data.push(['잔액', '', '', '', '', '', '', `=H${data.length - 6}-H${data.length - 1}`]);
  
  // 추가 편집 가능한 빈 행들 (사용자가 항목 추가 가능)
  data.push([]);
  data.push(['', '', '', '', '', '', '', '']);
  data.push(['', '', '', '', '', '', '', '']);
  data.push(['', '', '', '', '', '', '', '']);
  data.push(['', '', '', '', '', '', '', '']);
  data.push(['', '', '', '', '', '', '', '']);
  
  return data;
};

// 기성금 내역서 시트 데이터 생성 (가로 A4 용지에 맞춤)
const createDetailSheet = (siteData, gisungData) => {
  const data = [];
  
  // 데이터 검증 및 기본값 설정
  const safeSiteData = siteData || {};
  const safeGisungData = Array.isArray(gisungData) ? gisungData : [];
  
  // 제목 (A1:M1 병합)
  data.push(['기성금 내역서', '', '', '', '', '', '', '', '', '', '', '', '']);
  data.push([]);
  
  // 공사명 제거 - 품명만 표시하도록 수정
  data.push([]);
  data.push([]);
  
  // 헤더 (가로 A4 용지에 맞춰 배치 - 2단 헤더)
  data.push(['품명', '규격', '단위', '수량(계약수량)', '단가', '금액', '수량(전회)', '금액(전회)', '수량(금회)', '금액(금회)', '수량(합계)', '금액(합계)', '비고']);
  
  // 기본 항목들 추가 (사진과 동일한 구조 + 실제 데이터)
  const basicItems = [
    { name: '복층유리', specification: '투명, 16mm', unit: 'M²', contractQuantity: 6.0, contractUnitPrice: 22000 },
    { name: '복층유리', specification: '투명, 22mm, 건조공기', unit: 'M²', contractQuantity: 10.0, contractUnitPrice: 26000 },
    { name: '복층유리', specification: '컬러, 22mm, 건조공기, 그린', unit: 'M²', contractQuantity: 10.0, contractUnitPrice: 29000 },
    { name: '학교창(관공서)전용유리', specification: '22mm(5+12+5), MCT(HS)+아르곤+틱', unit: 'M²', contractQuantity: 1.0, contractUnitPrice: 49000 },
    { name: '학교창(관공서)전용유리', specification: '22mm(5+12+5), MCT(HS)+아르곤+킬', unit: 'M²', contractQuantity: 1.0, contractUnitPrice: 46000 },
    { name: '학교창(관공서)전용유리', specification: '24mm(5+14+5), MCT(HS)+아르곤+', unit: 'M²', contractQuantity: 35.0, contractUnitPrice: 46000 },
    { name: '학교창(관공서)전용유리', specification: '24mm(5+14+5), MCT(HS)+아르곤+킬', unit: 'M²', contractQuantity: 17.0, contractUnitPrice: 48000 },
    { name: '학교창(관공서)전용유리', specification: '24mm(6+12+6), MCT(HS)+아르곤+', unit: 'M²', contractQuantity: 6.0, contractUnitPrice: 51000 },
    { name: '학교창(관공서)전용유리', specification: '43mm(5+14+5+14+5), MCT(HS)+아', unit: 'M²', contractQuantity: 13.0, contractUnitPrice: 110000 },
    { name: '창호유리설치/복층유리', specification: '유리두께 16mm 이하', unit: 'M²', contractQuantity: 6.0, contractUnitPrice: 15000 },
    { name: '창호유리설치/복층유리', specification: '유리두께 22mm 이하', unit: 'M²', contractQuantity: 21.0, contractUnitPrice: 15000 },
    { name: '창호유리설치/복층유리', specification: '유리두께 24mm 이하', unit: 'M²', contractQuantity: 57.0, contractUnitPrice: 18000 },
    { name: '창호유리설치/복층유리', specification: '유리뚜께 43mm 이하', unit: 'M²', contractQuantity: 13.0, contractUnitPrice: 20000 },
    { name: '유리주위 코킹', specification: '복층유리 5x5, 실리콘(양면)', unit: 'M', contractQuantity: 509.0, contractUnitPrice: 300 },
    { name: '방습거울', specification: '5mm,틀포함', unit: 'M²', contractQuantity: 1.0, contractUnitPrice: 100000 },
    { name: '단수정리', specification: 'NEGO', unit: '', contractQuantity: 0, contractUnitPrice: 0 }
  ];
  
  let hasData = false;
  
  // 품목 데이터 (가로 A4 용지에 맞춰 배치)
  if (safeGisungData.length > 0) {
    const currentGisung = safeGisungData[safeGisungData.length - 1];
    
    // items가 있는 경우
    if (currentGisung.items && Array.isArray(currentGisung.items) && currentGisung.items.length > 0) {
      hasData = true;
      const items = currentGisung.items;
      
      items.forEach(item => {
        // item이 객체인지 확인하고 안전하게 처리
        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
          return;
        }
        
        const contractQuantity = Number(item.contractQuantity || item.quantity || 0);
        const contractUnitPrice = Number(item.contractUnitPrice || item.price || 0);
        const contractAmount = contractQuantity * contractUnitPrice;
        const previousQuantity = Number(item.previousQuantity || 0);
        const previousAmount = Number(item.previousAmount || 0);
        const currentQuantity = Number(item.currentQuantity || 0);
        const currentAmount = Number(item.currentAmount || 0);
        const totalQuantity = previousQuantity + currentQuantity;
        const totalAmount = previousAmount + currentAmount;
        
        data.push([
          String(item.itemName || item.name || ''),
          String(item.specification || ''),
          String(item.unit || ''),
          contractQuantity,
          contractUnitPrice,
          0, // F열: 금액 (수식으로 계산)
          previousQuantity,
          0, // H열: 전회기성 금액 (수식으로 계산)
          previousQuantity,
          0, // J열: 전회기성 금액 (수식으로 계산)
                  0, // L열: 금회기성 금액 (수식으로 계산)
        0, // M열: 합계 수량 (수식으로 계산)
        String(item.remark || '')
      ]);
    });
  }
  
  // 기본 항목들 추가 (데이터가 있든 없든 항상 추가)
  basicItems.forEach(item => {
    data.push([
      item.name,
      item.specification,
      item.unit,
      item.contractQuantity,
      item.contractUnitPrice,
      0, // F열: 금액 (수식으로 계산)
      0, // G열: 전회기성 수량
      0, // H열: 전회기성 금액 (수식으로 계산)
      0, // I열: 전회기성 수량
      0, // J열: 전회기성 금액 (수식으로 계산)
      0, // K열: 금회기성 수량 (수식으로 계산)
        0, // L열: 금회기성 금액 (수식으로 계산)
        0, // M열: 합계 수량 (수식으로 계산)
        ''  // 비고
      ]);
    });
  }
  
  // 단수정리 이후의 항목들만 제거 (단수정리는 포함)
  const filteredData = [];
  let includeItems = true;
  
  for (const row of data) {
    const itemName = row[0] || '';
    
    // 단수정리를 만나면 포함하고 이후 항목들은 제거
    if (itemName.includes('단수정리') || itemName.includes('NEGO') || itemName.includes('네고')) {
      filteredData.push(row);
      includeItems = false; // 단수정리 이후 항목들은 제거
      console.log('✅ 단수정리 포함:', itemName);
    } else if (includeItems) {
      // 단수정리 이전 항목들은 모두 포함
      filteredData.push(row);
    } else {
      // 단수정리 이후 항목들은 제거
      console.log('❌ 단수정리 이후 항목 제거:', itemName);
    }
  }
  
  console.log('✅ 단수정리까지만 표시, 그 이후 집계 행들 제거됨');
  
  // 단수정리 이후에 선급금, 총공사비, 부가세, 총계 추가
  filteredData.push([]); // 빈 행
  filteredData.push([]); // 빈 행
  
  // 선급금 행 추가
  filteredData.push(['선급금', '', '', '', '', Number(safeSiteData.advance || 0), '', '', '', '', '', '', '']);
  
  // 총공사비 행 추가 (수식으로 계산)
  filteredData.push(['총공사비', '', '', '', '', 0, '', '', '', '', '', '', '']); // F열에 수식 적용 예정
  
  // 부가세 행 추가 (수식으로 계산)
  filteredData.push(['부가세', '', '', '', '', 0, '', '', '', '', '', '', '']); // F열에 수식 적용 예정
  
  // 총계 행 추가 (수식으로 계산)
  filteredData.push(['총계', '', '', '', '', 0, '', '', '', '', '', '', '']); // F열에 수식 적용 예정
  
  return filteredData;
};

// 기성금청구서 스타일링 적용 (갑지: 세로 A4, 내역서: 가로 A4)
const applyGisungStyling = (gapjiSheet, detailSheet) => {
  try {
    // 갑지 시트 스타일링 (세로 A4)
    // 제목 병합 (A1:H1)
    if (!gapjiSheet['!merges']) gapjiSheet['!merges'] = [];
    gapjiSheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } });
    
    // 기본 정보 행 병합 (A2:G2 형태)
    for (let i = 2; i <= 6; i++) {
      gapjiSheet['!merges'].push({ s: { r: i, c: 0 }, e: { r: i, c: 6 } });
    }
    
    // 금액 행 스타일링
    for (let i = 8; i <= 14; i++) {
      const cellB = XLSX.utils.encode_cell({ r: i, c: 1 }); // B열 (한글 금액)
      const cellH = XLSX.utils.encode_cell({ r: i, c: 7 }); // H열 (숫자 금액)
      
      if (gapjiSheet[cellB]) {
        gapjiSheet[cellB].s = {
          font: { name: '맑은 고딕', sz: 11, bold: true },
          alignment: { horizontal: 'left' }
        };
      }
      
      if (gapjiSheet[cellH]) {
        gapjiSheet[cellH].s = {
          font: { name: '맑은 고딕', sz: 11, bold: true },
          alignment: { horizontal: 'right' },
          numFmt: '#,##0'
        };
      }
    }
    
    // 기성금 내역서 시트 스타일링 (가로 A4)
    // 제목 병합 (A1:M1)
    if (!detailSheet['!merges']) detailSheet['!merges'] = [];
    detailSheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } });
    
    // 공사명 병합 제거 - 구분선 없애기
    
    // 헤더 스타일링 (13개 컬럼)
    for (let col = 0; col < 13; col++) {
      const cell4 = XLSX.utils.encode_cell({ r: 4, c: col });
      
      if (detailSheet[cell4]) {
        detailSheet[cell4].s = {
          font: { name: '맑은 고딕', sz: 9, bold: true },
          alignment: { horizontal: 'center', vertical: 'center' },
          fill: { fgColor: { rgb: '4472C4' } },
          color: { rgb: 'FFFFFF' }
        };
      }
    }
    
    // 열 너비 설정 (갑지: 세로 A4, 내역서: 가로 A4)
    gapjiSheet['!cols'] = [
      { wch: 15 }, // A (항목명)
      { wch: 25 }, // B (한글 금액)
      { wch: 8 },  // C
      { wch: 8 },  // D
      { wch: 8 },  // E
      { wch: 8 },  // F
      { wch: 8 },  // G
      { wch: 15 }, // H (숫자 금액)
    ];
    
    detailSheet['!cols'] = [
      { wch: 15 }, // A (품명)
      { wch: 12 }, // B (규격)
      { wch: 6 },  // C (단위)
      { wch: 8 },  // D (수량-계약)
      { wch: 8 },  // E (단가)
      { wch: 10 }, // F (금액-계약)
      { wch: 8 },  // G (수량-전회)
      { wch: 10 }, // H (금액-전회)
      { wch: 8 },  // I (수량-금회)
      { wch: 10 }, // J (금액-금회)
      { wch: 8 },  // K (수량-합계)
      { wch: 10 }, // L (금액-합계)
      { wch: 12 }, // M (비고)
    ];
    
  } catch (error) {
    console.error('기성금청구서 스타일링 적용 실패:', error);
  }
};

// 시트 간 참조 설정
const setSheetReferences = (workbook, gapjiSheet, detailSheet) => {
  // 갑지 시트의 수식 설정
  // H14 = 기성금 내역서!F27 (계약 총액)
  // H16 = 기성금 내역서!H24 (선급금)
  // H18 = 기성금 내역서!H27 (전회 기성액)
  // H20 = 기성금 내역서!J27 (금회 기성액)
  // H23 = 기성금 내역서!L27 (누계 기성액)
  // H27 = 기성금 내역서!F27 - 기성금 내역서!L27 (잔액)
  
  // 기성금 내역서 시트의 A2 셀에 공사명 표시
  // A2 = "공사명 : "&갑지!D4&" 중 유리공사"
};

// 엑셀 파일 다운로드
export const downloadGisungExcel = (siteData, gisungData, filename = '기성금청구서.xlsx') => {
  const workbook = generateGisungExcel(siteData, gisungData);
  XLSX.writeFile(workbook, filename);
};

// 엑셀 파일 업로드 및 파싱
export const parseGisungExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 기성현황 시트 파싱 (새로운 형식)
        const gisungSheet = workbook.Sheets['기성현황'];
        if (gisungSheet) {
          const gisungData = XLSX.utils.sheet_to_json(gisungSheet);
          console.log('기성현황 시트 데이터:', gisungData);
          
          if (gisungData && gisungData.length > 0) {
            // 첫 번째 행에서 현장명과 기성월 추출
            const firstRow = gisungData[0];
            const siteName = firstRow['현장명'] || '';
            const gisungMonth = firstRow['기성월'] || '';
            
            // 기성 데이터 변환 (기본적으로 미청구 상태로 설정)
            const items = gisungData.map(row => ({
              itemName: row['현장명'] || '',
              specification: '',
              unit: '',
              contractQuantity: 0,
              contractUnitPrice: 0,
              contractAmount: Number(row['계약금액']) || 0,
              previousQuantity: 0,
              previousAmount: Number(row['전회기성']) || 0,
              currentQuantity: 0,
              currentAmount: Number(row['기성금액']) || 0,
              totalQuantity: 0,
              totalAmount: Number(row['전회기성']) + Number(row['기성금액']) || 0,
              remark: row['비고'] || '',
              claimStatus: '미청구' // 기본적으로 미청구 상태로 설정
            }));
            
            const summary = {
              totalContractAmount: items.reduce((sum, item) => sum + item.contractAmount, 0),
              totalPreviousAmount: items.reduce((sum, item) => sum + item.previousAmount, 0),
              totalCurrentAmount: items.reduce((sum, item) => sum + item.currentAmount, 0),
              totalAmount: items.reduce((sum, item) => sum + item.totalAmount, 0)
            };
            
            resolve({
              siteName,
              gisungMonth,
              items,
              summary
            });
            return;
          }
        }
        
        // 기성금 내역서 시트 파싱 (기존 형식)
        const detailSheet = workbook.Sheets['기성금 내역서'];
        if (!detailSheet) {
          throw new Error('기성현황 또는 기성금 내역서 시트를 찾을 수 없습니다.');
        }
        
        const detailData = XLSX.utils.sheet_to_json(detailSheet, { header: 1 });
        
        // 데이터 파싱
        const parsedData = parseDetailData(detailData);
        
        resolve(parsedData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('파일 읽기 오류'));
    reader.readAsArrayBuffer(file);
  });
};

// 상세 데이터 파싱
const parseDetailData = (data) => {
  const items = [];
  
  // 헤더 건너뛰기 (4행까지)
  for (let i = 4; i < data.length - 4; i++) {
    const row = data[i];
    if (row && row[0] && row[0] !== '선급금' && row[0] !== '총원가' && row[0] !== '부가가치세' && row[0] !== '총계') {
      items.push({
        itemName: row[0] || '',
        specification: row[1] || '',
        unit: row[2] || '',
        contractQuantity: Number(row[3]) || 0,
        contractUnitPrice: Number(row[4]) || 0,
        contractAmount: Number(row[5]) || 0,
        previousQuantity: Number(row[6]) || 0,
        previousAmount: Number(row[7]) || 0,
        currentQuantity: Number(row[8]) || 0,
        currentAmount: Number(row[9]) || 0,
        totalQuantity: Number(row[10]) || 0,
        totalAmount: Number(row[11]) || 0,
        remark: row[12] || ''
      });
    }
  }
  
  return {
    items,
    summary: {
      totalContractAmount: data[data.length - 4]?.[5] || 0,
      totalPreviousAmount: data[data.length - 4]?.[7] || 0,
      totalCurrentAmount: data[data.length - 4]?.[9] || 0,
      totalAmount: data[data.length - 4]?.[11] || 0
    }
  };
};

// 일정관리 엑셀 다운로드 (날짜 병합, 정렬, 테두리 스타일 개선)
export const exportScheduleToExcel = (data, fileName) => {
  try {
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('유효하지 않은 데이터입니다.');
    }
    
    const wb = XLSX.utils.book_new();
    
    // 현재 날짜 정보 가져오기
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    
    // 헤더 텍스트 생성: "2025년 1월 01일~1월 15일(현재) 일정 BRIEF"
    const headerText = `${currentYear}년 ${currentMonth}월 01일~${currentMonth}월 ${currentDay}일(현재) 일정 BRIEF`;
    
    // 헤더 행 추가 (A~E열 병합)
    const headerRow = [headerText, '', '', '', ''];
    const dataHeaders = ['일자', '분류', '현장명', '설명', '체크박스유무'];
    
    // 데이터를 2차원 배열로 변환
    const rows = [headerRow, dataHeaders];
    
    // 날짜별로 그룹화하여 병합 정보 생성
    const mergeInfo = [];
    let currentDate = '';
    let mergeStartRow = 2; // 헤더가 2행이므로 2부터 시작
    let mergeCount = 0;
    
    data.forEach((row, index) => {
      const rowData = [
        row.일자 || '',
        row.분류 || '',
        row.현장명 || '',
        row.설명 || '',
        row.체크박스유무 || ''
      ];
      rows.push(rowData);
      
      // 날짜 병합 정보 계산
      if (row.일자 && row.일자 !== currentDate) {
        // 이전 날짜의 병합 정보 저장
        if (currentDate && mergeCount > 0) {
          mergeInfo.push({
            s: { r: mergeStartRow, c: 0 },
            e: { r: mergeStartRow + mergeCount - 1, c: 0 }
          });
        }
        currentDate = row.일자;
        mergeStartRow = index + 2; // 헤더가 2행이므로 +2
        mergeCount = 1;
      } else if (row.일자 === currentDate) {
        mergeCount++;
      }
    });
    
    // 마지막 날짜의 병합 정보 저장
    if (currentDate && mergeCount > 0) {
      mergeInfo.push({
        s: { r: mergeStartRow, c: 0 },
        e: { r: mergeStartRow + mergeCount - 1, c: 0 }
      });
    }
    
    // 헤더 병합 정보 추가 (A~E열 병합)
    mergeInfo.push({
      s: { r: 0, c: 0 },
      e: { r: 0, c: 4 }
    });
    
    // 워크시트 생성
    const ws = XLSX.utils.aoa_to_sheet(rows);
    
    // 셀 병합 설정
    ws['!merges'] = mergeInfo;
    
    // 스타일링 적용
    applyScheduleStyling(ws, rows.length, dataHeaders.length);
    
    // 워크북에 시트 추가
    XLSX.utils.book_append_sheet(wb, ws, '일정관리');
    
    // 파일 다운로드
    XLSX.writeFile(wb, `${fileName}.xlsx`);
    
    return { success: true, fileName: `${fileName}.xlsx` };
  } catch (error) {
    console.error('일정관리 엑셀 내보내기 실패:', error);
    return { success: false, error: error.message };
  }
};

// 일정관리 엑셀 스타일링
const applyScheduleStyling = (ws, rowCount, colCount) => {
  try {
    // 메인 헤더 스타일링 (A~E열 병합된 헤더)
    const mainHeaderCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (ws[mainHeaderCell]) {
      ws[mainHeaderCell].s = {
        font: {
          name: '맑은 고딕',
          sz: 18,
          bold: true,
          color: { rgb: '000000' }
        },
        fill: {
          fgColor: { rgb: 'E6E6E6' }
        },
        alignment: {
          horizontal: 'center',
          vertical: 'center'
        },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };
    }
    
    // 데이터 헤더 스타일링 (두 번째 행)
    for (let col = 0; col < colCount; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 1, c: col });
      if (!ws[cellAddress]) continue;
      
      ws[cellAddress].s = {
        font: {
          name: '맑은 고딕',
          sz: 12,
          bold: true,
          color: { rgb: 'FFFFFF' }
        },
        fill: {
          fgColor: { rgb: '4472C4' }
        },
        alignment: {
          horizontal: 'center',
          vertical: 'center'
        },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };
    }
    
    // 데이터 행 스타일링
    for (let row = 2; row < rowCount; row++) {
      for (let col = 0; col < colCount; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellAddress]) continue;
        
        const cell = ws[cellAddress];
        
        // 기본 스타일
        cell.s = {
          font: {
            name: '맑은 고딕',
            sz: 10,
            color: { rgb: '000000' }
          },
          alignment: {
            horizontal: 'center',
            vertical: 'center'
          },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
        
        // 날짜 열 (첫 번째 열) - 중앙 정렬
        if (col === 0) {
          cell.s.alignment.horizontal = 'center';
          cell.s.font.bold = true;
        }
        
        // 분류 열 (두 번째 열) - 중앙 정렬
        if (col === 1) {
          cell.s.alignment.horizontal = 'center';
        }
        
        // 현장명 열 (세 번째 열) - 왼쪽 정렬
        if (col === 2) {
          cell.s.alignment.horizontal = 'left';
        }
        
        // 설명 열 (네 번째 열) - 왼쪽 정렬
        if (col === 3) {
          cell.s.alignment.horizontal = 'left';
        }
        
        // 체크박스유무 열 (다섯 번째 열) - 중앙 정렬, 색상 적용
        if (col === 4) {
          cell.s.alignment.horizontal = 'center';
          if (cell.v === '체크') {
            cell.s.font.color = { rgb: 'FF0000' }; // 빨간색
            cell.s.font.bold = true;
          } else if (cell.v === '미체크') {
            cell.s.font.color = { rgb: '000000' }; // 검은색
          }
        }
      }
    }
    
    // 열 너비 설정
    ws['!cols'] = [
      { width: 12 }, // 일자
      { width: 8 },  // 분류
      { width: 30 }, // 현장명
      { width: 40 }, // 설명
      { width: 10 }  // 체크박스유무
    ];
    
    // 행 높이 설정
    ws['!rows'] = [];
    for (let i = 0; i < rowCount; i++) {
      if (i === 0) {
        ws['!rows'][i] = { hpt: 30 }; // 메인 헤더는 30포인트 높이
      } else {
        ws['!rows'][i] = { hpt: 20 }; // 나머지는 20포인트 높이
      }
    }
    
    // 날짜별 굵은 테두리 적용
    let currentDate = '';
    let dateStartRow = 2; // 헤더가 2행이므로 2부터 시작
    
    for (let row = 2; row < rowCount; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 });
      const cell = ws[cellAddress];
      
      if (cell && cell.v && cell.v !== currentDate) {
        // 이전 날짜 그룹의 마지막 행에 굵은 테두리 적용
        if (currentDate && row > dateStartRow) {
          for (let col = 0; col < colCount; col++) {
            const borderCellAddress = XLSX.utils.encode_cell({ r: row - 1, c: col });
            const borderCell = ws[borderCellAddress];
            if (borderCell) {
              borderCell.s.border.bottom = { style: 'thick', color: { rgb: '000000' } };
            }
          }
        }
        
        // 새 날짜 그룹의 첫 번째 행에 굵은 테두리 적용
        for (let col = 0; col < colCount; col++) {
          const borderCellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const borderCell = ws[borderCellAddress];
          if (borderCell) {
            borderCell.s.border.top = { style: 'thick', color: { rgb: '000000' } };
          }
        }
        
        currentDate = cell.v;
        dateStartRow = row;
      }
    }
    
    // 마지막 날짜 그룹의 마지막 행에 굵은 테두리 적용
    if (currentDate) {
      for (let col = 0; col < colCount; col++) {
        const borderCellAddress = XLSX.utils.encode_cell({ r: rowCount - 1, c: col });
        const borderCell = ws[borderCellAddress];
        if (borderCell) {
          borderCell.s.border.bottom = { style: 'thick', color: { rgb: '000000' } };
        }
      }
    }
    
  } catch (error) {
    console.error('일정관리 스타일링 적용 실패:', error);
  }
}; 

/**
 * 현장관리 세부내역과 기성현황을 연동한 엑셀 양식 생성
 */
export const generateIntegratedGisungExcel = async (siteName, gisungData, siteData) => {
  try {
    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    
    // 1. 갑지 시트 생성
    const gajiData = generateGajiSheet(siteName, gisungData, siteData);
    const gajiWorksheet = XLSX.utils.aoa_to_sheet(gajiData);
    XLSX.utils.book_append_sheet(workbook, gajiWorksheet, '갑지');
    
    // 2. 내역서 시트 생성
    const naeyukData = generateNaeyukSheet(siteName, siteData);
    const naeyukWorksheet = XLSX.utils.aoa_to_sheet(naeyukData);
    XLSX.utils.book_append_sheet(workbook, naeyukWorksheet, '내역서');
    
    // 3. 기성현황 시트 생성
    const gisungDataSheet = generateGisungSheet(siteName, gisungData);
    const gisungWorksheet = XLSX.utils.aoa_to_sheet(gisungDataSheet);
    XLSX.utils.book_append_sheet(workbook, gisungWorksheet, '기성현황');
    
    // 파일 다운로드
    const fileName = `${siteName}_기성현황_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    console.log('통합 기성현황 엑셀 생성 완료:', fileName);
    return fileName;
  } catch (error) {
    console.error('통합 기성현황 엑셀 생성 오류:', error);
    throw error;
  }
};

/**
 * 갑지 시트 데이터 생성
 */
const generateGajiSheet = (siteName, gisungData, siteData) => {
  const data = [];
  
  // 헤더
  data.push(['기성현황 갑지']);
  data.push([]);
  data.push(['현장명', siteName]);
  data.push(['계약금액', formatNumber(siteData.contractAmount || 0) + '원']);
  data.push(['선급금', formatNumber(siteData.advance || 0) + '원']);
  data.push([]);
  
  // 기성 현황 테이블 헤더
  data.push(['차수', '기성월', '기성금액', '누계기성', '비고']);
  
  // 기성 데이터
  let cumulativeAmount = parseFloat(siteData.advance) || 0;
  gisungData.forEach((gisung, index) => {
    const gisungAmount = parseFloat(gisung.gisungAmount) || 0;
    cumulativeAmount += gisungAmount;
    
    data.push([
      gisung.sequence || `${index + 1}차`,
      gisung.gisungMonth || '',
      formatNumber(gisungAmount) + '원',
      formatNumber(cumulativeAmount) + '원',
      gisung.note || ''
    ]);
  });
  
  return data;
};

/**
 * 내역서 시트 데이터 생성
 */
const generateNaeyukSheet = (siteName, siteData) => {
  const data = [];
  
  // 헤더
  data.push(['기성현황 내역서']);
  data.push([]);
  data.push(['현장명', siteName]);
  data.push(['계약금액', formatNumber(siteData.contractAmount || 0) + '원']);
  data.push([]);
  
  // 내역서 테이블 헤더
  data.push(['', '항목명', '', '물량', '', '', '', '', '', '', '단가', '금액']);
  
  // 세부내역 데이터
  const items = siteData.items || [];
  items.forEach((item, index) => {
    data.push([
      index + 1,
      item.name || '',
      '',
      formatNumber(item.quantity || 0),
      '',
      '',
      '',
      '',
      '',
      '',
      formatNumber(item.unitPrice || 0),
      formatNumber(item.totalPrice || 0)
    ]);
  });
  
  // 합계
  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);
  data.push(['', '합계', '', '', '', '', '', '', '', '', '', formatNumber(totalAmount)]);
  
  return data;
};

/**
 * 기성현황 시트 데이터 생성
 */
const generateGisungSheet = (siteName, gisungData) => {
  const data = [];
  
  // 헤더
  data.push(['기성현황 상세']);
  data.push([]);
  data.push(['현장명', siteName]);
  data.push([]);
  
  // 기성현황 테이블 헤더
  data.push(['차수', '기성월', '카테고리', '기성금액', '비고']);
  
  // 기성 데이터
  gisungData.forEach((gisung, index) => {
    data.push([
      gisung.sequence || `${index + 1}차`,
      gisung.gisungMonth || '',
      gisung.category || '',
      formatNumber(parseFloat(gisung.gisungAmount) || 0) + '원',
      gisung.note || ''
    ]);
  });
  
  return data;
};

/**
 * 숫자 포맷팅 (천 단위 콤마)
 */
const formatNumber = (num) => {
  if (!num && num !== 0) return '';
  const numValue = parseFloat(num);
  if (isNaN(numValue)) return '';
  
  // 소숫점 둘째자리까지 표시 (필요시만)
  return numValue.toLocaleString('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

/**
 * 통화 포맷팅 (천 단위 콤마 + 원)
 */
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '';
  const numValue = parseFloat(amount);
  if (isNaN(numValue)) return '';
  
  // 소숫점 둘째자리까지 표시 (필요시만)
  return `${numValue.toLocaleString('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}원`;
}; 

// Python 스크립트 기반 개선된 기성 현장별 엑셀 다운로드
export const generateImprovedGisungExcel = (siteData, gisungData) => {
  try {
    const wb = XLSX.utils.book_new();
    
    // 갑지 시트 생성
    const gapjiSheet = createImprovedGapjiSheet(siteData, gisungData);
    XLSX.utils.book_append_sheet(wb, gapjiSheet, '갑지');
    
    // 기성금 내역서 시트 생성
    const detailSheet = createImprovedDetailSheet(siteData, gisungData);
    XLSX.utils.book_append_sheet(wb, detailSheet, '기성금 내역서');
    
    // 스타일링 적용
    applyImprovedGisungStyling(gapjiSheet, detailSheet);
    
    return wb;
  } catch (error) {
    console.error('개선된 기성 엑셀 생성 실패:', error);
    throw error;
  }
};

// 개선된 갑지 시트 생성 (Python 스크립트 기반)
const createImprovedGapjiSheet = (siteData, gisungData) => {
  const ws = XLSX.utils.aoa_to_sheet([
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '공사명', siteData?.name || ''],
    ['', '', '', ''],
    ['', '', '시공사', siteData?.contractor || ''],
    ['', '', '', ''],
    ['', '', '하도급 공사명', siteData?.subcontract || ''],
    ['', '', '', ''],
    ['', '', '계약(착공)일자', formatDate(siteData?.startDate) || ''],
    ['', '', '', ''],
    ['', '', '준공일자', formatDate(siteData?.finishDate) || ''],
    ['', '', '', ''],
    ['', '', '계약금액', formatCurrency(siteData?.contractAmount) || ''],
    ['', '', '', ''],
    ['', '', '선급금', formatCurrency(siteData?.advance) || ''],
    ['', '', '', ''],
    ['', '', '기성금액', formatCurrency(calculateTotalGisung(gisungData)) || ''],
    ['', '', '', ''],
    ['', '', '차수', gisungData?.[0]?.sequence || ''],
    ['', '', '', ''],
    ['', '', '기성월', formatMonth(gisungData?.[0]?.gisungMonth) || '']
  ]);
  
  return ws;
};

// 개선된 기성금 내역서 시트 생성 (Python 스크립트 기반)
const createImprovedDetailSheet = (siteData, gisungData) => {
  const headers = [
    '현장명', '차수', '기성월', '기성금액', '전회기성', '누계기성', '결제방법', '비고'
  ];
  
  const rows = [headers];
  
  // 기성 데이터를 현재 구조에 맞게 변환
  if (gisungData && gisungData.length > 0) {
    gisungData.forEach((gisung, index) => {
      const prevGisung = Number(gisung.prevGisung) || 0;
      const currentGisung = Number(gisung.gisungAmount) || 0;
      const cumulativeGisung = prevGisung + currentGisung;
      
      const row = [
        gisung.name || '',                    // 현장명
        gisung.sequence || `${index + 1}차`,  // 차수
        formatMonth(gisung.gisungMonth) || '', // 기성월
        formatCurrency(gisung.gisungAmount) || '', // 기성금액
        formatCurrency(gisung.prevGisung) || '', // 전회기성
        formatCurrency(cumulativeGisung) || '', // 누계기성
        gisung.paymentMethod || '',           // 결제방법
        gisung.note || ''                     // 비고
      ];
      rows.push(row);
    });
  }
  
  // 선급금 행 추가
  rows.push(['', '', '', '', '', '', '', '']);
  rows.push(['선급금', '', '', '', '', formatCurrency(siteData?.advance) || '', '', '']);
  
  const ws = XLSX.utils.aoa_to_sheet(rows);
  return ws;
};

// 개선된 스타일링 적용
const applyImprovedGisungStyling = (gapjiSheet, detailSheet) => {
  // 갑지 시트 스타일링
  if (gapjiSheet['!ref']) {
    const gapjiRange = XLSX.utils.decode_range(gapjiSheet['!ref']);
    
    // 헤더 셀 스타일링 (C열)
    for (let row = 2; row <= gapjiRange.e.r; row += 2) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 2 });
      if (gapjiSheet[cellAddress]) {
        gapjiSheet[cellAddress].s = {
          font: { bold: true, color: { rgb: '000000' } },
          fill: { fgColor: { rgb: 'E6E6E6' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }
    }
    
    // 값 셀 스타일링 (D열)
    for (let row = 2; row <= gapjiRange.e.r; row += 2) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 3 });
      if (gapjiSheet[cellAddress]) {
        gapjiSheet[cellAddress].s = {
          font: { color: { rgb: '000000' } },
          alignment: { horizontal: 'left', vertical: 'center' },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }
    }
  }
  
  // 기성금 내역서 스타일링
  if (detailSheet['!ref']) {
    const detailRange = XLSX.utils.decode_range(detailSheet['!ref']);
    
    // 헤더 행 스타일링
    for (let col = 0; col <= detailRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (detailSheet[cellAddress]) {
        detailSheet[cellAddress].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4472C4' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }
    }
    
    // 데이터 행 스타일링
    for (let row = 1; row <= detailRange.e.r; row++) {
      for (let col = 0; col <= detailRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (detailSheet[cellAddress]) {
          detailSheet[cellAddress].s = {
            font: { color: { rgb: '000000' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' }
            }
          };
        }
      }
    }
  }
};

// 헬퍼 함수들
const formatDate = (date) => {
  if (!date) return '';
  try {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return '';
  }
};

const formatMonth = (monthStr) => {
  if (!monthStr) return '';
  try {
    const [year, month] = monthStr.split('-');
    return `${year}년 ${month}월`;
  } catch {
    return monthStr;
  }
};

const calculateTotalGisung = (gisungData) => {
  if (!gisungData || !Array.isArray(gisungData)) return 0;
  return gisungData.reduce((sum, item) => sum + (Number(item.gisungAmount) || 0), 0);
}; 
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

// 기성금청구서 엑셀 생성 (Firebase Storage 전용)
export const generateGisungExcel = async (siteData, gisungData) => {
  try {
    console.log('📄 기성금청구서 생성 시작:', { 
      siteName: siteData.name, 
      gisungData: gisungData
    });
    
    // Firebase Storage에서 기성금청구서 템플릿 다운로드
    const { ref, getDownloadURL } = await import('firebase/storage');
    const { storage } = await import('../firebase');
    
    const templateRef = ref(storage, 'templates/NEWgisung.xlsx');
    
    try {
      const templateURL = await getDownloadURL(templateRef);
      console.log('✅ Firebase Storage 템플릿 URL 가져오기 성공:', templateURL);
      
      // 템플릿 파일 가져오기
      const response = await fetch(templateURL);
      if (!response.ok) {
        throw new Error(`템플릿 파일 다운로드 실패: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('✅ Firebase Storage 템플릿 파일 다운로드 완료:', arrayBuffer.byteLength, 'bytes');
      
      // XLSX로 워크북 읽기
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellFormula: true });
      console.log('✅ Firebase Storage 템플릿 워크북 로드 완료');
      
      // 기성금 내역서 시트에 데이터 입력
      const detailSheet = workbook.Sheets['기성금 내역서'];
      if (detailSheet) {
        console.log('📝 기성금 내역서 시트에 데이터 입력...');
        
        // 실제 현장 데이터 사용 (유동적, 순서 보장)
        let items = [];
        
        // 기성 데이터에서 실제 항목들 가져오기
        if (gisungData && gisungData.length > 0) {
          const currentGisung = gisungData[0]; // 첫 번째 기성 데이터 사용
          if (currentGisung.items && Array.isArray(currentGisung.items)) {
            items = currentGisung.items.map((item, index) => ({
              name: item.itemName || item.name || '',
              specification: item.specification || '',
              unit: item.unit || '',
              contractQuantity: Number(item.contractQuantity || item.quantity || 0),
              contractUnitPrice: Number(item.contractUnitPrice || item.price || 0),
              previousQuantity: Number(item.previousQuantity || 0),
              currentQuantity: Number(item.currentQuantity || 0),
              rowIndex: item.rowIndex || index // 순서 보장용 인덱스
            }));
            
            // rowIndex로 정렬하여 순서 보장
            items.sort((a, b) => (a.rowIndex || 0) - (b.rowIndex || 0));
            
            console.log('📋 기성 데이터 항목들 (순서대로):', items.map((item, index) => `${index + 1}. ${item.name}`));
          }
        }
        
        // 기성 데이터가 없으면 기본 템플릿 사용 (견적서 순서대로)
        if (items.length === 0) {
          items = [
            // 1. 학교창(관공서)전용유리 - 모든 종류 먼저
            { name: '학교창(관공서)전용유리', specification: '22mm(5+12+5), MCT(HS)+아르곤+투명, 고단열 더블로이 복층유리', unit: 'M²', contractQuantity: 0, contractUnitPrice: 49000 },
            { name: '학교창(관공서)전용유리', specification: '22mm(5+12+5), MCT(HS)+아르곤+칼라, 고단열 더블로이 복층유리', unit: 'M²', contractQuantity: 0, contractUnitPrice: 46000 },
            { name: '학교창(관공서)전용유리', specification: '24mm(5+14+5), MCT(HS)+아르곤+투명, 고단열 더블로이 복층유리', unit: 'M²', contractQuantity: 0, contractUnitPrice: 46000 },
            { name: '학교창(관공서)전용유리', specification: '24mm(5+14+5), MCT(HS)+아르곤+칼라, 고단열 더블로이 복층유리', unit: 'M²', contractQuantity: 0, contractUnitPrice: 48000 },
            { name: '학교창(관공서)전용유리', specification: '24mm(6+12+6), MCT(HS)+아르곤+투명, 고단열 더블로이 복층유리', unit: 'M²', contractQuantity: 0, contractUnitPrice: 51000 },
            { name: '학교창(관공서)전용유리', specification: '43mm(5+14+5+14+5), MCT(HS)+아르곤+투명(HS)+아르곤+MCT(HS), 고단열 더블로이 삼중', unit: 'M²', contractQuantity: 0, contractUnitPrice: 110000 },
            
            // 2. 복층유리 - 모든 종류
            { name: '복층유리', specification: '복층유리, 투명, 16mm', unit: 'M²', contractQuantity: 0, contractUnitPrice: 22000 },
            { name: '복층유리', specification: '복층유리, 투명, 22mm, 건조공기', unit: 'M²', contractQuantity: 0, contractUnitPrice: 26000 },
            { name: '복층유리', specification: '복층유리, 컬러, 22mm, 건조공기, 그린', unit: 'M²', contractQuantity: 0, contractUnitPrice: 29000 },
            
            // 3. 창호유리설치/복층유리 - 모든 종류
            { name: '창호유리설치/복층유리', specification: '유리두께 16mm 이하', unit: 'M²', contractQuantity: 0, contractUnitPrice: 15000 },
            { name: '창호유리설치/복층유리', specification: '유리두께 22mm 이하', unit: 'M²', contractQuantity: 0, contractUnitPrice: 15000 },
            { name: '창호유리설치/복층유리', specification: '유리두께 24mm 이하', unit: 'M²', contractQuantity: 0, contractUnitPrice: 18000 },
            { name: '창호유리설치/복층유리', specification: '유리뚜께 43mm 이하', unit: 'M²', contractQuantity: 0, contractUnitPrice: 20000 },
            
            // 4. 유리주위 코킹
            { name: '유리주위 코킹', specification: '복층유리 5×5, 실리콘(양면)', unit: 'M', contractQuantity: 0, contractUnitPrice: 300 },
            
            // 5. 방습거울
            { name: '방습거울', specification: '5mm,틀포함', unit: 'M²', contractQuantity: 0, contractUnitPrice: 100000 }
            // 단수정리는 마지막에 별도 추가
          ];
        }
        
        // 원래 방식으로 간단하게 입력
        let currentRow = 6;
        
        items.forEach((item, index) => {
          detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 0 })] = { v: item.specification };
          detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 1 })] = { v: item.name };
          detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 2 })] = { v: item.unit };
          detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 3 })] = { v: item.contractQuantity };
          detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 4 })] = { v: item.contractUnitPrice };
          detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 6 })] = { v: item.previousQuantity || 0 };
          detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 8 })] = { v: item.currentQuantity || 0 };
          currentRow++;
        });
        
        // 6. 마지막에 단수정리 추가
        detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 0 })] = { v: '단수정리' };
        detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 1 })] = { v: 'NEGO' };
        detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 2 })] = { v: '식' };
        detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 3 })] = { v: 1 };
        detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 4 })] = { v: -341570 };
        detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 5 })] = { v: -341570 };
        
        console.log('✅ 데이터 입력 완료');
      }
      
      return workbook;
      
    } catch (error) {
      console.error('❌ Firebase Storage 템플릿 로드 실패:', error);
      throw new Error(`Firebase Storage에서 템플릿을 가져올 수 없습니다: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ 기성금청구서 생성 실패:', error);
    throw error;
  }
};

// 기성금 내역서에 수식 적용하는 함수
const applyGisungFormulas = (worksheet) => {
  // 헤더가 5행이므로 데이터는 6행부터 시작 (0부터 시작하므로 5)
  const startRow = 5;
  const endRow = 20; // 단수정리까지 포함
  
  // F열에 수식 적용 (계약금액 - 금액) - F6부터 F20까지
  for (let row = startRow; row <= endRow; row++) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 5 }); // F열
    worksheet[cellAddress] = {
      f: `=D${row + 1}*E${row + 1}`, // 수량 × 단가
      v: 0 // 기본값
    };
  }
  
  // H열에 수식 적용 (전회기성 - 금액) - H6부터 H20까지
  for (let row = startRow; row <= endRow; row++) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 7 }); // H열
    worksheet[cellAddress] = {
      f: `=G${row + 1}*E${row + 1}`, // 전회기성 수량 × 단가
      v: 0 // 기본값
    };
  }
  
  // J열에 수식 적용 (금회기성 - 금액) - J6부터 J20까지
  for (let row = startRow; row <= endRow; row++) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 9 }); // J열
    worksheet[cellAddress] = {
      f: `=I${row + 1}*E${row + 1}`, // 금회기성 수량 × 단가
      v: 0 // 기본값
    };
  }
  
  // K열에 수식 적용 (합계 - 수량) - K6부터 K20까지
  for (let row = startRow; row <= endRow; row++) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 10 }); // K열
    worksheet[cellAddress] = {
      f: `=G${row + 1}+I${row + 1}`, // 전회기성 수량 + 금회기성 수량
      v: 0 // 기본값
    };
  }
  
  // L열에 수식 적용 (합계 - 금액) - L6부터 L20까지
  for (let row = startRow; row <= endRow; row++) {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 11 }); // L열
    worksheet[cellAddress] = {
      f: `=H${row + 1}+J${row + 1}`, // 전회기성 금액 + 금회기성 금액
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
};

// 기성금 내역서 시트 데이터 생성 (기존 템플릿 유지, 데이터만 수정)
const createGisungDetailSheet = (siteData, gisungData) => {
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
  
  // 사진에 나온 정확한 데이터로 수정 (단수정리 중복 제거)
  const basicItems = [
    { name: '복층유리', specification: '투명, 16mm', unit: 'M²', contractQuantity: 6, contractUnitPrice: 22000 },
    { name: '복층유리', specification: '투명, 22mm, 건조공기', unit: 'M²', contractQuantity: 10, contractUnitPrice: 26000 },
    { name: '복층유리', specification: '컬러, 22mm, 건조공기, 그린', unit: 'M²', contractQuantity: 10, contractUnitPrice: 29000 },
    { name: '학교창(관공서)전용유리', specification: '22mm(5+12+5), MCT(HS)+아르곤+틱', unit: 'M²', contractQuantity: 1, contractUnitPrice: 49000 },
    { name: '학교창(관공서)전용유리', specification: '22mm(5+12+5), MCT(HS)+아르곤+킬', unit: 'M²', contractQuantity: 1, contractUnitPrice: 46000 },
    { name: '학교창(관공서)전용유리', specification: '24mm(5+14+5), MCT(HS)+아르곤+', unit: 'M²', contractQuantity: 35, contractUnitPrice: 46000 },
    { name: '학교창(관공서)전용유리', specification: '24mm(5+14+5), MCT(HS)+아르곤+킬', unit: 'M²', contractQuantity: 17, contractUnitPrice: 48000 },
    { name: '학교창(관공서)전용유리', specification: '24mm(6+12+6), MCT(HS)+아르곤+', unit: 'M²', contractQuantity: 6, contractUnitPrice: 51000 },
    { name: '학교창(관공서)전용유리', specification: '43mm(5+14+5+14+5), MCT(HS)+아', unit: 'M²', contractQuantity: 13, contractUnitPrice: 110000 },
    { name: '창호유리설치/복층유리', specification: '유리두께 16mm 이하', unit: 'M²', contractQuantity: 6, contractUnitPrice: 15000 },
    { name: '창호유리설치/복층유리', specification: '유리두께 22mm 이하', unit: 'M²', contractQuantity: 21, contractUnitPrice: 15000 },
    { name: '창호유리설치/복층유리', specification: '유리두께 24mm 이하', unit: 'M²', contractQuantity: 57, contractUnitPrice: 18000 },
    { name: '창호유리설치/복층유리', specification: '유리뚜께 43mm 이하', unit: 'M²', contractQuantity: 13, contractUnitPrice: 20000 },
    { name: '유리주위 코킹', specification: '복층유리 5x5, 실리콘(양면)', unit: 'M', contractQuantity: 509, contractUnitPrice: 300 },
    { name: '방습거울', specification: '5mm,틀포함', unit: 'M²', contractQuantity: 1, contractUnitPrice: 100000 }
    // 단수정리 제거 - 마지막에 한 번만 추가
  ];
  
  let hasData = false;
  
  // 기본 항목들 추가 (기존 템플릿 구조 유지)
  basicItems.forEach(item => {
    data.push([
      item.name,                    // A열: 품명
      item.specification,           // B열: 규격
      item.unit,                    // C열: 단위
      item.contractQuantity,        // D열: 수량(계약수량)
      item.contractUnitPrice,       // E열: 단가
      0,                           // F열: 금액 (수식으로 계산)
      0,                           // G열: 수량(전회)
      0,                           // H열: 금액(전회) (수식으로 계산)
      0,                           // I열: 수량(금회)
      0,                           // J열: 금액(금회) (수식으로 계산)
      0,                           // K열: 수량(합계) (수식으로 계산)
      0,                           // L열: 금액(합계) (수식으로 계산)
      ''                           // M열: 비고
    ]);
  });
  
  // 실제 기성 데이터가 있는 경우 해당 데이터로 덮어쓰기 (순서 보장)
  if (safeGisungData.length > 0) {
    const currentGisung = safeGisungData[safeGisungData.length - 1];
    
    // items가 있는 경우
    if (currentGisung.items && Array.isArray(currentGisung.items) && currentGisung.items.length > 0) {
      hasData = true;
      const items = currentGisung.items;
      
      // 기성 데이터를 순서대로 정렬
      const sortedItems = [...items].sort((a, b) => (a.rowIndex || 0) - (b.rowIndex || 0));
      
      console.log('📋 기성 데이터 순서:', sortedItems.map((item, index) => `${index + 1}. ${item.itemName || item.name} (행 ${item.rowIndex || 'N/A'})`));
      
      // 순서대로 데이터 업데이트 (인덱스 매칭)
      sortedItems.forEach((item, index) => {
        // item이 객체인지 확인하고 안전하게 처리
        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
          return;
        }
        
        // 기본 항목들과 매칭하여 데이터 업데이트
        const matchingIndex = data.findIndex(row => {
          const rowName = row[0] || '';
          const itemName = item.itemName || item.name || '';
          return rowName === itemName;
        });
        
        if (matchingIndex !== -1) {
          // 기존 행을 실제 데이터로 업데이트
          const contractQuantity = Number(item.contractQuantity || item.quantity || 0);
          const contractUnitPrice = Number(item.contractUnitPrice || item.price || 0);
          const previousQuantity = Number(item.previousQuantity || 0);
          const currentQuantity = Number(item.currentQuantity || 0);
          
          data[matchingIndex] = [
            String(item.itemName || item.name || ''),  // A열: 품명
            String(item.specification || ''),          // B열: 규격
            String(item.unit || ''),                   // C열: 단위
            contractQuantity,                          // D열: 수량(계약수량)
            contractUnitPrice,                         // E열: 단가
            0,                                        // F열: 금액 (수식으로 계산)
            previousQuantity,                          // G열: 수량(전회)
            0,                                        // H열: 금액(전회) (수식으로 계산)
            currentQuantity,                           // I열: 수량(금회)
            0,                                        // J열: 금액(금회) (수식으로 계산)
            0,                                        // K열: 수량(합계) (수식으로 계산)
            0,                                        // L열: 금액(합계) (수식으로 계산)
            String(item.remark || '')                 // M열: 비고
          ];
          
          console.log(`✅ ${index + 1}번째 항목 매칭: ${item.itemName || item.name} (행 ${item.rowIndex || 'N/A'})`);
        }
      });
    }
  }
  
  // 모든 항목들 필터링 (단수정리 포함)
  const filteredData = [];
  
  for (const row of data) {
    const itemName = row[0] || '';
    
    // 집계 행들을 만나면 중단
    if (itemName.includes('총 공사계') || itemName.includes('총공사계') || 
        itemName.includes('부가세') || itemName.includes('계약금액')) {
      console.log('🛑 집계행 발견 후 중단:', itemName);
      break;
    } else if (itemName) {
      // 모든 항목 포함 (단수정리 포함)
      filteredData.push(row);
    }
  }
  
  console.log('✅ 모든 항목들 필터링 완료 (단수정리 포함)');
  
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

// 기성금 내역서 스타일링 적용
const applyGisungDetailStyling = (detailSheet) => {
  try {
    // 제목 병합 (A1:M1)
    if (!detailSheet['!merges']) detailSheet['!merges'] = [];
    detailSheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } });
    
    // 헤더 스타일링 (13개 컬럼) - 5행
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
    
    // 열 너비 설정
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
    console.error('기성금 내역서 스타일링 적용 실패:', error);
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
export const downloadGisungExcel = async (siteData, gisungData, filename = '기성금청구서.xlsx') => {
  try {
    const workbook = await generateGisungExcel(siteData, gisungData);
    XLSX.writeFile(workbook, filename);
    console.log('✅ 기성금청구서 다운로드 완료:', filename);
  } catch (error) {
    console.error('❌ 기성금청구서 다운로드 실패:', error);
    throw error;
  }
};

// 엑셀 파일 업로드 및 파싱
export const parseGisungExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellFormula: true });
        const normNum = (v) => {
          if (v === null || v === undefined || v === '') return 0;
          const s = String(v).trim().replace(/[,\s]/g, '');
          const n = parseFloat(s);
          return Number.isFinite(n) ? n : 0;
        };
        const tryReadGapji = () => {
          // 갑지 시트를 찾아 A36, H16, H20, H23을 읽는다
          let gapjiName = null;
          if (workbook.Sheets['갑지']) gapjiName = '갑지';
          else {
            const found = workbook.SheetNames.find(n => n && n.includes('갑'));
            if (found) gapjiName = found;
          }
          if (!gapjiName) return null;
          const ws = workbook.Sheets[gapjiName];
          if (!ws) return null;
          const read = (addr) => (ws[addr] ? ws[addr].v : '');
          const rawMonth = (read('A36') || '').toString().trim();
          // A36 예시: 2025.08. → YYYY-MM으로 변환
          let gisungMonth = '';
          const m = rawMonth.match(/(\d{4})[\.-](\d{1,2})/);
          if (m) gisungMonth = `${m[1]}-${m[2].padStart(2, '0')}`;
          const advance = normNum(read('H16'));
          const previous = normNum(read('H18'));
          const current = normNum(read('H20'));
          const cumulative = normNum(read('H23')) || (previous + current);
          return { gisungMonth, advance, current, cumulative, previous };
        };
        
        // 기성현황 시트 파싱 (새로운 형식)
        const gisungSheet = workbook.Sheets['기성현황'];
        if (gisungSheet) {
        const gisungData = XLSX.utils.sheet_to_json(gisungSheet, { defval: '' });
          console.log('기성현황 시트 데이터:', gisungData);
          
          if (gisungData && gisungData.length > 0) {
            // 첫 번째 행에서 현장명과 기성월 추출
            const firstRow = gisungData[0];
            const siteName = (firstRow['현장명'] || '').toString().trim();
            let gisungMonth = (firstRow['기성월'] || '').toString().trim();
            
            // 기성 데이터 변환 (기본적으로 미청구 상태로 설정)
            const num = (v) => {
              if (v === null || v === undefined || v === '') return 0;
              const s = String(v).trim().replace(/,/g, '');
              const n = parseFloat(s);
              return Number.isFinite(n) ? n : 0;
            };
            const items = gisungData.map(row => ({
              itemName: (row['현장명'] || '').toString().trim(),
              gisungMonth: (row['기성월'] || '').toString().trim(),
              specification: '',
              unit: '',
              contractQuantity: 0,
              contractUnitPrice: 0,
              contractAmount: num(row['계약금액']),
              previousQuantity: 0,
              previousAmount: num(row['전회기성']),
              currentQuantity: 0,
              currentAmount: num(row['기성금액']),
              totalQuantity: 0,
              totalAmount: num(row['전회기성']) + num(row['기성금액']),
              remark: (row['비고'] || '').toString().trim(),
              claimStatus: '미청구' // 기본적으로 미청구 상태로 설정
            }));
            
            // 갑지에서 보정값 읽어 반영
            const gapji = tryReadGapji();
            const summary = (() => {
              const base = {
                totalContractAmount: items.reduce((sum, item) => sum + item.contractAmount, 0),
                totalPreviousAmount: items.reduce((sum, item) => sum + item.previousAmount, 0),
                totalCurrentAmount: items.reduce((sum, item) => sum + item.currentAmount, 0),
                totalAmount: items.reduce((sum, item) => sum + item.totalAmount, 0)
              };
              if (gapji) {
                if (!gisungMonth && gapji.gisungMonth) gisungMonth = gapji.gisungMonth;
                return {
                  totalContractAmount: base.totalContractAmount,
                  totalPreviousAmount: gapji.previous,
                  totalCurrentAmount: gapji.current,
                  totalAmount: gapji.cumulative,
                  advance: gapji.advance
                };
              }
              return base;
            })();
            
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
        
        const detailData = XLSX.utils.sheet_to_json(detailSheet, { header: 1, defval: '' });
        
        // 데이터 파싱
        const parsedData = parseDetailData(detailData);
        // 갑지 시트 있으면 요약값 교체
        const gapji = tryReadGapji();
        if (gapji) {
          parsedData.gisungMonth = gapji.gisungMonth || parsedData.gisungMonth;
          parsedData.summary = parsedData.summary || {};
          parsedData.summary.totalPreviousAmount = gapji.previous;
          parsedData.summary.totalCurrentAmount = gapji.current;
          parsedData.summary.totalAmount = gapji.cumulative;
          parsedData.summary.advance = gapji.advance;
        }
        
        resolve(parsedData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('파일 읽기 오류'));
    reader.readAsArrayBuffer(file);
  });
};

// 상세 데이터 파싱 (순서 보장)
const parseDetailData = (data) => {
  const items = [];
  
  // 헤더 건너뛰기 (4행까지)
  for (let i = 4; i < data.length - 4; i++) {
    const row = data[i];
    const itemName = row && row[0] ? String(row[0]).trim() : '';
    
    // 단수정리나 NEGO 이후의 집계 행들을 만나면 중단 (총공사계, 부가세, 계약금액 등 제외)
    if (itemName.includes('총 공사계') || itemName.includes('총공사계') || 
        itemName.includes('부가세') || itemName.includes('계약금액')) {
      console.log(`🛑 집계행 발견: ${i + 1}행 - 파싱 중단`);
      break;
    }
    
    // 유효한 행만 처리
    if (row && row[0] && row[0] !== '선급금' && row[0] !== '총원가' && row[0] !== '부가가치세' && row[0] !== '총계') {
      // 단수정리 중복 제거 로직 제거 - 실제 데이터의 단수정리를 포함
      
      // 숫자 파싱 함수 개선 (소수점 둘째자리까지)
      const parseNumber = (value) => {
        if (value === null || value === undefined || value === '') return 0;
        const str = String(value).trim().replace(/[,\s]/g, '');
        const num = parseFloat(str);
        return Number.isFinite(num) ? Math.round(num * 100) / 100 : 0;
      };
      
      // K열이 수식인지 확인 (G+I 형태)
      const kCell = row[10];
      let totalQuantity = 0;
      let isKFormula = false;
      
      console.log(`🔍 K열 셀 분석 (행 ${i + 1}):`, {
        kCell: kCell,
        kCellType: typeof kCell,
        hasFormula: kCell && typeof kCell === 'object' && kCell.f,
        formula: kCell && typeof kCell === 'object' ? kCell.f : '없음'
      });
      
      if (kCell && typeof kCell === 'object' && kCell.f) {
        // 수식인 경우
        const formula = kCell.f.toString().toUpperCase();
        if (formula.includes('G') && formula.includes('I') && formula.includes('+')) {
          isKFormula = true;
          totalQuantity = parseNumber(kCell.v || kCell.result || 0);
          console.log(`✅ K열 수식 발견: ${formula}, 계산값: ${totalQuantity}`);
        } else {
          console.log(`⚠️ K열 수식이지만 G+I 형태가 아님: ${formula}`);
        }
      } else {
        // 일반 값인 경우
        totalQuantity = parseNumber(row[10]);
        console.log(`📝 K열 일반값: ${totalQuantity}`);
      }
      
      const item = {
        itemName: String(row[1] || '').trim(), // B열을 품명으로
        specification: String(row[0]).trim(), // A열을 규격으로
        unit: String(row[2] || '').trim(),
        contractQuantity: parseNumber(row[3]),
        contractUnitPrice: parseNumber(row[4]),
        contractAmount: parseNumber(row[5]),
        previousQuantity: parseNumber(row[6]),
        previousAmount: parseNumber(row[7]),
        currentQuantity: parseNumber(row[8]),
        currentAmount: parseNumber(row[9]),
        totalQuantity: totalQuantity,
        totalAmount: parseNumber(row[11]),
        remark: String(row[12] || '').trim(),
        isKFormula: isKFormula, // K열이 수식인지 표시
        rowIndex: i // 행 인덱스 추가 (순서 보장용)
      };
      
      console.log(`파싱된 항목: ${item.itemName} (행 ${i + 1})`, {
        contractQuantity: item.contractQuantity.toFixed(2),
        currentQuantity: item.currentQuantity.toFixed(2),
        totalQuantity: item.totalQuantity.toFixed(2),
        contractAmount: item.contractAmount.toFixed(2),
        currentAmount: item.currentAmount.toFixed(2),
        totalAmount: item.totalAmount.toFixed(2)
      });
      
      items.push(item);
    }
  }
  
  // 행 인덱스로 정렬하여 순서 보장
  items.sort((a, b) => a.rowIndex - b.rowIndex);
  
  console.log('📋 파싱된 항목들 (순서대로):', items.map((item, index) => `${index + 1}. ${item.itemName} (행 ${item.rowIndex + 1})`));
  
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
    
    // 데이터에서 실제 월 정보 추출
    let dataYear = new Date().getFullYear();
    let dataMonth = new Date().getMonth() + 1;
    let firstDay = 1;
    let lastDay = new Date().getDate();
    
    // 데이터에서 날짜 정보 추출하여 월 범위 계산
    const validDates = data
      .filter(row => row.일자 && row.일자.trim() !== '')
      .map(row => {
        // 날짜 형식 변환 (YYYY-MM-DD 또는 MM/DD 등)
        let dateStr = row.일자;
        if (typeof dateStr === 'string') {
          // YYYY-MM-DD 형식인 경우
          if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length >= 2) {
              return {
                year: parseInt(parts[0]),
                month: parseInt(parts[1]),
                day: parseInt(parts[2])
              };
            }
          }
          // MM/DD 형식인 경우
          else if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length >= 2) {
              return {
                year: dataYear, // 현재 연도 사용
                month: parseInt(parts[0]),
                day: parseInt(parts[1])
              };
            }
          }
        }
        return null;
      })
      .filter(date => date !== null);
    
    if (validDates.length > 0) {
      // 가장 이른 날짜와 늦은 날짜 찾기
      const sortedDates = validDates.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        if (a.month !== b.month) return a.month - b.month;
        return a.day - b.day;
      });
      
      const earliest = sortedDates[0];
      const latest = sortedDates[sortedDates.length - 1];
      
      dataYear = earliest.year;
      dataMonth = earliest.month;
      firstDay = earliest.day;
      lastDay = latest.day;
    }
    
    // 헤더 텍스트 생성: 실제 데이터의 월 정보 사용
    const headerText = `${dataYear}년 ${dataMonth}월 ${firstDay}일~${dataMonth}월 ${lastDay}일 일정 BRIEF`;
    
    // 헤더 행 추가 (A~E열 병합)
    const headerRow = [headerText, '', '', '', ''];
    const dataHeaders = ['일자', '분류', '현장명', '설명', '체크박스유무'];
    
    // 데이터를 2차원 배열로 변환 (날짜 형식 개선)
    const rows = [headerRow, dataHeaders];
    
    // 날짜별로 그룹화하여 병합 정보 생성
    const mergeInfo = [];
    let currentDate = '';
    let mergeStartRow = 2; // 헤더가 2행이므로 2부터 시작
    let mergeCount = 0;
    
    data.forEach((row, index) => {
      // 날짜 형식 개선
      let formattedDate = row.일자 || '';
      if (formattedDate && typeof formattedDate === 'string') {
        // YYYY-MM-DD를 MM/DD 형식으로 변환
        if (formattedDate.includes('-')) {
          const parts = formattedDate.split('-');
          if (parts.length >= 3) {
            const month = parseInt(parts[1]);
            const day = parseInt(parts[2]);
            formattedDate = `${month}/${day}`;
          }
        }
      }
      
      const rowData = [
        formattedDate,
        row.분류 || '',
        row.현장명 || '',
        row.설명 || '',
        row.체크박스유무 || ''
      ];
      rows.push(rowData);
      
      // 날짜 병합 정보 계산
      if (formattedDate && formattedDate !== currentDate) {
        // 이전 날짜의 병합 정보 저장
        if (currentDate && mergeCount > 0) {
          mergeInfo.push({
            s: { r: mergeStartRow, c: 0 },
            e: { r: mergeStartRow + mergeCount - 1, c: 0 }
          });
        }
        currentDate = formattedDate;
        mergeStartRow = index + 2; // 헤더가 2행이므로 +2
        mergeCount = 1;
      } else if (formattedDate === currentDate) {
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
  if (amount === null || amount === undefined || amount === '') return '';
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
    ['', '', '선급금', formatCurrency(siteData?.advance || 0) || ''],
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
  rows.push(['선급금', '', '', '', '', formatCurrency(siteData?.advance || 0) || '', '', '']);
  
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
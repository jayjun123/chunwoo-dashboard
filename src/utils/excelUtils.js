import * as XLSX from 'xlsx';

// 전문적인 엑셀 디자인으로 내보내기
export const exportToExcel = (data, sheetName, fileName, options = {}) => {
  try {
    console.log('exportToExcel 함수 시작');
    console.log('받은 데이터:', data);
    console.log('데이터 타입:', typeof data);
    console.log('데이터가 배열인가?', Array.isArray(data));
    
    // 데이터 검증
    if (!data || !Array.isArray(data)) {
      console.error('데이터 검증 실패:', { data, isArray: Array.isArray(data) });
      throw new Error('유효하지 않은 데이터입니다. 배열 형태의 데이터가 필요합니다.');
    }
    
    if (data.length === 0) {
      console.error('데이터가 비어있음');
      throw new Error('내보낼 데이터가 없습니다.');
    }
    
    console.log('데이터 검증 통과, 데이터 개수:', data.length);
    console.log('첫 번째 데이터 샘플:', data[0]);
    
    // 데이터 정리 (undefined, null 값 처리)
    const cleanData = data.map((row, index) => {
      console.log(`데이터 ${index} 처리 중:`, row);
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
      console.log(`데이터 ${index} 정리 완료:`, cleanRow);
      return cleanRow;
    });
    
    console.log('정리된 데이터:', cleanData);
    console.log('정리된 데이터 개수:', cleanData.length);
    
    const wb = XLSX.utils.book_new();
    
    // 워크시트 생성
    console.log('워크시트 생성 시작');
    const ws = XLSX.utils.json_to_sheet(cleanData);
    console.log('워크시트 생성 완료:', ws);
    console.log('워크시트 범위:', ws['!ref']);
    
    // 전문적인 엑셀 디자인 적용
    applyExcelStyling(ws, cleanData, options);
    
    // 워크북에 시트 추가
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // 파일명에 날짜 추가
    const dateStr = new Date().toISOString().split('T')[0];
    const finalFileName = fileName ? `${fileName}_${dateStr}.xlsx` : `export_${dateStr}.xlsx`;
    
    console.log('최종 파일명:', finalFileName);
    
    // 엑셀 파일 다운로드
    XLSX.writeFile(wb, finalFileName);
    
    console.log('엑셀 파일 다운로드 완료');
    return { success: true, fileName: finalFileName };
  } catch (error) {
    console.error('엑셀 내보내기 실패:', error);
    console.error('에러 스택:', error.stack);
    return { success: false, error: error.message };
  }
};

// 전문적인 엑셀 스타일링 적용
const applyExcelStyling = (ws, data, options) => {
  try {
    // 워크시트 범위 확인
    if (!ws['!ref']) {
      console.warn('워크시트가 비어있습니다.');
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
    
    console.log('엑셀 스타일링 적용 완료');
  } catch (error) {
    console.error('엑셀 스타일링 적용 실패:', error);
  }
};

// 캘린더 데이터를 엑셀로 내보내기
export const exportCalendarToExcel = (calendarItems, year, month, fileName) => {
  try {
    console.log('캘린더 엑셀 내보내기 시작');
    
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
    
    console.log('캘린더 엑셀 내보내기 완료');
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
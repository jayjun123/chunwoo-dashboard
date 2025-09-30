import * as XLSX from 'xlsx';

/**
 * 데이터를 Excel 파일로 내보내기
 */
export const exportToExcel = (data, fileName = 'export.xlsx', sheetName = 'Sheet1') => {
  try {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // 열 너비 자동 조정
    const colWidths = [];
    data.forEach(row => {
      Object.keys(row).forEach((key, index) => {
        const cellValue = String(row[key] || '');
        if (!colWidths[index] || cellValue.length > colWidths[index]) {
          colWidths[index] = cellValue.length;
        }
      });
    });
    
    worksheet['!cols'] = colWidths.map(width => ({ width: Math.min(width + 2, 50) }));
    
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // 더 안전한 엑셀 다운로드 방법 사용
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array' 
    });
    
    // Blob 생성 및 다운로드
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    // 다운로드 링크 생성
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    
    // 링크 클릭하여 다운로드 실행
    document.body.appendChild(link);
    link.click();
    
    // 정리
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    // 파일명에 날짜 추가하여 고유성 보장
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const uniqueFileName = `${fileName.replace('.xlsx', '')}_${dateStr}_${timeStr}.xlsx`;
    
    console.log('Excel 파일 내보내기 완료:', uniqueFileName);
    return uniqueFileName;
  } catch (error) {
    console.error('Excel 파일 내보내기 실패:', error);
    throw error;
  }
};

/**
 * 캘린더 데이터를 Excel로 내보내기
 */
export const exportCalendarToExcel = (calendarData, fileName = '일정관리.xlsx', sheetName = '일정관리') => {
  try {
    // 데이터가 비어있는지 확인
    if (!calendarData || calendarData.length === 0) {
      return {
        success: false,
        error: '내보낼 데이터가 없습니다.',
        fileName: null
      };
    }

    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    
    // JSON 데이터를 워크시트로 변환
    const worksheet = XLSX.utils.json_to_sheet(calendarData);
    
    // 열 너비 자동 조정
    const colWidths = [];
    calendarData.forEach(row => {
      Object.keys(row).forEach((key, index) => {
        const cellValue = String(row[key] || '');
        if (!colWidths[index] || cellValue.length > colWidths[index]) {
          colWidths[index] = cellValue.length;
        }
      });
    });
    
    // 최소 너비 설정 및 최대 너비 제한
    worksheet['!cols'] = colWidths.map(width => ({ 
      width: Math.max(Math.min(width + 2, 50), 8) 
    }));
    
    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // 파일명 정리 (특수문자 제거, 공백 처리)
    let cleanFileName = fileName
      .replace(/[<>:"/\\|?*]/g, '') // Windows에서 사용할 수 없는 문자 제거
      .replace(/\s+/g, '_') // 공백을 언더스코어로 변경
      .trim();
    
    // 파일명에 확장자 추가 (없는 경우)
    const finalFileName = cleanFileName.endsWith('.xlsx') ? cleanFileName : `${cleanFileName}.xlsx`;
    
    // 현재 날짜를 파일명에 추가하여 고유성 보장
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const uniqueFileName = `${cleanFileName.replace('.xlsx', '')}_${dateStr}_${timeStr}.xlsx`;
    
    // Blob을 사용하여 파일 다운로드 (더 안정적)
    try {
      // 워크북을 ArrayBuffer로 변환
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      
      // Blob 생성
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // 다운로드 링크 생성
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = uniqueFileName;
      
      // 링크 클릭하여 다운로드 시작
      document.body.appendChild(link);
      link.click();
      
      // 정리
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('캘린더 Excel 파일 내보내기 완료 (Blob 방식):', uniqueFileName);
      
      return {
        success: true,
        fileName: uniqueFileName,
        error: null
      };
      
    } catch (blobError) {
      console.warn('Blob 방식 실패, 기존 방식으로 시도:', blobError);
      
      // 기존 방식으로 시도
      XLSX.writeFile(workbook, uniqueFileName);
      
      console.log('캘린더 Excel 파일 내보내기 완료 (기존 방식):', uniqueFileName);
      
      return {
        success: true,
        fileName: uniqueFileName,
        error: null
      };
    }
    
  } catch (error) {
    console.error('캘린더 Excel 파일 내보내기 실패:', error);
    
    return {
      success: false,
      fileName: null,
      error: error.message || '알 수 없는 오류가 발생했습니다.'
    };
  }
};

/**
 * 일정 데이터를 Excel로 내보내기
 */
export const exportScheduleToExcel = async (scheduleData, fileName = 'schedule.xlsx', year = null, month = null) => {
  try {
    // ExcelJS 동적 import
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('일정관리');
    
    // 현재 날짜 정보
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month !== null ? month + 1 : new Date().getMonth() + 1;
    
    // 1행: 제목 (A~E열 병합)
    const titleRow = worksheet.getRow(1);
    titleRow.height = 30;
    const titleCell = titleRow.getCell(1);
    titleCell.value = `${currentYear}년 ${currentMonth}월 천우건업(주) 일일보고서`;
    titleCell.font = { size: 22, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // A1~F1 병합
    worksheet.mergeCells('A1:F1');
    
    // 2행: 빈 행 (여백)
    const emptyRow = worksheet.getRow(2);
    emptyRow.height = 10;
    
    // 3행: 헤더
    const headerRow = worksheet.getRow(3);
    headerRow.height = 25;
    const headers = ['일자', '분류', '현장명', '설명', '시공팀', '체크박스유무'];
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { size: 12, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // 4행부터: 데이터
    scheduleData.forEach((row, index) => {
      const dataRow = worksheet.getRow(index + 4);
      dataRow.height = 20;
      
      const rowData = [
        row.일자 || '',
        row.분류 || '',
        row.현장명 || '',
        row.설명 || '',
        row.E열 || '',
        row.체크박스유무 || ''
      ];
      
      rowData.forEach((value, colIndex) => {
        const cell = dataRow.getCell(colIndex + 1);
        cell.value = value;
        cell.font = { size: 10 };
        cell.alignment = { 
          horizontal: colIndex === 0 ? 'center' : 'left', 
          vertical: 'middle' 
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
    
    // 열 너비 설정
    worksheet.columns = [
      { width: 12 }, // 일자
      { width: 10 }, // 분류
      { width: 25 }, // 현장명
      { width: 30 }, // 설명
      { width: 20 }, // E열
      { width: 15 }  // 체크박스유무
    ];
    
    // 파일명 정리
    let cleanFileName = fileName
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .trim();
    
    // 현재 날짜를 파일명에 추가
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const uniqueFileName = `${cleanFileName.replace('.xlsx', '')}_${dateStr}_${timeStr}.xlsx`;
    
    // Excel 파일 생성
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Blob 생성 및 다운로드
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    // 다운로드 링크 생성
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = uniqueFileName;
    
    // 링크 클릭하여 다운로드 실행
    document.body.appendChild(link);
    link.click();
    
    // 정리
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log('일정 Excel 파일 내보내기 완료:', uniqueFileName);
    return uniqueFileName;
  } catch (error) {
    console.error('일정 Excel 파일 내보내기 실패:', error);
    throw error;
  }
};

/**
 * 기성 데이터를 Excel로 내보내기
 */
export const exportGisungToExcel = (gisungData, fileName = 'gisung.xlsx') => {
  try {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(gisungData);
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Gisung');
    
    // 파일명 정리 (특수문자 제거, 공백 처리)
    let cleanFileName = fileName
      .replace(/[<>:"/\\|?*]/g, '') // Windows에서 사용할 수 없는 문자 제거
      .replace(/\s+/g, '_') // 공백을 언더스코어로 변경
      .trim();
    
    // 파일명에 확장자 추가 (없는 경우)
    const finalFileName = cleanFileName.endsWith('.xlsx') ? cleanFileName : `${cleanFileName}.xlsx`;
    
    // 현재 날짜를 파일명에 추가하여 고유성 보장
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const uniqueFileName = `${cleanFileName.replace('.xlsx', '')}_${dateStr}_${timeStr}.xlsx`;
    
    // 더 안전한 엑셀 다운로드 방법 사용
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array' 
    });
    
    // Blob 생성 및 다운로드
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    // 다운로드 링크 생성
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = uniqueFileName;
    
    // 링크 클릭하여 다운로드 실행
    document.body.appendChild(link);
    link.click();
    
    // 정리
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log('기성 Excel 파일 내보내기 완료:', uniqueFileName);
    return uniqueFileName;
  } catch (error) {
    console.error('기성 Excel 파일 내보내기 실패:', error);
    throw error;
  }
};

/**
 * 기성 데이터 파싱
 */
export const parseGisungExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (workbook.SheetNames.length === 0) {
          throw new Error('Excel 파일에 시트가 없습니다.');
        }
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        resolve({
          data: jsonData,
          sheetName: firstSheetName,
          fileName: file.name
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * 실물 데이터 파싱
 */
export const parseSilmulExcel = (file, targetSiteName = '') => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {
          type: 'array',
          cellFormula: true,  // 계산된 값 가져오기
          cellText: true,     // 텍스트 값도 읽기
          cellDates: true,    // 날짜 값 읽기
          cellNF: true,       // 숫자 형식 정보 읽기
          cellStyles: false,
          cellHTML: false,
          raw: false          // 계산된 값을 가져오기 위해 raw: false
        });

        // 첫 번째 시트 사용 (시트가 없으면 에러)
        console.log('사용 가능한 시트들:', workbook.SheetNames);

        if (workbook.SheetNames.length === 0) {
          throw new Error('Excel 파일에 시트가 없습니다.');
        }

        const firstSheetName = workbook.SheetNames[0];
        const wonjangSheet = workbook.Sheets[firstSheetName];

        console.log(`첫 번째 시트 "${firstSheetName}" 사용`);

        // 숨겨진 행과 열 정보 추출
        const hiddenRows = [];
        const hiddenCols = [];

        // 숨겨진 행 정보 추출
        if (wonjangSheet['!rows']) {
          wonjangSheet['!rows'].forEach((row, index) => {
            if (row && row.hidden) {
              hiddenRows.push(index);
            }
          });
        }

        // 숨겨진 열 정보 추출
        if (wonjangSheet['!cols']) {
          wonjangSheet['!cols'].forEach((col, index) => {
            if (col && col.hidden) {
              hiddenCols.push(index);
            }
          });
        }

        console.log('숨겨진 행:', hiddenRows);
        console.log('숨겨진 열:', hiddenCols);

        // 숨겨진 행 범위 분석
        if (hiddenRows.length > 0) {
          const sortedHiddenRows = hiddenRows.sort((a, b) => a - b);
          const firstHidden = sortedHiddenRows[0];
          const lastHidden = sortedHiddenRows[sortedHiddenRows.length - 1];

          console.log('연속 숨겨진 행 범위:');
          console.log(`- 첫 번째 숨겨진 행: ${firstHidden + 1}행`);
          console.log(`- 마지막 숨겨진 행: ${lastHidden + 1}행`);
          console.log(`- 숨겨진 행 수: ${hiddenRows.length}개`);

          // 연속된 숨겨진 행 범위 찾기
          const ranges = [];
          let start = sortedHiddenRows[0];
          let end = sortedHiddenRows[0];

          for (let i = 1; i < sortedHiddenRows.length; i++) {
            if (sortedHiddenRows[i] === end + 1) {
              end = sortedHiddenRows[i];
            } else {
              ranges.push({ start: start + 1, end: end + 1 });
              start = sortedHiddenRows[i];
              end = sortedHiddenRows[i];
            }
          }
          ranges.push({ start: start + 1, end: end + 1 });

          console.log('연속 숨겨진 행 범위:');
          ranges.forEach((range, index) => {
            console.log(`  ${index + 1}. ${range.start}행~ ${range.end}행(${range.end - range.start + 1}개)`);
          });
        }

        // 숨겨진 행이 너무 많은 경우 (1-1443행이 숨겨진 경우) 사용자에게 현장명 선택
        if (hiddenRows.length > 1000) {
          console.log('너무 많은 행이 숨겨져 있습니다. 사용자에게 현장명을 선택하도록 합니다.');
          console.log(`숨겨진 행 수: ${hiddenRows.length}`);
        }

        // 이제 시트 데이터를 배열로 변환 (전체 데이터 사용, 숨겨진 행 포함)
        const wonjangData = XLSX.utils.sheet_to_json(wonjangSheet, {
          header: 1,
          defval: '',
          raw: false,  // raw: false로 변경하여 계산된 값 가져오기
          dateNF: 'yyyy-mm-dd'
        });

        // F, G, J 열 데이터 샘플 확인 (디버깅용)
        console.log('=== F, G, J 열 데이터 샘플 확인 ===');
        for (let i = 0; i < Math.min(20, wonjangData.length); i++) {
          const row = wonjangData[i];
          if (row && row.length >= 10) {
            const fValue = row[5]; // F열
            const gValue = row[6]; // G열  
            const jValue = row[9]; // J열
            
            if (fValue || gValue || jValue) {
              console.log(`행 ${i + 1}: F열=${fValue} (${typeof fValue}), G열=${gValue} (${typeof gValue}), J열=${jValue} (${typeof jValue})`);
            }
          }
        }

        console.log(`전체 데이터 행 수: ${wonjangData.length}`);
        console.log(`데이터 범위: 1행~ ${wonjangData.length}행`);

        // 실물 데이터 파싱 (현장명과 항목별로 그룹화)
        const silmulData = parseWonjangData(wonjangData, targetSiteName, hiddenRows, hiddenCols);

        // 처리 결과에 숨겨진 행 정보 추가
        const result = {
          ...silmulData,
          processedRows: wonjangData.length,
          fileName: file.name
        };

        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * 원장 시트 데이터 파싱 (핵심 로직)
 */
export const parseWonjangData = (data, targetSiteName = '', hiddenRows = [], hiddenCols = []) => {
  console.log(`=== 실물 원장 파싱 시작 ===`);
  console.log(`타겟 현장명: "${targetSiteName}"`);

  const siteData = [];
  let currentSite = null;

  // 데이터의 각 행을 순회하면서 현장명과 항목 정보 추출
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    if (!row || row.length < 10) continue;

    const cValue = String(row[2] || '').trim(); // C열에 있는 현장명 찾기

    // 괄호로 시작하는 경우 현장명으로 인식
    if (cValue.startsWith('(')) {
      // 이전 현장 데이터 저장
      if (currentSite) {
        siteData.push(currentSite);
        console.log(`이전 현장 "${currentSite.siteName}" 저장 완료 (${currentSite.items.length}개 항목)`);
      }

      // 새로운 현장 시작
      currentSite = {
        siteName: cValue,
        startRow: rowIndex + 1,
        items: []
      };

      console.log(`새로운 현장 "${cValue}" 데이터 파싱 시작 (행${rowIndex + 1})`);
    }

    // 현장명이 설정된 상태에서 항목 데이터 파싱
    if (currentSite && !cValue.startsWith('(')) {
      const itemName = String(row[2] || '').trim(); // C열 항목명
      
      // 숫자 처리 함수 (계산된 값 우선 처리)
      const getCellValue = (cellValue) => {
        if (cellValue === null || cellValue === undefined || cellValue === '') return 0;

        console.log(`🔍 셀 값 분석: ${cellValue} (타입: ${typeof cellValue})`);

        // 숫자 값이 객체로 반환되는 경우 처리
        if (typeof cellValue === 'object' && cellValue !== null) {
          console.log(`📦 객체 타입 셀 값:`, cellValue);
          
          // 계산된 값(result)을 최우선으로 처리
          if (cellValue.result !== undefined) {
            const result = parseFloat(cellValue.result);
            if (!isNaN(result)) {
              console.log(`✅ F/G/J열 값 파싱 (계산된 값 result): ${cellValue.result} -> ${result}`);
              return result;
            }
          }
          
          // 계산된 값(w)을 두 번째로 처리
          if (cellValue.w !== undefined) {
            const wValue = parseFloat(cellValue.w);
            if (!isNaN(wValue)) {
              console.log(`✅ F/G/J열 값 파싱 (계산된 값 w): ${cellValue.w} -> ${wValue}`);
              return wValue;
            }
          }
          
          // 원본 값(v)을 세 번째로 처리
          if (cellValue.v !== undefined) {
            const value = parseFloat(cellValue.v);
            if (!isNaN(value)) {
              console.log(`✅ F/G/J열 값 파싱 (원본 값 v): ${cellValue.v} -> ${value}`);
              return value;
            }
          }
          
          // 숫자 타입인 경우
          if (cellValue.t === 'n' && cellValue.v !== undefined) {
            const value = parseFloat(cellValue.v);
            if (!isNaN(value)) {
              console.log(`✅ F/G/J열 값 파싱 (숫자타입): ${cellValue.v} -> ${value}`);
              return value;
            }
          }
          
          // 문자열 타입인 경우
          if (cellValue.t === 's' && cellValue.v !== undefined) {
            const cleanValue = cellValue.v.trim().replace(/[,\s]/g, '');
            const parsed = parseFloat(cleanValue);
            if (!isNaN(parsed)) {
              console.log(`✅ F/G/J열 값 파싱 (문자열타입): "${cellValue.v}" -> ${parsed}`);
              return parsed;
            }
          }
          
          console.log('❌ 알 수 없는 숫자 객체:', cellValue);
          return 0;
        }

        // 문자열이나 숫자 값 처리
        if (typeof cellValue === 'string') {
          const cleanValue = cellValue.trim().replace(/[,\s]/g, '');
          const parsed = parseFloat(cleanValue);
          if (!isNaN(parsed)) {
            console.log(`✅ F/G/J열 값 파싱 (문자열): "${cellValue}" -> ${parsed}`);
            return parsed;
          } else {
            console.log(`❌ 문자열 파싱 실패: "${cellValue}"`);
          }
        } else if (typeof cellValue === 'number') {
          if (!isNaN(cellValue)) {
            console.log(`✅ F/G/J열 값 파싱 (숫자): ${cellValue}`);
            return cellValue;
          } else {
            console.log(`❌ 숫자 파싱 실패: ${cellValue}`);
          }
        }

        console.log(`❌ F/G/J열 값 파싱 최종 실패: ${cellValue} (타입: ${typeof cellValue})`);
        return 0;
      };

      const fValue = getCellValue(row[5]); // F열 수량
      const gValue = getCellValue(row[6]); // G열 단가
      const jValue = getCellValue(row[9]); // J열 금액

      // F, G, J 열 원본 값 로깅 (디버깅용)
      if (rowIndex < 100) { // 처음 100행만 로깅
        console.log(`행 ${rowIndex + 1} 파싱:`, {
          itemName: `"${itemName}"`,
          fOriginal: row[5],
          fParsed: fValue,
          gOriginal: row[6], 
          gParsed: gValue,
          jOriginal: row[9],
          jParsed: jValue,
          fType: typeof row[5],
          gType: typeof row[6],
          jType: typeof row[9],
          fIsNumber: !isNaN(fValue),
          gIsNumber: !isNaN(gValue),
          jIsNumber: !isNaN(jValue)
        });
      }

      // 항목명이 있거나 F,G,J 값이 있으면 추가
      if (itemName || fValue > 0 || gValue > 0 || jValue > 0) {
        const item = {
          itemName: itemName,
          fValue: fValue,
          gValue: gValue,
          jValue: jValue,
          row: rowIndex + 1
        };

        currentSite.items.push(item);

        // 모든 현장에 대해 로그 출력 (디버깅용)
        console.log(`항목 추가 (${currentSite.siteName}): "${itemName}" (F: ${fValue}, G: ${gValue}, J: ${jValue})`);
      } else {
        // 항목명이 없는 경우 로그 출력 (디버깅용)
        if (currentSite && rowIndex < 100) {
          console.log(`빈 항목 파싱 실패 (${currentSite.siteName} 행${rowIndex + 1}): itemName="${itemName}", 길이=${itemName ? itemName.length : 0}`);
        }
      }
    }
  }

  // 마지막 현장 데이터 저장
  if (currentSite) {
    siteData.push(currentSite);
  }

  console.log(`총 파싱된 현장 데이터: ${siteData.length}개 현장`);
  siteData.forEach(site => {
    console.log(`- ${site.siteName}: ${site.items.length}개 항목`);
    if (site.items.length === 0) {
      console.log(`  ⚠️  항목이 없는 현장: ${site.siteName}`);
    } else {
      // 항목이 있는 현장은 첫 3개 항목 출력
      site.items.slice(0, 3).forEach((item, index) => {
        console.log(`  새 항목 ${index + 1}: "${item.itemName}" (F: ${item.fValue}, G: ${item.gValue}, J: ${item.jValue})`);
      });
      if (site.items.length > 3) {
        console.log(`  ... 외 ${site.items.length - 3}개 항목`);
      }
    }
  });

  // 타겟 현장명이 있으면 매칭하는 현장명들 찾기
  if (targetSiteName) {
    const matchingSites = siteData.filter(site => {
      const siteNameClean = site.siteName.toLowerCase().replace(/[()]/g, '').trim();
      const targetClean = targetSiteName.toLowerCase().trim();
      const shouldMatch = siteNameClean.includes(targetClean);

      // 디버깅용 매칭 정보 출력
      console.log(`현장명 매칭 디버깅`, {
        originalName: site.siteName,
        siteNameClean: siteNameClean,
        targetClean: targetClean,
        shouldMatch: shouldMatch
      });

      return shouldMatch;
    });

    console.log(`타겟 "${targetSiteName}"과 매칭되는 현장들: ${matchingSites.length}개`);
    matchingSites.forEach(site => {
      console.log(`- ${site.siteName}: ${site.items.length}개 항목`);
    });

    if (matchingSites.length === 0) {
      // 매칭되는 현장이 없으면 에러 메시지
      console.log(`❌타겟 "${targetSiteName}"과 매칭되는 현장을 찾을 수 없습니다.`);
      return {
        siteName: '',
        items: [],
        siteData: siteData,
        availableSites: [],
        showSelectionDialog: false,
        error: `타겟 "${targetSiteName}"과 매칭되는 현장을 찾을 수 없습니다.`
      };
    } else if (matchingSites.length === 1) {
      // 하나만 매칭되면 자동 선택
      const targetSite = matchingSites[0];
      console.log(`✅단일 현장 매칭: "${targetSite.siteName}"`);

      const aggregatedItems = aggregateItemsByType(targetSite.items);
      return {
        siteName: targetSite.siteName,
        items: aggregatedItems,
        siteData: siteData
      };
    } else {
      // 여러 개 매칭되면 사용자에게 선택
      console.log(`여러 현장명 선택 필요: ${matchingSites.length}개 현장`);
      return {
        siteName: '',
        items: [],
        siteData: siteData,
        availableSites: matchingSites.map(site => site.siteName),
        showSelectionDialog: true
      };
    }
  } else {
    // 타겟 현장명이 없으면 모든 현장 데이터 반환
    const allItems = [];
    siteData.forEach(site => {
      const aggregatedItems = aggregateItemsByType(site.items);
      aggregatedItems.forEach(item => {
        item.siteName = site.siteName;
        allItems.push(item);
      });
    });

    return {
      siteName: '전체 현장',
      items: allItems,
      siteData: siteData,
      availableSites: siteData.map(site => site.siteName)
    };
  }
};

/**
 * 항목별로 집계하는 함수
 */
export const aggregateItemsByType = (items) => {
  const aggregated = {};

  items.forEach(item => {
    // 실물량 데이터만 통합 (기존 계약 데이터는 건드리지 않음)
    let key = item.itemName.trim();
    
    // 실물량 데이터에서만 같은 항목끼리 통합
    if (key.includes('복층') || key.includes('유리') || key.includes('로이복층') || key.includes('창호유리') || 
        key.includes('투명') || key.includes('아르곤') || key.includes('듀라') || key.includes('강화') ||
        key.includes('masterone') || key.includes('master') || key.includes('mct') || key.includes('mzt')) {
      key = '복층유리';
    }
    
    // 22T 투명+아르곤 관련 항목들을 통합
    if (key.includes('22t') || key.includes('22T') || (key.includes('투명') && key.includes('아르곤'))) {
      key = '22T 투명+아르곤';
    }
    
    // 운임비 관련 항목들을 통합
    if (key.includes('운임') || key.includes('지게차') || key.includes('빈용기') || key.includes('출고')) {
      key = '운임비';
    }
    
    if (!aggregated[key]) {
      aggregated[key] = {
        itemName: key,
        fSum: 0, // F열 합계
        gValues: [], // G열 값들 (첫 번째 값만 사용)
        jSum: 0, // J열 합계
        count: 0
      };
    }

    console.log(`🔍 집계 중: "${item.itemName}" -> "${key}"`, {
      fValue: item.fValue,
      gValue: item.gValue,
      jValue: item.jValue,
      현재fSum: aggregated[key].fSum,
      현재jSum: aggregated[key].jSum,
      fValueType: typeof item.fValue,
      gValueType: typeof item.gValue,
      jValueType: typeof item.jValue
    });

    aggregated[key].fSum += item.fValue;
    aggregated[key].jSum += item.jValue;
    aggregated[key].count += 1;

    // G열 값 저장 (첫 번째 값만 사용)
    if (item.gValue > 0) {
      aggregated[key].gValues.push(item.gValue);
    }
  });

  // 집계된 값들로 변환
  return Object.values(aggregated).map(item => {
    // 실물수량 = F열값 ÷ 10.89 (소수점 2자리까지)
    const quantity = item.fSum && !isNaN(item.fSum) ? Math.round((item.fSum / 10.89) * 100) / 100 : 0;
    
    // 단가 = G열값 × 10.89 ÷ 1.1 (첫 번째 값 사용, 정수로 반올림)
    const unitPrice = item.gValues && item.gValues.length > 0 && !isNaN(item.gValues[0]) ? 
      Math.round((item.gValues[0] * 10.89 / 1.1)) : 0;
    
    // 실금액 = J열값 ÷ 1.1 (정수로 반올림)
    const amount = item.jSum && !isNaN(item.jSum) ? Math.round(item.jSum / 1.1) : 0;

    console.log(`항목 "${item.itemName}" 집계 결과:`, {
      fSum: item.fSum,
      gFirst: item.gValues[0] || 0,
      jSum: item.jSum,
      quantity: quantity,
      unitPrice: unitPrice,
      amount: amount,
      calculation: {
        quantityFormula: `${item.fSum} ÷ 10.89 = ${quantity}`,
        unitPriceFormula: `${item.gValues[0] || 0} × 10.89 ÷ 1.1 = ${unitPrice}`,
        amountFormula: `${item.jSum} ÷ 1.1 = ${amount}`
      }
    });

    return {
      itemName: item.itemName,
      quantity: quantity,
      unitPrice: unitPrice,
      amount: amount,
      fSum: item.fSum,
      gFirst: item.gValues[0] || 0,
      jSum: item.jSum
    };
  });
};

/**
 * 데이터 집계 함수
 */
export const aggregateDataBySelectedSites = (siteData, selectedSiteNames) => {
  const selectedSites = siteData.filter(site => 
    selectedSiteNames.includes(site.siteName)
  );
  
  const allItems = [];
  selectedSites.forEach(site => {
    // 각 현장의 아이템들을 집계해서 추가
    const aggregatedItems = aggregateItemsByType(site.items);
    allItems.push(...aggregatedItems);
  });
  
  return {
    siteName: selectedSiteNames.join(', '),
    items: allItems,
    selectedSites: selectedSiteNames
  };
};

/**
 * 계약과 실물 데이터 매칭 (개선된 버전)
 */
export const matchContractWithSilmul = (contractItems, silmulItems) => {
  console.log('🔍 계약-실물 데이터 매칭 시작');
  console.log(`계약 항목 수: ${contractItems.length}, 실물 항목 수: ${silmulItems.length}`);
  
  const unmatchedSilmulItems = [...silmulItems];
  const matchedItems = [];
  
  contractItems.forEach((contractItem, index) => {
    const contractName = contractItem.name || '';
    const contractSpec = contractItem.specification || '';
    const fullContractText = `${contractName} ${contractSpec}`.toLowerCase();
    
    console.log(`\n계약 항목 ${index + 1} 매칭 시도: "${contractName}" (${contractSpec})`);
    
    // 매칭 규칙 (개선된 버전)
    const matchingRules = [
      // 1. 철근 관련 매칭 (가장 정확한 매칭)
      {
        condition: (contractText) => contractText.includes('철근') || contractText.includes('steel'),
        match: (silmulItem) => {
          const itemName = silmulItem.itemName.toLowerCase();
          // 철근 + 숫자 패턴 매칭 (예: "철근 22mm" ↔ "22철근")
          const steelPattern = /철근\s*(\d+)/i;
          const match = contractText.match(steelPattern);
          if (match) {
            const size = match[1];
            return itemName.includes(size) && (itemName.includes('철근') || itemName.includes('철'));
          }
          return itemName.includes('철근') || itemName.includes('철');
        }
      },
      // 2. 클링 관련 매칭
      {
        condition: (contractText) => contractText.includes('클링') || contractText.includes('cl'),
        match: (silmulItem) => {
          const itemName = silmulItem.itemName.toLowerCase();
          return itemName.includes('클링') || itemName.includes('cl');
        }
      },
      // 3. 레일 관련 매칭
      {
        condition: (contractText) => contractText.includes('레일') || contractText.includes('le'),
        match: (silmulItem) => {
          const itemName = silmulItem.itemName.toLowerCase();
          return itemName.includes('레일') || itemName.includes('le');
        }
      },
      // 4. 콘크리트 관련 매칭
      {
        condition: (contractText) => contractText.includes('콘크리트') || contractText.includes('concrete'),
        match: (silmulItem) => {
          const itemName = silmulItem.itemName.toLowerCase();
          return itemName.includes('콘크리트') || itemName.includes('concrete');
        }
      },
      // 5. 유리 관련 매칭 (구체적인 키워드)
      {
        condition: (contractText) => contractText.includes('유리') || contractText.includes('glass') || 
                   contractText.includes('복층') || contractText.includes('투명') || 
                   contractText.includes('아르곤') || contractText.includes('듀라') ||
                   contractText.includes('강화') || contractText.includes('반강화'),
        match: (silmulItem) => {
          const itemName = silmulItem.itemName.toLowerCase();
          
          // 유리 관련 키워드가 있는지 확인
          const hasGlassKeywords = itemName.includes('투명') || itemName.includes('아르곤') || 
                                   itemName.includes('듀라') || itemName.includes('반강화') ||
                                   itemName.includes('강화') || itemName.includes('블루') ||
                                   itemName.includes('그린') || itemName.includes('브론즈') ||
                                   itemName.includes('mct') || itemName.includes('mzt') ||
                                   itemName.includes('skn') || itemName.includes('sks');
          
          if (!hasGlassKeywords) return false;
          
          // 숫자 매칭 확인 (두 자리 이상의 숫자)
          const contractNumbers = fullContractText.match(/\d{2,}/g) || [];
          const itemNumbers = itemName.match(/\d{2,}/g) || [];
          
          if (contractNumbers.length > 0 && itemNumbers.length > 0) {
            const hasCommonNumber = contractNumbers.some(cNum => 
              itemNumbers.some(iNum => cNum === iNum)
            );
            if (hasCommonNumber) {
              console.log(`🔢 유리 숫자 매칭: 계약="${contractNumbers.join(',')}", 실물="${itemNumbers.join(',')}"`);
              return true;
            }
          }
          
          // 키워드 매칭
          const contractWords = fullContractText.split(/\s+/).filter(word => word.length > 2);
          return contractWords.some(keyword => itemName.includes(keyword));
        }
      },
      // 6. 운임비 관련 매칭 (낮은 우선순위)
      {
        condition: (contractText) => contractText.includes('운임') || contractText.includes('운송') || 
                   contractText.includes('지게차') || contractText.includes('빈용기'),
        match: (silmulItem) => {
          const itemName = silmulItem.itemName.toLowerCase();
          return itemName.includes('운임') || itemName.includes('지게차') || 
                 itemName.includes('빈용기') || itemName.includes('출고');
        }
      },
      // 7. 일반적인 키워드 매칭 (가장 낮은 우선순위)
      {
        condition: (contractText) => true,
        match: (silmulItem) => {
          const itemName = silmulItem.itemName.toLowerCase();
          const contractWords = fullContractText.split(/\s+/).filter(word => word.length > 2);
          
          // 숫자가 포함된 경우 우선 매칭
          const contractNumbers = fullContractText.match(/\d+/g) || [];
          const itemNumbers = itemName.match(/\d+/g) || [];
          
          // 숫자가 일치하는 경우 높은 우선순위
          if (contractNumbers.length > 0 && itemNumbers.length > 0) {
            const hasCommonNumber = contractNumbers.some(cNum => 
              itemNumbers.some(iNum => cNum === iNum)
            );
            if (hasCommonNumber) {
              console.log(`🔢 숫자 매칭: 계약="${contractNumbers.join(',')}", 실물="${itemNumbers.join(',')}"`);
              return true;
            }
          }
          
          // 일반 키워드 매칭 (최소 3글자 이상)
          return contractWords.some(keyword => keyword.length >= 3 && itemName.includes(keyword));
        }
      }
    ];
    
    let matchedSilmulItem = null;
    let matchedRuleIndex = -1;
    
    for (let ruleIndex = 0; ruleIndex < matchingRules.length; ruleIndex++) {
      const rule = matchingRules[ruleIndex];
      
      if (rule.condition(fullContractText)) {
        console.log(`  📋 규칙 ${ruleIndex + 1} 적용: ${rule.condition.toString()}`);
        
        const matchedIndex = unmatchedSilmulItems.findIndex(silmulItem => {
          const isMatch = rule.match(silmulItem);
          if (isMatch) {
            console.log(`    🎯 매칭 후보: "${silmulItem.itemName}" (규칙 ${ruleIndex + 1})`);
          }
          return isMatch;
        });
        
        if (matchedIndex !== -1) {
          matchedSilmulItem = unmatchedSilmulItems[matchedIndex];
          matchedRuleIndex = ruleIndex;
          unmatchedSilmulItems.splice(matchedIndex, 1);
          
          console.log(`✅ 매칭 성공 (규칙 ${ruleIndex + 1}): "${matchedSilmulItem.itemName}" (수량: ${matchedSilmulItem.quantity}, 단가: ${matchedSilmulItem.unitPrice}, 금액: ${matchedSilmulItem.amount})`);
          break;
        } else {
          console.log(`    ❌ 규칙 ${ruleIndex + 1}로 매칭 실패`);
        }
      } else {
        console.log(`  ⏭️  규칙 ${ruleIndex + 1} 건너뜀: 조건 불만족`);
      }
    }
    
    if (!matchedSilmulItem) {
      console.log(`❌ 매칭 실패: "${contractName}" (${contractSpec})`);
      console.log(`  🔍 매칭 실패 분석:`);
      console.log(`    - 계약 텍스트: "${fullContractText}"`);
      console.log(`    - 사용 가능한 실물 항목들:`);
      unmatchedSilmulItems.slice(0, 5).forEach((item, idx) => {
        console.log(`      ${idx + 1}. "${item.itemName}"`);
      });
      if (unmatchedSilmulItems.length > 5) {
        console.log(`      ... 외 ${unmatchedSilmulItems.length - 5}개 항목`);
      }
    }
    
    const matchedItem = {
      ...contractItem,
      actualQuantity: matchedSilmulItem && matchedSilmulItem.quantity !== undefined ? matchedSilmulItem.quantity.toFixed(2) : '',
      actualPrice: matchedSilmulItem && matchedSilmulItem.unitPrice !== undefined ? Math.round(matchedSilmulItem.unitPrice) : '',
      actualAmount: matchedSilmulItem && matchedSilmulItem.amount !== undefined ? Math.round(matchedSilmulItem.amount) : '',
      quantityDifference: matchedSilmulItem && matchedSilmulItem.quantity !== undefined ? 
        (matchedSilmulItem.quantity - (parseFloat(contractItem.contractQuantity) || 0)).toFixed(2) : '',
      amountDifference: matchedSilmulItem && matchedSilmulItem.amount !== undefined ? 
        (matchedSilmulItem.amount - (parseFloat(contractItem.contractAmount) || 0)) : '',
      matchedSilmulItem: matchedSilmulItem
    };

    // 매칭된 데이터 상세 로깅
    if (matchedSilmulItem) {
      console.log(`📊 매칭된 데이터 상세:`, {
        contractItem: `${contractItem.name} (${contractItem.specification})`,
        contractQuantity: contractItem.contractQuantity,
        contractPrice: contractItem.contractPrice,
        contractAmount: contractItem.contractAmount,
        silmulItem: matchedSilmulItem.itemName,
        silmulQuantity: matchedSilmulItem.quantity,
        silmulUnitPrice: matchedSilmulItem.unitPrice,
        silmulAmount: matchedSilmulItem.amount,
        matchedQuantity: matchedItem.actualQuantity,
        matchedPrice: matchedItem.actualPrice,
        matchedAmount: matchedItem.actualAmount,
        quantityDifference: matchedItem.quantityDifference,
        amountDifference: matchedItem.amountDifference
      });
    }
    
    matchedItems.push(matchedItem);
  });
  
  console.log(`\n🎯 매칭 완료: ${matchedItems.filter(item => item.actualQuantity).length}개 성공, ${unmatchedSilmulItems.length}개 미매칭`);
  
  return { matchedItems, unmatchedSilmulItems };
};

/**
 * 숫자 포맷팅
 */
export const formatNumber = (num) => {
  if (!num && num !== 0) return '';
  const numValue = parseFloat(num);
  if (isNaN(numValue)) return '';
  
  return numValue.toLocaleString('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

/**
 * 통화 포맷팅
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || amount === '') return '';
  const numValue = parseFloat(amount);
  if (isNaN(numValue)) return '';
  
  return `${numValue.toLocaleString('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}원`;
};

/**
 * 날짜 포맷팅
 */
export const formatDate = (date) => {
  if (!date) return '';
  try {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return '';
  }
};

/**
 * 월 포맷팅
 */
export const formatMonth = (monthStr) => {
  if (!monthStr) return '';
  try {
    const [year, month] = monthStr.split('-');
    return `${year}년${month}월`;
  } catch {
    return monthStr;
  }
};

/**
 * 총 기성 금액 계산
 */
export const calculateTotalGisung = (gisungData) => {
  if (!gisungData || !Array.isArray(gisungData)) return 0;
  return gisungData.reduce((sum, item) => sum + (Number(item.gisungAmount) || 0), 0);
};

/**
 * 숫자 파싱 (개선된 버전)
 */
export const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  
  // 객체인 경우 처리
  if (typeof value === 'object' && value !== null) {
    if (value.result !== undefined) {
      value = value.result;
    } else if (value.v !== undefined) {
      value = value.v;
    } else if (value.t === 'n' && value.v !== undefined) {
      // 숫자 타입인 경우
      value = value.v;
    } else {
      console.log('parseNumber: 알 수 없는 객체 타입:', value);
      return 0;
    }
  }
  
  // 숫자인 경우
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  
  // 문자열인 경우
  if (typeof value === 'string') {
    const str = value.trim().replace(/[,\s]/g, '');
    const cleanStr = str.replace(/[^\d.-]/g, '');
    const num = parseFloat(cleanStr);
    if (Number.isFinite(num)) {
      console.log(`parseNumber: "${value}" -> ${num}`);
      return num;
    }
  }
  
  console.log(`parseNumber: 파싱 실패 - ${value} (타입: ${typeof value})`);
  return 0;
};

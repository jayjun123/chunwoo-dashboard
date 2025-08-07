const XLSX = require('xlsx');
const fs = require('fs');

// 템플릿 파일 분석
const analyzeTemplate = () => {
  try {
    // 파이어베이스 Storage에서 다운로드한 파일 경로 (임시)
    const filePath = './template_analysis.xlsx'; // 실제 파일 경로로 변경 필요
    
    console.log('템플릿 파일 분석 시작...');
    
    // 파일 읽기
    const workbook = XLSX.readFile(filePath, { 
      cellStyles: true,
      cellNF: true,
      cellHTML: true
    });
    
    console.log('시트 목록:', workbook.SheetNames);
    
    // 각 시트 분석
    workbook.SheetNames.forEach(sheetName => {
      console.log(`\n=== ${sheetName} 시트 분석 ===`);
      const sheet = workbook.Sheets[sheetName];
      
      // 시트 범위 확인
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
      console.log('시트 범위:', sheet['!ref']);
      console.log('행 범위:', range.s.r, '~', range.e.r);
      console.log('열 범위:', range.s.c, '~', range.e.c);
      
      // 열 너비 정보
      if (sheet['!cols']) {
        console.log('열 너비 정보:', sheet['!cols']);
      }
      
      // 행 높이 정보
      if (sheet['!rows']) {
        console.log('행 높이 정보:', sheet['!rows']);
      }
      
      // 병합된 셀 정보
      if (sheet['!merges']) {
        console.log('병합된 셀:', sheet['!merges']);
      }
      
      // 헤더 행 분석 (1-5행)
      console.log('\n헤더 행 분석 (1-5행):');
      for (let row = 1; row <= 5; row++) {
        const rowData = {};
        for (let col = 0; col <= 15; col++) {
          const cellRef = XLSX.utils.encode_cell({ r: row - 1, c: col });
          const cell = sheet[cellRef];
          if (cell) {
            rowData[cellRef] = {
              value: cell.v,
              type: cell.t,
              style: cell.s ? '스타일 있음' : '스타일 없음'
            };
          }
        }
        if (Object.keys(rowData).length > 0) {
          console.log(`행 ${row}:`, rowData);
        }
      }
      
      // 데이터 행 분석 (6-20행)
      console.log('\n데이터 행 분석 (6-20행):');
      for (let row = 6; row <= 20; row++) {
        const rowData = {};
        for (let col = 0; col <= 15; col++) {
          const cellRef = XLSX.utils.encode_cell({ r: row - 1, c: col });
          const cell = sheet[cellRef];
          if (cell) {
            rowData[cellRef] = {
              value: cell.v,
              type: cell.t,
              style: cell.s ? '스타일 있음' : '스타일 없음'
            };
          }
        }
        if (Object.keys(rowData).length > 0) {
          console.log(`행 ${row}:`, rowData);
        }
      }
      
      // 스타일 정보 상세 분석
      console.log('\n스타일 정보 상세 분석:');
      for (let row = 1; row <= 10; row++) {
        for (let col = 0; col <= 5; col++) {
          const cellRef = XLSX.utils.encode_cell({ r: row - 1, c: col });
          const cell = sheet[cellRef];
          if (cell && cell.s) {
            console.log(`${cellRef} 스타일:`, JSON.stringify(cell.s, null, 2));
          }
        }
      }
    });
    
  } catch (error) {
    console.error('템플릿 분석 실패:', error);
  }
};

// 실행
analyzeTemplate(); 
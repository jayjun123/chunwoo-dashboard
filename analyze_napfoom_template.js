// NAPFOOM 템플릿 공유수식 분석 스크립트
import ExcelJS from 'exceljs';

const analyzeNapfoomTemplate = async () => {
  try {
    console.log('🔍 NAPFOOM 템플릿 공유수식 분석 시작...');
    
    // Firebase Storage에서 템플릿 다운로드
    const templateUrl = 'https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2Fnapfoom.xlsx?alt=media&token=d79526c2-a304-4d40-ace5-0c64a621c136';
    const response = await fetch(templateUrl);
    const arrayBuffer = await response.arrayBuffer();
    
    // 템플릿 로드
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    console.log('✅ NAPFOOM 템플릿 로드 완료');
    
    // 각 시트 분석
    workbook.worksheets.forEach(worksheet => {
      console.log(`\n📋 시트: ${worksheet.name}`);
      console.log('='.repeat(50));
      
      const sharedFormulas = [];
      const formulas = [];
      const problemCells = [];
      
      // 모든 셀 분석
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          try {
            if (cell.formula) {
              const formula = cell.formula.toString();
              const cellAddress = cell.address;
              
              // 공유수식 체크
              if (formula.includes('shared') || cell.formulaType === 'shared') {
                sharedFormulas.push({
                  address: cellAddress,
                  formula: formula,
                  row: rowNumber,
                  col: colNumber
                });
              }
              
              // 일반 수식 체크
              formulas.push({
                address: cellAddress,
                formula: formula,
                row: rowNumber,
                col: colNumber
              });
              
              // 문제가 될 수 있는 셀들 체크
              if (formula.includes('F8') || formula.includes('H8') || formula.includes('F13') || 
                  formula.includes('F9') || formula.includes('F10') || formula.includes('F11') || formula.includes('F12') ||
                  formula.includes('H9') || formula.includes('H10') || formula.includes('H11') || formula.includes('H12')) {
                problemCells.push({
                  address: cellAddress,
                  formula: formula,
                  row: rowNumber,
                  col: colNumber
                });
              }
            }
          } catch (e) {
            console.log(`⚠️ 셀 ${cell.address} 분석 실패:`, e.message);
          }
        });
      });
      
      // 결과 출력
      console.log(`📊 총 수식 개수: ${formulas.length}`);
      console.log(`🔗 공유수식 개수: ${sharedFormulas.length}`);
      console.log(`⚠️ 문제 셀 개수: ${problemCells.length}`);
      
      if (sharedFormulas.length > 0) {
        console.log('\n🔗 공유수식 목록:');
        sharedFormulas.forEach(item => {
          console.log(`  ${item.address}: ${item.formula}`);
        });
      }
      
      if (problemCells.length > 0) {
        console.log('\n⚠️ 문제 셀 목록:');
        problemCells.forEach(item => {
          console.log(`  ${item.address}: ${item.formula}`);
        });
      }
      
      // 내역서 시트의 모든 수식 출력
      if (worksheet.name === '내역서') {
        console.log('\n📋 내역서 시트의 모든 수식:');
        formulas.forEach(item => {
          console.log(`  ${item.address}: ${item.formula}`);
        });
      }
      
      // F8, H8, F13 주변 셀들도 체크
      console.log('\n🔍 F8, H8, F13 주변 셀 분석:');
      const targetCells = ['F8', 'H8', 'F13', 'F9', 'F10', 'F11', 'F12', 'H9', 'H10', 'H11', 'H12'];
      targetCells.forEach(cellAddress => {
        try {
          const cell = worksheet.getCell(cellAddress);
          if (cell.formula) {
            console.log(`  ${cellAddress}: ${cell.formula}`);
          } else {
            console.log(`  ${cellAddress}: 값 없음`);
          }
        } catch (e) {
          console.log(`  ${cellAddress}: 접근 실패`);
        }
      });
      
    });
    
    console.log('\n✅ NAPFOOM 템플릿 분석 완료');
    
  } catch (error) {
    console.error('❌ NAPFOOM 템플릿 분석 실패:', error);
  }
};

// 스크립트 실행
analyzeNapfoomTemplate();

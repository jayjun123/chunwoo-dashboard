// 기존 견적서 템플릿 분석
import ExcelJS from 'exceljs';
import fs from 'fs';

async function analyzeEstimateTemplate() {
  try {
    console.log('🔍 견적서 템플릿 분석 시작...');
    
    // 기존 견적서 템플릿 읽기
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('./public/견적서.xlsx');
    
    console.log('📊 워크시트 목록:');
    workbook.worksheets.forEach(sheet => {
      console.log(`- ${sheet.name}`);
    });
    
    // 각 시트 분석
    workbook.worksheets.forEach(sheet => {
      console.log(`\n📋 ${sheet.name} 시트 분석:`);
      console.log(`- 행 수: ${sheet.rowCount}`);
      console.log(`- 열 수: ${sheet.columnCount}`);
      
      // 공유 수식이 있는 셀 찾기
      let sharedFormulaCount = 0;
      let formulaCount = 0;
      
      sheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          if (cell.formula) {
            formulaCount++;
            console.log(`  수식 발견: ${cell.address} = ${cell.formula}`);
          }
          if (cell.sharedFormula) {
            sharedFormulaCount++;
            console.log(`  공유 수식 발견: ${cell.address} = ${cell.sharedFormula}`);
          }
        });
      });
      
      console.log(`- 일반 수식 개수: ${formulaCount}`);
      console.log(`- 공유 수식 개수: ${sharedFormulaCount}`);
    });
    
    console.log('\n✅ 견적서 템플릿 분석 완료!');
    
  } catch (error) {
    console.error('❌ 템플릿 분석 실패:', error);
  }
}

analyzeEstimateTemplate();

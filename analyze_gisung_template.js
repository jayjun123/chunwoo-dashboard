// NEWgisung.xlsx 템플릿 구조 분석 스크립트
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

async function analyzeGisungTemplate() {
  try {
    console.log('📋 NEWgisung.xlsx 템플릿 구조 분석 시작...');
    
    // public 폴더의 NEWgisung.xlsx 파일 읽기
    const filePath = path.join(process.cwd(), 'public', 'NEWgisung.xlsx');
    
    if (!fs.existsSync(filePath)) {
      throw new Error('NEWgisung.xlsx 파일을 찾을 수 없습니다.');
    }
    
    console.log('📁 파일 경로:', filePath);
    
    // 파일 읽기
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    console.log('✅ 템플릿 로드 완료');
    console.log('📋 시트 목록:', workbook.worksheets.map(ws => ws.name));
    
    // 각 시트 분석
    workbook.worksheets.forEach(worksheet => {
      console.log(`\n📊 시트 분석: ${worksheet.name}`);
      console.log(`📏 행 수: ${worksheet.rowCount}`);
      console.log(`📏 열 수: ${worksheet.columnCount}`);
      
      // 주요 셀 내용 확인
      console.log('🔍 주요 셀 내용:');
      
      // 1-10행, A-N열까지 확인
      for (let row = 1; row <= Math.min(10, worksheet.rowCount); row++) {
        for (let col = 1; col <= Math.min(14, worksheet.columnCount); col++) {
          const cell = worksheet.getCell(row, col);
          if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
            const cellAddress = worksheet.getCell(row, col).address;
            console.log(`  ${cellAddress}: "${cell.value}" (타입: ${typeof cell.value})`);
          }
        }
      }
      
      // 병합된 셀 확인
      if (worksheet.model && worksheet.model.merges) {
        console.log('🔗 병합된 셀:');
        worksheet.model.merges.forEach(merge => {
          console.log(`  ${merge.top}:${merge.left} - ${merge.bottom}:${merge.right}`);
        });
      }
      
      // 수식이 있는 셀 확인
      console.log('📊 수식이 있는 셀:');
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          if (cell.formula) {
            console.log(`  ${cell.address}: ${cell.formula}`);
          }
        });
      });
    });
    
    console.log('\n✅ 템플릿 구조 분석 완료');
    
  } catch (error) {
    console.error('❌ 템플릿 분석 실패:', error);
  }
}

// 스크립트 실행
analyzeGisungTemplate();


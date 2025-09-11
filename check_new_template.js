// NEW.xlsx 파일의 26행부터 내용 확인
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const checkNewTemplate = async () => {
  try {
    console.log('🔍 NEW.xlsx 26행부터 내용 확인 중...');
    
    const filePath = path.join(process.cwd(), 'public', 'NEW.xlsx');
    
    if (!fs.existsSync(filePath)) {
      throw new Error('NEW.xlsx 파일을 찾을 수 없습니다.');
    }
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.getWorksheet('기성금 내역서');
    if (!worksheet) {
      throw new Error('기성금 내역서 시트를 찾을 수 없습니다.');
    }
    
    console.log('\n=== NEW.xlsx 26행부터 내용 ===');
    
    // 26행부터 30행까지 확인
    for (let row = 26; row <= 30; row++) {
      const rowData = [];
      for (let col = 1; col <= 8; col++) { // A부터 H열까지
        const cell = worksheet.getCell(row, col);
        rowData.push(cell.value || '');
      }
      console.log(`${row}행: [${rowData.join(', ')}]`);
    }
    
    console.log('\n=== 22~25행 내용도 확인 ===');
    for (let row = 22; row <= 25; row++) {
      const rowData = [];
      for (let col = 1; col <= 8; col++) {
        const cell = worksheet.getCell(row, col);
        rowData.push(cell.value || '');
      }
      console.log(`${row}행: [${rowData.join(', ')}]`);
    }
    
  } catch (error) {
    console.error('❌ 확인 실패:', error);
  }
};

checkNewTemplate();

























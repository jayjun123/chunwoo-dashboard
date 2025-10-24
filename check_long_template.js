// LONG.xlsx 파일의 51행부터 내용 확인
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const checkLongTemplate = async () => {
  try {
    console.log('🔍 LONG.xlsx 51행부터 내용 확인 중...');
    
    const filePath = path.join(process.cwd(), 'public', 'LONG.xlsx');
    
    if (!fs.existsSync(filePath)) {
      throw new Error('LONG.xlsx 파일을 찾을 수 없습니다.');
    }
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.getWorksheet('기성금 내역서');
    if (!worksheet) {
      throw new Error('기성금 내역서 시트를 찾을 수 없습니다.');
    }
    
    console.log('\n=== LONG.xlsx 51행부터 내용 ===');
    
    // 51행부터 55행까지 확인
    for (let row = 51; row <= 55; row++) {
      const rowData = [];
      for (let col = 1; col <= 8; col++) { // A부터 H열까지
        const cell = worksheet.getCell(row, col);
        rowData.push(cell.value || '');
      }
      console.log(`${row}행: [${rowData.join(', ')}]`);
    }
    
    console.log('\n=== 47~50행 내용도 확인 ===');
    for (let row = 47; row <= 50; row++) {
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

checkLongTemplate();
























<<<<<<< HEAD


=======
>>>>>>> ae5decb092edae570c53532171b77e663caa0146










































































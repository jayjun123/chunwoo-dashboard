const XLSX = require('xlsx');
const fs = require('fs');

try {
  // Excel 파일 읽기
  const workbook = XLSX.readFile('public/통합 문서1 8월.xlsx');
  
  console.log('시트 목록:', workbook.SheetNames);
  
  // 첫 번째 시트 가져오기
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // JSON으로 변환
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log('전체 행 수:', data.length);
  console.log('첫 10행 데이터:');
  
  for (let i = 0; i < Math.min(10, data.length); i++) {
    console.log(`행 ${i + 1}:`, data[i]);
  }
  
  // "경운" 포함된 행 찾기
  console.log('\n"경운" 포함된 행들:');
  data.forEach((row, index) => {
    if (row && row.some(cell => cell && String(cell).includes('경운'))) {
      console.log(`행 ${index + 1}:`, row);
    }
  });
  
} catch (error) {
  console.error('오류:', error.message);
}

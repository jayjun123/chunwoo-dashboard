const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

console.log('🔧 기성금청구서 템플릿 수정 시작...');

try {
  // 기존 템플릿 파일 읽기
  const templatePath = path.join(__dirname, 'public', 'gisung.xlsx');
  const workbook = XLSX.readFile(templatePath);
  
  console.log('📋 시트 목록:', workbook.SheetNames);
  
  // 갑지 시트 수정
  const gapjiSheet = workbook.Sheets['갑지'];
  if (gapjiSheet) {
    console.log('📝 갑지 시트 수정 중...');
    
    // L28~L30 셀 정리
    const cellsToClear = ['L28', 'L29', 'L30', 'M28', 'M29', 'M30'];
    cellsToClear.forEach(cellAddress => {
      if (gapjiSheet[cellAddress]) {
        delete gapjiSheet[cellAddress];
        console.log(`✅ ${cellAddress} 셀 제거 완료`);
      }
    });
    
    // 인감 이미지 추가 (F41 위치에 인감 이미지 참조 추가)
    // 실제 이미지는 별도로 추가해야 하지만, 여기서는 참조만 설정
    gapjiSheet['F41'] = {
      v: '(인)',
      t: 's',
      s: {
        font: { bold: true, size: 12 },
        alignment: { horizontal: 'center', vertical: 'middle' }
      }
    };
    console.log('✅ 갑지 시트 F41에 인감 참조 추가');
    
    console.log('✅ 갑지 시트 수정 완료');
  }
  
  // 기성금 내역서 시트 수정
  const detailSheet = workbook.Sheets['기성금 내역서'];
  if (detailSheet) {
    console.log('📝 기성금 내역서 시트 수정 중...');
    
    // 9~11행 정리 (불필요한 데이터 제거)
    for (let row = 9; row <= 11; row++) {
      for (let col = 1; col <= 16; col++) {
        const colLetter = String.fromCharCode(64 + col);
        const cellAddress = colLetter + row;
        
        if (detailSheet[cellAddress]) {
          // 0값이나 불필요한 데이터인 경우 제거
          const cellValue = detailSheet[cellAddress].v;
          if (cellValue === 0 || cellValue === '0' || cellValue === 7) {
            delete detailSheet[cellAddress];
            console.log(`✅ ${cellAddress} 불필요한 데이터 제거: ${cellValue}`);
          }
        }
      }
    }
    
    // 헤더 행 (5행) 이후 실제 데이터가 시작되는 6행부터만 유효한 데이터 유지
    // 6행: 품명, 규격, 단위, 계약수량, 계약단가, 계약금액, 전회기성수량, 전회기성금액, 금회기성수량, 금회기성금액, 누계수량, 누계금액, 진도율, 비고
    // 7행: 실제 현장 데이터
    // 8행: 단수정리 (구분선)
    
    console.log('✅ 기성금 내역서 시트 수정 완료');
  }
  
  // 수정된 파일 저장
  const outputPath = path.join(__dirname, 'public', 'gisung_fixed.xlsx');
  XLSX.writeFile(workbook, outputPath);
  
  console.log('🎉 기성금청구서 템플릿 수정 완료!');
  console.log(`📁 수정된 파일: ${outputPath}`);
  
  // 수정 사항 요약
  console.log('\n📋 수정 사항:');
  console.log('1. ✅ 갑지 시트 L28~L30 불필요한 데이터 제거');
  console.log('2. ✅ 갑지 시트 F41에 인감 참조 추가');
  console.log('3. ✅ 기성금 내역서 시트 9~11행 불필요한 데이터 제거');
  console.log('4. ✅ 깨끗한 템플릿 구조로 정리');
  
} catch (error) {
  console.error('❌ 기성금청구서 템플릿 수정 실패:', error);
  process.exit(1);
}

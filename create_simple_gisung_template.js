// 간단한 기성금청구서 템플릿 생성 스크립트
import ExcelJS from 'exceljs';
import fs from 'fs';

async function createSimpleGisungTemplate() {
  try {
    console.log('🚀 간단한 기성금청구서 템플릿 생성 시작...');
    
    // 새 워크북 생성
    const workbook = new ExcelJS.Workbook();
    
    // 갑지 시트 생성
    const gapjiSheet = workbook.addWorksheet('갑지');
    
    // 갑지 시트 기본 구조 설정
    gapjiSheet.getCell('A1').value = '기성금청구서';
    gapjiSheet.getCell('A1').font = { bold: true, size: 16 };
    gapjiSheet.getCell('A1').alignment = { horizontal: 'center' };
    
    // 기본 정보 영역
    gapjiSheet.getCell('A3').value = '현장명:';
    gapjiSheet.getCell('D3').value = '';
    gapjiSheet.getCell('A4').value = '회사명:';
    gapjiSheet.getCell('D4').value = '';
    gapjiSheet.getCell('A5').value = '계약구분:';
    gapjiSheet.getCell('D5').value = '';
    gapjiSheet.getCell('A6').value = '착공일자:';
    gapjiSheet.getCell('D6').value = '';
    gapjiSheet.getCell('A7').value = '준공예정일자:';
    gapjiSheet.getCell('D7').value = '';
    
    // 금액 정보 영역
    gapjiSheet.getCell('A9').value = '선급금:';
    gapjiSheet.getCell('H9').value = 0;
    gapjiSheet.getCell('A10').value = '전회기성:';
    gapjiSheet.getCell('H10').value = 0;
    gapjiSheet.getCell('A11').value = '계약금액:';
    gapjiSheet.getCell('H11').value = 0;
    gapjiSheet.getCell('A12').value = '누계기성:';
    gapjiSheet.getCell('H12').value = 0;
    gapjiSheet.getCell('A13').value = '잔액:';
    gapjiSheet.getCell('H13').value = 0;
    
    // 기성금 내역서 시트 생성
    const detailSheet = workbook.addWorksheet('기성금 내역서');
    
    // 헤더 설정
    detailSheet.getCell('A1').value = '기성금 내역서';
    detailSheet.getCell('A1').font = { bold: true, size: 14 };
    detailSheet.getCell('A1').alignment = { horizontal: 'center' };
    
    // 컬럼 헤더
    const headers = ['품목명', '규격', '단위', '수량', '단가', '금액', '전회기성수량', '전회기성금액', '금회기성수량', '금회기성금액', '합계수량', '합계금액'];
    headers.forEach((header, index) => {
      const cell = detailSheet.getCell(2, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });
    
    // 충분한 행 확보 (50개 항목까지)
    for (let i = 3; i <= 52; i++) {
      for (let j = 1; j <= 12; j++) {
        detailSheet.getCell(i, j).value = '';
      }
    }
    
    // 합계 행
    detailSheet.getCell('A53').value = '합계';
    detailSheet.getCell('A53').font = { bold: true };
    
    // 파일 저장
    const filePath = 'D:\\MyProject\\MyProject\\public\\SIMPLEgisung.xlsx';
    await workbook.xlsx.writeFile(filePath);
    
    console.log('✅ 간단한 기성금청구서 템플릿 생성 완료:', filePath);
    console.log('📊 생성된 템플릿 정보:');
    console.log('   - 갑지 시트: 기본 정보 및 금액 정보');
    console.log('   - 기성금 내역서 시트: 50개 항목까지 지원');
    console.log('   - 공유 셀 없음, 단순한 구조');
    
  } catch (error) {
    console.error('❌ 템플릿 생성 실패:', error);
    process.exit(1);
  }
}

// 스크립트 실행
createSimpleGisungTemplate();

import { getStorage, ref, uploadBytes, deleteObject, listAll } from 'firebase/storage';
import ExcelJS from 'exceljs';
import { storage } from './src/firebase.js';

/**
 * 전문적인 견적서 템플릿 생성 (N 타입 - 20개 이하)
 */
const createNTemplate = () => {
  const workbook = new ExcelJS.Workbook();
  
  // 견적서 시트 생성
  const estimateSheet = workbook.addWorksheet('견적서');
  
  // 견적서 헤더
  estimateSheet.getCell('A1').value = '견적서';
  estimateSheet.getCell('A1').font = { bold: true, size: 16 };
  
  // 현장 정보
  estimateSheet.getCell('A3').value = '현장명:';
  estimateSheet.getCell('B3').value = '';
  estimateSheet.getCell('A4').value = '회사명:';
  estimateSheet.getCell('B4').value = '';
  estimateSheet.getCell('A5').value = '견적일자:';
  estimateSheet.getCell('B5').value = new Date().toLocaleDateString('ko-KR');
  
  // 내역서 헤더
  estimateSheet.getCell('A7').value = '내역서';
  estimateSheet.getCell('A7').font = { bold: true, size: 14 };
  
  // 컬럼 헤더
  const headers = [
    { col: 'A', value: '품명', width: 20 },
    { col: 'B', value: '규격', width: 15 },
    { col: 'C', value: '단위', width: 8 },
    { col: 'D', value: '수량', width: 10 },
    { col: 'E', value: '재료비단가', width: 12 },
    { col: 'F', value: '재료비금액', width: 12 },
    { col: 'G', value: '노무비단가', width: 12 },
    { col: 'H', value: '노무비금액', width: 12 },
    { col: 'I', value: '경비단가', width: 12 },
    { col: 'J', value: '경비금액', width: 12 },
    { col: 'K', value: '합계단가', width: 12 },
    { col: 'L', value: '합계금액', width: 12 },
    { col: 'M', value: '비고', width: 15 }
  ];
  
  headers.forEach((header, index) => {
    const cell = estimateSheet.getCell(`${header.col}9`);
    cell.value = header.value;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    estimateSheet.getColumn(header.col).width = header.width;
  });
  
  // 데이터 행 (10행부터 30행까지)
  for (let row = 10; row <= 30; row++) {
    // A열: 품명
    estimateSheet.getCell(`A${row}`).value = '';
    
    // B열: 규격
    estimateSheet.getCell(`B${row}`).value = '';
    
    // C열: 단위
    estimateSheet.getCell(`C${row}`).value = '';
    
    // D열: 수량
    estimateSheet.getCell(`D${row}`).value = '';
    
    // E열: 재료비단가
    estimateSheet.getCell(`E${row}`).value = '';
    
    // F열: 재료비금액 (수식)
    estimateSheet.getCell(`F${row}`).formula = `D${row}*E${row}`;
    
    // G열: 노무비단가
    estimateSheet.getCell(`G${row}`).value = '';
    
    // H열: 노무비금액 (수식)
    estimateSheet.getCell(`H${row}`).formula = `D${row}*G${row}`;
    
    // I열: 경비단가
    estimateSheet.getCell(`I${row}`).value = '';
    
    // J열: 경비금액 (수식)
    estimateSheet.getCell(`J${row}`).formula = `D${row}*I${row}`;
    
    // K열: 합계단가 (수식)
    estimateSheet.getCell(`K${row}`).formula = `E${row}+G${row}+I${row}`;
    
    // L열: 합계금액 (수식)
    estimateSheet.getCell(`L${row}`).formula = `D${row}*K${row}`;
    
    // M열: 비고
    estimateSheet.getCell(`M${row}`).value = '';
  }
  
  // 합계 행
  const totalRow = 31;
  estimateSheet.getCell(`A${totalRow}`).value = '합계';
  estimateSheet.getCell(`A${totalRow}`).font = { bold: true };
  
  // F열: 재료비 총합 (수식)
  estimateSheet.getCell(`F${totalRow}`).formula = `SUM(F10:F30)`;
  estimateSheet.getCell(`F${totalRow}`).font = { bold: true };
  
  // H열: 노무비 총합 (수식)
  estimateSheet.getCell(`H${totalRow}`).formula = `SUM(H10:H30)`;
  estimateSheet.getCell(`H${totalRow}`).font = { bold: true };
  
  // J열: 경비 총합 (수식)
  estimateSheet.getCell(`J${totalRow}`).formula = `SUM(J10:J30)`;
  estimateSheet.getCell(`J${totalRow}`).font = { bold: true };
  
  // L열: 합계 총합 (수식)
  estimateSheet.getCell(`L${totalRow}`).formula = `SUM(L10:L30)`;
  estimateSheet.getCell(`L${totalRow}`).font = { bold: true };
  
  // 부가세 행
  const vatRow = 32;
  estimateSheet.getCell(`A${vatRow}`).value = '부가세 (10%)';
  estimateSheet.getCell(`A${vatRow}`).font = { bold: true };
  estimateSheet.getCell(`L${vatRow}`).formula = `L${totalRow}*0.1`;
  estimateSheet.getCell(`L${vatRow}`).font = { bold: true };
  
  // 총계약금액 행
  const grandTotalRow = 33;
  estimateSheet.getCell(`A${grandTotalRow}`).value = '총계약금액';
  estimateSheet.getCell(`A${grandTotalRow}`).font = { bold: true, size: 14 };
  estimateSheet.getCell(`L${grandTotalRow}`).formula = `L${totalRow}+L${vatRow}`;
  estimateSheet.getCell(`L${grandTotalRow}`).font = { bold: true, size: 14 };
  
  return workbook;
};

/**
 * 전문적인 견적서 템플릿 생성 (L 타입 - 21개 이상)
 */
const createLTemplate = () => {
  const workbook = new ExcelJS.Workbook();
  
  // 견적서 시트 생성
  const estimateSheet = workbook.addWorksheet('견적서');
  
  // 견적서 헤더
  estimateSheet.getCell('A1').value = '견적서';
  estimateSheet.getCell('A1').font = { bold: true, size: 16 };
  
  // 현장 정보
  estimateSheet.getCell('A3').value = '현장명:';
  estimateSheet.getCell('B3').value = '';
  estimateSheet.getCell('A4').value = '회사명:';
  estimateSheet.getCell('B4').value = '';
  estimateSheet.getCell('A5').value = '견적일자:';
  estimateSheet.getCell('B5').value = new Date().toLocaleDateString('ko-KR');
  
  // 내역서 헤더
  estimateSheet.getCell('A7').value = '내역서';
  estimateSheet.getCell('A7').font = { bold: true, size: 14 };
  
  // 컬럼 헤더
  const headers = [
    { col: 'A', value: '품명', width: 20 },
    { col: 'B', value: '규격', width: 15 },
    { col: 'C', value: '단위', width: 8 },
    { col: 'D', value: '수량', width: 10 },
    { col: 'E', value: '재료비단가', width: 12 },
    { col: 'F', value: '재료비금액', width: 12 },
    { col: 'G', value: '노무비단가', width: 12 },
    { col: 'H', value: '노무비금액', width: 12 },
    { col: 'I', value: '경비단가', width: 12 },
    { col: 'J', value: '경비금액', width: 12 },
    { col: 'K', value: '합계단가', width: 12 },
    { col: 'L', value: '합계금액', width: 12 },
    { col: 'M', value: '비고', width: 15 }
  ];
  
  headers.forEach((header, index) => {
    const cell = estimateSheet.getCell(`${header.col}9`);
    cell.value = header.value;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    estimateSheet.getColumn(header.col).width = header.width;
  });
  
  // 데이터 행 (10행부터 50행까지 - 더 많은 행)
  for (let row = 10; row <= 50; row++) {
    // A열: 품명
    estimateSheet.getCell(`A${row}`).value = '';
    
    // B열: 규격
    estimateSheet.getCell(`B${row}`).value = '';
    
    // C열: 단위
    estimateSheet.getCell(`C${row}`).value = '';
    
    // D열: 수량
    estimateSheet.getCell(`D${row}`).value = '';
    
    // E열: 재료비단가
    estimateSheet.getCell(`E${row}`).value = '';
    
    // F열: 재료비금액 (수식)
    estimateSheet.getCell(`F${row}`).formula = `D${row}*E${row}`;
    
    // G열: 노무비단가
    estimateSheet.getCell(`G${row}`).value = '';
    
    // H열: 노무비금액 (수식)
    estimateSheet.getCell(`H${row}`).formula = `D${row}*G${row}`;
    
    // I열: 경비단가
    estimateSheet.getCell(`I${row}`).value = '';
    
    // J열: 경비금액 (수식)
    estimateSheet.getCell(`J${row}`).formula = `D${row}*I${row}`;
    
    // K열: 합계단가 (수식)
    estimateSheet.getCell(`K${row}`).formula = `E${row}+G${row}+I${row}`;
    
    // L열: 합계금액 (수식)
    estimateSheet.getCell(`L${row}`).formula = `D${row}*K${row}`;
    
    // M열: 비고
    estimateSheet.getCell(`M${row}`).value = '';
  }
  
  // 합계 행
  const totalRow = 51;
  estimateSheet.getCell(`A${totalRow}`).value = '합계';
  estimateSheet.getCell(`A${totalRow}`).font = { bold: true };
  
  // F열: 재료비 총합 (수식)
  estimateSheet.getCell(`F${totalRow}`).formula = `SUM(F10:F50)`;
  estimateSheet.getCell(`F${totalRow}`).font = { bold: true };
  
  // H열: 노무비 총합 (수식)
  estimateSheet.getCell(`H${totalRow}`).formula = `SUM(H10:H50)`;
  estimateSheet.getCell(`H${totalRow}`).font = { bold: true };
  
  // J열: 경비 총합 (수식)
  estimateSheet.getCell(`J${totalRow}`).formula = `SUM(J10:J50)`;
  estimateSheet.getCell(`J${totalRow}`).font = { bold: true };
  
  // L열: 합계 총합 (수식)
  estimateSheet.getCell(`L${totalRow}`).formula = `SUM(L10:L50)`;
  estimateSheet.getCell(`L${totalRow}`).font = { bold: true };
  
  // 부가세 행
  const vatRow = 52;
  estimateSheet.getCell(`A${vatRow}`).value = '부가세 (10%)';
  estimateSheet.getCell(`A${vatRow}`).font = { bold: true };
  estimateSheet.getCell(`L${vatRow}`).formula = `L${totalRow}*0.1`;
  estimateSheet.getCell(`L${vatRow}`).font = { bold: true };
  
  // 총계약금액 행
  const grandTotalRow = 53;
  estimateSheet.getCell(`A${grandTotalRow}`).value = '총계약금액';
  estimateSheet.getCell(`A${grandTotalRow}`).font = { bold: true, size: 14 };
  estimateSheet.getCell(`L${grandTotalRow}`).formula = `L${totalRow}+L${vatRow}`;
  estimateSheet.getCell(`L${grandTotalRow}`).font = { bold: true, size: 14 };
  
  return workbook;
};

/**
 * 기존 템플릿 파일들 삭제
 */
const deleteExistingTemplates = async () => {
  try {
    console.log('🗑️ 기존 템플릿 파일들 삭제 시작...');
    
    const templatesRef = ref(storage, 'templates');
    const result = await listAll(templatesRef);
    
    for (const itemRef of result.items) {
      console.log(`🗑️ 삭제 중: ${itemRef.name}`);
      await deleteObject(itemRef);
    }
    
    console.log('✅ 기존 템플릿 파일들 삭제 완료');
  } catch (error) {
    console.error('❌ 기존 템플릿 삭제 실패:', error);
  }
};

/**
 * 새로운 템플릿 파일들 업로드
 */
const uploadNewTemplates = async () => {
  try {
    console.log('📤 새로운 템플릿 파일들 업로드 시작...');
    
    // N 타입 템플릿 생성 및 업로드
    console.log('📝 N 타입 템플릿 생성 중...');
    const nTemplate = createNTemplate();
    const nBuffer = await nTemplate.xlsx.writeBuffer();
    
    const nRef = ref(storage, 'templates/(N)gyunjuk.xlsx');
    await uploadBytes(nRef, nBuffer);
    console.log('✅ N 타입 템플릿 업로드 완료');
    
    // L 타입 템플릿 생성 및 업로드
    console.log('📝 L 타입 템플릿 생성 중...');
    const lTemplate = createLTemplate();
    const lBuffer = await lTemplate.xlsx.writeBuffer();
    
    const lRef = ref(storage, 'templates/(L)gyunjuk.xlsx');
    await uploadBytes(lRef, lBuffer);
    console.log('✅ L 타입 템플릿 업로드 완료');
    
    console.log('🎉 모든 템플릿 업로드 완료!');
    
  } catch (error) {
    console.error('❌ 템플릿 업로드 실패:', error);
  }
};

/**
 * 메인 실행 함수
 */
const main = async () => {
  try {
    console.log('🚀 템플릿 재생성 및 업로드 시작...');
    
    // 1. 기존 템플릿 삭제
    await deleteExistingTemplates();
    
    // 2. 새로운 템플릿 업로드
    await uploadNewTemplates();
    
    console.log('🎯 모든 작업 완료!');
    
  } catch (error) {
    console.error('💥 메인 실행 실패:', error);
  }
};

// 스크립트 실행
main();


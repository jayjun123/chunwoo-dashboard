// NEW와 LONG 템플릿을 실제로 다르게 만들기
import ExcelJS from 'exceljs';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { storage } from './src/firebase.js';

const createDifferentTemplates = async () => {
  try {
    console.log('🚀 NEW와 LONG 템플릿 생성 시작...');
    
    // 1. NEW 템플릿 생성 (간단한 형태)
    console.log('📝 NEW 템플릿 생성 중...');
    const newWorkbook = new ExcelJS.Workbook();
    const newSheet = newWorkbook.addWorksheet('기성금 내역서');
    
    // NEW 템플릿 헤더
    newSheet.getCell('A1').value = '기성금 내역서 (NEW 템플릿)';
    newSheet.getCell('A1').font = { bold: true, size: 16 };
    newSheet.getCell('A1').alignment = { horizontal: 'center' };
    
    // 헤더 행
    const headers = ['품명', '규격', '단위', '수량', '단가', '금액', '전회기성', '금회기성', '합계', '비고'];
    headers.forEach((header, index) => {
      const cell = newSheet.getCell(2, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });
    
    // 20개 행만 생성 (NEW 템플릿)
    for (let i = 3; i <= 22; i++) {
      newSheet.getCell(`A${i}`).value = `품목 ${i-2}`;
    }
    
    // 2. LONG 템플릿 생성 (복잡한 형태)
    console.log('📝 LONG 템플릿 생성 중...');
    const longWorkbook = new ExcelJS.Workbook();
    const longSheet = longWorkbook.addWorksheet('기성금 내역서');
    
    // LONG 템플릿 헤더 (더 상세한 형태)
    longSheet.getCell('A1').value = '기성금 내역서 (LONG 템플릿)';
    longSheet.getCell('A1').font = { bold: true, size: 18 };
    longSheet.getCell('A1').alignment = { horizontal: 'center' };
    
    // LONG 템플릿은 더 많은 헤더
    const longHeaders = ['품명', '규격', '단위', '수량', '단가', '금액', '전회기성', '금회기성', '합계', '비고', '세부사항', '비용분류'];
    longHeaders.forEach((header, index) => {
      const cell = longSheet.getCell(2, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD0D0D0' } };
    });
    
    // 50개 행 생성 (LONG 템플릿)
    for (let i = 3; i <= 52; i++) {
      longSheet.getCell(`A${i}`).value = `상세품목 ${i-2}`;
      longSheet.getCell(`K${i}`).value = `세부내용 ${i-2}`;
      longSheet.getCell(`L${i}`).value = `분류 ${i-2}`;
    }
    
    // 3. Firebase Storage에 업로드
    console.log('📤 Firebase Storage에 업로드 중...');
    
    // NEW 템플릿 업로드
    const newBuffer = await newWorkbook.xlsx.writeBuffer();
    const newRef = ref(storage, 'templates/NEWgisung.xlsx');
    await uploadBytes(newRef, newBuffer);
    console.log('✅ NEW 템플릿 업로드 완료');
    
    // LONG 템플릿 업로드
    const longBuffer = await longWorkbook.xlsx.writeBuffer();
    const longRef = ref(storage, 'templates/LONGgisung.xlsx');
    await uploadBytes(longRef, longBuffer);
    console.log('✅ LONG 템플릿 업로드 완료');
    
    console.log('\n🎉 NEW와 LONG 템플릿 생성 완료!');
    console.log('📋 차이점:');
    console.log('- NEW: 간단한 형태, 20개 행, 기본 헤더');
    console.log('- LONG: 상세한 형태, 50개 행, 추가 헤더 (세부사항, 비용분류)');
    
    alert('NEW와 LONG 템플릿이 성공적으로 생성되었습니다!\n이제 실제로 다른 템플릿이 사용됩니다.');
    
  } catch (error) {
    console.error('❌ 템플릿 생성 실패:', error);
    alert(`템플릿 생성 실패: ${error.message}`);
  }
};

// 전역 함수로 등록
window.createDifferentTemplates = createDifferentTemplates;

console.log('✅ 템플릿 생성 스크립트 로드 완료');
console.log('🚀 브라우저 콘솔에서 다음 명령어를 실행하세요:');
console.log('createDifferentTemplates()');


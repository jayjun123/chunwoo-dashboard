// 깔끔한 기성금청구서 템플릿 생성 및 Firebase Storage 업로드
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, deleteObject } from 'firebase/storage';
import ExcelJS from 'exceljs';

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyATCGXGD2_teiJFdpng9J2_fvZRItPef0w",
  authDomain: "chunwooo-edf9f.firebaseapp.com",
  projectId: "chunwooo-edf9f",
  storageBucket: "chunwooo-edf9f.firebasestorage.app",
  messagingSenderId: "417029078660",
  appId: "1:417029078660:web:00e23d79af77876e598cd1",
  measurementId: "G-653CL9XWFH"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function createAndUploadGisungTemplate() {
  try {
    console.log('🚀 깔끔한 기성금청구서 템플릿 생성 시작...');
    
    // 새로운 워크북 생성
    const workbook = new ExcelJS.Workbook();
    
    // 갑지 시트 생성
    const gapjiSheet = workbook.addWorksheet('갑지');
    
    // 갑지 시트 기본 구조 생성
    gapjiSheet.getCell('A1').value = '기성금청구서';
    gapjiSheet.getCell('A1').font = { bold: true, size: 16 };
    gapjiSheet.getCell('A1').alignment = { horizontal: 'center' };
    
    // 기본 정보 입력
    gapjiSheet.getCell('A3').value = '공사명';
    gapjiSheet.getCell('D3').value = '현장명';
    gapjiSheet.getCell('A4').value = '공사주';
    gapjiSheet.getCell('D4').value = '회사명';
    gapjiSheet.getCell('A5').value = '계약종류';
    gapjiSheet.getCell('D5').value = '하도급계약';
    gapjiSheet.getCell('A6').value = '공사기간';
    gapjiSheet.getCell('D6').value = '2025.01.01 ~ 2025.12.31';
    
    // 금액 정보
    gapjiSheet.getCell('A8').value = '계약금액';
    gapjiSheet.getCell('D8').value = '0';
    gapjiSheet.getCell('A9').value = '선급금';
    gapjiSheet.getCell('D9').value = '0';
    gapjiSheet.getCell('A10').value = '전회기성';
    gapjiSheet.getCell('D10').value = '0';
    gapjiSheet.getCell('A11').value = '누계기성';
    gapjiSheet.getCell('D11').value = '0';
    gapjiSheet.getCell('A12').value = '잔액';
    gapjiSheet.getCell('D12').value = '0';
    
    // 열 너비 설정
    gapjiSheet.getColumn('A').width = 15;
    gapjiSheet.getColumn('D').width = 30;
    
    // 기성금 내역서 시트 생성
    const detailSheet = workbook.addWorksheet('기성금 내역서');
    
    // 기성금 내역서 헤더
    detailSheet.getCell('A1').value = '기성금 내역서';
    detailSheet.getCell('A1').font = { bold: true, size: 14 };
    detailSheet.getCell('A1').alignment = { horizontal: 'center' };
    
    // 테이블 헤더
    detailSheet.getCell('A3').value = '순번';
    detailSheet.getCell('B3').value = '공종';
    detailSheet.getCell('C3').value = '규격';
    detailSheet.getCell('D3').value = '단위';
    detailSheet.getCell('E3').value = '수량';
    detailSheet.getCell('F3').value = '단가';
    detailSheet.getCell('G3').value = '금액';
    detailSheet.getCell('H3').value = '기성율';
    detailSheet.getCell('I3').value = '기성수량';
    detailSheet.getCell('J3').value = '기성금액';
    
    // 헤더 스타일
    for (let i = 1; i <= 10; i++) {
      const cell = detailSheet.getCell(3, i);
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    
    // 샘플 데이터 (5개 행)
    for (let i = 0; i < 5; i++) {
      const rowNumber = i + 4;
      
      detailSheet.getCell(rowNumber, 1).value = i + 1; // 순번
      detailSheet.getCell(rowNumber, 2).value = `공종 ${i + 1}`; // 공종
      detailSheet.getCell(rowNumber, 3).value = `규격 ${i + 1}`; // 규격
      detailSheet.getCell(rowNumber, 4).value = 'M2'; // 단위
      detailSheet.getCell(rowNumber, 5).value = 100; // 수량
      detailSheet.getCell(rowNumber, 6).value = 10000; // 단가
      detailSheet.getCell(rowNumber, 7).value = 1000000; // 금액
      detailSheet.getCell(rowNumber, 8).value = 0; // 기성율
      detailSheet.getCell(rowNumber, 9).value = 0; // 기성수량
      detailSheet.getCell(rowNumber, 10).value = 0; // 기성금액
      
      // 셀 테두리
      for (let col = 1; col <= 10; col++) {
        detailSheet.getCell(rowNumber, col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    }
    
    // 열 너비 설정
    detailSheet.getColumn(1).width = 8; // 순번
    detailSheet.getColumn(2).width = 30; // 공종
    detailSheet.getColumn(3).width = 25; // 규격
    detailSheet.getColumn(4).width = 10; // 단위
    detailSheet.getColumn(5).width = 12; // 수량
    detailSheet.getColumn(6).width = 15; // 단가
    detailSheet.getColumn(7).width = 15; // 금액
    detailSheet.getColumn(8).width = 12; // 기성율
    detailSheet.getColumn(9).width = 12; // 기성수량
    detailSheet.getColumn(10).width = 15; // 기성금액
    
    console.log('✅ 기성금청구서 템플릿 생성 완료');
    
    // 기존 파일 삭제 (있는 경우)
    try {
      const existingRef = ref(storage, 'templates/NEWgisung.xlsx');
      await deleteObject(existingRef);
      console.log('🗑️ 기존 템플릿 삭제 완료');
    } catch (deleteError) {
      console.log('ℹ️ 기존 템플릿이 없습니다.');
    }
    
    // 새 템플릿 업로드
    console.log('📤 Firebase Storage에 템플릿 업로드 중...');
    
    const buffer = await workbook.xlsx.writeBuffer({
      useStyles: true,
      useSharedStrings: false,
      useCellStyles: true,
      useCellFormulas: false,
      useCellDates: false,
      useCellNF: false,
      useCellRichText: false,
      useCellComments: false,
      useCellHyperlinks: false,
      useCellImages: false,
      useCellNames: false,
      useCellThemes: false,
      useCellDataValidation: false,
      useCellConditionalFormatting: false,
      sharedFormulas: false
    });
    
    const templateRef = ref(storage, 'templates/NEWgisung.xlsx');
    const snapshot = await uploadBytes(templateRef, buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    console.log('✅ 템플릿 업로드 완료!');
    console.log('📂 저장 경로:', snapshot.metadata.fullPath);
    console.log('📊 파일 크기:', snapshot.metadata.size, 'bytes');
    
    console.log('\n🎉 깔끔한 기성금청구서 템플릿 생성 및 업로드 완료!');
    
  } catch (error) {
    console.error('❌ 템플릿 생성 및 업로드 실패:', error);
  }
}

// 스크립트 실행
createAndUploadGisungTemplate();

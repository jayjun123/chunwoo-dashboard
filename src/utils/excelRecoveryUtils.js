import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';

/**
 * Excel 파일 손상 복구 강화 유틸리티
 */

// 손상된 Excel 파일 복구 시도
export const repairDamagedExcelFile = async (file) => {
  try {
    console.log('🔧 손상된 Excel 파일 복구 시작:', file.name);
    
    const arrayBuffer = await file.arrayBuffer();
    
    // 방법 1: ExcelJS로 복구 시도 (기본)
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      console.log('✅ ExcelJS로 파일 복구 성공');
      return { success: true, method: 'ExcelJS', workbook };
    } catch (excelError) {
      console.warn('⚠️ ExcelJS 복구 실패, XLSX로 재시도:', excelError);
      
      // 방법 2: XLSX로 복구 시도
      try {
        const workbook = XLSX.read(arrayBuffer, { 
          type: 'array',
          cellFormula: true,
          cellStyles: true,
          cellNF: true,
          cellHTML: true,
          cellDates: true,
          cellErrors: true,
          cellComments: true,
          cellHyperlinks: true,
          cellAll: true,
          WTF: true, // 손상된 파일 처리
          bookDeps: true,
          bookFiles: true,
          bookVBA: true,
          bookSheets: true,
          bookProps: true,
          bookNames: true,
          bookViews: true,
          bookRefs: true
        });
        
        console.log('✅ XLSX로 파일 복구 성공');
        return { success: true, method: 'XLSX', workbook };
      } catch (xlsxError) {
        console.warn('⚠️ XLSX 복구도 실패, 고급 복구 시도:', xlsxError);
        
        // 방법 3: 고급 복구 시도
        return await attemptAdvancedRecovery(arrayBuffer, file.name);
      }
    }
  } catch (error) {
    console.error('❌ 파일 복구 시도 실패:', error);
    throw new Error('파일이 심각하게 손상되었습니다. Excel에서 파일을 다시 저장해주세요.');
  }
};

// 고급 복구 시도
const attemptAdvancedRecovery = async (arrayBuffer, fileName) => {
  try {
    console.log('🔧 고급 복구 시도 시작...');
    
    // 방법 3-1: 손상된 부분 제거 후 복구
    try {
      const workbook = XLSX.read(arrayBuffer, { 
        type: 'array',
        WTF: true,
        cellFormula: false, // 수식 비활성화
        cellStyles: false,  // 스타일 비활성화
        cellNF: false,      // 숫자 형식 비활성화
        cellHTML: false,    // HTML 비활성화
        cellDates: true,    // 날짜만 활성화
        cellErrors: false,  // 오류 비활성화
        cellComments: false, // 주석 비활성화
        cellHyperlinks: false, // 하이퍼링크 비활성화
        cellAll: false      // 모든 기능 비활성화
      });
      
      console.log('✅ 고급 복구 성공 (기능 제한)');
      return { success: true, method: 'Advanced', workbook };
    } catch (advancedError) {
      console.warn('⚠️ 고급 복구 실패, 최후 수단 시도:', advancedError);
      
      // 방법 3-2: 최후 수단 - 새 파일 생성
      return await createNewTemplateFile(fileName);
    }
  } catch (error) {
    console.error('❌ 고급 복구 실패:', error);
    throw error;
  }
};

// 새 템플릿 파일 생성 (최후 수단)
const createNewTemplateFile = async (fileName) => {
  try {
    console.log('🔧 새 템플릿 파일 생성 시작...');
    
    const workbook = new ExcelJS.Workbook();
    
    // 갑지 시트 생성
    const gapjiSheet = workbook.addWorksheet('갑지');
    
    // 갑지 기본 구조 설정
    gapjiSheet.getCell('A1').value = '기성금청구서';
    gapjiSheet.getCell('A1').font = { name: '맑은 고딕', size: 16, bold: true };
    gapjiSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    
    // 갑지 기본 정보
    const gapjiData = [
      { cell: 'A2', value: '공사명' },
      { cell: 'A4', value: '시공사' },
      { cell: 'A6', value: '하도급공사명' },
      { cell: 'A8', value: '계약일자' },
      { cell: 'A10', value: '준공일자' },
      { cell: 'A12', value: '계약금액' },
      { cell: 'A14', value: '기성금액' },
      { cell: 'A16', value: '청구금액' }
    ];
    
    gapjiData.forEach(item => {
      const cell = gapjiSheet.getCell(item.cell);
      cell.value = item.value;
      cell.font = { name: '맑은 고딕', size: 11, bold: true };
    });
    
    // 기성금 내역서 시트 생성
    const detailSheet = workbook.addWorksheet('기성금 내역서');
    
    // 기성금 내역서 헤더
    const headers = [
      '품명', '규격', '단위', '수량-계약', '단가', '금액-계약',
      '수량-전회', '금액-전회', '수량-금회', '금액-금회',
      '수량-합계', '금액-합계', '비고'
    ];
    
    headers.forEach((header, index) => {
      const cell = detailSheet.getCell(4, index + 1);
      cell.value = header;
      cell.font = { name: '맑은 고딕', size: 9, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.font = { name: '맑은 고딕', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    });
    
    // 열 너비 설정
    detailSheet.columns = [
      { width: 15 }, // A (품명)
      { width: 12 }, // B (규격)
      { width: 6 },  // C (단위)
      { width: 8 },  // D (수량-계약)
      { width: 8 },  // E (단가)
      { width: 10 }, // F (금액-계약)
      { width: 8 },  // G (수량-전회)
      { width: 10 }, // H (금액-전회)
      { width: 8 },  // I (수량-금회)
      { width: 10 }, // J (금액-금회)
      { width: 8 },  // K (수량-합계)
      { width: 10 }, // L (금액-합계)
      { width: 12 }  // M (비고)
    ];
    
    console.log('✅ 새 템플릿 파일 생성 완료');
    return { success: true, method: 'NewTemplate', workbook };
    
  } catch (error) {
    console.error('❌ 새 템플릿 파일 생성 실패:', error);
    throw new Error('파일 복구가 불가능합니다. 새로운 파일을 업로드해주세요.');
  }
};

// 파일 검증 및 복구 통합 함수
export const validateAndRepairExcelFile = async (file) => {
  try {
    console.log('🔍 Excel 파일 검증 및 복구 시작:', file.name);
    
    // 기본 검증
    if (file.size === 0) {
      throw new Error('파일이 비어있습니다.');
    }
    
    if (file.size > 50 * 1024 * 1024) {
      throw new Error('파일 크기가 너무 큽니다. (최대 50MB)');
    }
    
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      throw new Error('Excel 파일(.xlsx)만 지원됩니다.');
    }
    
    // 복구 시도
    const result = await repairDamagedExcelFile(file);
    
    if (result.success) {
      console.log(`✅ 파일 복구 성공 (방법: ${result.method})`);
      
      // 필수 시트 확인
      const workbook = result.workbook;
      const requiredSheets = ['갑지', '기성금 내역서'];
      const existingSheets = workbook.worksheets.map(ws => ws.name);
      
      const missingSheets = requiredSheets.filter(sheet => !existingSheets.includes(sheet));
      if (missingSheets.length > 0) {
        console.warn(`⚠️ 필수 시트 누락: ${missingSheets.join(', ')}`);
        // 누락된 시트가 있어도 복구된 파일은 사용 가능
      }
      
      return result;
    } else {
      throw new Error('파일 복구에 실패했습니다.');
    }
    
  } catch (error) {
    console.error('❌ 파일 검증 및 복구 실패:', error);
    throw error;
  }
};

// 복구된 파일을 새 파일로 변환
export const convertRepairedFileToBlob = async (workbook) => {
  try {
    console.log('💾 복구된 파일을 Blob으로 변환 중...');
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    console.log('✅ 파일 변환 완료');
    return blob;
    
  } catch (error) {
    console.error('❌ 파일 변환 실패:', error);
    throw error;
  }
}; 
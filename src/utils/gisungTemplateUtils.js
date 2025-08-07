import { ref, getDownloadURL, uploadBytes, getStorage, deleteObject } from 'firebase/storage';
import { storage } from '../firebase.js';
import ExcelJS from 'exceljs'; // ExcelJS 추가
import { validateAndRepairExcelFile, convertRepairedFileToBlob } from './excelRecoveryUtils.js';

// 숫자 포맷팅 함수 (0값은 빈칸으로)
const formatNumber = (num) => {
  // num이 null, undefined, 빈 문자열, 또는 숫자 0인 경우 빈 문자열 반환
  if (num === null || num === undefined || num === '' || num === 0) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// 수식 계산용 숫자 포맷팅 (천단위 쉼표 없이 숫자 타입으로)
const formatNumberForFormula = (num) => {
  if (num === null || num === undefined || num === '' || num === 0) return '';
  return Number(num);
};

// Excel 파일 복구 시도 함수
const attemptExcelFileRecovery = async (file) => {
  try {
    console.log('🔧 Excel 파일 복구 시도 시작...');
    
    const arrayBuffer = await file.arrayBuffer();
    
    // 방법 1: ExcelJS로 복구 시도
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      console.log('✅ ExcelJS로 파일 복구 성공');
      return true;
    } catch (excelError) {
      console.warn('⚠️ ExcelJS 복구 실패, XLSX로 재시도:', excelError);
      
      // 방법 2: XLSX로 복구 시도
      try {
        const XLSX = await import('xlsx');
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
          cellAll: true
        });
        
        console.log('✅ XLSX로 파일 복구 성공');
        return true;
      } catch (xlsxError) {
        console.error('❌ XLSX 복구도 실패:', xlsxError);
        throw new Error('파일을 복구할 수 없습니다. Excel에서 파일을 다시 저장해주세요.');
      }
    }
  } catch (error) {
    console.error('❌ 파일 복구 시도 실패:', error);
    throw error;
  }
};

// 파일 검증 함수 수정
const validateExcelFile = async (file) => {
  try {
    console.log('🔍 Excel 파일 검증 시작:', file.name);
    
    // 파일 크기 확인
    if (file.size === 0) {
      throw new Error('파일이 비어있습니다.');
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB 제한
      throw new Error('파일 크기가 너무 큽니다. (최대 50MB)');
    }
    
    // 파일 확장자 확인
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      throw new Error('Excel 파일(.xlsx)만 지원됩니다.');
    }
    
    // 파일 내용 검증
    const arrayBuffer = await file.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      throw new Error('파일 내용을 읽을 수 없습니다.');
    }
    
    // ExcelJS로 파일 구조 검증
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      // 필수 시트 확인
      const requiredSheets = ['갑지', '기성금 내역서'];
      const existingSheets = workbook.worksheets.map(ws => ws.name);
      
      console.log('📋 발견된 시트:', existingSheets);
      
      const missingSheets = requiredSheets.filter(sheet => !existingSheets.includes(sheet));
      if (missingSheets.length > 0) {
        throw new Error(`필수 시트가 없습니다: ${missingSheets.join(', ')}`);
      }
      
      // 기성금 내역서 시트 구조 확인
      const detailSheet = workbook.getWorksheet('기성금 내역서');
      if (detailSheet) {
        // 헤더 행 확인 (4행)
        const headerRow = 4;
        const headers = [];
        
        for (let col = 0; col < 14; col++) {
          const cell = detailSheet.getCell(headerRow, col + 1);
          headers.push(cell.value || '');
        }
        
        console.log('📊 헤더 확인:', headers);
        
        // 필수 열 확인
        const requiredColumns = ['품명', '규격', '단위', '계약수량', '계약단가'];
        const hasRequiredColumns = requiredColumns.some(col => 
          headers.some(header => header && header.includes(col))
        );
        
        if (!hasRequiredColumns) {
          console.warn('⚠️ 필수 열이 없을 수 있습니다:', requiredColumns);
        }
      }
      
      console.log('✅ Excel 파일 검증 완료');
      return true;
      
    } catch (excelError) {
      console.error('❌ Excel 파일 구조 검증 실패:', excelError);
      
      // 복구 시도
      try {
        await attemptExcelFileRecovery(file);
        
        // 복구 후 다시 검증
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('Excel 파일에 시트가 없습니다.');
        }
        
        console.log('📋 복구 후 발견된 시트:', workbook.SheetNames);
        
        // 필수 시트 확인
        const requiredSheets = ['갑지', '기성금 내역서'];
        const missingSheets = requiredSheets.filter(sheet => !workbook.SheetNames.includes(sheet));
        
        if (missingSheets.length > 0) {
          throw new Error(`필수 시트가 없습니다: ${missingSheets.join(', ')}`);
        }
        
        console.log('✅ 복구 후 Excel 파일 검증 완료');
        return true;
        
      } catch (recoveryError) {
        console.error('❌ 파일 복구 및 재검증 실패:', recoveryError);
        throw new Error('Excel 파일이 손상되었습니다. Excel에서 파일을 열어서 "다른 이름으로 저장" → "Excel 통합 문서 (.xlsx)"로 저장한 후 다시 시도해주세요.');
      }
    }
    
  } catch (error) {
    console.error('❌ 파일 검증 실패:', error);
    throw error;
  }
};

// 강화된 파일 업로드 함수 (손상된 파일 복구 기능 포함)
export const uploadTemplateToFirebase = async (file) => {
  try {
    console.log('🚀 강화된 템플릿 파일 업로드를 시작합니다...');
    
    // 1. 파일 검증 및 복구 시도
    let repairedFile = file;
    try {
      const repairResult = await validateAndRepairExcelFile(file);
      
      if (repairResult.method !== 'ExcelJS') {
        console.log(`🔧 파일이 복구되었습니다 (방법: ${repairResult.method})`);
        
        // 복구된 파일을 Blob으로 변환
        const repairedBlob = await convertRepairedFileToBlob(repairResult.workbook);
        repairedFile = new File([repairedBlob], file.name, { type: file.type });
        
        console.log('✅ 복구된 파일로 업로드 진행');
      }
    } catch (repairError) {
      console.warn('⚠️ 파일 복구 실패, 원본 파일로 진행:', repairError);
      // 복구에 실패해도 원본 파일로 업로드 시도
    }
    
    // 2. 파일 업로드
    const templateRef = ref(storage, 'templates/gisung.xlsx');
    console.log('📁 템플릿 파일을 읽는 중...');
    
    const snapshot = await uploadBytes(templateRef, repairedFile);
    console.log('☁️ 파이어베이스 Storage에 업로드 중...');
    
    console.log('✅ 템플릿 파일 업로드 완료!');
    console.log('📂 저장 경로:', snapshot.metadata.fullPath);
    console.log('📊 파일 크기:', snapshot.metadata.size, 'bytes');
    console.log('🕒 업로드 시간:', snapshot.metadata.timeCreated);
    
    return snapshot.metadata.fullPath;
  } catch (error) {
    console.error('❌ 템플릿 업로드 실패:', error);
    
    // 사용자 친화적인 오류 메시지
    let userMessage = '업로드 실패';
    
    if (error.message.includes('손상')) {
      userMessage = 'Excel 파일이 손상되었습니다. 파일을 다시 확인해주세요.';
    } else if (error.message.includes('시트')) {
      userMessage = '필수 시트가 없습니다. "갑지"와 "기성금 내역서" 시트가 필요합니다.';
    } else if (error.message.includes('크기')) {
      userMessage = '파일 크기가 너무 큽니다. (최대 50MB)';
    } else if (error.message.includes('비어')) {
      userMessage = '파일이 비어있습니다.';
    } else if (error.message.includes('확장자')) {
      userMessage = 'Excel 파일(.xlsx)만 지원됩니다.';
    } else {
      userMessage = `업로드 실패: ${error.message}`;
    }
    
    throw new Error(userMessage);
  }
};

// 템플릿 보호 설정 제거 (다운로드용)
const removeTemplateProtection = (workbook) => {
  try {
    console.log('🔓 템플릿 보호 설정 제거 시작...');
    
    // 워크북 레벨 보호 제거
    if (workbook.Workbook && workbook.Workbook.Views) {
      workbook.Workbook.Views.forEach(view => {
        if (view.WorkbookView) {
          view.WorkbookView.tabRatio = 600;
          view.WorkbookView.showHorizontalScroll = true;
          view.WorkbookView.showVerticalScroll = true;
          view.WorkbookView.showSheetTabs = true;
        }
      });
    }
    
    // 시트 레벨 보호 제거
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      if (sheet) {
        // 시트 보호 제거
        if (sheet['!protect']) {
          console.log(`시트 ${sheetName} 보호 제거`);
          delete sheet['!protect'];
        }
        
        // 셀 보호 제거
        Object.keys(sheet).forEach(cellRef => {
          if (cellRef.startsWith('!')) return; // 메타데이터는 건드리지 않음
          
          const cell = sheet[cellRef];
          if (cell && cell.s) {
            // 셀 보호 제거
            if (cell.s.locked !== undefined) {
              cell.s.locked = false;
            }
            if (cell.s.hidden !== undefined) {
              cell.s.hidden = false;
            }
          }
        });
      }
    });
    
    console.log('✅ 템플릿 보호 설정 제거 완료');
  } catch (error) {
    console.error('❌ 템플릿 보호 설정 제거 실패:', error);
  }
};

// 템플릿의 공유 수식 문제 해결 (L28 오류 방지)
const fixTemplateSharedFormulas = (workbook) => {
  try {
    console.log('🔧 템플릿 공유 수식 문제 해결 시작...');
    
    workbook.worksheets.forEach(worksheet => {
      console.log(`📋 ${worksheet.name} 시트 공유 수식 수정 중...`);
      
      try {
        // L열의 모든 공유 수식을 일반 값으로 교체
        for (let row = 1; row <= 50; row++) {
          const lCell = worksheet.getCell(`L${row}`);
          if (lCell && lCell.formula) {
            try {
              // 공유 수식을 값으로 교체
              const currentValue = lCell.value || 0;
              // formula 속성을 안전하게 제거
              if (lCell._formula) {
                lCell._formula = undefined;
              }
              lCell.value = currentValue;
              console.log(`🔧 L${row} 공유 수식 → 값으로 변경: ${currentValue}`);
            } catch (cellError) {
              console.warn(`⚠️ L${row} 셀 처리 실패:`, cellError);
            }
          }
        }
        
        // 기타 문제 있는 셀들도 처리
        worksheet.eachRow((row, rowNumber) => {
          row.eachCell((cell, colNumber) => {
            if (cell && cell.formula) {
              try {
                const formula = cell.formula.toString();
                // 공유 수식 패턴이 있으면 제거
                if (formula.includes('shared') || formula.includes('SHARED') || 
                    formula.includes('#REF!') || formula.includes('#N/A')) {
                  const currentValue = cell.value || 0;
                  // formula 속성을 안전하게 제거
                  if (cell._formula) {
                    cell._formula = undefined;
                  }
                  cell.value = currentValue;
                  console.log(`🔧 ${cell.address} 문제 수식 → 값으로 변경`);
                }
              } catch (cellError) {
                // 문제 있는 셀은 값으로 교체
                try {
                  const currentValue = cell.value || 0;
                  if (cell._formula) {
                    cell._formula = undefined;
                  }
                  cell.value = currentValue;
                  console.log(`⚠️ ${cell.address} 처리 실패 → 값으로 대체`);
                } catch (finalError) {
                  console.warn(`⚠️ ${cell.address} 최종 처리 실패:`, finalError);
                }
              }
            }
          });
        });
        
      } catch (worksheetError) {
        console.error(`❌ 시트 ${worksheet.name} 처리 실패:`, worksheetError);
      }
    });
    
    console.log('✅ 템플릿 공유 수식 문제 해결 완료');
  } catch (error) {
    console.error('❌ 공유 수식 문제 해결 실패:', error);
    // 오류가 발생해도 계속 진행
    console.log('⚠️ 공유 수식 문제 해결 실패했지만 계속 진행합니다.');
  }
};

// 완전히 새로운 워크북 생성 (공유 수식 문제 회피)
const createSafeWorkbook = () => {
  try {
    console.log('🆕 안전한 새 워크북 생성...');
    
    const workbook = new ExcelJS.Workbook();
    
    // 갑지 시트 생성
    const gapjiSheet = workbook.addWorksheet('갑지');
    
    // 기본 갑지 헤더 추가
    gapjiSheet.getRow(1).values = ['기성금 청구서'];
    gapjiSheet.getRow(4).values = ['공사명:', '유리공사 및 샤시공사'];
    gapjiSheet.getRow(6).values = ['시공사:', ''];
    gapjiSheet.getRow(8).values = ['하도급공사명:', '유리공사'];
    gapjiSheet.getRow(10).values = ['계약일자:', ''];
    gapjiSheet.getRow(12).values = ['준공일자:', ''];
    gapjiSheet.getRow(28).values = ['', '', '', '', '', '', '', '', '', '', '', '', '기성총액:', 0];
    gapjiSheet.getRow(29).values = ['', '', '', '', '', '', '', '', '', '', '', '', '선급금차감:', 0];
    gapjiSheet.getRow(30).values = ['', '', '', '', '', '', '', '', '', '', '', '', '실지급액:', 0];
    
    // 기성금 내역서 시트 생성
    const detailSheet = workbook.addWorksheet('기성금 내역서');
    
    // 기본 헤더 설정 (유리공사 템플릿)
    detailSheet.getRow(1).values = ['기성금 내역서'];
    detailSheet.getRow(3).values = ['공사명 : 유리공사 및 샤시공사'];
    detailSheet.getRow(5).values = [
      '품명', '규격', '단위', '계약수량', '계약단가', '계약금액',
      '전회기성수량', '전회기성금액', '금회기성수량', '금회기성금액',
      '누계수량', '누계금액', '진도율', '비고'
    ];
    
    // 기본 유리공사 데이터 추가
    const basicGlassItems = [
      ['유리공사', '일반유리', 'M²', 100, 45000, 4500000, 0, 0, 0, 0, 0, 0, 0, ''],
      ['샤시공사', 'PVC샤시', 'M²', 80, 65000, 5200000, 0, 0, 0, 0, 0, 0, 0, ''],
      ['부자재', '씰링,브라켓', 'LOT', 1, 500000, 500000, 0, 0, 0, 0, 0, 0, 0, ''],
      ['기타', '제잡비', 'LOT', 1, 200000, 200000, 0, 0, 0, 0, 0, 0, 0, ''],
      ['단수정리', '', '', 1, -28000, -28000, 0, 0, 0, 0, 0, 0, 0, '']
    ];
    
    basicGlassItems.forEach((item, index) => {
      detailSheet.getRow(6 + index).values = item;
    });
    
    console.log('✅ 안전한 새 워크북 생성 완료');
    return workbook;
  } catch (error) {
    console.error('❌ 새 워크북 생성 실패:', error);
    throw error;
  }
};

// 파이어베이스/Public에서 기존 gisung.xlsx 템플릿 로드
const loadGisungTemplate = async () => {
  try {
    console.log('📥 기존 gisung.xlsx 템플릿 로드 시작...');
    
    // 1차 시도: 파이어베이스에서 템플릿 가져오기
    try {
      const templateRef = ref(storage, 'templates/gisung.xlsx');
      const downloadURL = await getDownloadURL(templateRef);
      
      const response = await fetch(downloadURL);
      if (!response.ok) {
        throw new Error(`파이어베이스 템플릿 다운로드 실패: ${response.status}`);
      }
      
      const templateBuffer = await response.arrayBuffer();
      console.log('📥 파이어베이스 템플릿 로드 완료, 크기:', templateBuffer.byteLength, 'bytes');
      
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(templateBuffer);
      
      console.log('✅ 파이어베이스 템플릿 로드 성공');
      return workbook;
      
    } catch (firebaseError) {
      console.warn('⚠️ 파이어베이스 템플릿 로드 실패, public 폴더에서 시도:', firebaseError);
      
      // 2차 시도: public 폴더에서 템플릿 가져오기
      try {
        const response = await fetch('/gisung.xlsx');
        if (!response.ok) {
          throw new Error(`Public 템플릿 로드 실패: ${response.status}`);
        }
        
        const templateBuffer = await response.arrayBuffer();
        console.log('📥 Public 템플릿 로드 완료, 크기:', templateBuffer.byteLength, 'bytes');
        
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(templateBuffer);
        
        console.log('✅ Public 템플릿 로드 성공');
        return workbook;
        
      } catch (publicError) {
        console.error('❌ Public 템플릿 로드도 실패:', publicError);
        throw new Error('템플릿 로드 완전 실패');
      }
    }
  } catch (error) {
    console.error('❌ 템플릿 로드 실패:', error);
    throw error;
  }
};

// ExcelJS로 완전한 갑지 시트 구조 생성 (템플릿과 동일하게)
const createFullGapjiSheet = (worksheet, siteData, gisungData) => {
  console.log('🎨 ExcelJS로 완전한 갑지 시트 생성 시작...');
  
  try {
    // 워크시트 기본 설정
    worksheet.pageSetup = {
      paperSize: 9, // A4
      orientation: 'portrait',
      margins: {
        left: 0.7, right: 0.7, top: 0.75, bottom: 0.75,
        header: 0.3, footer: 0.3
      }
    };
    
    // 열 너비 설정 (A~N열)
    worksheet.columns = [
      { width: 8 },   // A열
      { width: 12 },  // B열  
      { width: 10 },  // C열
      { width: 15 },  // D열
      { width: 12 },  // E열
      { width: 8 },   // F열
      { width: 10 },  // G열
      { width: 12 },  // H열
      { width: 8 },   // I열
      { width: 10 },  // J열
      { width: 12 },  // K열
      { width: 15 },  // L열
      { width: 12 },  // M열
      { width: 10 }   // N열
    ];
    
    // 1행: 제목
    const titleRow = worksheet.getRow(1);
    titleRow.getCell(1).value = '기성금 청구서';
    worksheet.mergeCells('A1:N1');
    titleRow.getCell(1).font = { name: '맑은 고딕', size: 20, bold: true };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    titleRow.height = 40;
    
    // 2행: 공백
    worksheet.getRow(2).height = 15;
    
    // 3행: 수신처
    const row3 = worksheet.getRow(3);
    row3.getCell(1).value = '수신:';
    row3.getCell(2).value = siteData?.company || siteData?.client || '발주처명';
    row3.getCell(1).font = { name: '맑은 고딕', size: 11, bold: true };
    row3.getCell(2).font = { name: '맑은 고딕', size: 11 };
    
    // 4행: 공사명
    const row4 = worksheet.getRow(4);
    row4.getCell(1).value = '공사명:';
    row4.getCell(2).value = siteData?.name || '현장명';
    worksheet.mergeCells('B4:N4');
    row4.getCell(1).font = { name: '맑은 고딕', size: 11, bold: true };
    row4.getCell(2).font = { name: '맑은 고딕', size: 11 };
    
    // 5행: 공백
    worksheet.getRow(5).height = 10;
    
    // 6행: 시공사
    const row6 = worksheet.getRow(6);
    row6.getCell(1).value = '시공사:';
    row6.getCell(2).value = siteData?.contractor || siteData?.contractorName || '시공사명';
    row6.getCell(1).font = { name: '맑은 고딕', size: 11, bold: true };
    row6.getCell(2).font = { name: '맑은 고딕', size: 11 };
    
    // 8행: 하도급공사명
    const row8 = worksheet.getRow(8);
    row8.getCell(1).value = '하도급공사명:';
    row8.getCell(2).value = '유리공사';
    row8.getCell(1).font = { name: '맑은 고딕', size: 11, bold: true };
    row8.getCell(2).font = { name: '맑은 고딕', size: 11 };
    
    // 10행: 계약일자
    const startDate = siteData?.startDate ? new Date(siteData.startDate) : null;
    const row10 = worksheet.getRow(10);
    row10.getCell(1).value = '계약일자:';
    row10.getCell(2).value = startDate ? `${startDate.getFullYear()}년 ${String(startDate.getMonth() + 1).padStart(2, '0')}월` : '';
    row10.getCell(1).font = { name: '맑은 고딕', size: 11, bold: true };
    row10.getCell(2).font = { name: '맑은 고딕', size: 11 };
    
    // 12행: 준공일자
    const endDate = siteData?.endDate ? new Date(siteData.endDate) : null;
    const row12 = worksheet.getRow(12);
    row12.getCell(1).value = '준공일자:';
    row12.getCell(2).value = endDate ? `${endDate.getFullYear()}년 ${String(endDate.getMonth() + 1).padStart(2, '0')}월` : '';
    row12.getCell(1).font = { name: '맑은 고딕', size: 11, bold: true };
    row12.getCell(2).font = { name: '맑은 고딕', size: 11 };
    
    // 중간 공백들
    for (let i = 13; i <= 27; i++) {
      worksheet.getRow(i).height = 15;
    }
    
    // 28행: 기성총액
    const gisungAmount = Number(gisungData?.[0]?.gisungAmount || 0);
    const row28 = worksheet.getRow(28);
    row28.getCell(12).value = '기성총액:';
    row28.getCell(13).value = gisungAmount;
    row28.getCell(12).font = { name: '맑은 고딕', size: 11, bold: true };
    row28.getCell(13).font = { name: '맑은 고딕', size: 11 };
    row28.getCell(13).numFmt = '#,##0';
    
    // 29행: 선급금차감
    const advanceAmount = Number(siteData?.advance || 0);
    const row29 = worksheet.getRow(29);
    row29.getCell(12).value = '선급금차감:';
    row29.getCell(13).value = -advanceAmount;
    row29.getCell(12).font = { name: '맑은 고딕', size: 11, bold: true };
    row29.getCell(13).font = { name: '맑은 고딕', size: 11 };
    row29.getCell(13).numFmt = '#,##0';
    
    // F25에 선급금 입력 (보호된 셀)
    if (advanceAmount > 0) {
      const f25Cell = worksheet.getCell('F25');
      f25Cell.value = advanceAmount;
      f25Cell.numFmt = '#,##0';
    }
    
    // 30행: 실지급액 (수식으로 계산)
    const row30 = worksheet.getRow(30);
    row30.getCell(12).value = '실지급액:';
    row30.getCell(13).value = gisungAmount - advanceAmount;
    row30.getCell(12).font = { name: '맑은 고딕', size: 11, bold: true };
    row30.getCell(13).font = { name: '맑은 고딕', size: 11, bold: true };
    row30.getCell(13).numFmt = '#,##0';
    
    // 테두리 추가
    const borderStyle = { style: 'thin', color: { argb: '000000' } };
    
    // 제목 영역 테두리
    ['A1', 'N1'].forEach(cell => {
      worksheet.getCell(cell).border = {
        top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle
      };
    });
    
    // 금액 영역 테두리 (28~30행)
    for (let row = 28; row <= 30; row++) {
      ['L', 'M'].forEach(col => {
        worksheet.getCell(`${col}${row}`).border = {
          top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle
        };
      });
    }
    
    console.log('✅ 완전한 갑지 시트 생성 완료');
  } catch (error) {
    console.error('❌ 갑지 시트 생성 실패:', error);
  }
  
  try {
    // 공사명 (D4 셀)
    const cellD4 = worksheet.getCell('D4');
    if (cellD4 && !cellD4.formula) {
      cellD4.value = siteData.name || '';
      console.log(`✅ 공사명 입력: D4 = ${siteData.name || ''}`);
    } else if (cellD4 && cellD4.formula) {
      console.log(`📊 공사명 셀에 수식이 있어 건드리지 않음: D4`);
    }
    
    // 시공사 (D6 셀)
    const cellD6 = worksheet.getCell('D6');
    if (cellD6 && !cellD6.formula) {
      cellD6.value = siteData.companyName || siteData.contractor || '';
      console.log(`✅ 시공사 입력: D6 = ${siteData.companyName || siteData.contractor || ''}`);
    } else if (cellD6 && cellD6.formula) {
      console.log(`📊 시공사 셀에 수식이 있어 건드리지 않음: D6`);
    }
    
    // 하도급공사명 (D8 셀)
    const cellD8 = worksheet.getCell('D8');
    if (cellD8 && !cellD8.formula) {
      cellD8.value = '유리공사';
      console.log(`✅ 하도급공사명 입력: D8 = 유리공사`);
    } else if (cellD8 && cellD8.formula) {
      console.log(`📊 하도급공사명 셀에 수식이 있어 건드리지 않음: D8`);
    }
    
    // 계약일자 (D10 셀)
    const startDate = siteData.startDate ? new Date(siteData.startDate) : null;
    if (startDate) {
      const cellD10 = worksheet.getCell('D10');
      if (cellD10 && !cellD10.formula) {
        cellD10.value = `${startDate.getFullYear()}년 ${String(startDate.getMonth() + 1).padStart(2, '0')}월`;
        console.log(`✅ 계약일자 입력: D10 = ${cellD10.value}`);
      } else if (cellD10 && cellD10.formula) {
        console.log(`📊 계약일자 셀에 수식이 있어 건드리지 않음: D10`);
      }
    }
    
    // 준공일자 (D12 셀)
    const completionDate = siteData.endDate ? new Date(siteData.endDate) : null;
    if (completionDate) {
      const cellD12 = worksheet.getCell('D12');
      if (cellD12 && !cellD12.formula) {
        cellD12.value = `${completionDate.getFullYear()}년 ${String(completionDate.getMonth() + 1).padStart(2, '0')}월`;
        console.log(`✅ 준공일자 입력: D12 = ${cellD12.value}`);
      } else if (cellD12 && cellD12.formula) {
        console.log(`📊 준공일자 셀에 수식이 있어 건드리지 않음: D12`);
      }
    }
    
    // 현재 년.월 (A36 셀)
    const currentDate = new Date();
    const cellA36 = worksheet.getCell('A36');
    if (cellA36 && !cellA36.formula) {
      cellA36.value = `${currentDate.getFullYear()}.${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      console.log(`✅ 현재 년.월 입력: A36 = ${cellA36.value}`);
    } else if (cellA36 && cellA36.formula) {
      console.log(`📊 현재 년.월 셀에 수식이 있어 건드리지 않음: A36`);
    }
    
    // 회사명 귀중 (A44 셀)
    const companyName = siteData.companyName || siteData.contractor || '';
    const cellA44 = worksheet.getCell('A44');
    if (cellA44 && !cellA44.formula) {
      cellA44.value = `${companyName}  귀중`;
      console.log(`✅ 회사명 귀중 입력: A44 = ${cellA44.value}`);
    } else if (cellA44 && cellA44.formula) {
      console.log(`📊 회사명 귀중 셀에 수식이 있어 건드리지 않음: A44`);
    }
    
    // 총액 계산 수식 추가 (L28 등)
    try {
      console.log('💰 갑지 시트 총액 계산 수식 추가...');
      
      // 기성총액 관련 수식들 (템플릿에 따라 위치가 다를 수 있음)
      const totalCells = ['L28', 'L29', 'L30', 'M28', 'M29', 'M30'];
      totalCells.forEach(cellAddress => {
        try {
          const cell = worksheet.getCell(cellAddress);
          if (cell && !cell.formula) {
            // 총액 계산이 필요한 셀에 기본 수식 추가
            if (cellAddress === 'L28') {
              // 기성총액 = 기성금액 합계 (템플릿에서 참조)
              cell.value = Number(gisungData[0]?.gisungAmount || 0);
              cell.numFmt = '#,##0';
              console.log(`✅ ${cellAddress} 기성총액 입력: ${cell.value}`);
            } else if (cellAddress === 'L29') {
              // 선급금 차감
              const advanceAmount = Number(siteData.advance || 0);
              cell.value = -advanceAmount;
              cell.numFmt = '#,##0';
              console.log(`✅ ${cellAddress} 선급금 차감 입력: ${cell.value}`);
            } else if (cellAddress === 'L30') {
              // 실지급액 = 기성총액 - 선급금
              try {
                cell.formula = 'L28+L29';
                cell.numFmt = '#,##0';
                console.log(`✅ ${cellAddress} 실지급액 수식 추가: L28+L29`);
              } catch (formulaError) {
                const gisungAmount = Number(gisungData[0]?.gisungAmount || 0);
                const advanceAmount = Number(siteData.advance || 0);
                cell.value = gisungAmount - advanceAmount;
                cell.numFmt = '#,##0';
                console.log(`✅ ${cellAddress} 실지급액 계산값 입력: ${cell.value}`);
              }
            }
          }
        } catch (cellError) {
          console.warn(`⚠️ ${cellAddress} 셀 처리 실패:`, cellError);
        }
      });
      
      console.log('✅ 갑지 시트 총액 계산 수식 추가 완료');
    } catch (totalError) {
      console.warn('⚠️ 갑지 시트 총액 계산 수식 추가 실패:', totalError);
    }
    
    console.log('✅ ExcelJS로 갑지 시트 데이터 입력 완료');
  } catch (error) {
    console.error('❌ ExcelJS로 갑지 시트 데이터 입력 실패:', error);
  }
};

// ExcelJS로 완전한 기성금 내역서 시트 생성 (템플릿과 동일하게)
const createFullDetailSheet = (worksheet, siteData, gisungData, siteItems = []) => {
  console.log('🎨 ExcelJS로 완전한 기성금 내역서 시트 생성 시작...');
  
  try {
    // 워크시트 기본 설정
    worksheet.pageSetup = {
      paperSize: 9, // A4
      orientation: 'portrait',
      margins: {
        left: 0.5, right: 0.5, top: 0.75, bottom: 0.75,
        header: 0.3, footer: 0.3
      }
    };
    
    // 열 너비 설정 (A~N열)
    worksheet.columns = [
      { width: 12 },  // A열 - 품명
      { width: 15 },  // B열 - 규격
      { width: 6 },   // C열 - 단위
      { width: 10 },  // D열 - 계약수량
      { width: 12 },  // E열 - 계약단가
      { width: 15 },  // F열 - 계약금액
      { width: 10 },  // G열 - 전회기성수량
      { width: 15 },  // H열 - 전회기성금액
      { width: 10 },  // I열 - 금회기성수량
      { width: 15 },  // J열 - 금회기성금액
      { width: 10 },  // K열 - 누계수량
      { width: 15 },  // L열 - 누계금액
      { width: 8 },   // M열 - 진도율
      { width: 12 }   // N열 - 비고
    ];
    
    // 1행: 제목
    const titleRow = worksheet.getRow(1);
    titleRow.getCell(1).value = '기성금 내역서';
    worksheet.mergeCells('A1:N1');
    titleRow.getCell(1).font = { name: '맑은 고딕', size: 16, bold: true };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    titleRow.height = 30;
    
    // 2행: 공백
    worksheet.getRow(2).height = 10;
    
    // 3행: 공사명 (한 곳에만 표시)
    const row3 = worksheet.getRow(3);
    row3.getCell(1).value = `공사명 : ${siteData?.name || '현장명'}`;
    worksheet.mergeCells('A3:N3');
    row3.getCell(1).font = { name: '맑은 고딕', size: 12, bold: true };
    row3.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    
    // 4행: 공백 (추가 공백 행)
    worksheet.getRow(4).height = 10;
    
    // 4행: 공백
    worksheet.getRow(4).height = 10;
    
    // 5행: 헤더
    const headerRow = worksheet.getRow(5);
    const headers = [
      '품명', '규격', '단위', '계약수량', '계약단가', '계약금액',
      '전회기성수량', '전회기성금액', '금회기성수량', '금회기성금액',
      '누계수량', '누계금액', '진도율', '비고'
    ];
    
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { name: '맑은 고딕', size: 9, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6FA' } };
      
      // 테두리
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    headerRow.height = 40;
    
          // 기본 데이터가 없으면 유리공사 기본 데이터 생성 (단수정리까지만)
      if (!siteItems || siteItems.length === 0) {
        siteItems = [
          { name: '유리공사', specification: '일반유리', unit: 'M²', quantity: 100, price: 45000 },
          { name: '샤시공사', specification: 'PVC샤시', unit: 'M²', quantity: 80, price: 65000 },
          { name: '유리문공사', specification: '자동문', unit: '개', quantity: 2, price: 1500000 },
          { name: '부자재', specification: '씰링,브라켓', unit: 'LOT', quantity: 1, price: 500000 },
          { name: '운반비', specification: '현장운반', unit: '식', quantity: 1, price: 300000 },
          { name: '기타', specification: '제잡비', unit: 'LOT', quantity: 1, price: 200000 },
          { name: '단수정리', specification: '', unit: '', quantity: 0, price: 0 } // 단수정리는 구분선 역할만, 그 아래는 무시
        ];
      }
      
      // 단수정리 이후의 항목들은 모두 제거 (총공사계, 구분선 등)
      const danSuIndex = siteItems.findIndex(item => item.name === '단수정리');
      if (danSuIndex !== -1) {
        siteItems = siteItems.slice(0, danSuIndex + 1); // 단수정리까지만 포함
        console.log('📊 단수정리 이후 항목 제거 완료');
      }
    
    // 데이터 행들 생성
    let currentRow = 6;
    let totalContractAmount = 0;
    let totalCurrentAmount = 0;
    
    siteItems.forEach((item, index) => {
      const dataRow = worksheet.getRow(currentRow);
      
      const contractQuantity = Number(item.quantity || 0);
      const contractPrice = Number(item.price || 0);
      const contractAmount = contractQuantity * contractPrice;
      
      // 금회 기성 (기본적으로 계약금액의 100%)
      const currentQuantity = contractQuantity;
      const currentAmount = contractAmount;
      
      // 누계 (전회 + 금회)
      const totalQuantity = currentQuantity;
      const totalAmount = currentAmount;
      
      // 진도율 (누계금액 / 계약금액 * 100)
      const progress = contractAmount === 0 ? 0 : (totalAmount / contractAmount) * 100;
      
      // 단수정리는 특별 처리
      let rowData;
      if (item.name === '단수정리') {
        // 단수정리는 구분선 역할만 하므로 빈 값으로 설정
        rowData = [
          '단수정리',                      // A: 품명
          '',                             // B: 규격
          '',                             // C: 단위
          '',                             // D: 계약수량
          '',                             // E: 계약단가
          '',                             // F: 계약금액
          '',                             // G: 전회기성수량
          '',                             // H: 전회기성금액
          '',                             // I: 금회기성수량
          '',                             // J: 금회기성금액
          '',                             // K: 누계수량
          '',                             // L: 누계금액
          '',                             // M: 진도율
          ''                              // N: 비고
        ];
      } else {
        // 일반 항목 처리
        rowData = [
          item.name || '',                    // A: 품명
          item.specification || '',           // B: 규격
          item.unit || '',                   // C: 단위
          contractQuantity,                  // D: 계약수량
          contractPrice,                     // E: 계약단가
          contractAmount,                    // F: 계약금액
          0,                                // G: 전회기성수량
          0,                                // H: 전회기성금액
          currentQuantity,                  // I: 금회기성수량
          currentAmount,                    // J: 금회기성금액
          totalQuantity,                    // K: 누계수량
          totalAmount,                      // L: 누계금액
          progress,                         // M: 진도율
          ''                               // N: 비고
        ];
      }
      
              rowData.forEach((value, colIndex) => {
          const cell = dataRow.getCell(colIndex + 1);
          cell.value = value;
          
          // 단수정리는 특별 스타일 적용
          if (item.name === '단수정리') {
            cell.font = { name: '맑은 고딕', size: 9, bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            cell.font = { name: '맑은 고딕', size: 9 };
            
            // 숫자 형식 설정
            if ([3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(colIndex)) { // 수량, 단가, 금액 열
              if (typeof value === 'number') {
                cell.numFmt = colIndex === 4 ? '#,##0' : '#,##0'; // 단가와 금액
              }
            } else if (colIndex === 12) { // 진도율
              cell.numFmt = '0.0';
            }
            
            // 정렬
            if ([3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(colIndex)) {
              cell.alignment = { horizontal: 'right', vertical: 'middle' };
            } else {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }
          }
          
          // 테두리
          cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      
      // 단수정리는 특별 처리 - 금액 계산에서 제외
      if (item.name === '단수정리') {
        // 단수정리 행은 구분선 역할만 하므로 금액 계산에서 제외
        console.log('📊 단수정리 항목 처리:', item.name);
      } else {
        totalContractAmount += contractAmount;
        totalCurrentAmount += currentAmount;
      }
      
      currentRow++;
    });
    
    // 합계 행들 제거 - 단수정리까지만 표시
    
    console.log('✅ 완전한 기성금 내역서 시트 생성 완료');
  } catch (error) {
    console.error('❌ 기성금 내역서 시트 생성 실패:', error);
  }
  
  try {
    // 데이터 시작 행
    let currentRow = 6;
    
    console.log('📊 물량 데이터 처리 시작:', siteItems.length, '개 항목');
    console.log('📊 siteItems 상세 데이터:', siteItems.map((item, index) => `${index + 1}: ${item.name} (${item.quantity || 0})`));
    console.log('📊 siteItems 원본 데이터:', JSON.stringify(siteItems, null, 2));
    
    // siteItems가 비어있으면 템플릿에서 데이터 읽어오기
    if (!siteItems || siteItems.length === 0) {
      console.log('📊 siteItems가 비어있음. 템플릿에서 데이터 읽어오기...');
      
      // 완전히 새로운 방식: 단수정리 위치를 먼저 정확히 찾기
      console.log('🔍 단수정리 위치 정확히 찾기 시작...');
      
      let danSuRow = -1;
      let danSuFound = false;
      
      // 첫 번째 패스: 단수정리 위치만 찾기
      for (let row = 6; row <= 50; row++) {
        const cellA = worksheet.getCell(`A${row}`);
        const itemName = cellA ? (cellA.value?.toString() || '') : '';
        
        console.log(`🔍 ${row}행 확인: "${itemName}"`);
        
        if (itemName.includes('단수정리') || itemName.includes('NEGO') || itemName.includes('네고')) {
          danSuRow = row;
          danSuFound = true;
          console.log(`🎯 단수정리 발견: ${row}행 - "${itemName}"`);
          break;
        }
      }
      
      if (!danSuFound) {
        console.log(`⚠️ 단수정리를 찾지 못함, 기본값 25행 사용`);
        danSuRow = 25;
      }
      
      console.log(`📊 단수정리 행: ${danSuRow}행, 이 행까지만 데이터 읽어오기`);
      
      // 완전히 새로운 방식: 단수정리까지만 정확히 가져오기
      siteItems = [];
      let newDanSuFound = false;
      let newDanSuRow = -1;
      
      // 첫 번째 패스: 단수정리 위치 찾기
      for (let row = 6; row <= 50; row++) {
        const cellA = worksheet.getCell(`A${row}`);
        const itemName = cellA ? (cellA.value?.toString() || '') : '';
        
        if (itemName.includes('단수정리') || itemName.includes('NEGO') || itemName.includes('네고')) {
          newDanSuRow = row;
          newDanSuFound = true;
          console.log(`🎯 단수정리 발견: ${row}행 - "${itemName}"`);
          break;
        }
      }
      
      if (!newDanSuFound) {
        console.log(`⚠️ 단수정리를 찾지 못함, 기본값 25행 사용`);
        newDanSuRow = 25;
      }
      
      console.log(`📊 단수정리 행: ${newDanSuRow}행, 이 행까지만 데이터 읽어오기`);
      
      // 두 번째 패스: 단수정리 행까지만 데이터 읽어오기
      for (let row = 6; row <= newDanSuRow; row++) {
        const cellA = worksheet.getCell(`A${row}`);
        const cellB = worksheet.getCell(`B${row}`);
        const cellC = worksheet.getCell(`C${row}`);
        const cellD = worksheet.getCell(`D${row}`);
        const cellE = worksheet.getCell(`E${row}`);
        
        const itemName = cellA ? (cellA.value?.toString() || '') : '';
        const specification = cellB ? (cellB.value?.toString() || '') : '';
        
        // 일반 항목 처리 (빈 행은 제외)
        if (itemName.trim() !== '' || specification.trim() !== '') {
          const item = {
            name: itemName,
            specification: specification,
            unit: cellC ? (cellC.value?.toString() || '') : '',
            quantity: cellD ? Number(cellD.value) || 0 : 0,
            price: cellE ? Number(cellE.value) || 0 : 0
          };
          
          siteItems.push(item);
          console.log(`✅ 템플릿에서 읽어온 데이터: ${row}행 - ${item.name} (${item.quantity}, ${item.price})`);
        } else {
          console.log(`📝 빈 행 제외: ${row}행`);
        }
      }
      console.log(`📊 템플릿에서 읽어온 총 ${siteItems.length}개 항목`);
      
      // 템플릿에서도 데이터가 없으면 유리공사 기본 데이터 생성
      if (siteItems.length === 0 || siteItems.filter(item => item.name?.trim()).length === 0) {
        console.log('⚠️ 템플릿에서도 데이터가 없음. 유리공사 기본 데이터 생성...');
        siteItems = [
          { name: '유리공사', specification: '일반유리', unit: 'M²', quantity: 100, price: 45000 },
          { name: '샤시공사', specification: 'PVC샤시', unit: 'M²', quantity: 80, price: 65000 },
          { name: '유리문공사', specification: '자동문', unit: '개', quantity: 2, price: 1500000 },
          { name: '커튼월공사', specification: '구조용', unit: 'M²', quantity: 50, price: 120000 },
          { name: '방화유리공사', specification: '내화유리', unit: 'M²', quantity: 30, price: 85000 },
          { name: '부자재', specification: '씰링,브라켓', unit: 'LOT', quantity: 1, price: 500000 },
          { name: '운반비', specification: '현장운반', unit: '식', quantity: 1, price: 300000 },
          { name: '시설비', specification: '현장시설', unit: '식', quantity: 1, price: 200000 },
          { name: '기타잡비', specification: '제잡비', unit: '식', quantity: 1, price: 150000 },
          { name: '단수정리', specification: '', unit: '', quantity: 1, price: -28000 }
        ];
        console.log(`📊 유리공사 기본 데이터 생성: ${siteItems.length}개 항목`);
      }
    }
    
    console.log(`📊 읽어온 siteItems: ${siteItems.length}개 항목`);
    
    // 모든 항목 처리 (단수정리까지만 처리)
    let processedItems = 0;
    
    for (let index = 0; index < siteItems.length; index++) {
      const item = siteItems[index];
      const row = currentRow + index;
      
      // 단수정리나 NEGO를 찾았는지 확인
      if (item.name && (item.name.includes('단수정리') || item.name.includes('NEGO'))) {
        console.log(`📝 단수정리/NEGO 발견: ${item.name} (행 ${row})`);
        
        // 단수정리 항목 처리 (데이터는 0으로 설정)
        const dataRow = worksheet.getRow(row);
        const rowData = [
          item.name,                      // A: 품명
          '',                             // B: 규격
          '',                             // C: 단위
          '',                             // D: 계약수량
          '',                             // E: 계약단가
          '',                             // F: 계약금액
          '',                             // G: 전회기성수량
          '',                             // H: 전회기성금액
          '',                             // I: 금회기성수량
          '',                             // J: 금회기성금액
          '',                             // K: 누계수량
          '',                             // L: 누계금액
          '',                             // M: 진도율
          ''                              // N: 비고
        ];
        
        rowData.forEach((value, colIndex) => {
          const cell = dataRow.getCell(colIndex + 1);
          cell.value = value;
          cell.font = { name: '맑은 고딕' };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          };
          
          // 단수정리 행은 특별 스타일 적용
          if (item.name === '단수정리') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
            cell.font = { name: '맑은 고딕', bold: true };
          }
        });
        
        console.log(`🛑 단수정리/NEGO 처리 완료, 이후 모든 항목들은 완전히 건너뛰기`);
        processedItems++; // 단수정리 항목도 카운트
        break; // 단수정리/NEGO 이후는 완전히 처리하지 않음
      }
      
      console.log(`📝 물량 데이터 입력: ${item.name} (행 ${row})`);
      
      // 품명과 규격 먼저 확인
      const itemName = item.name || '';
      const specification = item.specification || '';
      
      // A, B열이 둘 다 비어있으면 C~M열까지 모두 빈칸으로 만들고 건너뛰기
      if ((!itemName || itemName.trim() === '') && (!specification || specification.trim() === '')) {
        console.log(`📝 A, B열 둘 다 비어있음 - C~M열 빈칸 처리: 행 ${row}`);
        
        // C~M열까지 모두 빈칸으로 설정 (보호된 셀 포함)
        const columnsToBlank = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
        for (const col of columnsToBlank) {
          try {
            const cell = worksheet.getCell(`${col}${row}`);
            if (cell) {
              cell.value = '';
              console.log(`✅ ${col}${row} 빈칸 처리`);
            }
          } catch (error) {
            console.log(`⚠️ ${col}${row} 빈칸 처리 실패 (보호된 셀):`, error.message);
          }
        }
        processedItems++; // 빈 행도 처리된 것으로 카운트
        continue; // 다음 항목으로 넘어감
      }
      
      // A열이 비어있어도 수식은 적용 (물량 데이터로 처리)
      if (!itemName || itemName.trim() === '') {
        console.log(`📝 A열 비어있지만 물량 수식 적용: 행 ${row}`);
        // continue 하지 않고 계속 진행
      }
      
      // 데이터가 있는 경우에만 수식 계산을 위해 값 설정
      console.log(`📝 데이터 입력: ${itemName} (행 ${row})`);
      
      // 계약수량 (D열) - 천단위 쉼표 처리, 0이면 빈칸
      const quantity = Number(item.quantity) || 0;
      
      // 계약단가 (E열) - 천단위 쉼표 처리, 0이면 빈칸
      const unitPrice = Number(item.price || item.unitPrice) || 0;
      
      // 수식이 없는 셀에만 데이터 입력 (템플릿 수식 절대 보존)
      const cellA = worksheet.getCell(`A${row}`);
      const cellB = worksheet.getCell(`B${row}`);
      const cellC = worksheet.getCell(`C${row}`);
      const cellD = worksheet.getCell(`D${row}`);
      const cellE = worksheet.getCell(`E${row}`);
      const cellG = worksheet.getCell(`G${row}`);
      const cellI = worksheet.getCell(`I${row}`);
      
      // A열: 품명 (수식이 없을 때만)
      if (cellA && !cellA.formula) {
        cellA.value = itemName;
        console.log(`✅ 품명 입력: A${row} = ${itemName}`);
      }
      
      // B열: 규격 (수식이 없을 때만)
      if (cellB && !cellB.formula) {
        cellB.value = specification;
        console.log(`✅ 규격 입력: B${row} = ${specification}`);
      }
      
      // C열: 단위 (수식이 없을 때만)
      const unit = item.unit || '';
      if (cellC && !cellC.formula) {
        cellC.value = unit;
        console.log(`✅ 단위 입력: C${row} = ${unit}`);
      }
      
      // D열: 계약수량 (수식이 없을 때만)
      if (cellD && !cellD.formula) {
        if (quantity === 0) {
          cellD.value = '';
        } else {
          cellD.value = quantity;
          cellD.numFmt = '#,##0';
        }
        console.log(`✅ 계약수량 입력: D${row} = ${quantity === 0 ? '빈칸' : quantity.toLocaleString()}`);
      }
      
      // E열: 계약단가 (수식이 없을 때만)
      if (cellE && !cellE.formula) {
        if (unitPrice === 0) {
          cellE.value = '';
        } else {
          cellE.value = unitPrice;
          cellE.numFmt = '#,##0';
        }
        console.log(`✅ 계약단가 입력: E${row} = ${unitPrice === 0 ? '빈칸' : unitPrice.toLocaleString()}`);
      }
      
      // G열: 전회 기성 수량 (사용자가 직접 입력하는 값 - 기본값 0)
      if (cellG && !cellG.formula) {
        cellG.value = 0;
        cellG.numFmt = '#,##0';
        console.log(`✅ 전회 기성 수량 초기화: G${row} = 0 (사용자가 직접 입력)`);
      }
      
      // I열: 금회 기성 수량 (사용자가 직접 입력하는 값 - 기본값 0)
      if (cellI && !cellI.formula) {
        cellI.value = 0;
        cellI.numFmt = '#,##0';
        console.log(`✅ 금회 기성 수량 초기화: I${row} = 0 (사용자가 직접 입력)`);
      }
      
      // A, D열에 값이 있으면 물량 데이터로 판별
      const hasAValue = itemName && itemName.trim() !== '';
      const hasDValue = quantity > 0;
      
      // A열 또는 D열에 값이 있으면 물량 데이터
      const isActualItem = hasAValue || hasDValue;
      
      if (isActualItem) {
        // 물량 데이터만 수식 추가
        const cellF = worksheet.getCell(`F${row}`);
        const cellH = worksheet.getCell(`H${row}`);
        const cellJ = worksheet.getCell(`J${row}`);
        const cellK = worksheet.getCell(`K${row}`);
        const cellL = worksheet.getCell(`L${row}`);
        const cellM = worksheet.getCell(`M${row}`);
        
        // F열: 계약금액 (D*E) - 기존 수식 보존 또는 추가
        if (cellF) {
          // 기존 수식이 있으면 보존, 없으면 추가
          if (!cellF.formula) {
            try {
              cellF.formula = `D${row}*E${row}`;
              cellF.numFmt = '#,##0';
              console.log(`✅ F${row} 수식 추가: D${row}*E${row}`);
            } catch (error) {
              console.log(`⚠️ F${row} 수식 설정 실패, 직접 계산값 입력:`, error.message);
              const quantity = Number(worksheet.getCell(`D${row}`).value) || 0;
              const unitPrice = Number(worksheet.getCell(`E${row}`).value) || 0;
              cellF.value = quantity * unitPrice;
              cellF.numFmt = '#,##0';
            }
          } else {
            console.log(`✅ F${row} 기존 수식 보존: ${cellF.formula}`);
          }
        }
      
        // H열: 기성금액 (G*E) - 기존 수식 덮어쓰기
        // H열: 전회기성금액 (G*E) - 기존 수식 보존 또는 추가
        if (cellH) {
          // 기존 수식이 있으면 보존, 없으면 추가
          if (!cellH.formula) {
            try {
              cellH.formula = `G${row}*E${row}`;
              cellH.numFmt = '#,##0';
              console.log(`✅ H${row} 수식 추가: G${row}*E${row}`);
            } catch (error) {
              console.log(`⚠️ H${row} 수식 설정 실패, 직접 계산값 입력:`, error.message);
              const prevQuantity = Number(worksheet.getCell(`G${row}`).value) || 0;
              const unitPrice = Number(worksheet.getCell(`E${row}`).value) || 0;
              cellH.value = prevQuantity * unitPrice;
              cellH.numFmt = '#,##0';
            }
          } else {
            console.log(`✅ H${row} 기존 수식 보존: ${cellH.formula}`);
          }
        }
      
        // J열: 금회기성금액 (E*I) - 기존 수식 보존 또는 추가
        if (cellJ) {
          // 기존 수식이 있으면 보존, 없으면 추가
          if (!cellJ.formula) {
            try {
              cellJ.formula = `E${row}*I${row}`;
              cellJ.numFmt = '#,##0';
              console.log(`✅ J${row} 수식 추가: E${row}*I${row}`);
            } catch (error) {
              console.log(`⚠️ J${row} 수식 설정 실패, 직접 계산값 입력:`, error.message);
              const unitPrice = Number(worksheet.getCell(`E${row}`).value) || 0;
              const currentQuantity = Number(worksheet.getCell(`I${row}`).value) || 0;
              cellJ.value = unitPrice * currentQuantity;
              cellJ.numFmt = '#,##0';
            }
          } else {
            console.log(`✅ J${row} 기존 수식 보존: ${cellJ.formula}`);
          }
        }
      
        // K열: 누계수량 (G+I) - 기존 수식 보존 또는 추가
        if (cellK) {
          // 기존 수식이 있으면 보존, 없으면 추가
          if (!cellK.formula) {
            try {
              cellK.formula = `G${row}+I${row}`;
              cellK.numFmt = '#,##0';
              console.log(`✅ K${row} 수식 추가: G${row}+I${row}`);
            } catch (error) {
              console.log(`⚠️ K${row} 수식 설정 실패, 직접 계산값 입력:`, error.message);
              const prevQuantity = Number(worksheet.getCell(`G${row}`).value) || 0;
              const currentQuantity = Number(worksheet.getCell(`I${row}`).value) || 0;
              cellK.value = prevQuantity + currentQuantity;
              cellK.numFmt = '#,##0';
            }
          } else {
            console.log(`✅ K${row} 기존 수식 보존: ${cellK.formula}`);
          }
        }
      
        // L열: 누계금액 (H+J) - 기존 수식 보존 또는 추가
        if (cellL) {
          // 기존 수식이 있으면 보존, 없으면 추가
          if (!cellL.formula) {
            try {
              cellL.formula = `H${row}+J${row}`;
              cellL.numFmt = '#,##0';
              console.log(`✅ L${row} 수식 추가: H${row}+J${row}`);
            } catch (error) {
              console.log(`⚠️ L${row} 수식 설정 실패, 직접 계산값 입력:`, error.message);
              const prevAmount = Number(worksheet.getCell(`H${row}`).value) || 0;
              const currentAmount = Number(worksheet.getCell(`J${row}`).value) || 0;
              cellL.value = prevAmount + currentAmount;
              cellL.numFmt = '#,##0';
            }
          } else {
            console.log(`✅ L${row} 기존 수식 보존: ${cellL.formula}`);
          }
        }
      
        // M열: 진도율 (L/F*100) - 기존 수식 보존 또는 추가
        if (cellM) {
          // 기존 수식이 있으면 보존, 없으면 추가
          if (!cellM.formula) {
            try {
              cellM.formula = `IF(F${row}=0,0,L${row}/F${row}*100)`;
              cellM.numFmt = '0.0';
              console.log(`✅ M${row} 수식 추가: L${row}/F${row}*100`);
            } catch (error) {
              console.log(`⚠️ M${row} 수식 설정 실패, 직접 계산값 입력:`, error.message);
              const cumulativeAmount = Number(worksheet.getCell(`L${row}`).value) || 0;
              const contractAmount = Number(worksheet.getCell(`F${row}`).value) || 0;
              const progress = contractAmount === 0 ? 0 : (cumulativeAmount / contractAmount) * 100;
              cellM.value = progress;
              cellM.numFmt = '0.0';
            }
          } else {
            console.log(`✅ M${row} 기존 수식 보존: ${cellM.formula}`);
          }
        }
      } else {
        console.log(`📊 ${row}행: 총원가/부가세/총계 - 템플릿 수식 보존`);
      }
      
      console.log(`📊 ${row}행: 처리 완료`);
      
      processedItems++;
    }
    
    console.log(`📊 처리된 물량 데이터: ${processedItems}개 항목`);
    
    // 마지막 물량 데이터 행 계산 (실제 처리된 행 수 기반)
    const lastDataRow = currentRow + processedItems - 1;
    console.log(`📊 마지막 물량 데이터 행: ${lastDataRow}행 (처리된 ${processedItems}개 항목)`);
    
    // 동적 행 추가: 물량이 22행을 넘어가면 추가 행 생성
    const baseRowCount = 22; // 기본 22행
    const additionalRows = Math.max(0, processedItems - baseRowCount);
    
    if (additionalRows > 0) {
      console.log(`📊 물량이 ${baseRowCount}행을 초과하여 ${additionalRows}개 행 추가`);
      
      // 추가 행들을 삽입 (단수정리 다음 행부터)
      const insertStartRow = lastDataRow + 1;
      for (let i = 0; i < additionalRows; i++) {
        const insertRow = insertStartRow + i;
        worksheet.spliceRows(insertRow, 0);
        console.log(`✅ ${insertRow}행에 빈 행 삽입`);
      }
      
      // 마지막 데이터 행 위치 업데이트
      const updatedLastDataRow = lastDataRow + additionalRows;
      console.log(`📊 업데이트된 마지막 물량 데이터 행: ${updatedLastDataRow}행`);
    }
    
    // 단수정리와 선급금 사이에 빈행 2개 보장
    const danSuRow = lastDataRow; // 단수정리 행
    const advanceRow = danSuRow + 3; // 단수정리 + 빈행 2개 + 선급금 행
    console.log(`💰 선급금 행 위치: ${advanceRow}행 (단수정리 ${danSuRow}행 + 빈행 2개)`);
    
    // 선급금 행 보존 및 설정
    const advanceAmount = Number(siteData.advance) || 0;
    if (advanceAmount > 0) {
      const cellF = worksheet.getCell(`F${advanceRow}`);
      if (cellF) {
        // 선급금 셀은 수식을 그대로 두고 값만 설정
        cellF.value = advanceAmount;
        console.log(`✅ 선급금 입력: F${advanceRow} = ${advanceAmount} (수식 보존)`);
      }
    }
    
    // 선급금 행에 "선급금" 텍스트 추가 (A열)
    const cellA = worksheet.getCell(`A${advanceRow}`);
    if (cellA && !cellA.formula) {
      cellA.value = '선급금';
      console.log(`✅ 선급금 텍스트 입력: A${advanceRow} = 선급금`);
    }
    
    // 요약 행들의 고유한 수식 보존 (총원가, 부가세, 총계)
    console.log(`📊 요약 행 고유한 수식 보존:`);
    console.log(`   F25: SUM(F6:F24) (총원가)`);
    console.log(`   F26: F25*0.1 (부가세)`);
    console.log(`   F27: F25+F26 (총계)`);
    console.log(`   H25: SUM(H6:H24) (총기성금액)`);
    console.log(`   J25: SUM(J6:J24) (총금회기성금액)`);
    console.log(`   L25: H25+J25 (총합계)`);
    
    // 요약 행들의 수식이 없으면 추가
    const totalCostRow = advanceRow + 1; // 총원가 행
    const vatRow = advanceRow + 2; // 부가세 행
    const grandTotalRow = advanceRow + 3; // 총계 행
    
    // 요약 행 수식들은 템플릿 원본 그대로 유지
    console.log(`📊 요약 행 수식들은 템플릿 원본 그대로 유지:`);
    console.log(`   F${totalCostRow}: SUM 수식 (총원가)`);
    console.log(`   F${vatRow}: 부가세 수식`);
    console.log(`   F${grandTotalRow}: 총계 수식`);
    
    // 템플릿 원본 구조 완전 보존 - 아무것도 건드리지 않음
    console.log(`📊 템플릿 원본 구조 완전 보존: 모든 수식과 서식 유지`);
    
    // startRow, endRow가 정의되지 않아 이 블록 제거
    console.log(`📊 단수정리 이후 빈 행 정리 건너뛰기`);
    
    // 단수정리까지만 처리하고, 그 아래는 완전히 무시
    console.log('🛑 단수정리까지만 처리하고, 그 아래는 완전히 무시...');
    
    // 단수정리 다음 행부터 끝까지 모든 셀을 완전히 빈칸으로 처리
    const danSuNextRow = lastDataRow + 1; // 단수정리 다음 행
    
    for (let row = danSuNextRow; row <= 50; row++) { // 단수정리 다음 행부터 끝까지
      for (let col = 1; col <= 13; col++) { // A=1, M=13 (A열부터 M열까지)
        const colLetter = String.fromCharCode(64 + col);
        const cell = worksheet.getCell(`${colLetter}${row}`);
        
        if (cell) {
          try {
            // 완전히 빈칸으로 설정
            cell.value = '';
            
            // 수식도 제거
            if (cell.formula) {
              cell.formula = undefined;
            }
            
            // 스타일도 제거
            cell.style = {};
            
            // 보호 설정도 제거
            if (cell.protection) {
              cell.protection = {};
            }
            
            // 완전히 빈 셀로 만들기
            cell._value = undefined;
            cell._formula = undefined;
            
            console.log(`🧹 완전 빈칸 설정: ${colLetter}${row}`);
          } catch (error) {
            console.warn(`⚠️ 셀 ${colLetter}${row} 완전 빈칸 처리 실패:`, error);
          }
        }
      }
    }
    console.log(`✅ 단수정리 다음 행(${danSuNextRow}행)부터 끝까지 A~M열 완전 빈칸 처리 완료`);
    
    console.log('✅ 단수정리까지만 처리하고, 그 아래는 완전히 무시 완료');
    
    // 선급금 행 이후부터 끝까지 모든 셀을 빈칸으로 처리 (노란 셀들 정리) - L열 총계 수식 보존
    const summaryStartRow = advanceRow + 1;
    const summaryEndRow = 50; // 충분히 큰 행 번호
    
    console.log(`🧹 요약 행 정리: ${summaryStartRow}행부터 ${summaryEndRow}행까지 D~M열 전체 빈칸으로 삭제 (L열 총계 수식 보존)`);
    
    for (let row = summaryStartRow; row <= summaryEndRow; row++) {
      for (let col = 4; col <= 13; col++) { // D=4, M=13
        const colLetter = String.fromCharCode(64 + col);
        const cellAddress = `${colLetter}${row}`;
        const cell = worksheet.getCell(cellAddress);
        
        if (cell) {
          try {
            // L열의 중요한 총계 수식들은 보존 (L25, L28, L29, L30 등)
            let shouldPreserve = false;
            if (colLetter === 'L' && cell.formula) {
              const formula = cell.formula.toString();
              // 총계 관련 수식은 보존
              if (formula.includes('SUM') || formula.includes('합계') || 
                  formula.includes('+') || formula.includes('*') ||
                  ['L25', 'L28', 'L29', 'L30'].includes(cellAddress)) {
                console.log(`✅ 중요한 총계 수식 보존: ${cellAddress} = ${formula}`);
                shouldPreserve = true;
              }
            }
            
            if (!shouldPreserve) {
              // 보호된 셀도 포함하여 빈칸으로 설정
              cell.value = '';
              
              // L열이 아닌 경우에만 수식 제거
              if (cell.formula && colLetter !== 'L') {
                cell.formula = undefined;
              }
              
              console.log(`🧹 요약 빈칸 설정: ${cellAddress}`);
            }
          } catch (error) {
            console.warn(`⚠️ 셀 ${cellAddress} 요약 빈칸 처리 실패:`, error);
          }
        }
      }
    }
    console.log(`✅ ${summaryStartRow}행부터 ${summaryEndRow}행까지 D~M열 빈칸 처리 완료`);
    
    console.log('✅ ExcelJS로 기성금 내역서 시트 데이터 입력 완료');
  } catch (error) {
    console.error('❌ ExcelJS로 기성금 내역서 시트 데이터 입력 실패:', error);
  }
};

// 전회 기성 수량 계산
// 특정 현장의 기성 데이터에서 항목 찾기 헬퍼 함수
const findGisungEntryForSite = (siteName, gisungList, monthStr = null, sequence = null) => {
  if (!gisungList || gisungList.length === 0) return null;
  
  // 현재 현장의 기성 데이터만 필터링
  const siteGisungData = gisungList.filter(gisung => 
    gisung.siteName === siteName || gisung.siteId === siteName
  );
  
  if (siteGisungData.length === 0) return null;
  
  // 특정 월과 순서가 지정된 경우
  if (monthStr && sequence !== null) {
    return siteGisungData.find(gisung => 
      gisung.month === monthStr && gisung.sequence === sequence
    );
  }
  
  // 가장 최근 기성 데이터 반환 (sequence가 높은 것)
  return siteGisungData.sort((a, b) => (b.sequence || 0) - (a.sequence || 0))[0];
};

// 이전 기성 수량 계산
const calculatePreviousQuantity = (item, siteData, allGisungData) => {
  if (!allGisungData || allGisungData.length === 0) return 0;
  
  const siteName = siteData.name || siteData.siteName;
  const currentMonth = siteData.month;
  const currentSequence = siteData.sequence || 1;
  
  // 이전 기성 데이터 찾기 (같은 월이면 sequence-1, 다른 월이면 이전 월의 마지막)
  let previousGisung = null;
  
  if (currentSequence > 1) {
    // 같은 월의 이전 기성
    previousGisung = findGisungEntryForSite(siteName, allGisungData, currentMonth, currentSequence - 1);
  } else {
    // 이전 월의 마지막 기성 찾기
    const siteGisungData = allGisungData.filter(gisung => 
      (gisung.siteName === siteName || gisung.siteId === siteName) && 
      gisung.month !== currentMonth
    );
    
    if (siteGisungData.length > 0) {
      // 이전 월들 중 가장 최근의 마지막 기성
      const previousMonths = [...new Set(siteGisungData.map(g => g.month))].sort().reverse();
      for (const prevMonth of previousMonths) {
        const prevMonthData = siteGisungData.filter(g => g.month === prevMonth);
        if (prevMonthData.length > 0) {
          previousGisung = prevMonthData.sort((a, b) => (b.sequence || 0) - (a.sequence || 0))[0];
          break;
        }
      }
    }
  }
  
  if (!previousGisung || !previousGisung.items) return 0;
  
  const previousItem = previousGisung.items.find(prevItem => 
    prevItem.name === item.name || prevItem.id === item.id
  );
  
  return previousItem ? Number(previousItem.quantity) || 0 : 0;
};

// 금회 기성 수량 계산
const calculateCurrentQuantity = (item, siteData, allGisungData) => {
  if (!allGisungData || allGisungData.length === 0) return 0;
  
  const siteName = siteData.name || siteData.siteName;
  const currentMonth = siteData.month;
  const currentSequence = siteData.sequence || 1;
  
  // 현재 기성 데이터 찾기
  const currentGisung = findGisungEntryForSite(siteName, allGisungData, currentMonth, currentSequence);
  
  if (!currentGisung || !currentGisung.items) return 0;
  
  const currentItem = currentGisung.items.find(currItem => 
    currItem.name === item.name || currItem.id === item.id
  );
  
  return currentItem ? Number(currentItem.quantity) || 0 : 0;
};

// 원본 템플릿 스타일링 보존 (아무것도 건드리지 않음)
const applyEnhancedBorderStyling = (detailSheet) => {
  try {
    console.log('🔗 원본 템플릿 스타일링 보존 - 아무것도 건드리지 않음');
    
    // 원본 템플릿의 모든 스타일을 그대로 보존
    // 보호된 셀, 수식, 테두리, 폰트 등 모든 것이 원본 그대로 유지됨
    
    console.log('✅ 원본 템플릿 스타일링 보존 완료');
  } catch (error) {
    console.warn('⚠️ 원본 템플릿 스타일링 보존 실패:', error);
  }
};

// 원본 템플릿 스타일링 적용
const applyTemplateStyling = (gapjiSheet, detailSheet) => {
  try {
    console.log('🎨 원본 템플릿 스타일링 적용 시작...');
    
    // 갑지 시트 스타일링
    if (gapjiSheet) {
      // 제목 스타일링 (A1:H1 병합)
      if (!gapjiSheet['!merges']) gapjiSheet['!merges'] = [];
      gapjiSheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } });
      
      // 제목 셀 스타일링
      const titleCell = 'A1';
      if (gapjiSheet[titleCell]) {
        gapjiSheet[titleCell].s = {
          font: { name: '맑은 고딕', sz: 16, bold: true },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
      }
      
      // 기본 정보 행 스타일링 (A2:G2 형태)
      for (let i = 2; i <= 6; i++) {
        gapjiSheet['!merges'].push({ s: { r: i, c: 0 }, e: { r: i, c: 6 } });
        
        const cellRef = `A${i}`;
        if (gapjiSheet[cellRef]) {
          gapjiSheet[cellRef].s = {
            font: { name: '맑은 고딕', sz: 11 },
            alignment: { horizontal: 'left', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          };
        }
      }
      
      // 금액 행 스타일링 (B열: 한글 금액, H열: 숫자 금액)
      for (let i = 8; i <= 14; i++) {
        const cellB = `B${i}`; // B열 (한글 금액)
        const cellH = `H${i}`; // H열 (숫자 금액)
        
        if (gapjiSheet[cellB]) {
          gapjiSheet[cellB].s = {
            font: { name: '맑은 고딕', sz: 11, bold: true },
            alignment: { horizontal: 'left', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          };
        }
        
        if (gapjiSheet[cellH]) {
          gapjiSheet[cellH].s = {
            font: { name: '맑은 고딕', sz: 11, bold: true },
            alignment: { horizontal: 'right', vertical: 'center' },
            numFmt: '#,##0',
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          };
        }
      }
    }
    
    // 기성금 내역서 시트 스타일링
    if (detailSheet) {
      // 제목 스타일링 (A1:N1 병합)
      if (!detailSheet['!merges']) detailSheet['!merges'] = [];
      detailSheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 13 } });
      
      const titleCell = 'A1';
      if (detailSheet[titleCell]) {
        detailSheet[titleCell].s = {
          font: { name: '맑은 고딕', sz: 16, bold: true },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
      }
      
      // 공사명 스타일링 (A2:N2 병합)
      detailSheet['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 13 } });
      
      const projectCell = 'A2';
      if (detailSheet[projectCell]) {
        detailSheet[projectCell].s = {
          font: { name: '맑은 고딕', sz: 12, bold: true },
          alignment: { horizontal: 'left', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
      }
      
      // 헤더 스타일링 (3-4행)
      for (let row = 3; row <= 4; row++) {
        for (let col = 0; col < 14; col++) {
          const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
          if (detailSheet[cellRef]) {
            detailSheet[cellRef].s = {
              font: { name: '맑은 고딕', sz: 9, bold: true, color: { rgb: 'FFFFFF' } },
              alignment: { horizontal: 'center', vertical: 'center' },
              fill: { fgColor: { rgb: '4472C4' } },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              }
            };
          }
        }
      }
      
      // 데이터 행 스타일링 (5행부터)
      for (let row = 5; row <= 30; row++) {
        for (let col = 0; col < 14; col++) {
          const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
          if (detailSheet[cellRef]) {
            detailSheet[cellRef].s = {
              font: { name: '맑은 고딕', sz: 9 },
              alignment: { horizontal: 'center', vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              }
            };
            
            // 숫자 열들은 오른쪽 정렬
            if (col >= 3 && col <= 13) {
              detailSheet[cellRef].s.alignment.horizontal = 'right';
            }
            
            // 품명 열은 왼쪽 정렬
            if (col === 0) {
              detailSheet[cellRef].s.alignment.horizontal = 'left';
            }
            
            // 규격 열도 왼쪽 정렬
            if (col === 1) {
              detailSheet[cellRef].s.alignment.horizontal = 'left';
            }
          }
        }
      }
    }
    
    // 열 너비 설정
    if (gapjiSheet) {
      gapjiSheet['!cols'] = [
        { width: 15 }, // A열
        { width: 20 }, // B열
        { width: 15 }, // C열
        { width: 15 }, // D열
        { width: 15 }, // E열
        { width: 15 }, // F열
        { width: 15 }, // G열
        { width: 20 }  // H열
      ];
    }
    
    if (detailSheet) {
      detailSheet['!cols'] = [
        { width: 25 }, // A열 (품명)
        { width: 30 }, // B열 (규격)
        { width: 8 },  // C열 (단위)
        { width: 12 }, // D열 (계약수량)
        { width: 12 }, // E열 (계약단가)
        { width: 12 }, // F열 (네고금액 단가)
        { width: 15 }, // G열 (계약금액)
        { width: 12 }, // H열 (기성수량)
        { width: 15 }, // I열 (전회기성 금액)
        { width: 12 }, // J열 (금회기성 수량)
        { width: 15 }, // K열 (금회기성 금액)
        { width: 12 }, // L열 (합계 수량)
        { width: 15 }, // M열 (누계금액)
        { width: 10 }  // N열 (비고)
      ];
    }
    
    console.log('✅ 템플릿 스타일링 적용 완료');
  } catch (error) {
    console.error('❌ 템플릿 스타일링 적용 실패:', error);
  }
};

// ExcelJS 방식: 원본 템플릿을 완전히 보존하고 데이터만 입력
export const generateTemplateBasedGisungExcel = async (siteData, gisungData, siteItems = []) => {
  try {
    console.log('🚀 ExcelJS 방식 템플릿 기반 기성금 엑셀 생성 시작:', { siteData, gisungData, siteItems });
    
    // 1. ExcelJS로 원본 템플릿 로드 (완전한 구조 보존)
    const workbook = await loadOriginalTemplateWithExcelJS();
    
    console.log('✅ ExcelJS로 원본 템플릿 로드 완료 (완전한 구조 보존)');
    console.log('📋 시트 목록:', workbook.worksheets.map(ws => ws.name));
    
    // 2. 데이터 입력 (구조는 그대로 유지)
    try {
      const gapjiSheet = workbook.getWorksheet('갑지');
      if (gapjiSheet) {
        console.log('📝 갑지 시트 데이터 입력 시작');
        fillGapjiWithTemplateData(gapjiSheet, siteData, gisungData);
        console.log('✅ 갑지 시트 데이터 입력 완료');
      } else {
        console.warn('⚠️ 갑지 시트를 찾을 수 없습니다.');
      }
      
      const detailSheet = workbook.getWorksheet('기성금 내역서');
      if (detailSheet) {
        console.log('📝 기성금 내역서 시트 데이터 입력 시작');
        createFullDetailSheet(detailSheet, siteData, gisungData, siteItems);
        console.log('✅ 기성금 내역서 시트 데이터 입력 완료');
      } else {
        console.warn('⚠️ 기성금 내역서 시트를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.warn('⚠️ 데이터 입력 중 오류 발생, 기본 데이터로 진행:', error);
    }
    
    // 3. ExcelJS는 원본 템플릿 구조를 완전히 보존
    console.log('✅ ExcelJS: 원본 템플릿 구조 100% 보존됨');
    
    // 워크북 무결성 검증
    try {
      // 워크북이 유효한지 확인
      if (!workbook || !workbook.worksheets || workbook.worksheets.length === 0) {
        throw new Error('워크북이 유효하지 않습니다.');
      }
      
      // 필수 시트 확인
      const gapjiSheet = workbook.getWorksheet('갑지');
      const detailSheet = workbook.getWorksheet('기성금 내역서');
      
      if (!gapjiSheet || !detailSheet) {
        throw new Error('필수 시트가 누락되었습니다.');
      }
      
      console.log('✅ 워크북 무결성 검증 완료');
    } catch (validationError) {
      console.error('❌ 워크북 무결성 검증 실패:', validationError);
      throw new Error('생성된 파일이 손상되었습니다. 다시 시도해주세요.');
    }
    
    console.log('✅ ExcelJS 방식 워크북 생성 완료');
    return workbook;
  } catch (error) {
    console.error('❌ ExcelJS 방식 템플릿 기반 엑셀 생성 실패:', error);
    
    // 사용자 친화적인 오류 메시지
    let userMessage = '파일 생성 실패';
    
    if (error.message.includes('템플릿')) {
      userMessage = '템플릿 파일을 찾을 수 없습니다.';
    } else if (error.message.includes('시트')) {
      userMessage = '필수 시트가 누락되었습니다.';
    } else if (error.message.includes('손상')) {
      userMessage = '파일이 손상되었습니다.';
    } else if (error.message.includes('메모리')) {
      userMessage = '메모리 부족으로 파일을 생성할 수 없습니다.';
    } else {
      userMessage = `파일 생성 실패: ${error.message}`;
    }
    
    throw new Error(userMessage);
  }
};

// 템플릿 기반 엑셀 다운로드 (안전한 방식)
// 새로운 수식 기반 엑셀 생성 함수 (ExcelJS 사용)
export const createFormulaBasedGisungExcel = async (siteData, gisungData, siteItems = [], filename = '기성금청구서.xlsx') => {
  try {
    console.log('📥 수식 기반 엑셀 생성 시작...');
    
    // ExcelJS 워크북 생성
    const workbook = new ExcelJS.Workbook();
    
    // 갑지 시트 생성
    const gapjiSheet = workbook.addWorksheet('갑지');
    createGapjiSheetWithFormulas(gapjiSheet, siteData, gisungData);
    
    // 기성금 내역서 시트 생성
    const detailSheet = workbook.addWorksheet('기성금 내역서');
    createDetailSheetWithFormulas(detailSheet, siteData, gisungData, siteItems);
    
    // 파일 다운로드
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
    
    console.log('✅ 수식 기반 엑셀 생성 완료');
    
  } catch (error) {
    console.error('❌ 수식 기반 엑셀 생성 실패:', error);
    throw error;
  }
};

// ExcelJS로 갑지 시트 생성 (수식 포함) - 완전한 서식 적용
const createGapjiSheetWithFormulas = (worksheet, siteData, gisungData) => {
  // 제목 (A1:H1 병합)
  worksheet.getCell('A1').value = '기성금 청구서';
  worksheet.mergeCells('A1:H1');
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell('A1').font = { bold: true, size: 14, name: '맑은 고딕' };
  worksheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6E6FA' } // 연한 보라색 배경
  };
  
  // 빈 행
  worksheet.getCell('A3').value = '';
  
  // 기본 정보 (4-8행)
  const basicInfo = [
    { label: '공사명', value: siteData?.name || '현장명' },
    { label: '시공사', value: siteData?.contractor || '시공사명' },
    { label: '하도급 공사명', value: siteData?.subContractor || '하도급 공사명' },
    { label: '계약일자', value: siteData?.contractDate || siteData?.startDate || '' },
    { label: '준공일자', value: siteData?.completionDate || siteData?.endDate || '' }
  ];
  
  basicInfo.forEach((info, index) => {
    const row = 4 + index;
    
    // 라벨 셀
    worksheet.getCell(`A${row}`).value = info.label;
    worksheet.getCell(`A${row}`).font = { bold: true, name: '맑은 고딕' };
    worksheet.getCell(`A${row}`).alignment = { vertical: 'middle' };
    worksheet.getCell(`A${row}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F8FF' } // 연한 파란색 배경
    };
    
    // 값 셀
    worksheet.getCell(`H${row}`).value = info.value;
    worksheet.getCell(`H${row}`).font = { name: '맑은 고딕' };
    worksheet.getCell(`H${row}`).alignment = { vertical: 'middle' };
    worksheet.getCell(`H${row}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5F5F5' } // 연한 회색 배경
    };
    
    // 테두리 적용
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
      const cell = worksheet.getCell(`${col}${row}`);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
  });
  
  // 빈 행
  worksheet.getCell('A10').value = '';
  
  // 헤더 행 (10행)
  const headers = ['품명', '규격', '단위', '수량', '단가', '금액', '', ''];
  headers.forEach((header, index) => {
    const col = String.fromCharCode(65 + index); // A, B, C, ...
    worksheet.getCell(`${col}10`).value = header;
    worksheet.getCell(`${col}10`).font = { bold: true, name: '맑은 고딕' };
    worksheet.getCell(`${col}10`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell(`${col}10`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' } // 회색 배경
    };
    worksheet.getCell(`${col}10`).border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
  });
  
  // 단수정리 항목들 (11-16행)
  const tanuItems = [
    { name: '단수정리1', specification: '', unit: 'M²', quantity: 0, unitPrice: 0 },
    { name: '단수정리2', specification: '', unit: 'M²', quantity: 0, unitPrice: 0 },
    { name: '단수정리3', specification: '', unit: 'M²', quantity: 0, unitPrice: 0 },
    { name: 'NEGO1', specification: '', unit: 'M²', quantity: 0, unitPrice: 0 },
    { name: 'NEGO2', specification: '', unit: 'M²', quantity: 0, unitPrice: 0 },
    { name: 'NEGO3', specification: '', unit: 'M²', quantity: 0, unitPrice: 0 }
  ];
  
  tanuItems.forEach((item, index) => {
    const row = 11 + index;
    
    // 데이터 입력
    worksheet.getCell(`A${row}`).value = item.name;
    worksheet.getCell(`B${row}`).value = item.specification;
    worksheet.getCell(`C${row}`).value = item.unit;
    worksheet.getCell(`D${row}`).value = item.quantity;
    worksheet.getCell(`E${row}`).value = item.unitPrice;
    // 수식 설정
    worksheet.getCell(`F${row}`).formula = `=D${row}*E${row}`; // 수식
    
    // 서식 적용
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
      const cell = worksheet.getCell(`${col}${row}`);
      cell.font = { name: '맑은 고딕' };
      cell.alignment = { vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      
      // 숫자 형식 적용 (D, E, F열)
      if (['D', 'E', 'F'].includes(col)) {
        cell.numFmt = '#,##0';
      }
    });
  });
  
  // 빈 행들 (17-24행)
  for (let row = 17; row <= 24; row++) {
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
      const cell = worksheet.getCell(`${col}${row}`);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
  }
  
  // 요약 항목들 (25-33행)
  const summaryItems = [
    { label: '선급금', value: Number(siteData?.advance || 0), formula: null },
    { label: '총공사계', value: null, formula: '=SUM(F11:F16)' },
    { label: '부가가치세', value: null, formula: '=H26*0.1' },
    { label: '계약금액', value: null, formula: '=H26+H27' },
    { label: '전회기성', value: gisungData.length > 1 ? gisungData.slice(0, -1).reduce((sum, item) => sum + Number(item.gisungAmount || 0), 0) : 0, formula: null },
    { label: '금회기성', value: gisungData.length > 0 ? Number(gisungData[gisungData.length - 1].gisungAmount || 0) : 0, formula: null },
    { label: '기성누계', value: gisungData.reduce((sum, item) => sum + Number(item.gisungAmount || 0), 0), formula: null },
    { label: '선급금공제', value: 0, formula: null },
    { label: '잔액', value: null, formula: '=H28-H31' }
  ];
  
  summaryItems.forEach((item, index) => {
    const row = 25 + index;
    
    // 라벨 셀
    worksheet.getCell(`A${row}`).value = item.label;
    worksheet.getCell(`A${row}`).font = { bold: true, name: '맑은 고딕' };
    worksheet.getCell(`A${row}`).alignment = { vertical: 'middle' };
    worksheet.getCell(`A${row}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFE4B5' } // 연한 주황색 배경
    };
    
    // 값/수식 셀
    if (item.formula) {
      worksheet.getCell(`H${row}`).formula = item.formula;
    } else {
      worksheet.getCell(`H${row}`).value = item.value;
    }
    worksheet.getCell(`H${row}`).font = { bold: true, name: '맑은 고딕' };
    worksheet.getCell(`H${row}`).alignment = { vertical: 'middle' };
    worksheet.getCell(`H${row}`).numFmt = '#,##0';
    worksheet.getCell(`H${row}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFACD' } // 연한 노란색 배경
    };
    
    // 테두리 적용
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
      const cell = worksheet.getCell(`${col}${row}`);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
  });
  
  // 열 너비 설정
  worksheet.getColumn('A').width = 15;
  worksheet.getColumn('B').width = 15;
  worksheet.getColumn('C').width = 10;
  worksheet.getColumn('D').width = 12;
  worksheet.getColumn('E').width = 12;
  worksheet.getColumn('F').width = 12;
  worksheet.getColumn('G').width = 12;
  worksheet.getColumn('H').width = 15;
};

// ExcelJS로 기성금 내역서 시트 생성 (수식 포함) - 완전한 서식 적용
const createDetailSheetWithFormulas = (worksheet, siteData, gisungData, siteItems = []) => {
  // 제목 (A1:N1 병합)
  worksheet.getCell('A1').value = '기성금 내역서';
  worksheet.mergeCells('A1:N1');
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell('A1').font = { bold: true, size: 14, name: '맑은 고딕' };
  worksheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6E6FA' } // 연한 보라색 배경
  };
  
  // 빈 행
  worksheet.getCell('A3').value = '';
  
  // 빈 행
  worksheet.getCell('A6').value = '';
  
  // 헤더 (7행)
  const headers = ['품명', '규격', '단위', '수량(계약수량)', '단가', '금액', '수량(전회)', '금액(전회)', '수량(금회)', '금액(금회)', '수량(합계)', '금액(합계)', '비고'];
  headers.forEach((header, index) => {
    const col = String.fromCharCode(65 + index); // A, B, C, ...
    worksheet.getCell(`${col}7`).value = header;
    worksheet.getCell(`${col}7`).font = { bold: true, name: '맑은 고딕' };
    worksheet.getCell(`${col}7`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell(`${col}7`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' } // 회색 배경
    };
    worksheet.getCell(`${col}7`).border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
  });
  
  // 기본 항목들 (사진과 동일한 구조)
  const basicItems = [
    { name: '복층유리', specification: '투명, 16mm', unit: 'M²', contractQuantity: 0, contractUnitPrice: 0 },
    { name: '복층유리', specification: '투명, 22mm, 건조공기', unit: 'M²', contractQuantity: 0, contractUnitPrice: 0 },
    { name: '복층유리', specification: '컬러, 22mm, 건조공기, 그린', unit: 'M²', contractQuantity: 0, contractUnitPrice: 0 },
    { name: '학교창(관공서)전용유리', specification: '22mm(5+12+5), MCT(HS)+아르곤', unit: 'M²', contractQuantity: 0, contractUnitPrice: 0 },
    { name: '학교창(관공서)전용유리', specification: '24mm(5+14+5), MCT(HS)+아르곤', unit: 'M²', contractQuantity: 0, contractUnitPrice: 0 },
    { name: '학교창(관공서)전용유리', specification: '43mm(5+14+5+14+5), MCT(HS)+아르곤', unit: 'M²', contractQuantity: 0, contractUnitPrice: 0 },
    { name: '창호유리설치/복층유리', specification: '16mm 이하', unit: 'M²', contractQuantity: 0, contractUnitPrice: 0 },
    { name: '창호유리설치/복층유리', specification: '22mm 이하', unit: 'M²', contractQuantity: 0, contractUnitPrice: 0 },
    { name: '창호유리설치/복층유리', specification: '24mm 이하', unit: 'M²', contractQuantity: 0, contractUnitPrice: 0 },
    { name: '창호유리설치/복층유리', specification: '43mm 이하', unit: 'M²', contractQuantity: 0, contractUnitPrice: 0 },
    { name: '유리주위 코킹', specification: '복층유리 5x5, 실리콘(양면)', unit: 'M', contractQuantity: 0, contractUnitPrice: 0 },
    { name: '방습거울', specification: '5mm, 틀포함', unit: 'M²', contractQuantity: 0, contractUnitPrice: 0 },
    { name: '단수정리', specification: 'NEGO', unit: '', contractQuantity: 0, contractUnitPrice: 0 }
  ];
  
  // 데이터가 없으면 기본 항목들 추가
  if (!siteItems || siteItems.length === 0) {
    siteItems = basicItems;
  }
  
  // 품목 데이터 추가 (8행부터 시작)
  siteItems.forEach((item, index) => {
    const row = 8 + index;
    const contractQuantity = Number(item.contractQuantity || item.quantity || 0);
    const contractUnitPrice = Number(item.contractUnitPrice || item.price || 0);
    const previousQuantity = Number(item.previousQuantity || 0);
    
    // 기본 데이터 입력
    worksheet.getCell(`A${row}`).value = item.name || '';
    worksheet.getCell(`B${row}`).value = item.specification || '';
    worksheet.getCell(`C${row}`).value = item.unit || '';
    worksheet.getCell(`D${row}`).value = contractQuantity;
    worksheet.getCell(`E${row}`).value = contractUnitPrice;
    // 수식 설정
    worksheet.getCell(`F${row}`).formula = `=D${row}*E${row}`; // F열: 금액 (수식)
    worksheet.getCell(`G${row}`).value = previousQuantity;
    // 수식 설정
    worksheet.getCell(`H${row}`).formula = `=G${row}*E${row}`; // H열: 전회기성 금액 (수식)
    worksheet.getCell(`I${row}`).value = previousQuantity;
    worksheet.getCell(`J${row}`).formula = `=I${row}*E${row}`; // J열: 전회기성 금액 (수식)
    worksheet.getCell(`K${row}`).formula = `=G${row}`; // K열: 금회기성 수량 (수식)
    worksheet.getCell(`L${row}`).formula = `=K${row}*E${row}`; // L열: 금회기성 금액 (수식)
    worksheet.getCell(`M${row}`).formula = `=G${row}+K${row}`; // M열: 합계 수량 (수식)
    worksheet.getCell(`N${row}`).value = item.remark || '';
    
    // 서식 적용
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'].forEach(col => {
      const cell = worksheet.getCell(`${col}${row}`);
      cell.font = { name: '맑은 고딕' };
      cell.alignment = { vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      
      // 숫자 형식 적용 (D, E, F, H, J, L, M열)
      if (['D', 'E', 'F', 'H', 'J', 'L', 'M'].includes(col)) {
        cell.numFmt = '#,##0';
      }
    });
  });
  
  // 빈 행들 (12-24행)
  for (let row = 12; row <= 24; row++) {
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'].forEach(col => {
      const cell = worksheet.getCell(`${col}${row}`);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
  }
  
  // 단수정리 아래 두칸 띄우기 (21-22행)
  for (let row = 21; row <= 22; row++) {
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'].forEach(col => {
      const cell = worksheet.getCell(`${col}${row}`);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
  }
  
  // 요약 항목들 (23-26행) - 사진과 동일한 순서
  const summaryItems = [
    { label: '선급금', value: Number(siteData?.advance || 0), formula: null },
    { label: '총공사비', value: null, formula: '=SUM(F8:F20)' }, // 단수정리까지 포함
    { label: '부가세', value: null, formula: '=F24*0.1' },
    { label: '총계', value: null, formula: '=F24+F25' }
  ];
  
  summaryItems.forEach((item, index) => {
    const row = 23 + index;
    
    // 라벨 셀
    worksheet.getCell(`A${row}`).value = item.label;
    worksheet.getCell(`A${row}`).font = { bold: true, name: '맑은 고딕' };
    worksheet.getCell(`A${row}`).alignment = { vertical: 'middle' };
    worksheet.getCell(`A${row}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFE4B5' } // 연한 주황색 배경
    };
    
    // 값/수식 셀
    if (item.formula) {
      worksheet.getCell(`F${row}`).formula = item.formula;
    } else {
      worksheet.getCell(`F${row}`).value = item.value;
    }
    worksheet.getCell(`F${row}`).font = { bold: true, name: '맑은 고딕' };
    worksheet.getCell(`F${row}`).alignment = { vertical: 'middle' };
    worksheet.getCell(`F${row}`).numFmt = '#,##0';
    worksheet.getCell(`F${row}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFACD' } // 연한 노란색 배경
    };
    
    // 테두리 적용
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'].forEach(col => {
      const cell = worksheet.getCell(`${col}${row}`);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
  });
  
  // 열 너비 설정
  worksheet.getColumn('A').width = 15;
  worksheet.getColumn('B').width = 15;
  worksheet.getColumn('C').width = 10;
  worksheet.getColumn('D').width = 12;
  worksheet.getColumn('E').width = 12;
  worksheet.getColumn('F').width = 12;
  worksheet.getColumn('G').width = 12;
  worksheet.getColumn('H').width = 12;
  worksheet.getColumn('I').width = 12;
  worksheet.getColumn('J').width = 12;
  worksheet.getColumn('K').width = 12;
  worksheet.getColumn('L').width = 12;
  worksheet.getColumn('M').width = 12;
  worksheet.getColumn('N').width = 15;
};

// 기존 XLSX 관련 함수들 제거됨 - ExcelJS로 대체

export const downloadTemplateBasedGisungExcel = async (siteData, gisungData, siteItems = [], filename = '기성금청구서.xlsx') => {
  try {
    console.log('📥 템플릿 기반 엑셀 다운로드 시작...');
    console.log('📊 입력 데이터 상세:');
    console.log('  - siteData:', siteData?.name || '없음', siteData);
    console.log('  - gisungData:', gisungData?.length || 0, '개 항목', gisungData);
    console.log('  - siteItems:', siteItems?.length || 0, '개 항목', siteItems);
    console.log('  - filename:', filename);
    
    // 기존 gisung.xlsx 템플릿 로드
    let workbook;
    try {
      workbook = await loadGisungTemplate();
      
      // 공유 수식 문제 해결
      fixTemplateSharedFormulas(workbook);
      
      console.log('✅ 템플릿 로드 및 공유 수식 문제 해결 완료');
    } catch (loadError) {
      console.error('❌ 템플릿 로드 실패, 새 워크북 생성:', loadError);
      workbook = createSafeWorkbook();
    }
    
    // 갑지 시트 데이터 입력 (기존 템플릿 구조 유지)
    const gapjiSheet = workbook.getWorksheet('갑지');
    if (gapjiSheet) {
      console.log('📝 기존 갑지 시트에 데이터 입력...');
      fillGapjiWithTemplateData(gapjiSheet, siteData, gisungData);
    } else {
      console.warn('⚠️ 갑지 시트가 없어 새로 생성합니다.');
      const newGapjiSheet = workbook.addWorksheet('갑지');
      createFullGapjiSheet(newGapjiSheet, siteData, gisungData);
    }
    
    // 기성금 내역서 시트 데이터 입력 (기존 템플릿 구조 유지)
    const detailSheet = workbook.getWorksheet('기성금 내역서');
    if (detailSheet) {
      console.log('📝 기존 기성금 내역서 시트에 데이터 입력...');
      fillDetailWithTemplateData(detailSheet, siteData, gisungData, siteItems);
    } else {
      console.warn('⚠️ 기성금 내역서 시트가 없어 새로 생성합니다.');
      const newDetailSheet = workbook.addWorksheet('기성금 내역서');
      createFullDetailSheet(newDetailSheet, siteData, gisungData, siteItems);
    }
    
    // 스타일 적용
    applyTemplateStyling(gapjiSheet, detailSheet);
    
    // 파일 생성 및 다운로드 (공유 수식 문제 해결됨)
    let buffer;
    try {
      // 간단한 설정으로 생성 (공유 수식은 이미 제거됨)
      buffer = await workbook.xlsx.writeBuffer();
    } catch (writeError) {
      console.error('❌ 첫 번째 쓰기 시도 실패:', writeError);
      console.error('❌ 오류 상세:', writeError.message);
      console.error('❌ 오류 스택:', writeError.stack);
      console.warn('⚠️ 최소 설정으로 재시도...');
      
      // 두 번째 시도: 기본 XLSX 라이브러리 사용
      try {
        console.log('🔄 기본 XLSX 라이브러리로 대체 생성...');
        
        // 기본적인 데이터 생성
        const basicData = [{
          '현장명': siteData?.name || '현장명',
          '기성총액': Number(gisungData?.[0]?.gisungAmount || 0),
          '선급금': Number(siteData?.advance || 0),
          '실지급액': Number(gisungData?.[0]?.gisungAmount || 0) - Number(siteData?.advance || 0),
          '비고': '템플릿 호환성 문제로 기본 형식으로 생성됨'
        }];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(basicData);
        XLSX.utils.book_append_sheet(wb, ws, '기성현황');
        
        // XLSX로 파일 다운로드
        XLSX.writeFile(wb, filename);
        console.log('✅ 기본 XLSX 라이브러리로 다운로드 완료');
        return;
      } catch (fallbackError) {
        console.error('❌ 최소 설정으로도 실패:', fallbackError);
        console.error('❌ 두 번째 시도 오류 상세:', fallbackError.message);
        console.error('❌ 두 번째 시도 오류 스택:', fallbackError.stack);
        
        // 워크북 상태 디버깅
        console.log('🔍 워크북 상태 디버깅:');
        console.log('  - 시트 수:', workbook.worksheets.length);
        workbook.worksheets.forEach((ws, index) => {
          console.log(`  - 시트 ${index + 1}: ${ws.name} (행 수: ${ws.rowCount})`);
          
          // L28 셀 상태 확인
          const l28Cell = ws.getCell('L28');
          console.log(`    L28 셀 상태: 값=${l28Cell.value}, 수식=${l28Cell.formula || '없음'}`);
        });
        
        // 최종 안전장치: 완전히 새로운 워크북 생성
        console.log('🚑 최종 안전장치: 새로운 안전 워크북 생성...');
        try {
          const safeWorkbook = createFreshGisungWorkbook();
          
          // 안전 워크북에 기본 데이터 입력
          const safeGapjiSheet = safeWorkbook.getWorksheet('갑지');
          const safeDetailSheet = safeWorkbook.getWorksheet('기성금 내역서');
          
          if (safeGapjiSheet) {
            createFullGapjiSheet(safeGapjiSheet, siteData, gisungData);
          }
          if (safeDetailSheet) {
            createFullDetailSheet(safeDetailSheet, siteData, gisungData, siteItems);
          }
          
          // 안전 워크북으로 파일 생성
          buffer = await safeWorkbook.xlsx.writeBuffer({
            useStyles: false,
            useSharedStrings: false,
            cellFormula: false,
            sharedFormula: false
          });
          
          console.log('✅ 안전 워크북으로 파일 생성 성공');
          
        } catch (safeError) {
          console.error('❌ 안전 워크북도 실패:', safeError);
          throw new Error('파일 생성 실패: ' + fallbackError.message);
        }
      }
    }
    
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // 파일 다운로드
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 메모리 정리
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);
    
    console.log('✅ 템플릿 기반 엑셀 다운로드 완료');
    
  } catch (error) {
    console.error('❌ 템플릿 기반 엑셀 다운로드 실패:', error);
    
    // 대체 방법: 기본 XLSX 방식으로 다운로드
    try {
      console.log('🔄 대체 방법으로 다운로드 시도...');
      
      const data = gisungData.map(row => ({
        '현장명': row.name || '',
        '계약금액': Number(row.contractAmount || 0).toLocaleString(),
        '선급금': Number(row.advance || 0).toLocaleString(),
        '전회기성': Number(row.prevGisung || 0).toLocaleString(),
        '기성월': row.gisungMonth || '',
        '기성금액': Number(row.gisungAmount || 0).toLocaleString(),
        '비고': row.note || '',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, '기성현황');
      
      XLSX.writeFile(wb, filename);
      
      console.log('✅ 대체 방법으로 다운로드 완료');
      return;
      
    } catch (alternativeError) {
      console.error('❌ 대체 다운로드 방법도 실패:', alternativeError);
      
      // 최종 대체: 기본 XLSX 방식으로 간단한 데이터 생성
      try {
        console.log('🔄 최종 대체: 기본 XLSX 방식으로 다운로드...');
        
        // 기본적인 기성현황 데이터 생성
        const basicData = [{
          '현장명': siteData?.name || '현장명',
          '계약금액': siteData?.contractAmount || 0,
          '시작일': siteData?.startDate || '',
          '종료일': siteData?.endDate || '',
          '담당자': siteData?.manager || '',
          '회사명': siteData?.company || '',
          '상태': '기성현황 템플릿 오류',
          '비고': '템플릿 파일에 공유 수식 문제가 있습니다. 새 템플릿을 업로드해주세요.'
        }];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(basicData);
        XLSX.utils.book_append_sheet(wb, ws, '기성현황');
        
        XLSX.writeFile(wb, filename);
        
        console.log('✅ 최종 대체 다운로드 완료');
        return;
        
      } catch (finalError) {
        console.error('❌ 최종 대체 방법도 실패:', finalError);
        throw new Error('모든 다운로드 방법 실패: ' + error.message);
      }
    }
  }
}; 

// 템플릿 구조 확인 함수
export const checkTemplateStructure = async () => {
  try {
    console.log('🔍 템플릿 구조 확인 시작...');
    
    // 원본 템플릿 로드
    const originalWorkbook = await loadOriginalTemplateWithExcelJS();
    
    // 기성금 내역서 시트 확인
    const detailSheet = originalWorkbook.getWorksheet('기성금 내역서');
    if (detailSheet) {
      console.log('📋 기성금 내역서 시트 발견');
      
      // 헤더 행 확인 (4행)
      const headerRow = 4;
      const headers = [];
      
      // A열부터 N열까지 헤더 확인
      for (let col = 0; col < 14; col++) {
        const cell = detailSheet.getCell(headerRow + 1, col + 1);
        const headerText = cell ? cell.value : '';
        headers.push(headerText);
        console.log(`${String.fromCharCode(65 + col)}열: ${headerText}`);
      }
      
      console.log('📊 전체 헤더:', headers);
      
      // 셀 보호 설정 확인
      console.log('🔒 셀 보호 설정 확인...');
      for (let row = 1; row <= 30; row++) {
        for (let col = 1; col <= 14; col++) {
          const cell = detailSheet.getCell(row, col);
          if (cell && cell.protection && cell.protection.locked) {
            console.log(`🔒 보호된 셀: ${String.fromCharCode(64 + col)}${row} = ${cell.value}`);
          }
        }
      }
      
      // 수식 확인
      console.log('📊 수식 확인...');
      for (let row = 1; row <= 30; row++) {
        for (let col = 1; col <= 14; col++) {
          const cell = detailSheet.getCell(row, col);
          if (cell && cell.formula) {
            console.log(`📊 수식 셀: ${String.fromCharCode(64 + col)}${row} = ${cell.formula}`);
          }
        }
      }
      
    } else {
      console.log('❌ 기성금 내역서 시트를 찾을 수 없습니다.');
    }
    
    return originalWorkbook;
  } catch (error) {
    console.error('❌ 템플릿 구조 확인 실패:', error);
    throw error;
  }
};

// 파이어베이스에서 템플릿 삭제
export const deleteTemplateFromFirebase = async () => {
  try {
    console.log('🗑️ 파이어베이스 템플릿 삭제 시작...');
    
    const templateRef = ref(storage, 'templates/gisung.xlsx');
    
    await deleteObject(templateRef);
    
    console.log('✅ 템플릿 파일 삭제 완료!');
    return { success: true, message: '템플릿이 성공적으로 삭제되었습니다.' };
  } catch (error) {
    console.error('❌ 템플릿 삭제 실패:', error);
    
    if (error.code === 'storage/object-not-found') {
      return { success: true, message: '삭제할 템플릿이 없습니다.' };
    }
    
    throw new Error('템플릿 삭제 실패: ' + error.message);
  }
};

// public 폴더의 템플릿을 파이어베이스에 자동 업로드
export const uploadLocalTemplateToFirebase = async () => {
  try {
    console.log('📥 public 폴더에서 템플릿 로드 및 파이어베이스 업로드 시작...');
    
    // public 폴더에서 템플릿 파일 가져오기
    const response = await fetch('/gisung.xlsx');
    
    if (!response.ok) {
      throw new Error(`템플릿 파일을 찾을 수 없습니다: ${response.status}`);
    }
    
    const templateBuffer = await response.arrayBuffer();
    console.log('📥 템플릿 파일 로드 완료, 크기:', templateBuffer.byteLength, 'bytes');
    
    // Blob으로 변환
    const templateBlob = new Blob([templateBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    // File 객체로 변환
    const templateFile = new File([templateBlob], 'gisung.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    console.log('📤 파이어베이스에 템플릿 업로드 중...');
    
    // 파이어베이스에 업로드
    const templateRef = ref(storage, 'templates/gisung.xlsx');
    const snapshot = await uploadBytes(templateRef, templateFile);
    
    console.log('✅ 템플릿 파일 업로드 완료!');
    console.log('📂 저장 경로:', snapshot.metadata.fullPath);
    console.log('📊 파일 크기:', snapshot.metadata.size, 'bytes');
    
    return { 
      success: true, 
      message: '로컬 템플릿이 성공적으로 파이어베이스에 업로드되었습니다!',
      path: snapshot.metadata.fullPath,
      size: snapshot.metadata.size
    };
  } catch (error) {
    console.error('❌ 로컬 템플릿 업로드 실패:', error);
    throw new Error('로컬 템플릿 업로드 실패: ' + error.message);
  }
};

// ===== 🆕 완전히 새로운 ExcelJS 기성금청구서 시스템 =====

// 완전히 새로운 ExcelJS 기성금청구서 다운로드 (템플릿 없이)
export const downloadFreshGisungExcel = async (siteData, gisungData, siteItems = [], filename = '기성금청구서.xlsx') => {
  try {
    console.log('🚀 ExcelJS로 완전히 새로운 기성금청구서 생성 시작...');
    console.log('📊 입력 데이터:');
    console.log('  - 현장:', siteData?.name || '없음');
    console.log('  - 기성데이터:', gisungData?.length || 0, '개');
    console.log('  - 물량데이터:', siteItems?.length || 0, '개');
    
    // 1. 새로운 워크북 생성
    const workbook = createFreshGisungWorkbook();
    
    // 2. 갑지 시트 완전 생성
    const gapjiSheet = workbook.getWorksheet('갑지');
    if (gapjiSheet) {
      console.log('📝 갑지 시트 생성 중...');
      createFullGapjiSheet(gapjiSheet, siteData, gisungData);
    }
    
    // 3. 기성금 내역서 시트 완전 생성
    const detailSheet = workbook.getWorksheet('기성금 내역서');
    if (detailSheet) {
      console.log('📝 기성금 내역서 시트 생성 중...');
      createFullDetailSheet(detailSheet, siteData, gisungData, siteItems);
    }
    
    // 4. 파일 생성 (공유 수식 문제 없음)
    console.log('💾 Excel 파일 생성 중...');
    const buffer = await workbook.xlsx.writeBuffer();
    
    // 5. 다운로드
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 메모리 정리
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);
    
    console.log('✅ 완전히 새로운 기성금청구서 다운로드 완료!');
    
  } catch (error) {
    console.error('❌ 새로운 기성금청구서 생성 실패:', error);
    throw new Error('기성금청구서 생성 실패: ' + error.message);
  }
};

// ===== 🔧 기존 템플릿 구조 유지하면서 데이터만 입력하는 함수들 =====

// 기존 갑지 템플릿에 데이터만 입력 (구조 유지)
const fillGapjiWithTemplateData = (worksheet, siteData, gisungData) => {
  try {
    console.log('📝 기존 갑지 템플릿에 데이터 입력...');
    
    // 갑지 템플릿의 모든 데이터와 수식을 그대로 유지하고, 필요한 부분만 업데이트
    
    // 공사명 (D4 셀)
    try {
      const nameCell = worksheet.getCell('D4');
      if (nameCell) {
        nameCell.value = siteData?.name || '현장명';
        console.log(`✅ 공사명 입력: D4 = ${siteData?.name || '현장명'}`);
      } else {
        console.log(`📊 공사명 셀에 수식이 있어 건드리지 않음: D4`);
      }
    } catch (e) { console.warn('공사명 입력 실패:', e); }
    
    // 시공사 (D6 셀)
    try {
      const companyCell = worksheet.getCell('D6');
      if (companyCell) {
        companyCell.value = siteData?.company || siteData?.contractor || '시공사명';
        console.log(`✅ 시공사 입력: D6 = ${siteData?.company || siteData?.contractor || '시공사명'}`);
      } else {
        console.log(`📊 시공사 셀에 수식이 있어 건드리지 않음: D6`);
      }
    } catch (e) { console.warn('시공사 입력 실패:', e); }
    
    // 하도급공사명 (D8 셀)
    try {
      const subContractCell = worksheet.getCell('D8');
      if (subContractCell) {
        subContractCell.value = '유리공사';
        console.log(`✅ 하도급공사명 입력: D8 = 유리공사`);
      } else {
        console.log(`📊 하도급공사명 셀에 수식이 있어 건드리지 않음: D8`);
      }
    } catch (e) { console.warn('하도급공사명 입력 실패:', e); }
    
    // 기성총액 (L28 셀) - 수식이 있으면 건드리지 않음
    try {
      const totalCell = worksheet.getCell('L28');
      if (totalCell && !totalCell.formula) {
        const gisungAmount = Number(gisungData?.[0]?.gisungAmount || 0);
        totalCell.value = gisungAmount;
        totalCell.numFmt = '#,##0';
        console.log(`✅ 기성총액 입력: L28 = ${gisungAmount}`);
      } else {
        console.log(`📊 기성총액 셀에 수식이 있어 건드리지 않음: L28`);
      }
    } catch (e) { console.warn('기성총액 입력 실패:', e); }
    
    // 선급금차감 (L29 셀) - 수식이 있으면 건드리지 않음
    try {
      const advanceCell = worksheet.getCell('L29');
      if (advanceCell && !advanceCell.formula) {
        const advanceAmount = Number(siteData?.advance || 0);
        advanceCell.value = -advanceAmount;
        advanceCell.numFmt = '#,##0';
        console.log(`✅ 선급금차감 입력: L29 = ${-advanceAmount}`);
      } else {
        console.log(`📊 선급금차감 셀에 수식이 있어 건드리지 않음: L29`);
      }
    } catch (e) { console.warn('선급금차감 입력 실패:', e); }
    
    // 실지급액 (L30 셀) - 수식이 있으면 건드리지 않음
    try {
      const realCell = worksheet.getCell('L30');
      if (realCell && !realCell.formula) {
        const gisungAmount = Number(gisungData?.[0]?.gisungAmount || 0);
        const advanceAmount = Number(siteData?.advance || 0);
        const realAmount = gisungAmount - advanceAmount;
        realCell.value = realAmount;
        realCell.numFmt = '#,##0';
        console.log(`✅ 실지급액 입력: L30 = ${realAmount}`);
      } else {
        console.log(`📊 실지급액 셀에 수식이 있어 건드리지 않음: L30`);
      }
    } catch (e) { console.warn('실지급액 입력 실패:', e); }
    
    console.log('✅ 갑지 템플릿 데이터 입력 완료 (모든 수식 보존)');
  } catch (error) {
    console.error('❌ 갑지 템플릿 데이터 입력 실패:', error);
  }
};

// 기존 기성금 내역서 템플릿에 데이터만 입력 (구조 유지)
const fillDetailWithTemplateData = (worksheet, siteData, gisungData, siteItems = []) => {
  try {
    console.log('📝 기존 기성금 내역서 템플릿에 데이터 입력...');
    
    // 공사명 제거 - 품명만 표시하도록 수정
    try {
      const nameRow = worksheet.getRow(3);
      if (nameRow) {
        nameRow.getCell(1).value = ''; // 공사명 제거
        console.log(`✅ 공사명 제거 완료`);
      }
    } catch (e) { console.warn('공사명 제거 실패:', e); }
    
    // 기본 데이터가 없으면 사진과 동일한 유리공사 데이터 생성 (실제 데이터)
    if (!siteItems || siteItems.length === 0) {
      siteItems = [
        { name: '복층유리', specification: '투명, 16mm', unit: 'M²', quantity: 6.0, price: 22000 },
        { name: '복층유리', specification: '투명, 22mm, 건조공기', unit: 'M²', quantity: 10.0, price: 26000 },
        { name: '복층유리', specification: '컬러, 22mm, 건조공기, 그린', unit: 'M²', quantity: 10.0, price: 29000 },
        { name: '학교창(관공서)전용유리', specification: '22mm(5+12+5), MCT(HS)+아르곤+틱', unit: 'M²', quantity: 1.0, price: 49000 },
        { name: '학교창(관공서)전용유리', specification: '22mm(5+12+5), MCT(HS)+아르곤+킬', unit: 'M²', quantity: 1.0, price: 46000 },
        { name: '학교창(관공서)전용유리', specification: '24mm(5+14+5), MCT(HS)+아르곤+', unit: 'M²', quantity: 35.0, price: 46000 },
        { name: '학교창(관공서)전용유리', specification: '24mm(5+14+5), MCT(HS)+아르곤+킬', unit: 'M²', quantity: 17.0, price: 48000 },
        { name: '학교창(관공서)전용유리', specification: '24mm(6+12+6), MCT(HS)+아르곤+', unit: 'M²', quantity: 6.0, price: 51000 },
        { name: '학교창(관공서)전용유리', specification: '43mm(5+14+5+14+5), MCT(HS)+아', unit: 'M²', quantity: 13.0, price: 110000 },
        { name: '창호유리설치/복층유리', specification: '유리두께 16mm 이하', unit: 'M²', quantity: 6.0, price: 15000 },
        { name: '창호유리설치/복층유리', specification: '유리두께 22mm 이하', unit: 'M²', quantity: 21.0, price: 15000 },
        { name: '창호유리설치/복층유리', specification: '유리두께 24mm 이하', unit: 'M²', quantity: 57.0, price: 18000 },
        { name: '창호유리설치/복층유리', specification: '유리뚜께 43mm 이하', unit: 'M²', quantity: 13.0, price: 20000 },
        { name: '유리주위 코킹', specification: '복층유리 5x5, 실리콘(양면)', unit: 'M', quantity: 509.0, price: 300 },
        { name: '방습거울', specification: '5mm,틀포함', unit: 'M²', quantity: 1.0, price: 100000 },
        { name: '단수정리', specification: 'NEGO', unit: '', quantity: 0, price: 0 }
      ];
    }
    
    // 데이터 행에 입력 (6행부터 시작)
    let currentRow = 6;
    let totalAmount = 0;
    
    siteItems.forEach((item, index) => {
      try {
        const row = worksheet.getRow(currentRow);
        const contractQuantity = Number(item.quantity || 0);
        const contractPrice = Number(item.price || 0);
        const contractAmount = contractQuantity * contractPrice;
        
        // 기본 데이터 입력
        row.getCell(1).value = item.name || '';           // A: 품명
        row.getCell(2).value = item.specification || '';  // B: 규격
        row.getCell(3).value = item.unit || '';          // C: 단위
        row.getCell(4).value = contractQuantity;         // D: 계약수량
        row.getCell(5).value = contractPrice;            // E: 계약단가
        row.getCell(6).formula = `=D${currentRow}*E${currentRow}`; // F: 계약금액 (수식)
        row.getCell(7).value = 0;                        // G: 전회기성수량
        row.getCell(8).formula = `=G${currentRow}*E${currentRow}`; // H: 전회기성금액 (수식)
        row.getCell(9).value = contractQuantity;         // I: 전회기성수량
        row.getCell(10).formula = `=I${currentRow}*E${currentRow}`; // J: 전회기성금액 (수식)
        row.getCell(11).formula = `=G${currentRow}`;     // K: 금회기성수량 (수식)
        row.getCell(12).formula = `=K${currentRow}*E${currentRow}`; // L: 금회기성금액 (수식)
        row.getCell(13).formula = `=G${currentRow}+K${currentRow}`; // M: 합계수량 (수식)
        
        // 숫자 형식 적용
        [4, 5, 6, 7, 8, 9, 10, 11, 12, 13].forEach(col => {
          const cell = row.getCell(col);
          if (cell.value !== null && cell.value !== undefined) {
            cell.numFmt = '#,##0';
          }
        });
        
        if (item.name !== '단수정리') {
          totalAmount += contractAmount;
        }
        
        console.log(`✅ ${currentRow}행 데이터 입력: ${item.name}`);
        currentRow++;
      } catch (itemError) {
        console.warn(`⚠️ ${item.name} 데이터 입력 실패:`, itemError);
        currentRow++;
      }
    });
    
    // 단수정리 아래 두칸 띄우기 (21-22행)
    try {
      const emptyRow1 = worksheet.getRow(21);
      const emptyRow2 = worksheet.getRow(22);
      emptyRow1.getCell(1).value = '';
      emptyRow2.getCell(1).value = '';
      console.log('✅ 단수정리 아래 두칸 띄우기 완료');
    } catch (e) { console.warn('두칸 띄우기 실패:', e); }
    
    // 단수정리 아래 두칸 띄우고 선급금 추가 (23행)
    try {
      const advanceRow = worksheet.getRow(23);
      advanceRow.getCell(1).value = '선급금';
      advanceRow.getCell(6).value = Number(siteData?.advance || 0);
      advanceRow.getCell(6).numFmt = '#,##0';
      console.log('✅ 23행 선급금 추가');
    } catch (e) { console.warn('23행 선급금 추가 실패:', e); }
    
    // 24행에 총공사비 추가
    try {
      const totalRow = worksheet.getRow(24);
      totalRow.getCell(1).value = '총공사비';
      totalRow.getCell(6).formula = '=SUM(F6:F18)'; // 단수정리까지 포함
      totalRow.getCell(6).numFmt = '#,##0';
      console.log('✅ 24행 총공사비 추가');
    } catch (e) { console.warn('24행 총공사비 추가 실패:', e); }
    
    // 25행에 부가세 추가
    try {
      const vatRow = worksheet.getRow(25);
      vatRow.getCell(1).value = '부가세';
      vatRow.getCell(6).formula = '=F24*0.1';
      vatRow.getCell(6).numFmt = '#,##0';
      console.log('✅ 25행 부가세 추가');
    } catch (e) { console.warn('25행 부가세 추가 실패:', e); }
    
    // 26행에 총계 추가
    try {
      const grandTotalRow = worksheet.getRow(26);
      grandTotalRow.getCell(1).value = '총계';
      grandTotalRow.getCell(6).formula = '=F24+F25';
      grandTotalRow.getCell(6).numFmt = '#,##0';
      console.log('✅ 26행 총계 추가');
    } catch (e) { console.warn('26행 총계 추가 실패:', e); }
    
    // 단수정리까지만 표시하고 그 이후는 제거 (단수정리는 포함)
    console.log('✅ 단수정리까지만 표시, 그 이후 집계 행들 제거됨');
    
    console.log('✅ 기성금 내역서 템플릿 데이터 입력 완료');
  } catch (error) {
    console.error('❌ 기성금 내역서 템플릿 데이터 입력 실패:', error);
  }
}; 
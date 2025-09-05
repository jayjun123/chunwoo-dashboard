// NAPFOOM 납품계약서 생성 유틸리티 (ExcelJS 사용)
import ExcelJS from 'exceljs';
import { templateUrls } from './templateUrls';
import { getSafePrice, setCellValueSafely, filterMaterialItems, logMaterialItem, cleanSheetData, fillContractStyleData, cleanEmptyRows } from './excelCommonUtils';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * NAPFOOM 템플릿을 사용하여 납품계약서 생성 (ExcelJS)
 * @param {Object} siteData - 현장 정보
 * @param {Array} materialItems - 물량 내역
 * @param {string} fileName - 파일명
 * @returns {Promise<Object>} - 생성 결과
 */
export const createNapfoomContract = async (siteData, materialItems = [], fileName = '납품계약서') => {
  try {
    console.log('📋 NAPFOOM 납품계약서 생성 시작...', { siteData, materialItems });
    
        // Firebase Storage에서 템플릿 다운로드 (물량 타입에 따라 다른 템플릿 사용)
    // 물량 개수에 따른 템플릿 타입 자동 결정
    const itemCount = materialItems?.length || 0;
    
    // siteData.templateType이 'AUTO'인 경우 물량 개수로 결정, 그렇지 않으면 기존 값 사용
    let templateType;
    if (siteData.templateType === 'AUTO') {
      templateType = itemCount > 20 ? 'L' : 'N';
      console.log(`🔄 AUTO 모드: 물량 ${itemCount}개 → ${templateType} 타입 선택`);
    } else {
      templateType = siteData.templateType || 'N';
      console.log(`📋 수동 설정: ${templateType} 타입 사용`);
    }
    
    const templateKey = `(${templateType})납품계약서`;
    const templateUrl = templateUrls[templateKey];
    
    if (!templateUrl) {
      throw new Error(`템플릿 URL을 찾을 수 없습니다: ${templateKey}`);
    }
    
    console.log(`📊 물량 개수: ${itemCount}개 → ${templateType} 타입 템플릿 사용`);
    console.log(`📋 NAPFOOM 납품계약서 템플릿 선택: ${templateType} 타입 (${templateType === 'L' ? 'LONG' : 'NEW'})`);
    console.log(`🔗 실제 요청할 URL: ${templateUrl}`);
    
    const response = await fetch(templateUrl);
    const arrayBuffer = await response.arrayBuffer();
    
    // 템플릿 로드 (공유셀 완전 무시 - 수식까지 무시하고 로드)
    const workbook = new ExcelJS.Workbook();
    try {
      console.log('📥 NAPFOOM 템플릿 로드 시작 (수식 무시 모드)...');
      // 수식까지 무시하고 로드하여 Shared Formula 문제 완전 회피
      await workbook.xlsx.load(arrayBuffer, {
        sharedFormula: false,
        ignoreSharedFormulas: true,
        ignoreFormulas: true,  // 수식 무시
        ignoreFormulaErrors: true,
        ignoreStyles: false,
        ignoreDataValidations: false,
        ignoreConditionalFormats: false,
        ignoreNodes: ['sharedFormula', 'si', 'ref', 'sharedFormulas', 'sharedFormulaRef', 'sharedFormulaMaster', 'formula'],
        ignoreElements: ['sharedFormula', 'si', 'ref', 'sharedFormulas', 'sharedFormulaRef', 'sharedFormulaMaster', 'formula']
      });
      console.log('✅ 수식 무시 모드로 NAPFOOM 템플릿 로드 성공');
    } catch (loadError) {
      console.error('❌ NAPFOOM 템플릿 로드 실패:', loadError.message);
      throw new Error(`NAPFOOM 템플릿 로드 실패: ${loadError.message}`);
    }
    
    // 수식 무시 모드로 로드했으므로 F열 재생성 불필요
    console.log('✅ 수식 무시 모드로 로드하여 F열 재생성 불필요');
    
    // Shared Formula 문제만 해결 (수식은 보존)
    fixNapfoomSharedFormulaIssues(workbook);
    console.log('✅ Shared Formula 문제 해결 완료 (수식 보존)');
    
    // 데이터 입력
    await fillNapfoomData(workbook, siteData, materialItems);
    
    // 데이터 입력 후 수식 재설정 (더 안전함)
    try {
      console.log('🔧 NAPFOOM 데이터 입력 후 수식 재설정 시작...');
      workbook.worksheets.forEach(sheet => {
        console.log(`🔧 ${sheet?.name} 시트 수식 재설정 중...`);
        // F, H, J, K, L열에 필요한 수식들 재설정 (5행부터 100행까지)
        for (let row = 5; row <= 100; row++) {
          try {
            // F열: D*E
            const fCell = sheet.getCell(`F${row}`);
            if (fCell) {
              fCell.formula = `D${row}*E${row}`;
            }
            
            // H열: D*G
            const hCell = sheet.getCell(`H${row}`);
            if (hCell) {
              hCell.formula = `D${row}*G${row}`;
            }
            
            // J열: D*I
            const jCell = sheet.getCell(`J${row}`);
            if (jCell) {
              jCell.formula = `D${row}*I${row}`;
            }
            
            // K열: E+G+I
            const kCell = sheet.getCell(`K${row}`);
            if (kCell) {
              kCell.formula = `E${row}+G${row}+I${row}`;
            }
            
            // L열: D*K
            const lCell = sheet.getCell(`L${row}`);
            if (lCell) {
              lCell.formula = `D${row}*K${row}`;
            }
          } catch (cellError) {
            // 일부 셀이 존재하지 않을 수 있음 - 무시
          }
        }
        console.log(`✅ ${sheet?.name} 시트 수식 재설정 완료`);
      });
      console.log('✅ NAPFOOM 데이터 입력 후 수식 재설정 완료');
    } catch (formulaError) {
      console.warn('⚠️ 수식 재설정 실패:', formulaError.message);
    }
    
    // 파일 생성 전 최종 Shared Formula 체크 및 정리
    console.log('🔍 파일 생성 전 최종 Shared Formula 체크 시작...');
    try {
      workbook.worksheets.forEach(sheet => {
        let finalCheckCount = 0;
        sheet.eachRow((row, rowNumber) => {
          row.eachCell((cell, colNumber) => {
            try {
              if (cell.sharedFormula !== undefined || cell.si !== undefined || cell.ref !== undefined) {
                const colName = String.fromCharCode(64 + colNumber);
                console.log(`🔧 최종 체크: ${colName}${rowNumber} 셀 Shared Formula 정리`);
                
                if (cell.sharedFormula !== undefined) delete cell.sharedFormula;
                if (cell.si !== undefined) delete cell.si;
                if (cell.ref !== undefined) delete cell.ref;
                
                finalCheckCount++;
              }
            } catch (finalError) {
              // 개별 셀 오류는 무시
            }
          });
        });
        
        if (finalCheckCount > 0) {
          console.log(`✅ ${sheet?.name} 시트 최종 정리 완료: ${finalCheckCount}개 셀`);
        }
      });
      console.log('✅ 파일 생성 전 최종 Shared Formula 체크 완료');
    } catch (finalCheckError) {
      console.warn('⚠️ 최종 Shared Formula 체크 중 오류:', finalCheckError.message);
    }
    
    // 파일 생성 및 다운로드 (수식 보존 강제)
    console.log('💾 파일 생성 중...');
    const buffer = await workbook.xlsx.writeBuffer({
      sharedFormula: false,
      ignoreFormulas: false,  // 수식 보존 강제
      ignoreSharedFormulas: true,
      ignoreStyles: false,
      ignoreDataValidations: false,
      ignoreConditionalFormats: false,
      ignoreMacros: false,
      ignorePictures: false,
      ignoreCharts: false
    });
    console.log('📦 버퍼 생성 완료 (수식 보존), 크기:', buffer.byteLength);
    
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    console.log('📄 Blob 생성 완료, 크기:', blob.size);
    
    const url = window.URL.createObjectURL(blob);
    console.log('🔗 URL 생성 완료:', url);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
    console.log('📥 다운로드 시작:', link.download);
    
    // 다운로드 트리거
    try {
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        console.log('✅ 링크 DOM에서 제거 완료');
      }, 100);
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        console.log('🧹 URL 메모리 정리 완료');
      }, 2000);
      
      console.log('📥 다운로드 트리거 완료');
      
    } catch (downloadError) {
      console.error('❌ 다운로드 트리거 실패:', downloadError);
      try {
        window.open(url, '_blank');
        console.log('🔄 대체 방법: 새 창에서 열기 시도');
      } catch (fallbackError) {
        console.error('❌ 대체 방법도 실패:', fallbackError);
      }
    }
    
    console.log('✅ NAPFOOM 납품계약서 생성 완료');
    return { success: true, fileName: link.download };
    
  } catch (error) {
    console.error('❌ NAPFOOM 납품계약서 생성 실패:', error);
    return { success: false, error: error.message };
  }
};

/**
 * NAPFOOM Shared Formula 문제 해결 함수 (수식 보존)
 * @param {ExcelJS.Workbook} workbook - 워크북
 */
const fixNapfoomSharedFormulaIssues = (workbook) => {
  try {
    console.log('🔧 NAPFOOM Shared Formula 문제 해결 시작');
    
    workbook.worksheets.forEach(sheet => {
      console.log(`🔧 ${sheet?.name} 시트 Shared Formula 문제 해결`);
      
      // 모든 셀에서 Shared Formula 속성 제거 (개별 셀 지정 방식 제거)
      console.log(`🔍 ${sheet?.name} 시트 전체 Shared Formula 속성 제거 시작...`);
      let removedCount = 0;
      
      // 모든 셀을 스캔하여 Shared Formula 속성 제거
      for (let row = 1; row <= 100; row++) { // 100행까지 스캔
        for (let col = 1; col <= 26; col++) { // A-Z 열까지 스캔
          try {
            const cell = sheet.getCell(row, col);
            if (cell) {
              let hasRemoved = false;
              
              // Shared Formula 관련 속성 제거
              if (cell.sharedFormula !== undefined) {
                delete cell.sharedFormula;
                hasRemoved = true;
              }
              if (cell.si !== undefined) {
                delete cell.si;
                hasRemoved = true;
              }
              if (cell.ref !== undefined) {
                delete cell.ref;
                hasRemoved = true;
              }
              
              // 수식에 si 참조가 포함된 경우 정리
              if (cell.formula && typeof cell.formula === 'string' && cell.formula.includes('si=')) {
                cell.formula = cell.formula.replace(/si=\d+/g, '');
                hasRemoved = true;
              }
              
              if (hasRemoved) {
                const colName = String.fromCharCode(64 + col);
                console.log(`🔧 ${colName}${row} 셀 Shared Formula 속성 제거`);
                removedCount++;
              }
            }
          } catch (scanError) {
            // 개별 셀 스캔 오류는 무시하고 계속 진행
          }
        }
      }
      
      if (removedCount > 0) {
        console.log(`✅ ${sheet?.name} 시트 Shared Formula 속성 제거 완료: ${removedCount}개 셀`);
      }
      
      // 추가: 모든 셀을 스캔하여 Shared Formula 문제 자동 감지 및 처리
      console.log(`🔍 ${sheet?.name} 시트 전체 Shared Formula 문제 자동 스캔 시작...`);
      let autoFixedCount = 0;
      
      for (let row = 1; row <= 100; row++) { // 100행까지 스캔
        for (let col = 1; col <= 26; col++) { // A-Z 열까지 스캔
          try {
            const cell = sheet.getCell(row, col);
            if (cell && (cell.sharedFormula !== undefined || cell.si !== undefined || cell.ref !== undefined)) {
              const colName = String.fromCharCode(64 + col); // 1=A, 2=B, ...
              console.log(`🔧 자동 감지: ${colName}${row} 셀 Shared Formula 문제 발견`);
              
              // Shared Formula 관련 속성 제거
              if (cell.sharedFormula !== undefined) delete cell.sharedFormula;
              if (cell.si !== undefined) delete cell.si;
              if (cell.ref !== undefined) delete cell.ref;
              
              autoFixedCount++;
            }
          } catch (scanError) {
            // 개별 셀 스캔 오류는 무시하고 계속 진행
          }
        }
      }
      
      if (autoFixedCount > 0) {
        console.log(`✅ ${sheet?.name} 시트 자동 수정 완료: ${autoFixedCount}개 셀`);
      }
    });
    
    console.log('✅ NAPFOOM Shared Formula 문제 해결 완료');
  } catch (error) {
    console.warn('⚠️ NAPFOOM Shared Formula 문제 해결 중 오류:', error.message);
  }
};

/**
 * 모든 공유수식 제거 (기존 함수 유지)
 * @param {ExcelJS.Workbook} workbook - 워크북
 */
const removeAllSharedFormulas = (workbook) => {
  try {
    console.log('🧹 공유수식 제거 중...');
    
    workbook.worksheets.forEach(worksheet => {
      // 모든 셀을 순회하면서 공유수식 제거
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          try {
            // 모든 수식을 제거 (공유수식 문제 완전 해결)
            if (cell.formula) {
              const formula = cell.formula.toString();
              const cellAddress = cell.address;
              
              // 내역서 시트의 수식은 남기고, 실제 데이터 주입 시 빈 행만 정리
              
              // 다른 시트에서도 문제가 될 수 있는 수식들 제거
              if (formula.includes('F8') || formula.includes('H8') || formula.includes('F13') || 
                  formula.includes('F9') || formula.includes('F10') || formula.includes('F11') || formula.includes('F12') ||
                  formula.includes('H9') || formula.includes('H10') || formula.includes('H11') || formula.includes('H12')) {
                console.log(`🧹 문제수식 제거: ${cellAddress} - ${formula}`);
                const currentValue = cell.value;
                cell.value = currentValue; // 현재 값을 다시 설정하여 수식 제거
              }
            }
          } catch (e) {
            console.log(`⚠️ 셀 ${cell.address} 처리 실패:`, e.message);
          }
        });
      });
    });
    
    console.log('✅ 공유수식 제거 완료');
    
  } catch (error) {
    console.error('❌ 공유수식 제거 실패:', error);
  }
};

/**
 * NAPFOOM 템플릿에 데이터 입력
 * @param {ExcelJS.Workbook} workbook - 워크북
 * @param {Object} siteData - 현장 정보
 * @param {Array} materialItems - 물량 내역
 */
const fillNapfoomData = async (workbook, siteData, materialItems) => {
  try {
    console.log('📝 NAPFOOM 데이터 입력 중...');
    
    // 각 시트에 데이터 입력 (인덱스 기준: 0=계약서, 1=갑지, 2=내역서)
    const sheets = workbook.worksheets;
    for (let index = 0; index < sheets.length; index++) {
      const sheet = sheets[index];
      console.log(`📋 [${index}] ${sheet?.name} 시트에 데이터 입력`);
      if (index === 0) {
        await fillContractSheet(sheet, siteData);
      } else if (index === 1) {
        await fillSummarySheet(sheet, siteData, materialItems);
      } else if (index === 2) {
        fillDetailSheet(sheet, materialItems);
      }
    }
    
    console.log('✅ NAPFOOM 데이터 입력 완료');
    
  } catch (error) {
    console.error('❌ NAPFOOM 데이터 입력 실패:', error);
  }
};

/**
 * 납품계약서 시트에 데이터 입력
 * @param {ExcelJS.Worksheet} sheet - 시트
 * @param {Object} siteData - 현장 정보
 */
const fillContractSheet = async (sheet, siteData) => {
  try {
    console.log('📋 납품계약서 시트 데이터 입력');
    
    // 기본 정보 입력 (계약서 시트 기준 셀 매핑)
    const dataMapping = {
      // 현장명
      'G4': siteData?.name || siteData?.siteName || '',
      
      // 계약금액
      'K7': siteData.contractAmount || '',
      
      // 착공일
      'G10': siteData.startDate || '',
      
      // 준공예정일
      'J10': siteData.endDate || '',
      
      // 선급금 (없으면 0으로 설정)
      'K16': siteData.advance || 0,
      
      // 착공일 (B20)
      'B20': siteData.startDate || '',
      
      // 회사명
      'E24': siteData.companyName || siteData.company || '',
      
      // 거래처관리페이지에서 가져올 데이터
      'J24': siteData.businessNumber || '', // 사업자번호
      'E25': siteData.companyAddress || '', // 회사주소
      'J25': siteData.phone || '', // 전화번호
      'E26': siteData.ceoName || '', // 대표자명
    };
    
    // 데이터 입력
    Object.entries(dataMapping).forEach(([cellAddress, value]) => {
      try {
        sheet.getCell(cellAddress).value = value;
        console.log(`✅ ${cellAddress}: ${value}`);
      } catch (e) {
        console.log(`⚠️ ${cellAddress} 입력 실패:`, e.message);
      }
    });
    
    // 인감 이미지 추가 (Firebase Storage의 stamps 폴더 사용)
    try {
      const stampType = siteData?.stampType || '인감없음';
      console.log('🖊️ 계약서 시트 인감 이미지 처리 시작:', stampType);
      if (stampType !== '기타인감') {
        const actualStampType = stampType === '인감없음' ? 'A인감' : stampType;
        const stampImageMap = {
          'A인감': 'A.png',
          '□인감': '네모.png',
          '○인감': '동.png',
          '☆인감': '별.png',
          '△인감': '삼각.png',
          '♤인감': '스페이드.png',
          '♧인감': '클로버.png',
          '♡인감': '하트.png',
          '11인감': '11.png'
        };
        const mappedImageName = stampImageMap[actualStampType];
        if (mappedImageName) {
          // Firebase Storage에서 인감 이미지 다운로드
          const stampsRef = ref(storage, `stamps/${mappedImageName}`);
          const url = await getDownloadURL(stampsRef);
          const resp = await fetch(url);
          if (resp.ok) {
            const buf = await resp.arrayBuffer();
            const imageId = sheet.workbook.addImage({ buffer: buf, extension: 'png' });
            // 위치: 대략 G30
            sheet.addImage(imageId, { tl: { col: 6, row: 29 }, ext: { width: 60, height: 60 } });
            console.log('✅ 계약서 시트 인감 삽입 완료 (G30):', actualStampType);
          }
        }
      }
    } catch (imageError) {
      console.warn('⚠️ 계약서 시트 인감 추가 실패:', imageError);
    }
    
  } catch (error) {
    console.error('❌ 납품계약서 시트 입력 실패:', error);
  }
};

/**
 * 내역갑지 시트에 데이터 입력
 * @param {ExcelJS.Worksheet} sheet - 시트
 * @param {Object} siteData - 현장 정보
 * @param {Array} materialItems - 물량 내역
 */
const fillSummarySheet = async (sheet, siteData, materialItems) => {
  try {
    console.log('📋 내역갑지 시트 데이터 입력');
    
    // 갑지 시트: 요약 정보만 표시 (개별 물량은 내역서에만)
    console.log('📋 갑지 시트는 요약용 - 개별 물량 데이터 입력하지 않음');
    
    // 인감 이미지: 갑지(인덱스 0)에도 삽입
    try {
      const stampType = siteData?.stampType || '인감없음';
      if (stampType !== '기타인감') {
        const actualStampType = stampType === '인감없음' ? 'A인감' : stampType;
        const stampImageMap = {
          'A인감': 'A.png',
          '□인감': '네모.png',
          '○인감': '동.png',
          '☆인감': '별.png',
          '△인감': '삼각.png',
          '♤인감': '스페이드.png',
          '♧인감': '클로버.png',
          '♡인감': '하트.png',
          '11인감': '11.png'
        };
        const mappedImageName = stampImageMap[actualStampType];
        if (mappedImageName) {
          const stampsRef = ref(storage, `stamps/${mappedImageName}`);
          const url = await getDownloadURL(stampsRef);
          const resp = await fetch(url);
          if (resp.ok) {
            const buf = await resp.arrayBuffer();
            const imageId = sheet.workbook.addImage({ buffer: buf, extension: 'png' });
            // O22 근처 위치(갑지 배치 기준)
            sheet.addImage(imageId, { tl: { col: 14, row: 21 }, ext: { width: 60, height: 60 } });
            console.log('✅ 갑지 시트 인감 삽입 완료 (O22):', actualStampType);
          }
        }
      }
    } catch (imageError) {
      console.warn('⚠️ 갑지 시트 인감 추가 실패:', imageError);
    }
  } catch (error) {
    console.error('❌ 내역갑지 시트 입력 실패:', error);
  }
};

/**
 * 내역서 시트에 데이터 입력
 * @param {ExcelJS.Worksheet} sheet - 시트
 * @param {Array} materialItems - 물량 내역
 */
const fillDetailSheet = (sheet, materialItems) => {
  try {
    console.log('📋 내역서 시트 데이터 입력 시작');
    console.log('📊 물량 데이터 개수:', materialItems?.length || 0);
    console.log('📊 첫 번째 물량 데이터 샘플:', materialItems?.[0]);
    
    // 물량 데이터 입력 (5행부터)
    if (materialItems && Array.isArray(materialItems) && materialItems.length > 0) {
      // 필요한 행 확보: 현재 rowCount보다 작으면 행 추가
      const startRow = 5;
      const requiredRows = startRow + materialItems.length - 1;
      const lastRow = sheet.rowCount;
      if (requiredRows > lastRow) {
        const rowsToAdd = requiredRows - lastRow;
        for (let i = 0; i < rowsToAdd; i++) {
          sheet.spliceRows(lastRow + i, 0, []);
        }
      }
      console.log('✅ 물량 데이터가 존재합니다. 데이터 입력 시작...');
      
      // 총계 항목들을 제외하고 실제 물량만 필터링
      const filteredItems = materialItems.filter(item => {
        const name = String(item?.name || item?.itemName || '').trim();
        const specification = String(item?.specification || item?.spec || '').trim();
        
        // 단수정리는 무조건 포함
        if (name === '단수정리' || name === '단수정리') {
          console.log('✅ 단수정리 항목 포함:', item);
          return true;
        }
        
        // 총계, 부가세, 계약금액 관련 항목 제외
        const isTotalItem = name.includes('총공사계') || name.includes('총 공사계') || 
                           name.includes('부가세') || name.includes('계약금액') ||
                           name.includes('합계') || name.includes('소계') ||
                           item?.isTotal || item?.isVat || item?.isTotalWithVat;
        
        // 실제 물량 데이터만 포함
        return !isTotalItem;
      });
      
      console.log('🔍 단수정리 항목 확인:', filteredItems.filter(item => 
        String(item?.name || item?.itemName || '').trim() === '단수정리'
      ));
      
      console.log(`📊 필터링된 물량 데이터: ${filteredItems.length}개 (총계 항목 제외)`);
      
      filteredItems.forEach((item, index) => {
        const row = 5 + index;
        
        try {
          console.log(`📝 ${row}행 데이터 입력 중:`, {
            name: item?.name || item?.itemName || '',
            specification: item?.specification || item?.spec || '',
            unit: item?.unit || '',
            quantity: item?.quantity || item?.qty || '',
            unitPrice: item?.unitPrice || item?.price || '',
            amount: item?.amount || item?.total || '',
            note: item?.note || item?.remark || ''
          });
          
          // 안전한 값 변환 함수
          const safeString = (value) => {
            if (value === null || value === undefined) return '';
            return String(value);
          };
          
          const safeNumber = (value) => {
            if (value === null || value === undefined) return 0;
            const num = Number(value);
            return isNaN(num) ? 0 : num;
          };
          
          // A열과 B열 순서 변경 (A=이름, B=규격)
          sheet.getCell(`A${row}`).value = safeString(item?.name || item?.itemName);
          sheet.getCell(`B${row}`).value = safeString(item?.specification || item?.spec);
          sheet.getCell(`C${row}`).value = safeString(item?.unit);
          sheet.getCell(`D${row}`).value = safeNumber(item?.quantity || item?.qty);
          
          // 🛡️ 단가 데이터 완벽 매칭 및 안전 처리 - 공통 유틸리티 사용
          logMaterialItem(item, row, 'NAPFOOM');
          
          // E열: 재료비단가 (JE프라이스)
          const jePrice = getSafePrice(item, 'JE');
          setCellValueSafely(sheet.getCell(`E${row}`), jePrice);
          
          // F열: 수식 유지 (건드리지 않음) - D*E
          console.log(`📝 ${row}행 F열 수식 유지: D*E`);
          
          // G열: 노무비단가 (NO프라이스)
          const noPrice = getSafePrice(item, 'NO');
          setCellValueSafely(sheet.getCell(`G${row}`), noPrice);
          
          // H열: 수식 유지 (건드리지 않음) - D*G
          console.log(`📝 ${row}행 H열 수식 유지: D*G`);
          
          // I열: 경비단가 (KY프라이스)
          const kyPrice = getSafePrice(item, 'KY');
          setCellValueSafely(sheet.getCell(`I${row}`), kyPrice);
          
          // J열: 수식 유지 (건드리지 않음) - D*I
          console.log(`📝 ${row}행 J열 수식 유지: D*I`);
          
          // K열: 수식 유지 (건드리지 않음) - E+G+I
          console.log(`📝 ${row}행 K열 수식 유지: E+G+I`);
          
          // L열: 수식 유지 (건드리지 않음) - D*K
          console.log(`📝 ${row}행 L열 수식 유지: D*K`);
          
          // M열: 비고
          sheet.getCell(`M${row}`).value = safeString(item?.note || item?.remark);
          
          console.log(`✅ ${row}행 데이터 입력 완료`);
          
        } catch (e) {
          console.log(`⚠️ ${row}행 데이터 입력 실패:`, e.message);
        }
      });
      
      console.log(`✅ 총 ${materialItems.length}개 물량 데이터 입력 완료`);
      
      // C,D열에 값이 없으면 그 행 전체를 빈칸으로 처리
      console.log('🧹 NAPFOOM 납품계약서: C,D열에 값이 없는 행 전체 빈칸 처리 시작...');
      const maxCleanupRow = 5 + materialItems.length - 1;
      
      for (let row = 5; row <= maxCleanupRow; row++) {
        try {
          // 해당 행의 C, D 열 값 확인
          const cellC = sheet.getCell(row, 3); // C열 (단위)
          const cellD = sheet.getCell(row, 4); // D열 (수량)
          
          // C, D 열에 값이 없으면 해당 행 전체를 빈칸으로 처리
          const isEmptyCD = (!cellC.value || cellC.value === '') && 
                           (!cellD.value || cellD.value === '');
          
          if (isEmptyCD) {
            console.log(`📝 NAPFOOM 납품계약서 ${row}행 C,D열이 비어있어서 행 전체를 빈칸으로 처리`);
            
                         // C,D열에 값이 없으면 A,B열만 놔두고 나머지만 빈칸으로 처리 (수식은 보존)
             for (let col = 1; col <= 13; col++) { // A=1, M=13
               try {
                 const cell = sheet.getCell(row, col);
                 
                 // A,B열은 그대로 놔두기 (품명, 규격 보존)
                 if (col === 1 || col === 2) {
                   console.log(`🛡️ NAPFOOM 납품계약서 ${row}행 ${String.fromCharCode(64 + col)}열 A,B열 보존: ${cell.value || ''}`);
                   continue; // A,B열은 건드리지 않음
                 }
                 
                 // C~M열만 빈칸으로 처리 (수식은 보존)
                 if (cell.formula) {
                   console.log(`🛡️ NAPFOOM 납품계약서 ${row}행 ${String.fromCharCode(64 + col)}열 수식 보존: ${cell.formula}`);
                   // 수식은 그대로 두고 값만 빈칸으로
                   cell.value = '';
                 } else {
                   // 수식이 없는 경우 값만 빈칸으로 처리
                   cell.value = '';
                   console.log(`✅ NAPFOOM 납품계약서 ${row}행 ${String.fromCharCode(64 + col)}열 값만 빈칸 처리 완료`);
                 }
                 
                 console.log(`✅ NAPFOOM 납품계약서 ${row}행 ${String.fromCharCode(64 + col)}열 처리 완료`);
               } catch (e) {
                 console.log(`⚠️ NAPFOOM 납품계약서 ${row}행 ${String.fromCharCode(64 + col)}열 처리 실패:`, e.message);
               }
             }
          } else {
            console.log(`📝 NAPFOOM 납품계약서 ${row}행 C,D열에 데이터가 있어서 행 유지`);
          }
        } catch (error) {
          console.warn(`⚠️ NAPFOOM 납품계약서 ${row}행 빈칸 처리 중 오류:`, error.message);
        }
      }
      
      console.log('✅ NAPFOOM 납품계약서 C,D열 빈칸 처리 완료');
      
    } else {
      console.log('⚠️ 물량 데이터가 없거나 빈 배열입니다.');
      console.log('📊 materialItems:', materialItems);
    }

            // 🛡️ 공통 유틸리티를 사용하여 빈 행 정리
        cleanEmptyRows(sheet, 5, 'NAPFOOM');
    
  } catch (error) {
    console.error('❌ 내역서 시트 입력 실패:', error);
    console.error('❌ 오류 상세:', error.message);
    console.error('❌ 오류 스택:', error.stack);
  }
};

/**
 * NewSites.jsx에서 사용하는 함수
 * @param {Object} site - 현장 정보
 * @param {Array} materialItems - 물량 내역
 */
export const downloadNapfoomContract = async (site, materialItems = []) => {
  try {
    console.log('📋 NAPFOOM 납품계약서 다운로드 시작...', { site, materialItems });
    
    // 납품계약서 생성
    const fileName = `납품계약서_${site?.name || site?.siteName || '현장'}_${site?.companyName || site?.company || '회사'}`;
    const result = await createNapfoomContract(site, materialItems, fileName);
    
    if (result.success) {
      console.log('✅ NAPFOOM 납품계약서 다운로드 완료:', result.fileName);
    } else {
      throw new Error(result.error || 'NAPFOOM 납품계약서 생성 실패');
    }
    
  } catch (error) {
    console.error('❌ NAPFOOM 납품계약서 다운로드 실패:', error);
    throw error;
  }
};

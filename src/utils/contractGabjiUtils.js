// 납품계약서 갑지 생성 유틸리티 (데이터만 입력)
import ExcelJS from 'exceljs';
import { templateUrls } from './templateUrls';
import { getSafePrice, setCellValueSafely, filterMaterialItems, logMaterialItem, cleanSheetData, fillContractStyleData, cleanEmptyRows } from './excelCommonUtils';

/**
 * 납품계약서 갑지 생성 (데이터만 입력)
 * @param {Object} siteData - 현장 정보
 * @param {Array} materialItems - 물량 내역
 * @param {string} fileName - 파일명
 * @returns {Promise<Object>} - 생성 결과
 */
export const createContractGabji = async (siteData, materialItems = [], fileName = '납품계약서') => {
  try {
    console.log('📋 납품계약서 갑지 생성 시작...', { siteData, materialItems });
    
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
        console.log(`📋 납품계약서 템플릿 선택: ${templateType} 타입 (${templateType === 'L' ? 'LONG' : 'NEW'})`);
    console.log('🔗 템플릿 URL:', templateUrl);
    const response = await fetch(templateUrl);
    const arrayBuffer = await response.arrayBuffer();
    
    // 템플릿 로드 (수식 보존, Shared Formula만 제거)
    const workbook = new ExcelJS.Workbook();
    try {
      // 첫 번째 시도: 기본 설정으로 로딩
      await workbook.xlsx.load(arrayBuffer, {
        sharedFormula: false,
        ignoreFormulas: false,  // 수식 보존
        ignoreFormulaErrors: true,
        ignoreStyles: false,
        ignoreDataValidations: false,
        ignoreConditionalFormats: false
      });
      console.log('✅ 기본 설정으로 납품계약서 템플릿 로드 성공');
    } catch (loadError) {
      console.warn('⚠️ 기본 로딩 실패, Shared Formula 무시로 재시도:', loadError.message);
      
      // 두 번째 시도: Shared Formula만 무시
      await workbook.xlsx.load(arrayBuffer, {
        sharedFormula: false,
        ignoreSharedFormulas: true,
        ignoreFormulas: false,  // 수식 보존
        ignoreFormulaErrors: true,
        ignoreStyles: false,
        ignoreDataValidations: false,
        ignoreConditionalFormats: false
      });
      console.log('✅ Shared Formula 무시로 납품계약서 템플릿 로드 성공');
    }
    
    // Shared Formula 문제만 해결 (수식은 보존)
    fixContractSharedFormulaIssues(workbook);
    console.log('✅ Shared Formula 문제 해결 완료 (수식 보존)');
    
    // 데이터만 입력 (양식은 건드리지 않음)
    await fillContractGabjiData(workbook, siteData, materialItems);
    
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
    
    console.log('✅ 납품계약서 갑지 생성 완료');
    return { success: true, fileName: link.download };
    
  } catch (error) {
    console.error('❌ 납품계약서 갑지 생성 실패:', error);
    return { success: false, error: error.message };
  }
};



/**
 * 납품계약서 Shared Formula 문제 해결 함수 (수식 보존)
 * @param {ExcelJS.Workbook} workbook - 워크북
 */
const fixContractSharedFormulaIssues = (workbook) => {
  try {
    console.log('🔧 납품계약서 Shared Formula 문제 해결 시작');
    
    workbook.worksheets.forEach(sheet => {
      console.log(`🔧 ${sheet?.name} 시트 Shared Formula 문제 해결`);
      
      // 문제가 되는 특정 셀만 처리 (중요한 수식은 보존)
      const targetCells = [
        { row: 7, col: 'F' },   // F7 셀
        { row: 8, col: 'F' },   // F8 셀
        { row: 8, col: 'H' },   // H8 셀 (새로 발견된 문제 셀)
        { row: 8, col: 'K' },   // K8 셀
        { row: 19, col: 'K' },  // K19 셀
        { row: 27, col: 'K' }   // K27 셀
      ];
      
      targetCells.forEach(({ row, col }) => {
        try {
          const cell = sheet.getCell(`${col}${row}`);
          if (cell) {
            console.log(`🔧 ${col}${row} 셀 특별 처리 시작`);
            
            // Shared Formula 관련 속성만 제거 (수식은 보존)
            if (cell.sharedFormula !== undefined) {
              console.log(`🔧 ${col}${row} 셀 sharedFormula 제거`);
              delete cell.sharedFormula;
            }
            if (cell.si !== undefined) {
              console.log(`🔧 ${col}${row} 셀 si 제거`);
              delete cell.si;
            }
            if (cell.ref !== undefined) {
              console.log(`🔧 ${col}${row} 셀 ref 제거`);
              delete cell.ref;
            }
            
            // 수식에 si 참조가 포함된 경우만 정리
            if (cell.formula && typeof cell.formula === 'string' && cell.formula.includes('si=')) {
              console.log(`🔧 ${col}${row} 셀의 si 참조가 포함된 수식 정리`);
              // si 참조만 제거하고 수식은 보존
              cell.formula = cell.formula.replace(/si=\d+/g, '');
            }
            
            // F7, F8, H8, K8 셀은 Shared Formula 속성만 제거 (값은 건드리지 않음)
            if ((col === 'F' && (row === 7 || row === 8)) || (col === 'H' && row === 8) || (col === 'K' && row === 8)) {
              console.log(`✅ ${col}${row} 셀 Shared Formula 속성만 제거 완료 (값 보존)`);
            }
          }
        } catch (cellError) {
          console.warn(`⚠️ ${col}${row} 셀 처리 실패:`, cellError.message);
        }
      });
    });
    
    console.log('✅ 납품계약서 Shared Formula 문제 해결 완료');
  } catch (error) {
    console.warn('⚠️ 납품계약서 Shared Formula 문제 해결 중 오류:', error.message);
  }
};

/**
 * 모든 공유 수식 제거 함수 (기존 함수 유지)
 * @param {ExcelJS.Workbook} workbook - 워크북
 */
const removeAllSharedFormulas = (workbook) => {
  try {
    console.log('🔧 공유 수식 제거 시작...');
    
    workbook.worksheets.forEach((worksheet, index) => {
      console.log(`🔍 시트 ${index + 1}: ${worksheet?.name} 처리 중...`);
      
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          if (cell.formula) {
            console.log(`⚠️ 수식 발견: ${worksheet?.name}!${cell.address} = ${cell.formula}`);
            // 수식 제거하고 값만 유지
            const currentValue = cell.value;
            cell.formula = undefined;
            cell.value = currentValue;
            console.log(`✅ 수식 제거: ${cell.address}, 값 유지: ${currentValue}`);
          }
        });
      });
    });
    
    console.log('✅ 모든 공유 수식 제거 완료');
  } catch (error) {
    console.error('❌ 공유 수식 제거 중 오류:', error);
  }
};

/**
 * 납품계약서 갑지에 데이터만 입력
 * @param {ExcelJS.Workbook} workbook - 워크북
 * @param {Object} siteData - 현장 정보
 * @param {Array} materialItems - 물량 내역
 */
const fillContractGabjiData = async (workbook, siteData, materialItems) => {
  try {
    console.log('📝 납품계약서 갑지 데이터 입력 중...');
    
    // 각 시트에 데이터 입력
    const sheets = workbook.worksheets;
    for (const sheet of sheets) {
      console.log(`📋 ${sheet?.name} 시트에 데이터 입력`);
      
      // 1번째 시트 (계약서) - 기본 정보 입력
      if (sheets.indexOf(sheet) === 0) { // 1번째 시트 (0-based index)
        console.log('📋 1번째 시트 (계약서)에 기본 정보 입력');
        await fillContractSheetData(sheet, siteData, workbook);
      }
      
      // 2번째 시트 (갑지) - 인감이미지 추가 및 B11 수식 수정
      if (sheets.indexOf(sheet) === 1) { // 2번째 시트 (0-based index)
        console.log('📋 2번째 시트 (갑지)에 인감이미지 추가 및 B11 수식 수정');
        
        // B11 셀의 수식을 =계약서!E24에서 =계약서!G24로 변경
        try {
          const b11Cell = sheet.getCell('B11');
          if (b11Cell.formula && b11Cell.formula.includes('=계약서!E24')) {
            b11Cell.formula = '=계약서!G24';
            console.log('✅ B11 셀 수식 변경: =계약서!E24 → =계약서!G24');
          } else {
            console.log('⚠️ B11 셀에 기대하는 수식이 없음:', b11Cell.formula);
          }
        } catch (error) {
          console.log('⚠️ B11 셀 수식 변경 실패:', error.message);
        }
        
        await addStampImageToSheet(sheet, siteData, workbook);
      }
      
      // 3번째 시트 (내역서) - 물량데이터 입력
      if (sheets.indexOf(sheet) === 2) { // 3번째 시트 (0-based index)
        console.log('📋 3번째 시트 (내역서)에 물량데이터 입력');
        fillEstimateStyleSheetData(sheet, siteData, materialItems);
      }
    }
    
    console.log('✅ 납품계약서 갑지 데이터 입력 완료');
    
  } catch (error) {
    console.error('❌ 납품계약서 갑지 데이터 입력 실패:', error);
  }
};

/**
 * 계약서 시트에 기본 정보 입력
 * @param {ExcelJS.Worksheet} sheet - 시트
 * @param {Object} siteData - 현장 정보
 * @param {ExcelJS.Workbook} workbook - 워크북 (인감이미지용)
 */
const fillContractSheetData = async (sheet, siteData, workbook) => {
  try {
    console.log('📋 계약서 시트 데이터 입력');
    
    // 정확한 위치에 데이터 입력 (현장관리페이지 현장상세정보에서)
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
      
             // 거래처관리페이지에서 가져올 데이터 (같은 회사명으로 찾아서)
       'J24': siteData.businessNumber || '', // 사업자번호
       'E25': siteData.companyAddress || '', // 회사주소 (거래처관리에서)
       'J25': siteData.phone || '', // 전화번호
       'E26': siteData.ceoName || '', // 대표자명
    };
    
    // 데이터 입력
    Object.entries(dataMapping).forEach(([cellAddress, value]) => {
      try {
        const cell = sheet.getCell(cellAddress);
        cell.value = value;
        
        // G4 셀 서식을 일반으로 변경
        if (cellAddress === 'G4') {
          cell.numFmt = 'General';
          console.log('✅ G4 셀 서식을 일반으로 변경');
        }
        
        console.log(`✅ ${cellAddress}: ${value}`);
      } catch (e) {
        console.log(`⚠️ ${cellAddress} 입력 실패:`, e.message);
      }
    });
    
         // 인감 이미지 추가 (견적서와 동일한 방식)
     try {
       const stampType = siteData?.stampType || '인감없음';
       console.log('🖊️ 인감 이미지 처리 시작:', stampType);
       
       // 인감없음인 경우 A인감으로 처리, 기타인감인 경우 이미지 넣지 않음
       if (stampType === '기타') {
         console.log('📝 기타인감이므로 이미지 삽입하지 않음:', stampType);
         return;
       }
       
       // 실제 사용할 인감 타입 결정
       const actualStampType = stampType === '인감없음' ? 'A인감' : stampType;
       console.log('🖊️ 실제 사용할 인감 타입:', actualStampType);
       
       if (workbook) {
         // 인감 이미지 다운로드 함수 (견적서와 동일한 방식)
         const downloadSignatureImage = async (stampType = 'A인감') => {
           try {
             const stampImageMap = {
               'A인감': 'A.png',
               '□인감': '네모.png',
               '○인감': '동.png',
               '☆인감': '별.png',
               '△인감': '삼각.png',
               '♤인감': '스페이드.png',
               '♧인감': '클로버.png',
               '♡인감': '하트.png',
               '11인감': '11.png',
               // 기존 매핑도 유지
               '네모': '네모.png',
               '동': '동.png',
               '별': '별.png',
               '삼각': '삼각.png',
               '스페이드': '스페이드.png',
               '클로버': '클로버.png',
               '하트': '하트.png'
             };
             
             const mappedImageName = stampImageMap[stampType];
             if (!mappedImageName) {
               console.warn('⚠️ 알 수 없는 인감 타입:', stampType);
               return null;
             }
             
             // 인감 이미지 가져오기 (로컬 파일 사용)
             console.log('🌐 로컬 인감 이미지 사용');
             const imagePath = `/${mappedImageName}`;
             console.log('📁 로컬 인감 이미지 경로:', imagePath);
             const response = await fetch(imagePath);
             if (!response.ok) {
               throw new Error(`인감 이미지 다운로드 실패: ${response.status}`);
             }
             const arrayBuffer = await response.arrayBuffer();
             console.log('✅ 인감 이미지 다운로드 완료:', mappedImageName);
             return arrayBuffer;
           } catch (error) {
             console.warn('⚠️ 서명 이미지 다운로드 실패:', error);
             return null;
           }
         };
         
         const imageBuffer = await downloadSignatureImage(actualStampType);
         if (imageBuffer) {
           const imageId = workbook.addImage({
             buffer: imageBuffer,
             extension: 'png',
           });
           
           // G30 셀 위치에 인감 이미지 추가
           sheet.addImage(imageId, {
             tl: { col: 6, row: 29 }, // G30 셀 (0-based index)
             ext: { width: 60, height: 60 }
           });
           
           console.log('✅ 인감 이미지 삽입 완료 (G30):', actualStampType);
         } else {
           console.log('📝 인감 이미지 없음 또는 워크북 없음:', actualStampType);
         }
       }
     } catch (imageError) {
       console.warn('⚠️ 인감 이미지 추가 실패:', imageError);
     }
    
  } catch (error) {
    console.error('❌ 계약서 시트 입력 실패:', error);
  }
};

/**
 * 물량 내역 시트에 데이터 입력
 * @param {ExcelJS.Worksheet} sheet - 시트
 * @param {Array} materialItems - 물량 내역
 */
const fillMaterialSheetData = (sheet, materialItems) => {
  try {
    console.log('📋 물량 내역 시트 데이터 입력');
    
    // 물량 데이터 입력 (일반적으로 5행부터 시작)
    if (materialItems && Array.isArray(materialItems)) {
      materialItems.forEach((item, index) => {
        const row = 5 + index;
        
        try {
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
          
          // 일반적인 물량 내역 구조에 맞춰 데이터 입력
          sheet.getCell(`A${row}`).value = safeString(item?.name || item?.itemName);
          sheet.getCell(`B${row}`).value = safeString(item?.specification || item?.spec);
          sheet.getCell(`C${row}`).value = safeString(item?.unit);
          sheet.getCell(`D${row}`).value = safeNumber(item?.quantity || item?.qty);
          sheet.getCell(`E${row}`).value = safeNumber(item?.unitPrice || item?.price);
          sheet.getCell(`F${row}`).value = safeNumber(item?.amount || item?.total);
          sheet.getCell(`G${row}`).value = safeString(item?.note || item?.remark);
          
          console.log(`✅ ${row}행 데이터 입력 완료`);
        } catch (e) {
          console.log(`⚠️ ${row}행 데이터 입력 실패:`, e.message);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ 물량 내역 시트 입력 실패:', error);
  }
};

/**
 * 2번째 시트에 인감이미지만 추가
 * @param {ExcelJS.Worksheet} sheet - 시트
 * @param {Object} siteData - 현장 정보
 * @param {ExcelJS.Workbook} workbook - 워크북 (인감이미지용)
 */
const addStampImageToSheet = async (sheet, siteData, workbook) => {
  try {
    console.log('🖊️ 2번째 시트에 인감이미지 추가');
    
    // 인감 이미지 추가 (견적서와 동일한 방식)
    const stampType = siteData?.stampType || '인감없음';
    if (stampType === '기타') {
      console.log('📝 기타인감이므로 이미지 삽입하지 않음:', stampType);
      return;
    }
    
    const actualStampType = stampType === '인감없음' ? 'A인감' : stampType;
    if (workbook) {
             const downloadSignatureImage = async (stampType = 'A인감') => {
        try {
                     const stampImageMap = {
             'A인감': 'A.png',
             '□인감': '네모.png',
             '○인감': '동.png',
             '☆인감': '별.png',
             '△인감': '삼각.png',
             '♤인감': '스페이드.png',
             '♧인감': '클로버.png',
             '♡인감': '하트.png',
             '11인감': '11.png',
             // 기존 매핑도 유지
             '네모': '네모.png',
             '동': '동.png',
             '별': '별.png',
             '삼각': '삼각.png',
             '스페이드': '스페이드.png',
             '클로버': '클로버.png',
             '하트': '하트.png'
           };
          
          const mappedImageName = stampImageMap[stampType];
          if (!mappedImageName) {
            console.warn('⚠️ 알 수 없는 인감 타입:', stampType);
            return null;
          }
          
          // 인감 이미지 가져오기 (로컬 파일 사용)
          console.log('🌐 로컬 인감 이미지 사용');
          const imagePath = `/${mappedImageName}`;
          console.log('📁 로컬 인감 이미지 경로:', imagePath);
          const response = await fetch(imagePath);
          if (!response.ok) {
            throw new Error(`인감 이미지 다운로드 실패: ${response.status}`);
          }
          const imageBuffer = await response.arrayBuffer();
          
          console.log('✅ 인감 이미지 다운로드 완료');
          return imageBuffer;
        } catch (error) {
          console.warn('⚠️ 인감 이미지 다운로드 실패:', error.message);
          return null;
        }
      };
      
      const imageBuffer = await downloadSignatureImage(actualStampType);
      if (imageBuffer) {
        const imageId = workbook.addImage({ buffer: imageBuffer, extension: 'png' });
        sheet.addImage(imageId, { tl: { col: 14, row: 21 }, ext: { width: 60, height: 60 } }); // O22
        console.log('✅ 인감 이미지 추가 완료 (O22)');
      }
    }
  } catch (error) {
    console.error('❌ 인감 이미지 추가 실패:', error);
  }
};

/**
 * 3번째 시트에 물량데이터만 입력 (A5부터)
 * @param {ExcelJS.Worksheet} sheet - 시트
 * @param {Object} siteData - 현장 정보
 * @param {Array} materialItems - 물량 내역
 */
const fillEstimateStyleSheetData = (sheet, siteData, materialItems) => {
  try {
    console.log('📋 3번째 시트에 물량데이터만 입력 (A5부터)');
    console.log('🔍 materialItems 데이터 구조 확인:', materialItems);
    
    // A5 이전의 기본정보는 템플릿 그대로 유지 (제목, 테이블명 보존)
    console.log('📋 A5 이전 기본정보 보존 (제목, 테이블명 유지)');
    
    // 물량 내역 데이터만 입력 (A5부터 시작)
    if (materialItems && Array.isArray(materialItems)) {
      // 필요한 행 수 계산 (기본 5행부터 시작)
      const startRow = 5;
      const requiredRows = startRow + materialItems.length - 1;
      
      // 현재 시트의 마지막 행 확인
      const lastRow = sheet.rowCount;
      console.log(`📊 현재 시트 마지막 행: ${lastRow}, 필요한 행: ${requiredRows}`);
      
      // 필요한 경우 행 추가
      if (requiredRows > lastRow) {
        const rowsToAdd = requiredRows - lastRow;
        console.log(`📈 ${rowsToAdd}개 행 추가 필요`);
        
        // 마지막 행부터 필요한 만큼 행 삽입
        for (let i = 0; i < rowsToAdd; i++) {
          sheet.spliceRows(lastRow + i, 0, []);
        }
        console.log(`✅ ${rowsToAdd}개 행 추가 완료`);
      }
      
      // 총계 항목들을 제외하고 실제 물량만 필터링 - 공통 유틸리티 사용
      const filteredItems = filterMaterialItems(materialItems);
      
      console.log(`📊 필터링된 물량 데이터: ${filteredItems.length}개 (총계 항목 제외)`);
      
      // 🛡️ 공통 유틸리티를 사용하여 납품계약서용 데이터 입력
      fillContractStyleData(sheet, filteredItems, startRow, '납품계약서');
      
      // C,D열에 값이 없으면 그 행 전체를 빈칸으로 처리
      console.log('🧹 납품계약서: C,D열에 값이 없는 행 전체 빈칸 처리 시작...');
      const maxCleanupRow = startRow + filteredItems.length - 1;
      
      for (let row = startRow; row <= maxCleanupRow; row++) {
        try {
          // 해당 행의 C, D 열 값 확인
          const cellC = sheet.getCell(row, 3); // C열 (단위)
          const cellD = sheet.getCell(row, 4); // D열 (수량)
          
          // C, D 열에 값이 없으면 해당 행 전체를 빈칸으로 처리
          const isEmptyCD = (!cellC.value || cellC.value === '') && 
                           (!cellD.value || cellD.value === '');
          
          if (isEmptyCD) {
            console.log(`📝 납품계약서 ${row}행 C,D열이 비어있어서 행 전체를 빈칸으로 처리`);
            
                         // C,D열에 값이 없으면 A,B열만 놔두고 나머지만 빈칸으로 처리 (수식은 보존)
             for (let col = 1; col <= 13; col++) { // A=1, M=13
               try {
                 const cell = sheet.getCell(row, col);
                 
                 // A,B열은 그대로 놔두기 (품명, 규격 보존)
                 if (col === 1 || col === 2) {
                   console.log(`🛡️ 납품계약서 ${row}행 ${String.fromCharCode(64 + col)}열 A,B열 보존: ${cell.value || ''}`);
                   continue; // A,B열은 건드리지 않음
                 }
                 
                 // C~M열만 빈칸으로 처리 (수식은 보존)
                 if (cell.formula) {
                   console.log(`🛡️ 납품계약서 ${row}행 ${String.fromCharCode(64 + col)}열 수식 보존: ${cell.formula}`);
                   // 수식은 그대로 두고 값만 빈칸으로
                   cell.value = '';
                 } else {
                   // 수식이 없는 경우 값만 빈칸으로 처리
                   cell.value = '';
                   console.log(`✅ 납품계약서 ${row}행 ${String.fromCharCode(64 + col)}열 값만 빈칸 처리 완료`);
                 }
                 
                 console.log(`✅ 납품계약서 ${row}행 ${String.fromCharCode(64 + col)}열 처리 완료`);
               } catch (e) {
                 console.log(`⚠️ 납품계약서 ${row}행 ${String.fromCharCode(64 + col)}열 처리 실패:`, e.message);
               }
             }
          } else {
            console.log(`📝 납품계약서 ${row}행 C,D열에 데이터가 있어서 행 유지`);
          }
        } catch (error) {
          console.warn(`⚠️ 납품계약서 ${row}행 빈칸 처리 중 오류:`, error.message);
        }
      }
      
      console.log('✅ 납품계약서 C,D열 빈칸 처리 완료');
    }
    
    // 🛡️ 공통 유틸리티를 사용하여 빈 행 정리
    cleanEmptyRows(sheet, 5, '납품계약서');
    console.log('✅ 3번째 시트 물량데이터 입력 완료');
    
  } catch (error) {
    console.error('❌ 3번째 시트 물량데이터 입력 실패:', error);
  }
};



/**
 * NewSites.jsx에서 사용하는 함수
 * @param {Object} site - 현장 정보
 * @param {Array} materialItems - 물량 내역
 */
export const downloadContractGabji = async (site, materialItems = []) => {
  try {
    console.log('📋 납품계약서 갑지 다운로드 시작...', { site, materialItems });
    
    // 납품계약서 갑지 생성 (파일명 변경)
    const fileName = `(납품계약서)${site?.name || site?.siteName || '현장'} 중 유리납품`;
    const result = await createContractGabji(site, materialItems, fileName);
    
    if (result.success) {
      console.log('✅ 납품계약서 갑지 다운로드 완료:', result.fileName);
    } else {
      throw new Error(result.error || '납품계약서 갑지 생성 실패');
    }
    
  } catch (error) {
    console.error('❌ 납품계약서 갑지 다운로드 실패:', error);
    throw error;
  }
};

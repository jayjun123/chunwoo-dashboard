/**
 * 물량 데이터 공통 유틸리티
 * 견적서, 납품계약서, 기성금청구서에서 공통으로 사용
 */

/**
 * 문서별 셀 매핑 정의
 */
export const DOCUMENT_MAPPINGS = {
  // 견적서: A열(규격), B열(품명)
  estimate: {
    A: 'specification', // A열 - 규격
    B: 'name',          // B열 - 품명
    C: 'unit',          // C열 - 단위
    D: 'quantity',      // D열 - 수량
    E: 'JEprice',       // E열 - 재료비 단가
    F: '',              // F열 - 재료비 금액 (수식)
    G: 'NOprice',       // G열 - 노무비 단가
    H: '',              // H열 - 노무비 금액 (수식)
    I: 'KYprice',       // I열 - 경비 단가
    J: '',              // J열 - 경비 금액 (수식)
    K: 'unitPrice',     // K열 - 합계 단가
    L: '',              // L열 - 합계 금액 (수식)
    M: 'note'           // M열 - 비고
  },
  
  // 납품계약서: A열(규격), B열(품명)
  delivery: {
    A: 'specification', // A열 - 규격
    B: 'name',          // B열 - 품명
    C: 'unit',          // C열 - 단위
    D: 'quantity',      // D열 - 수량
    E: 'price',         // E열 - 단가
    F: 'amount',        // F열 - 금액
    G: 'note'           // G열 - 비고
  },
  
  // 기성금 내역서: A열(규격), B열(품명) - 견적서와 동일한 순서로 수정
  progress: {
    A: 'specification', // A열 - 규격 (견적서와 동일)
    B: 'name',          // B열 - 품명 (견적서와 동일)
    C: 'unit',          // C열 - 단위
    D: 'quantity',      // D열 - 수량
    E: 'JEprice',       // E열 - 재료비 단가
    F: 'NOprice',       // F열 - 노무비 단가
    G: 'KYprice',       // G열 - 경비 단가
    H: 'unitPrice',     // H열 - 합계 단가
    I: 'note',          // I열 - 비고
    J: 'progress',      // J열 - 기성률
    K: 'progressAmount' // K열 - 기성금액
  }
};

/**
 * 물량 데이터를 문서별 형식으로 변환
 * @param {Array} items - 원본 물량 데이터 배열
 * @param {string} documentType - 문서 타입 ('estimate', 'delivery', 'progress')
 * @returns {Array} 변환된 데이터 배열
 */
export const convertMaterialDataForDocument = (items, documentType) => {
  const mapping = DOCUMENT_MAPPINGS[documentType];
  if (!mapping) {
    console.warn('⚠️ 알 수 없는 문서 타입:', documentType);
    return items;
  }
  
  return items.map(item => {
    const converted = {};
    Object.entries(mapping).forEach(([cell, key]) => {
      converted[cell] = item[key];
    });
    return converted;
  });
};

/**
 * 실제 물량 데이터만 필터링 (합계, 부가세 등 제외)
 * @param {Array} items - 전체 물량 데이터
 * @returns {Array} 실제 물량 데이터만
 */
export const filterActualMaterialItems = (items) => {
  return items.filter(item => 
    !item.isTotal && 
    !item.isVat && 
    !item.isTotalWithVat && 
    !item.isAdjustment
  );
};

/**
 * 셀에 데이터 입력 (안전한 방식)
 * @param {Object} worksheet - Excel 워크시트
 * @param {string} cellAddress - 셀 주소 (예: 'A5')
 * @param {*} value - 입력할 값
 * @returns {boolean} 성공 여부
 */
export const setCellValueSafely = (worksheet, cellAddress, value) => {
  try {
    const cell = worksheet.getCell(cellAddress);
    
    // 수식이 있는 셀은 건드리지 않음
    if (cell.formula) {
      console.log(`⚠️ 셀 ${cellAddress} 수식이 있어 건드리지 않음: ${cell.formula}`);
      return false;
    }
    
    // 보호된 셀도 건드리지 않음
    if (cell.protection?.locked) {
      console.log(`⚠️ 셀 ${cellAddress} 보호되어 있어 건드리지 않음`);
      return false;
    }
    
    // 안전한 셀에만 값 설정
    cell.value = value;
    console.log(`✅ 셀 ${cellAddress} 값 설정 성공: ${value}`);
    return true;
  } catch (error) {
    console.warn(`셀 ${cellAddress} 설정 실패:`, error);
    return false;
  }
};

/**
 * 물량 데이터를 워크시트에 입력
 * @param {Object} worksheet - Excel 워크시트
 * @param {Array} items - 물량 데이터 배열
 * @param {string} documentType - 문서 타입
 * @param {number} startRow - 시작 행 번호 (기본값: 5)
 * @returns {number} 마지막 행 번호
 */
export const insertMaterialDataToWorksheet = (worksheet, items, documentType, startRow = 5) => {
  const mapping = DOCUMENT_MAPPINGS[documentType];
  if (!mapping) {
    console.warn('⚠️ 알 수 없는 문서 타입:', documentType);
    return startRow;
  }
  
  let currentRow = startRow;
  
  items.forEach((item, index) => {
    const rowIndex = currentRow + index;
    
    // 각 셀에 데이터 입력
    Object.entries(mapping).forEach(([cell, key]) => {
      const value = item[key];
      if (value !== undefined && value !== null && value !== '') {
        const cellAddress = `${cell}${rowIndex}`;
        setCellValueSafely(worksheet, cellAddress, value);
      }
    });
    
    console.log(`📝 ${rowIndex}행 입력 완료:`, {
      documentType,
      item: Object.fromEntries(
        Object.entries(mapping).map(([cell, key]) => [cell, item[key]])
      )
    });
  });
  
  return currentRow + items.length;
};

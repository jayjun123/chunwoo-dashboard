/**
 * 엑셀 생성 공통 유틸리티
 * 견적서, 납품계약서, 기성금청구서에서 공통으로 사용
 */

/**
 * 단가 데이터를 안전하게 추출하는 함수
 * @param {Object} item - 물량 아이템 객체
 * @param {string} priceType - 단가 타입 ('JE', 'NO', 'KY', 'total')
 * @returns {number} 안전한 단가 값
 */
export const getSafePrice = (item, priceType) => {
  try {
    let price = 0;
    
    // 디버깅을 위한 로그
    console.log(`🔍 getSafePrice 호출 - ${priceType} 타입:`, {
      itemName: item?.name,
      JEprice: item.JEprice,
      NOprice: item.NOprice,
      KYprice: item.KYprice,
      unitPrice: item.unitPrice,
      price: item.price
    });
    
    switch (priceType) {
      case 'JE': // 재료비 단가
        if (item.JEprice !== undefined && item.JEprice !== null && item.JEprice !== '') {
          price = Number(item.JEprice);
        } else if (item.JE프라이스 !== undefined && item.JE프라이스 !== null && item.JE프라이스 !== '') {
          price = Number(item.JE프라이스);
        } else if (item.jePrice !== undefined && item.jePrice !== null && item.jePrice !== '') {
          price = Number(item.jePrice);
        } else if (item.columnE !== undefined && item.columnE !== null && item.columnE !== '') {
          price = Number(item.columnE);
        } else if (item.price !== undefined && item.price !== null && item.price !== '') {
          price = Number(item.price);
        }
        break;
        
      case 'NO': // 노무비 단가
        if (item.NOprice !== undefined && item.NOprice !== null && item.NOprice !== '') {
          price = Number(item.NOprice);
        } else if (item.NO프라이스 !== undefined && item.NO프라이스 !== null && item.NO프라이스 !== '') {
          price = Number(item.NO프라이스);
        } else if (item.noPrice !== undefined && item.noPrice !== null && item.noPrice !== '') {
          price = Number(item.noPrice);
        } else if (item.columnG !== undefined && item.columnG !== null && item.columnG !== '') {
          price = Number(item.columnG);
        } else if (item.price !== undefined && item.price !== null && item.price !== '') {
          price = Number(item.price);
        }
        break;
        
      case 'KY': // 경비 단가
        if (item.KYprice !== undefined && item.KYprice !== null && item.KYprice !== '') {
          price = Number(item.KYprice);
        } else if (item.KY프라이스 !== undefined && item.KY프라이스 !== null && item.KY프라이스 !== '') {
          price = Number(item.KY프라이스);
        } else if (item.kyPrice !== undefined && item.kyPrice !== null && item.kyPrice !== '') {
          price = Number(item.kyPrice);
        } else if (item.columnI !== undefined && item.columnI !== null && item.columnI !== '') {
          price = Number(item.columnI);
        } else if (item.price !== undefined && item.price !== null && item.price !== '') {
          price = Number(item.price);
        }
        break;
        
      case 'total': // 합계 단가
        if (item.unitPrice !== undefined && item.unitPrice !== null && item.unitPrice !== '') {
          price = Number(item.unitPrice);
        } else if (item.price !== undefined && item.price !== null && item.price !== '') {
          price = Number(item.price);
        }
        break;
        
      default:
        price = 0;
    }
    
    // NaN 체크 및 안전 처리
    if (isNaN(price)) {
      price = 0;
    }
    
    console.log(`✅ getSafePrice 결과 - ${priceType} 타입: ${price}`);
    
    return price;
  } catch (error) {
    console.warn(`⚠️ ${priceType} 단가 추출 실패:`, error.message);
    return 0;
  }
};

/**
 * 셀 값을 안전하게 설정하는 함수
 * @param {ExcelJS.Cell} cell - 엑셀 셀 객체
 * @param {any} value - 설정할 값
 */
export const setCellValueSafely = (cell, value) => {
  try {
    if (!cell) return;
    
    // undefined, null 값 처리
    if (value === null || value === undefined) {
      cell.value = '';
      return;
    }
    
    // [object Object] 완전 방지
    if (typeof value === 'object') {
      let safeValue = '';
      try {
        if (value.toString && value.toString() !== '[object Object]') {
          safeValue = value.toString();
        } else if (value.name) {
          safeValue = value.name;
        } else if (value.text) {
          safeValue = value.text;
        } else if (value.value) {
          safeValue = value.value;
        } else {
          safeValue = JSON.stringify(value);
        }
        
        // [object Object]가 포함된 경우 안전한 값으로 교체
        if (safeValue && (safeValue.includes('[object Object]') || safeValue.includes('[object '))) {
          safeValue = '데이터오류';
        }
        
        value = safeValue || '';
      } catch (stringifyError) {
        value = '데이터오류';
      }
    }
    
    // 문자열에 [object Object] 포함된 경우 처리
    else if (typeof value === 'string' && value.includes('[object Object]')) {
      value = '데이터오류';
    }
    
    // 셀 값 설정
    if (cell.formula) {
      // 수식이 있는 경우 value로 설정 (formula 속성은 읽기 전용일 수 있음)
      try {
        cell.value = value;
      } catch (error) {
        // value 설정 실패 시 빈 값으로 초기화
        cell.value = '';
      }
    } else {
      cell.value = value;
    }
    
  } catch (error) {
    console.warn('⚠️ 셀 값 설정 실패:', error.message);
    try {
      cell.value = '오류';
    } catch (fallbackError) {
      console.warn('⚠️ 셀 값 폴백 설정도 실패:', fallbackError.message);
    }
  }
};

/**
 * 물량 데이터 필터링 함수
 * @param {Array} materialItems - 원본 물량 데이터
 * @returns {Array} 필터링된 물량 데이터
 */
export const filterMaterialItems = (materialItems) => {
  if (!materialItems || !Array.isArray(materialItems)) {
    return [];
  }
  
  return materialItems.filter(item => {
    const name = String(item?.name || item?.itemName || '').trim();
    
    // 단수정리는 무조건 포함
    if (name.includes('단수정리')) {
      console.log(`✅ 단수정리 항목 포함: ${name}`);
      return true;
    }
    
    // 소계, 총계, 부가세, 계약금액 관련 항목만 제외 (구분자는 포함)
    const isTotalItem = name.includes('총공사계') || name.includes('총 공사계') || 
                       name.includes('부가세') || name.includes('계약금액') ||
                       name.includes('합계') || name.includes('소계') ||
                       item.isTotal || item.isVat || item.isTotalWithVat;
    
    // 구분자 항목은 포함하고, 소계/총계 항목만 제외
    const shouldInclude = !isTotalItem;
    
    if (shouldInclude) {
      console.log(`✅ 물량 데이터 포함: ${name}`);
    } else {
      console.log(`❌ 항목 제외: ${name} (총계/소계 항목)`);
    }
    
    return shouldInclude;
  });
};

/**
 * 물량 데이터 로깅 함수
 * @param {Object} item - 물량 아이템
 * @param {number} row - 행 번호
 * @param {string} sheetName - 시트 이름
 */
export const logMaterialItem = (item, row, sheetName) => {
  console.log(`🔍 ${sheetName} ${row}행 전체 아이템 데이터:`, JSON.stringify(item, null, 2));
  
  const jePrice = getSafePrice(item, 'JE');
  const noPrice = getSafePrice(item, 'NO');
  const kyPrice = getSafePrice(item, 'KY');
  const totalPrice = getSafePrice(item, 'total');
  
  console.log(`🔍 ${sheetName} ${row}행 단가 요약:`, {
    JE프라이스: jePrice,
    NO프라이스: noPrice,
    KY프라이스: kyPrice,
    합계단가: totalPrice
  });
};

/**
 * 엑셀 셀 안전성 검사 및 정리 함수
 * @param {ExcelJS.Worksheet} sheet - 엑셀 시트
 * @param {string} sheetName - 시트 이름
 */
export const cleanSheetData = (sheet, sheetName) => {
  try {
    console.log(`🧹 ${sheetName} 시트 데이터 정리 시작...`);
    
    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        try {
          if (cell && cell.value !== null && cell.value !== undefined) {
            // 1. 객체 타입 값 강제 변환
            if (typeof cell.value === 'object') {
              console.log(`🔧 ${sheetName} ${rowNumber}행 ${colNumber}열 Object 값 발견: ${cell.value}`);
              
              let safeValue = '';
              try {
                if (cell.value.toString && cell.value.toString() !== '[object Object]') {
                  safeValue = cell.value.toString();
                } else if (cell.value.name) {
                  safeValue = cell.value.name;
                } else if (cell.value.text) {
                  safeValue = cell.value.text;
                } else if (cell.value.value) {
                  safeValue = cell.value.value;
                } else {
                  safeValue = JSON.stringify(cell.value);
                }
                
                // [object Object]가 포함된 경우 안전한 값으로 교체
                if (safeValue.includes('[object Object]') || safeValue.includes('[object ')) {
                  safeValue = '데이터오류';
                }
                
                setCellValueSafely(cell, safeValue);
              } catch (stringifyError) {
                setCellValueSafely(cell, '데이터오류');
              }
            }
            
            // 2. 문자열에 [object Object] 포함된 경우 처리
            else if (typeof cell.value === 'string' && cell.value.includes('[object Object]')) {
              console.log(`🔧 ${sheetName} ${rowNumber}행 ${colNumber}열 [object Object] 문자열 정리: ${cell.value}`);
              setCellValueSafely(cell, '데이터오류');
            }
          }
        } catch (cellError) {
          console.warn(`⚠️ ${sheetName} ${rowNumber}행 ${colNumber}열 검사 실패:`, cellError.message);
        }
      });
    });
    
    console.log(`✅ ${sheetName} 시트 데이터 정리 완료`);
  } catch (error) {
    console.warn(`⚠️ ${sheetName} 시트 데이터 정리 실패:`, error.message);
  }
};

/**
 * 견적서 스타일 물량 데이터 입력 함수 (공통) - 수식 건드리지 않음
 * @param {ExcelJS.Worksheet} sheet - 엑셀 시트
 * @param {Array} materialItems - 물량 데이터
 * @param {number} startRow - 시작 행 번호
 * @param {string} sheetName - 시트 이름
 */
export const fillEstimateStyleData = (sheet, materialItems, startRow = 5, sheetName = '견적서') => {
  try {
    console.log(`📋 ${sheetName} 스타일 물량 데이터 입력 시작 (${startRow}행부터)`);
    
    if (!materialItems || !Array.isArray(materialItems) || materialItems.length === 0) {
      console.log('⚠️ 물량 데이터가 없습니다.');
      return;
    }
    
    // 필요한 행 확보
    const requiredRows = startRow + materialItems.length - 1;
    const lastRow = sheet.rowCount;
    if (requiredRows > lastRow) {
      const rowsToAdd = requiredRows - lastRow;
      for (let i = 0; i < rowsToAdd; i++) {
        sheet.spliceRows(lastRow + i, 0, []);
      }
      console.log(`✅ ${rowsToAdd}개 행 추가 완료`);
    }
    
    // 필터링된 물량 데이터
    const filteredItems = filterMaterialItems(materialItems);
    console.log(`📊 필터링된 물량 데이터: ${filteredItems.length}개`);
    
    filteredItems.forEach((item, index) => {
      const row = startRow + index;
      
      try {
        // 🛡️ 단가 데이터 완벽 매칭 및 안전 처리
        logMaterialItem(item, row, sheetName);
        
        // A열: 품명, B열: 규격, C열: 단위, D열: 수량
        sheet.getCell(`A${row}`).value = item?.name || item?.itemName || '';
        sheet.getCell(`B${row}`).value = item.specification || item.spec || '';
        sheet.getCell(`C${row}`).value = item.unit || '';
        
        // D열: 수량 (소수점 2째자리, 오른쪽 정렬)
        const dCell = sheet.getCell(`D${row}`);
        dCell.value = Number(item.quantity || item.qty || 0).toFixed(2);
        dCell.alignment = { horizontal: 'right' };
        
        // 단수정리 특별 처리
        if (item?.name === '단수정리') {
          console.log(`🔧 ${row}행 단수정리 특별 처리 (기성금청구서 방식)`);
          
          // 기성금청구서 방식: amount/quantity로 단가 계산
          const totalAmount = item.amount && item.quantity ? item.amount / item.quantity : 0;
          console.log(`📊 단수정리 단가 계산: ${item.amount} / ${item.quantity} = ${totalAmount}`);
          
          // E열: 재료비단가 (기성금청구서 방식으로 계산된 단가 사용)
          setCellValueSafely(sheet.getCell(`E${row}`), totalAmount);
          
          // G열: 노무비단가 (0으로 설정)
          setCellValueSafely(sheet.getCell(`G${row}`), 0);
          
          // I열: 경비단가 (0으로 설정)
          setCellValueSafely(sheet.getCell(`I${row}`), 0);
          
          // K열: 수식 유지 (건드리지 않음) - E+G+I
          console.log(`📝 ${row}행 K열 수식 유지: E+G+I`);
          
          // F, H, J, L열은 수식 유지 (건드리지 않음)
          console.log(`✅ ${row}행 단수정리 완료: 기성금청구서 방식 적용`);
        } else {
          // 일반 물량 데이터 처리
          
          // E열: 재료비단가 (JE프라이스) - 단가만 입력
          const jePrice = getSafePrice(item, 'JE');
          setCellValueSafely(sheet.getCell(`E${row}`), jePrice);
          
          // F열: 수식 유지 (건드리지 않음) - D*E
          console.log(`📝 ${row}행 F열 수식 유지: D*E`);
          
          // G열: 노무비단가 (NO프라이스) - 단가만 입력
          const noPrice = getSafePrice(item, 'NO');
          setCellValueSafely(sheet.getCell(`G${row}`), noPrice);
          
          // H열: 수식 유지 (건드리지 않음) - D*G
          console.log(`📝 ${row}행 H열 수식 유지: D*G`);
          
          // I열: 경비단가 (KY프라이스) - 단가만 입력
          const kyPrice = getSafePrice(item, 'KY');
          setCellValueSafely(sheet.getCell(`I${row}`), kyPrice);
          
          // J열: 수식 유지 (건드리지 않음) - D*I
          console.log(`📝 ${row}행 J열 수식 유지: D*I`);
          
          // K열: 수식 유지 (건드리지 않음) - E+G+I
          console.log(`📝 ${row}행 K열 수식 유지: E+G+I`);
          
          // L열: 수식 유지 (건드리지 않음) - D*K
          console.log(`📝 ${row}행 L열 수식 유지: D*K`);
          
          // M열: 비고 (비워둠)
          sheet.getCell(`M${row}`).value = '';
          
          console.log(`✅ ${row}행 물량데이터 입력 완료 (수식 유지)`);
        }
        
      } catch (e) {
        console.log(`⚠️ ${row}행 데이터 입력 실패:`, e.message);
      }
    });
    
    console.log(`✅ ${sheetName} 스타일 물량 데이터 입력 완료`);
    
  } catch (error) {
    console.error(`❌ ${sheetName} 스타일 물량 데이터 입력 실패:`, error);
  }
};

/**
 * 납품계약서 스타일 물량 데이터 입력 함수 (공통) - 수식 건드리지 않음
 * @param {ExcelJS.Worksheet} sheet - 엑셀 시트
 * @param {Array} materialItems - 물량 데이터
 * @param {number} startRow - 시작 행 번호
 * @param {string} sheetName - 시트 이름
 */
export const fillContractStyleData = (sheet, materialItems, startRow = 5, sheetName = '납품계약서') => {
  try {
    console.log(`📋 ${sheetName} 스타일 물량 데이터 입력 시작 (${startRow}행부터)`);
    
    if (!materialItems || !Array.isArray(materialItems) || materialItems.length === 0) {
      console.log('⚠️ 물량 데이터가 없습니다.');
      return;
    }
    
    // 필요한 행 확보
    const requiredRows = startRow + materialItems.length - 1;
    const lastRow = sheet.rowCount;
    if (requiredRows > lastRow) {
      const rowsToAdd = requiredRows - lastRow;
      for (let i = 0; i < rowsToAdd; i++) {
        sheet.spliceRows(lastRow + i, 0, []);
      }
      console.log(`✅ ${rowsToAdd}개 행 추가 완료`);
    }
    
    // 필터링된 물량 데이터
    const filteredItems = filterMaterialItems(materialItems);
    console.log(`📊 필터링된 물량 데이터: ${filteredItems.length}개`);
    
    filteredItems.forEach((item, index) => {
      const row = startRow + index;
      
      try {
        // 🛡️ 단가 데이터 완벽 매칭 및 안전 처리
        logMaterialItem(item, row, sheetName);
        
        // A열: 규격, B열: 이름, C열: 단위, D열: 수량
        sheet.getCell(`A${row}`).value = item.specification || item.spec || '';
        sheet.getCell(`B${row}`).value = item?.name || item?.itemName || '';
        sheet.getCell(`C${row}`).value = item.unit || '';
        
        // D열: 수량 (소수점 2째자리, 오른쪽 정렬)
        const dCell = sheet.getCell(`D${row}`);
        dCell.value = Number(item.quantity || item.qty || 0).toFixed(2);
        dCell.alignment = { horizontal: 'right' };
        
        // 단수정리 특별 처리 (기성금청구서 방식 적용)
        if (item?.name === '단수정리') {
          console.log(`🔧 ${row}행 단수정리 특별 처리 (기성금청구서 방식)`);
          
          // 기성금청구서 방식: amount/quantity로 단가 계산
          const totalAmount = item.amount && item.quantity ? item.amount / item.quantity : 0;
          console.log(`📊 단수정리 단가 계산: ${item.amount} / ${item.quantity} = ${totalAmount}`);
          
          // E열: 재료비단가 (기성금청구서 방식으로 계산된 단가 사용)
          setCellValueSafely(sheet.getCell(`E${row}`), totalAmount);
          
          // G열: 노무비단가 (0으로 설정)
          setCellValueSafely(sheet.getCell(`G${row}`), 0);
          
          // I열: 경비단가 (0으로 설정)
          setCellValueSafely(sheet.getCell(`I${row}`), 0);
          
          // K열: 수식 유지 (건드리지 않음) - E+G+I
          console.log(`📝 ${row}행 K열 수식 유지: E+G+I`);
          
          // F, H, J, L열은 수식 유지 (건드리지 않음)
          console.log(`✅ ${row}행 단수정리 완료: 기성금청구서 방식 적용`);
        } else {
          // 일반 물량 데이터 처리
          
          // E열: 재료비단가 (JE프라이스) - 단가만 입력
          const jePrice = getSafePrice(item, 'JE');
          setCellValueSafely(sheet.getCell(`E${row}`), jePrice);
          
          // F열: 수식 유지 (건드리지 않음) - D*E
          console.log(`📝 ${row}행 F열 수식 유지: D*E`);
          
          // G열: 노무비단가 (NO프라이스) - 단가만 입력
          const noPrice = getSafePrice(item, 'NO');
          setCellValueSafely(sheet.getCell(`G${row}`), noPrice);
          
          // H열: 수식 유지 (건드리지 않음) - D*G
          console.log(`📝 ${row}행 H열 수식 유지: D*G`);
          
          // I열: 경비단가 (KY프라이스) - 단가만 입력
          const kyPrice = getSafePrice(item, 'KY');
          setCellValueSafely(sheet.getCell(`I${row}`), kyPrice);
          
          // J열: 수식 유지 (건드리지 않음) - D*I
          console.log(`📝 ${row}행 J열 수식 유지: D*I`);
          
          // K열: 수식 유지 (건드리지 않음) - E+G+I
          console.log(`📝 ${row}행 K열 수식 유지: E+G+I`);
          
          // L열: 수식 유지 (건드리지 않음) - D*K
          console.log(`📝 ${row}행 L열 수식 유지: D*K`);
          
          // M열: 비고 (비워둠)
          sheet.getCell(`M${row}`).value = '';
          
          console.log(`✅ ${row}행 물량데이터 입력 완료 (수식 유지)`);
        }
        
      } catch (e) {
        console.log(`⚠️ ${row}행 데이터 입력 실패:`, e.message);
      }
    });
    
    console.log(`✅ ${sheetName} 스타일 물량 데이터 입력 완료`);
    
  } catch (error) {
    console.error(`❌ ${sheetName} 스타일 물량 데이터 입력 실패:`, error);
  }
};

/**
 * 셀을 진짜 빈칸으로 (빈 문자열 '' 금지 — 수식 #VALUE! 유발)
 */
export function clearExcelCell(cell) {
  if (!cell) return;
  try {
    // 수식·공유수식·값 모두 제거
    cell.value = null;
  } catch (_) {
    try {
      cell.value = undefined;
    } catch (__) { /* ignore */ }
  }
}

/**
 * 행 전체가 비어 있는지 (수량이 0이어도 "값 있음"으로 봄)
 */
function isBlankCellValue(value) {
  return value === null || value === undefined || value === '';
}

/**
 * 기성 내역서: 데이터 없는 행은 A~M 전부 빈칸(수식 제거).
 * 품명만 있는 분류 행도 F~M 수식은 제거해 #VALUE! → 합계 전파를 막음.
 */
export function blankUnusedGisungDetailRows(sheet, startRow, maxDataRow, filledCount) {
  if (!sheet) return;
  const lastFilledRow = startRow + Math.max(filledCount, 0) - 1;

  for (let row = startRow; row <= maxDataRow; row++) {
    const cellA = sheet.getCell(row, 1);
    const cellB = sheet.getCell(row, 2);
    const cellC = sheet.getCell(row, 3);
    const cellD = sheet.getCell(row, 4);
    const cellE = sheet.getCell(row, 5);

    const hasName = !isBlankCellValue(cellA.value) || !isBlankCellValue(cellB.value);
    const hasUnit = !isBlankCellValue(cellC.value);
    // 숫자 0은 유효한 수량
    const hasQty =
      typeof cellD.value === 'number' ||
      (cellD.value != null && cellD.value !== '' && !Number.isNaN(Number(cellD.value)));
    const hasPrice =
      typeof cellE.value === 'number' ||
      (cellE.value != null && cellE.value !== '' && !Number.isNaN(Number(cellE.value)));

    const beyondData = row > lastFilledRow;
    const noMeasurable = !hasUnit && !hasQty && !hasPrice;

    if (beyondData || (!hasName && noMeasurable)) {
      // 완전 빈 행: A~M 수식·값 전부 제거
      for (let col = 1; col <= 13; col++) {
        clearExcelCell(sheet.getCell(row, col));
      }
      continue;
    }

    if (hasName && noMeasurable) {
      // 분류 행(A동, 유리공사 등): 품명·규격만 두고 C~M은 빈칸 (수식 제거)
      for (let col = 3; col <= 13; col++) {
        clearExcelCell(sheet.getCell(row, col));
      }
      // A/B에 실수로 ''가 들어갔으면 유지, 숫자 셀은 건드리지 않음
    }
  }
}

/**
 * 기성금 스타일 물량 데이터 입력 함수 (공통)
 * @param {ExcelJS.Worksheet} sheet - 엑셀 시트
 * @param {Array} materialItems - 물량 데이터
 * @param {number} startRow - 시작 행 번호
 * @param {string} sheetName - 시트 이름
 */
export const fillGisungStyleData = (sheet, materialItems, startRow = 6, sheetName = '기성금') => {
  try {
    console.log(`📋 ${sheetName} 스타일 물량 데이터 입력 시작 (${startRow}행부터)`);
    
    if (!materialItems || !Array.isArray(materialItems) || materialItems.length === 0) {
      console.log('⚠️ 물량 데이터가 없습니다.');
      return;
    }
    
    // 필터링된 물량 데이터 (계약서 자동계산 항목 제외, 단수정리는 포함)
    const filteredItems = materialItems.filter(item => 
      !item.isTotal && !item.isVat && !item.isTotalWithVat
    );
    
    console.log(`📊 필터링된 물량 데이터: ${filteredItems.length}개`);
    
    // 기존 데이터 행들 정리 (21개 이상이면 LONG 범위)
    const maxDataRow = filteredItems.length <= 20 ? 25 : 50;
    for (let row = startRow; row <= maxDataRow; row++) {
      for (let col = 1; col <= 13; col++) {
        // 입력 전 행을 깨끗이 (잔여 '' / 깨진 수식 제거) — 합계 행은 maxDataRow 밖
        clearExcelCell(sheet.getCell(row, col));
      }
    }
    
    // 새로운 데이터 입력
    const maxInputRow = filteredItems.length <= 20 ? 25 : 50;
    for (let index = 0; index < filteredItems.length && (index + startRow) <= maxInputRow; index++) {
      const item = filteredItems[index];
      const rowNumber = index + startRow;
      
      try {
        const name = item?.name != null ? String(item.name) : '';
        const spec = item?.specification != null ? String(item.specification) : '';
        const unit = item?.unit != null && item.unit !== '' ? String(item.unit) : null;

        let quantity = null;
        if (item?.quantity !== null && item?.quantity !== undefined && item?.quantity !== '') {
          const q = Number(item.quantity);
          quantity = Number.isFinite(q) ? q : null;
        }

        let unitPrice = null;
        if (item?.name === '단수정리') {
          if (item.amount != null && quantity) {
            unitPrice = Number(item.amount) / quantity;
          } else if (item.unitPrice != null || item.price != null) {
            unitPrice = Number(item.unitPrice ?? item.price);
          }
        } else if (item.amount != null && quantity) {
          unitPrice = Number(item.amount) / quantity;
        } else if (item.price != null || item.unitPrice != null) {
          unitPrice = Number(item.price ?? item.unitPrice);
        }
        if (unitPrice != null && !Number.isFinite(unitPrice)) unitPrice = null;

        // 분류 행(단위·수량·단가 없음): 품명만 넣고 수식 열은 비움
        const isCategoryOnly = !unit && quantity == null && unitPrice == null;

        sheet.getCell(rowNumber, 1).value = name || null;
        sheet.getCell(rowNumber, 2).value = spec || null;

        if (isCategoryOnly) {
          for (let col = 3; col <= 13; col++) {
            clearExcelCell(sheet.getCell(rowNumber, col));
          }
        } else {
          sheet.getCell(rowNumber, 3).value = unit;
          sheet.getCell(rowNumber, 4).value = quantity;
          sheet.getCell(rowNumber, 5).value = unitPrice;
          // F~M: 템플릿 수식을 다시 넣음 (위에서 지웠으므로)
          sheet.getCell(rowNumber, 6).value = { formula: `D${rowNumber}*E${rowNumber}` };
          sheet.getCell(rowNumber, 8).value = { formula: `G${rowNumber}*E${rowNumber}` };
          sheet.getCell(rowNumber, 10).value = { formula: `E${rowNumber}*I${rowNumber}` };
          sheet.getCell(rowNumber, 11).value = { formula: `G${rowNumber}+I${rowNumber}` };
          sheet.getCell(rowNumber, 12).value = { formula: `H${rowNumber}+J${rowNumber}` };
          sheet.getCell(rowNumber, 13).value = {
            formula: `IF(OR(F${rowNumber}=0,F${rowNumber}=""),"",L${rowNumber}/F${rowNumber})`,
          };
          // G, I는 입력값(전회/금회 수량) — 비우면 진짜 빈칸
          clearExcelCell(sheet.getCell(rowNumber, 7));
          clearExcelCell(sheet.getCell(rowNumber, 9));
        }
        
      } catch (e) {
        console.warn(`⚠️ 행 ${rowNumber} 데이터 입력 실패:`, e.message);
      }
    }

    // 데이터 끝난 뒤~maxDataRow 까지 잔여 행 완전 빈칸
    blankUnusedGisungDetailRows(sheet, startRow, maxDataRow, filteredItems.length);
    
    console.log(`✅ ${sheetName} 스타일 물량 데이터 입력 완료`);
    
  } catch (error) {
    console.error(`❌ ${sheetName} 스타일 물량 데이터 입력 실패:`, error);
  }
};

/**
 * 빈 행 정리 함수 (공통)
 * @param {ExcelJS.Worksheet} sheet - 엑셀 시트
 * @param {number} startRow - 시작 행 번호
 * @param {string} sheetName - 시트 이름
 */
export const cleanEmptyRows = (sheet, startRow, sheetName) => {
  try {
    console.log(`🧹 ${sheetName} 빈 행 정리 시작...`);
    
    const totalRows = sheet.rowCount;
    for (let r = startRow; r <= totalRows; r++) {
      const hasBase = ['A','B','C','D'].some(col => {
        const v = sheet.getCell(`${col}${r}`).value;
        return v !== null && v !== undefined && v !== '';
      });
      
      if (!hasBase) {
        ['E','F','G','H','I','J','K','L','M'].forEach(col => {
          const cell = sheet.getCell(`${col}${r}`);
          if (cell.formula) {
            cell.value = '';
          } else if (cell.value !== null && cell.value !== undefined) {
            cell.value = '';
          }
        });
      }
    }
    
    console.log(`✅ ${sheetName} 빈 행 정리 완료`);
  } catch (error) {
    console.warn(`⚠️ ${sheetName} 빈 행 정리 실패:`, error.message);
  }
};

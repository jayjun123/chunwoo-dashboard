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
    
    // [object Object] 완전 방지
    if (value !== null && value !== undefined) {
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
          if (safeValue.includes('[object Object]') || safeValue.includes('[object ')) {
            safeValue = '데이터오류';
          }
          
          value = safeValue;
        } catch (stringifyError) {
          value = '데이터오류';
        }
      }
      
      // 문자열에 [object Object] 포함된 경우 처리
      else if (typeof value === 'string' && value.includes('[object Object]')) {
        value = '데이터오류';
      }
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
    
    // 총계, 부가세, 계약금액 관련 항목 제외
    const isTotalItem = name.includes('총공사계') || name.includes('총 공사계') || 
                       name.includes('부가세') || name.includes('계약금액') ||
                       name.includes('합계') || name.includes('소계') ||
                       item.isTotal || item.isVat || item.isTotalWithVat;
    
    // 실제 물량 데이터만 포함 (단수정리 제외한 총계 항목들)
    const shouldInclude = !isTotalItem;
    
    if (shouldInclude) {
      console.log(`✅ 물량 데이터 포함: ${name}`);
    } else {
      console.log(`❌ 총계 항목 제외: ${name}`);
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
        
        // A열: 규격, B열: 품명, C열: 단위, D열: 수량
        sheet.getCell(`A${row}`).value = item.specification || item.spec || '';
        sheet.getCell(`B${row}`).value = item?.name || item?.itemName || '';
        sheet.getCell(`C${row}`).value = item.unit || '';
        
        // D열: 수량 (소수점 2째자리, 오른쪽 정렬)
        const dCell = sheet.getCell(`D${row}`);
        dCell.value = Number(item.quantity || item.qty || 0).toFixed(2);
        dCell.alignment = { horizontal: 'right' };
        
        // 단수정리 특별 처리
        if (item?.name === '단수정리') {
          console.log(`🔧 ${row}행 단수정리 특별 처리`);
          
          // 단수정리의 경우 수량을 그대로 유지 (음수 값도 허용)
          const quantity = item.quantity || item.qty || 0;
          console.log(`📊 단수정리 수량: ${quantity}`);
          
          // 단수정리도 일반 물량 데이터와 마찬가지로 단가 정보 입력
          // E열: 재료비단가 (JE프라이스)
          const jePrice = getSafePrice(item, 'JE');
          setCellValueSafely(sheet.getCell(`E${row}`), jePrice);
          
          // G열: 노무비단가 (NO프라이스)
          const noPrice = getSafePrice(item, 'NO');
          setCellValueSafely(sheet.getCell(`G${row}`), noPrice);
          
          // I열: 경비단가 (KY프라이스)
          const kyPrice = getSafePrice(item, 'KY');
          setCellValueSafely(sheet.getCell(`I${row}`), kyPrice);
          
          // K열: 수식 유지 (건드리지 않음) - E+G+I
          console.log(`📝 ${row}행 K열 수식 유지: E+G+I`);
          
          // F, H, J, L열은 수식 유지 (건드리지 않음)
          console.log(`✅ ${row}행 단수정리 완료: 수량(${quantity}), 단가정보 입력 완료`);
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
          
          // M열: 비고
          sheet.getCell(`M${row}`).value = item.note || item.remark || '';
          
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
        
        // A열: 이름, B열: 규격, C열: 단위, D열: 수량
        sheet.getCell(`A${row}`).value = item?.name || item?.itemName || '';
        sheet.getCell(`B${row}`).value = item.specification || item.spec || '';
        sheet.getCell(`C${row}`).value = item.unit || '';
        
        // D열: 수량 (소수점 2째자리, 오른쪽 정렬)
        const dCell = sheet.getCell(`D${row}`);
        dCell.value = Number(item.quantity || item.qty || 0).toFixed(2);
        dCell.alignment = { horizontal: 'right' };
        
        // 단수정리 특별 처리
        if (item?.name === '단수정리') {
          console.log(`🔧 ${row}행 단수정리 특별 처리`);
          
          // 단수정리도 일반 물량 데이터와 마찬가지로 단가 정보 입력
          // E열: 재료비단가 (JE프라이스)
          const jePrice = getSafePrice(item, 'JE');
          setCellValueSafely(sheet.getCell(`E${row}`), jePrice);
          
          // G열: 노무비단가 (NO프라이스)
          const noPrice = getSafePrice(item, 'NO');
          setCellValueSafely(sheet.getCell(`G${row}`), noPrice);
          
          // I열: 경비단가 (KY프라이스)
          const kyPrice = getSafePrice(item, 'KY');
          setCellValueSafely(sheet.getCell(`I${row}`), kyPrice);
          
          // K열: 수식 유지 (건드리지 않음) - E+G+I
          console.log(`📝 ${row}행 K열 수식 유지: E+G+I`);
          
          // F, H, J, L열은 수식 유지 (건드리지 않음)
          console.log(`✅ ${row}행 단수정리 완료: 단가정보 입력 완료`);
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
          
          // M열: 비고
          sheet.getCell(`M${row}`).value = item.note || item.remark || '';
          
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
    
    // 기존 데이터 행들 정리
    const maxDataRow = materialItems.length <= 20 ? 25 : 50;
    for (let row = startRow; row <= maxDataRow; row++) {
      for (let col = 1; col <= 5; col++) { // A, B, C, D, E열만
        const cell = sheet.getCell(row, col);
        cell.value = '';
      }
    }
    
    // 새로운 데이터 입력
    const maxInputRow = materialItems.length <= 20 ? 25 : 50;
    for (let index = 0; index < filteredItems.length && (index + startRow) <= maxInputRow; index++) {
      const item = filteredItems[index];
      const rowNumber = index + startRow;
      
      try {
        // 단수정리 항목 특별 처리
        let unitPrice = item.price || item.unitPrice || 0;
        if (item?.name === '단수정리') {
          console.log(`🔧 기성금청구서 단수정리 특별 처리 (${rowNumber}행)`);
          // 단수정리의 경우 unitPrice 또는 JEprice 사용
          unitPrice = item.unitPrice || item.JEprice || item.price || 0;
          console.log(`📊 단수정리 단가: ${unitPrice} (unitPrice: ${item.unitPrice}, JEprice: ${item.JEprice}, price: ${item.price})`);
        }
        
        const cells = [
          { col: 1, value: item?.name || '' }, // A열: 품명
          { col: 2, value: item.specification || '' }, // B열: 규격
          { col: 3, value: item.unit || '' }, // C열: 단위
          { col: 4, value: item.quantity || 0 }, // D열: 수량
          { col: 5, value: unitPrice } // E열: 단가
        ];
        
        cells.forEach(({ col, value }) => {
          const cell = sheet.getCell(rowNumber, col);
          cell.value = value;
        });
        
      } catch (e) {
        console.warn(`⚠️ 행 ${rowNumber} 데이터 입력 실패:`, e.message);
      }
    }
    
    // 단수정리 항목 처리
    const dansooItem = materialItems.find(item => item?.name === '단수정리');
    if (dansooItem) {
      try {
        const summaryStartRow = materialItems.length <= 20 ? 26 : 51;
        const cells = [
          { col: 1, value: dansooItem?.name || '' }, // A열: 품명
          { col: 2, value: dansooItem.specification || '' }, // B열: 규격
          { col: 3, value: dansooItem.unit || '' }, // C열: 단위
          { col: 4, value: dansooItem.quantity || 0 }, // D열: 수량
          { col: 5, value: dansooItem.price || 0 } // E열: 단가
        ];
        cells.forEach(({ col, value }) => {
          const cell = sheet.getCell(summaryStartRow, col);
          cell.value = value;
        });
        console.log(`✅ 단수정리 항목 입력 완료: 행 ${summaryStartRow}`);
      } catch (e) {
        console.warn('⚠️ 단수정리 항목 입력 실패:', e.message);
      }
    }
    
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

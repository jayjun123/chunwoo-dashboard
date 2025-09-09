import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { filterActualMaterialItems, insertMaterialDataToWorksheet, convertMaterialDataForDocument } from './materialDataUtils';
import { getSafePrice, setCellValueSafely as setCellValueSafelyCommon, filterMaterialItems, logMaterialItem, cleanSheetData, fillEstimateStyleData, cleanEmptyRows } from './excelCommonUtils';
import { templateUrls, templateDescriptions } from './templateUrls';

/**
 * aria-hidden 문제 해결 함수
 * 포커스 가능한 요소가 있는 경우 aria-hidden 제거
 */
const fixAriaHiddenIssues = () => {
  try {
    console.log('🔧 aria-hidden 문제 해결 시작');
    
    // root 요소에서 aria-hidden 제거
    const rootElement = document.getElementById('root');
    if (rootElement && rootElement.hasAttribute('aria-hidden')) {
      console.log('🔧 root 요소에서 aria-hidden 제거');
      rootElement.removeAttribute('aria-hidden');
    }
    
    // 포커스 가능한 요소가 있는 모든 aria-hidden 요소 찾기
    const ariaHiddenElements = document.querySelectorAll('[aria-hidden="true"]');
    let fixedCount = 0;
    
    ariaHiddenElements.forEach(element => {
      // 포커스 가능한 하위 요소가 있는지 확인
      const focusableDescendants = element.querySelectorAll(
        'button, input, select, textarea, [tabindex], [contenteditable="true"]'
      );
      
      if (focusableDescendants.length > 0) {
        console.log(`🔧 aria-hidden 제거: ${element.tagName} (포커스 가능한 하위 요소 ${focusableDescendants.length}개)`);
        element.removeAttribute('aria-hidden');
        fixedCount++;
      }
    });
    
    console.log(`✅ aria-hidden 문제 해결 완료: ${fixedCount}개 요소 수정`);
  } catch (error) {
    console.warn('⚠️ aria-hidden 문제 해결 중 오류:', error.message);
  }
};

/**
 * Shared Formula 문제 완전 해결 함수 (K27, K19, F7 등 모든 문제 셀 해결)
 * @param {ExcelJS.Workbook} workbook - 워크북
 */
const fixAllSharedFormulaIssues = (workbook) => {
  try {
    console.log('🔧 Shared Formula 문제 완전 해결 시작');
    
    workbook.worksheets.forEach((sheet, index) => {
      // sheet 객체 유효성 검사
      if (!sheet || typeof sheet !== 'object') {
        console.error(`❌ 시트 ${index}가 유효하지 않습니다:`, sheet);
        return; // 건너뛰기
      }
      
      // sheet.name 안전성 검사
      const sheetName = sheet?.name || `Sheet${index + 1}`;
      console.log(`🔧 ${sheetName} 시트 Shared Formula 문제 해결`);
      
      let fixedCells = 0;
      let problemCells = [];
      
      // 모든 셀에서 Shared Formula 속성 제거 (개별 셀 지정 방식 제거)
        console.log(`🔍 ${sheetName} 시트 전체 Shared Formula 속성 제거 시작...`);
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
        console.log(`✅ ${sheetName} 시트 Shared Formula 속성 제거 완료: ${removedCount}개 셀`);
        fixedCells = removedCount;
        problemCells.push(`전체 ${removedCount}개 셀`);
      }
      
        console.log(`\n📊 ${sheetName} 시트 해결 완료:`);
      console.log(`   - 해결된 문제 셀: ${fixedCells}개`);
      console.log(`   - 문제 셀 목록: ${problemCells.join(', ')}`);
    });
    
    console.log('✅ Shared Formula 문제 완전 해결 완료');
  } catch (error) {
    console.warn('⚠️ Shared Formula 문제 해결 중 오류:', error.message);
  }
};

/**
 * 안전한 셀 값 설정 함수 (ExcelJS 호환성 문제 해결)
 * @param {Object} cell - ExcelJS 셀 객체
 * @param {*} value - 설정할 값
 * @param {string} formula - 설정할 수식 (선택사항)
 * @returns {boolean} 성공 여부
 */
const setCellValueSafely = (cell, value, formula = null) => {
  try {
    if (!cell) {
      console.warn('⚠️ 셀 객체가 null입니다.');
      return false;
    }

    // 값 설정
    if (value !== null && value !== undefined) {
      if (typeof value === 'object') {
        // 객체인 경우 문자열로 변환
        try {
          cell.value = JSON.stringify(value);
        } catch (jsonError) {
          cell.value = String(value);
        }
      } else {
        cell.value = value;
      }
    } else {
      cell.value = '';
    }

    // 수식 설정 (제공된 경우)
    if (formula) {
      try {
        cell.formula = formula;
      } catch (formulaError) {
        console.warn('⚠️ 수식 설정 실패:', formulaError.message);
      }
    }

    return true;
  } catch (error) {
    console.warn('⚠️ 셀 값 설정 실패:', error.message);
    
    // 폴백: 기본값 설정
    try {
      cell.value = value || '';
      return true;
    } catch (fallbackError) {
      console.warn('⚠️ 셀 값 폴백 설정도 실패:', fallbackError.message);
      return false;
    }
  }
};

/**
 * 견적서 엑셀 파일에서 물량 데이터를 파싱하는 함수
 * 두 번째 시트(내역서)에서 A,B,C,D,E,G,I,M:5~쭉쭉 가다가 [ 총 공 사 금 액 ]이 나오는 행 바로 전까지 데이터 추출
 */
export const parseEstimateExcel = async (file, siteId, siteName) => {
  try {
    console.log('📊 견적서 엑셀 파싱 시작:', { siteId, siteName });
    
         const arrayBuffer = await file.arrayBuffer();
     
     // ExcelJS를 사용하여 수식과 값을 모두 읽음 (Shared Formula 문제 방지)
     const workbook = new ExcelJS.Workbook();
     await workbook.xlsx.load(arrayBuffer, {
       sharedFormula: false,  // Shared Formula 비활성화
       ignoreNodes: ['sharedFormula'], // Shared Formula 노드 무시
       ignoreStyles: false,   // 스타일은 유지
       ignoreDataValidations: false, // 데이터 검증은 유지
       ignoreConditionalFormats: false // 조건부 서식은 유지
     });
     
     // 두 번째 시트 찾기 (내역서)
     const sheetNames = workbook.worksheets.map((sheet, index) => {
       if (!sheet || typeof sheet !== 'object') {
         console.warn(`⚠️ 시트 ${index}가 유효하지 않음, 기본 이름 사용`);
         return `Sheet${index + 1}`;
       }
       return sheet?.name || `Sheet${index + 1}`;
     });
     if (sheetNames.length < 2) {
       throw new Error('내역서 시트를 찾을 수 없습니다. 최소 2개의 시트가 필요합니다.');
     }
     
     const detailSheetName = sheetNames[1]; // 두 번째 시트
     console.log('📋 내역서 시트명:', detailSheetName);
     
     const worksheet = workbook.getWorksheet(detailSheetName);
     if (!worksheet) {
       throw new Error('내역서 시트를 읽을 수 없습니다.');
     }
     
     console.log('✅ ExcelJS로 내역서 시트 로드 완료');
     
     // 시트 데이터를 2차원 배열로 변환 (수식과 값 모두 포함)
     const data = [];
     
     // 시트의 모든 행과 열을 순회
     for (let row = 1; row <= worksheet.rowCount; row++) {
       const rowData = [];
       
       for (let col = 1; col <= worksheet.columnCount; col++) {
         try {
           const cell = worksheet.getCell(row, col);
           
           // 셀의 값과 수식 정보 추출 (수식 계산 오류 방지)
           let cellValue = '';
           
           if (cell.formula) {
             try {
               // 수식이 있는 경우: 계산된 결과값 우선 사용
               let calculatedValue = null;
               
               // 1. result 값이 있으면 사용 (가장 안전)
               if (cell.result !== null && cell.result !== undefined && cell.result !== '') {
                 calculatedValue = cell.result;
               }
               // 2. value 값이 있으면 사용
               else if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
                 calculatedValue = cell.value;
               }
               // 3. 둘 다 없으면 수식 자체를 저장 (백업)
               else {
                 calculatedValue = cell.formula;
               }
               
               // Shared Formula 문제 방지
               if (cell.formula.includes('shared') || cell.formula.includes('undefined')) {
                 console.warn(`⚠️ ${row}행 ${col}열 Shared Formula 문제 발견:`, cell.formula);
                 // Shared Formula가 있는 경우 빈 값으로 처리
                 cellValue = '';
               } else {
                 // 정상적인 수식인 경우 계산된 값 사용
                 cellValue = calculatedValue;
               }
               
               console.log(`📝 ${row}행 ${col}열 수식 처리:`, { 
                 formula: cell.formula, 
                 result: cell.result,
                 value: cell.value,
                 calculatedValue: calculatedValue,
                 finalValue: cellValue
               });
             } catch (formulaError) {
               console.warn(`⚠️ ${row}행 ${col}열 수식 처리 실패:`, formulaError.message);
               // 수식 처리 실패 시 빈 값으로 설정
               cellValue = '';
             }
           } else {
             // 수식이 없는 경우: 일반 값
             cellValue = cell.value || '';
           }
           
           rowData.push(cellValue);
         } catch (cellError) {
           // 셀 읽기 실패 시 빈 값으로 설정
           console.warn(`⚠️ ${row}행 ${col}열 셀 읽기 실패:`, cellError.message);
           rowData.push('');
         }
       }
       
       data.push(rowData);
     }
    
    console.log('📊 시트 데이터 로드 완료:', data.length, '행');
    
    // 5행부터 시작하여 [ 총 공 사 금 액 ] 행을 찾을 때까지 파싱
    const items = [];
    let totalContractAmount = 0;
    let totalVat = 0;
    let contractAmount = 0;
    
    for (let rowIndex = 4; rowIndex < data.length; rowIndex++) { // 5행부터 시작 (0-based index)
      const row = data[rowIndex];
      if (!row || row.length === 0) continue;
      
                     // A열 (품명)
        const itemName = String(row[0] || '').trim();
        
        // [ 총 공 사 금 액 ] 행을 만나면 파싱 중단
        if (itemName.includes('총 공 사 금 액') || itemName.includes('총공사계')) {
          console.log('🛑 총공사계 행 발견, 파싱 중단:', rowIndex + 1, '행');
          
          // 총공사계, 부가세, 계약금액 추출
          try {
            // L열에서 총공사계 금액 추출 (0-based index 11)
            const totalAmount = parseNumber(row[11]);
            if (totalAmount > 0) {
              totalContractAmount = totalAmount;
              console.log('💰 총공사계 추출:', totalContractAmount);
            }
            
            // 다음 행에서 부가세 추출
            if (rowIndex + 1 < data.length) {
              const nextRow = data[rowIndex + 1];
              const vatAmount = parseNumber(nextRow[11]); // L열
              if (vatAmount > 0) {
                totalVat = vatAmount;
                console.log('💰 부가세 추출:', totalVat);
              }
            }
            
            // 그 다음 행에서 계약금액 추출
            if (rowIndex + 2 < data.length) {
              const contractRow = data[rowIndex + 2];
              const contractAmountValue = parseNumber(contractRow[11]); // L열
              if (contractAmountValue > 0) {
                contractAmount = contractAmountValue;
                console.log('💰 계약금액 추출:', contractAmount);
              }
            }
          } catch (error) {
            console.warn('⚠️ 총계 금액 추출 실패:', error);
          }
          
          break;
        }
        
        // 빈 행이거나 품명이 없으면 건너뛰기
        if (!itemName || itemName === '') continue;
        
                 // 모든 열 데이터 추출 (A,B,C,D,E,G,I,K,L,M)
         const rowNumber = rowIndex + 1; // 실제 행 번호 (5부터 시작)
         let columnA = String(row[0] || '').trim(); // A열 - 품명
         let columnB = String(row[1] || '').trim(); // B열 - 규격
         const columnC = String(row[2] || '').trim(); // C열 - 단위
         const columnD = parseNumber(row[3]); // D열 - 수량
         const columnE = parseNumber(row[4]); // E열 - 재료비 단가 (JE프라이스)
         const columnG = parseNumber(row[6]); // G열 - 노무비 단가 (NO프라이스)
         const columnI = parseNumber(row[8]); // I열 - 경비 단가 (KY프라이스)
         const columnK = parseNumber(row[10]); // K열 - 합계 단가
         const columnL = parseNumber(row[11]); // L열 - 합계 금액
         const columnM = parseNumber(row[12]); // M열 - 합계
         
         // A열에 값이 있고 B열이 비어있으면 A열 값을 B열에 복사
         if (columnA && !columnB) {
           console.log(`📝 ${rowNumber}행: A열 값 "${columnA}"을 B열에 복사`);
           columnB = columnA;
         }
         
         // 디버깅: 각 행의 데이터 확인 (오브젝트 체크)
         const hasObject = (typeof columnA === 'string' && columnA.includes('[object Object]')) || 
                          (typeof columnB === 'string' && columnB.includes('[object Object]')) || 
                          (typeof columnC === 'string' && columnC.includes('[object Object]')) || 
                          (typeof columnI === 'string' && columnI.includes('[object Object]'));
         
         console.log(`🔍 ${rowNumber}행 파싱:`, {
           A: columnA,
           B: columnB,
           C: columnC,
           D: columnD,
           E: columnE,
           G: columnG,
           I: columnI,
           K: columnK,
           L: columnL,
           M: columnM,
           hasObject: hasObject,
           A_type: typeof columnA,
           B_type: typeof columnB
         });
         
         if (hasObject) {
           console.log(`🚨 ${rowNumber}행에 오브젝트 발견! 원본 데이터:`, row);
         }
         
         // 8번행 특별 확인
         if (rowNumber === 8) {
           console.log(`🚨 8번행 특별 확인:`, {
             원본행: row,
             A열값: columnA,
             B열값: columnB,
             C열값: columnC,
             D열값: columnD,
             E열값: columnE,
             G열값: columnG,
             I열값: columnI,
             K열값: columnK,
             L열값: columnL,
             M열값: columnM,
             전체행길이: row.length
           });
         }
        
                         // A,B값이 있는 실제 항목만 추가 (단수정리 포함, 총공사계, 부가세 등 제외)
        // 단수정리, NEGO, 간접비 항목은 A열 또는 B열에 있을 수 있으므로 특별 처리
        const isAdjustmentItem = (columnA && (
            columnA.trim() === '단수정리' || 
            columnA.trim() === 'NEGO' || 
            columnA.trim() === '간접비'
        )) || (columnB && (
            columnB.trim() === '단수정리' || 
            columnB.trim() === 'NEGO' || 
            columnB.trim() === '간접비'
        ));
        
                 // 단수정리 항목 디버깅 로그 (A열 또는 B열에 있을 경우 확인)
         if ((columnA && typeof columnA === 'string' && columnA.trim() === '단수정리') || (columnB && typeof columnB === 'string' && columnB.trim() === '단수정리')) {
           console.log(`🔍 단수정리 항목 확인 (${rowNumber}행):`, {
             columnA: columnA,
             columnA_trim: columnA && typeof columnA === 'string' ? columnA.trim() : '',
             columnB: columnB,
             columnB_trim: columnB && typeof columnB === 'string' ? columnB.trim() : '',
             isAdjustmentItem: isAdjustmentItem,
             columnC: columnC,
             columnD: columnD,
             columnE: columnE,
             columnG: columnG,
             columnK: columnK,
             columnL: columnL,
             hasNumericData: !!(columnD !== undefined || columnE !== undefined || columnG !== undefined || columnK !== undefined || columnL !== undefined)
           });
         }
         
         // 모든 행에 대해 단수정리 관련 디버깅 (20행 주변 확인)
         if (rowNumber >= 18 && rowNumber <= 22) {
           console.log(`🔍 ${rowNumber}행 디버깅:`, {
             columnA: columnA,
             columnA_trim: columnA && typeof columnA === 'string' ? columnA.trim() : '',
             columnA_타입: typeof columnA,
             columnA_길이: columnA && typeof columnA === 'string' ? columnA.length : 0,
             columnA_포함단수정리: columnA && typeof columnA === 'string' ? columnA.includes('단수정리') : false,
             columnA_정확일치: columnA && typeof columnA === 'string' ? columnA.trim() === '단수정리' : false,
             isAdjustmentItem: isAdjustmentItem,
             columnB: columnB,
             columnC: columnC,
             columnD: columnD,
             columnE: columnE
           });
         }
        
        const isValidItem = columnA && 
            (typeof columnA === 'string' && columnA.trim() !== '') && 
            (typeof columnA === 'string' && !columnA.includes('총공사계')) && 
            (typeof columnA === 'string' && !columnA.includes('부가세')) && 
            (typeof columnA === 'string' && !columnA.includes('계약금액')) &&
            (typeof columnA === 'string' && !columnA.includes('[object Object]')) &&
            (isAdjustmentItem || (columnB && typeof columnB === 'string' && columnB.trim() !== '' && !columnB.includes('[object Object]'))) &&
            (isAdjustmentItem || (columnD !== undefined || columnE !== undefined || columnG !== undefined || columnK !== undefined || columnL !== undefined));
            
        // 단수정리 항목 유효성 검사 디버깅
        if ((columnA && columnA.trim() === '단수정리') || (columnB && columnB.trim() === '단수정리')) {
          console.log(`🔍 단수정리 유효성 검사 (${rowNumber}행):`, {
            columnA존재: !!columnA,
            A빈값아님: columnA ? columnA.trim() !== '' : false,
            columnB존재: !!columnB,
            B빈값아님: columnB ? columnB.trim() !== '' : false,
            총공사계아님: !(columnA && columnA.includes('총공사계')) && !(columnB && columnB.includes('총공사계')),
            부가세아님: !(columnA && columnA.includes('부가세')) && !(columnB && columnB.includes('부가세')),
            계약금액아님: !(columnA && columnA.includes('계약금액')) && !(columnB && columnB.includes('계약금액')),
            오브젝트아님: !(columnA && columnA.includes('[object Object]')) && !(columnB && columnB.includes('[object Object]')),
            isAdjustmentItem: isAdjustmentItem,
            B열조건: isAdjustmentItem || (columnB && columnB.trim() !== '' && !columnB.includes('[object Object]')),
            숫자데이터존재: !!(columnD !== undefined || columnE !== undefined || columnG !== undefined || columnK !== undefined || columnL !== undefined),
            isValidItem: isValidItem
          });
        }
            
                 if (!isValidItem) {
           // 단수정리 항목이 제외되는 경우 특별 로그
           if (isAdjustmentItem) {
             console.log(`❌ 단수정리 항목 제외 (${rowNumber}행):`, {
               reason: !columnA ? 'A열 없음' : 
                       columnA.trim() === '' ? 'A열 빈값' :
                       columnA.includes('총공사계') ? '총공사계 포함' :
                       columnA.includes('부가세') ? '부가세 포함' :
                       columnA.includes('계약금액') ? '계약금액 포함' :
                       columnA.includes('[object Object]') ? 'A열 object 포함' :
                       '수량/단가/금액 없음',
               A: columnA,
               B: columnB,
               C: columnC,
               D: columnD,
               E: columnE,
               G: columnG,
               K: columnK,
               L: columnL,
               hasNumericData: !!(columnD !== undefined || columnE !== undefined || columnG !== undefined || columnK !== undefined || columnL !== undefined)
             });
           } else if ((columnA && columnA.trim() === '단수정리') || (columnB && columnB.trim() === '단수정리')) {
             // 단수정리인데 isAdjustmentItem이 false인 경우
             console.log(`❌ 단수정리 항목 제외 (${rowNumber}행) - isAdjustmentItem이 false:`, {
               columnA: columnA,
               columnA_trim: columnA ? columnA.trim() : '',
               columnB: columnB,
               columnB_trim: columnB ? columnB.trim() : '',
               isAdjustmentItem: isAdjustmentItem,
               reason: 'isAdjustmentItem이 false로 설정됨'
             });
           } else {
             console.log(`❌ ${rowNumber}행 제외:`, {
               reason: !columnA ? 'A열 없음' : 
                       columnA.trim() === '' ? 'A열 빈값' :
                       columnA.includes('총공사계') ? '총공사계 포함' :
                       columnA.includes('부가세') ? '부가세 포함' :
                       columnA.includes('계약금액') ? '계약금액 포함' :
                       columnA.includes('[object Object]') ? 'A열 object 포함' :
                       (!columnB || columnB.trim() === '' || columnB.includes('[object Object]')) ? 'B열 없음/빈값/object' :
                       '수량/단가/금액 없음',
               A: columnA,
               B: columnB,
               C: columnC,
               isAdjustmentItem: isAdjustmentItem
             });
           }
         }
         
         // 8번행 유효성 확인
         if (rowNumber === 8) {
           console.log(`🚨 8번행 유효성 확인:`, {
             isValidItem: isValidItem,
             columnA: columnA,
             columnB: columnB,
             columnA_trim: columnA.trim(),
             columnB_trim: columnB.trim(),
             columnA_빈값: columnA.trim() === '',
             columnB_빈값: columnB.trim() === '',
             조건체크: {
               columnA존재: !!columnA,
               columnB존재: !!columnB,
               A빈값아님: columnA.trim() !== '',
               B빈값아님: columnB.trim() !== '',
               A총공사계아님: !columnA.includes('총공사계'),
               A부가세아님: !columnA.includes('부가세'),
               A계약금액아님: !columnA.includes('계약금액'),
               A오브젝트아님: !columnA.includes('[object Object]'),
               B오브젝트아님: !columnB.includes('[object Object]')
             }
           });
         }
        
        if (isValidItem) {
          // 단수정리 항목이 유효성 검사를 통과했는지 확인
          if (isAdjustmentItem) {
            console.log(`✅ 단수정리 항목 유효성 검사 통과 (${rowNumber}행)`);
          }
          
                   // 단수정리 항목일 때 수량을 1로 고정하고, 단가 정보는 원본 그대로 유지
         let finalQuantity = columnD;
         let finalUnitPrice = columnK || columnE;
         let finalAmount = columnL || columnG;
         
         console.log(`🔍 단가 계산 - 행 ${rowNumber}:`, {
           columnK: columnK,
           columnE: columnE,
           finalUnitPrice: finalUnitPrice,
           itemName: columnB || columnA
         });
         
         if (isAdjustmentItem) {
           finalQuantity = 1; // 단수정리는 수량을 1로 고정
           
           // 단수정리 항목도 원본 단가 정보를 그대로 유지
           // 자재비/노무비/경비 단가는 각각 저장, 합계 단가는 별도 저장
           finalUnitPrice = columnK || columnE; // K열(합계단가) 또는 E열(재료비단가)
           finalAmount = columnL || columnG || columnM; // L열 또는 G열 또는 M열에서 금액 가져오기
           
           console.log(`📝 단수정리 항목 처리 (${rowNumber}행):`, {
             원본수량: columnD,
             원본단가: columnK || columnE,
             원본금액: columnL || columnG,
             설정수량: finalQuantity,
             설정단가: finalUnitPrice,
             설정금액: finalAmount,
             단가정보: {
               재료비: columnE,
               노무비: columnG,
               경비: columnI,
               합계단가: columnK
             }
           });
         }
          
                              // 물량데이터 구조: 품목-규격-단위-물량을 하나의 세트로 연결
         // 자재비/노무비/경비는 견적서/납품계약서용, 합계단가는 기성금청구서용
         const item = {
           // === 기본 정보 (품목-규격-단위-물량 세트) ===
           name: columnA, // 품목명 (A열)
           specification: columnB, // 규격 (B열)
           unit: isAdjustmentItem ? (columnC || '식') : columnC, // 단위
           quantity: finalQuantity, // 물량
           
           // === 단가 정보 (견적서/납품계약서용) ===
           JEprice: columnE, // E열 - 재료비 단가
           NOprice: columnG, // G열 - 노무비 단가  
           KYprice: columnI, // I열 - 경비 단가
           
           // === 합계 단가 (기성금청구서용) ===
           unitPrice: finalUnitPrice, // K열 - 합계 단가
           
           // === 금액 정보 ===
           price: finalUnitPrice, // 견적서용 단가 (K열 또는 E열)
           amount: finalAmount, // L열 - 합계 금액
           
           // === 셀 주소 정보 (A5, B5, C5 형태) ===
           [`A${rowNumber}`]: columnA, // A5, A6, A7... - 품명
           [`B${rowNumber}`]: columnB, // B5, B6, B7... - 규격
           [`C${rowNumber}`]: columnC, // C5, C6, C7... - 단위
           [`D${rowNumber}`]: columnD, // D5, D6, D7... - 수량
           [`E${rowNumber}`]: columnE, // E5, E6, E7... - 재료비 단가
           [`G${rowNumber}`]: columnG, // G5, G6, G7... - 노무비 단가
           [`I${rowNumber}`]: columnI, // I5, I6, I7... - 경비 단가
           [`K${rowNumber}`]: columnK, // K5, K6, K7... - 합계 단가
           [`L${rowNumber}`]: columnL, // L5, L6, L7... - 합계 금액
           [`M${rowNumber}`]: columnM, // M5, M6, M7... - 합계
           
           // === 기존 호환성을 위한 columnX 형태 ===
           columnA: columnA, // A열 - 품명
           columnB: columnB, // B열 - 규격
           columnC: columnC, // C열 - 단위
           columnD: columnD, // D열 - 수량
           columnE: columnE, // E열 - 재료비 단가
           columnG: columnG, // G열 - 노무비 단가
           columnI: columnI, // I열 - 경비 단가
           columnK: columnK, // K열 - 합계 단가
           columnL: columnL, // L열 - 합계 금액
           columnM: columnM, // M열 - 합계
           
           // === 기타 정보 ===
           remark: columnI, // I열 비고
           sequence: items.length + 1, // 순서 번호
           rowNumber: rowNumber, // 실제 행 번호
           createdAt: new Date(),
           updatedAt: new Date()
         };
        
                 items.push(item);
         
         // 단수정리 항목 저장 확인
         if (isAdjustmentItem) {
           console.log(`💾 단수정리 항목 저장 완료 (${rowNumber}행):`, {
             name: item?.name,
             quantity: item?.quantity,
             JEprice: item?.JEprice,
             NOprice: item?.NOprice,
             KYprice: item?.KYprice,
             unitPrice: item?.unitPrice,
             amount: item?.amount
           });
         }
      }
    }
    
         console.log('✅ 견적서 파싱 완료, 총 항목 수:', items.length);
     
     // 단수정리 항목 최종 확인
     const adjustmentItems = items.filter(item => 
       item?.name === '단수정리' || 
       item?.name === 'NEGO' || 
       item?.name === '간접비'
     );
     
     if (adjustmentItems.length > 0) {
       console.log('💰 단수정리 항목 최종 확인:', {
         count: adjustmentItems.length,
         items: adjustmentItems.map(item => ({
           name: item?.name,
           quantity: item?.quantity,
           JEprice: item?.JEprice,
           NOprice: item?.NOprice,
           KYprice: item?.KYprice,
           unitPrice: item?.unitPrice,
           amount: item?.amount
         }))
       });
     }
    
    return {
      success: true,
             data: {
         items,
         summary: {
           totalContractAmount,
           totalVat,
           contractAmount,
           adjustmentItemNames: adjustmentItems.map(item => item?.name)
         }
       }
    };
    
  } catch (error) {
    console.error('❌ 견적서 파싱 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 파싱된 물량 데이터를 파이어베이스에 저장하는 함수
 * 컬렉션에 문서 1개에 1개의 견적 모든 내용을 저장
 */
export const saveMaterialDataToFirebase = async (siteId, siteName, parsedData) => {
  try {
    console.log('💾 파이어베이스 저장 시작:', { siteId, siteName });
    
    const { items, summary } = parsedData;
    
    // 단수정리 항목 확인
    const adjustmentItems = items.filter(item => 
      item?.name === '단수정리' || 
      item?.name === 'NEGO' || 
      item?.name === '간접비'
    );
    console.log('🔍 단수정리 항목 확인:', {
      totalItems: items.length,
      adjustmentItems: adjustmentItems.length,
      adjustmentItemNames: adjustmentItems.map(item => item?.name)
    });
    
    // 기존 데이터 확인
    const existingQuery = query(
      collection(db, 'materialEstimates'),
      where('siteId', '==', siteId)
    );
    const existingDocs = await getDocs(existingQuery);
    
    let materialEstimateId;
    
    if (!existingDocs.empty) {
      // 기존 문서 업데이트
      const existingDoc = existingDocs.docs[0];
      materialEstimateId = existingDoc.id;
      
      await updateDoc(doc(db, 'materialEstimates', materialEstimateId), {
        siteName,
        items,
        summary,
        updatedAt: serverTimestamp(),
        lastUploadDate: new Date()
      });
      
      console.log('✅ 기존 견적서 데이터 업데이트 완료:', materialEstimateId);
      
      // 단수정리 항목 저장 확인
      const savedAdjustmentItems = items.filter(item => 
        item?.name === '단수정리' || 
        item?.name === 'NEGO' || 
        item?.name === '간접비'
      );
      console.log('💾 저장된 단수정리 항목:', {
        count: savedAdjustmentItems.length,
        items: savedAdjustmentItems.map(item => ({
           name: item?.name,
           quantity: item?.quantity,
           JEprice: item?.JEprice,
           NOprice: item?.NOprice,
           KYprice: item?.KYprice,
           unitPrice: item?.unitPrice,
           amount: item?.amount
         }))
       });
    } else {
      // 새 문서 생성
      const newDoc = await addDoc(collection(db, 'materialEstimates'), {
        siteId,
        siteName,
        items,
        summary,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastUploadDate: new Date()
      });
      
      materialEstimateId = newDoc.id;
      console.log('✅ 새 견적서 데이터 저장 완료:', materialEstimateId);
      
      // 단수정리 항목 저장 확인
      const savedAdjustmentItems = items.filter(item => 
        item?.name === '단수정리' || 
        item?.name === 'NEGO' || 
        item?.name === '간접비'
      );
      console.log('💾 저장된 단수정리 항목:', {
        count: savedAdjustmentItems.length,
        items: savedAdjustmentItems.map(item => ({
           name: item?.name,
           quantity: item?.quantity,
           JEprice: item?.JEprice,
           NOprice: item?.NOprice,
           KYprice: item?.KYprice,
           unitPrice: item?.unitPrice,
           amount: item?.amount
         }))
       });
    }
    
    // 현장 정보 업데이트 (계약금액, 물량 데이터 등)
    try {
      const siteRef = doc(db, 'sites', siteId);
      await updateDoc(siteRef, {
        contractAmount: summary.contractAmount || summary.totalContractAmount,
        materialEstimateId,
        lastMaterialUpdate: new Date(),
        items: items.map(item => ({
          name: item?.name,
          specification: item?.specification,
          unit: item?.unit,
          quantity: item?.quantity,
          JEprice: item?.JEprice || item?.price || 0,
          NOprice: item?.NOprice || item?.price || 0,
          KYprice: item?.KYprice || 0,
          unitPrice: item?.unitPrice || item?.price || 0,
          amount: item?.amount
        }))
      });
      
      console.log('✅ 현장 정보 업데이트 완료');
    } catch (siteUpdateError) {
      console.warn('⚠️ 현장 정보 업데이트 실패:', siteUpdateError);
    }
    
    return {
      success: true,
      materialEstimateId,
      message: '물량 데이터가 성공적으로 저장되었습니다.'
    };
    
  } catch (error) {
    console.error('❌ 파이어베이스 저장 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 현장의 물량 데이터를 가져오는 함수
 */
export const getMaterialDataFromFirebase = async (siteId) => {
  try {
    console.log('📥 물량 데이터 조회 시작:', siteId);
    
    console.log('🔍 Firestore 쿼리 생성 중...');
    const materialQuery = query(
      collection(db, 'materialEstimates'),
      where('siteId', '==', siteId)
    );
    console.log('✅ 쿼리 생성 완료');
    
    console.log('📊 Firestore에서 데이터 조회 중...');
    const snapshot = await getDocs(materialQuery);
    console.log('✅ 데이터 조회 완료, 문서 수:', snapshot.size);
    
    if (snapshot.empty) {
      console.log('⚠️ 물량 데이터 없음 - 빈 스냅샷');
      return {
        success: true,
        data: {
          items: [],
          summary: {
            totalContractAmount: 0,
            totalVat: 0,
            contractAmount: 0,
            itemsCount: 0
          }
        }
      };
    }
    
    console.log('📄 문서 데이터 추출 중...');
    const doc = snapshot.docs[0];
    const data = doc.data();
    console.log('📊 문서 데이터:', {
      siteId: data.siteId,
      siteName: data.siteName,
      itemsCount: data.items?.length || 0,
      summary: data.summary
    });
    
    console.log('✅ 물량 데이터 조회 완료:', data.items?.length || 0, '개 항목');
    
    return {
      success: true,
      data: {
        items: data.items || [],
        summary: data.summary || {
          totalContractAmount: 0,
          totalVat: 0,
          contractAmount: 0,
          itemsCount: 0
        }
      }
    };
    
  } catch (error) {
    console.error('❌ 물량 데이터 조회 실패:', error);
    console.error('❌ 오류 상세:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 수식 계산 함수
 */
const calculateFormula = (formula, sheet, rowIndex) => {
  try {
    // = 기호 제거
    const cleanFormula = formula.replace(/^=/, '');
    
    // D*E 형태의 수식 처리 (예: D5*E5)
    if (cleanFormula.includes('*')) {
      const parts = cleanFormula.split('*');
      const cell1 = parts[0].trim();
      const cell2 = parts[1].trim();
      
      const value1 = sheet.getCell(cell1).value || 0;
      const value2 = sheet.getCell(cell2).value || 0;
      
      return value1 * value2;
    }
    
    // E+G+I 형태의 수식 처리 (예: E5+G5+I5)
    if (cleanFormula.includes('+')) {
      const parts = cleanFormula.split('+');
      let sum = 0;
      
      parts.forEach(part => {
        const cell = part.trim();
        const value = sheet.getCell(cell).value || 0;
        sum += value;
      });
      
      return sum;
    }
    
    // 기본값
    return 0;
  } catch (error) {
    console.error('수식 계산 오류:', error);
    return 0;
  }
};

/**
 * 숫자 파싱 헬퍼 함수
 */
const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  
  // 문자열인 경우 쉼표 제거
  const cleanValue = String(value).replace(/[,]/g, '');
  
  // 숫자로 변환
  const num = parseFloat(cleanValue);
  
  // 유효한 숫자인지 확인
  if (isNaN(num)) return 0;
  
  // 소수점 5째 자리까지 정확하게 저장 (반올림하지 않음)
  return Math.round(num * 100000) / 100000;
};

/**
 * 통합 물량 데이터 업로드 함수
 */
export const uploadMaterialData = async (file, siteId, siteName) => {
  try {
    console.log('🚀 물량 데이터 업로드 시작:', { siteId, siteName });
    
    // 1. 엑셀 파일 파싱
    console.log('📊 1단계: 견적서 엑셀 파일 파싱 시작');
    const parseResult = await parseEstimateExcel(file, siteId, siteName);
    
    if (!parseResult.success) {
      throw new Error(`파싱 실패: ${parseResult.error}`);
    }
    
    console.log('✅ 파싱 완료:', {
      itemsCount: parseResult.data.items.length,
      summary: parseResult.data.summary
    });
    
    // 2. 파이어베이스에 저장
    console.log('💾 2단계: 파이어베이스 저장 시작');
    const saveResult = await saveMaterialDataToFirebase(siteId, siteName, parseResult.data);
    
    if (!saveResult.success) {
      throw new Error(`저장 실패: ${saveResult.error}`);
    }
    
    console.log('✅ 물량 데이터 업로드 완료');
    console.log('📊 저장된 데이터 구조:', {
      materialEstimateId: saveResult.materialEstimateId,
      itemsCount: parseResult.data.items.length,
      dataStructure: {
        basicInfo: '품목-규격-단위-물량 세트',
        pricing: '자재비/노무비/경비 분리 저장',
        totalPrice: '합계단가 별도 저장'
      }
    });
    
    return {
      success: true,
      materialEstimateId: saveResult.materialEstimateId,
      message: saveResult.message,
      data: parseResult.data
    };
    
  } catch (error) {
    console.error('❌ 물량 데이터 업로드 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 물량 데이터를 현장관리용 형식으로 변환하는 함수
 * 현장관리 오른쪽 레이아웃에서 사용할 형식
 */
export const convertMaterialDataForSiteManagement = (materialData) => {
  try {
    const { items, summary } = materialData;
    
    // 품목-규격-단위-물량 세트 + 단가/금액 정보 추출
    const siteManagementItems = items.map(item => ({
      // === 기본 정보 (품목-규격-단위-물량 세트) ===
      name: item?.name,           // 품목명
      specification: item?.specification, // 규격
      unit: item?.unit,           // 단위
      quantity: item?.quantity,   // 물량
      
      // === 단가/금액 정보 ===
      unitPrice: item?.unitPrice, // 합계 단가 (기성금청구서용)
      amount: item?.amount        // 합계 금액
    }));
    
    console.log('🔄 현장관리용 데이터 변환 완료:', {
      originalItems: items.length,
      convertedItems: siteManagementItems.length,
      sampleItem: siteManagementItems[0]
    });
    
    return {
      items: siteManagementItems,
      summary: {
        totalContractAmount: summary.totalContractAmount,
        totalVat: summary.totalVat,
        contractAmount: summary.contractAmount
      }
    };
    
  } catch (error) {
    console.error('❌ 물량 데이터 변환 실패:', error);
    return {
      items: [],
      summary: {
        totalContractAmount: 0,
        totalVat: 0,
        contractAmount: 0
      }
    };
  }
};

/**
 * 견적서 템플릿을 파이어베이스에 업로드하는 함수
 */
export const uploadEstimateTemplate = async () => {
  try {
    console.log('📄 견적서 템플릿 업로드 시작');
    
    // 템플릿 파일 경로
    const templatePath = '/견적서.xlsx';
    
    // 파일을 fetch로 가져오기
    const response = await fetch(templatePath);
    if (!response.ok) {
      throw new Error('견적서 템플릿 파일을 찾을 수 없습니다.');
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const file = new File([arrayBuffer], '견적서.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // 파이어베이스 Storage에 업로드
    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const { storage } = await import('../firebase');
    
          const templateRef = ref(storage, 'templates/(N)gyunjuk.xlsx');
    await uploadBytes(templateRef, file);
    const downloadURL = await getDownloadURL(templateRef);
    
    console.log('✅ 견적서 템플릿 업로드 완료:', downloadURL);
    
    return {
      success: true,
      downloadURL,
      message: '견적서 템플릿이 성공적으로 업로드되었습니다.'
    };
    
  } catch (error) {
    console.error('❌ 견적서 템플릿 업로드 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 견적서 생성 및 다운로드 함수 (ExcelJS 사용)
 */
export const generateDocumentExcel = async (siteData, materialData, documentType = '견적서') => {
  try {
    console.log('🚀 generateDocumentExcel 함수 시작');
    console.log('📊 입력 파라미터:', { siteData, materialData, documentType });
    console.log('📊 siteData 상세:', JSON.stringify(siteData, null, 2));
    console.log('📊 materialData 상세:', JSON.stringify(materialData, null, 2));
    
    // 기본 데이터 검증
    if (!siteData || typeof siteData !== 'object') {
      throw new Error('siteData가 유효하지 않습니다.');
    }
    
    // siteData.name 기본값 설정
    if (!siteData?.name || siteData?.name.trim() === '') {
      console.warn('⚠️ siteData.name이 없어서 기본값 설정');
      siteData.name = '현장명없음';
    }
    
    // materialData 검증
    if (!materialData) {
      console.warn('⚠️ materialData가 없어서 빈 객체로 설정');
      materialData = { items: [] };
    }
    
    if (!materialData.items || !Array.isArray(materialData.items)) {
      console.warn('⚠️ materialData.items가 배열이 아니어서 빈 배열로 설정');
      materialData.items = [];
    }
    
    console.log('📊 검증 후 데이터:', {
      siteDataName: siteData?.name,
      materialItemsCount: materialData.items.length
    });
    
    // 물량 개수에 따른 템플릿 타입 결정
    const itemCount = materialData?.items?.length || 0;
    let templateType;
    if (siteData.templateType === 'AUTO') {
      templateType = itemCount > 20 ? 'L' : 'N';
    } else {
      templateType = siteData.templateType || 'N';
    }
    
    const templateKey = `(${templateType})${documentType}`;
    const templateUrl = templateUrls[templateKey];
    
    if (!templateUrl) {
      throw new Error(`템플릿 URL을 찾을 수 없습니다: ${templateKey}`);
    }
    
    console.log(`📋 템플릿 선택: ${templateKey} (물량: ${itemCount}개)`);
    console.log(`📋 템플릿 타입: ${templateType}, 문서 타입: ${documentType}`);
    
    // 템플릿 다운로드
    console.log(`📥 템플릿 파일 다운로드 중...`);
    console.log(`🔗 요청 URL: ${templateUrl}`);
    
    const response = await fetch(templateUrl);
    if (!response.ok) {
      console.error(`❌ 템플릿 다운로드 실패: HTTP ${response.status} ${response.statusText}`);
      console.error(`❌ 응답 내용:`, await response.text());
      throw new Error(`템플릿 파일을 찾을 수 없습니다. HTTP error! status: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log(`✅ 템플릿 다운로드 완료: ${templateKey} (${arrayBuffer.byteLength} bytes)`);
    
    // 워크북 로드 (완전 안전 모드 - 오류 방지 강화)
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer, {
      sharedFormula: false,
      ignoreNodes: ['sharedFormula', 'extLst', 'calcChain', 'pivotCacheDefinition', 'pivotCacheRecords', 'volatileDependencies'],
      ignoreStyles: false,
      ignoreDataValidations: false,
      ignoreConditionalFormats: false,
      ignoreHyperlinks: true,
      ignoreComments: true,
      ignoreDrawings: true,
      ignoreFormulas: false, // 수식은 유지하되 오류 처리
      ignoreMergedCells: false,
      ignoreProtectedRanges: false
    });
    
    console.log('✅ 템플릿 로드 완료');
    
    // 로드 후 워크시트 완전 안전성 검증
    console.log('🔍 로드된 워크시트 완전 안전성 검증 시작...');
    
    // 워크시트 배열 안전성 검증
    if (!workbook.worksheets || !Array.isArray(workbook.worksheets)) {
      throw new Error('워크시트를 로드할 수 없습니다.');
    }
    
    // 각 워크시트 안전성 검증 및 수정
    for (let sheetIndex = 0; sheetIndex < workbook.worksheets.length; sheetIndex++) {
      const sheet = workbook.worksheets[sheetIndex];
      
      if (!sheet) {
        console.warn(`⚠️ 시트 ${sheetIndex + 1}이 존재하지 않습니다.`);
        continue;
      }
      
      try {
        // 시트 이름 안전하게 설정
        if (!sheet.name || typeof sheet.name !== 'string' || sheet.name.trim() === '') {
          sheet.name = `Sheet${sheetIndex + 1}`;
        }
        
        // 시트 이름이 여전히 undefined인 경우 강제 설정
        if (sheet.name === undefined || sheet.name === null) {
          sheet.name = `Sheet${sheetIndex + 1}`;
        }
        
        // 시트 상태 안전하게 설정
        if (sheet.state === undefined || sheet.state === null) {
          sheet.state = 'visible';
        }
        
        // 시트 속성 안전하게 설정
        if (!sheet.properties || typeof sheet.properties !== 'object') {
          sheet.properties = {};
        }
        
        console.log(`📋 시트 ${sheetIndex + 1} (${sheet.name}) 완전 검증 중...`);
        
        // 모든 셀 완전 안전 처리 (보호된 셀 제외)
        for (let row = 1; row <= 100; row++) {
          for (let col = 1; col <= 30; col++) {
            try {
              const cell = sheet.getCell(row, col);
              if (cell && cell.value !== undefined) {
                // 보호된 셀은 건드리지 않음
                if (cell.protection && cell.protection.locked) {
                  continue;
                }
                
                // #VALUE! 오류 방지 (보호되지 않은 셀만)
                if (cell.value === '#VALUE!' || cell.value === '#REF!' || cell.value === '#NAME?' || cell.value === '#DIV/0!') {
                  console.log(`🔧 셀 ${cell.address}의 오류 값 수정: ${cell.value} → 빈 문자열`);
                  cell.value = '';
                }
                
                // 셀 값이 있는 경우에만 처리
                if (cell.value === null) {
                  cell.value = '';
                }
                
                // 셀 속성 안전하게 설정 (보호되지 않은 셀만)
                if (!cell.type) cell.type = 'string';
                if (!cell.style) cell.style = {};
                if (!cell.address) cell.address = `${String.fromCharCode(64 + col)}${row}`;
              }
            } catch (cellError) {
              // 셀이 존재하지 않는 경우 무시
            }
          }
        }
        
      } catch (sheetError) {
        console.warn(`⚠️ 시트 ${sheetIndex + 1} 검증 실패:`, sheetError.message);
        // 시트가 손상된 경우 기본값으로 재설정
        try {
          sheet.name = `Sheet${sheetIndex + 1}`;
          sheet.state = 'visible';
          sheet.properties = {};
        } catch (resetError) {
          console.error(`❌ 시트 ${sheetIndex + 1} 재설정 실패:`, resetError.message);
        }
      }
    }
    console.log('✅ 로드된 워크시트 완전 안전성 검증 완료');
    
    // 갑지 시트 찾기
    let gapjiSheet = null;
    try {
      gapjiSheet = workbook.getWorksheet('갑지') || workbook.getWorksheet(1);
    } catch (sheetError) {
      console.warn('시트 검색 실패:', sheetError.message);
    }
    
    if (!gapjiSheet && workbook.worksheets && workbook.worksheets.length > 0) {
      gapjiSheet = workbook.worksheets[0];
    }
    
    if (!gapjiSheet) {
      throw new Error('갑지 시트를 찾을 수 없습니다.');
    }
    
    // 갑지 데이터 입력
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // 기본 정보 입력 (안전한 값 변환)
    const safeString = (value) => {
      if (value === null || value === undefined) return '';
      return String(value);
    };
    
    gapjiSheet.getCell('B3').value = safeString(currentYear);
    gapjiSheet.getCell('D3').value = safeString(currentMonth);
    gapjiSheet.getCell('B11').value = safeString(siteData?.companyName || siteData?.company || '대마팀');
    gapjiSheet.getCell('H16').value = safeString(siteData?.name);
    
    // 인감 이미지 추가
    if (siteData.stampType && siteData.stampType !== '인감없음') {
      try {
        const { getDownloadURL, ref } = await import('firebase/storage');
        const { storage } = await import('../firebase');
        
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
        
        const mappedImageName = stampImageMap[siteData.stampType];
        if (mappedImageName) {
          const stampRef = ref(storage, `stamps/${mappedImageName}`);
          const stampUrl = await getDownloadURL(stampRef);
          const response = await fetch(stampUrl);
          const arrayBuffer = await response.arrayBuffer();
          
          gapjiSheet.addImage({
            buffer: arrayBuffer,
            extension: 'png',
          }, {
            tl: { col: 14, row: 21 },
            ext: { width: 60, height: 60 }
          });
        }
      } catch (stampError) {
        console.warn('인감 이미지 처리 실패:', stampError.message);
      }
    }
    
    // 내역서 시트 찾기
    let detailSheet = null;
    try {
      detailSheet = workbook.getWorksheet('내역서') || workbook.getWorksheet(2);
    } catch (sheetError) {
      console.warn('내역서 시트 검색 실패:', sheetError.message);
    }
    
    if (!detailSheet && workbook.worksheets && workbook.worksheets.length > 1) {
      detailSheet = workbook.worksheets[1];
    }
    
    if (!detailSheet) {
      throw new Error('내역서 시트를 찾을 수 없습니다.');
    }
    
    // 물량 데이터 입력
    if (materialData && materialData.items && materialData.items.length > 0) {
      console.log('📊 물량 데이터 필터링 시작:', materialData.items.length, '개 항목');
      
      const actualItems = materialData.items.filter((item, index) => {
        try {
          // item이 null/undefined인지 확인
          if (!item) {
            console.warn(`⚠️ 항목 ${index}: item이 null/undefined`);
            return false;
          }
          
          // item이 객체인지 확인
          if (typeof item !== 'object') {
            console.warn(`⚠️ 항목 ${index}: item이 객체가 아님 (${typeof item})`);
            return false;
          }
          
          // name 속성이 있는지 확인 (안전한 접근)
          const itemName = item?.name || '';
          if (!itemName || itemName.trim() === '') {
            console.warn(`⚠️ 항목 ${index}: name 속성이 없음`, item);
            return false;
          }
          
          // 단수정리는 항상 포함
          if (itemName === '단수정리') {
            console.log(`✅ 항목 ${index}: 단수정리 포함`);
            return true;
          }
          
          // 총계/부가세 항목 제외
          const isExcluded = item?.isTotal || item?.isVat || item?.isTotalWithVat;
          if (isExcluded) {
            console.log(`⏭️ 항목 ${index}: 총계/부가세 항목 제외 (${itemName})`);
            return false;
          }
          
          console.log(`✅ 항목 ${index}: 포함 (${itemName})`);
          return true;
        } catch (filterError) {
          console.error(`❌ 항목 ${index} 필터링 중 오류:`, filterError.message, item);
          return false;
        }
      });
      
      console.log('📊 필터링 완료:', actualItems.length, '개 항목');
      
      actualItems.forEach((item, index) => {
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
          
          // C, D열 값 확인 (단위와 수량)
          const unit = safeString(item?.unit);
          const quantity = safeNumber(item?.quantity);
          
          // C, D열 값이 없으면 B열부터 M열까지 빈칸으로 만들기
          if (!unit && !quantity) {
            console.log(`⚠️ 행 ${row}: C,D열 값이 없어서 B~M열을 빈칸으로 설정`);
            for (let col = 2; col <= 13; col++) { // B열(2)부터 M열(13)까지
              const cellAddress = `${String.fromCharCode(64 + col)}${row}`;
              detailSheet.getCell(cellAddress).value = '';
              // 수식도 제거
              detailSheet.getCell(cellAddress).formula = undefined;
            }
            return; // 이 행은 여기서 종료
          }
          
          // 템플릿 타입에 따른 데이터 입력
          if (documentType === '기성금청구서') {
            // 기성금청구서: A,B,C,D,E열만 입력, 나머지 수식 유지
            // E열에는 합산 유닛프라이스 (unitPrice)가 들어가야 함
            const eValue = safeNumber(item?.unitPrice || item?.price);
            console.log(`🔍 기성금청구서 E열 입력 - 행 ${row}:`, {
              itemName: item?.name,
              unitPrice: item?.unitPrice,
              price: item?.price,
              finalEValue: eValue
            });
            
            detailSheet.getCell(`A${row}`).value = safeString(item?.name);
            detailSheet.getCell(`B${row}`).value = safeString(item?.specification);
            detailSheet.getCell(`C${row}`).value = unit;
            detailSheet.getCell(`D${row}`).value = quantity;
            detailSheet.getCell(`E${row}`).value = eValue;
          } else {
            // 견적서: L, N 템플릿에 따라 다르게 처리
            if (templateType === 'L') {
              // L 템플릿: 납품계약서 인덱스 2와 동일한 방식 (수식 유지)
              detailSheet.getCell(`A${row}`).value = safeString(item?.name || item?.itemName || '');
              detailSheet.getCell(`B${row}`).value = safeString(item?.specification || item?.spec || '');
              detailSheet.getCell(`C${row}`).value = unit;
              detailSheet.getCell(`D${row}`).value = quantity;
              
              const jePrice = safeNumber(item?.JEprice || item?.JE프라이스 || item?.JE || item?.재료비 || item?.자재비);
              const noPrice = safeNumber(item?.NOprice || item?.NO프라이스 || item?.NO || item?.노무비);
              const kyPrice = safeNumber(item?.KYprice || item?.KY프라이스 || item?.KY || item?.경비);
              
              // E열: 재료비 단가만 입력 (수식 유지)
              detailSheet.getCell(`E${row}`).value = jePrice;
              // F열: 수식 유지 (D*E)
              // G열: 노무비 단가만 입력 (수식 유지)
              detailSheet.getCell(`G${row}`).value = noPrice;
              // H열: 수식 유지 (D*G)
              // I열: 경비 단가만 입력 (수식 유지)
              detailSheet.getCell(`I${row}`).value = kyPrice;
              // J열: 수식 유지 (D*I)
              // K열: 수식 유지 (E+G+I)
              // L열: 수식 유지 (D*K)
              detailSheet.getCell(`M${row}`).value = safeString(item?.note || item?.remark || '');
            } else {
              // N 템플릿: 모든 열에 실제 계산된 값 입력 (수식 제거)
              detailSheet.getCell(`A${row}`).value = safeString(item?.name);
              detailSheet.getCell(`B${row}`).value = safeString(item?.specification);
              detailSheet.getCell(`C${row}`).value = unit;
              detailSheet.getCell(`D${row}`).value = quantity;
              
              const jePrice = safeNumber(item?.JEprice || item?.JE프라이스 || item?.JE || item?.재료비 || item?.자재비);
              const noPrice = safeNumber(item?.NOprice || item?.NO프라이스 || item?.NO || item?.노무비);
              const kyPrice = safeNumber(item?.KYprice || item?.KY프라이스 || item?.KY || item?.경비);
              
              detailSheet.getCell(`E${row}`).value = jePrice;
              // F열: 재료비 금액 (단가 × 수량)
              detailSheet.getCell(`F${row}`).value = jePrice * quantity;
              detailSheet.getCell(`G${row}`).value = noPrice;
              // H열: 노무비 금액 (단가 × 수량)
              detailSheet.getCell(`H${row}`).value = noPrice * quantity;
              detailSheet.getCell(`I${row}`).value = kyPrice;
              // J열: 경비 금액 (단가 × 수량)
              detailSheet.getCell(`J${row}`).value = kyPrice * quantity;
              // K열: 소계 (재료비 + 노무비 + 경비)
              detailSheet.getCell(`K${row}`).value = (jePrice * quantity) + (noPrice * quantity) + (kyPrice * quantity);
              // L열: 합계 (소계와 동일)
              detailSheet.getCell(`L${row}`).value = (jePrice * quantity) + (noPrice * quantity) + (kyPrice * quantity);
              detailSheet.getCell(`M${row}`).value = ''; // M열 비고는 비워둠
            }
          }
          
          const itemName = item?.name || '이름없음';
          console.log(`✅ 행 ${row} 데이터 입력 완료: ${itemName}`);
        } catch (rowError) {
          console.warn(`행 ${row} 데이터 입력 실패:`, rowError.message);
          console.warn(`오류 발생한 item:`, item);
        }
      });
    }
    
    // 워크시트 완전 메타데이터 정리
    console.log('🔍 워크시트 완전 메타데이터 정리 시작...');
    
    // 워크시트를 ExcelJS 전용 API로 안전하게 정리
    console.log('🔧 워크시트 정리 시작 (ExcelJS 전용 API 사용)...');
    
    // 1. 유효하지 않은 시트 제거 (뒤에서부터 제거하여 인덱스 문제 방지)
    for (let i = workbook.worksheets.length - 1; i >= 0; i--) {
      const ws = workbook.worksheets[i];
      if (!ws || ws.state === 'veryHidden') {
        try {
          console.log(`🗑️ 유효하지 않은 시트 제거: ${ws?.name || `Sheet${i + 1}`}`);
          workbook.removeWorksheet(ws.id);
        } catch (removeError) {
          console.warn(`⚠️ 시트 제거 실패:`, removeError.message);
        }
      }
    }
    
    // 2. 삭제 후 필수 시트 참조를 다시 가져오기
    const cover = workbook.getWorksheet('갑지') || workbook.worksheets[0];
    const detail = workbook.getWorksheet('내역서') || workbook.worksheets[1];
    
    if (!cover || !detail) {
      throw new Error('필수 시트(갑지/내역서)를 찾을 수 없습니다.');
    }
    
    console.log(`✅ 필수 시트 확인 완료: ${cover?.name || '갑지'}, ${detail?.name || '내역서'}`);
    
    // 3. 시트 속성 안전하게 설정 및 이름 강제 설정
    [cover, detail].forEach((sheet, index) => {
      try {
        // 시트 이름 강제 설정
        const targetName = index === 0 ? '갑지' : '내역서';
        if (!sheet.name || sheet.name.trim() === '' || sheet.name !== targetName) {
          sheet.name = targetName;
          // ExcelJS 내부 속성도 강제 설정
          if (sheet._name !== undefined) {
            sheet._name = targetName;
          }
        }
        
        const sheetName = sheet?.name || targetName;
        console.log(`📋 시트 ${index + 1} (${sheetName}) 속성 정리 중...`);
        
        // 시트 상태 설정
        if (sheet.state === undefined || sheet.state === null) {
          sheet.state = 'visible';
        }
        
        // 시트 속성 설정
        if (!sheet.properties || typeof sheet.properties !== 'object') {
          sheet.properties = {};
        }
        
        // ExcelJS 내부 속성 강제 설정
        if (!sheet.properties.name) {
          sheet.properties.name = targetName;
        }
        
        if (!sheet.pageSetup || typeof sheet.pageSetup !== 'object') {
          sheet.pageSetup = {};
        }
        
        if (!sheet.headerFooter || typeof sheet.headerFooter !== 'object') {
          sheet.headerFooter = {};
        }
        
      } catch (sheetError) {
        console.warn(`⚠️ 시트 ${index + 1} 속성 정리 실패:`, sheetError.message);
      }
    });
    
    // 4. 셀/스타일 정리 (옵셔널 체이닝과 가드 사용)
    [cover, detail].forEach((sheet, index) => {
      try {
        // 시트 이름 안전하게 처리
        const sheetName = sheet?.name || `Sheet${index + 1}`;
        console.log(`📋 시트 ${index + 1} (${sheetName}) 셀/스타일 정리 중...`);
        
        // ExcelJS의 eachRow/eachCell API 사용 (더 안전함)
        sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            try {
              // 셀 값 안전하게 처리
              if (cell.value === null) {
                cell.value = '';
              }
              
              // 셀 속성 안전하게 설정
              if (!cell.type) cell.type = 'string';
              if (!cell.address) cell.address = `${String.fromCharCode(64 + colNumber)}${rowNumber}`;
              
              // 스타일 안전하게 처리 (옵셔널 체이닝 사용)
              const font = cell.font || {};
              const alignment = cell.alignment || {};
              const fill = cell.fill || null;
              const border = cell.border || {};
              
              // 폰트 설정 (기본값 병합)
              cell.font = { 
                ...font, 
                name: font?.name || 'Malgun Gothic',
                size: font?.size || 10
              };
              
              // 정렬 설정
              if (alignment?.wrapText === undefined) {
                cell.alignment = { ...alignment, wrapText: true };
              }
              
              // 배경색 정리 (pattern 타입만 유지)
              if (fill && fill.type !== 'pattern') {
                cell.fill = undefined;
              }
              
              // 테두리 정리
              if (border && Object.keys(border).length > 0) {
                // 테두리가 있으면 유지, 없으면 undefined
                if (!border.top && !border.bottom && !border.left && !border.right) {
                  cell.border = undefined;
                }
              }
              
              // 문제가 될 수 있는 속성들 제거 (수식은 유지)
              if (cell.richText) cell.richText = undefined;
              if (cell.comment) cell.comment = undefined;
              if (cell.hyperlink) cell.hyperlink = undefined;
              if (cell.dataValidation) cell.dataValidation = undefined;
              
            } catch (cellError) {
              // 개별 셀 오류는 무시하고 계속 진행
              console.warn(`⚠️ 셀 ${rowNumber}:${colNumber} 정리 실패:`, cellError.message);
            }
          });
        });
        
      } catch (sheetError) {
        console.warn(`⚠️ 시트 ${index + 1} 셀 정리 실패:`, sheetError.message);
      }
    });
    
    // 워크북 메타데이터 정리
    try {
      workbook.creator = workbook.creator || 'ExcelJS';
      workbook.lastModifiedBy = workbook.lastModifiedBy || 'ExcelJS';
      workbook.created = workbook.created || new Date();
      workbook.modified = workbook.modified || new Date();
      workbook.lastPrinted = workbook.lastPrinted || new Date();
      workbook.properties = workbook.properties || {};
    } catch (workbookError) {
      console.warn('⚠️ 워크북 메타데이터 정리 실패:', workbookError.message);
    }
    
    console.log('✅ 워크시트 완전 메타데이터 정리 완료');
    
    // 파일 생성 및 다운로드 (완전 안전 모드)
    console.log('📝 Excel 파일 생성 시작...');
    
    // 5. 워크북 최종 검증 (안전한 참조 사용)
    try {
      console.log('📊 워크북 최종 검증 시작...');
      
      // 필수 시트 재확인
      const finalCover = workbook.getWorksheet('갑지');
      const finalDetail = workbook.getWorksheet('내역서');
      
      if (!finalCover || !finalDetail) {
        throw new Error('필수 시트(갑지/내역서)가 없습니다.');
      }
      
      // 시트 정보 안전하게 수집
      const sheetInfo = [];
      workbook.worksheets.forEach((ws, index) => {
        try {
          // 워크시트 이름 안전하게 처리
          let wsName = ws?.name;
          if (!wsName || typeof wsName !== 'string' || wsName.trim() === '') {
            wsName = `Sheet${index + 1}`;
          }
          
          // 워크시트 상태 안전하게 처리
          let wsState = ws?.state;
          if (!wsState || typeof wsState !== 'string') {
            wsState = 'visible';
          }
          
          sheetInfo.push({
            index: index,
            name: wsName,
            state: wsState,
            hasProperties: !!ws?.properties,
            isValid: !!(wsName && wsState && ws?.properties)
          });
        } catch (error) {
          sheetInfo.push({
            index: index,
            name: `Sheet${index + 1}`,
            state: 'visible',
            hasProperties: false,
            isValid: false,
            error: error.message
          });
        }
      });
      
      console.log('📊 워크북 정보:', {
        sheetCount: workbook.worksheets.length,
        sheets: sheetInfo
      });
      
      // 유효하지 않은 시트가 있는지 확인
      const invalidSheets = sheetInfo.filter(sheet => !sheet.isValid);
      if (invalidSheets.length > 0) {
        console.warn('⚠️ 유효하지 않은 시트 발견:', invalidSheets);
        throw new Error(`${invalidSheets.length}개의 유효하지 않은 시트가 있습니다.`);
      }
      
      console.log('✅ 워크북 최종 검증 완료');
      
    } catch (infoError) {
      console.warn('⚠️ 워크북 검증 실패:', infoError.message);
      throw new Error(`워크북 검증 실패: ${infoError.message}`);
    }
    
    // 6. Excel 파일 생성 (완전히 새로운 워크북으로 재생성)
    let buffer;
    try {
      console.log('🔄 새로운 워크북으로 Excel 재생성 시도...');
      
      // 완전히 새로운 워크북 생성
      const newWorkbook = new ExcelJS.Workbook();
      
      // 갑지 시트 생성
      const newCoverSheet = newWorkbook.addWorksheet('갑지');
      const newDetailSheet = newWorkbook.addWorksheet('내역서');
      
      // 갑지 데이터 복사
      if (cover && cover.getRow) {
        cover.eachRow((row, rowNumber) => {
          const newRow = newCoverSheet.getRow(rowNumber);
          row.eachCell((cell, colNumber) => {
            const newCell = newRow.getCell(colNumber);
            newCell.value = cell.value;
            if (cell.font) newCell.font = cell.font;
            if (cell.fill) newCell.fill = cell.fill;
            if (cell.border) newCell.border = cell.border;
            if (cell.alignment) newCell.alignment = cell.alignment;
          });
        });
      }
      
      // 내역서 데이터 복사
      if (detail && detail.getRow) {
        detail.eachRow((row, rowNumber) => {
          const newRow = newDetailSheet.getRow(rowNumber);
          row.eachCell((cell, colNumber) => {
            const newCell = newRow.getCell(colNumber);
            newCell.value = cell.value;
            if (cell.font) newCell.font = cell.font;
            if (cell.fill) newCell.fill = cell.fill;
            if (cell.border) newCell.border = cell.border;
            if (cell.alignment) newCell.alignment = cell.alignment;
          });
        });
      }
      
      // 새로운 워크북으로 버퍼 생성
      buffer = await newWorkbook.xlsx.writeBuffer({
        useStyles: false,
        useSharedStrings: false
      });
      
      console.log('✅ 새로운 워크북으로 Excel 생성 성공');
      
    } catch (newWorkbookError) {
      console.warn('⚠️ 새로운 워크북 생성 실패, 원본 워크북으로 재시도:', newWorkbookError.message);
      
      try {
        // 원본 워크북으로 최소 옵션 시도
        console.log('🔄 원본 워크북 최소 옵션으로 Excel 생성 시도...');
        buffer = await workbook.xlsx.writeBuffer({
          useStyles: false,
          useSharedStrings: false,
          useCellStyles: false,
          useCellFormats: false,
          useCellDates: false,
          useCellComments: false,
          useCellHyperlinks: false,
          useCellDataValidation: false
        });
        console.log('✅ 원본 워크북으로 Excel 생성 성공');
      } catch (finalError) {
        console.error('❌ 모든 방법 실패:', finalError.message);
        console.error('❌ 최종 오류 상세:', finalError);
        
        // 실패 시 워크시트 상태 재확인
        console.log('🔍 실패 시 워크시트 상태 재확인...');
        try {
          const finalCover = workbook.getWorksheet('갑지');
          const finalDetail = workbook.getWorksheet('내역서');
          
          console.log('시트 상태:', {
            cover: finalCover ? { name: finalCover.name, state: finalCover.state } : '없음',
            detail: finalDetail ? { name: finalDetail.name, state: finalDetail.state } : '없음',
            totalSheets: workbook.worksheets.length
          });
        } catch (checkError) {
          console.error('❌ 워크시트 상태 확인 실패:', checkError.message);
        }
        
        throw new Error(`Excel 파일 생성에 실패했습니다: ${finalError.message}`);
      }
    }
    
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `(${templateType})${documentType}_${siteData?.name}.xlsx`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log(`✅ ${documentType} 생성 완료`);
    
    return {
      success: true,
      message: `${documentType}가 성공적으로 생성되었습니다.`,
      templateType: templateType,
      itemCount: itemCount
    };
    
  } catch (error) {
    console.error('❌ 문서 생성 실패:', error);
    return {
      success: false,
      error: error.message || '알 수 없는 오류가 발생했습니다.'
    };
  }
};

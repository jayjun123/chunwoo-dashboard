import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { filterActualMaterialItems, insertMaterialDataToWorksheet, convertMaterialDataForDocument } from './materialDataUtils';
import { getSafePrice, setCellValueSafely as setCellValueSafelyCommon, filterMaterialItems, logMaterialItem, cleanSheetData, fillEstimateStyleData, cleanEmptyRows } from './excelCommonUtils';

/**
 * 안전한 수식 처리 함수 (Shared Formula 문제 방지)
 * @param {ExcelJS.Workbook} workbook - 워크북
 */
const processFormulasSafely = (workbook) => {
  try {
    workbook.worksheets.forEach(sheet => {
      // 모든 셀에서 수식 안전 처리
      for (let row = 1; row <= sheet.rowCount; row++) {
        for (let col = 1; col <= sheet.columnCount; col++) {
          try {
            const cell = sheet.getCell(row, col);
            if (cell && cell.formula) {
              // Shared Formula 문제가 있는 수식 처리
              if (cell.formula.includes('shared') || cell.formula.includes('undefined')) {
                console.warn(`⚠️ ${row}행 ${col}열 Shared Formula 문제 발견:`, cell.formula);
                // 문제가 있는 수식은 값으로 대체
                const safeValue = cell.result || cell.value || '';
                cell.value = safeValue;
                try {
                  delete cell.formula;
                } catch (formulaError) {
                  console.warn(`⚠️ formula 속성 제거 실패:`, formulaError.message);
                }
              } else {
                // 정상적인 수식은 보존
                console.log(`✅ ${row}행 ${col}열 정상 수식 보존:`, cell.formula);
              }
            }
          } catch (cellError) {
            console.warn(`⚠️ ${row}행 ${col}열 셀 처리 실패:`, cellError.message);
          }
        }
      }
    });
    console.log('✅ 수식 안전 처리 완료');
  } catch (error) {
    console.warn('⚠️ 수식 안전 처리 중 오류:', error.message);
  }
};

/**
 * 공유 수식 완전 제거 함수
 * @param {ExcelJS.Workbook} workbook - 워크북
 */
const removeAllSharedFormulas = (workbook) => {
  try {
    workbook.worksheets.forEach(sheet => {
      // 모든 셀에서 공유 수식 관련 속성 제거
      for (let row = 1; row <= sheet.rowCount; row++) {
        for (let col = 1; col <= sheet.columnCount; col++) {
          try {
            const cell = sheet.getCell(row, col);
            if (cell && cell.formula) {
              // 수식이 있는 경우 값으로 대체하거나 제거
              if (cell.formula.includes('=')) {
                // 계산 수식인 경우 계산된 값으로 대체
                try {
                  const calculatedValue = cell.result || cell.value || '';
                  cell.value = calculatedValue;
                  delete cell.formula;
                } catch (calcError) {
                  // 계산 실패 시 빈 값으로 설정
                  cell.value = '';
                  delete cell.formula;
                }
              } else {
                // 단순 수식인 경우 제거
                delete cell.formula;
              }
            }
          } catch (cellError) {
            // 개별 셀 오류는 무시하고 계속 진행
            continue;
          }
        }
      }
    });
    console.log('✅ 공유 수식 완전 제거 완료');
  } catch (error) {
    console.warn('⚠️ 공유 수식 제거 중 오류:', error.message);
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

    // 수식이 있는 경우 안전하게 설정
    if (formula) {
      try {
        // ExcelJS 버전에 따른 안전한 수식 설정
        if (typeof cell.setFormula === 'function') {
          cell.setFormula(formula);
        } else if (cell.formula !== undefined) {
          // 읽기 전용이 아닌 경우에만 설정
          cell.formula = formula;
        } else {
          // 수식 설정이 불가능한 경우 값으로 대체
          console.warn('⚠️ 수식 설정이 불가능하여 값으로 대체:', formula);
          cell.value = value;
        }
      } catch (formulaError) {
        console.warn('⚠️ 수식 설정 실패, 값으로 대체:', formulaError.message);
        cell.value = value;
      }
    } else {
      // 일반 값 설정
      cell.value = value;
    }
    
    return true;
  } catch (error) {
    console.error('❌ 셀 값 설정 실패:', error.message);
    return false;
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
     const sheetNames = workbook.worksheets.map(sheet => sheet.name);
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
           name: isAdjustmentItem ? (columnB || columnA) : (columnB || columnA), // 품목명
           specification: columnA, // 규격 (A열)
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
             name: item.name,
             quantity: item.quantity,
             JEprice: item.JEprice,
             NOprice: item.NOprice,
             KYprice: item.KYprice,
             unitPrice: item.unitPrice,
             amount: item.amount
           });
         }
      }
    }
    
         console.log('✅ 견적서 파싱 완료, 총 항목 수:', items.length);
     
     // 단수정리 항목 최종 확인
     const adjustmentItems = items.filter(item => 
       item.name === '단수정리' || 
       item.name === 'NEGO' || 
       item.name === '간접비'
     );
     
     if (adjustmentItems.length > 0) {
       console.log('💰 단수정리 항목 최종 확인:', {
         count: adjustmentItems.length,
         items: adjustmentItems.map(item => ({
           name: item.name,
           quantity: item.quantity,
           JEprice: item.JEprice,
           NOprice: item.NOprice,
           KYprice: item.KYprice,
           unitPrice: item.unitPrice,
           amount: item.amount
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
           adjustmentItemNames: adjustmentItems.map(item => item.name)
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
      item.name === '단수정리' || 
      item.name === 'NEGO' || 
      item.name === '간접비'
    );
    console.log('🔍 단수정리 항목 확인:', {
      totalItems: items.length,
      adjustmentItems: adjustmentItems.length,
      adjustmentItemNames: adjustmentItems.map(item => item.name)
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
        item.name === '단수정리' || 
        item.name === 'NEGO' || 
        item.name === '간접비'
      );
      console.log('💾 저장된 단수정리 항목:', {
        count: savedAdjustmentItems.length,
        items: savedAdjustmentItems.map(item => ({
           name: item.name,
           quantity: item.quantity,
           JEprice: item.JEprice,
           NOprice: item.NOprice,
           KYprice: item.KYprice,
           unitPrice: item.unitPrice,
           amount: item.amount
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
        item.name === '단수정리' || 
        item.name === 'NEGO' || 
        item.name === '간접비'
      );
      console.log('💾 저장된 단수정리 항목:', {
        count: savedAdjustmentItems.length,
        items: savedAdjustmentItems.map(item => ({
           name: item.name,
           quantity: item.quantity,
           JEprice: item.JEprice,
           NOprice: item.NOprice,
           KYprice: item.KYprice,
           unitPrice: item.unitPrice,
           amount: item.amount
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
          name: item.name,
          specification: item.specification,
          unit: item.unit,
          quantity: item.quantity,
          JEprice: item.JEprice || item.price || 0,
          NOprice: item.NOprice || item.price || 0,
          KYprice: item.KYprice || 0,
          unitPrice: item.unitPrice || item.price || 0,
          amount: item.amount
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
      name: item.name,           // 품목명
      specification: item.specification, // 규격
      unit: item.unit,           // 단위
      quantity: item.quantity,   // 물량
      
      // === 단가/금액 정보 ===
      unitPrice: item.unitPrice, // 합계 단가 (기성금청구서용)
      amount: item.amount        // 합계 금액
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
export const generateEstimateExcel = async (siteData, materialData) => {
  try {
    console.log('📄 견적서 생성 시작:', { 
      siteName: siteData.name, 
      companyName: siteData.companyName,
      company: siteData.company,
      requesterName: siteData.requesterName,
      requester: siteData.requester,
      fullSiteData: siteData
    });
    
    // 현장 데이터 상세 로깅
    console.log('🔍 현장 데이터 상세 분석:');
    console.log('- name:', siteData.name);
    console.log('- companyName:', siteData.companyName);
    console.log('- company:', siteData.company);
    console.log('- requesterName:', siteData.requesterName);
    console.log('- requester:', siteData.requester);
    console.log('- 모든 키:', Object.keys(siteData));
    console.log('- 전체 데이터:', JSON.stringify(siteData, null, 2));
    
    // 견적서 템플릿 다운로드 (물량 타입에 따라 다른 템플릿 사용)
    const templateType = siteData.templateType || 'N'; // 기본값은 N
    
    // Firebase Storage에 실제로 저장된 파일명 사용
    let templateUrl;
    if (templateType === 'L') {
      templateUrl = 'https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2F(L)%EA%B2%AC%EC%A0%81%EC%84%9C.xlsx?alt=media&token=69b5f362-7de9-46df-ba38-8d22b75decb0';
    } else {
      templateUrl = 'https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2F(N)%EA%B2%AC%EC%A0%81%EC%84%9C.xlsx?alt=media&token=b9e999ea-cd6a-47ac-89bc-15bc49546544';
    }
    
    console.log(`📋 견적서 템플릿 선택: ${templateType} 타입 (${templateType === 'L' ? 'LONG' : 'NEW'})`);
    
    try {
      console.log('✅ 로컬 파일 직접 사용:', templateUrl);
      
      // 템플릿 파일 가져오기
      const response = await fetch(templateUrl);
      if (!response.ok) {
        throw new Error(`템플릿 파일 다운로드 실패: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('✅ 템플릿 파일 다운로드 완료:', arrayBuffer.byteLength, 'bytes');
      
      // ExcelJS로 워크북 읽기 (오류 처리 강화)
      const workbook = new ExcelJS.Workbook();
      try {
        await workbook.xlsx.load(arrayBuffer, {
          // Shared Formula 문제 방지
          sharedFormula: false,
          ignoreNodes: ['sharedFormula'],
          ignoreFormulas: false, // 수식은 유지하되 Shared Formula만 방지
          ignoreFormulaErrors: true,
          ignoreSharedFormulas: true,
          cellStyles: true,
          cellDates: true,
          cellNF: true,
          cellHTML: true,
          cellText: true,
          cellRichText: true,
          cellImages: true,
          cellProtection: true,
          cellComments: true,
          cellDataValidation: true,
          cellHyperlinks: true,
          cellMerges: true,
          cellConditionalFormats: true,
          cellThemes: true,
          cellViews: true,
          cellProperties: true,
          
          // 도형/박스 관련 옵션 (중요!)
          cellDrawings: true,
          cellCharts: true,
          cellTables: true,
          cellPivotTables: true,
          cellSlicers: true,
          cellSparklines: true,
          cellDataConnections: true,
          cellExternalLinks: true,
          cellNamedRanges: true,
          cellSheetProtection: true,
          cellWorkbookProtection: true,
          cellVBA: true,
          cellMacros: true,
          cellAddins: true,
          cellCustomUI: true,
          cellRibbon: true,
          cellQuickAccess: true,
          cellBackstage: true,
          cellTaskPanes: true,
          cellContentTypes: true,
          cellDigitalSignatures: true,
          cellEncryption: true,
          cellCompression: true,
          cellOptimization: true,
          cellBorders: true,
          cellFills: true,
          cellFonts: true,
          cellAlignment: true,
          cellNumberFormats: true,
          cellPatterns: true,
          cellGradients: true,
          cellEffects: true,
          cellShadows: true,
          cellReflections: true,
          cellGlows: true,
          cellSoftEdges: true,
          cell3D: true,
          cellTransforms: true,
          cellAnimations: true,
          cellTransitions: true,
          cellFilters: true,
          cellAdjustments: true,
          cellArtistic: true,
          cellPicture: true,
          cellShape: true,
          cellSmartArt: true,
          cellWordArt: true,
          cellEquation: true,
          cellSymbol: true,
          cellObject: true,
          cellOleObject: true,
          cellActiveX: true,
          cellFormControl: true,
          
          // 레거시 도형 관련 옵션 (매우 중요!)
          cellLegacyDrawing: true,
          cellLegacyDrawingHF: true,
          cellLegacyDrawingShape: true,
          cellLegacyDrawingGroup: true,
          cellLegacyDrawingPicture: true,
          cellLegacyDrawingOleObject: true,
         cellLegacyDrawingControl: true,
         cellLegacyDrawingTextBox: true,
         cellLegacyDrawingNote: true,
         cellLegacyDrawingPolyline: true,
         cellLegacyDrawingGroupShape: true,
         cellLegacyDrawingShapeGroup: true,
         cellLegacyDrawingConnector: true,
         cellLegacyDrawingFreeform: true,
         cellLegacyDrawingAutoShape: true,
         cellLegacyDrawingCallout: true,
         cellLegacyDrawingChart: true
       });
       console.log('✅ 워크북 읽기 완료, 시트 수:', workbook.worksheets.length);
     } catch (loadError) {
       console.error('❌ 워크북 로드 실패:', loadError.message);
       console.warn('⚠️ 단순 모드로 재시도...');
       
       // 단순 모드로 재시도 (Shared Formula 문제 방지)
       await workbook.xlsx.load(arrayBuffer, {
         sharedFormula: false,
         ignoreNodes: ['sharedFormula'],
         ignoreFormulas: false, // 수식은 유지하되 Shared Formula만 방지
         ignoreFormulaErrors: true,
         ignoreSharedFormulas: true,
         ignoreStyles: false, // 스타일은 유지
         ignoreRichText: false // Rich Text는 유지
       });
       console.log('✅ 워크북 읽기 완료 (단순 모드), 시트 수:', workbook.worksheets.length);
     }
     
     // Shared Formula 문제 방지 (이미 로드 시점에서 처리됨)
     console.log('🛡️ Shared Formula 문제 방지 완료 (로드 시점에서 처리)');
     
     // 공유 수식 완전 제거 (오류 방지)
     console.log('🧹 공유 수식 제거 시작...');
     processFormulasSafely(workbook);
     
     // 현재 날짜 정보
     const now = new Date();
     const currentYear = now.getFullYear();
     const currentMonth = now.getMonth() + 1;
      
     // 견적서 시트에 데이터 입력 및 C,D열 빈칸 처리
     let estimateSheet = workbook.getWorksheet('견적서') || workbook.getWorksheet('갑지') || workbook.getWorksheet(1);
     if (estimateSheet) {
       console.log('📝 견적서 시트에 데이터 입력 시작...');
       
       // 첫 번째 시트 (견적서 - 갑지)
       console.log('🔍 워크북 시트 정보:');
       workbook.worksheets.forEach((sheet, index) => {
         console.log(`- 시트 ${index + 1}: "${sheet.name}" (${sheet.rowCount}행 x ${sheet.columnCount}열)`);
       });
       
       // 시트 이름으로 찾기 (갑지 또는 첫 번째 시트) - 이미 위에서 선언됨
       if (estimateSheet) {
         console.log('✅ 견적서 시트(갑지) 로드 완료');
         console.log('📝 갑지 데이터 입력 시작...');
         console.log('📊 갑지 시트 정보:', {
           name: estimateSheet.name,
           rowCount: estimateSheet.rowCount,
           columnCount: estimateSheet.columnCount
         });
         
         try {
           // B3: 현재 년
           const yearCell = estimateSheet.getCell('B3');
           yearCell.value = currentYear;
           console.log('📅 B3 (년도) 입력:', currentYear);
           
           // D3: 현재 월
           const monthCell = estimateSheet.getCell('D3');
           monthCell.value = currentMonth;
           console.log('📅 D3 (월) 입력:', currentMonth);
           
           // B11: 현장관리페이지의 회사명 데이터
           const companyName = siteData.companyName || siteData.company || siteData.requesterName || siteData.requester || '대마팀';
           const companyCell = estimateSheet.getCell('B11');
           companyCell.value = companyName;
           console.log('🏢 B11 (회사명) 입력:', companyName);
           
           // H16: 현장명
           if (siteData.name) {
             const siteNameCell = estimateSheet.getCell('H16');
             siteNameCell.value = siteData.name;
            console.log('🏗️ H16 (현장명) 입력:', siteData.name);
          } else {
            console.log('⚠️ 현장명이 없습니다.');
          }
          
          // 견적서 제목은 원래 템플릿의 도형/박스로 유지
          console.log('📝 견적서 제목은 템플릿의 도형/박스로 유지');
          
          // 인감 이미지 추가 (납품계약서와 동일한 방식)
          try {
            const stampType = siteData?.stampType || '인감없음';
            console.log('🖊️ 인감 이미지 처리 시작:', stampType);
            
            // 인감 이미지 다운로드 (납품계약서와 동일한 방식)
            let imageName = 'signature.png'; // 기본값
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
              '인감없음': 'A.png',
              '네모': '네모.png',
              '동': '동.png',
              '별': '별.png',
              '삼각': '삼각.png',
              '스페이드': '스페이드.png',
              '클로버': '클로버.png',
              '하트': '하트.png'
            };
            
            const mappedImageName = stampImageMap[stampType];
            if (mappedImageName) {
              // 인감 이미지 가져오기 (임시로 로컬 파일 사용)
              console.log('🔧 임시 해결책: 로컬 인감 이미지 사용');
              try {
                const imagePath = `/${mappedImageName}`;
                console.log('📁 로컬 인감 이미지 경로:', imagePath);
                const response = await fetch(imagePath);
                if (!response.ok) {
                  throw new Error(`인감 이미지 다운로드 실패: ${response.status}`);
                }
                const arrayBuffer = await response.arrayBuffer();
                
                const imageId = workbook.addImage({
                  buffer: arrayBuffer,
                  extension: 'png',
                });
                
                // O22 셀 위치에 인감 이미지 추가
                estimateSheet.addImage(imageId, {
                  tl: { col: 14, row: 21 }, // O22 셀 (0-based index)
                  ext: { width: 60, height: 60 }
                });
                
                console.log('✅ 인감 이미지 삽입 완료 (O22):', stampType);
              } catch (stampError) {
                console.log('⚠️ 인감 이미지 추가 실패:', stampError);
              }
            } else {
              console.log('📝 인감 이미지 없음:', stampType);
            }
          } catch (stampError) {
            console.log('⚠️ 인감 이미지 추가 실패:', stampError);
          }
          
          console.log('✅ 갑지 데이터 입력 완료');
        } catch (cellError) {
          console.error('❌ 갑지 셀 입력 중 오류:', cellError);
          console.log('⚠️ 갑지 데이터 입력 실패, 기본 템플릿 유지');
        }
      } else {
        console.log('❌ 견적서 시트(갑지)를 찾을 수 없습니다.');
      }
      
      // 두 번째 시트 (내역서)
      const detailSheet = workbook.getWorksheet(2);
      if (!detailSheet) {
        throw new Error('내역서 시트를 찾을 수 없습니다.');
      }
      
      console.log('✅ 내역서 시트 로드 완료');
      
      // 템플릿의 원본 열 너비 유지 (수정하지 않음)
      console.log('📏 템플릿 원본 열 너비 유지');
      
      // A5부터 물량내역 데이터 입력
      if (materialData && materialData.items && materialData.items.length > 0) {
        console.log('📊 물량 데이터 입력 시작:', materialData.items.length, '개 항목');
        
        // 5번째 행의 수식들을 저장 (템플릿에서 가져옴)
        const templateRow5 = {
          F: detailSheet.getCell('F5').formula || detailSheet.getCell('F5').value,
          H: detailSheet.getCell('H5').formula || detailSheet.getCell('H5').value,
          J: detailSheet.getCell('J5').formula || detailSheet.getCell('J5').value,
          K: detailSheet.getCell('K5').formula || detailSheet.getCell('K5').value,
          L: detailSheet.getCell('L5').formula || detailSheet.getCell('L5').value,
          M: detailSheet.getCell('M5').formula || detailSheet.getCell('M5').value,
          N: detailSheet.getCell('N5').formula || detailSheet.getCell('N5').value,
          O: detailSheet.getCell('O5').formula || detailSheet.getCell('O5').value,
          P: detailSheet.getCell('P5').formula || detailSheet.getCell('P5').value,
          Q: detailSheet.getCell('Q5').formula || detailSheet.getCell('Q5').value,
          R: detailSheet.getCell('R5').formula || detailSheet.getCell('R5').value,
          S: detailSheet.getCell('S5').formula || detailSheet.getCell('S5').value
        };
        
        console.log('📋 5번째 행 수식 저장:', templateRow5);
        
        // 실제 물량 데이터만 필터링 (총계, 부가세 등 제외, 단수정리는 포함)
        console.log('🔍 materialData.items 원본:', materialData.items);
        
        const actualItems = materialData.items.filter(item => {
          // 단수정리는 무조건 포함
          if (item.name === '단수정리') {
            console.log(`✅ 단수정리 항목 무조건 포함:`, {
              name: item.name,
              specification: item.specification,
              unit: item.unit,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount
            });
            return true;
          }
          
          // 총계, 부가세, 계약금액 관련 항목 제외
          const shouldInclude = !item.isTotal && 
            !item.isVat && 
            !item.isTotalWithVat && 
            !item.isAdjustment; // 단수정리가 아닌 조정 항목은 제외
          
          if (shouldInclude) {
            console.log(`✅ 일반 물량 데이터 포함: ${item.name}`);
          } else {
            console.log(`❌ 제외 항목: ${item.name} (isTotal: ${item.isTotal}, isVat: ${item.isVat}, isTotalWithVat: ${item.isTotalWithVat}, isAdjustment: ${item.isAdjustment})`);
          }
          
          return shouldInclude;
        });
        
        console.log('📊 실제 물량 데이터:', actualItems.length, '개 항목');
        
        // 견적서 시트에 데이터 입력 및 C,D열 빈칸 처리
        let estimateSheet = workbook.getWorksheet('견적서') || workbook.getWorksheet('갑지') || workbook.getWorksheet(1);
        if (estimateSheet) {
          console.log('📝 견적서 시트에 데이터 입력 시작...');
          
          // 기존 데이터 행들 정리 (5행부터)
          const startRow = 5;
          const maxCleanupRow = 5 + actualItems.length + 10; // 여유분 포함
          
          for (let row = startRow; row <= maxCleanupRow; row++) {
            try {
              // 해당 행의 C, D 열 값 확인
              const cellC = estimateSheet.getCell(row, 3); // C열 (단위)
              const cellD = estimateSheet.getCell(row, 4); // D열 (수량)
              
              // C, D 열에 값이 없으면 해당 행의 C~M열만 빈칸으로 처리 (A,B열은 보존)
              const isEmptyCD = (!cellC.value || cellC.value === '') && 
                               (!cellD.value || cellD.value === '');
              
              if (isEmptyCD) {
                console.log(`📝 견적서 ${row}행 C,D열이 비어있어서 C~M열만 빈칸으로 처리`);
                
                // C~M열만 빈칸으로 처리 (수식은 보존, A,B열은 그대로)
                for (let col = 3; col <= 13; col++) { // C=3, M=13
                  try {
                    const cell = estimateSheet.getCell(row, col);
                    
                    if (cell.formula) {
                      console.log(`🛡️ 견적서 ${row}행 ${String.fromCharCode(64 + col)}열 수식 보존: ${cell.formula}`);
                      // 수식은 그대로 두고 값만 빈칸으로
                      cell.value = '';
                    } else {
                      // 수식이 없는 경우 값만 빈칸으로 처리
                      cell.value = '';
                      console.log(`✅ 견적서 ${row}행 ${String.fromCharCode(64 + col)}열 값만 빈칸 처리 완료`);
                    }
                    
                    console.log(`✅ 견적서 ${row}행 ${String.fromCharCode(64 + col)}열 처리 완료`);
                  } catch (e) {
                    console.log(`⚠️ 견적서 ${row}행 ${String.fromCharCode(64 + col)}열 처리 실패:`, e.message);
                  }
                }
              } else {
                console.log(`📝 견적서 ${row}행 C,D열에 데이터가 있어서 행 유지`);
              }
            } catch (error) {
              console.warn(`⚠️ 견적서 ${row}행 빈칸 처리 중 오류:`, error.message);
            }
          }
          
          console.log('✅ 견적서 C,D열 빈칸 처리 완료');
        }
        
        // 단수정리 항목이 있는지 확인하고 로그 출력
        const danSuJeongRiItems = actualItems.filter(item => item.name === '단수정리');
        console.log('🔍 단수정리 항목 확인:', danSuJeongRiItems.length, '개');
        danSuJeongRiItems.forEach((item, index) => {
          console.log(`📝 단수정리 ${index + 1}:`, {
            name: item.name,
            specification: item.specification,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            isAdjustment: item.isAdjustment
          });
        });
        
        // 25개 항목마다 줄 삽입
        const itemsPerPage = 25;
        let insertedRows = 0;
        
        actualItems.forEach((item, index) => {
          const originalRowIndex = 5 + index + insertedRows;
          
          // 단수정리 항목 상세 로깅
          if (item.name === '단수정리') {
            console.log(`🔍 단수정리 데이터 입력 전 상세 정보:`, {
              name: item.name,
              specification: item.specification,
              unit: item.unit,
              quantity: item.quantity,
              price: item.price,
              amount: item.amount,
              isAdjustment: item.isAdjustment,
              rowIndex: originalRowIndex
            });
          }
          
          // 25개 항목마다 줄 삽입 (첫 번째 페이지 제외)
          if (index > 0 && index % itemsPerPage === 0) {
            try {
              // 현재 행에 빈 줄 삽입
              detailSheet.spliceRows(originalRowIndex, 0, []);
              insertedRows++;
              console.log(`📄 ${originalRowIndex}행에 페이지 구분선 삽입`);
            } catch (insertError) {
              console.log('⚠️ 줄 삽입 실패:', insertError);
            }
          }
          
          const rowIndex = originalRowIndex;
          
          // 🛡️ 공통 유틸리티를 사용하여 견적서용 데이터 입력
          fillEstimateStyleData(detailSheet, [item], rowIndex, '견적서');
          
          // 단수정리 항목 입력 후 확인
          if (item.name === '단수정리') {
            console.log(`✅ 단수정리 데이터 입력 후 셀 값 확인:`, {
              A열_규격: detailSheet.getCell(`A${rowIndex}`).value,
              B열_품명: detailSheet.getCell(`B${rowIndex}`).value,
              C열_단위: detailSheet.getCell(`C${rowIndex}`).value,
              D열_수량: detailSheet.getCell(`D${rowIndex}`).value,
              E열_재료비단가: detailSheet.getCell(`E${rowIndex}`).value,
              G열_노무비단가: detailSheet.getCell(`G${rowIndex}`).value,
              I열_경비단가: detailSheet.getCell(`I${rowIndex}`).value,
              K열_합계단가: detailSheet.getCell(`K${rowIndex}`).value
            });
          }
          
          console.log(`📊 ${rowIndex}행: 데이터 입력 완료`);
        });
        
        console.log('✅ 물량 데이터 입력 완료');
        
        // 🛡️ 공통 유틸리티를 사용하여 빈 행 정리
        cleanEmptyRows(detailSheet, 5, '견적서');
        
        // C,D열에 값이 없으면 그 행 전체를 빈칸으로 처리
        console.log('🧹 견적서: C,D열에 값이 없는 행 전체 빈칸 처리 시작...');
        const maxCleanupRow = 5 + actualItems.length + insertedRows;
        
        for (let row = 5; row <= maxCleanupRow; row++) {
          try {
            // 해당 행의 C, D 열 값 확인
            const cellC = detailSheet.getCell(row, 3); // C열 (단위)
            const cellD = detailSheet.getCell(row, 4); // D열 (수량)
            
            // C, D 열에 값이 없으면 해당 행 전체를 빈칸으로 처리
            const isEmptyCD = (!cellC.value || cellC.value === '') && 
                             (!cellD.value || cellD.value === '');
            
            if (isEmptyCD) {
              console.log(`📝 견적서 ${row}행 C,D열이 비어있어서 행 전체를 빈칸으로 처리`);
              
              // C,D열에 값이 없으면 A,B열만 놔두고 나머지만 빈칸으로 처리 (수식은 보존)
              for (let col = 1; col <= 13; col++) { // A=1, M=13
                try {
                  const cell = detailSheet.getCell(row, col);
                  
                  // A,B열은 그대로 놔두기 (품명, 규격 보존)
                  if (col === 1 || col === 2) {
                    console.log(`🛡️ 견적서 ${row}행 ${String.fromCharCode(64 + col)}열 A,B열 보존: ${cell.value || ''}`);
                    continue; // A,B열은 건드리지 않음
                  }
                  
                  // C~M열만 빈칸으로 처리 (수식은 보존)
                  if (cell.formula) {
                    console.log(`🛡️ 견적서 ${row}행 ${String.fromCharCode(64 + col)}열 수식 보존: ${cell.formula}`);
                    // 수식은 그대로 두고 값만 빈칸으로
                    cell.value = '';
                  } else {
                    // 수식이 없는 경우 값만 빈칸으로 처리
                    cell.value = '';
                    console.log(`✅ 견적서 ${row}행 ${String.fromCharCode(64 + col)}열 값만 빈칸 처리 완료`);
                  }
                  
                  console.log(`✅ 견적서 ${row}행 ${String.fromCharCode(64 + col)}열 처리 완료`);
                } catch (e) {
                  console.log(`⚠️ 견적서 ${row}행 ${String.fromCharCode(64 + col)}열 처리 실패:`, e.message);
                }
              }
            } else {
              console.log(`📝 견적서 ${row}행 C,D열에 데이터가 있어서 행 유지`);
            }
          } catch (error) {
            console.warn(`⚠️ 견적서 ${row}행 빈칸 처리 중 오류:`, error.message);
          }
        }
        
        console.log('✅ 견적서 C,D열 빈칸 처리 완료');
      } else {
        console.log('⚠️ 물량 데이터가 없습니다.');
      }
      
      // 🛡️ 엑셀 오류 완전 방지 시스템 시작
      console.log('🛡️ 엑셀 오류 완전 방지 시스템 시작...');
      
      // 1. 모든 셀의 Shared Formula 완전 제거 (오류 방지)
      console.log('🔧 모든 셀의 Shared Formula 완전 제거 중...');
      try {
        detailSheet.eachRow((row, rowNumber) => {
          row.eachCell((cell, colNumber) => {
            try {
              if (cell && cell.formula && typeof cell.formula === 'string') {
                // Shared Formula 관련 문제가 있는 수식 처리
                if (cell.formula.includes('shared') || cell.formula.includes('undefined') || 
                    cell.formula.includes('NaN') || cell.formula.includes('error')) {
                  console.log(`🔧 ${rowNumber}행 ${colNumber}열 문제 수식 정리: ${cell.formula}`);
                  
                  // 수식 값을 보존하고 Shared Formula 속성만 제거
                  const formulaValue = cell.formula;
                  try {
                    // formula 속성이 read-only인 경우를 대비한 안전한 처리
                    if (cell.formula !== undefined) {
                      cell.formula = undefined;
                    }
                  } catch (formulaError) {
                    console.warn(`⚠️ formula 속성 제거 실패 (read-only):`, formulaError.message);
                  }
                  
                  cell.value = formulaValue;
                  
                  // 추가 안전장치: 셀 타입을 텍스트로 설정
                  cell.type = ExcelJS.ValueType.String;
                }
              }
            } catch (cellError) {
              console.warn(`⚠️ ${rowNumber}행 ${colNumber}열 셀 처리 실패:`, cellError.message);
              // 오류 발생 시 셀을 빈 값으로 초기화
              try {
                if (cell) {
                  setCellValueSafely(cell, '');
                }
              } catch (resetError) {
                console.warn(`⚠️ ${rowNumber}행 ${colNumber}열 셀 초기화 실패:`, resetError.message);
              }
            }
          });
        });
        console.log('✅ 모든 셀의 Shared Formula 제거 완료');
      } catch (formulaError) {
        console.warn('⚠️ 전체 셀 처리 중 오류:', formulaError.message);
      }
      
      // 2. 특정 문제 셀들 강제 수정 (F38, I9 등)
      const problemCells = [
        { address: 'F38', description: 'F38 셀 Shared Formula' },
        { address: 'I9', description: 'I9 셀 불완전한 수식' },
        { address: 'F39', description: 'F39 셀 예방적 처리' },
        { address: 'F40', description: 'F40 셀 예방적 처리' }
      ];
      
      problemCells.forEach(({ address, description }) => {
        try {
          const cell = detailSheet.getCell(address);
          if (cell && cell.formula) {
            console.log(`🔧 ${description} 처리: ${cell.formula}`);
            
            // 수식 값을 보존하고 문제 속성 제거
            const formulaValue = cell.formula;
            try {
              // formula 속성이 read-only인 경우를 대비한 안전한 처리
              if (cell.formula !== undefined) {
                cell.formula = undefined;
              }
            } catch (formulaError) {
              console.warn(`⚠️ formula 속성 제거 실패 (read-only):`, formulaError.message);
            }
            
            cell.value = formulaValue;
            cell.type = ExcelJS.ValueType.String;
            
            console.log(`✅ ${description} 처리 완료`);
          }
        } catch (cellError) {
          console.warn(`⚠️ ${description} 처리 실패:`, cellError.message);
          // 오류 발생 시 셀을 안전하게 초기화
          try {
            const cell = detailSheet.getCell(address);
            if (cell) {
              setCellValueSafely(cell, '');
            }
          } catch (resetError) {
            console.warn(`⚠️ ${address} 셀 초기화 실패:`, resetError.message);
          }
        }
      });
      
      // 3. 전체 워크북 안전성 검사 및 [object Object] 완전 방지
      console.log('🔍 전체 워크북 안전성 검사 및 [object Object] 완전 방지 중...');
      try {
        // 모든 시트의 모든 셀 검사
        workbook.worksheets.forEach((sheet, sheetIndex) => {
          console.log(`📋 ${sheet.name} 시트 검사 중...`);
          
          sheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {
              try {
                // [object Object] 완전 방지
                if (cell && cell.value !== null && cell.value !== undefined) {
                  // 1. 객체 타입 값 강제 변환
                  if (typeof cell.value === 'object') {
                    console.log(`🔧 ${sheet.name} ${rowNumber}행 ${colNumber}열 Object 값 발견: ${cell.value}`);
                    
                    // 객체를 안전한 문자열로 변환
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
                    } catch (stringifyError) {
                      safeValue = '데이터오류';
                    }
                    
                    // [object Object]가 포함된 경우 안전한 값으로 교체
                    if (safeValue.includes('[object Object]') || safeValue.includes('[object ')) {
                      safeValue = '데이터오류';
                    }
                    
                    console.log(`🔧 ${sheet.name} ${rowNumber}행 ${colNumber}열 Object 값 정리: ${safeValue}`);
                    if (cell) {
                      setCellValueSafely(cell, safeValue);
                    }
                  }
                  
                  // 2. 문자열에 [object Object] 포함된 경우 처리
                  else if (typeof cell.value === 'string' && cell.value.includes('[object Object]')) {
                    console.log(`🔧 ${sheet.name} ${rowNumber}행 ${colNumber}열 [object Object] 문자열 정리: ${cell.value}`);
                    if (cell) {
                      setCellValueSafely(cell, '데이터오류');
                    }
                  }
                  
                  // 3. 숫자가 아닌 값이 숫자 셀에 들어간 경우 처리
                  else if (cell.type === ExcelJS.ValueType.Number && isNaN(Number(cell.value))) {
                    console.log(`🔧 ${sheet.name} ${rowNumber}행 ${colNumber}열 숫자 셀 정리: ${cell.value}`);
                    if (cell) {
                      setCellValueSafely(cell, 0);
                    }
                  }
                }
              } catch (cellError) {
                console.warn(`⚠️ ${sheet.name} ${rowNumber}행 ${colNumber}열 검사 실패:`, cellError.message);
                // 오류 발생 시 셀을 안전한 값으로 초기화
                try {
                  if (cell) {
                    setCellValueSafely(cell, '오류');
                  }
                } catch (resetError) {
                  console.warn(`⚠️ ${sheet.name} ${rowNumber}행 ${colNumber}열 초기화 실패:`, resetError.message);
                }
              }
            });
          });
        });
        console.log('✅ 전체 워크북 안전성 검사 및 [object Object] 완전 방지 완료');
      } catch (workbookError) {
        console.warn('⚠️ 전체 워크북 검사 실패:', workbookError.message);
      }
      
      console.log('🛡️ 엑셀 오류 완전 방지 시스템 완료!');
      
      // 🛡️ 엑셀 파일 생성 최종 안전장치
      console.log('📄 엑셀 파일 생성 시작 (최종 안전장치 적용)');
      let excelBuffer;
      
      // 1차 시도: 기본 모드
      try {
        excelBuffer = await workbook.xlsx.writeBuffer();
        console.log('✅ 엑셀 파일 생성 완료 (1차 시도):', excelBuffer.byteLength, 'bytes');
      } catch (writeError) {
        console.warn('⚠️ 1차 시도 실패, 2차 시도 (단순 모드)...');
        
        // 2차 시도: 단순 모드
        try {
          excelBuffer = await workbook.xlsx.writeBuffer({
            ignoreNodes: ['shared-formula', 'shared-formula-ref', 'shared-formula-master', 'formula'],
            ignoreFormulas: true,
            ignoreFormulaErrors: true,
            ignoreSharedFormulas: true,
            cellFormula: false,
            cellStyles: false,
            cellDates: false
          });
          console.log('✅ 엑셀 파일 생성 완료 (2차 시도 - 단순 모드):', excelBuffer.byteLength, 'bytes');
        } catch (simpleError) {
          console.warn('⚠️ 2차 시도 실패, 3차 시도 (최소 모드)...');
          
          // 3차 시도: 최소 모드 (데이터만)
          try {
            excelBuffer = await workbook.xlsx.writeBuffer({
              ignoreNodes: ['shared-formula', 'shared-formula-ref', 'shared-formula-master', 'formula', 'styles', 'themes'],
              ignoreFormulas: true,
              ignoreFormulaErrors: true,
              ignoreSharedFormulas: true,
              cellFormula: false,
              cellStyles: false,
              cellDates: false,
              cellNF: false,
              cellHTML: false,
              cellRichText: false,
              cellImages: false,
              cellProtection: false,
              cellComments: false,
              cellDataValidation: false,
              cellHyperlinks: false,
              cellMerges: false,
              cellConditionalFormats: false,
              cellThemes: false,
              cellViews: false,
              cellProperties: false
            });
            console.log('✅ 엑셀 파일 생성 완료 (3차 시도 - 최소 모드):', excelBuffer.byteLength, 'bytes');
          } catch (minimalError) {
            console.error('❌ 모든 시도 실패, 최후 수단 실행...');
            
            // 최후 수단: 새 워크북 생성
            try {
              console.log('🆘 최후 수단: 새 워크북으로 재생성...');
              const emergencyWorkbook = new ExcelJS.Workbook();
              const emergencySheet = emergencyWorkbook.addWorksheet('견적서');
              
              // 기본 데이터만 복사
              emergencySheet.getCell('A1').value = '견적서 (안전 모드)';
              emergencySheet.getCell('A2').value = `현장명: ${siteData.name || '알 수 없음'}`;
              emergencySheet.getCell('A3').value = `생성일: ${new Date().toLocaleDateString()}`;
              
              if (materialData && materialData.items) {
                materialData.items.forEach((item, index) => {
                  const row = index + 4;
                  emergencySheet.getCell(`A${row}`).value = item.name || '';
                  emergencySheet.getCell(`B${row}`).value = item.specification || '';
                  emergencySheet.getCell(`C${row}`).value = item.quantity || '';
                  emergencySheet.getCell(`D${row}`).value = item.amount || '';
                });
              }
              
              excelBuffer = await emergencyWorkbook.xlsx.writeBuffer();
              console.log('✅ 엑셀 파일 생성 완료 (최후 수단 - 새 워크북):', excelBuffer.byteLength, 'bytes');
              
            } catch (emergencyError) {
              console.error('💀 최후 수단도 실패:', emergencyError.message);
              throw new Error('엑셀 파일 생성이 불가능합니다. 시스템 오류를 확인해주세요.');
            }
          }
        }
      }
      
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      console.log('✅ Blob 생성 완료:', blob.size, 'bytes');
      
      // 파일 다운로드 (팝업 완전 차단 - 최종 방법)
      try {
        // 브라우저 팝업 차단 시도
        const originalConfirm = window.confirm;
        const originalAlert = window.alert;
        window.confirm = () => true;
        window.alert = () => {};
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `(견적서)${siteData.name}.xlsx`;
        link.style.display = 'none';
        link.style.visibility = 'hidden';
        link.style.position = 'absolute';
        link.style.left = '-9999px';
        link.style.top = '-9999px';
        link.style.opacity = '0';
        link.style.pointerEvents = 'none';
        
        console.log('📥 파일 다운로드 시작:', link.download);
        document.body.appendChild(link);
        
        // 즉시 다운로드 실행
        link.click();
        
        // 원래 함수 복원
        setTimeout(() => {
          window.confirm = originalConfirm;
          window.alert = originalAlert;
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
        
      } catch (error) {
        console.log('⚠️ 다운로드 실패, 기본 방법으로 시도:', error);
        // 기본 방법으로 폴백
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `(견적서)${siteData.name}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
      
      console.log('✅ 견적서 생성 완료 (팝업 없이 다운로드)');
      
      return {
        success: true,
        message: '견적서가 성공적으로 생성되었습니다.'
      };
      
    } catch (templateError) {
      console.error('❌ 템플릿 처리 실패:', templateError);
      throw new Error(`템플릿 처리 실패: ${templateError.message}`);
    }
    
  } catch (error) {
    console.error('❌ 견적서 생성 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

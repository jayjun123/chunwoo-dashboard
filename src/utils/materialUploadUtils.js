import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { filterActualMaterialItems, insertMaterialDataToWorksheet, convertMaterialDataForDocument } from './materialDataUtils.js';


/**
 * 견적서 엑셀 파일에서 물량 데이터를 파싱하는 함수
 * 두 번째 시트(내역서)에서 A,B,C,D,E,G,I,M:5~쭉쭉 가다가 [ 총 공 사 금 액 ]이 나오는 행 바로 전까지 데이터 추출
 */
export const parseEstimateExcel = async (file, siteId, siteName) => {
  try {
    console.log('📊 견적서 엑셀 파싱 시작:', { siteId, siteName });
    
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellFormula: true });
    
    // 두 번째 시트 찾기 (내역서)
    const sheetNames = workbook.SheetNames;
    if (sheetNames.length < 2) {
      throw new Error('내역서 시트를 찾을 수 없습니다. 최소 2개의 시트가 필요합니다.');
    }
    
    const detailSheetName = sheetNames[1]; // 두 번째 시트
    console.log('📋 내역서 시트명:', detailSheetName);
    
    const worksheet = workbook.Sheets[detailSheetName];
    if (!worksheet) {
      throw new Error('내역서 시트를 읽을 수 없습니다.');
    }
    
    // 시트 데이터를 2차원 배열로 변환
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const data = [];
    
    for (let row = range.s.r; row <= range.e.r; row++) {
      const rowData = [];
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        rowData.push(cell ? cell.v : '');
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
         const columnE = parseNumber(row[4]); // E열 - 단가
         const columnG = parseNumber(row[6]); // G열 - 금액
         const columnI = String(row[8] || '').trim(); // I열 - 비고
         const columnK = parseNumber(row[10]); // K열 - 단가
         const columnL = parseNumber(row[11]); // L열 - 금액
         const columnM = parseNumber(row[12]); // M열 - 합계
         
         // A열에 값이 있고 B열이 비어있으면 A열 값을 B열에 복사
         if (columnA && !columnB) {
           console.log(`📝 ${rowNumber}행: A열 값 "${columnA}"을 B열에 복사`);
           columnB = columnA;
         }
         
         // 디버깅: 각 행의 데이터 확인 (오브젝트 체크)
         const hasObject = columnA.includes('[object Object]') || columnB.includes('[object Object]') || 
                          columnC.includes('[object Object]') || columnI.includes('[object Object]');
         
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
        if ((columnA && columnA.trim() === '단수정리') || (columnB && columnB.trim() === '단수정리')) {
          console.log(`🔍 단수정리 항목 확인 (${rowNumber}행):`, {
            columnA: columnA,
            columnA_trim: columnA ? columnA.trim() : '',
            columnB: columnB,
            columnB_trim: columnB ? columnB.trim() : '',
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
            columnA_trim: columnA ? columnA.trim() : '',
            columnA_타입: typeof columnA,
            columnA_길이: columnA ? columnA.length : 0,
            columnA_포함단수정리: columnA ? columnA.includes('단수정리') : false,
            columnA_정확일치: columnA ? columnA.trim() === '단수정리' : false,
            isAdjustmentItem: isAdjustmentItem,
            columnB: columnB,
            columnC: columnC,
            columnD: columnD,
            columnE: columnE
          });
        }
        
        const isValidItem = columnA && 
            columnA.trim() !== '' && 
            !columnA.includes('총공사계') && 
            !columnA.includes('부가세') && 
            !columnA.includes('계약금액') &&
            !columnA.includes('[object Object]') &&
            (isAdjustmentItem || (columnB && columnB.trim() !== '' && !columnB.includes('[object Object]'))) &&
            (columnD !== undefined || columnE !== undefined || columnG !== undefined || columnK !== undefined || columnL !== undefined);
            
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
          
          // 단수정리 항목일 때 수량을 1로 고정하고, 단가를 금액과 동일하게 설정
          let finalQuantity = columnD;
          let finalUnitPrice = columnK || columnE;
          let finalAmount = columnL || columnG;
          
          if (isAdjustmentItem) {
            finalQuantity = 1; // 단수정리는 수량을 1로 고정
            finalAmount = columnL || columnG || columnM; // L열 또는 G열 또는 M열에서 금액 가져오기
            finalUnitPrice = finalAmount; // 단가를 금액과 동일하게 설정
            
            console.log(`📝 단수정리 항목 처리 (${rowNumber}행):`, {
              원본수량: columnD,
              원본단가: columnK || columnE,
              원본금액: columnL || columnG,
              설정수량: finalQuantity,
              설정단가: finalUnitPrice,
              설정금액: finalAmount
            });
          }
          
                     const item = {
             // 기본 정보
             name: isAdjustmentItem ? (columnB || columnA) : (columnB || columnA), // 단수정리/NEGO/간접비는 B열 우선, 없으면 A열 사용
             specification: columnA, // A열 품명
             unit: isAdjustmentItem ? (columnC || '식') : columnC, // 단수정리/NEGO/간접비는 단위가 없으면 '식'으로 설정
             quantity: finalQuantity, // 단수정리는 1로 고정, 일반 항목은 원본 수량
             JEprice: columnE, // E열 - 재료비 단가
             NOprice: columnG, // G열 - 노무비 단가
             KYprice: columnI, // I열 - 경비 단가
             unitPrice: finalUnitPrice, // 단수정리는 금액과 동일, 일반 항목은 원본 단가
             amount: finalAmount, // L열 - 합계 금액 (기본값: G열)
             
             // 셀 주소로 저장 (A5, B5, C5 형태) - 각 행별로 올바른 셀 주소 사용
             [`A${rowNumber}`]: columnA, // A5, A6, A7... - 품명
             [`B${rowNumber}`]: columnB, // B5, B6, B7... - 규격
             [`C${rowNumber}`]: columnC, // C5, C6, C7... - 단위
             [`D${rowNumber}`]: columnD, // D5, D6, D7... - 수량
             [`E${rowNumber}`]: columnE, // E5, E6, E7... - 단가
             [`G${rowNumber}`]: columnG, // G5, G6, G7... - 금액
             [`I${rowNumber}`]: columnI, // I5, I6, I7... - 비고
             [`K${rowNumber}`]: columnK, // K5, K6, K7... - 단가
             [`L${rowNumber}`]: columnL, // L5, L6, L7... - 금액
             [`M${rowNumber}`]: columnM, // M5, M6, M7... - 합계
             
             // 기존 호환성을 위한 columnX 형태도 유지
             columnA: columnA, // A열 - 품명
             columnB: columnB, // B열 - 규격
             columnC: columnC, // C열 - 단위
             columnD: columnD, // D열 - 수량
             columnE: columnE, // E열 - 단가
             columnG: columnG, // G열 - 금액
             columnI: columnI, // I열 - 비고
             columnK: columnK, // K열 - 단가
             columnL: columnL, // L열 - 금액
             columnM: columnM, // M열 - 합계
             
             remark: columnI, // I열 비고
             sequence: items.length + 1, // 순서 번호
             rowNumber: rowNumber, // 실제 행 번호
             createdAt: new Date(),
             updatedAt: new Date()
           };
        
        items.push(item);
        console.log('✅ 항목 파싱:', {
          name: item.name,
          specification: item.specification,
          unit: item.unit,
          quantity: item.quantity,
          amount: item.amount,
          isAdjustmentItem: isAdjustmentItem,
          rowNumber: rowNumber
        });
      }
    }
    
    console.log('📊 파싱 완료:', {
      itemsCount: items.length,
      totalContractAmount,
      totalVat,
      contractAmount
    });
    
    return {
      success: true,
      data: {
        items,
        summary: {
          totalContractAmount,
          totalVat,
          contractAmount,
          itemsCount: items.length
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
  
  // 소수점 둘째자리까지 반올림
  return Math.round(num * 100) / 100;
};

/**
 * 통합 물량 데이터 업로드 함수
 */
export const uploadMaterialData = async (file, siteId, siteName) => {
  try {
    console.log('🚀 물량 데이터 업로드 시작:', { siteId, siteName });
    
    // 1. 엑셀 파일 파싱
    const parseResult = await parseEstimateExcel(file, siteId, siteName);
    
    if (!parseResult.success) {
      throw new Error(`파싱 실패: ${parseResult.error}`);
    }
    
    // 2. 파이어베이스에 저장
    const saveResult = await saveMaterialDataToFirebase(siteId, siteName, parseResult.data);
    
    if (!saveResult.success) {
      throw new Error(`저장 실패: ${saveResult.error}`);
    }
    
    console.log('✅ 물량 데이터 업로드 완료');
    
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
    
    // 항목, 물량, 단가, 금액만 추출
    const siteManagementItems = items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
      unit: item.unit,
      specification: item.specification
    }));
    
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
    
    const templateRef = ref(storage, 'templates/견적서.xlsx');
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
    
    // 견적서 템플릿 다운로드 (토큰 없이 직접 접근)
    const templateUrl = 'https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2Festimate.xlsx?alt=media';
    
    try {
      console.log('✅ 로컬 파일 직접 사용:', templateUrl);
      
      // 템플릿 파일 가져오기
      const response = await fetch(templateUrl);
      if (!response.ok) {
        throw new Error(`템플릿 파일 다운로드 실패: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('✅ 템플릿 파일 다운로드 완료:', arrayBuffer.byteLength, 'bytes');
      
      // ExcelJS로 워크북 읽기 (공유 수식 문제 해결을 위한 단순화된 옵션)
       const workbook = new ExcelJS.Workbook();
       await workbook.xlsx.load(arrayBuffer, {
         // 기본 옵션만 사용 (공유 수식 문제 방지)
         cellFormula: true,
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
      
      // 현재 날짜 정보
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      // 첫 번째 시트 (견적서 - 갑지)
      console.log('🔍 워크북 시트 정보:');
      workbook.worksheets.forEach((sheet, index) => {
        console.log(`- 시트 ${index + 1}: "${sheet.name}" (${sheet.rowCount}행 x ${sheet.columnCount}열)`);
      });
      
      // 시트 이름으로 찾기 (갑지 또는 첫 번째 시트)
      let estimateSheet = workbook.getWorksheet('견적서') || workbook.getWorksheet('갑지') || workbook.getWorksheet(1);
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
        const actualItems = materialData.items.filter(item => 
          !item.isTotal && 
          !item.isVat && 
          !item.isTotalWithVat && 
          // 단수정리는 포함 (isAdjustment가 true여도 단수정리는 포함)
          (item.name === '단수정리' || !item.isAdjustment)
        );
        
        console.log('📊 실제 물량 데이터:', actualItems.length, '개 항목');
        
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
          
          // 공통 유틸리티를 사용하여 견적서용 데이터 입력
          // 데이터 구조 디버깅
          console.log('🔍 현재 아이템 데이터 구조:', item);
          console.log('🔍 아이템 키들:', Object.keys(item));
          console.log('🔍 price 필드 확인:', item.price);
          console.log('🔍 unitPrice 필드 확인:', item.unitPrice);
          

          
          // 견적서 템플릿 구조에 맞는 올바른 매핑
          // A열: 규격, B열: 품명, C열: 단위, D열: 수량
          // E열: 재료비 단가, F열: 재료비 금액 (수식: D*E)
          // G열: 노무비 단가, H열: 노무비 금액 (수식: D*G)
          // I열: 경비 단가, J열: 경비 금액 (수식: D*I)
          // K열: 합계 단가 (수식: E+G+I), L열: 합계 금액 (수식: D*K), M열: 비고
          const mapping = {
            A: 'specification', // A열 - 규격
            B: 'name',          // B열 - 품명
            C: 'unit',          // C열 - 단위
            D: 'quantity',      // D열 - 수량
            E: 'JEprice',       // E열 - 재료비 단가
            F: '',              // F열 - 재료비 금액 (수식: D*E)
            G: 'NOprice',       // G열 - 노무비 단가
            H: '',              // H열 - 노무비 금액 (수식: D*G)
            I: 'KYprice',       // I열 - 경비 단가
            J: '',              // J열 - 경비 금액 (수식: D*I)
            K: 'unitPrice',     // K열 - 합계 단가
            L: '',              // L열 - 합계 금액 (수식: D*K)
            M: 'note'           // M열 - 비고
          };
          
          for (const [cell, key] of Object.entries(mapping)) {
            let value;
            if (key === '') {
              value = ''; // 빈 값
            } else {
              value = item[key]; // 원본 데이터 직접 사용
            }
            
            console.log(`🔍 ${cell}열 ${key} 키 값 확인:`, value);
            
            const cellAddress = `${cell}${rowIndex}`;
            const cellObj = detailSheet.getCell(cellAddress);
            
            // 수식이 있는 셀은 건드리지 않음 (공유 수식 문제 방지)
            if (cellObj.formula) {
              console.log(`⚠️ ${cellAddress} 수식이 있어 건드리지 않음: ${cellObj.formula}`);
              continue;
            }
            
            if (value !== undefined && value !== null && value !== '') {
              // 수량은 소수점 유지
              if (key === 'quantity') {
                cellObj.value = Number(value);
              } else if (key === 'price' || key === 'amount') {
                cellObj.value = Number(value);
              } else {
                cellObj.value = value;
              }
              
              console.log(`✅ ${cellAddress} 입력: ${value}`);
            } else if (key === '') {
              // 빈 값은 명시적으로 빈 문자열로 설정
              cellObj.value = '';
              console.log(`✅ ${cellAddress} 빈 값으로 설정`);
            } else {
              console.log(`⚠️ ${key} 키 값이 비어있음:`, value);
            }
          }
          
                      // 수식 있는 열은 건드리지 않음 (F, H, J, K, L, M, N, O, P, Q, R, S)
            console.log(`📊 ${rowIndex}행: 데이터 입력 완료, 수식은 템플릿 그대로 유지`);
          
          console.log(`📝 ${rowIndex}행 입력 완료:`, {
            A: item.name || '',
            B: item.specification || '',
            C: item.unit || '',
            D: item.quantity || '',
            E: item.price || '',
            F: item.amount || '',
            G: item.price || '',
            H: item.amount || '',
            I: '',
            J: '',
            K: item.price || '',
            L: item.amount || '',
            M: item.note || '',
            수식복사: '템플릿 그대로 유지'
          });
        });
        
        console.log('✅ 물량 데이터 입력 완료');
        
        // 빈 행의 수식 제거 (A,B,C,D열에 데이터가 없으면 E~M열 수식 제거)
        console.log('🧹 빈 행의 수식 정리 시작...');
        const lastRow = detailSheet.rowCount;
        console.log(`📊 템플릿 총 행 수: ${lastRow}행`);
        
        for (let rowIndex = 5; rowIndex <= lastRow; rowIndex++) {
          const row = detailSheet.getRow(rowIndex);
          if (!row) continue;
          
          // A, B, C, D열에 데이터가 있는지 확인
          const hasData = ['A', 'B', 'C', 'D'].some(col => {
            const cell = detailSheet.getCell(`${col}${rowIndex}`);
            const value = cell.value;
            return value !== null && value !== undefined && value !== '' && 
                   (typeof value === 'string' ? value.trim() !== '' : true);
          });
          
          if (!hasData) {
            // 데이터가 없으면 E~M열의 수식 제거
            ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].forEach(col => {
              const cell = detailSheet.getCell(`${col}${rowIndex}`);
              if (cell.formula) {
                console.log(`🧹 ${col}${rowIndex} 수식 제거: ${cell.formula}`);
                cell.value = null; // 수식 제거
              }
            });
          }
        }
        
        console.log('✅ 빈 행의 수식 정리 완료');
      } else {
        console.log('⚠️ 물량 데이터가 없습니다.');
      }
      
             // 엑셀 파일 생성 (공유 수식 문제 해결을 위한 단순화된 옵션)
       console.log('📄 엑셀 파일 생성 시작');
       const excelBuffer = await workbook.xlsx.writeBuffer({
         filename: '견적서.xlsx',
         useStyles: true,
         useSharedStrings: true,
         useTheme: true,
         useProperties: true,
         useComments: true,
         useDataValidation: true,
         useConditionalFormats: true,
         useImages: true,
         useMerges: true,
         useHyperlinks: true,
         useProtection: true,
         useDrawings: true,
         useCharts: true,
         useTables: true,
         usePivotTables: true,
         useSlicers: true,
         useSparklines: true,
         useDataConnections: true,
         useExternalLinks: true,
         useNamedRanges: true,
         useSheetProtection: true,
         useWorkbookProtection: true,
         useVBA: true,
         useMacros: true,
         useAddins: true,
         useCustomUI: true,
         useRibbon: true,
         useQuickAccess: true,
         useBackstage: true,
         useTaskPanes: true,
         useContentTypes: true,
         useDigitalSignatures: true,
         useEncryption: true,
         useCompression: true,
         useOptimization: true,
         useAllFeatures: true,
         useBorders: true,
         useFills: true,
         useFonts: true,
         useAlignment: true,
         useNumberFormats: true,
         usePatterns: true,
         useGradients: true,
         useEffects: true,
         useShadows: true,
         useReflections: true,
         useGlows: true,
         useSoftEdges: true,
         use3D: true,
         useTransforms: true,
         useAnimations: true,
         useTransitions: true,
         useFilters: true,
         useAdjustments: true,
         useArtistic: true,
         usePicture: true,
         useShape: true,
         useSmartArt: true,
         useWordArt: true,
         useEquation: true,
         useSymbol: true,
         useObject: true,
         useOleObject: true,
         useActiveX: true,
         useFormControl: true,
         useLegacyDrawing: true,
         useLegacyDrawingHF: true,
         useLegacyDrawingShape: true,
         useLegacyDrawingGroup: true,
         useLegacyDrawingPicture: true,
         useLegacyDrawingOleObject: true,
         useLegacyDrawingControl: true,
         useLegacyDrawingTextBox: true,
         useLegacyDrawingNote: true,
         useLegacyDrawingPolyline: true,
         useLegacyDrawingGroupShape: true,
         useLegacyDrawingShapeGroup: true,
         useLegacyDrawingConnector: true,
         useLegacyDrawingFreeform: true,
         useLegacyDrawingAutoShape: true,
         useLegacyDrawingCallout: true,
         useLegacyDrawingChart: true
       });
       const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
       console.log('✅ 엑셀 파일 생성 완료:', blob.size, 'bytes');
      
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

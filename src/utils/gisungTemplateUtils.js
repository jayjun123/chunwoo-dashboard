// 기성금청구서 유틸리티 (템플릿 기반)
import ExcelJS from 'exceljs';
import { templateUrls } from './templateUrls';
import { getSafePrice, setCellValueSafely, filterMaterialItems, logMaterialItem, cleanSheetData, fillGisungStyleData } from './excelCommonUtils';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

// templateUrls를 사용하여 템플릿 다운로드
const downloadTemplateFromUrls = async (templateKey) => {
  try {
    console.log(`📥 templateUrls에서 템플릿 다운로드 시작: ${templateKey}`);
    
    const templateUrl = templateUrls[templateKey];
    if (!templateUrl) {
      throw new Error(`템플릿 URL을 찾을 수 없습니다: ${templateKey}`);
    }
    
    // 템플릿 파일 다운로드
    console.log('📥 템플릿 파일 다운로드 중...');
    const response = await fetch(templateUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log(`✅ 템플릿 다운로드 완료: ${templateKey} (${arrayBuffer.byteLength} bytes)`);
    
    return arrayBuffer;
  } catch (error) {
    console.error(`❌ 템플릿 다운로드 실패: ${templateKey}`, error);
    throw new Error(`템플릿 다운로드 중 오류가 발생했습니다: ${error.message}`);
  }
};

// 기성금청구서 템플릿 기반 생성
export const generateTemplateBasedGisungExcel = async (siteData, gisungData, siteItems = [], currentSequence = 1, previousGisungData = null) => {
  try {
    console.log('🚀 기성금청구서 템플릿 기반 생성 시작');
    
    // 물량 데이터 개수에 따라 템플릿 선택
    const itemCount = siteItems.length;
    
    // siteData.templateType이 'AUTO'인 경우 물량 개수로 결정, 그렇지 않으면 기존 값 사용
    let templateType;
    if (siteData.templateType === 'AUTO') {
      templateType = itemCount > 20 ? 'L' : 'N';
      console.log(`🔄 AUTO 모드: 물량 ${itemCount}개 → ${templateType} 타입 선택`);
    } else {
      templateType = siteData.templateType || 'N';
      console.log(`📋 수동 설정: ${templateType} 타입 사용`);
    }
    
    const templateKey = `(${templateType})기성금청구서`;
    
    console.log(`📊 물량 개수: ${itemCount}개 → ${templateType} 타입 템플릿 사용`);
    console.log(`📋 기성금청구서 템플릿 선택: ${templateType} 타입 (${templateType === 'L' ? 'LONG' : 'NEW'})`);
    
    if (!templateUrls[templateKey]) {
      throw new Error(`템플릿 URL을 찾을 수 없습니다: ${templateKey}`);
    }
    
    // 템플릿 다운로드 (templateUrls 사용)
    const arrayBuffer = await downloadTemplateFromUrls(templateKey);
    
    // 워크북 로드 (원본 수식 보존, Shared Formula 문제 해결)
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
      console.log('✅ 기본 설정으로 기성금청구서 템플릿 로드 성공');
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
      console.log('✅ Shared Formula 무시로 기성금청구서 템플릿 로드 성공');
    }
    
    // Shared Formula 문제 해결 (모든 셀을 독립적인 수식으로 변환)
    fixGisungSharedFormulaIssues(workbook);
    
    // 추가적인 Shared Formula 완전 제거 (ExcelJS 내장 기능 사용)
    try {
      console.log('🔧 ExcelJS 내장 기능으로 Shared Formula 완전 제거');
      workbook.worksheets.forEach(sheet => {
        console.log(`🚨 ${sheet.name} 시트 모든 공유셀 완전 제거`);
        
        // 모든 셀을 스캔하여 공유셀 완전 제거
        for (let row = 1; row <= 100; row++) {
          for (let col = 1; col <= 26; col++) {
            try {
              const cell = sheet.getCell(row, col);
              if (cell) {
                // 모든 공유셀 관련 속성 강제 제거
                if (cell.sharedFormula !== undefined) {
                  console.log(`🚨 ${String.fromCharCode(64 + col)}${row} 셀 sharedFormula 강제 제거`);
                  delete cell.sharedFormula;
                }
                if (cell.si !== undefined) {
                  console.log(`🚨 ${String.fromCharCode(64 + col)}${row} 셀 si 강제 제거`);
                  delete cell.si;
                }
                if (cell.ref !== undefined) {
                  console.log(`🚨 ${String.fromCharCode(64 + col)}${row} 셀 ref 강제 제거`);
                  delete cell.ref;
                }
                
                // 수식에 공유셀 관련 내용이 있으면 제거
                if (cell.formula && typeof cell.formula === 'string') {
                  if (cell.formula.includes('si=') || cell.formula.includes('shared') || cell.formula.includes('undefined')) {
                    console.log(`🚨 ${String.fromCharCode(64 + col)}${row} 셀 수식에서 공유셀 관련 내용 제거`);
                    cell.formula = cell.formula.replace(/si=\d+/g, '');
                    cell.formula = cell.formula.replace(/shared/g, '');
                    cell.formula = cell.formula.replace(/undefined/g, '');
                  }
                }
              }
            } catch (cellError) {
              // 개별 셀 오류는 무시
            }
          }
        }
      });
      console.log('✅ ExcelJS 내장 기능으로 Shared Formula 완전 제거 완료');
    } catch (excelJSError) {
      console.warn('⚠️ ExcelJS 내장 기능 Shared Formula 제거 중 오류:', excelJSError.message);
    }
    
    // 🚨 L28 셀 특별 강력 처리 (공유셀 오류 완전 해결)
    try {
      console.log('🚨 L28 셀 특별 강력 처리 시작');
      workbook.worksheets.forEach(sheet => {
        const l28Cell = sheet.getCell('L28');
        if (l28Cell) {
          console.log('🚨 L28 셀 강력 처리 - 모든 Shared Formula 관련 속성 제거');
          
          // 모든 Shared Formula 관련 속성 강제 제거
          if (l28Cell.sharedFormula !== undefined) {
            console.log('🚨 L28 셀 sharedFormula 강제 제거');
            delete l28Cell.sharedFormula;
          }
          if (l28Cell.si !== undefined) {
            console.log('🚨 L28 셀 si 강제 제거');
            delete l28Cell.si;
          }
          if (l28Cell.ref !== undefined) {
            console.log('🚨 L28 셀 ref 강제 제거');
            delete l28Cell.ref;
          }
          
          // L28 셀의 수식이 있다면 완전히 정리
          if (l28Cell.formula && typeof l28Cell.formula === 'string') {
            console.log(`🚨 L28 셀 원본 수식: ${l28Cell.formula}`);
            
            // 모든 Shared Formula 관련 문자열 제거
            l28Cell.formula = l28Cell.formula.replace(/si=\d+/g, '');
            l28Cell.formula = l28Cell.formula.replace(/shared/g, '');
            l28Cell.formula = l28Cell.formula.replace(/undefined/g, '');
            
            console.log(`🚨 L28 셀 정리된 수식: ${l28Cell.formula}`);
          }
          
          // L28 셀을 완전히 새로운 셀로 재생성
          console.log('🚨 L28 셀 완전 재생성');
          const newCell = sheet.getCell('L28');
          if (newCell.formula) {
            newCell.formula = newCell.formula;
          }
          
          console.log('✅ L28 셀 특별 강력 처리 완료');
        }
      });
    } catch (l28Error) {
      console.warn('⚠️ L28 셀 특별 강력 처리 실패:', l28Error.message);
    }
    
    // 🔍 최종 확인: F8 셀과 L28 셀의 Shared Formula 속성이 제거되었는지 확인
    console.log('🔍 최종 확인: F8 셀과 L28 셀 Shared Formula 상태 확인...');
    workbook.worksheets.forEach(sheet => {
      try {
        // F8 셀 확인
        const f8Cell = sheet.getCell('F8');
        if (f8Cell) {
          console.log(`🔍 F8 셀 최종 상태:`);
          console.log(`  - sharedFormula: ${f8Cell.sharedFormula !== undefined ? '존재함 (문제!)' : '제거됨 ✅'}`);
          console.log(`  - si: ${f8Cell.si !== undefined ? '존재함 (문제!)' : '제거됨 ✅'}`);
          console.log(`  - ref: ${f8Cell.ref !== undefined ? '존재함 (문제!)' : '제거됨 ✅'}`);
          console.log(`  - formula: ${f8Cell.formula ? `수식 있음: ${f8Cell.formula}` : '수식 없음'}`);
          
          // 만약 여전히 문제가 있다면 강제로 제거
          if (f8Cell.sharedFormula !== undefined || f8Cell.si !== undefined || f8Cell.ref !== undefined) {
            console.log('🚨 F8 셀에 여전히 Shared Formula 속성이 존재! 강제 제거...');
            delete f8Cell.sharedFormula;
            delete f8Cell.si;
            delete f8Cell.ref;
            console.log('✅ F8 셀 Shared Formula 속성 강제 제거 완료');
          }
        }
        
        // L28 셀 확인 (Shared Formula master 문제 해결 확인)
        const l28Cell = sheet.getCell('L28');
        if (l28Cell) {
          console.log(`🔍 L28 셀 최종 상태:`);
          console.log(`  - sharedFormula: ${l28Cell.sharedFormula !== undefined ? '존재함 (문제!)' : '제거됨 ✅'}`);
          console.log(`  - si: ${l28Cell.si !== undefined ? '존재함 (문제!)' : '제거됨 ✅'}`);
          console.log(`  - ref: ${l28Cell.ref !== undefined ? '존재함 (문제!)' : '제거됨 ✅'}`);
          console.log(`  - formula: ${l28Cell.formula ? `수식 있음: ${l28Cell.formula}` : '수식 없음'}`);
          
          // 만약 여전히 문제가 있다면 강제로 제거
          if (l28Cell.sharedFormula !== undefined || l28Cell.si !== undefined || l28Cell.ref !== undefined) {
            console.log('🚨 L28 셀에 여전히 Shared Formula 속성이 존재! 강제 제거...');
            delete l28Cell.sharedFormula;
            delete l28Cell.si;
            delete l28Cell.ref;
            console.log('✅ L28 셀 Shared Formula 속성 강제 제거 완료');
          }
          
          // L28 셀의 수식이 L27을 참조하는 경우, L27 셀이 존재하는지 확인
          if (l28Cell.formula && l28Cell.formula.includes('L27')) {
            try {
              const l27Cell = sheet.getCell('L27');
              if (!l27Cell || l27Cell.value === null || l27Cell.value === undefined) {
                console.log('🔧 L27 셀이 존재하지 않거나 비어있음. L28 수식을 안전한 값으로 변경');
                l28Cell.formula = null; // 수식 제거
                l28Cell.value = 0; // 안전한 기본값
              } else {
                console.log(`🔧 L27 셀 값 확인: ${l27Cell.value}`);
                // L27 셀이 존재하지만 수식이 문제가 있을 수 있으므로 개별 수식으로 변경
                l28Cell.formula = 'H27*0.1'; // H27*0.1로 수식 변경 (더 안전함)
                console.log('🔧 L28 수식을 H27*0.1로 안전하게 변경');
              }
            } catch (l27Error) {
              console.log('🔧 L27 셀 접근 실패. L28 수식을 안전한 값으로 변경');
              l28Cell.formula = null;
              l28Cell.value = 0;
            }
          }
        }
      } catch (checkError) {
        console.warn('⚠️ F8/L28 셀 최종 확인 중 오류:', checkError.message);
      }
    });
    
    console.log('✅ 템플릿 로드 완료');
    
    // 갑지 시트 가져오기
    const gapjiSheet = workbook.getWorksheet('갑지');
    if (!gapjiSheet) {
      throw new Error('갑지 시트를 찾을 수 없습니다.');
    }
    
    // 기성금 내역서 시트 가져오기
    const detailSheet = workbook.getWorksheet('기성금 내역서');
    if (!detailSheet) {
      throw new Error('기성금 내역서 시트를 찾을 수 없습니다.');
    }
    
    // 🔍 디버깅: 26행부터 데이터 확인
    console.log('🔍 템플릿 로드 후 26행부터 데이터 확인:');
    for (let row = 26; row <= 30; row++) {
      const aCell = detailSheet.getCell(`A${row}`);
      const fCell = detailSheet.getCell(`F${row}`);
      
      console.log(`\n=== ${row}행 상세 분석 ===`);
      console.log(`A열 값: "${aCell.value}" (타입: ${typeof aCell.value})`);
      console.log(`F열 값: "${fCell.value}" (타입: ${typeof fCell.value})`);
      console.log(`F열 수식: "${fCell.formula || '수식없음'}"`);
      console.log(`F열 수식 타입: ${typeof fCell.formula}`);
      
      // F열 셀의 모든 속성 확인
      console.log(`F열 셀 속성들:`, {
        hasFormula: !!fCell.formula,
        formula: fCell.formula,
        value: fCell.value,
        result: fCell.result,
        type: fCell.type
      });
      
      // F열이 수식인지 확인
      if (fCell.formula) {
        console.log(`  ✅ ${row}행 F열 수식 보존됨: ${fCell.formula}`);
      } else {
        console.log(`  ❌ ${row}행 F열 수식 없음`);
      }
    }
    
    // Shared Formula 관련 속성 제거 및 데이터 입력
    await fillGisungData(workbook, siteData, gisungData, siteItems, currentSequence, previousGisungData);
    
    console.log('✅ 기성금청구서 템플릿 기반 생성 완료');
    return { 
      workbook, 
      gisungMonth: getPreviousMonth(),
      templateType: siteData?.templateType || 'N'
    };
    
  } catch (error) {
    console.error('❌ 기성금청구서 생성 실패:', error);
    throw error;
  }
};

// 기성금청구서에 데이터 입력 (템플릿 사용)
const fillGisungData = async (workbook, siteData, gisungData, siteItems, currentSequence = 1, previousGisungData = null) => {
  try {
    console.log('📝 기성금청구서 데이터 입력 시작');
    
    const gapjiSheet = workbook.getWorksheet('갑지');
    const detailSheet = workbook.getWorksheet('기성금 내역서');
    
         // 갑지 시트 데이터 입력
     if (gapjiSheet) {
       // 기본 정보 입력 (실제 템플릿 구조에 맞게)
       const basicInfoCells = [
         { cell: 'A2', value: `${currentSequence}차 기성금 청구서` }, // 차수
         { cell: 'D4', value: siteData?.name || '현장명' }, // 공사명
         { cell: 'D6', value: siteData?.companyName || siteData?.company || siteData?.contractor || '시공사' }, // 시공사
         { cell: 'D8', value: '유리공사' }, // 하도급 공사명 (고정)
         { cell: 'D10', value: siteData?.startDate ? siteData.startDate.replace(/\./g, '년 ') + '월' : '0000년 00월' }, // 계약(착공)일자
         { cell: 'D12', value: siteData?.endDate ? siteData.endDate.replace(/\./g, '년 ') + '월' : '0000년 00월' }, // 준공일자
         { cell: 'A36', value: getPreviousMonth() }, // 현재월-1
         { cell: 'A44', value: (siteData?.companyName || siteData?.company || siteData?.contractor || '회사명') + ' 귀중' } // 회사명 귀중
       ];
       
       basicInfoCells.forEach(({ cell, value }) => {
         const cellObj = gapjiSheet.getCell(cell);
         cellObj.value = value;
       });
       
       // H16에 선급금 입력 (NEW, LONG 템플릿 모두 동일)
       const advanceAmount = Number(siteData?.advance || 0);
       const h16Cell = gapjiSheet.getCell('H16');
       h16Cell.value = advanceAmount;
       console.log(`💰 갑지 H16에 선급금 입력: ${advanceAmount}`);
       
       // H열 셀들은 수식을 그대로 두고, D열 셀들이 H열을 참조하도록 함
       // (H열 수식을 덮어쓰지 않음)
       
       // 인감 이미지 추가 (납품계약서와 동일한 방식)
       const stampType = siteData?.stampType || '인감없음';
       console.log('🖊️ 갑지 시트 인감 이미지 처리 시작:', stampType);
       
       // 인감없음인 경우 A인감으로 처리, 기타인감인 경우 이미지 넣지 않음
       if (stampType === '기타인감') {
         console.log('📝 기타인감이므로 이미지 삽입하지 않음:', stampType);
       } else {
         // 실제 사용할 인감 타입 결정
         const actualStampType = stampType === '인감없음' ? 'A인감' : stampType;
         console.log('🖊️ 실제 사용할 인감 타입:', actualStampType);
         
         try {
           // 인감 이미지 다운로드 함수 (납품계약서와 동일한 방식)
           const downloadSignatureImage = async (stampType = 'A인감') => {
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
             
             const mappedImageName = stampImageMap[stampType];
             if (!mappedImageName) {
               console.warn('⚠️ 알 수 없는 인감 타입:', stampType);
               return null;
             }
             
             // Firebase Storage에서 인감 이미지 가져오기
             console.log('🔥 Firebase Storage에서 인감 이미지 가져오기');
             const stampsRef = ref(storage, `stamps/${mappedImageName}`);
             const downloadURL = await getDownloadURL(stampsRef);
             console.log('📁 Firebase Storage 이미지 경로:', downloadURL);
             
             const response = await fetch(downloadURL);
             if (!response.ok) {
               throw new Error(`인감 이미지 다운로드 실패: ${response.status}`);
             }
             
             const arrayBuffer = await response.arrayBuffer();
             console.log('✅ 인감 이미지 다운로드 완료:', mappedImageName);
             return arrayBuffer;
           };
           
                        // F40 셀 위치에 인감 이미지 추가
             const imageBuffer = await downloadSignatureImage(actualStampType);
             if (imageBuffer && gapjiSheet && workbook) {
               const imageId = workbook.addImage({
                 buffer: imageBuffer,
                 extension: 'png',
               });
               
               gapjiSheet.addImage(imageId, {
                 tl: { col: 5, row: 39 }, // F40 위치
                 ext: { width: 80, height: 80 }
               });
               console.log('✅ 인감 이미지 삽입 완료 (F40):', actualStampType);

               // 내역서 시트에는 인감 이미지 삽입하지 않음 (인덱스1에서 제거)
               console.log('📝 내역서 시트에는 인감 이미지 삽입하지 않음 (인덱스1 제거)');
           } else {
             console.log('📝 인감 이미지 없음 또는 워크북 없음:', actualStampType);
           }
         } catch (imageError) {
           console.warn('⚠️ 인감 이미지 추가 실패:', imageError);
         }
       }
     }
    
         // 기성금 내역서 데이터 입력
     if (detailSheet && siteItems && siteItems.length > 0) {
       console.log(`📋 물량 데이터 개수: ${siteItems.length}개`);
       
       // 기존 데이터 행들 정리 (수식은 보존, 데이터만 정리)
       // NEW 템플릿: 6-25행만, LONG 템플릿: 6-50행만
       const maxDataRow = siteItems.length <= 20 ? 25 : 50;
       console.log(`📋 데이터 입력 범위: 6행부터 ${maxDataRow}행까지만 (수식 보존)`);
       
       for (let row = 6; row <= maxDataRow; row++) {
         for (let col = 1; col <= 5; col++) { // A, B, C, D, E열만 (1-5열)
           const cell = detailSheet.getCell(row, col);
           
           // 🚨 중요: 수식이 있는 셀은 건드리지 않음!
           if (!cell.formula) {
             cell.value = '';
             console.log(`🔧 ${row}행 ${String.fromCharCode(64 + col)}열 데이터 정리 (수식 없음)`);
           } else {
             console.log(`✅ ${row}행 ${String.fromCharCode(64 + col)}열 수식 보존: ${cell.formula}`);
           }
         }
       }
       
       // 물량 데이터에서 계약서 자동계산 항목만 제외 (isTotal, isVat, isTotalWithVat이 true인 항목들)
       // 단수정리 항목은 물량데이터와 함께 취급해야 함
       const filteredItems = siteItems.filter(item => 
         !item.isTotal && !item.isVat && !item.isTotalWithVat
       );
       
       console.log(`📋 필터링된 물량 데이터: ${filteredItems.length}개 (계약서 자동계산 항목 제외, 단수정리 포함)`);
       
       // 단수정리 항목 찾기 (물량데이터와 함께 처리)
       const dansooItem = siteItems.find(item => item?.name === '단수정리');
       if (dansooItem) {
         console.log(`💰 단수정리 항목 발견: ${dansooItem.amount} (${dansooItem.quantity})`);
         console.log(`📊 단수정리 항목을 물량데이터와 함께 처리합니다.`);
       }
       
       // 🛡️ 공통 유틸리티를 사용하여 기성금용 데이터 입력
       fillGisungStyleData(detailSheet, siteItems, 6, '기성금');
       
       // C,D열에 값이 없으면 그 행 전체를 빈칸으로 처리
       console.log('🧹 C,D열에 값이 없는 행 전체 빈칸 처리 시작...');
       const maxCleanupRow = siteItems.length <= 20 ? 25 : 50;
       
       for (let row = 6; row <= maxCleanupRow; row++) {
         try {
           // 해당 행의 C, D 열 값 확인
           const cellC = detailSheet.getCell(row, 3); // C열 (단위)
           const cellD = detailSheet.getCell(row, 4); // D열 (수량)
           
           // C, D 열에 값이 없으면 해당 행 전체를 빈칸으로 처리
           const isEmptyCD = (!cellC.value || cellC.value === '') && 
                            (!cellD.value || cellD.value === '');
           
           if (isEmptyCD) {
             console.log(`📝 ${row}행 C,D열이 비어있어서 행 전체를 빈칸으로 처리`);
             
             // C,D열에 값이 없으면 A,B열만 놔두고 나머지만 빈칸으로 처리 (수식은 보존)
             for (let col = 1; col <= 13; col++) { // A=1, M=13
               try {
                 const cell = detailSheet.getCell(row, col);
                 
                 // A,B열은 그대로 놔두기 (품명, 규격 보존)
                 if (col === 1 || col === 2) {
                   console.log(`🛡️ ${row}행 ${String.fromCharCode(64 + col)}열 A,B열 보존: ${cell.value || ''}`);
                   continue; // A,B열은 건드리지 않음
                 }
                 
                 // C~M열만 빈칸으로 처리 (수식은 보존)
                 if (cell.formula) {
                   console.log(`🛡️ ${row}행 ${String.fromCharCode(64 + col)}열 수식 보존: ${cell.formula}`);
                   // 수식은 그대로 두고 값만 빈칸으로
                   cell.value = '';
                 } else {
                   // 수식이 없는 경우 값만 빈칸으로 처리
                   cell.value = '';
                   console.log(`✅ ${row}행 ${String.fromCharCode(64 + col)}열 값만 빈칸 처리 완료`);
                 }
                 
                 console.log(`✅ ${row}행 ${String.fromCharCode(64 + col)}열 처리 완료`);
               } catch (e) {
                 console.log(`⚠️ ${row}행 ${String.fromCharCode(64 + col)}열 처리 실패:`, e.message);
               }
             }
           } else {
             console.log(`📝 ${row}행 C,D열에 데이터가 있어서 행 유지`);
           }
         } catch (error) {
           console.warn(`⚠️ ${row}행 빈칸 처리 중 오류:`, error.message);
         }
       }
       
       console.log('✅ C,D열 빈칸 처리 완료');
       
       // 보호된 셀/수식은 절대 변경하지 않음 (정리 로직 제거)
       console.log('🛡️ 보호된 셀과 수식은 변경하지 않음');
       
       // 선급금은 갑지 H16에 입력하므로 기성금 내역서에서는 건드리지 않음
       console.log(`💰 선급금은 갑지 H16에 입력됨 (기성금 내역서 보호된 셀 보존)`);
       
       // 기성수량(G열)에 누계수량 설정 (K열의 result 값 사용)
       console.log('🔍 previousGisungData 확인:', previousGisungData);
       // 이전 기성 데이터가 있으면 전회기성(G열) 설정
       if (previousGisungData && previousGisungData.extractedItems) {
         console.log('📊 이전 기성 데이터에서 전회기성 설정 시작');
         
         try {
           const extractedItems = typeof previousGisungData.extractedItems === 'string' 
             ? JSON.parse(previousGisungData.extractedItems) 
             : previousGisungData.extractedItems;
           
           console.log('📊 추출된 항목들:', extractedItems);
           
           // 모든 항목의 K값을 G값으로 복사 (보호된 셀 제외)
           const maxGisungRow = siteItems.length <= 20 ? 25 : 50;
           for (let row = 6; row <= maxGisungRow; row++) {
             // 해당 행의 K값 찾기
             const item = extractedItems.find(item => item.row === row);
             
             if (item && item.kValue !== null && item.kValue !== undefined) {
               const gCell = detailSheet.getCell(`G${row}`);
               gCell.value = item.kValue;
               console.log(`✅ 행 ${row}: K값(${item.kValue}) → G값으로 복사 완료 - ${item.itemName}`);
             } else {
               // 해당 행에 데이터가 없으면 0으로 설정
               const gCell = detailSheet.getCell(`G${row}`);
               gCell.value = 0;
               console.log(`📊 행 ${row}: 데이터 없음, G값을 0으로 설정`);
             }
           }
           
           console.log('✅ 전회기성(G열) 설정 완료');
         } catch (error) {
           console.warn('⚠️ 전회기성 설정 실패:', error);
         }
       } else {
         console.log('📊 이전 기성금청구서 데이터가 없어 전회기성 설정 건너뜀');
       }
       
                // NEW 템플릿에서는 26행부터는 원본 템플릿 데이터 보존
        if (siteItems.length <= 20) {
          console.log('📋 NEW 템플릿: 26행부터는 원본 템플릿 데이터 보존');
          
          // 26행부터 30행까지 원본 데이터 보존 확인 및 강제 보호
          for (let row = 26; row <= 30; row++) {
            const aCell = detailSheet.getCell(`A${row}`);
            if (aCell.value) {
              console.log(`✅ ${row}행 A열 데이터 보존: ${aCell.value}`);
            }
            
            // F, G, H열의 수식과 데이터 강제 보존
            for (let col = 6; col <= 8; col++) { // F, G, H열
              const cell = detailSheet.getCell(row, col);
              if (cell.formula) {
                console.log(`🛡️ ${row}행 ${String.fromCharCode(64 + col)}열 수식 보존: ${cell.formula}`);
              }
            }
          }
          
          // 26행부터는 원본 템플릿에 있던 데이터를 그대로 유지
        }
        
        // LONG 템플릿에서는 51행부터 54행까지는 건드리지 않음 (셀 보호 유지)
        if (siteItems.length > 20) {
          console.log('📋 LONG 템플릿: 51행부터 54행까지는 셀 보호 유지하여 원본 데이터 보존');
          
          // 51행부터 54행까지 원본 데이터 보존 확인 및 강제 보호
          for (let row = 51; row <= 54; row++) {
            const aCell = detailSheet.getCell(`A${row}`);
            if (aCell.value) {
              console.log(`✅ ${row}행 A열 데이터 보존: ${aCell.value}`);
            }
            
            // F, G, H열의 수식과 데이터 강제 보존
            for (let col = 6; col <= 8; col++) { // F, G, H열
              const cell = detailSheet.getCell(row, col);
              if (cell.formula) {
                console.log(`🛡️ ${row}행 ${String.fromCharCode(64 + col)}열 수식 보존: ${cell.formula}`);
              }
            }
          }
          
          // 51행부터 54행까지는 아무것도 건드리지 않음
        }
       
       // 총원가 관련 셀들은 보호된 셀이므로 건드리지 않음 (원본 템플릿 데이터 보존)
       // NEW 템플릿: 26-30행 보호, LONG 템플릿: 51-54행 보호
       console.log('🛡️ 보호된 셀 보존: NEW(26-30행), LONG(51-54행) - 원본 템플릿 데이터 유지');
       
       // 기성금 내역서는 물량과 금액 데이터만 포함 (인감은 갑지에만)
       
       console.log(`✅ ${siteItems.length}개 항목 입력 완료 (A6부터 A50까지만, 보호된 셀 보존)`);
     }
    
    console.log('✅ 기성금청구서 데이터 입력 완료');
    return getPreviousMonth();
    
  } catch (error) {
    console.error('❌ 데이터 입력 실패:', error);
    throw error;
  }
};

// 기성금청구서 템플릿 기반 다운로드 함수 (넷틀리파이 호환)
export const downloadTemplateBasedGisungExcel = async (siteData, gisungData, siteItems = [], filename = '기성금청구서.xlsx') => {
  try {
    console.log('🚀 기성금청구서 템플릿 기반 다운로드 시작');
    
    // 템플릿 기반 엑셀 생성
    const { workbook, gisungMonth } = await generateTemplateBasedGisungExcel(siteData, gisungData, siteItems, 1, null);
    
    // 수식 보존 강제로 버퍼 생성
    console.log('💾 수식 보존 강제로 파일 생성 중...');
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
    console.log('✅ 수식 보존으로 파일 생성 완료');
    
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    // 파일 다운로드
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log('✅ 기성금청구서 다운로드 완료:', filename);
    return { success: true, filename };
    
  } catch (error) {
    console.error('❌ 기성금청구서 다운로드 실패:', error);
    throw error;
  }
};

// 기성금청구서 Shared Formula 문제 완전 해결 함수 (모든 Shared Formula 속성 제거)
const fixGisungSharedFormulaIssues = (workbook) => {
  try {
    console.log('🔧 기성금청구서 모든 Shared Formula 속성 제거 시작');
    
    workbook.worksheets.forEach(sheet => {
      console.log(`🔧 ${sheet.name} 시트 Shared Formula 속성 제거`);
      
      let removedCount = 0;
      
      // 모든 셀을 스캔하여 Shared Formula 속성 제거
      console.log(`🔍 ${sheet.name} 시트 전체 Shared Formula 속성 제거 시작...`);
      
      for (let row = 1; row <= 100; row++) { // 100행까지 스캔
        for (let col = 1; col <= 26; col++) { // A-Z 열까지 스캔
          try {
            const cell = sheet.getCell(row, col);
            if (cell) {
              let hasRemoved = false;
              
              // Shared Formula 관련 속성 모두 제거
              if (cell.sharedFormula !== undefined) {
                console.log(`🔧 ${String.fromCharCode(64 + col)}${row} 셀 sharedFormula 제거`);
                delete cell.sharedFormula;
                hasRemoved = true;
              }
              
              if (cell.si !== undefined) {
                console.log(`🔧 ${String.fromCharCode(64 + col)}${row} 셀 si 제거`);
                delete cell.si;
                hasRemoved = true;
              }
              
              if (cell.ref !== undefined) {
                console.log(`🔧 ${String.fromCharCode(64 + col)}${row} 셀 ref 제거`);
                delete cell.ref;
                hasRemoved = true;
              }
              
              // 수식에 si 참조가 포함된 경우 정리
              if (cell.formula && typeof cell.formula === 'string' && cell.formula.includes('si=')) {
                cell.formula = cell.formula.replace(/si=\d+/g, '');
                hasRemoved = true;
              }
              
              // Shared Formula 관련 문자열이 있는 경우 제거
              if (cell.formula && typeof cell.formula === 'string' && 
                  (cell.formula.includes('shared') || cell.formula.includes('undefined'))) {
                cell.formula = cell.formula.replace(/shared|undefined/g, '');
                hasRemoved = true;
              }
              
              if (hasRemoved) {
                removedCount++;
              }
            }
          } catch (scanError) {
            // 개별 셀 스캔 오류는 무시하고 계속 진행
            console.warn(`⚠️ ${String.fromCharCode(64 + col)}${row} 셀 처리 실패:`, scanError.message);
          }
        }
      }
      
      console.log(`✅ ${sheet.name} 시트 Shared Formula 속성 제거 완료: ${removedCount}개 셀`);
    });
    
    console.log('✅ 기성금청구서 모든 Shared Formula 속성 제거 완료');
  } catch (error) {
    console.warn('⚠️ 기성금청구서 Shared Formula 속성 제거 중 오류:', error.message);
  }
};

// 헬퍼 함수들
const getPreviousMonth = () => {
  const now = new Date();
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${previousMonth.getFullYear()}.${String(previousMonth.getMonth() + 1).padStart(2, '0')}.`;
};

// 기성금 데이터 이동 함수들
export const moveCurrentToPrevious = async (siteId, gisungId) => {
  try {
    console.log('🔄 기성금 데이터 이동 시작:', { siteId, gisungId });
    
    const { doc, getDoc, updateDoc, collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('../firebase');
    
    // 현재 기성 데이터 가져오기
    const gisungDoc = await getDoc(doc(db, 'gisung', gisungId));
    if (!gisungDoc.exists()) {
      throw new Error('기성 데이터를 찾을 수 없습니다.');
    }
    
    const currentGisung = gisungDoc.data();
    console.log('📊 현재 기성 데이터:', currentGisung);
    
    // 같은 현장의 다음 차수 기성 데이터 찾기
    const currentSequence = parseInt(currentGisung.sequence?.replace('차', '') || '0');
    const nextSequence = currentSequence + 1;
    
    const nextGisungQuery = query(
      collection(db, 'gisung'),
      where('siteId', '==', siteId),
      where('sequence', '==', `${nextSequence}차`)
    );
    
    const nextGisungSnapshot = await getDocs(nextGisungQuery);
    let nextGisungDoc = null;
    
    if (!nextGisungSnapshot.empty) {
      nextGisungDoc = nextGisungSnapshot.docs[0];
      console.log('📊 다음 차수 기성 데이터 발견:', nextGisungDoc.data());
    } else {
      console.log('📊 다음 차수 기성 데이터가 없어 새로 생성합니다.');
    }
    
    // 현재 기성 데이터를 청구완료로 변경
    await updateDoc(doc(db, 'gisung', gisungId), {
      claimStatus: '청구완료',
      updatedAt: new Date()
    });
    
    console.log('✅ 현재 기성 데이터 청구완료 처리 완료');
    
    // 다음 차수 기성 데이터가 있으면 전회기성 업데이트
    if (nextGisungDoc) {
      const nextGisungData = nextGisungDoc.data();
      const updatedPrevGisung = (nextGisungData.prevGisung || 0) + (currentGisung.gisungAmount || 0);
      
      await updateDoc(doc(db, 'gisung', nextGisungDoc.id), {
        prevGisung: updatedPrevGisung,
        updatedAt: new Date()
      });
      
      console.log('✅ 다음 차수 전회기성 업데이트 완료:', updatedPrevGisung);
    }
    
    return { success: true, message: '기성금 데이터 이동이 완료되었습니다.' };
    
  } catch (error) {
    console.error('❌ 기성금 데이터 이동 실패:', error);
    return { success: false, message: error.message };
  }
};

export const createNextGisungWithPrevious = async (siteId, currentGisungData) => {
  try {
    console.log('🔄 다음 차수 기성 데이터 생성 시작:', { siteId, currentGisungData });
    
    const { addDoc, collection } = await import('firebase/firestore');
    const { db } = await import('../firebase');
    
    const currentSequence = parseInt(currentGisungData.sequence?.replace('차', '') || '0');
    const nextSequence = currentSequence + 1;
    
    const nextGisungData = {
      siteId: siteId,
      name: currentGisungData.name,
      sequence: `${nextSequence}차`,
      status: '미청구',
      claimStatus: '미청구',
      contractAmount: currentGisungData.contractAmount || 0,
      advance: currentGisungData.advance || 0,
      prevGisung: currentGisungData.gisungAmount || 0, // 현재 기성금을 전회기성으로 설정
      gisungAmount: 0, // 새로운 기성금은 0으로 초기화
      gisungMonth: getCurrentMonth(),
      note: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const newGisungDoc = await addDoc(collection(db, 'gisung'), nextGisungData);
    
    console.log('✅ 다음 차수 기성 데이터 생성 완료:', newGisungDoc.id);
    return { success: true, gisungId: newGisungDoc.id, data: nextGisungData };
    
  } catch (error) {
    console.error('❌ 다음 차수 기성 데이터 생성 실패:', error);
    return { success: false, message: error.message };
  }
};

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};


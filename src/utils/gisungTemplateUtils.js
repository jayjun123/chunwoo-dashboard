// 기성금청구서 유틸리티 (템플릿 기반)
import ExcelJS from 'exceljs';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

// Firebase Storage에서 템플릿 다운로드 (CORS 우회)
const downloadTemplateFromStorage = async (templateFileName) => {
  try {
    // 방법 1: 직접 다운로드 시도
    const templateRef = ref(storage, `templates/${templateFileName}`);
    const downloadURL = await getDownloadURL(templateRef);
    
    console.log('📥 템플릿 다운로드 중...');
    const response = await fetch(downloadURL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.arrayBuffer();
  } catch (error) {
    console.warn('⚠️ 직접 다운로드 실패, 프록시 서버 사용:', error.message);
    
    // 방법 2: 프록시 서버를 통한 다운로드
    const proxyURL = `https://api.allorigins.win/raw?url=${encodeURIComponent(
      `https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2F${templateFileName}?alt=media`
    )}`;
    
    const proxyResponse = await fetch(proxyURL);
    if (!proxyResponse.ok) {
      throw new Error(`프록시 다운로드 실패: ${proxyResponse.status}`);
    }
    
    return await proxyResponse.arrayBuffer();
  }
};

// 기성금청구서 템플릿 기반 생성
export const generateTemplateBasedGisungExcel = async (siteData, gisungData, siteItems = [], currentSequence = 1, previousGisungData = null) => {
  try {
    console.log('🚀 기성금청구서 템플릿 기반 생성 시작');
    
    // 물량 데이터 개수에 따라 템플릿 선택
    const itemCount = siteItems.length;
    let templateFileName = 'NEWgisung.xlsx';
    
    console.log('🔍 템플릿 선택 디버깅:');
    console.log('📊 siteData:', siteData);
    console.log('📊 siteData.templateType:', siteData?.templateType);
    console.log('📊 siteItems:', siteItems);
    console.log('📊 itemCount:', itemCount);
    console.log('📊 siteItems 상세:', JSON.stringify(siteItems, null, 2));
    
    // siteData에서 templateType 확인 (N/L 표시만 사용)
    if (siteData && siteData.templateType) {
      if (siteData.templateType === 'L') {
        templateFileName = 'LONG.xlsx';
        console.log(`📊 현장의 templateType이 'L'로 설정되어 LONG.xlsx 템플릿을 사용합니다.`);
      } else if (siteData.templateType === 'N') {
        templateFileName = 'NEW.xlsx';
        console.log(`📊 현장의 templateType이 'N'으로 설정되어 NEW.xlsx 템플릿을 사용합니다.`);
      } else {
        // templateType이 있지만 L/N이 아닌 경우 기본값
        templateFileName = 'NEW.xlsx';
        console.log(`📊 현장의 templateType이 '${siteData.templateType}'이므로 기본 NEW.xlsx 템플릿을 사용합니다.`);
      }
    } else {
      // templateType이 설정되지 않은 경우 기본값
      templateFileName = 'NEW.xlsx';
      console.log(`📊 현장의 templateType이 설정되지 않아 기본 NEW.xlsx 템플릿을 사용합니다.`);
    }
    
    // 템플릿 다운로드 (CORS 우회 포함)
    const arrayBuffer = await downloadTemplateFromStorage(templateFileName);
    
    // 워크북 로드 (수식과 데이터 보존 강화)
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer, {
      sharedFormulas: false,
      useStyles: true,
      useCellStyles: true,
      useCellFormulas: true,  // 수식 보존
      useCellDates: true,     // 날짜 보존
      useCellNF: true,        // 숫자 형식 보존
      useCellRichText: true,  // 서식 보존
      useCellComments: true,  // 주석 보존
      useCellHyperlinks: true // 하이퍼링크 보존
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
      templateType: siteData?.templateType || 'N',
      templateFileName: templateFileName
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
       
       // 기존 데이터 행들 정리 (보호된 셀 제외)
       // NEW 템플릿: 6-25행만, LONG 템플릿: 6-50행만
       const maxDataRow = siteItems.length <= 20 ? 25 : 50;
       console.log(`📋 데이터 입력 범위: 6행부터 ${maxDataRow}행까지만 (보호된 셀 제외)`);
       
       for (let row = 6; row <= maxDataRow; row++) {
         for (let col = 1; col <= 5; col++) { // A, B, C, D, E열만 (1-5열)
           const cell = detailSheet.getCell(row, col);
           cell.value = '';
         }
       }
       
       // 물량 데이터에서 계약서 자동계산 항목 제외 (isTotal, isVat, isTotalWithVat이 true인 항목들)
       const filteredItems = siteItems.filter(item => 
         !item.isTotal && !item.isVat && !item.isTotalWithVat
       );
       
       console.log(`📋 필터링된 물량 데이터: ${filteredItems.length}개 (계약서 자동계산 항목 제외)`);
       
       // 새로운 데이터 입력 (보호된 셀 제외)
       const maxInputRow = siteItems.length <= 20 ? 25 : 50;
       for (let index = 0; index < filteredItems.length && (index + 6) <= maxInputRow; index++) {
         const item = filteredItems[index];
         const rowNumber = index + 6; // 6행부터 시작
         
         try {
                    const cells = [
           { col: 1, value: item.specification || '' }, // A열: 규격
           { col: 2, value: item.name || '' }, // B열: 품명
           { col: 3, value: item.unit || '' }, // C열: 단위
           { col: 4, value: item.quantity || 0 }, // D열: 수량
           { col: 5, value: item.price || 0 } // E열: 단가
         ];
           
           cells.forEach(({ col, value }) => {
             const cell = detailSheet.getCell(rowNumber, col);
             cell.value = value;
           });
           
         } catch (e) {
           console.warn(`⚠️ 행 ${rowNumber} 데이터 입력 실패:`, e.message);
         }
       }
       
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
       
       // C, D열이 비어있는 행들을 E~M까지 정리 (보호된 셀 제외)
       const maxCleanRow = siteItems.length <= 20 ? 25 : 50;
       for (let row = 6; row <= maxCleanRow; row++) {
         const cCell = detailSheet.getCell(row, 3); // C열
         const dCell = detailSheet.getCell(row, 4); // D열
         
         // C, D열이 모두 비어있으면 E~M까지 모두 지움 (수식도 포함)
         if ((!cCell.value || cCell.value === '') && (!dCell.value || dCell.value === '')) {
           for (let col = 5; col <= 13; col++) { // E부터 M열까지 (5-13열)
             const cell = detailSheet.getCell(row, col);
             cell.value = '';
             // 수식 제거 (안전한 방법)
             if (cell.formula) {
               delete cell._formula;
             }
           }
         }
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
    
    // 안전한 버퍼 생성 (수식과 데이터 보존)
    let buffer;
    try {
      buffer = await workbook.xlsx.writeBuffer({
        useStyles: true,
        useSharedStrings: false,
        useCellStyles: true,
        useCellFormulas: true,  // 수식 보존
        useCellDates: true,     // 날짜 보존
        useCellNF: true,        // 숫자 형식 보존
        useCellRichText: true,  // 서식 보존
        useCellComments: true,  // 주석 보존
        useCellHyperlinks: true, // 하이퍼링크 보존
        useCellImages: true,    // 이미지 보존
        useCellNames: true,     // 이름 보존
        useCellThemes: true,    // 테마 보존
        useCellDataValidation: true, // 데이터 검증 보존
        useCellConditionalFormatting: true, // 조건부 서식 보존
        sharedFormulas: false
      });
    } catch (error) {
      console.warn('⚠️ 첫 번째 시도 실패, 최소 옵션으로 재시도:', error.message);
      buffer = await workbook.xlsx.writeBuffer({
        useStyles: false,
        useSharedStrings: false,
        sharedFormulas: false
      });
    }
    
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

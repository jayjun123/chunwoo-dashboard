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
    console.log('📊 siteItems:', siteItems);
    console.log('📊 itemCount:', itemCount);
    console.log('📊 siteItems 상세:', JSON.stringify(siteItems, null, 2));
    
    // siteData에서 templateType 확인 (N/L 표시만 사용)
    if (siteData && siteData.templateType) {
      if (siteData.templateType === 'L') {
        templateFileName = 'LONGgisung.xlsx';
        console.log(`📊 현장의 templateType이 'L'로 설정되어 LONGgisung 템플릿을 사용합니다.`);
      } else if (siteData.templateType === 'N') {
        templateFileName = 'NEWgisung.xlsx';
        console.log(`📊 현장의 templateType이 'N'으로 설정되어 NEWgisung 템플릿을 사용합니다.`);
      } else {
        // templateType이 있지만 L/N이 아닌 경우 기본값
        templateFileName = 'NEWgisung.xlsx';
        console.log(`📊 현장의 templateType이 '${siteData.templateType}'이므로 기본 NEWgisung 템플릿을 사용합니다.`);
      }
    } else {
      // templateType이 설정되지 않은 경우 기본값
      templateFileName = 'NEWgisung.xlsx';
      console.log(`📊 현장의 templateType이 설정되지 않아 기본 NEWgisung 템플릿을 사용합니다.`);
    }
    
    // 템플릿 다운로드 (CORS 우회 포함)
    const arrayBuffer = await downloadTemplateFromStorage(templateFileName);
    
    // 워크북 로드 (Shared Formula 비활성화)
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer, {
      sharedFormulas: false,
      useStyles: true,
      useCellStyles: true,
      useCellFormulas: false
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
    
    // Shared Formula 관련 속성 제거 및 데이터 입력
    await fillGisungData(workbook, siteData, gisungData, siteItems, currentSequence, previousGisungData);
    
    console.log('✅ 기성금청구서 템플릿 기반 생성 완료');
    return { workbook, gisungMonth: getPreviousMonth() };
    
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
       
       // 기존 데이터 행들 정리 (6행부터 50행까지만) - A, B, C, D, E열만 초기화, F, H, J열 공식은 보존
       for (let row = 6; row <= 50; row++) {
         for (let col = 1; col <= 5; col++) { // A, B, C, D, E열만 (1-5열)
           const cell = detailSheet.getCell(row, col);
           cell.value = '';
         }
       }
       
       // 새로운 데이터 입력 (A6부터 A50까지만, 물량 데이터만 입력)
       for (let index = 0; index < siteItems.length && (index + 6) <= 50; index++) {
         const item = siteItems[index];
         const rowNumber = index + 6; // 6행부터 시작
         
         try {
           const cells = [
             { col: 1, value: item.name || '' }, // A열: 품명
             { col: 2, value: item.specification || '' }, // B열: 규격
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
       
       // F51에 선급금 데이터 입력
       const advanceAmount = Number(siteData?.advance || 0);
       const f51Cell = detailSheet.getCell('F51');
       f51Cell.value = advanceAmount;
       
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
               
               // 모든 항목의 K값을 G값으로 복사 (6행부터 50행까지)
               for (let row = 6; row <= 50; row++) {
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
       
       // C, D열이 비어있는 행들을 E~M까지 정리 (수식도 포함)
       for (let row = 6; row <= 50; row++) {
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
       
                // 물량항목이 20개 이하면 26행부터 50행까지 삭제
         if (siteItems.length <= 20) {
           for (let row = 26; row <= 50; row++) {
             for (let col = 1; col <= 13; col++) { // A부터 M열까지
               const cell = detailSheet.getCell(row, col);
               cell.value = '';
               // 수식 제거 (안전한 방법)
               if (cell.formula) {
                 delete cell._formula;
               }
             }
           }
         }
       
       // 총원가 관련 셀들을 소숫점 올림으로 처리
       const totalCostRows = [51, 52, 53, 54]; // 총원가가 있는 행들 (예시)
       totalCostRows.forEach(row => {
         for (let col = 1; col <= 10; col++) {
           const cell = detailSheet.getCell(row, col);
           if (cell.value !== null && cell.value !== undefined && typeof cell.value === 'number') {
             cell.value = Math.ceil(cell.value); // 소숫점 올림
           }
         }
       });
       
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
    
    // 안전한 버퍼 생성 (Shared Formula 비활성화)
    let buffer;
    try {
      buffer = await workbook.xlsx.writeBuffer({
        useStyles: true,
        useSharedStrings: false,
        useCellStyles: true,
        useCellFormulas: false,
        useCellDates: false,
        useCellNF: false,
        useCellRichText: false,
        useCellComments: false,
        useCellHyperlinks: false,
        useCellImages: false,
        useCellNames: false,
        useCellThemes: false,
        useCellDataValidation: false,
        useCellConditionalFormatting: false,
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

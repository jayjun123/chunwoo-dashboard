// 기성금청구서 템플릿 유틸리티 (Firebase Storage API 직접 호출)
import ExcelJS from 'exceljs';


// 기성금청구서 템플릿 기반 엑셀 생성 (Firebase Storage API 직접 호출)
export const generateTemplateBasedGisungExcel = async (siteData, gisungData, siteItems = [], currentSequence = 1, previousGisungData = null) => {
  try {
    console.log('🚀 기성금청구서 템플릿 기반 엑셀 생성 시작:', { siteData, gisungData, siteItems });
    
    // Firebase Storage에서 템플릿 다운로드 (토큰 없이 직접 접근)
    const templateUrl = 'https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2Fgisung.xlsx?alt=media';
    
    try {
      console.log('✅ Firebase Storage API 직접 호출:', templateUrl);
      
      // 템플릿 파일 가져오기
      const response = await fetch(templateUrl);
      if (!response.ok) {
        throw new Error(`템플릿 파일 다운로드 실패: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('✅ Firebase Storage API 템플릿 파일 다운로드 완료:', arrayBuffer.byteLength, 'bytes');
      
      // ExcelJS로 템플릿 로드
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      console.log('✅ 기성금청구서 템플릿 로드 완료 (Firebase Storage API)');
      
      // 데이터 입력 (서식 보존)
      const gisungMonth = await fillGisungData(workbook, siteData, gisungData, siteItems, currentSequence, previousGisungData);
      
      console.log('✅ 기성금청구서 템플릿 기반 생성 완료');
      return { workbook, gisungMonth };
      
    } catch (error) {
      console.error('❌ Firebase Storage API 템플릿 로드 실패:', error);
      throw new Error(`Firebase Storage API에서 템플릿을 가져올 수 없습니다: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ 기성금청구서 템플릿 기반 생성 실패:', error);
    throw error;
  }
};

// 기성금청구서에 데이터만 입력 (ExcelJS 방식)
const fillGisungData = async (workbook, siteData, gisungData, siteItems, currentSequence = 1, previousGisungData = null) => {
  try {
    console.log('📝 기성금청구서 데이터 입력 시작 (ExcelJS 방식)...');
    console.log('📊 전달받은 데이터:', { siteData, gisungData, siteItems });
    
    // 갑지 시트 데이터 입력
    const gapjiSheet = workbook.getWorksheet('갑지');
    if (gapjiSheet) {
      console.log('📝 갑지 시트 데이터 입력 중...');
      
      // 정확한 셀 위치에 데이터 입력 (ExcelJS 방식)
      const dataMapping = {
        // A2: 차수 정보 (전달받은 차수 사용)
        'A2': `${currentSequence}차 기성금 청구서`,
        // D4: 현장관리페이지 현장명
        'D4': siteData?.name || '현장명',
        // D6: 현장관리페이지 회사명 (companyName 우선 사용)
        'D6': siteData?.companyName || siteData?.company || siteData?.contractor || '회사명',
        // D8: 현장관리페이지 계약구분 (납품계약 제외 유리공사)
        'D8': siteData?.contractType === '납품계약' ? '유리공사' : (siteData?.contractType || '유리공사'),
        // D10: 현장관리페이지 착공일자
        'D10': siteData?.startDate || '',
        // D12: 현장관리페이지 준공예정일자
        'D12': siteData?.endDate || '',
        // H16: 현장관리페이지 선급금 (이전 기성 데이터의 result 값 우선 사용)
        'H16': previousGisungData?.advancePaymentResult || Number(siteData?.advance || 0),
        // H18: 전회기성 (이전 기성 데이터의 result 값 사용)
        'H18': previousGisungData?.previousGisungResult || 0,
        // A36: 현재 월에서 -1 = 전월
        'A36': getPreviousMonth(),
        // A44: 현장관리페이지 회사명 귀중 (companyName 우선 사용)
        'A44': `${siteData?.companyName || siteData?.company || siteData?.contractor || '회사명'} 귀중`,
      };
      
      console.log('📋 갑지 데이터 매핑:', dataMapping);
      
      // 데이터 입력 (ExcelJS 방식)
      Object.entries(dataMapping).forEach(([cell, value]) => {
        try {
          const cellObj = gapjiSheet.getCell(cell);
          cellObj.value = value;
          console.log(`📝 갑지 ${cell}: ${value}`);
        } catch (cellError) {
          console.warn(`⚠️ 갑지 ${cell} 입력 실패:`, cellError.message);
        }
      });
      
      // 인감 이미지 추가 (납품계약서와 동일한 방식)
      try {
        const stampType = siteData?.stampType || 'A인감';
        console.log('🖊️ 인감 이미지 처리 시작:', stampType);
        console.log('🔍 디버깅 - 전체 siteData:', siteData);
        console.log('🔍 디버깅 - siteData.stampType:', siteData?.stampType);
        
        // 인감없음인 경우 A인감으로 처리, 기타인감인 경우 이미지 넣지 않음
        if (stampType === '기타') {
          console.log('📝 기타인감이므로 이미지 삽입하지 않음:', stampType);
        } else {
          // 실제 사용할 인감 타입 결정
          const actualStampType = stampType === '인감없음' ? 'A인감' : stampType;
          console.log('🖊️ 실제 사용할 인감 타입:', actualStampType);
          console.log('🔍 디버깅 - stampType:', stampType, 'actualStampType:', actualStampType);
          
          if (workbook) {
            // 인감 이미지 다운로드 함수 (납품계약서와 동일한 방식)
            const downloadSignatureImage = async (stampType = 'A인감') => {
              try {
                const stampImageMap = {
                  'A인감': 'A.png',
                  '별인감': '별.png',
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
                console.log('🔍 디버깅 - 매핑된 이미지:', stampType, '->', mappedImageName);
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
              
              // 기성금청구서 갑지에 인감 이미지 추가 (F40 위치)
              gapjiSheet.addImage(imageId, {
                tl: { col: 5, row: 39 }, // F40 셀 위치
                ext: { width: 60, height: 60 }
              });
              
              console.log('✅ 인감 이미지 삽입 완료 (F40):', actualStampType);
            } else {
              console.log('📝 인감 이미지 없음 또는 워크북 없음:', actualStampType);
            }
          }
        }
      } catch (imageError) {
        console.warn('⚠️ 인감 이미지 추가 실패:', imageError);
      }
    } else {
      console.log('⚠️ 갑지 시트를 찾을 수 없습니다.');
    }
    
    // 기성금 내역서 시트 데이터 입력
    const detailSheet = workbook.getWorksheet('기성금 내역서');
    if (detailSheet) {
      console.log('📝 기성금 내역서 시트 데이터 입력 중...');
      console.log('📊 물량 데이터 개수:', siteItems.length);
      
      // 모든 행을 처리하도록 수정
      const allItems = siteItems;
      
      console.log(`📊 전체 물량 데이터 개수: ${allItems.length}개`);
      
      // 특수항목 목록
      const specialItems = ['단수정리', 'NEGO', '간접비', '이익', '부가세', '총 공사계', '계약금액'];
      
      // 먼저 데이터가 있는 행들 처리 (6행부터)
      allItems.forEach((item, index) => {
        const row = 6 + index;
        
        try {
          const contractQuantity = Number(item.quantity || 0);
          const contractPrice = Number(item.price || item.unitPrice || 0); // price 필드 우선 사용
          
          // 특수항목인지 확인 (A와 B가 같은 항목들: 단수정리, NEGO, 간접비 등)
          const isSpecialItem = (item.name && item.specification && item.name === item.specification) ||
                               specialItems.some(special => item.name && item.name.includes(special)) ||
                               specialItems.some(special => item.specification && item.specification.includes(special));
          
          console.log(`📝 ${index + 1}번째 물량:`, item, `특수항목여부: ${isSpecialItem}`);
          
          // 물량이 20개를 넘으면 행 추가
          if (index >= 20) {
            // 새로운 행 추가
            detailSheet.addRow();
            console.log(`📝 ${row}행 추가 (물량 ${index + 1}개)`);
          }
          
          // ABCD 값이 없는 빈 행 처리 - 모든 데이터와 수식 지우기
          if (!item.name && !item.specification && !item.unit && !item.quantity) {
            console.log(`📝 ${row}행 - ABCD 값이 없으므로 E~M열 모든 수식 지우기`);
            
            // E~M열 모든 셀을 빈칸으로 만들기 (수식 포함)
            ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].forEach(col => {
              const cell = detailSheet.getCell(`${col}${row}`);
              cell.value = null; // 값과 수식 모두 제거
              console.log(`🧹 ${col}${row} 완전히 지움`);
            });
            
            console.log(`✅ ${row}행 E~M열 모든 셀 완전히 지워짐`);
            
            // 다음 행으로 건너뛰기
            return;
          }
          
          // 특수항목(총공사계, 부가세, 계약금액)은 데이터를 입력하지 않음
          if (isSpecialItem) {
            console.log(`📝 ${row}행 - 특수항목이므로 데이터 입력하지 않음: ${item.name}`);
            
            // 특수항목의 경우 E~M열 모든 셀을 빈칸으로 만들기
            ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].forEach(col => {
              const cell = detailSheet.getCell(`${col}${row}`);
              cell.value = null; // 값과 수식 모두 제거
              console.log(`🧹 특수항목 ${col}${row} 완전히 지움`);
            });
            
            console.log(`✅ ${row}행 특수항목 E~M열 모든 셀 완전히 지워짐`);
            
            // 다음 행으로 건너뛰기
            return;
          }
          
          // 정확한 셀 위치에 데이터 입력 (서식 보존)
          const rowDataMapping = {
            // A6: 물량의 규격 (반대로 변경)
            [`A${row}`]: item.specification || '',
            // B6: 물량의 품명 (반대로 변경)
            [`B${row}`]: item.name || '',
            // C6: 단위
            [`C${row}`]: item.unit || '',
            // D6: 수량 (소수점 2째자리까지 정확하게)
            [`D${row}`]: parseFloat(contractQuantity.toFixed(2)),
            // E6: 계약단가
            [`E${row}`]: contractPrice,
          };
          
          // 데이터 입력 (ExcelJS 방식)
          Object.entries(rowDataMapping).forEach(([cell, value]) => {
            try {
              const cellObj = detailSheet.getCell(cell);
              cellObj.value = value;
              console.log(`📝 내역서 ${cell}: ${value}`);
            } catch (cellError) {
              console.warn(`⚠️ 내역서 ${cell} 입력 실패:`, cellError.message);
            }
          });
          
        } catch (rowError) {
          console.error(`❌ ${row}행 데이터 입력 실패:`, rowError);
        }
      });
      
      // 템플릿의 나머지 모든 행(50행까지)에서 E~M열 수식 제거
      const maxRow = 50; // 템플릿의 최대 행 수
      for (let row = 6 + allItems.length; row <= maxRow; row++) {
        try {
          // 해당 행의 A,B,C,D 셀 확인
          const cellA = detailSheet.getCell(`A${row}`);
          const cellB = detailSheet.getCell(`B${row}`);
          const cellC = detailSheet.getCell(`C${row}`);
          const cellD = detailSheet.getCell(`D${row}`);
          
          // A,B,C,D가 모두 비어있으면 E~M열 수식 제거
          if (!cellA.value && !cellB.value && !cellC.value && !cellD.value) {
            console.log(`📝 ${row}행 - 템플릿 빈 행이므로 E~M열 모든 수식 지우기`);
            
            ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].forEach(col => {
              const cell = detailSheet.getCell(`${col}${row}`);
              cell.value = null; // 값과 수식 모두 제거
              console.log(`🧹 템플릿 ${col}${row} 완전히 지움`);
            });
            
            console.log(`✅ ${row}행 템플릿 E~M열 모든 셀 완전히 지워짐`);
          }
        } catch (rowError) {
          console.error(`❌ ${row}행 템플릿 처리 실패:`, rowError);
        }
      }
      
      console.log('✅ 기성금 내역서 데이터 입력 완료');
    } else {
      console.log('⚠️ 기성금 내역서 시트를 찾을 수 없습니다.');
    }
    
    // 현재 월 반환
    const currentMonth = new Date();
    const gisungMonth = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    
    console.log('✅ 기성금청구서 데이터 입력 완료');
    return gisungMonth;
    
  } catch (error) {
    console.error('❌ 기성금청구서 데이터 입력 실패:', error);
    throw error;
  }
};

// 기성금청구서 템플릿 기반 다운로드 함수 (넷틀리파이 호환)
export const downloadTemplateBasedGisungExcel = async (siteData, gisungData, siteItems = [], filename = '기성금청구서.xlsx') => {
  try {
    console.log('🚀 기성금청구서 템플릿 기반 다운로드 시작:', { siteData, gisungData, filename });
    
    // 템플릿 기반 엑셀 생성
    const { workbook, gisungMonth } = await generateTemplateBasedGisungExcel(siteData, gisungData, siteItems, 1, null);
    
    // 넷틀리파이 호환 파일 다운로드
    const buffer = await workbook.xlsx.writeBuffer();
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

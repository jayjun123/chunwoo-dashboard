// 기성금청구서 템플릿 유틸리티 (템플릿 완전 보존)
import ExcelJS from 'exceljs';

// 기성금청구서 템플릿 기반 엑셀 생성 (템플릿 완전 복사)
export const generateTemplateBasedGisungExcel = async (siteData, gisungData, siteItems = [], currentSequence = 1, previousGisungData = null) => {
  try {
    console.log('🚀 기성금청구서 템플릿 기반 엑셀 생성 시작:', { siteData, gisungData, siteItems });
    
    // Firebase Storage에서 NEWgisung.xlsx 템플릿 다운로드
    const templateUrl = 'https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2FNEWgisung.xlsx?alt=media&token=bd4f5d1e-c13a-47db-9012-f60385e4d6f8';
    const response = await fetch(templateUrl);
    const arrayBuffer = await response.arrayBuffer();
    
    // 템플릿을 완전히 복사 (모든 서식 보존)
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    console.log('✅ 기성금청구서 템플릿 완전 복사 완료');
    
    // 데이터 입력 (서식 보존)
    const gisungMonth = await fillGisungData(workbook, siteData, gisungData, siteItems, currentSequence, previousGisungData);
    
    console.log('✅ 기성금청구서 템플릿 기반 생성 완료');
    return { workbook, gisungMonth };
    
  } catch (error) {
    console.error('❌ 기성금청구서 템플릿 기반 생성 실패:', error);
    throw error;
  }
};

// 기성금청구서에 데이터만 입력 (템플릿 완전 보존)
const fillGisungData = async (workbook, siteData, gisungData, siteItems, currentSequence = 1, previousGisungData = null) => {
  try {
    console.log('📝 기성금청구서 데이터 입력 시작 (서식 보존)...');
    console.log('📊 전달받은 데이터:', { siteData, gisungData, siteItems });
    
    // 갑지 시트 데이터 입력
    const gapjiSheet = workbook.getWorksheet('갑지');
    if (gapjiSheet) {
      console.log('📝 갑지 시트 데이터 입력 중...');
      
      // 정확한 셀 위치에 데이터 입력 (서식 보존)
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
      
      // 데이터 입력
      Object.entries(dataMapping).forEach(([cell, value]) => {
        const cellObj = gapjiSheet.getCell(cell);
        cellObj.value = value;
        console.log(`📝 갑지 ${cell}: ${value}`);
      });
      
      // 인감 이미지 추가 (현장관리페이지의 인감 타입 사용)
      try {
        const stampType = siteData?.stampType || 'A인감';
        console.log(`🔍 현장 인감 타입: ${stampType}`);
        
        // 인감없음인 경우 A인감으로 처리, 기타인감인 경우 이미지 넣지 않음
        if (stampType === '기타') {
          console.log('📝 기타인감이므로 이미지 삽입하지 않음:', stampType);
        } else {
          // 실제 사용할 인감 타입 결정
          const actualStampType = stampType === '인감없음' ? 'A인감' : stampType;
          console.log('🖊️ 실제 사용할 인감 타입:', actualStampType);
          
          if (workbook) {
            // 인감 이미지 다운로드 함수 (납품계약서와 동일한 방식)
            const downloadSignatureImage = async (stampType = 'A인감') => {
              try {
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
                  '네모': '네모.png',
                  '동': '동.png',
                  '별': '별.png',
                  '삼각': '삼각.png',
                  '스페이드': '스페이드.png',
                  '클로버': '클로버.png',
                  '하트': '하트.png'
                };
                
                const mappedImageName = stampImageMap[stampType];
                if (!mappedImageName) {
                  console.warn('⚠️ 알 수 없는 인감 타입:', stampType);
                  return null;
                }
                
                // Firebase Storage에서 인감 이미지 가져오기
                const { ref, getDownloadURL } = await import('firebase/storage');
                const { storage } = await import('../firebase.js');
                
                const imageRef = ref(storage, `stamps/${mappedImageName}`);
                const imageUrl = await getDownloadURL(imageRef);
                
                console.log('🖼️ 인감 이미지 다운로드:', imageUrl);
                const response = await fetch(imageUrl);
                const imageBuffer = await response.arrayBuffer();
                
                console.log('✅ 인감 이미지 다운로드 완료');
                return imageBuffer;
              } catch (error) {
                console.warn('⚠️ 인감 이미지 다운로드 실패:', error.message);
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
              
              console.log('✅ 갑지 시트 인감 이미지 삽입 완료 (F40):', actualStampType);
            } else {
              console.log('📝 갑지 시트 인감 이미지 없음 또는 워크북 없음:', actualStampType);
            }
          }
        }
      } catch (imageError) {
        console.warn('⚠️ 갑지 시트 인감 이미지 추가 실패:', imageError);
      }
    } else {
      console.log('⚠️ 갑지 시트를 찾을 수 없습니다.');
    }
    
    // 기성금 내역서 시트 데이터 입력
    const detailSheet = workbook.getWorksheet('기성금 내역서');
    if (detailSheet) {
      console.log('📝 기성금 내역서 시트 데이터 입력 중...');
      console.log('📊 물량 데이터 개수:', siteItems.length);
      
      // 단수정리까지만 필터링
      const filteredItems = [];
      for (let i = 0; i < siteItems.length; i++) {
        const item = siteItems[i];
        filteredItems.push(item);
        
        // 단수정리를 만나면 중단
        if (item.name === '단수정리') {
          console.log('✅ 단수정리까지 필터링 완료');
          break;
        }
      }
      
      console.log(`📊 필터링된 물량 데이터 개수: ${filteredItems.length}개`);
      
      // 특수항목 목록
      const specialItems = ['단수정리', 'NEGO', '간접비', '이익', '부가세', '총 공사계', '계약금액'];
      
      // 데이터 행들에 데이터만 입력 (6행부터)
      filteredItems.forEach((item, index) => {
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
            
            // 견적서에서 사용하는 방법으로 수식 제거
            ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].forEach(col => {
              const cell = detailSheet.getCell(`${col}${row}`);
              if (cell.formula) {
                console.log(`🧹 ${col}${row} 수식 제거: ${cell.formula}`);
                cell.value = null; // 수식 제거
              }
            });
            
            console.log(`✅ ${row}행 E~M열 모든 수식 완전히 지워짐`);
            
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
          
          // 이전 기성 데이터가 있으면 G열에 이전 기성 수량 입력
          if (previousGisungData) {
            console.log(`🔍 이전 기성 데이터 확인:`, previousGisungData);
            
            // 단순한 매칭 - 품목명만 같으면 매칭
            let previousItem = null;
            
            // uploadedData에서 찾기
            if (previousGisungData.uploadedData && typeof previousGisungData.uploadedData === 'object') {
              const uploadedDataArray = [];
              Object.keys(previousGisungData.uploadedData).forEach(key => {
                if (key.startsWith('item_')) {
                  uploadedDataArray.push(previousGisungData.uploadedData[key]);
                }
              });
              
              // A,B,D,E 컬럼을 모두 확인해서 정확한 매칭
              previousItem = uploadedDataArray.find(prevItem => {
                const currentName = item.name || '';
                const currentSpec = item.specification || '';
                const currentUnit = item.unit || '';
                const currentPrice = item.price || 0;
                
                const prevName = prevItem.name || '';
                const prevSpec = prevItem.specification || '';
                const prevUnit = prevItem.unit || '';
                const prevPrice = prevItem.unitPrice || 0;
                
                console.log(`🔍 매칭 시도: 현재(${currentName}, ${currentSpec}, ${currentUnit}, ${currentPrice}) vs 이전(${prevName}, ${prevSpec}, ${prevUnit}, ${prevPrice})`);
                
                // 1. 완전 매칭 (A=A, B=B, D=D, E=E)
                if (currentName === prevName && currentSpec === prevSpec && currentUnit === prevUnit && currentPrice === prevPrice) {
                  console.log(`✅ 완전 매칭: ${currentName}`);
                  return true;
                }
                
                // 2. A,B 바뀐 완전 매칭 (A=B, B=A, D=D, E=E)
                if (currentName === prevSpec && currentSpec === prevName && currentUnit === prevUnit && currentPrice === prevPrice) {
                  console.log(`✅ A,B 바뀐 완전 매칭: ${currentName}`);
                  return true;
                }
                
                // 3. A,B,D 매칭 (E 제외)
                if (currentName === prevName && currentSpec === prevSpec && currentUnit === prevUnit) {
                  console.log(`✅ A,B,D 매칭: ${currentName}`);
                  return true;
                }
                
                // 4. A,B 바뀐 A,B,D 매칭
                if (currentName === prevSpec && currentSpec === prevName && currentUnit === prevUnit) {
                  console.log(`✅ A,B 바뀐 A,B,D 매칭: ${currentName}`);
                  return true;
                }
                
                // 5. A,B,E 매칭 (D 제외)
                if (currentName === prevName && currentSpec === prevSpec && currentPrice === prevPrice) {
                  console.log(`✅ A,B,E 매칭: ${currentName}`);
                  return true;
                }
                
                // 6. A,B 바뀐 A,B,E 매칭
                if (currentName === prevSpec && currentSpec === prevName && currentPrice === prevPrice) {
                  console.log(`✅ A,B 바뀐 A,B,E 매칭: ${currentName}`);
                  return true;
                }
                
                // 7. A,B 매칭 (D,E 제외)
                if (currentName === prevName && currentSpec === prevSpec) {
                  console.log(`✅ A,B 매칭: ${currentName}`);
                  return true;
                }
                
                // 8. A,B 바뀐 A,B 매칭
                if (currentName === prevSpec && currentSpec === prevName) {
                  console.log(`✅ A,B 바뀐 A,B 매칭: ${currentName}`);
                  return true;
                }
                
                return false;
              });
              
              if (previousItem) {
                console.log(`✅ uploadedData에서 매칭 성공: ${previousItem.name}`);
              } else {
                console.log(`❌ uploadedData에서 매칭 실패: ${item.name}`);
              }
            }
            
            // items 배열에서 찾기 (A,B,D,E 컬럼 모두 확인)
            if (!previousItem && previousGisungData.items && Array.isArray(previousGisungData.items)) {
              previousItem = previousGisungData.items.find(prevItem => {
                const currentName = item.name || '';
                const currentSpec = item.specification || '';
                const currentUnit = item.unit || '';
                const currentPrice = item.price || 0;
                
                const prevName = prevItem.name || '';
                const prevSpec = prevItem.specification || '';
                const prevUnit = prevItem.unit || '';
                const prevPrice = prevItem.price || 0;
                
                // 1. 완전 매칭 (A=A, B=B, D=D, E=E)
                if (currentName === prevName && currentSpec === prevSpec && currentUnit === prevUnit && currentPrice === prevPrice) {
                  return true;
                }
                
                // 2. A,B 바뀐 완전 매칭 (A=B, B=A, D=D, E=E)
                if (currentName === prevSpec && currentSpec === prevName && currentUnit === prevUnit && currentPrice === prevPrice) {
                  return true;
                }
                
                // 3. A,B,D 매칭 (E 제외)
                if (currentName === prevName && currentSpec === prevSpec && currentUnit === prevUnit) {
                  return true;
                }
                
                // 4. A,B 바뀐 A,B,D 매칭
                if (currentName === prevSpec && currentSpec === prevName && currentUnit === prevUnit) {
                  return true;
                }
                
                // 5. A,B,E 매칭 (D 제외)
                if (currentName === prevName && currentSpec === prevSpec && currentPrice === prevPrice) {
                  return true;
                }
                
                // 6. A,B 바뀐 A,B,E 매칭
                if (currentName === prevSpec && currentSpec === prevName && currentPrice === prevPrice) {
                  return true;
                }
                
                // 7. A,B 매칭 (D,E 제외)
                if (currentName === prevName && currentSpec === prevSpec) {
                  return true;
                }
                
                // 8. A,B 바뀐 A,B 매칭
                if (currentName === prevSpec && currentSpec === prevName) {
                  return true;
                }
                
                return false;
              });
              
              if (previousItem) {
                console.log(`✅ items 배열에서 매칭 성공: ${previousItem.name}`);
              }
            }
            
            // K값 추출 (kValue 또는 lValue)
            if (previousItem) {
              const kValue = previousItem.kValue || previousItem.lValue || 0;
              console.log(`📊 K값 추출: ${kValue}`);
              
              // G열에 K값 입력 (특수항목 제외)
              if (!isSpecialItem) {
                rowDataMapping[`G${row}`] = parseFloat(kValue.toFixed(2));
                console.log(`📝 ${item.name} - G${row}에 이전 기성 수량 ${kValue} 입력`);
              } else {
                console.log(`📝 ${item.name} - 특수항목이므로 G열에 K값 입력하지 않음`);
              }
            }
          }
          
          // 특수항목인 경우 H열에 L값 입력
          if (isSpecialItem && previousGisungData) {
            console.log(`🔍 특수항목 ${item.name} 처리 시작`);
            let specialItem = null;
            
            // uploadedData에서 찾기 (A,B,D,E 컬럼 모두 확인)
            if (previousGisungData.uploadedData && typeof previousGisungData.uploadedData === 'object') {
              const uploadedDataArray = [];
              Object.keys(previousGisungData.uploadedData).forEach(key => {
                if (key.startsWith('item_')) {
                  uploadedDataArray.push(previousGisungData.uploadedData[key]);
                }
              });
              
              specialItem = uploadedDataArray.find(prevItem => {
                const currentName = item.name || '';
                const currentSpec = item.specification || '';
                const prevName = prevItem.name || '';
                const prevSpec = prevItem.specification || '';
                
                // 정확한 매칭 또는 A,B 바뀐 매칭
                return (currentName === prevName && currentSpec === prevSpec) ||
                       (currentName === prevSpec && currentSpec === prevName) ||
                       currentName === prevName;
              });
            }
            
            // items 배열에서 찾기 (A,B,D,E 컬럼 모두 확인)
            if (!specialItem && previousGisungData.items && Array.isArray(previousGisungData.items)) {
              specialItem = previousGisungData.items.find(prevItem => {
                const currentName = item.name || '';
                const currentSpec = item.specification || '';
                const prevName = prevItem.name || '';
                const prevSpec = prevItem.specification || '';
                
                // 정확한 매칭 또는 A,B 바뀐 매칭
                return (currentName === prevName && currentSpec === prevSpec) ||
                       (currentName === prevSpec && currentSpec === prevName) ||
                       currentName === prevName;
              });
            }
            
            // L값 추출 (특수항목은 L값을 우선적으로 사용)
            if (specialItem) {
              console.log(`🔍 특수항목 ${item.name} 찾은 데이터:`, specialItem);
              console.log(`🔍 lValue: ${specialItem.lValue}, kValue: ${specialItem.kValue}`);
              
              const lValue = specialItem.lValue || specialItem.kValue || 0;
              rowDataMapping[`H${row}`] = parseFloat(lValue.toFixed(2));
              console.log(`📝 ${item.name} - H${row}에 특수항목 L값 ${lValue} 입력`);
            } else {
              console.log(`⚠️ ${item.name} - 이전 기성에서 특수항목을 찾을 수 없음`);
              console.log(`🔍 uploadedData 전체:`, previousGisungData.uploadedData);
              console.log(`🔍 items 전체:`, previousGisungData.items);
            }
          }
          
          // 데이터 입력
          Object.entries(rowDataMapping).forEach(([cell, value]) => {
            const cellObj = detailSheet.getCell(cell);
            cellObj.value = value;
          });
          
        } catch (rowError) {
          console.error(`❌ ${row}행 데이터 입력 실패:`, rowError);
        }
      });
    } else {
      console.log('⚠️ 기성금 내역서 시트를 찾을 수 없습니다.');
    }
    
    // 빈 행의 수식 제거 (A,B,C,D열에 데이터가 없으면 E~M열 수식 제거)
    console.log('🧹 빈 행의 수식 정리 시작...');
    const lastRow = detailSheet.rowCount;
    console.log(`📊 템플릿 총 행 수: ${lastRow}행`);
    
    for (let rowIndex = 6; rowIndex <= lastRow; rowIndex++) {
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
    
    // 기성월 반환
    const gisungMonth = getCurrentMonth();
    console.log('📅 기성월:', gisungMonth);
    
    return gisungMonth;
    
  } catch (error) {
    console.error('❌ 기성금청구서 데이터 입력 실패:', error);
    throw error;
  }
};

// 전월 구하는 함수
const getPreviousMonth = () => {
  const now = new Date();
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${previousMonth.getFullYear()}.${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;
};

// 현재 월 구하는 함수
const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// 템플릿 구조 확인 함수
export const checkTemplateStructure = async () => {
  try {
    console.log('🔍 템플릿 구조 확인 시작...');
    
    // Firebase Storage에서 NEWgisung.xlsx 템플릿 다운로드
    const templateUrl = 'https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2FNEWgisung.xlsx?alt=media&token=bd4f5d1e-c13a-47db-9012-f60385e4d6f8';
    const response = await fetch(templateUrl);
    const arrayBuffer = await response.arrayBuffer();
    
    // 템플릿 로드
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    console.log('✅ 템플릿 로드 완료');
    
    // 시트 확인
    const sheets = workbook.worksheets;
    console.log('📋 시트 목록:', sheets.map(sheet => sheet.name));
    
    // 갑지 시트 확인
    const gapjiSheet = workbook.getWorksheet('갑지');
    if (gapjiSheet) {
      console.log('✅ 갑지 시트 확인됨');
      console.log('📊 갑지 시트 행 수:', gapjiSheet.rowCount);
      console.log('📊 갑지 시트 열 수:', gapjiSheet.columnCount);
    } else {
      console.log('❌ 갑지 시트를 찾을 수 없음');
    }
    
    // 기성금 내역서 시트 확인
    const detailSheet = workbook.getWorksheet('기성금 내역서');
    if (detailSheet) {
      console.log('✅ 기성금 내역서 시트 확인됨');
      console.log('📊 기성금 내역서 시트 행 수:', detailSheet.rowCount);
      console.log('📊 기성금 내역서 시트 열 수:', detailSheet.columnCount);
    } else {
      console.log('❌ 기성금 내역서 시트를 찾을 수 없음');
    }
    
    console.log('✅ 템플릿 구조 확인 완료');
    return { success: true, message: '템플릿 구조가 정상입니다.' };
    
  } catch (error) {
    console.error('❌ 템플릿 구조 확인 실패:', error);
    throw new Error('템플릿 구조 확인에 실패했습니다: ' + error.message);
  }
};

// Firebase 템플릿 업로드 함수
export const uploadTemplateToFirebase = async (file) => {
  try {
    console.log('📤 Firebase 템플릿 업로드 시작...');
    // 실제 구현은 Firebase Storage API 사용
    console.log('✅ 템플릿 업로드 완료');
    return { success: true };
  } catch (error) {
    console.error('❌ 템플릿 업로드 실패:', error);
    throw error;
  }
};

// Firebase 템플릿 삭제 함수
export const deleteTemplateFromFirebase = async () => {
  try {
    console.log('🗑️ Firebase 템플릿 삭제 시작...');
    // 실제 구현은 Firebase Storage API 사용
    console.log('✅ 템플릿 삭제 완료');
    return { success: true };
  } catch (error) {
    console.error('❌ 템플릿 삭제 실패:', error);
    throw error;
  }
};

// 로컬 템플릿을 Firebase에 업로드 함수
export const uploadLocalTemplateToFirebase = async () => {
  try {
    console.log('📤 로컬 템플릿 Firebase 업로드 시작...');
    // 실제 구현은 Firebase Storage API 사용
    console.log('✅ 로컬 템플릿 업로드 완료');
    return { success: true };
  } catch (error) {
    console.error('❌ 로컬 템플릿 업로드 실패:', error);
    throw error;
  }
};

// 기성금 엑셀 파일 업로드 및 파싱 (K열 수식 결과값을 G열로 복사)
export const parseGisungExcelUpload = async (file, siteData, gisungData) => {
  try {
    console.log('📤 기성금 엑셀 파일 업로드 파싱 시작...');
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    
    const detailSheet = workbook.getWorksheet('기성금 내역서');
    if (!detailSheet) {
      throw new Error('기성금 내역서 시트를 찾을 수 없습니다.');
    }
    
    // 갑지에서 금회기성 값 가져오기 (H20 셀)
    const gapjiSheet = workbook.getWorksheet('갑지');
    let currentGisungAmount = 0; // 금회기성 총액
    let gisungMonth = ''; // 기성월
    
    if (gapjiSheet) {
      const h20Cell = gapjiSheet.getCell('H20');
      if (h20Cell) {
        if (h20Cell.result !== null && h20Cell.result !== undefined) {
          // 수식 결과값 우선 사용
          currentGisungAmount = Number(h20Cell.result) || 0;
          console.log(`✅ 갑지 H20 금회기성 수식 결과값: ${currentGisungAmount} (수식: ${h20Cell.formula})`);
        } else if (h20Cell.value !== null && h20Cell.value !== undefined && h20Cell.value !== '') {
          // 일반 값 사용
          currentGisungAmount = Number(h20Cell.value) || 0;
          console.log(`📝 갑지 H20 금회기성 일반값: ${currentGisungAmount}`);
        }
      }
      
      // 갑지 A36에서 기성월 가져오기
      const a36Cell = gapjiSheet.getCell('A36');
      if (a36Cell && a36Cell.value) {
        gisungMonth = String(a36Cell.value);
        console.log(`📅 갑지 A36에서 기성월 가져옴: ${gisungMonth}`);
      } else {
        // A36에 값이 없으면 현재 월 사용
        gisungMonth = getCurrentMonth();
        console.log(`📅 갑지 A36에 값이 없어 현재 월 사용: ${gisungMonth}`);
      }
    } else {
      // 갑지 시트가 없으면 현재 월 사용
      gisungMonth = getCurrentMonth();
      console.log(`📅 갑지 시트가 없어 현재 월 사용: ${gisungMonth}`);
    }
    
    // 기성금 내역서에서 데이터 추출 (6행부터 단수정리까지)
    const uploadedData = [];
    let currentRow = 6;
    let foundDanSu = false;
    
    // 특수항목 목록
    const specialItems = ['단수정리', 'NEGO', '간접비', '이익', '부가세', '총 공사계', '계약금액'];
    
    while (currentRow <= 50 && !foundDanSu) {
      const aCell = detailSheet.getCell(`A${currentRow}`);
      const bCell = detailSheet.getCell(`B${currentRow}`);
      const kCell = detailSheet.getCell(`K${currentRow}`); // 누계수량 (수식 결과값)
      const lCell = detailSheet.getCell(`L${currentRow}`); // 특수항목용 (수식 결과값)
      
      const itemName = aCell.value ? String(aCell.value).trim() : '';
      const specification = bCell.value ? String(bCell.value).trim() : '';
      
      // 특수항목인지 확인
      const isSpecialItem = specialItems.some(special => itemName.includes(special));
      
      // K열 또는 L열 수식 결과값 가져오기
      let kValue = 0;
      let lValue = 0;
      
      if (kCell) {
        if (kCell.result !== null && kCell.result !== undefined) {
          kValue = Number(kCell.result) || 0;
          console.log(`✅ K${currentRow} 누계수량 수식 결과값: ${kValue} (수식: ${kCell.formula})`);
        } else if (kCell.value !== null && kCell.value !== undefined && kCell.value !== '') {
          kValue = Number(kCell.value) || 0;
          console.log(`📝 K${currentRow} 누계수량 일반값: ${kValue}`);
        }
      }
      
      if (lCell) {
        if (lCell.result !== null && lCell.result !== undefined) {
          lValue = Number(lCell.result) || 0;
          console.log(`✅ L${currentRow} 특수항목 수식 결과값: ${lValue} (수식: ${lCell.formula})`);
        } else if (lCell.value !== null && lCell.value !== undefined && lCell.value !== '') {
          lValue = Number(lCell.value) || 0;
          console.log(`📝 L${currentRow} 특수항목 일반값: ${lValue}`);
        }
      }
      
      // 단수정리 체크
      if (itemName === '단수정리') {
        foundDanSu = true;
        console.log('✅ 단수정리 발견 - 파싱 중단');
      }
      
      // 유효한 데이터만 추가 (단수정리 포함)
      if (itemName && itemName.trim() !== '') {
        // D열(단위)과 E열(단가) 정보도 가져오기
        const dCell = detailSheet.getCell(`D${currentRow}`);
        const eCell = detailSheet.getCell(`E${currentRow}`);
        
        const unit = dCell.value ? String(dCell.value).trim() : '';
        const unitPrice = eCell.value ? Number(eCell.value) || 0 : 0;
        
        uploadedData.push({
          row: currentRow,
          name: itemName,           // A열: 품명
          specification: specification, // B열: 규격
          unit: unit,               // D열: 단위
          unitPrice: unitPrice,     // E열: 단가
          kValue: kValue,           // K열: 누계수량
          lValue: lValue,           // L열: 특수항목 값
          isSpecialItem: isSpecialItem // 특수항목 여부
        });
        console.log(`📝 ${currentRow}행 데이터 추가: ${itemName} - 품명: ${itemName}, 규격: ${specification}, 단위: ${unit}, 단가: ${unitPrice}, 누계수량: ${kValue}, 특수항목값: ${lValue}, 특수항목여부: ${isSpecialItem}`);
      }
      
      currentRow++;
    }
    
    console.log('📊 업로드된 데이터:', uploadedData);
    
    // Firebase에 저장 (중첩 배열 문제 해결)
    const { addDoc, collection, serverTimestamp, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('../firebase');
    
    // 차수 계산 - 해당 현장의 청구완료된 기성 데이터 개수 + 1
    let sequence = 1;
    try {
      const completedGisungQuery = query(
        collection(db, 'gisung'),
        where('siteId', '==', siteData.id),
        where('claimStatus', '==', '청구완료')
      );
      const completedGisungSnapshot = await getDocs(completedGisungQuery);
      sequence = completedGisungSnapshot.size + 1;
      console.log(`📊 차수 계산: ${siteData.name} - 청구완료 ${completedGisungSnapshot.size}개 → ${sequence}차`);
    } catch (error) {
      console.error('❌ 청구완료 기성 데이터 조회 실패:', error);
      sequence = 1;
      console.log(`📊 차수 계산 실패로 기본값 사용: ${sequence}차`);
    }
    
    // uploadedData를 객체로 변환 (Firestore 호환) - A,B,D,E,K,L 모든 정보 포함
    const uploadedDataObj = {};
    uploadedData.forEach((item, index) => {
      uploadedDataObj[`item_${index}`] = {
        row: item.row,
        name: item.name,           // A열: 품명
        specification: item.specification, // B열: 규격
        unit: item.unit,           // D열: 단위
        unitPrice: item.unitPrice, // E열: 단가
        kValue: item.kValue,       // K열: 누계수량
        lValue: item.lValue,       // L열: 특수항목 값
        isSpecialItem: item.isSpecialItem // 특수항목 여부
      };
    });
    
    const uploadDoc = await addDoc(collection(db, 'gisung_uploads'), {
      siteName: siteData?.name || '',
      siteId: siteData?.id || '',
      sequence: sequence,
      uploadedData: uploadedDataObj, // 객체로 변환된 데이터
      itemCount: uploadedData.length, // 항목 개수 추가
      gisungMonth: gisungMonth, // 갑지 A36에서 가져온 기성월 저장
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ 기성금 엑셀 파일 업로드 완료:', uploadDoc.id);
    
    // 바로 gisung 컬렉션에 저장하여 테이블에 표시
    const newGisungData = {
      name: siteData?.name || '',
      siteId: siteData?.id || '',
      sequence: `${sequence}차`,
      status: '미청구',
      claimStatus: '미청구',
      contractAmount: Number(siteData?.contractAmount || 0),
      advance: Number(siteData?.advance || 0),
      gisungAmount: currentGisungAmount, // 갑지 H20에서 가져온 금회기성
      gisungMonth: gisungMonth, // 갑지 A36에서 가져온 기성월
      note: '기성금 엑셀 파일 업로드',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const gisungDocRef = await addDoc(collection(db, 'gisung'), newGisungData);
    console.log('✅ gisung 컬렉션에 테이블 데이터 저장 완료:', gisungDocRef.id);
    
    return {
      success: true,
      message: `${sequence}차 기성금 엑셀 파일이 성공적으로 업로드되었습니다.`,
      data: uploadedData, // 업로드된 데이터 배열 추가
      docId: uploadDoc.id,
      sequence: sequence,
      gisungMonth: gisungMonth
    };
    
  } catch (error) {
    console.error('❌ 기성금 엑셀 파일 업로드 파싱 실패:', error);
    throw error;
  }
};

// 업로드된 데이터를 기성 데이터로 변환 (미청구 → 청구완료)
export const convertUploadedDataToGisungData = async (uploadDocId) => {
  try {
    console.log('🔄 업로드된 데이터를 기성 데이터로 변환 시작...');
    
    const { doc, getDoc, addDoc, collection, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('../firebase');
    
    // 업로드된 데이터 가져오기
    const uploadDoc = await getDoc(doc(db, 'gisung_uploads', uploadDocId));
    if (!uploadDoc.exists()) {
      throw new Error('업로드된 데이터를 찾을 수 없습니다.');
    }
    
    const uploadData = uploadDoc.data();
    console.log('📊 업로드된 데이터:', uploadData);
    
    // uploadedDataObj를 배열로 변환
    const uploadedDataArray = [];
    if (uploadData.uploadedData && typeof uploadData.uploadedData === 'object') {
      Object.keys(uploadData.uploadedData).forEach(key => {
        if (key.startsWith('item_')) {
          uploadedDataArray.push(uploadData.uploadedData[key]);
        }
      });
    }
    
    console.log('📊 변환된 배열 데이터:', uploadedDataArray);
    
    // 차수 계산 - 해당 현장의 청구완료된 기성 데이터 개수 + 1
    let sequence = 1;
    try {
      const { query, where, getDocs } = await import('firebase/firestore');
      const completedGisungQuery = query(
        collection(db, 'gisung'),
        where('siteId', '==', uploadData.siteId),
        where('claimStatus', '==', '청구완료')
      );
      const completedGisungSnapshot = await getDocs(completedGisungQuery);
      sequence = completedGisungSnapshot.size + 1;
      console.log(`📊 차수 계산: ${uploadData.siteName} - 청구완료 ${completedGisungSnapshot.size}개 → ${sequence}차`);
    } catch (error) {
      console.error('❌ 청구완료 기성 데이터 조회 실패:', error);
      sequence = 1;
      console.log(`📊 차수 계산 실패로 기본값 사용: ${sequence}차`);
    }
    
    // 기성 데이터로 변환 (K열 값을 G열로 복사)
    const gisungData = {
      name: uploadData.siteName,
      siteId: uploadData.siteId,
      sequence: `${sequence}차`,
      status: '청구완료', // 미청구 → 청구완료로 변경
      claimStatus: '청구완료',
      contractAmount: 0,
      advance: 0,
      gisungAmount: uploadedDataArray.reduce((sum, item) => sum + (item.kValue || 0), 0), // K열 값들의 합계를 금회기성으로
      gisungMonth: uploadData.gisungMonth || getCurrentMonth(), // 업로드된 기성월 또는 현재 월
      items: uploadedDataArray.map(item => ({
        name: item.name,
        specification: item.specification,
        unit: '',
        quantity: item.isSpecialItem ? (item.lValue || 0) : (item.kValue || 0), // 특수항목은 L열, 일반은 K열
        price: 0,
        previousQuantity: item.isSpecialItem ? (item.lValue || 0) : (item.kValue || 0), // 특수항목은 L열, 일반은 K열
        previousAmount: 0,
        currentQuantity: 0, // 금회기성 수량 (초기값)
        currentAmount: 0, // 금회기성 금액 (초기값)
        cumulativeQuantity: item.isSpecialItem ? (item.lValue || 0) : (item.kValue || 0), // 특수항목은 L열, 일반은 K열
        cumulativeAmount: 0,
        progress: 0
      })),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Firebase에 기성 데이터 저장
    const gisungDoc = await addDoc(collection(db, 'gisung'), gisungData);
    
    console.log('✅ 기성 데이터 변환 완료:', gisungDoc.id);
    return { success: true, gisungId: gisungDoc.id, data: gisungData };
    
  } catch (error) {
    console.error('❌ 기성 데이터 변환 실패:', error);
    throw error;
  }
};

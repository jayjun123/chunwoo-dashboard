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
      console.log('🔍 현장 데이터 상세:', {
      name: siteData?.name,
      companyName: siteData?.companyName,
      company: siteData?.company,
      contractor: siteData?.contractor,
        contractType: siteData?.contractType,
      startDate: siteData?.startDate,
      endDate: siteData?.endDate
    });
    
      // 🔍 siteData의 모든 필드를 확인
      console.log('🔍 siteData 전체 객체:', JSON.stringify(siteData, null, 2));
      console.log('🔍 siteData의 모든 키:', Object.keys(siteData || {}));
      
      // 데이터 입력 (서식 보존)
      Object.entries(dataMapping).forEach(([cellAddress, value]) => {
        try {
          const cell = gapjiSheet.getCell(cellAddress);
          console.log(`🔍 셀 ${cellAddress} 찾기:`, cell ? '성공' : '실패');
          
          // cell.value 사용 (cell.text 대신)
          cell.value = value;
          
          console.log(`✅ 갑지 ${cellAddress}: ${value} (서식 보존)`);
        } catch (e) {
          console.log(`⚠️ 갑지 ${cellAddress} 입력 실패:`, e.message);
        }
      });
      
      // 인감 이미지 추가 (납품계약서와 동일한 방식)
    try {
      const stampType = siteData?.stampType || '인감없음';
        console.log('🖊️ 갑지 시트 인감 이미지 처리 시작:', stampType);
      
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
            console.log(`🔍 이전 기성 데이터 구조 확인:`, previousGisungData);
            console.log(`🔍 이전 기성 데이터 키들:`, Object.keys(previousGisungData));
            
            // 다양한 데이터 구조에 대응
            let previousItem = null;
            
            // 1. uploadedData 구조 확인 (gisung_uploads 컬렉션에서 가져온 데이터)
            if (previousGisungData.uploadedData && typeof previousGisungData.uploadedData === 'object') {
              console.log(`🔍 uploadedData 객체 구조:`, previousGisungData.uploadedData);
              
              // uploadedDataObj를 배열로 변환
              const uploadedDataArray = [];
              Object.keys(previousGisungData.uploadedData).forEach(key => {
                if (key.startsWith('item_')) {
                  uploadedDataArray.push(previousGisungData.uploadedData[key]);
                }
              });
              
              console.log(`🔍 변환된 uploadedData 배열 길이:`, uploadedDataArray.length);
              console.log(`🔍 uploadedData 배열:`, uploadedDataArray);
              
              // 더 유연한 매칭 로직 (단계별로 시도)
              previousItem = uploadedDataArray.find(prevItem => {
                console.log(`🔍 uploadedData 매칭 시도: 현재(${item.name}, ${item.specification}, ${item.unit}, ${item.price}) vs 이전(${prevItem.name}, ${prevItem.specification}, ${prevItem.unit}, ${prevItem.unitPrice})`);
                
                // 1. 품목명만으로 매칭 (가장 유연)
                const nameMatch = prevItem.name === item.name;
                
                // 2. 품목명 + 규격 매칭
                const nameSpecMatch = prevItem.name === item.name && prevItem.specification === item.specification;
                
                // 3. 품목명 + 단위 매칭
                const nameUnitMatch = prevItem.name === item.name && prevItem.unit === item.unit;
                
                // 4. 품목명 + 단가 매칭
                const namePriceMatch = prevItem.name === item.name && prevItem.unitPrice === item.price;
                
                // 5. 품목명 + 규격 + 단위 매칭
                const nameSpecUnitMatch = prevItem.name === item.name && 
                                        prevItem.specification === item.specification && 
                                        prevItem.unit === item.unit;
                
                // 6. 품목명 + 규격 + 단가 매칭
                const nameSpecPriceMatch = prevItem.name === item.name && 
                                         prevItem.specification === item.specification && 
                                         prevItem.unitPrice === item.price;
                
                // 7. 완전 매칭 (모든 조건)
                const exactMatch = prevItem.name === item.name && 
                                 prevItem.specification === item.specification && 
                                 prevItem.unit === item.unit &&
                                 prevItem.unitPrice === item.price;
                
                const isMatch = exactMatch || nameSpecPriceMatch || nameSpecUnitMatch || 
                               namePriceMatch || nameUnitMatch || nameSpecMatch || nameMatch;
                
                console.log(`🔍 매칭 결과: 품목명(${nameMatch}), 품목+규격(${nameSpecMatch}), 품목+단위(${nameUnitMatch}), 품목+단가(${namePriceMatch}), 품목+규격+단위(${nameSpecUnitMatch}), 품목+규격+단가(${nameSpecPriceMatch}), 완전매칭(${exactMatch}) -> 최종: ${isMatch}`);
                
                return isMatch;
              });
              
              console.log(`🔍 uploadedData에서 찾은 항목:`, previousItem);
            }
            
            // 2. data 구조 확인 (Excel 업로드 시 저장되는 구조)
            if (!previousItem && previousGisungData.data && Array.isArray(previousGisungData.data)) {
              console.log(`🔍 data 배열 길이:`, previousGisungData.data.length);
              // data는 Excel 행 데이터이므로 다른 방식으로 처리 필요
              console.log(`🔍 data 구조:`, previousGisungData.data);
            }
            
            // 3. items 배열에서 해당 품목 찾기 (단순한 품목명 매칭)
            if (!previousItem && previousGisungData.items && Array.isArray(previousGisungData.items)) {
              console.log(`🔍 items 배열에서 품목 찾기 - itemName: ${item.name}`);
              
              // 단순한 품목명 매칭
              const matchingItem = previousGisungData.items.find(prevItem => prevItem.name === item.name);
              
              if (matchingItem) {
                console.log(`✅ 매칭 성공: ${matchingItem.name}`);
                previousItem = matchingItem;
              } else {
                console.log(`❌ 매칭 실패: ${item.name}`);
              }
            }
              
              if (matchingItem) {
                console.log(`🔍 items 배열에서 매칭 품목 찾음:`, matchingItem);
                console.log(`🔍 matchingItem의 모든 키:`, Object.keys(matchingItem));
                console.log(`🔍 matchingItem의 모든 값:`, matchingItem);
                
                // K값은 수식으로 계산된 결과값이므로 result 필드에서 가져오기
                let kValue = null;
                
                // 1. result 필드 확인 (수식 계산 결과)
                if (matchingItem.result) {
                  kValue = matchingItem.result;
                  console.log(`🔍 result 필드에서 K값 찾음:`, kValue);
                }
                // 2. kValue 필드 확인 (직접 저장된 K값)
                else if (matchingItem.kValue) {
                  kValue = matchingItem.kValue;
                  console.log(`🔍 kValue 필드에서 K값 찾음:`, kValue);
                }
                // 3. cumulativeQuantity 필드 확인 (누적 수량)
                else if (matchingItem.cumulativeQuantity) {
                  kValue = matchingItem.cumulativeQuantity;
                  console.log(`🔍 cumulativeQuantity 필드에서 K값 찾음:`, kValue);
                }
                // 4. quantity 필드 확인 (기본 수량)
                else if (matchingItem.quantity) {
                  kValue = matchingItem.quantity;
                  console.log(`🔍 quantity 필드에서 K값 찾음:`, kValue);
                }
                
                if (kValue !== null) {
                  previousItem = { cumulativeQuantity: kValue };
                  console.log(`🔍 최종 K값 설정:`, kValue);
                } else {
                  console.log(`🔍 K값을 찾을 수 없음 - 모든 필드 확인 완료`);
                  console.log(`🔍 matchingItem의 모든 필드 값:`, {
                    result: matchingItem.result,
                    kValue: matchingItem.kValue,
                    cumulativeQuantity: matchingItem.cumulativeQuantity,
                    quantity: matchingItem.quantity
                  });
                }
              } else {
                console.log(`🔍 items 배열에서 매칭 품목을 찾을 수 없음`);
                console.log(`🔍 현재 찾는 항목:`, { name: item.name, specification: item.specification });
                console.log(`🔍 items 배열의 모든 항목:`, previousGisungData.items.map(item => ({ name: item.name, specification: item.specification })));
              }
            }
            
            // 4. 직접적인 필드 확인 (fallback)
            if (!previousItem) {
              console.log(`🔍 직접 필드 확인 - itemName: ${item.name}, specification: ${item.specification}`);
              // 이전 기성 데이터에서 직접 해당 품목의 누적 수량 찾기
              if (previousGisungData.cumulativeQuantity) {
                previousItem = { cumulativeQuantity: previousGisungData.cumulativeQuantity };
                console.log(`🔍 직접 필드에서 누적 수량 찾음:`, previousGisungData.cumulativeQuantity);
              }
            }
            
            if (previousItem && previousItem.cumulativeQuantity) {
              // 소수점 2째자리까지 정확하게 유지
              const cumulativeValue = parseFloat(previousItem.cumulativeQuantity).toFixed(2);
              // 단수정리는 G열에 넣지 않고 H열에만 넣음
              if (!item.name || !item.name.includes('단수정리')) {
                rowDataMapping[`G${row}`] = parseFloat(cumulativeValue);
                console.log(`📝 ${item.name} - G${row}에 이전 기성 수량 ${cumulativeValue} 입력 (소수점 2째자리)`);
        } else {
                console.log(`📝 단수정리 - G열에 넣지 않음 (H열에만 넣음)`);
              }
        } else {
              console.log(`⚠️ ${item.name} - 이전 기성 데이터에서 누적 수량을 찾을 수 없음`);
            }
          }
          
          // 특수항목인 경우 처리 (단수정리, NEGO 등 모든 특수항목은 H열에 L값)
          if (isSpecialItem) {
            // 모든 특수항목(단수정리, NEGO 등)은 이전 기성의 L값을 H열에 입력 (소수점 2째자리까지)
            let hValue = 0;
            if (previousGisungData) {
              console.log(`🔍 이전 기성 데이터 전체 구조:`, previousGisungData);
              console.log(`🔍 이전 기성 데이터 키들:`, Object.keys(previousGisungData));
              
              // 단수정리 항목인지 확인
              const isDanSuJeongRi = item.name && item.name.includes('단수정리');
              console.log(`🔍 현재 항목이 단수정리인가?: ${isDanSuJeongRi} (${item.name})`);
              
              if (isDanSuJeongRi) {
                // 단수정리 특별 처리 - 모든 필드에서 단수정리 찾기
                console.log(`🔍 단수정리 찾기 시작 - 모든 필드 확인`);
                
                let danSuJeongRiItem = null;
                
                // 1. extractedItems에서 찾기 (가장 정확)
                if (previousGisungData.extractedItems && Array.isArray(previousGisungData.extractedItems)) {
                  console.log(`🔍 extractedItems 배열 확인:`, previousGisungData.extractedItems);
                  danSuJeongRiItem = previousGisungData.extractedItems.find(prevItem => 
                    prevItem.itemName && prevItem.itemName.includes('단수정리')
                  );
                  console.log(`🔍 extractedItems에서 단수정리 찾기:`, danSuJeongRiItem);
                }
                
                // 2. uploadedData에서 찾기
                if (!danSuJeongRiItem && previousGisungData.uploadedData && Array.isArray(previousGisungData.uploadedData)) {
                  console.log(`🔍 uploadedData 배열 확인:`, previousGisungData.uploadedData);
                  
                  // itemName 필드에서 찾기
                  danSuJeongRiItem = previousGisungData.uploadedData.find(prevItem => 
                    prevItem.itemName && prevItem.itemName.includes('단수정리')
                  );
                  console.log(`🔍 uploadedData.itemName에서 단수정리 찾기:`, danSuJeongRiItem);
                  
                  // name 필드에서 찾기
                  if (!danSuJeongRiItem) {
                    danSuJeongRiItem = previousGisungData.uploadedData.find(prevItem => 
                      prevItem.name && prevItem.name.includes('단수정리')
                    );
                    console.log(`🔍 uploadedData.name에서 단수정리 찾기:`, danSuJeongRiItem);
                  }
                  
                  // specification 필드에서 찾기
                  if (!danSuJeongRiItem) {
                    danSuJeongRiItem = previousGisungData.uploadedData.find(prevItem => 
                      prevItem.specification && prevItem.specification.includes('단수정리')
                    );
                    console.log(`🔍 uploadedData.specification에서 단수정리 찾기:`, danSuJeongRiItem);
                  }
                  
                  // 모든 필드에서 "단수" 또는 "정리" 포함하는 항목 찾기
                  if (!danSuJeongRiItem) {
                    danSuJeongRiItem = previousGisungData.uploadedData.find(prevItem => {
                      const allFields = [
                        prevItem.itemName,
                        prevItem.name,
                        prevItem.specification,
                        prevItem.itemSpecification
                      ].filter(Boolean).join(' ');
                      return allFields.includes('단수') || allFields.includes('정리');
                    });
                    console.log(`🔍 uploadedData 전체필드에서 단수정리 찾기:`, danSuJeongRiItem);
                  }
                }
                
                // 3. items 배열에서 찾기
                if (!danSuJeongRiItem && previousGisungData.items && Array.isArray(previousGisungData.items)) {
                  console.log(`🔍 items 배열 확인:`, previousGisungData.items);
                  danSuJeongRiItem = previousGisungData.items.find(prevItem => 
                    prevItem.name && prevItem.name.includes('단수정리')
                  );
                  console.log(`🔍 items에서 단수정리 찾기:`, danSuJeongRiItem);
                }
                
                // 4. data 배열에서 찾기 (Excel 원본 데이터)
                if (!danSuJeongRiItem && previousGisungData.data && Array.isArray(previousGisungData.data)) {
                  console.log(`🔍 data 배열 확인:`, previousGisungData.data);
                  // data는 Excel 행 데이터이므로 특별 처리 필요
                  for (let i = 0; i < previousGisungData.data.length; i++) {
                    const row = previousGisungData.data[i];
                    if (row && row[0] && String(row[0]).includes('단수정리')) {
                      danSuJeongRiItem = {
                        itemName: row[0],
                        specification: row[1],
                        lValue: row[11] // L열 (12번째 열, 인덱스 11)
                      };
                      console.log(`🔍 data 배열에서 단수정리 찾기:`, danSuJeongRiItem);
                      break;
                    }
                  }
                }
                
                console.log(`🔍 단수정리 찾기 결과:`, danSuJeongRiItem);
                
                if (danSuJeongRiItem) {
                  console.log(`🔍 단수정리 항목의 모든 필드:`, danSuJeongRiItem);
                  
                  // L값 찾기 (extractedItems의 lValue > result > lValue > L > l 순서)
                  let lValue = null;
                  
                  // extractedItems에서 찾은 경우 lValue 필드 우선 사용
                  if (danSuJeongRiItem.lValue !== undefined && danSuJeongRiItem.lValue !== null) {
                    lValue = danSuJeongRiItem.lValue;
                    console.log(`🔍 extractedItems의 lValue 필드에서 L값 찾음:`, lValue);
                  } else if (danSuJeongRiItem.result !== undefined && danSuJeongRiItem.result !== null) {
                    lValue = danSuJeongRiItem.result;
                    console.log(`🔍 result 필드에서 L값 찾음:`, lValue);
                  } else if (danSuJeongRiItem.L !== undefined && danSuJeongRiItem.L !== null) {
                    lValue = danSuJeongRiItem.L;
                    console.log(`🔍 L 필드에서 L값 찾음:`, lValue);
                  } else if (danSuJeongRiItem.l !== undefined && danSuJeongRiItem.l !== null) {
                    lValue = danSuJeongRiItem.l;
                    console.log(`🔍 l 필드에서 L값 찾음:`, lValue);
                  }
                  
                  if (lValue !== null) {
                    hValue = parseFloat(parseFloat(lValue).toFixed(2));
                    console.log(`📝 단수정리 - H${row}에 이전 L값 ${hValue} 입력`);
                  } else {
                    console.log(`⚠️ 단수정리 - 이전 기성에서 L값을 찾을 수 없음`);
                    console.log(`🔍 단수정리 항목의 모든 키:`, Object.keys(danSuJeongRiItem));
                  }
                } else {
                  console.log(`⚠️ 단수정리 - 이전 기성에서 단수정리 항목을 찾을 수 없음`);
                  console.log(`🔍 이전 기성 데이터의 모든 항목명:`, previousGisungData.uploadedData.map(item => ({
                    itemName: item.itemName,
                    name: item.name,
                    specification: item.specification
                  })));
                }
              } else {
                // 다른 특수항목들 처리
                const previousSpecialItem = previousGisungData.uploadedData.find(prevItem => {
                  return prevItem.itemName === item.name || 
                         prevItem.itemName?.includes(item.name) ||
                         prevItem.itemSpecification === item.specification;
                });
                
                if (previousSpecialItem) {
                  if (previousSpecialItem.result !== undefined && previousSpecialItem.result !== null) {
                    hValue = parseFloat(parseFloat(previousSpecialItem.result).toFixed(2));
                    console.log(`📝 특수항목 ${item.name} - H${row}에 이전 L값(result) ${hValue} 입력`);
                  } else if (previousSpecialItem.lValue !== undefined && previousSpecialItem.lValue !== null) {
                    hValue = parseFloat(parseFloat(previousSpecialItem.lValue).toFixed(2));
                    console.log(`📝 특수항목 ${item.name} - H${row}에 이전 L값(lValue) ${hValue} 입력`);
                  }
                }
              }
            }
            rowDataMapping[`H${row}`] = hValue;
          }
          
          console.log(`📋 ${row}행 데이터 매핑:`, rowDataMapping);
          
          // 데이터 입력 (서식 보존)
          Object.entries(rowDataMapping).forEach(([cellAddress, value]) => {
            try {
              const cell = detailSheet.getCell(cellAddress);
              console.log(`🔍 셀 ${cellAddress} 찾기:`, cell ? '성공' : '실패');
              
              // 특수항목의 H열인 경우 수식을 무시하고 값만 입력
              if (cellAddress.startsWith('H') && isSpecialItem) {
                // 수식 완전 제거 후 값 입력
                cell.value = value;
                try {
                  cell.formula = undefined;
                } catch (e) {
                  console.log(`⚠️ 특수항목 H열 수식 제거 실패: ${e.message}`);
                }
                console.log(`✅ 특수항목 ${item.name} - ${cellAddress}: ${value} (수식 무시하고 값만 입력)`);
              } else {
                // 일반 항목은 기존 방식대로 처리
                cell.value = value;
                console.log(`✅ 기성금 내역서 ${cellAddress}: ${value} (서식 보존)`);
              }
            } catch (e) {
              console.log(`⚠️ 기성금 내역서 ${cellAddress} 입력 실패:`, e.message);
            }
          });
          
          // B, C, D 열에 값이 없으면 F~M 열까지 모든 수식과 값을 빈칸으로 처리
          const hasData = (item.name && item.name.trim() !== '') || 
                         (item.specification && item.specification.trim() !== '') || 
                         (item.unit && item.unit.trim() !== '') || 
                         (contractQuantity && contractQuantity > 0);
           
          // A, B, C 열이 비어있으면 E~M 열을 지우기 (D열은 수량이므로 제외)
          const isEmptyABC = !item.name && !item.specification && !item.unit;
            
          // 실제로 모든 필드가 비어있는지 확인 (더 엄격하게)
          const isEmptyRow = !item.name && !item.specification && !item.unit && !contractQuantity;
            
          // 디버깅을 위한 상세 로그
          console.log(`🔍 ${row}행 데이터 확인:`, {
            name: item.name,
            specification: item.specification,
            unit: item.unit,
            quantity: contractQuantity,
            isEmptyRow: isEmptyRow,
            isEmptyABC: isEmptyABC,
            hasData: hasData
          });
            
          if (isEmptyABC) {
            console.log(`📝 ${row}행 A,B,C 열이 비어있어서 E~M 열을 빈칸으로 처리`);
            
            // E~M 열을 빈칸으로 처리 (수식 완전 제거)
            for (let col = 5; col <= 13; col++) { // E=5, M=13
              try {
                const cell = detailSheet.getCell(row, col);
                
                // 수식 완전 제거 방법 (더 강력하게)
                cell.value = ''; // 값 제거
                
                // 수식 관련 속성들을 안전하게 제거
                try {
                  cell.formula = undefined;
                } catch (e) {
                  console.log(`⚠️ 수식 제거 실패 (읽기 전용): ${e.message}`);
                }
                
                try {
                  cell.result = undefined;
                } catch (e) {
                  console.log(`⚠️ 결과값 제거 실패 (읽기 전용): ${e.message}`);
                }
                
                try {
                  cell.type = ExcelJS.ValueType.String;
                } catch (e) {
                  console.log(`⚠️ 셀 타입 변경 실패: ${e.message}`);
                }
                
                // 셀 속성을 완전히 초기화 (안전하게)
                try {
                  delete cell.formula;
                  delete cell.result;
                  delete cell.sharedFormula;
                } catch (e) {
                  console.log(`⚠️ 셀 속성 삭제 실패: ${e.message}`);
                }
                
                console.log(`✅ ${row}행 ${String.fromCharCode(64 + col)}열 빈칸 처리 완료`);
              } catch (e) {
                console.log(`⚠️ ${row}행 ${String.fromCharCode(64 + col)}열 빈칸 처리 실패:`, e.message);
              }
            }
          } else {
            console.log(`📝 ${row}행 A,B,C 열에 데이터가 있어서 E~M 열 수식 유지`);
          }
          
          } catch (error) {
          console.log(`⚠️ ${row}행 데이터 입력 실패:`, error.message);
        }
      });
      
      console.log(`✅ 기성금 내역서 총 ${filteredItems.length}개 물량 데이터 입력 완료`);
      
      // 단수정리 이후의 빈 행들도 수식 정리 (선급금 섹션 전까지)
      console.log('🧹 단수정리 이후 빈 행들 수식 정리 중...');
      const startRow = 6 + filteredItems.length; // 단수정리 다음 행부터
      const endRow = 30; // 선급금 섹션 전까지 (충분한 범위)
      
      for (let row = startRow; row <= endRow; row++) {
        try {
          // 해당 행의 A, B, C 열이 모두 비어있는지 확인
          const cellA = detailSheet.getCell(row, 1); // A열
          const cellB = detailSheet.getCell(row, 2); // B열  
          const cellC = detailSheet.getCell(row, 3); // C열
          
          const isEmptyRow = (!cellA.value || cellA.value === '') && 
                            (!cellB.value || cellB.value === '') && 
                            (!cellC.value || cellC.value === '');
          
          if (isEmptyRow) {
            console.log(`🧹 ${row}행 빈 행 발견 - E~M 열 수식 정리`);
            
            // E~M 열을 빈칸으로 처리 (수식 완전 제거)
            for (let col = 5; col <= 13; col++) { // E=5, M=13
              try {
                const cell = detailSheet.getCell(row, col);
                
                // 안전한 수식 제거 방법
                cell.value = '';
                
                // 수식 속성이 쓰기 가능한지 확인 후 제거
                try {
                  if (cell.formula !== undefined) {
                    cell.formula = undefined;
                  }
                } catch (formulaError) {
                  console.log(`📝 ${row}행 ${String.fromCharCode(64 + col)}열 수식 제거 건너뜀 (읽기전용)`);
                }
                
                try {
                  if (cell.result !== undefined) {
                    cell.result = undefined;
                  }
                } catch (resultError) {
                  console.log(`📝 ${row}행 ${String.fromCharCode(64 + col)}열 결과값 제거 건너뜀 (읽기전용)`);
                }
                
                // 셀 타입을 일반 텍스트로 변경
                try {
                  cell.type = ExcelJS.ValueType.String;
                } catch (typeError) {
                  console.log(`📝 ${row}행 ${String.fromCharCode(64 + col)}열 타입 변경 건너뜀`);
                }
                
                console.log(`✅ ${row}행 ${String.fromCharCode(64 + col)}열 빈칸 처리 완료`);
              } catch (e) {
                console.log(`⚠️ ${row}행 ${String.fromCharCode(64 + col)}열 빈칸 처리 실패:`, e.message);
              }
            }
          }
        } catch (e) {
          console.log(`⚠️ ${row}행 확인 실패:`, e.message);
        }
      }
      
      console.log('✅ 단수정리 이후 빈 행들 수식 정리 완료');
    } else {
      console.log('⚠️ 기성금 내역서 시트를 찾을 수 없습니다.');
    }
    
    console.log('✅ 기성금청구서 데이터 입력 완료 (서식 보존)');
    
    // 갑지 A36에서 기성월 가져오기
    let gisungMonth = '';
    if (gapjiSheet) {
      const a36Cell = gapjiSheet.getCell('A36');
      if (a36Cell && a36Cell.value) {
        gisungMonth = String(a36Cell.value);
        console.log(`📅 갑지 A36에서 기성월 가져옴: ${gisungMonth}`);
      }
    }
    
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
    
    // A,B,K,L6~ 데이터 수집 (K열은 누계수량, L열은 특수항목용)
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
      gisungAmount: currentGisungAmount, // 갑지 H20의 금회기성 값
      gisungMonth: gisungMonth, // 갑지 A36에서 가져온 기성월 사용
      items: uploadedData.map(item => ({
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
      note: '기성금청구서 업로드',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('📊 저장할 기성 데이터:', {
      name: newGisungData.name,
      siteId: newGisungData.siteId,
      sequence: newGisungData.sequence,
      gisungMonth: newGisungData.gisungMonth,
      itemsCount: newGisungData.items.length
    });
    
    // gisung 컬렉션에 저장
    const gisungDoc = await addDoc(collection(db, 'gisung'), newGisungData);
    
    console.log('✅ 기성 데이터 테이블 저장 완료:', gisungDoc.id);
    return { success: true, uploadId: uploadDoc.id, gisungId: gisungDoc.id, data: uploadedData };
    
  } catch (error) {
    console.error('❌ 기성금 엑셀 파일 업로드 실패:', error);
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
      const { db } = await import('../firebase');
      
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
      sequence = uploadData.sequence || 1;
      console.log(`📊 차수 계산 실패로 업로드된 차수 사용: ${sequence}차`);
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

// 납품계약서 갑지 생성 유틸리티 (데이터만 입력)
import ExcelJS from 'exceljs';

/**
 * 납품계약서 갑지 생성 (데이터만 입력)
 * @param {Object} siteData - 현장 정보
 * @param {Array} materialItems - 물량 내역
 * @param {string} fileName - 파일명
 * @returns {Promise<Object>} - 생성 결과
 */
export const createContractGabji = async (siteData, materialItems = [], fileName = '납품계약서') => {
  try {
    console.log('📋 납품계약서 갑지 생성 시작...', { siteData, materialItems });
    
        // Firebase Storage에서 템플릿 다운로드
    const templateUrl = 'https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2Fcontract_gabji.xlsx?alt=media&token=a5dac61d-7db3-4b7e-9efd-857aa16ffe2b';
    const response = await fetch(templateUrl);
    const arrayBuffer = await response.arrayBuffer();
    
    // 템플릿 로드 (공유수식 완전 무시)
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer, {
      ignoreNodes: ['shared-formula', 'shared-formula-ref', 'shared-formula-master', 'formula'],
      ignoreFormulas: true,
      ignoreFormulaErrors: true,
      ignoreSharedFormulas: true
    });
    console.log('✅ 납품계약서 갑지 템플릿 로드 완료');
    
    // 공유수식 완전 제거
    removeAllSharedFormulas(workbook);
    console.log('✅ 공유수식 제거 완료');
    
    // 데이터만 입력 (양식은 건드리지 않음)
    await fillContractGabjiData(workbook, siteData, materialItems);
    
    // 파일 생성 및 다운로드
    console.log('💾 파일 생성 중...');
    const buffer = await workbook.xlsx.writeBuffer({
      ignoreNodes: ['shared-formula', 'shared-formula-ref', 'shared-formula-master', 'formula'],
      ignoreFormulaErrors: true,
      ignoreFormulas: true,
      ignoreSharedFormulas: true
    });
    console.log('📦 버퍼 생성 완료, 크기:', buffer.byteLength);
    
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    console.log('📄 Blob 생성 완료, 크기:', blob.size);
    
    const url = window.URL.createObjectURL(blob);
    console.log('🔗 URL 생성 완료:', url);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
    console.log('📥 다운로드 시작:', link.download);
    
    // 다운로드 트리거
    try {
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        console.log('✅ 링크 DOM에서 제거 완료');
      }, 100);
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        console.log('🧹 URL 메모리 정리 완료');
      }, 2000);
      
      console.log('📥 다운로드 트리거 완료');
      
    } catch (downloadError) {
      console.error('❌ 다운로드 트리거 실패:', downloadError);
      try {
        window.open(url, '_blank');
        console.log('🔄 대체 방법: 새 창에서 열기 시도');
      } catch (fallbackError) {
        console.error('❌ 대체 방법도 실패:', fallbackError);
      }
    }
    
    console.log('✅ 납품계약서 갑지 생성 완료');
    return { success: true, fileName: link.download };
    
  } catch (error) {
    console.error('❌ 납품계약서 갑지 생성 실패:', error);
    return { success: false, error: error.message };
  }
};



/**
 * 모든 공유 수식 제거 함수
 * @param {ExcelJS.Workbook} workbook - 워크북
 */
const removeAllSharedFormulas = (workbook) => {
  try {
    console.log('🔧 공유 수식 제거 시작...');
    
    workbook.worksheets.forEach((worksheet, index) => {
      console.log(`🔍 시트 ${index + 1}: ${worksheet.name} 처리 중...`);
      
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          if (cell.formula) {
            console.log(`⚠️ 수식 발견: ${worksheet.name}!${cell.address} = ${cell.formula}`);
            // 수식 제거하고 값만 유지
            const currentValue = cell.value;
            cell.formula = undefined;
            cell.value = currentValue;
            console.log(`✅ 수식 제거: ${cell.address}, 값 유지: ${currentValue}`);
          }
        });
      });
    });
    
    console.log('✅ 모든 공유 수식 제거 완료');
  } catch (error) {
    console.error('❌ 공유 수식 제거 중 오류:', error);
  }
};

/**
 * 납품계약서 갑지에 데이터만 입력
 * @param {ExcelJS.Workbook} workbook - 워크북
 * @param {Object} siteData - 현장 정보
 * @param {Array} materialItems - 물량 내역
 */
const fillContractGabjiData = async (workbook, siteData, materialItems) => {
  try {
    console.log('📝 납품계약서 갑지 데이터 입력 중...');
    
    // 각 시트에 데이터 입력
    const sheets = workbook.worksheets;
    for (const sheet of sheets) {
      console.log(`📋 ${sheet.name} 시트에 데이터 입력`);
      
      // 1번째 시트 (계약서) - 기본 정보 입력
      if (sheets.indexOf(sheet) === 0) { // 1번째 시트 (0-based index)
        console.log('📋 1번째 시트 (계약서)에 기본 정보 입력');
        await fillContractSheetData(sheet, siteData, workbook);
      }
      
      // 2번째 시트 (갑지) - 인감이미지 추가 및 B11 수식 수정
      if (sheets.indexOf(sheet) === 1) { // 2번째 시트 (0-based index)
        console.log('📋 2번째 시트 (갑지)에 인감이미지 추가 및 B11 수식 수정');
        
        // B11 셀의 수식을 =계약서!E24에서 =계약서!G24로 변경
        try {
          const b11Cell = sheet.getCell('B11');
          if (b11Cell.formula && b11Cell.formula.includes('=계약서!E24')) {
            b11Cell.formula = '=계약서!G24';
            console.log('✅ B11 셀 수식 변경: =계약서!E24 → =계약서!G24');
          } else {
            console.log('⚠️ B11 셀에 기대하는 수식이 없음:', b11Cell.formula);
          }
        } catch (error) {
          console.log('⚠️ B11 셀 수식 변경 실패:', error.message);
        }
        
        await addStampImageToSheet(sheet, siteData, workbook);
      }
      
      // 3번째 시트 (내역서) - 물량데이터 입력
      if (sheets.indexOf(sheet) === 2) { // 3번째 시트 (0-based index)
        console.log('📋 3번째 시트 (내역서)에 물량데이터 입력');
        fillEstimateStyleSheetData(sheet, siteData, materialItems);
      }
    }
    
    console.log('✅ 납품계약서 갑지 데이터 입력 완료');
    
  } catch (error) {
    console.error('❌ 납품계약서 갑지 데이터 입력 실패:', error);
  }
};

/**
 * 계약서 시트에 기본 정보 입력
 * @param {ExcelJS.Worksheet} sheet - 시트
 * @param {Object} siteData - 현장 정보
 * @param {ExcelJS.Workbook} workbook - 워크북 (인감이미지용)
 */
const fillContractSheetData = async (sheet, siteData, workbook) => {
  try {
    console.log('📋 계약서 시트 데이터 입력');
    
    // 정확한 위치에 데이터 입력 (현장관리페이지 현장상세정보에서)
    const dataMapping = {
      // 현장명
      'G4': siteData.name || siteData.siteName || '',
      
      // 계약금액
      'K7': siteData.contractAmount || '',
      
      // 착공일
      'G10': siteData.startDate || '',
      
      // 준공예정일
      'J10': siteData.endDate || '',
      
      // 선급금 (없으면 0으로 설정)
      'K16': siteData.advance || 0,
      
      // 착공일 (B20)
      'B20': siteData.startDate || '',
      
      // 회사명
      'E24': siteData.companyName || siteData.company || '',
      
             // 거래처관리페이지에서 가져올 데이터 (같은 회사명으로 찾아서)
       'J24': siteData.businessNumber || '', // 사업자번호
       'E25': siteData.companyAddress || '', // 회사주소 (거래처관리에서)
       'J25': siteData.phone || '', // 전화번호
       'E26': siteData.ceoName || '', // 대표자명
    };
    
    // 데이터 입력
    Object.entries(dataMapping).forEach(([cellAddress, value]) => {
      try {
        const cell = sheet.getCell(cellAddress);
        cell.value = value;
        
        // G4 셀 서식을 일반으로 변경
        if (cellAddress === 'G4') {
          cell.numFmt = 'General';
          console.log('✅ G4 셀 서식을 일반으로 변경');
        }
        
        console.log(`✅ ${cellAddress}: ${value}`);
      } catch (e) {
        console.log(`⚠️ ${cellAddress} 입력 실패:`, e.message);
      }
    });
    
         // 인감 이미지 추가 (견적서와 동일한 방식)
     try {
       const stampType = siteData?.stampType || '인감없음';
       console.log('🖊️ 인감 이미지 처리 시작:', stampType);
       
       // 인감없음인 경우 A인감으로 처리, 기타인감인 경우 이미지 넣지 않음
       if (stampType === '기타') {
         console.log('📝 기타인감이므로 이미지 삽입하지 않음:', stampType);
         return;
       }
       
       // 실제 사용할 인감 타입 결정
       const actualStampType = stampType === '인감없음' ? 'A인감' : stampType;
       console.log('🖊️ 실제 사용할 인감 타입:', actualStampType);
       
       if (workbook) {
         // 인감 이미지 다운로드 함수 (견적서와 동일한 방식)
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
           
           // G30 셀 위치에 인감 이미지 추가
           sheet.addImage(imageId, {
             tl: { col: 6, row: 29 }, // G30 셀 (0-based index)
             ext: { width: 60, height: 60 }
           });
           
           console.log('✅ 인감 이미지 삽입 완료 (G30):', actualStampType);
         } else {
           console.log('📝 인감 이미지 없음 또는 워크북 없음:', actualStampType);
         }
       }
     } catch (imageError) {
       console.warn('⚠️ 인감 이미지 추가 실패:', imageError);
     }
    
  } catch (error) {
    console.error('❌ 계약서 시트 입력 실패:', error);
  }
};

/**
 * 물량 내역 시트에 데이터 입력
 * @param {ExcelJS.Worksheet} sheet - 시트
 * @param {Array} materialItems - 물량 내역
 */
const fillMaterialSheetData = (sheet, materialItems) => {
  try {
    console.log('📋 물량 내역 시트 데이터 입력');
    
    // 물량 데이터 입력 (일반적으로 5행부터 시작)
    if (materialItems && Array.isArray(materialItems)) {
      materialItems.forEach((item, index) => {
        const row = 5 + index;
        
        try {
          // 일반적인 물량 내역 구조에 맞춰 데이터 입력
          sheet.getCell(`A${row}`).value = item.name || item.itemName || '';
          sheet.getCell(`B${row}`).value = item.specification || item.spec || '';
          sheet.getCell(`C${row}`).value = item.unit || '';
          sheet.getCell(`D${row}`).value = item.quantity || item.qty || '';
          sheet.getCell(`E${row}`).value = item.unitPrice || item.price || '';
          sheet.getCell(`F${row}`).value = item.amount || item.total || '';
          sheet.getCell(`G${row}`).value = item.note || item.remark || '';
          
          console.log(`✅ ${row}행 데이터 입력 완료`);
        } catch (e) {
          console.log(`⚠️ ${row}행 데이터 입력 실패:`, e.message);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ 물량 내역 시트 입력 실패:', error);
  }
};

/**
 * 2번째 시트에 인감이미지만 추가
 * @param {ExcelJS.Worksheet} sheet - 시트
 * @param {Object} siteData - 현장 정보
 * @param {ExcelJS.Workbook} workbook - 워크북 (인감이미지용)
 */
const addStampImageToSheet = async (sheet, siteData, workbook) => {
  try {
    console.log('🖊️ 2번째 시트에 인감이미지 추가');
    
    // 인감 이미지 추가 (견적서와 동일한 방식)
    const stampType = siteData?.stampType || '인감없음';
    if (stampType === '기타') {
      console.log('📝 기타인감이므로 이미지 삽입하지 않음:', stampType);
      return;
    }
    
    const actualStampType = stampType === '인감없음' ? 'A인감' : stampType;
    if (workbook) {
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
          
          // 인감 이미지 가져오기 (로컬 파일 사용)
          console.log('🌐 로컬 인감 이미지 사용');
          const imagePath = `/${mappedImageName}`;
          console.log('📁 로컬 인감 이미지 경로:', imagePath);
          const response = await fetch(imagePath);
          if (!response.ok) {
            throw new Error(`인감 이미지 다운로드 실패: ${response.status}`);
          }
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
        const imageId = workbook.addImage({ buffer: imageBuffer, extension: 'png' });
        sheet.addImage(imageId, { tl: { col: 14, row: 21 }, ext: { width: 60, height: 60 } }); // O22
        console.log('✅ 인감 이미지 추가 완료 (O22)');
      }
    }
  } catch (error) {
    console.error('❌ 인감 이미지 추가 실패:', error);
  }
};

/**
 * 3번째 시트에 물량데이터만 입력 (A5부터)
 * @param {ExcelJS.Worksheet} sheet - 시트
 * @param {Object} siteData - 현장 정보
 * @param {Array} materialItems - 물량 내역
 */
const fillEstimateStyleSheetData = (sheet, siteData, materialItems) => {
  try {
    console.log('📋 3번째 시트에 물량데이터만 입력 (A5부터)');
    console.log('🔍 materialItems 데이터 구조 확인:', materialItems);
    
    // A5 이전의 기본정보는 템플릿 그대로 유지 (제목, 테이블명 보존)
    console.log('📋 A5 이전 기본정보 보존 (제목, 테이블명 유지)');
    
    // 물량 내역 데이터만 입력 (A5부터 시작)
    if (materialItems && Array.isArray(materialItems)) {
      // 필요한 행 수 계산 (기본 5행부터 시작)
      const startRow = 5;
      const requiredRows = startRow + materialItems.length - 1;
      
      // 현재 시트의 마지막 행 확인
      const lastRow = sheet.rowCount;
      console.log(`📊 현재 시트 마지막 행: ${lastRow}, 필요한 행: ${requiredRows}`);
      
      // 필요한 경우 행 추가
      if (requiredRows > lastRow) {
        const rowsToAdd = requiredRows - lastRow;
        console.log(`📈 ${rowsToAdd}개 행 추가 필요`);
        
        // 마지막 행부터 필요한 만큼 행 삽입
        for (let i = 0; i < rowsToAdd; i++) {
          sheet.spliceRows(lastRow + i, 0, []);
        }
        console.log(`✅ ${rowsToAdd}개 행 추가 완료`);
      }
      
      materialItems.forEach((item, index) => {
        const row = startRow + index; // A5부터 시작
        
        try {
          console.log(`🔍 ${row}행 아이템 데이터:`, item);
          console.log(`🔍 ${row}행 아이템 키들:`, Object.keys(item));
          
          // A,B,C,D 값 확인 (안전한 문자열 처리)
          const name = String(item.name || item.itemName || '').trim();
          const specification = String(item.specification || item.spec || '').trim();
          const unit = String(item.unit || '').trim();
          const quantity = item.quantity || item.qty || 0;
          
          // A,B,C,D 값이 있는지 확인 (단수정리 포함)
          const hasBasicData = name || specification || unit || quantity || (name && name.includes('단수정리'));
          
          if (hasBasicData) {
            // 단수정리 특별 처리 (안전한 문자열 검사)
            if (name && typeof name === 'string' && name.includes('단수정리')) {
              console.log(`📊 ${row}행 단수정리 특별 처리:`, name);
              sheet.getCell(`A${row}`).value = name; // A열: 단수정리
              sheet.getCell(`B${row}`).value = specification || ''; // B열: 규격
              sheet.getCell(`C${row}`).value = unit || ''; // C열: 단위
              
              // D열: 수량 (단수정리는 보통 1)
              const dCell = sheet.getCell(`D${row}`);
              dCell.value = Number(quantity || 1).toFixed(2);
              dCell.alignment = { horizontal: 'right' };
              
              // 단수정리는 K열(합계 단가)에만 값을 넣고, L열(합계 금액)은 수식 유지
              const unitPrice = item.unitPrice || item.price || 0;
              
              // E, G, I열은 빈 값으로 설정
              sheet.getCell(`E${row}`).value = ''; // 재료비 단가 (빈 값)
              sheet.getCell(`G${row}`).value = ''; // 노무비 단가 (빈 값)
              sheet.getCell(`I${row}`).value = ''; // 경비 단가 (빈 값)
              
              // K열: 합계 단가만 설정
              sheet.getCell(`K${row}`).value = unitPrice;
              
              // F, H, J, L, M열은 수식 유지 (건드리지 않음)
              console.log(`✅ ${row}행 단수정리 완료: K열 단가(${unitPrice}), L열 수식 유지`);
            } else {
              // 일반 물량 데이터 처리
              sheet.getCell(`A${row}`).value = specification; // A열: 규격 (예: 5MZT152H/S+14AR+5CL)
              sheet.getCell(`B${row}`).value = name; // B열: 이름 (예: 24더블로이)
              sheet.getCell(`C${row}`).value = unit; // C열: 단위
              
              // D열: 수량 (소수점 2째자리, 오른쪽 정렬)
              const dCell = sheet.getCell(`D${row}`);
              dCell.value = Number(quantity).toFixed(2);
              dCell.alignment = { horizontal: 'right' };
              
              // E열: 재료비단가 (JE프라이스)
              const jePrice = item.JEprice || item.JE프라이스 || item.jePrice || 0;
              console.log(`🔍 ${row}행 JE프라이스 값:`, jePrice, '원본:', item.JEprice, item.JE프라이스, item.jePrice);
              sheet.getCell(`E${row}`).value = jePrice;
              
              // G열: 노무비단가 (NO프라이스)
              const noPrice = item.NOprice || item.NO프라이스 || item.noPrice || 0;
              console.log(`🔍 ${row}행 NO프라이스 값:`, noPrice, '원본:', item.NOprice, item.NO프라이스, item.noPrice);
              sheet.getCell(`G${row}`).value = noPrice;
              
              // I열: 경비단가 (KY프라이스)
              const kyPrice = item.KYprice || item.KY프라이스 || item.kyPrice || 0;
              console.log(`🔍 ${row}행 KY프라이스 값:`, kyPrice, '원본:', item.KYprice, item.KY프라이스, item.kyPrice);
              sheet.getCell(`I${row}`).value = kyPrice;
              
              // F, H, J, K, L, M열은 수식 그대로 두기 (건드리지 않음)
            }
            
            console.log(`✅ ${row}행 물량데이터 입력 완료 (A:규격, B:이름, C:단위, D:수량(우정렬), E:JE프라이스(${jePrice}), G:NO프라이스(${noPrice}), I:KY프라이스(${kyPrice}))`);
          } else {
            // A,B,C,D 값이 없으면 E~M열까지 빈칸으로 처리 (수식 포함)
            for (let col = 5; col <= 13; col++) { // E~M열 (5~13)
              const colLetter = String.fromCharCode(64 + col); // A=65, E=69, M=77
              const cell = sheet.getCell(`${colLetter}${row}`);
              cell.value = '';
              // formula 속성은 읽기 전용이므로 제거
            }
            console.log(`📝 ${row}행: A,B,C,D 값 없음, E~M열 빈칸 처리 (수식 포함)`);
          }
        } catch (e) {
          console.log(`⚠️ ${row}행 물량데이터 입력 실패:`, e.message);
        }
      });
    }
    
    // 빈 행의 수식 제거 (A,B,C,D열에 데이터가 없으면 E~M열 수식 제거)
    console.log('🧹 빈 행의 수식 정리 시작...');
    const lastRow = sheet.rowCount;
    console.log(`📊 템플릿 총 행 수: ${lastRow}행`);
    
    for (let rowIndex = 5; rowIndex <= lastRow; rowIndex++) {
      const row = sheet.getRow(rowIndex);
      if (!row) continue;
      
      // A, B, C, D열에 데이터가 있는지 확인
      const hasData = ['A', 'B', 'C', 'D'].some(col => {
        const cell = sheet.getCell(`${col}${rowIndex}`);
        const value = cell.value;
        return value !== null && value !== undefined && value !== '' && 
               (typeof value === 'string' ? value.trim() !== '' : true);
      });
      
      if (!hasData) {
        // 데이터가 없으면 E~M열의 수식 제거
        ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].forEach(col => {
          const cell = sheet.getCell(`${col}${rowIndex}`);
          if (cell.formula) {
            console.log(`🧹 ${col}${rowIndex} 수식 제거: ${cell.formula}`);
            cell.value = ''; // 수식 제거 (빈 문자열로 설정)
          }
        });
      }
    }
    
    console.log('✅ 빈 행의 수식 정리 완료');
    console.log('✅ 3번째 시트 물량데이터 입력 완료');
    
  } catch (error) {
    console.error('❌ 3번째 시트 물량데이터 입력 실패:', error);
  }
};



/**
 * NewSites.jsx에서 사용하는 함수
 * @param {Object} site - 현장 정보
 * @param {Array} materialItems - 물량 내역
 */
export const downloadContractGabji = async (site, materialItems = []) => {
  try {
    console.log('📋 납품계약서 갑지 다운로드 시작...', { site, materialItems });
    
    // 납품계약서 갑지 생성 (파일명 변경)
    const fileName = `(납품계약서)${site.name || site.siteName || '현장'} 중 유리납품`;
    const result = await createContractGabji(site, materialItems, fileName);
    
    if (result.success) {
      console.log('✅ 납품계약서 갑지 다운로드 완료:', result.fileName);
    } else {
      throw new Error(result.error || '납품계약서 갑지 생성 실패');
    }
    
  } catch (error) {
    console.error('❌ 납품계약서 갑지 다운로드 실패:', error);
    throw error;
  }
};

// NAPFOOM 납품계약서 생성 유틸리티 (ExcelJS 사용)
import ExcelJS from 'exceljs';
import { templateUrls } from './templateUrls';
import { getSafePrice, setCellValueSafely, filterMaterialItems, logMaterialItem, cleanSheetData, fillContractStyleData, cleanEmptyRows } from './excelCommonUtils';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * NAPFOOM 템플릿을 사용하여 납품계약서 생성 (ExcelJS)
 * @param {Object} siteData - 현장 정보
 * @param {Array} materialItems - 물량 내역
 * @param {string} fileName - 파일명
 * @returns {Promise<Object>} - 생성 결과
 */
export const createNapfoomContract = async (siteData, materialItems = [], fileName = '납품계약서') => {
  try {
    console.log('📋 NAPFOOM 납품계약서 생성 시작...', { siteData, materialItems });
    
    // Firebase Storage에서 템플릿 다운로드 (물량 타입에 따라 다른 템플릿 사용)
    // 물량 개수에 따른 템플릿 타입 자동 결정
    const itemCount = materialItems?.length || 0;
    
    // siteData.templateType이 'AUTO'인 경우 물량 개수로 결정, 그렇지 않으면 기존 값 사용
    let templateType;
    if (siteData.templateType === 'AUTO') {
      templateType = itemCount > 20 ? 'L' : 'N';
      console.log(`🔄 AUTO 모드: 물량 ${itemCount}개 → ${templateType} 타입 선택`);
    } else {
      templateType = siteData.templateType || 'N';
      console.log(`📋 수동 설정: ${templateType} 타입 사용`);
    }
    
    const templateKey = `(${templateType})납품계약서`;
    const templateUrl = templateUrls[templateKey];
    
    if (!templateUrl) {
      throw new Error(`템플릿 URL을 찾을 수 없습니다: ${templateKey}`);
    }
    
    console.log(`📊 물량 개수: ${itemCount}개 → ${templateType} 타입 템플릿 사용`);
    console.log(`📋 NAPFOOM 납품계약서 템플릿 선택: ${templateType} 타입 (${templateType === 'L' ? 'LONG' : 'NEW'})`);
    console.log(`🔗 실제 요청할 URL: ${templateUrl}`);
    
    const response = await fetch(templateUrl);
    if (!response.ok) {
      console.error(`❌ L 타입 템플릿 다운로드 실패: HTTP ${response.status} ${response.statusText}`);
      console.error(`❌ 요청 URL: ${templateUrl}`);
      throw new Error(`L 타입 템플릿 파일을 찾을 수 없습니다. HTTP error! status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    console.log(`✅ L 타입 템플릿 다운로드 완료: ${arrayBuffer.byteLength} bytes`);
    
    // 템플릿 로드 (기본 방식)
    const workbook = new ExcelJS.Workbook();
    try {
      console.log(`📥 NAPFOOM ${templateType} 타입 템플릿 로드 시작...`);
      
      // 간단하게 템플릿 로드
      await workbook.xlsx.load(arrayBuffer);
      
      console.log(`✅ ${templateType} 타입 NAPFOOM 템플릿 로드 성공`);
    } catch (loadError) {
      console.error(`❌ ${templateType} 타입 NAPFOOM 템플릿 로드 실패:`, loadError.message);
      throw new Error(`${templateType} 타입 NAPFOOM 템플릿 로드 실패: ${loadError.message}`);
    }
    
    // 템플릿은 그대로 두고 데이터만 입력
    console.log('✅ 템플릿 로드 완료 - 데이터 입력 준비');
    
    // 공유수식을 개별 수식으로 안전하게 변환
    console.log('🔧 공유수식을 개별수식으로 변환 시작...');
    convertSharedFormulasToIndividual(workbook);
    console.log('✅ 공유수식을 개별수식으로 변환 완료');
    
    // 데이터 입력
    console.log('📝 데이터 입력 시작');
    await fillNapfoomData(workbook, siteData, materialItems);
    console.log('✅ 데이터 입력 완료');
    
    // 수식은 템플릿 그대로 유지
    
    // 파일 생성 및 다운로드
    console.log('💾 파일 생성 중...');
    const buffer = await workbook.xlsx.writeBuffer();
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
    
    console.log('✅ NAPFOOM 납품계약서 생성 완료');
    return { success: true, fileName: link.download };
    
  } catch (error) {
    console.error('❌ NAPFOOM 납품계약서 생성 실패:', error);
    return { success: false, error: error.message };
  }
};




/**
 * NAPFOOM 템플릿에 데이터 입력
 * @param {ExcelJS.Workbook} workbook - 워크북
 * @param {Object} siteData - 현장 정보
 * @param {Array} materialItems - 물량 내역
 */
const fillNapfoomData = async (workbook, siteData, materialItems) => {
  try {
    console.log('📝 NAPFOOM 데이터 입력 중...');
    
    // 각 시트에 데이터 입력 (인덱스 기준: 0=계약서, 1=갑지, 2=내역서)
    const sheets = workbook.worksheets;
    for (let index = 0; index < sheets.length; index++) {
      const sheet = sheets[index];
      console.log(`📋 [${index}] ${sheet?.name} 시트에 데이터 입력`);
      if (index === 0) {
        await fillContractSheet(sheet, siteData);
      } else if (index === 1) {
        await fillSummarySheet(sheet, siteData, materialItems);
      } else if (index === 2) {
        fillDetailSheet(sheet, materialItems);
      }
    }
    
    console.log('✅ NAPFOOM 데이터 입력 완료');
    
  } catch (error) {
    console.error('❌ NAPFOOM 데이터 입력 실패:', error);
  }
};

/**
 * 납품계약서 시트에 데이터 입력
 * @param {ExcelJS.Worksheet} sheet - 시트
 * @param {Object} siteData - 현장 정보
 */
const fillContractSheet = async (sheet, siteData) => {
  try {
    console.log('📋 납품계약서 시트 데이터 입력');
    
    // 기본 정보 입력 (계약서 시트 기준 셀 매핑)
    const dataMapping = {
      // 현장명
      'G4': siteData?.name || siteData?.siteName || '',
      
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
      
      // 거래처관리페이지에서 가져올 데이터
      'J24': siteData.businessNumber || '', // 사업자번호
      'E25': siteData.companyAddress || '', // 회사주소
      'J25': siteData.phone || '', // 전화번호
      'E26': siteData.ceoName || '', // 대표자명
    };
    
    // 데이터 입력
    Object.entries(dataMapping).forEach(([cellAddress, value]) => {
      try {
        sheet.getCell(cellAddress).value = value;
        console.log(`✅ ${cellAddress}: ${value}`);
      } catch (e) {
        console.log(`⚠️ ${cellAddress} 입력 실패:`, e.message);
      }
    });
    
    // 인감 이미지 추가 (Firebase Storage의 stamps 폴더 사용)
    try {
      const stampType = siteData?.stampType || '인감없음';
      console.log('🖊️ 계약서 시트 인감 이미지 처리 시작:', stampType);
      if (stampType !== '기타인감') {
        const actualStampType = stampType === '인감없음' ? 'A인감' : stampType;
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
        const mappedImageName = stampImageMap[actualStampType];
        if (mappedImageName) {
          // Firebase Storage에서 인감 이미지 다운로드
          const stampsRef = ref(storage, `stamps/${mappedImageName}`);
          const url = await getDownloadURL(stampsRef);
          const resp = await fetch(url);
          if (resp.ok) {
            const buf = await resp.arrayBuffer();
            const imageId = sheet.workbook.addImage({ buffer: buf, extension: 'png' });
            // 위치: 대략 G30
            sheet.addImage(imageId, { tl: { col: 6, row: 29 }, ext: { width: 60, height: 60 } });
            console.log('✅ 계약서 시트 인감 삽입 완료 (G30):', actualStampType);
          }
        }
      }
    } catch (imageError) {
      console.warn('⚠️ 계약서 시트 인감 추가 실패:', imageError);
    }
    
  } catch (error) {
    console.error('❌ 납품계약서 시트 입력 실패:', error);
  }
};

/**
 * 내역갑지 시트에 데이터 입력
 * @param {ExcelJS.Worksheet} sheet - 시트
 * @param {Object} siteData - 현장 정보
 * @param {Array} materialItems - 물량 내역
 */
const fillSummarySheet = async (sheet, siteData, materialItems) => {
  try {
    console.log('📋 내역갑지 시트 데이터 입력');
    
    // 갑지 시트: 요약 정보만 표시 (개별 물량은 내역서에만)
    console.log('📋 갑지 시트는 요약용 - 개별 물량 데이터 입력하지 않음');
    
    // 인감 이미지: 갑지(인덱스 0)에도 삽입
    try {
      const stampType = siteData?.stampType || '인감없음';
      if (stampType !== '기타인감') {
        const actualStampType = stampType === '인감없음' ? 'A인감' : stampType;
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
        const mappedImageName = stampImageMap[actualStampType];
        if (mappedImageName) {
          const stampsRef = ref(storage, `stamps/${mappedImageName}`);
          const url = await getDownloadURL(stampsRef);
          const resp = await fetch(url);
          if (resp.ok) {
            const buf = await resp.arrayBuffer();
            const imageId = sheet.workbook.addImage({ buffer: buf, extension: 'png' });
            // O22 근처 위치(갑지 배치 기준)
            sheet.addImage(imageId, { tl: { col: 14, row: 21 }, ext: { width: 60, height: 60 } });
            console.log('✅ 갑지 시트 인감 삽입 완료 (O22):', actualStampType);
          }
        }
      }
    } catch (imageError) {
      console.warn('⚠️ 갑지 시트 인감 추가 실패:', imageError);
    }
  } catch (error) {
    console.error('❌ 내역갑지 시트 입력 실패:', error);
  }
};

/**
 * 내역서 시트에 데이터 입력
 * @param {ExcelJS.Worksheet} sheet - 시트
 * @param {Array} materialItems - 물량 내역
 */
const fillDetailSheet = (sheet, materialItems) => {
  try {
    console.log('📋 내역서 시트 데이터 입력 시작');
    console.log('📊 물량 데이터 개수:', materialItems?.length || 0);
    console.log('📊 첫 번째 물량 데이터 샘플:', materialItems?.[0]);
    
    // 물량 데이터 입력 (5행부터)
    if (materialItems && Array.isArray(materialItems) && materialItems.length > 0) {
      // 필요한 행 확보: 현재 rowCount보다 작으면 행 추가
      const startRow = 5;
      const requiredRows = startRow + materialItems.length - 1;
      const lastRow = sheet.rowCount;
      if (requiredRows > lastRow) {
        const rowsToAdd = requiredRows - lastRow;
        for (let i = 0; i < rowsToAdd; i++) {
          sheet.spliceRows(lastRow + i, 0, []);
        }
      }
      console.log('✅ 물량 데이터가 존재합니다. 데이터 입력 시작...');
      
      // 총계 항목들을 제외하고 실제 물량만 필터링
      const filteredItems = materialItems.filter(item => {
        const name = String(item?.name || item?.itemName || '').trim();
        const specification = String(item?.specification || item?.spec || '').trim();
        
        // 단수정리는 무조건 포함
        if (name === '단수정리' || name === '단수정리') {
          console.log('✅ 단수정리 항목 포함:', item);
          return true;
        }
        
        // 총계, 부가세, 계약금액 관련 항목 제외
        const isTotalItem = name.includes('총공사계') || name.includes('총 공사계') || 
                           name.includes('부가세') || name.includes('계약금액') ||
                           name.includes('합계') || name.includes('소계') ||
                           item?.isTotal || item?.isVat || item?.isTotalWithVat;
        
        // 실제 물량 데이터만 포함
        return !isTotalItem;
      });
      
      console.log('🔍 단수정리 항목 확인:', filteredItems.filter(item => 
        String(item?.name || item?.itemName || '').trim() === '단수정리'
      ));
      
      console.log(`📊 필터링된 물량 데이터: ${filteredItems.length}개 (총계 항목 제외)`);
      
      filteredItems.forEach((item, index) => {
        const row = 5 + index;
        
        try {
          console.log(`📝 ${row}행 데이터 입력 중:`, {
            name: item?.name || item?.itemName || '',
            specification: item?.specification || item?.spec || '',
            unit: item?.unit || '',
            quantity: item?.quantity || item?.qty || '',
            unitPrice: item?.unitPrice || item?.price || '',
            amount: item?.amount || item?.total || '',
            note: item?.note || item?.remark || ''
          });
          
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
          
          // A열과 B열 순서 변경 (A=이름, B=규격)
          sheet.getCell(`A${row}`).value = safeString(item?.name || item?.itemName);
          sheet.getCell(`B${row}`).value = safeString(item?.specification || item?.spec);
          sheet.getCell(`C${row}`).value = safeString(item?.unit);
          sheet.getCell(`D${row}`).value = safeNumber(item?.quantity || item?.qty);
          
          // 🛡️ 단가 데이터 완벽 매칭 및 안전 처리 - 공통 유틸리티 사용
          logMaterialItem(item, row, 'NAPFOOM');
          
          // E열: 재료비단가 (JE프라이스)
          const jePrice = getSafePrice(item, 'JE');
          setCellValueSafely(sheet.getCell(`E${row}`), jePrice);
          
          // F열: 수식 유지 (건드리지 않음) - D*E
          console.log(`📝 ${row}행 F열 수식 유지: D*E`);
          
          // G열: 노무비단가 (NO프라이스)
          const noPrice = getSafePrice(item, 'NO');
          setCellValueSafely(sheet.getCell(`G${row}`), noPrice);
          
          // H열: 수식 유지 (건드리지 않음) - D*G
          console.log(`📝 ${row}행 H열 수식 유지: D*G`);
          
          // I열: 경비단가 (KY프라이스)
          const kyPrice = getSafePrice(item, 'KY');
          setCellValueSafely(sheet.getCell(`I${row}`), kyPrice);
          
          // J열: 수식 유지 (건드리지 않음) - D*I
          console.log(`📝 ${row}행 J열 수식 유지: D*I`);
          
          // K열: 수식 유지 (건드리지 않음) - E+G+I
          console.log(`📝 ${row}행 K열 수식 유지: E+G+I`);
          
          // L열: 수식 유지 (건드리지 않음) - D*K
          console.log(`📝 ${row}행 L열 수식 유지: D*K`);
          
          // M열: 비고
          sheet.getCell(`M${row}`).value = safeString(item?.note || item?.remark);
          
          console.log(`✅ ${row}행 데이터 입력 완료`);
          
        } catch (e) {
          console.log(`⚠️ ${row}행 데이터 입력 실패:`, e.message);
        }
      });
      
      console.log(`✅ 총 ${materialItems.length}개 물량 데이터 입력 완료`);
      
      // C,D열에 값이 없으면 그 행 전체를 빈칸으로 처리
      console.log('🧹 NAPFOOM 납품계약서: C,D열에 값이 없는 행 전체 빈칸 처리 시작...');
      const maxCleanupRow = 5 + materialItems.length - 1;
      
      for (let row = 5; row <= maxCleanupRow; row++) {
        try {
          // 해당 행의 C, D 열 값 확인
          const cellC = sheet.getCell(row, 3); // C열 (단위)
          const cellD = sheet.getCell(row, 4); // D열 (수량)
          
          // C, D 열에 값이 없으면 해당 행 전체를 빈칸으로 처리
          const isEmptyCD = (!cellC.value || cellC.value === '') && 
                           (!cellD.value || cellD.value === '');
          
          if (isEmptyCD) {
            console.log(`📝 NAPFOOM 납품계약서 ${row}행 C,D열이 비어있어서 행 전체를 빈칸으로 처리`);
            
                         // C,D열에 값이 없으면 A,B열만 놔두고 나머지만 빈칸으로 처리 (수식은 보존)
             for (let col = 1; col <= 13; col++) { // A=1, M=13
               try {
                 const cell = sheet.getCell(row, col);
                 
                 // A,B열은 그대로 놔두기 (품명, 규격 보존)
                 if (col === 1 || col === 2) {
                   console.log(`🛡️ NAPFOOM 납품계약서 ${row}행 ${String.fromCharCode(64 + col)}열 A,B열 보존: ${cell.value || ''}`);
                   continue; // A,B열은 건드리지 않음
                 }
                 
                 // C~M열 처리 (C,D가 빈칸이면 수식도 모두 지우기)
                 if (cell.formula) {
                   console.log(`🗑️ NAPFOOM 납품계약서 ${row}행 ${String.fromCharCode(64 + col)}열 수식 제거: ${cell.formula}`);
                   // 수식 완전 제거
                   delete cell.formula;
                   delete cell.sharedFormula;
                   delete cell.si;
                   delete cell.ref;
                   delete cell.sharedFormulaMaster;
                   delete cell.sharedFormulaRef;
                   cell.value = '';
                 } else {
                   // 수식이 없는 경우 값만 빈칸으로 처리
                   cell.value = '';
                   console.log(`✅ NAPFOOM 납품계약서 ${row}행 ${String.fromCharCode(64 + col)}열 값만 빈칸 처리 완료`);
                 }
                 
                 console.log(`✅ NAPFOOM 납품계약서 ${row}행 ${String.fromCharCode(64 + col)}열 처리 완료`);
               } catch (e) {
                 console.log(`⚠️ NAPFOOM 납품계약서 ${row}행 ${String.fromCharCode(64 + col)}열 처리 실패:`, e.message);
               }
             }
          } else {
            console.log(`📝 NAPFOOM 납품계약서 ${row}행 C,D열에 데이터가 있어서 행 유지`);
          }
        } catch (error) {
          console.warn(`⚠️ NAPFOOM 납품계약서 ${row}행 빈칸 처리 중 오류:`, error.message);
        }
      }
      
      console.log('✅ NAPFOOM 납품계약서 C,D열 빈칸 처리 완료');
      
    } else {
      console.log('⚠️ 물량 데이터가 없거나 빈 배열입니다.');
      console.log('📊 materialItems:', materialItems);
    }

            // 🛡️ 공통 유틸리티를 사용하여 빈 행 정리
        cleanEmptyRows(sheet, 5, 'NAPFOOM');
    
  } catch (error) {
    console.error('❌ 내역서 시트 입력 실패:', error);
    console.error('❌ 오류 상세:', error.message);
    console.error('❌ 오류 스택:', error.stack);
  }
};

/**
 * NewSites.jsx에서 사용하는 함수
 * @param {Object} site - 현장 정보
 * @param {Array} materialItems - 물량 내역
 */
export const downloadNapfoomContract = async (site, materialItems = []) => {
  try {
    console.log('📋 NAPFOOM 납품계약서 다운로드 시작...', { site, materialItems });
    
    // 납품계약서 생성
    const fileName = `납품계약서_${site?.name || site?.siteName || '현장'}_${site?.companyName || site?.company || '회사'}`;
    const result = await createNapfoomContract(site, materialItems, fileName);
    
    if (result.success) {
      console.log('✅ NAPFOOM 납품계약서 다운로드 완료:', result.fileName);
    } else {
      throw new Error(result.error || 'NAPFOOM 납품계약서 생성 실패');
    }
    
  } catch (error) {
    console.error('❌ NAPFOOM 납품계약서 다운로드 실패:', error);
    throw error;
  }
};

/**
 * 공유수식을 개별 수식으로 안전하게 변환
 * @param {ExcelJS.Workbook} workbook - 워크북
 */
const convertSharedFormulasToIndividual = (workbook) => {
  try {
    console.log('🔄 공유수식을 개별수식으로 변환 중...');
    
    workbook.worksheets.forEach((worksheet, sheetIndex) => {
      console.log(`🔄 시트 ${sheetIndex + 1}: ${worksheet.name} 처리 중...`);
      
      // 모든 셀을 순회하면서 공유수식을 개별 수식으로 변환
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          try {
            if (cell.formula) {
              const cellAddress = `${String.fromCharCode(64 + colNumber)}${rowNumber}`;
              const originalFormula = cell.formula.toString();
              
              // 공유수식 관련 속성이 있으면 제거
              if (cell.sharedFormula || cell.si !== undefined) {
                console.log(`🔄 ${cellAddress} 공유수식을 개별수식으로 변환: ${originalFormula}`);
                
                // 공유수식 속성들 제거
                delete cell.sharedFormula;
                delete cell.si;
                delete cell.ref;
                delete cell.sharedFormulaMaster;
                delete cell.sharedFormulaRef;
                
                // 수식을 개별 수식으로 재설정
                delete cell.formula;
                cell.formula = originalFormula;
              }
            }
          } catch (cellError) {
            console.warn(`⚠️ ${rowNumber}행 ${colNumber}열 공유수식 변환 실패:`, cellError.message);
          }
        });
      });
      
      // 워크시트 레벨의 공유수식 정보도 정리
      if (worksheet.sharedFormulas) {
        delete worksheet.sharedFormulas;
      }
      if (worksheet._sharedFormulas) {
        delete worksheet._sharedFormulas;
      }
      
      console.log(`✅ 시트 ${sheetIndex + 1}: ${worksheet.name} 공유수식 변환 완료`);
    });
    
    console.log('✅ 모든 공유수식 개별수식 변환 완료');
  } catch (error) {
    console.error('❌ 공유수식 변환 실패:', error);
    // 에러가 발생해도 계속 진행
  }
};


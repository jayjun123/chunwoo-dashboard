// 기성금청구서 생성 유틸리티 (ExcelJS 사용)
import ExcelJS from 'exceljs';
import { templateUrls } from './templateUrls';
import { getSafePrice, setCellValueSafely, filterMaterialItems, logMaterialItem, cleanSheetData, fillContractStyleData, cleanEmptyRows } from './excelCommonUtils';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * 기성금청구서 템플릿을 사용하여 기성금청구서 생성 (ExcelJS)
 * @param {Object} siteData - 현장 정보
 * @param {Array} materialItems - 물량 내역
 * @param {string} fileName - 파일명
 * @returns {Promise<Object>} - 생성 결과
 */
export const createGisung = async (siteData, materialItems = [], fileName = '기성금청구서') => {
  try {
    console.log('📋 기성금청구서 생성 시작...', { siteData, materialItems: materialItems.length });
    
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
    
    const templateKey = `(${templateType})기성금청구서`;
    const templateUrl = templateUrls[templateKey];
    
    if (!templateUrl) {
      throw new Error(`템플릿 URL을 찾을 수 없습니다: ${templateKey}`);
    }
    
    console.log(`📊 물량 개수: ${itemCount}개 → ${templateType} 타입 템플릿 사용`);
    console.log(`🔗 템플릿 URL: ${templateUrl}`);
    
    // 템플릿 다운로드
    const response = await fetch(templateUrl);
    if (!response.ok) {
      throw new Error(`템플릿 파일을 찾을 수 없습니다. HTTP error! status: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log(`✅ 템플릿 다운로드 완료: ${templateKey} (${arrayBuffer.byteLength} bytes)`);
    
    // 워크북 로드
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer, {
      sharedFormula: false,
      ignoreNodes: ['sharedFormula', 'extLst', 'calcChain', 'pivotCacheDefinition', 'pivotCacheRecords', 'volatileDependencies'],
      ignoreStyles: false,
      ignoreDataValidations: false,
      ignoreConditionalFormats: false,
      ignoreHyperlinks: true,
      ignoreComments: true,
      ignoreDrawings: true,
      ignoreFormulas: false,
      ignoreMergedCells: false,
      ignoreProtectedRanges: false
    });
    
    console.log('✅ 템플릿 로드 완료');
    
    // 기성금청구서 시트 찾기
    let gisungSheet = null;
    try {
      gisungSheet = workbook.getWorksheet('기성금') || workbook.getWorksheet('청구서') || workbook.getWorksheet(1);
    } catch (sheetError) {
      console.warn('시트 검색 실패:', sheetError.message);
    }
    
    if (!gisungSheet && workbook.worksheets && workbook.worksheets.length > 0) {
      gisungSheet = workbook.worksheets[0];
    }
    
    if (!gisungSheet) {
      throw new Error('기성금청구서 시트를 찾을 수 없습니다.');
    }
    
    // 기성금청구서 데이터 입력
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // 기본 정보 입력 (안전한 값 변환)
    const safeString = (value) => {
      if (value === null || value === undefined) return '';
      return String(value);
    };
    
    // 기성금청구서 기본 정보 입력 (템플릿 구조에 맞게)
    // A2: 공사명 (현장명 포함)
    const projectName = `${siteData?.name || '현장명'} 중 유리공사`;
    gisungSheet.getCell('A2').value = safeString(projectName);
    
    // 선급금 정보 입력 (H16 셀에 선급금 입력)
    const advanceAmount = Number(siteData?.advance || 0);
    gisungSheet.getCell('H16').value = advanceAmount;
    console.log(`💰 기성금청구서 H16에 선급금 입력: ${advanceAmount}`);
    
    console.log('✅ 기성금청구서 기본 정보 입력 완료:', {
      projectName: projectName,
      companyName: siteData?.companyName || siteData?.company || '대마팀',
      advanceAmount: advanceAmount
    });
    
    // 물량 데이터 입력 (기성금청구서 형식)
    if (materialItems && materialItems.length > 0) {
      console.log(`📊 기성금청구서 물량 데이터 입력 시작: ${materialItems.length}개 항목`);
      
      // 물량 항목 필터링 (총계, 부가세, 단수정리 제외)
      const filteredItems = filterMaterialItems(materialItems).filter(item => 
        item?.name !== '단수정리' && item?.name !== '단수정리항목'
      );
      console.log(`📊 필터링된 물량 항목: ${filteredItems.length}개 (단수정리 제외)`);
      
      // 단수정리 항목 별도 추출
      const dansooItem = materialItems.find(item => 
        item?.name === '단수정리' || item?.name === '단수정리항목'
      );
      if (dansooItem) {
        console.log('🔧 단수정리 항목 발견:', dansooItem);
      }
      
      // 기성금청구서 데이터 입력 (5행부터 시작)
      const startRow = 5;
      
      filteredItems.forEach((item, index) => {
        try {
          logMaterialItem(item, index);
          
          const rowNumber = startRow + index;
          
          // 기성금청구서 형식에 맞게 데이터 입력
          // A열: 품명, B열: 규격, C열: 단위, D열: 수량, E열: 단가
          setCellValueSafely(gisungSheet, `A${rowNumber}`, safeString(item.name || ''));
          setCellValueSafely(gisungSheet, `B${rowNumber}`, safeString(item.specification || ''));
          setCellValueSafely(gisungSheet, `C${rowNumber}`, safeString(item.unit || ''));
          setCellValueSafely(gisungSheet, `D${rowNumber}`, getSafePrice(item.quantity || 0));
          
          // E열: 단가 (unitPrice 또는 price 사용)
          let unitPrice = getSafePrice(item.unitPrice || item.price || 0);
          
          // 단수정리 항목 특별 처리
          if (item?.name === '단수정리') {
            console.log(`🔧 기성금청구서 단수정리 특별 처리 (${rowNumber}행)`);
            unitPrice = getSafePrice(item.unitPrice || item.JEprice || item.price || 0);
            console.log(`📊 단수정리 단가: ${unitPrice} (unitPrice: ${item.unitPrice}, JEprice: ${item.JEprice}, price: ${item.price})`);
          } else {
            // 일반 항목의 경우 unitPrice가 0이면 다른 가격 필드들 확인
            if (unitPrice === 0) {
              // JEprice + NOprice + KYprice로 합계 단가 계산
              const jePrice = getSafePrice(item.JEprice || 0);
              const noPrice = getSafePrice(item.NOprice || 0);
              const kyPrice = getSafePrice(item.KYprice || 0);
              unitPrice = jePrice + noPrice + kyPrice;
              console.log(`🔧 단가 계산: JE(${jePrice}) + NO(${noPrice}) + KY(${kyPrice}) = ${unitPrice}`);
            }
          }
          
          setCellValueSafely(gisungSheet, `E${rowNumber}`, unitPrice);
          
          console.log(`✅ 기성금청구서 ${rowNumber}행 입력 완료:`, {
            name: item.name,
            specification: item.specification,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: unitPrice
          });
          
        } catch (itemError) {
          console.error(`❌ 기성금청구서 물량 항목 ${index} 입력 실패:`, itemError);
        }
      });
      
      console.log(`✅ 기성금청구서 물량 데이터 입력 완료: ${filteredItems.length}개 항목`);
      
      // 단수정리 항목은 이미 일반 물량 데이터와 함께 처리되었으므로 별도 처리하지 않음
      console.log('📋 단수정리 항목은 일반 물량 데이터와 함께 처리됨');
    }
    
    // 빈 행 정리
    cleanEmptyRows(gisungSheet);
    
    // 워크시트 정리
    cleanSheetData(gisungSheet);
    
    console.log('✅ 기성금청구서 데이터 입력 완료');
    
    // Excel 파일 생성
    const buffer = await workbook.xlsx.writeBuffer();
    console.log('📄 Excel 버퍼 생성 완료, 크기:', buffer.byteLength);
    
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
    
    console.log('✅ 기성금청구서 생성 완료');
    return { success: true, fileName: link.download };
    
  } catch (error) {
    console.error('❌ 기성금청구서 생성 실패:', error);
    return { success: false, error: error.message };
  }
};

/**
 * NewSites.jsx에서 사용하는 함수
 * @param {Object} site - 현장 정보
 * @param {Array} materialItems - 물량 내역
 */
export const downloadGisung = async (site, materialItems = []) => {
  try {
    console.log('📋 기성금청구서 다운로드 시작...', { site, materialItems });
    
    // 기성금청구서 생성
    const fileName = `기성금청구서_${site?.name || site?.siteName || '현장'}_${site?.companyName || site?.company || '회사'}`;
    const result = await createGisung(site, materialItems, fileName);
    
    if (result.success) {
      console.log('✅ 기성금청구서 다운로드 완료:', result.fileName);
    } else {
      throw new Error(result.error || '기성금청구서 생성 실패');
    }
    
  } catch (error) {
    console.error('❌ 기성금청구서 다운로드 실패:', error);
    throw error;
  }
};

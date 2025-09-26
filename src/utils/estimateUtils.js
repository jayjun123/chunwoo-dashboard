// 견적서 생성 유틸리티 (ExcelJS 사용)
import ExcelJS from 'exceljs';
import { templateUrls } from './templateUrls';
import { getSafePrice, setCellValueSafely, filterMaterialItems, logMaterialItem, cleanSheetData, fillContractStyleData, cleanEmptyRows } from './excelCommonUtils';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * 견적서 템플릿을 사용하여 견적서 생성 (ExcelJS)
 * @param {Object} siteData - 현장 정보
 * @param {Array} materialItems - 물량 내역
 * @param {string} fileName - 파일명
 * @returns {Promise<Object>} - 생성 결과
 */
export const createEstimate = async (siteData, materialItems = [], fileName = '견적서') => {
  try {
    console.log('📋 견적서 생성 시작...', { siteData, materialItems: materialItems.length });
    
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
    
    const templateKey = `(${templateType})견적서`;
    const templateUrl = templateUrls[templateKey];
    
    if (!templateUrl) {
      throw new Error(`템플릿 URL을 찾을 수 없습니다: ${templateKey}`);
    }
    
    console.log(`📊 물량 개수: ${itemCount}개 → ${templateType} 타입 템플릿 사용`);
    console.log(`🔗 템플릿 URL: ${templateUrl}`);
    
    // 템플릿 다운로드 (Firebase Storage SDK 사용)
    let arrayBuffer;
    try {
      // Firebase Storage SDK를 사용한 다운로드
      const { getStorage, ref, getDownloadURL } = await import('firebase/storage');
      const { storage } = await import('../firebase');
      
      const storageRef = ref(storage, `templates/${templateType === 'L' ? 'Lgyunjuk' : 'Ngyunjuk'}.xlsx`);
      const downloadURL = await getDownloadURL(storageRef);
      
      console.log(`🔗 Firebase Storage 다운로드 URL: ${downloadURL}`);
      
      const response = await fetch(downloadURL);
      if (!response.ok) {
        throw new Error(`템플릿 파일을 찾을 수 없습니다. HTTP error! status: ${response.status}`);
      }
      
      arrayBuffer = await response.arrayBuffer();
      console.log(`✅ 템플릿 다운로드 완료: ${templateKey} (${arrayBuffer.byteLength} bytes)`);
      
    } catch (storageError) {
      console.warn('⚠️ Firebase Storage 다운로드 실패, 직접 URL 시도:', storageError);
      
      // 폴백: 직접 URL 사용
      const response = await fetch(templateUrl);
      if (!response.ok) {
        throw new Error(`템플릿 파일을 찾을 수 없습니다. HTTP error! status: ${response.status}`);
      }
      
      arrayBuffer = await response.arrayBuffer();
      console.log(`✅ 템플릿 다운로드 완료 (폴백): ${templateKey} (${arrayBuffer.byteLength} bytes)`);
    }
    
    // 워크북 로드 (옵션 없이 순수하게 로드)
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    console.log('✅ 템플릿 로드 완료');
    
    // 견적서 시트들 찾기
    let estimateSheet = null;
    let detailSheet = null;
    
    try {
      // 첫 번째 시트 (갑지)
      estimateSheet = workbook.getWorksheet('견적') || workbook.getWorksheet(1) || workbook.worksheets[0];
      
      // 두 번째 시트 (내역서)
      detailSheet = workbook.getWorksheet('내역서') || workbook.getWorksheet(2) || workbook.worksheets[1];
      
      console.log('📋 견적서 시트 찾기 결과:', {
        estimateSheet: estimateSheet ? estimateSheet.name : '없음',
        detailSheet: detailSheet ? detailSheet.name : '없음',
        totalSheets: workbook.worksheets.length
      });
    } catch (sheetError) {
      console.warn('시트 검색 실패:', sheetError.message);
    }
    
    if (!estimateSheet) {
      throw new Error('견적서 시트를 찾을 수 없습니다.');
    }
    
    // 견적서 데이터 입력
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // 기본 정보 입력 (안전한 값 변환)
    const safeString = (value) => {
      if (value === null || value === undefined) return '';
      return String(value);
    };
    
    // 견적서 기본 정보 입력
    estimateSheet.getCell('B3').value = safeString(currentYear);
    estimateSheet.getCell('D3').value = safeString(currentMonth);
    estimateSheet.getCell('B11').value = safeString(siteData?.companyName || siteData?.company || '대마팀');
    estimateSheet.getCell('H16').value = safeString(siteData?.name);
    
    // 물량 데이터 입력
    if (materialItems && materialItems.length > 0) {
      console.log(`📊 견적서 물량 데이터 입력 시작: ${materialItems.length}개 항목`);
      
      // 물량 항목 필터링 (총계, 부가세 제외) + 빈 항목 제거
      const filteredItems = filterMaterialItems(materialItems).filter(item => {
        // 추가 필터링: name이 있고 비어있지 않은 항목만
        const name = String(item?.name || '').trim();
        const hasValidName = name && name !== '' && name !== 'undefined' && name !== 'null';
        
        if (!hasValidName) {
          console.log(`❌ 빈 항목 제외:`, item);
          return false;
        }
        
        console.log(`✅ 유효한 항목:`, name);
        return true;
      });
      console.log(`📊 최종 필터링된 물량 항목: ${filteredItems.length}개`);
      
      // 첫 번째 시트 (갑지)에 기본 정보만 입력
      // (갑지는 기본 정보만 있고 물량 상세는 내역서에 있음)
      
      // 두 번째 시트 (내역서)에 물량 데이터 입력
      if (detailSheet) {
        console.log('📋 내역서 시트에 물량 데이터 입력 시작');
        
        // 내역서 데이터 입력 (5행부터 시작)
        const startRow = 5;
        
        filteredItems.forEach((item, index) => {
          try {
            logMaterialItem(item, index);
            
            const rowNumber = startRow + index;
            
            // 견적서 내역서 형식에 맞게 데이터 입력 (직접 입력 방식)
            // A열: 품명, B열: 규격, C열: 단위, D열: 수량, E열: 재료비 단가, F열: 재료비 금액
            // G열: 노무비 단가, H열: 노무비 금액, I열: 경비 단가, J열: 경비 금액
            // K열: 합계 단가, L열: 합계 금액, M열: 비고
            detailSheet.getCell(`A${rowNumber}`).value = safeString(item.name || '');
            detailSheet.getCell(`B${rowNumber}`).value = safeString(item.specification || '');
            detailSheet.getCell(`C${rowNumber}`).value = safeString(item.unit || '');
            detailSheet.getCell(`D${rowNumber}`).value = Number(item.quantity || 0);
            detailSheet.getCell(`E${rowNumber}`).value = Number(item.JEprice || 0); // 재료비 단가
            detailSheet.getCell(`G${rowNumber}`).value = Number(item.NOprice || 0); // 노무비 단가
            detailSheet.getCell(`I${rowNumber}`).value = Number(item.KYprice || 0); // 경비 단가
            detailSheet.getCell(`M${rowNumber}`).value = safeString(item.note || ''); // 비고
            
            // F, H, J, K, L열은 템플릿의 수식 그대로 유지 (건드리지 않음)
            
            console.log(`✅ 견적서 내역서 ${rowNumber}행 입력 완료 (수식 포함):`, {
              name: item.name,
              specification: item.specification,
              unit: item.unit,
              quantity: item.quantity,
              JEprice: item.JEprice,
              NOprice: item.NOprice,
              KYprice: item.KYprice,
              formulas: {
                F: `D${rowNumber}*E${rowNumber}`,
                H: `D${rowNumber}*G${rowNumber}`,
                J: `D${rowNumber}*I${rowNumber}`,
                K: `E${rowNumber}+G${rowNumber}+I${rowNumber}`,
                L: `D${rowNumber}*K${rowNumber}`
              }
            });
            
          } catch (itemError) {
            console.error(`❌ 견적서 내역서 물량 항목 ${index} 입력 실패:`, itemError);
          }
        });
        
        console.log(`✅ 견적서 내역서 물량 데이터 입력 완료: ${filteredItems.length}개 항목`);
      } else {
        console.warn('⚠️ 내역서 시트를 찾을 수 없어서 물량 데이터를 입력할 수 없습니다.');
      }
    }
    
    // 템플릿 수식 보존을 위해 정리 함수들 제거
    // cleanEmptyRows(estimateSheet);
    // cleanSheetData(estimateSheet);
    
    console.log('✅ 견적서 데이터 입력 완료');
    
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
    
    console.log('✅ 견적서 생성 완료');
    return { success: true, fileName: link.download };
    
  } catch (error) {
    console.error('❌ 견적서 생성 실패:', error);
    return { success: false, error: error.message };
  }
};

/**
 * NewSites.jsx에서 사용하는 함수
 * @param {Object} site - 현장 정보
 * @param {Array} materialItems - 물량 내역
 */
export const downloadEstimate = async (site, materialItems = []) => {
  try {
    console.log('📋 견적서 다운로드 시작...', { site, materialItems });
    
    // 견적서 생성
    const fileName = `(견적서)${site?.name || site?.siteName || '현장'} 중 유리공사`;
    const result = await createEstimate(site, materialItems, fileName);
    
    if (result.success) {
      console.log('✅ 견적서 다운로드 완료:', result.fileName);
    } else {
      throw new Error(result.error || '견적서 생성 실패');
    }
    
  } catch (error) {
    console.error('❌ 견적서 다운로드 실패:', error);
    throw error;
  }
};

// NAPFOOM 납품계약서 생성 유틸리티 (ExcelJS 사용)
import ExcelJS from 'exceljs';

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
    
    // Firebase Storage에서 템플릿 다운로드
    const templateUrl = 'https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2Fnapfoom.xlsx?alt=media&token=39b3fa34-9876-4ab1-8d78-f91ede7593ac';
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
    console.log('✅ NAPFOOM 템플릿 로드 완료');
    
    // 공유수식 완전 제거
    removeAllSharedFormulas(workbook);
    console.log('✅ 공유수식 제거 완료');
    
    // 데이터 입력
    await fillNapfoomData(workbook, siteData, materialItems);
    
    // 파일 생성 및 다운로드
    console.log('💾 파일 생성 중...');
    const buffer = await workbook.xlsx.writeBuffer({
      ignoreFormulaErrors: true,
      ignoreSharedFormulas: true,
      ignoreNodes: ['shared-formula', 'shared-formula-ref', 'shared-formula-master', 'formula']
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
    
    console.log('✅ NAPFOOM 납품계약서 생성 완료');
    return { success: true, fileName: link.download };
    
  } catch (error) {
    console.error('❌ NAPFOOM 납품계약서 생성 실패:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 모든 공유수식 제거
 * @param {ExcelJS.Workbook} workbook - 워크북
 */
const removeAllSharedFormulas = (workbook) => {
  try {
    console.log('🧹 공유수식 제거 중...');
    
    workbook.worksheets.forEach(worksheet => {
      // 모든 셀을 순회하면서 공유수식 제거
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          try {
            // 모든 수식을 제거 (공유수식 문제 완전 해결)
            if (cell.formula) {
              const formula = cell.formula.toString();
              const cellAddress = cell.address;
              
              // 내역서 시트의 모든 수식 제거
              if (worksheet.name === '내역서') {
                console.log(`🧹 수식 제거: ${cellAddress} - ${formula}`);
                // formula 속성 대신 value를 설정하여 수식 제거
                const currentValue = cell.value;
                cell.value = currentValue; // 현재 값을 다시 설정하여 수식 제거
              }
              
              // 다른 시트에서도 문제가 될 수 있는 수식들 제거
              if (formula.includes('F8') || formula.includes('H8') || formula.includes('F13') || 
                  formula.includes('F9') || formula.includes('F10') || formula.includes('F11') || formula.includes('F12') ||
                  formula.includes('H9') || formula.includes('H10') || formula.includes('H11') || formula.includes('H12')) {
                console.log(`🧹 문제수식 제거: ${cellAddress} - ${formula}`);
                const currentValue = cell.value;
                cell.value = currentValue; // 현재 값을 다시 설정하여 수식 제거
              }
            }
          } catch (e) {
            console.log(`⚠️ 셀 ${cell.address} 처리 실패:`, e.message);
          }
        });
      });
    });
    
    console.log('✅ 공유수식 제거 완료');
    
  } catch (error) {
    console.error('❌ 공유수식 제거 실패:', error);
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
    
    // 각 시트에 데이터 입력
    const sheets = workbook.worksheets;
    sheets.forEach(sheet => {
      console.log(`📋 ${sheet.name} 시트에 데이터 입력`);
      
      // 첫 번째 시트: 납품계약서
      if (sheet.name.includes('납품계약서') || sheet.name.includes('계약서')) {
        fillContractSheet(sheet, siteData);
      }
      
      // 두 번째 시트: 내역갑지
      if (sheet.name.includes('내역갑지') || sheet.name.includes('갑지')) {
        fillSummarySheet(sheet, siteData, materialItems);
      }
      
      // 세 번째 시트: 내역서
      if (sheet.name.includes('내역서')) {
        fillDetailSheet(sheet, materialItems);
      }
    });
    
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
const fillContractSheet = (sheet, siteData) => {
  try {
    console.log('📋 납품계약서 시트 데이터 입력');
    
    // 기본 정보 입력 (셀 위치는 템플릿에 따라 조정 필요)
    const dataMapping = {
      // 공사명 (현장명)
      'D29': siteData.name || siteData.siteName || '',
      'E29': siteData.name || siteData.siteName || '',
      'F29': siteData.name || siteData.siteName || '',
      
      // 회사명
      'D30': siteData.companyName || siteData.company || '',
      'E30': siteData.companyName || siteData.company || '',
      'F30': siteData.companyName || siteData.company || '',
      
      // 계약금액
      'D31': siteData.contractAmount || '',
      'E31': siteData.contractAmount || '',
      'F31': siteData.contractAmount || '',
      
      // 착공일
      'D32': siteData.startDate || '',
      'E32': siteData.startDate || '',
      'F32': siteData.startDate || '',
      
      // 현장주소
      'D33': siteData.address || '',
      'E33': siteData.address || '',
      'F33': siteData.address || '',
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
const fillSummarySheet = (sheet, siteData, materialItems) => {
  try {
    console.log('📋 내역갑지 시트 데이터 입력');
    
    // 기본 정보 입력
    const dataMapping = {
      // 공사명
      'D29': siteData.name || siteData.siteName || '',
      'E29': siteData.name || siteData.siteName || '',
      'F29': siteData.name || siteData.siteName || '',
      
      // 회사명
      'D30': siteData.companyName || siteData.company || '',
      'E30': siteData.companyName || siteData.company || '',
      'F30': siteData.companyName || siteData.company || '',
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
    
    // 물량 데이터 입력 (5행부터)
    if (materialItems && Array.isArray(materialItems)) {
      materialItems.forEach((item, index) => {
        const row = 5 + index;
        
        try {
          sheet.getCell(`A${row}`).value = item.name || item.itemName || '';
          sheet.getCell(`B${row}`).value = item.specification || item.spec || '';
          sheet.getCell(`C${row}`).value = item.unit || '';
          sheet.getCell(`D${row}`).value = item.quantity || item.qty || '';
          sheet.getCell(`E${row}`).value = item.unitPrice || item.price || '';
          sheet.getCell(`F${row}`).value = item.amount || item.total || '';
          sheet.getCell(`M${row}`).value = item.note || item.remark || '';
          
          console.log(`✅ ${row}행 데이터 입력 완료`);
        } catch (e) {
          console.log(`⚠️ ${row}행 데이터 입력 실패:`, e.message);
        }
      });
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
    console.log('📋 내역서 시트 데이터 입력');
    
    // 물량 데이터 입력 (5행부터)
    if (materialItems && Array.isArray(materialItems)) {
      materialItems.forEach((item, index) => {
        const row = 5 + index;
        
        try {
          sheet.getCell(`A${row}`).value = item.name || item.itemName || '';
          sheet.getCell(`B${row}`).value = item.specification || item.spec || '';
          sheet.getCell(`C${row}`).value = item.unit || '';
          sheet.getCell(`D${row}`).value = item.quantity || item.qty || '';
          sheet.getCell(`E${row}`).value = item.unitPrice || item.price || '';
          sheet.getCell(`F${row}`).value = item.amount || item.total || '';
          sheet.getCell(`M${row}`).value = item.note || item.remark || '';
          
          console.log(`✅ ${row}행 데이터 입력 완료`);
        } catch (e) {
          console.log(`⚠️ ${row}행 데이터 입력 실패:`, e.message);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ 내역서 시트 입력 실패:', error);
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
    const fileName = `납품계약서_${site.name || site.siteName || '현장'}_${site.companyName || site.company || '회사'}`;
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

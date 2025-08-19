// 공유수식 오류 디버깅 스크립트
import ExcelJS from 'exceljs';

const debugSharedFormula = async () => {
  try {
    console.log('🔍 공유수식 오류 디버깅 시작...');
    
    // Firebase Storage에서 템플릿 다운로드
    const templateUrl = 'https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2Fnapfoom.xlsx?alt=media&token=d79526c2-a304-4d40-ace5-0c64a621c136';
    const response = await fetch(templateUrl);
    const arrayBuffer = await response.arrayBuffer();
    
    console.log('📦 템플릿 다운로드 완료, 크기:', arrayBuffer.byteLength);
    
    // 1단계: 템플릿 로드 시도
    console.log('\n1️⃣ 템플릿 로드 시도...');
    const workbook = new ExcelJS.Workbook();
    
    try {
      await workbook.xlsx.load(arrayBuffer, {
        ignoreNodes: ['shared-formula', 'shared-formula-ref', 'shared-formula-master', 'formula'],
        ignoreFormulas: true,
        ignoreFormulaErrors: true,
        ignoreSharedFormulas: true
      });
      console.log('✅ 템플릿 로드 성공');
    } catch (loadError) {
      console.error('❌ 템플릿 로드 실패:', loadError.message);
      return;
    }
    
    // 2단계: 공유수식 제거 시도
    console.log('\n2️⃣ 공유수식 제거 시도...');
    try {
      removeAllSharedFormulas(workbook);
      console.log('✅ 공유수식 제거 완료');
    } catch (removeError) {
      console.error('❌ 공유수식 제거 실패:', removeError.message);
      return;
    }
    
    // 3단계: 파일 저장 시도
    console.log('\n3️⃣ 파일 저장 시도...');
    try {
      const buffer = await workbook.xlsx.writeBuffer({
        ignoreFormulaErrors: true,
        ignoreSharedFormulas: true,
        ignoreNodes: ['shared-formula', 'shared-formula-ref', 'shared-formula-master', 'formula']
      });
      console.log('✅ 파일 저장 성공, 크기:', buffer.byteLength);
    } catch (saveError) {
      console.error('❌ 파일 저장 실패:', saveError.message);
      console.error('❌ 오류 스택:', saveError.stack);
      
      // 어떤 셀에서 오류가 발생했는지 분석
      analyzeErrorLocation(saveError);
    }
    
    console.log('\n✅ 디버깅 완료');
    
  } catch (error) {
    console.error('❌ 디버깅 실패:', error);
  }
};

/**
 * 모든 공유수식 제거
 */
const removeAllSharedFormulas = (workbook) => {
  console.log('🧹 공유수식 제거 중...');
  
  workbook.worksheets.forEach(worksheet => {
    console.log(`📋 ${worksheet.name} 시트 처리 중...`);
    
    let removedCount = 0;
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        try {
          if (cell.formula) {
            const formula = cell.formula.toString();
            const cellAddress = cell.address;
            
            // 내역서 시트의 모든 수식 제거
            if (worksheet.name === '내역서') {
              console.log(`🧹 수식 제거: ${cellAddress} - ${formula}`);
              cell.formula = undefined;
              removedCount++;
            }
            
            // 다른 시트에서도 문제가 될 수 있는 수식들 제거
            if (formula.includes('F8') || formula.includes('H8') || formula.includes('F13')) {
              console.log(`🧹 문제수식 제거: ${cellAddress} - ${formula}`);
              cell.formula = undefined;
              removedCount++;
            }
          }
        } catch (e) {
          console.log(`⚠️ 셀 ${cell.address} 처리 실패:`, e.message);
        }
      });
    });
    
    console.log(`✅ ${worksheet.name} 시트에서 ${removedCount}개 수식 제거`);
  });
};

/**
 * 오류 발생 위치 분석
 */
const analyzeErrorLocation = (error) => {
  console.log('\n🔍 오류 위치 분석...');
  
  const errorMessage = error.message;
  console.log('📝 오류 메시지:', errorMessage);
  
  // F8, H8, F13 등이 언급되었는지 확인
  const cellMatches = errorMessage.match(/cell ([A-Z]+\d+)/gi);
  if (cellMatches) {
    console.log('📍 문제 셀들:', cellMatches);
  }
  
  // 공유수식 관련 키워드 확인
  if (errorMessage.includes('Shared Formula')) {
    console.log('🔗 공유수식 관련 오류');
  }
  
  // 스택 트레이스에서 추가 정보 확인
  const stack = error.stack;
  if (stack) {
    const lines = stack.split('\n');
    console.log('📚 스택 트레이스 (처음 5줄):');
    lines.slice(0, 5).forEach(line => {
      console.log('  ', line.trim());
    });
  }
};

// 스크립트 실행
debugSharedFormula();


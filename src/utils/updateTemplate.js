import * as XLSX from 'xlsx';
import { ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';

// NEWgisung.xlsx 파일 수정 및 업로드 (브라우저용)
export const updateNewGisungTemplate = async () => {
  try {
    console.log('📄 NEWgisung.xlsx 파일 수정 시작...');
    
    // public 폴더의 NEWgisung.xlsx 파일 가져오기
    const response = await fetch('/NEWgisung.xlsx');
    if (!response.ok) {
      throw new Error('NEWgisung.xlsx 파일을 찾을 수 없습니다.');
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    // XLSX로 워크북 읽기
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellFormula: true });
    console.log('✅ 파일 읽기 완료');
    
    // 기성금 내역서 시트 가져오기
    const detailSheet = workbook.Sheets['기성금 내역서'];
    if (!detailSheet) {
      throw new Error('기성금 내역서 시트를 찾을 수 없습니다.');
    }
    
    console.log('📝 기성금 내역서 시트 순서 수정 중...');
    
         // 기존 템플릿 데이터를 읽어서 순서만 바꾸기
     console.log('📝 기존 템플릿 데이터 읽기 중...');
     
     // 기존 데이터 수집 (6행부터 25행까지)
     const existingData = [];
     for (let row = 6; row <= 25; row++) {
       const rowData = {
         row: row,
         specification: detailSheet[XLSX.utils.encode_cell({ r: row - 1, c: 0 })]?.v || '',
         name: detailSheet[XLSX.utils.encode_cell({ r: row - 1, c: 1 })]?.v || '',
         unit: detailSheet[XLSX.utils.encode_cell({ r: row - 1, c: 2 })]?.v || '',
         quantity: detailSheet[XLSX.utils.encode_cell({ r: row - 1, c: 3 })]?.v || 0,
         price: detailSheet[XLSX.utils.encode_cell({ r: row - 1, c: 4 })]?.v || 0,
         amount: detailSheet[XLSX.utils.encode_cell({ r: row - 1, c: 5 })]?.v || 0,
         previousQuantity: detailSheet[XLSX.utils.encode_cell({ r: row - 1, c: 6 })]?.v || 0,
         previousAmount: detailSheet[XLSX.utils.encode_cell({ r: row - 1, c: 7 })]?.v || 0,
         currentQuantity: detailSheet[XLSX.utils.encode_cell({ r: row - 1, c: 8 })]?.v || 0,
         currentAmount: detailSheet[XLSX.utils.encode_cell({ r: row - 1, c: 9 })]?.v || 0,
         totalQuantity: detailSheet[XLSX.utils.encode_cell({ r: row - 1, c: 10 })]?.v || 0,
         totalAmount: detailSheet[XLSX.utils.encode_cell({ r: row - 1, c: 11 })]?.v || 0,
         remark: detailSheet[XLSX.utils.encode_cell({ r: row - 1, c: 12 })]?.v || ''
       };
       
       // 빈 행이 아닌 경우만 추가
       if (rowData.name && rowData.name.trim() !== '') {
         existingData.push(rowData);
       }
     }
     
     console.log('📊 기존 데이터 개수:', existingData.length);
     
     // 견적서 순서대로 정렬
     const sortedData = [];
     
     // 1. 학교창(관공서)전용유리 먼저
     const schoolWindowItems = existingData.filter(item => item.name.includes('학교창(관공서)전용유리'));
     sortedData.push(...schoolWindowItems);
     
     // 2. 복층유리 (창호유리설치 제외)
     const insulatedGlassItems = existingData.filter(item => 
       item.name.includes('복층유리') && !item.name.includes('창호유리설치')
     );
     sortedData.push(...insulatedGlassItems);
     
     // 3. 창호유리설치/복층유리
     const windowInstallItems = existingData.filter(item => item.name.includes('창호유리설치'));
     sortedData.push(...windowInstallItems);
     
     // 4. 유리주위 코킹
     const caulkingItems = existingData.filter(item => item.name.includes('유리주위 코킹'));
     sortedData.push(...caulkingItems);
     
     // 5. 방습거울
     const mirrorItems = existingData.filter(item => item.name.includes('방습거울'));
     sortedData.push(...mirrorItems);
     
     // 6. 단수정리 (마지막)
     const adjustmentItems = existingData.filter(item => item.name.includes('단수정리'));
     sortedData.push(...adjustmentItems);
     
     console.log('📋 정렬된 순서:', sortedData.map(item => item.name));
     
     // 기존 데이터 모두 지우기 (6행부터 25행까지)
     for (let row = 6; row <= 25; row++) {
       for (let col = 0; col <= 12; col++) {
         const cellAddress = XLSX.utils.encode_cell({ r: row - 1, c: col });
         delete detailSheet[cellAddress];
       }
     }
     
     // 정렬된 순서로 데이터 재입력 (6행부터 시작)
     let currentRow = 6;
     
     sortedData.forEach((item, index) => {
             // A열: 규격 (specification)
       detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 0 })] = { v: item.specification };
       // B열: 품명 (name)
       detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 1 })] = { v: item.name };
       // C열: 단위
       detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 2 })] = { v: item.unit };
       // D열: 수량(계약수량)
       detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 3 })] = { v: item.quantity };
       // E열: 단가
       detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 4 })] = { v: item.price };
       // F열: 금액 (기존 값 유지)
       detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 5 })] = { v: item.amount };
       // G열: 수량(전회) - 기존 값 유지
       detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 6 })] = { v: item.previousQuantity };
       // H열: 금액(전회) - 기존 값 유지
       detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 7 })] = { v: item.previousAmount };
       // I열: 수량(금회) - 기존 값 유지
       detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 8 })] = { v: item.currentQuantity };
       // J열: 금액(금회) - 기존 값 유지
       detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 9 })] = { v: item.currentAmount };
       // K열: 수량(합계) - 기존 값 유지
       detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 10 })] = { v: item.totalQuantity };
       // L열: 금액(합계) - 기존 값 유지
       detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 11 })] = { v: item.totalAmount };
       // M열: 비고 - 기존 값 유지
       detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 12 })] = { v: item.remark };
      
      currentRow++;
    });
    
    console.log('✅ 기성금 내역서 시트 순서 수정 완료');
    
    // 수정된 파일을 ArrayBuffer로 변환
    const modifiedArrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    
    // Firebase Storage에 업로드
    console.log('📤 Firebase Storage에 업로드 중...');
    const storageRef = ref(storage, 'templates/NEWgisung.xlsx');
    await uploadBytes(storageRef, modifiedArrayBuffer);
    
    console.log('✅ NEWgisung.xlsx 템플릿 업로드 완료!');
    console.log('📋 수정된 순서:');
    console.log('1. 학교창(관공서)전용유리 - 모든 종류 (6개)');
    console.log('2. 복층유리 - 모든 종류 (3개)');
    console.log('3. 창호유리설치/복층유리 - 모든 종류 (4개)');
    console.log('4. 유리주위 코킹 (1개)');
    console.log('5. 방습거울 (1개)');
    console.log('6. 단수정리 (마지막)');
    
    return { success: true, message: '템플릿 업로드 완료!' };
    
  } catch (error) {
    console.error('❌ 템플릿 수정 및 업로드 실패:', error);
    throw error;
  }
};

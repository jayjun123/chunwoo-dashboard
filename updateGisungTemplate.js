import * as XLSX from 'xlsx';
import { ref, uploadBytes, getStorage } from 'firebase/storage';
import { storage } from './src/firebase.js';
import fs from 'fs';
import path from 'path';

// NEWgisung.xlsx 파일 수정 및 업로드
const updateNewGisungTemplate = async () => {
  try {
    console.log('📄 NEWgisung.xlsx 파일 수정 시작...');
    
    // public 폴더의 NEWgisung.xlsx 파일 읽기
    const filePath = path.join(process.cwd(), 'public', 'NEWgisung.xlsx');
    const fileBuffer = fs.readFileSync(filePath);
    
    // XLSX로 워크북 읽기
    const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellFormula: true });
    console.log('✅ 파일 읽기 완료');
    
    // 기성금 내역서 시트 가져오기
    const detailSheet = workbook.Sheets['기성금 내역서'];
    if (!detailSheet) {
      throw new Error('기성금 내역서 시트를 찾을 수 없습니다.');
    }
    
    console.log('📝 기성금 내역서 시트 순서 수정 중...');
    
    // 견적서 순서대로 데이터 재정렬
    const correctOrder = [
      // 1. 학교창(관공서)전용유리 - 모든 종류 먼저 (6개)
      { name: '학교창(관공서)전용유리', specification: '22mm(5+12+5), MCT(HS)+아르곤+투명, 고단열 더블로이 복층유리', unit: 'M²', quantity: 0.9, price: 49000 },
      { name: '학교창(관공서)전용유리', specification: '22mm(5+12+5), MCT(HS)+아르곤+칼라, 고단열 더블로이 복층유리', unit: 'M²', quantity: 0.9, price: 46000 },
      { name: '학교창(관공서)전용유리', specification: '24mm(5+14+5), MCT(HS)+아르곤+투명, 고단열 더블로이 복층유리', unit: 'M²', quantity: 34.7, price: 46000 },
      { name: '학교창(관공서)전용유리', specification: '24mm(5+14+5), MCT(HS)+아르곤+칼라, 고단열 더블로이 복층유리', unit: 'M²', quantity: 16.9, price: 48000 },
      { name: '학교창(관공서)전용유리', specification: '24mm(6+12+6), MCT(HS)+아르곤+투명, 고단열 더블로이 복층유리', unit: 'M²', quantity: 5.5, price: 51000 },
      { name: '학교창(관공서)전용유리', specification: '43mm(5+14+5+14+5), MCT(HS)+아르곤+투명(HS)+아르곤+MCT(HS), 고단열 더블로이 삼중', unit: 'M²', quantity: 13.2, price: 110000 },
      
      // 2. 복층유리 - 모든 종류 (3개)
      { name: '복층유리', specification: '복층유리, 투명, 16mm', unit: 'M²', quantity: 6.1, price: 22000 },
      { name: '복층유리', specification: '복층유리, 투명, 22mm, 건조공기', unit: 'M²', quantity: 9.6, price: 26000 },
      { name: '복층유리', specification: '복층유리, 컬러, 22mm, 건조공기, 그린', unit: 'M²', quantity: 9.6, price: 29000 },
      
      // 3. 창호유리설치/복층유리 - 모든 종류 (4개)
      { name: '창호유리설치/복층유리', specification: '유리두께 16mm 이하', unit: 'M²', quantity: 6.1, price: 15000 },
      { name: '창호유리설치/복층유리', specification: '유리두께 22mm 이하', unit: 'M²', quantity: 21.2, price: 15000 },
      { name: '창호유리설치/복층유리', specification: '유리두께 24mm 이하', unit: 'M²', quantity: 57.1, price: 18000 },
      { name: '창호유리설치/복층유리', specification: '유리뚜께 43mm 이하', unit: 'M²', quantity: 13.2, price: 20000 },
      
      // 4. 유리주위 코킹 (1개)
      { name: '유리주위 코킹', specification: '복층유리 5×5, 실리콘(양면)', unit: 'M', quantity: 508.9, price: 300 },
      
      // 5. 방습거울 (1개)
      { name: '방습거울', specification: '5mm,틀포함', unit: 'M²', quantity: 1.0, price: 100000 },
      
      // 6. 단수정리 (마지막)
      { name: '단수정리', specification: 'NEGO', unit: '식', quantity: 1.0, price: -341570 }
    ];
    
    // 기성금 내역서 시트 데이터 재입력 (6행부터 시작)
    let currentRow = 6;
    
    correctOrder.forEach((item, index) => {
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
      // F열: 금액 (수식으로 계산)
      detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 5 })] = { 
        f: `=D${currentRow}*E${currentRow}`,
        v: item.quantity * item.price
      };
      // G열: 수량(전회) - 0으로 초기화
      detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 6 })] = { v: 0 };
      // H열: 금액(전회) - 수식으로 계산
      detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 7 })] = { 
        f: `=G${currentRow}*E${currentRow}`,
        v: 0
      };
      // I열: 수량(금회) - 0으로 초기화
      detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 8 })] = { v: 0 };
      // J열: 금액(금회) - 수식으로 계산
      detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 9 })] = { 
        f: `=I${currentRow}*E${currentRow}`,
        v: 0
      };
      // K열: 수량(합계) - 수식으로 계산
      detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 10 })] = { 
        f: `=G${currentRow}+I${currentRow}`,
        v: 0
      };
      // L열: 금액(합계) - 수식으로 계산
      detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 11 })] = { 
        f: `=H${currentRow}+J${currentRow}`,
        v: 0
      };
      // M열: 비고 - 빈 값
      detailSheet[XLSX.utils.encode_cell({ r: currentRow - 1, c: 12 })] = { v: '' };
      
      currentRow++;
    });
    
    console.log('✅ 기성금 내역서 시트 순서 수정 완료');
    
    // 수정된 파일을 Buffer로 변환
    const modifiedBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Firebase Storage에 업로드
    console.log('📤 Firebase Storage에 업로드 중...');
    const storageRef = ref(storage, 'templates/NEWgisung.xlsx');
    await uploadBytes(storageRef, modifiedBuffer);
    
    console.log('✅ NEWgisung.xlsx 템플릿 업로드 완료!');
    console.log('📋 수정된 순서:');
    console.log('1. 학교창(관공서)전용유리 - 모든 종류 (6개)');
    console.log('2. 복층유리 - 모든 종류 (3개)');
    console.log('3. 창호유리설치/복층유리 - 모든 종류 (4개)');
    console.log('4. 유리주위 코킹 (1개)');
    console.log('5. 방습거울 (1개)');
    console.log('6. 단수정리 (마지막)');
    
  } catch (error) {
    console.error('❌ 템플릿 수정 및 업로드 실패:', error);
    throw error;
  }
};

// 실행
updateNewGisungTemplate();

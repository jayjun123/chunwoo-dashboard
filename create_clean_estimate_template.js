// 공유 수식이 없는 깨끗한 견적서 템플릿 생성
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import ExcelJS from 'exceljs';

const firebaseConfig = {
  apiKey: "AIzaSyATCGXGD2_teiJFdpng9J2_fvZRItPef0w",
  authDomain: "chunwooo-edf9f.firebaseapp.com",
  projectId: "chunwooo-edf9f",
  storageBucket: "chunwooo-edf9f.firebasestorage.app",
  messagingSenderId: "417029078660",
  appId: "1:417029078660:web:00e23d79af77876e598cd1",
  measurementId: "G-653CL9XWFH"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function createCleanEstimateTemplate() {
  try {
    console.log('🆕 깨끗한 견적서 템플릿 생성 시작...');
    
    const workbook = new ExcelJS.Workbook();
    
    // 갑지 시트 생성
    const gajiSheet = workbook.addWorksheet('갑지');
    
    // 갑지 시트 설정
    gajiSheet.columns = [
      { width: 15 }, { width: 20 }, { width: 15 }, { width: 15 },
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 },
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 },
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 },
      { width: 15 }, { width: 15 }, { width: 15 }
    ];
    
    // 갑지 기본 구조
    gajiSheet.getCell('A1').value = '견적서';
    gajiSheet.mergeCells('A1:S1');
    gajiSheet.getCell('A1').font = { bold: true, size: 16 };
    gajiSheet.getCell('A1').alignment = { horizontal: 'center' };
    
    // 기본 정보 행들
    gajiSheet.getCell('B3').value = '2025';
    gajiSheet.getCell('D3').value = '8';
    gajiSheet.getCell('B11').value = '회사명';
    gajiSheet.getCell('H16').value = '현장명';
    
    // 내역서 시트 생성
    const detailSheet = workbook.addWorksheet('내역서');
    
    // 내역서 시트 설정
    detailSheet.columns = [
      { width: 20 }, { width: 15 }, { width: 8 }, { width: 12 },
      { width: 12 }, { width: 15 }, { width: 12 }, { width: 15 },
      { width: 12 }, { width: 15 }, { width: 12 }, { width: 15 },
      { width: 15 }
    ];
    
    // 내역서 헤더
    const headers = ['품명', '규격', '단위', '수량', '단가', '금액', '수량', '금액', '수량', '금액', '수량', '금액', '비고'];
    headers.forEach((header, index) => {
      const cell = detailSheet.getCell(4, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.font.color = { argb: 'FFFFFFFF' };
    });
    
    // 합계 행 (8행) - 수식 없이 텍스트만
    detailSheet.getCell('A8').value = '합계';
    detailSheet.getCell('A8').font = { bold: true };
    
    // 수정된 템플릿 저장
    const buffer = await workbook.xlsx.writeBuffer();
    console.log('✅ 깨끗한 템플릿 생성 완료:', buffer.length, 'bytes');
    
    // 파이어베이스에 업로드
    const templateRef = ref(storage, 'templates/견적서.xlsx');
    await uploadBytes(templateRef, buffer);
    console.log('✅ 깨끗한 템플릿 업로드 완료');
    
    console.log('🎉 공유 수식 없는 깨끗한 견적서 템플릿 생성 완료!');
    
  } catch (error) {
    console.error('❌ 깨끗한 템플릿 생성 실패:', error);
  }
}

createCleanEstimateTemplate();

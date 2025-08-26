// 기성금 내역서 시트 구조 재확인
import { initializeApp } from 'firebase/app';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import ExcelJS from 'exceljs';

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyATCGXGD2_teiJFdpng9J2_fvZRItPef0w",
  authDomain: "chunwooo-edf9f.firebaseapp.com",
  projectId: "chunwooo-edf9f",
  storageBucket: "chunwooo-edf9f.firebasestorage.app",
  messagingSenderId: "417029078660",
  appId: "1:417029078660:web:00e23d79af77876e598cd1",
  measurementId: "G-653CL9XWFH"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

function getCellAddress(col, row) {
  let address = '';
  while (col > 0) {
    col--;
    address = String.fromCharCode(65 + (col % 26)) + address;
    col = Math.floor(col / 26);
  }
  return address + row;
}

async function checkDetailSheetAgain() {
  try {
    console.log('🔍 기성금 내역서 시트 구조 재확인...');
    
    // Firebase Storage에서 템플릿 다운로드
    const templateRef = ref(storage, 'templates/NEWgisung.xlsx');
    const downloadURL = await getDownloadURL(templateRef);
    
    const response = await fetch(downloadURL);
    const arrayBuffer = await response.arrayBuffer();
    
    // 워크북 로드
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer, {
      sharedFormulas: false,
      useStyles: true,
      useCellStyles: true,
      useCellFormulas: true // 공식 로드 활성화
    });
    
    // 기성금 내역서 시트 분석
    const detailSheet = workbook.getWorksheet('기성금 내역서');
    if (detailSheet) {
      console.log('\n📋 기성금 내역서 시트 전체 구조:');
      console.log('='.repeat(80));
      
      // 모든 셀 확인 (1-60행, A-J열)
      for (let row = 1; row <= 60; row++) {
        let rowContent = '';
        for (let col = 1; col <= 10; col++) {
          const cell = detailSheet.getCell(row, col);
          const cellAddress = getCellAddress(col, row);
          
          if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
            rowContent += `${cellAddress}:"${cell.value}" `;
            
            // 공식이 있는지 확인
            if (cell.formula) {
              rowContent += `[공식:${cell.formula}] `;
            }
          }
        }
        if (rowContent) {
          console.log(`행 ${row}: ${rowContent}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 확인 실패:', error);
  }
}

// 스크립트 실행
checkDetailSheetAgain();

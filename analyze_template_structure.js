// 템플릿 구조 분석 스크립트
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

// 셀 주소 생성 함수
function getCellAddress(col, row) {
  let address = '';
  while (col > 0) {
    col--;
    address = String.fromCharCode(65 + (col % 26)) + address;
    col = Math.floor(col / 26);
  }
  return address + row;
}

async function analyzeTemplateStructure() {
  try {
    console.log('🔍 템플릿 구조 분석 시작...');
    
    // Firebase Storage에서 템플릿 다운로드
    const templateRef = ref(storage, 'templates/NEWgisung.xlsx');
    const downloadURL = await getDownloadURL(templateRef);
    
    console.log('📥 템플릿 다운로드 중...');
    const response = await fetch(downloadURL);
    const arrayBuffer = await response.arrayBuffer();
    
    // 워크북 로드
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer, {
      sharedFormulas: false,
      useStyles: true,
      useCellStyles: true,
      useCellFormulas: false
    });
    
    console.log('✅ 템플릿 로드 완료');
    
    // 갑지 시트 분석
    const gapjiSheet = workbook.getWorksheet('갑지');
    if (gapjiSheet) {
      console.log('\n📋 갑지 시트 분석:');
      console.log('='.repeat(50));
      
      // 갑지 시트의 모든 셀 분석 (A1:D20 범위)
      for (let row = 1; row <= 20; row++) {
        for (let col = 1; col <= 4; col++) {
          const cell = gapjiSheet.getCell(row, col);
          const cellAddress = getCellAddress(col, row);
          
          if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
            console.log(`${cellAddress}: "${cell.value}"`);
            
            // 공식이 있는지 확인
            if (cell.formula) {
              console.log(`  📝 공식: ${cell.formula}`);
            }
            
            // 보호된 셀인지 확인
            if (cell.protection && cell.protection.locked) {
              console.log(`  🔒 보호됨`);
            }
          }
        }
      }
    }
    
    // 기성금 내역서 시트 분석
    const detailSheet = workbook.getWorksheet('기성금 내역서');
    if (detailSheet) {
      console.log('\n📋 기성금 내역서 시트 분석:');
      console.log('='.repeat(50));
      
      // 헤더 행 분석 (1-5행)
      console.log('헤더 행 (1-5행):');
      for (let row = 1; row <= 5; row++) {
        for (let col = 1; col <= 10; col++) {
          const cell = detailSheet.getCell(row, col);
          const cellAddress = getCellAddress(col, row);
          
          if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
            console.log(`${cellAddress}: "${cell.value}"`);
            
            // 공식이 있는지 확인
            if (cell.formula) {
              console.log(`  📝 공식: ${cell.formula}`);
            }
            
            // 보호된 셀인지 확인
            if (cell.protection && cell.protection.locked) {
              console.log(`  🔒 보호됨`);
            }
          }
        }
      }
      
      // 데이터 행 분석 (6-20행)
      console.log('\n데이터 행 (6-20행):');
      for (let row = 6; row <= 20; row++) {
        for (let col = 1; col <= 10; col++) {
          const cell = detailSheet.getCell(row, col);
          const cellAddress = getCellAddress(col, row);
          
          if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
            console.log(`${cellAddress}: "${cell.value}"`);
            
            // 공식이 있는지 확인
            if (cell.formula) {
              console.log(`  📝 공식: ${cell.formula}`);
            }
            
            // 보호된 셀인지 확인
            if (cell.protection && cell.protection.locked) {
              console.log(`  🔒 보호됨`);
            }
          }
        }
      }
    }
    
    console.log('\n✅ 템플릿 구조 분석 완료');
    
  } catch (error) {
    console.error('❌ 템플릿 분석 실패:', error);
  }
}

// 스크립트 실행
analyzeTemplateStructure();

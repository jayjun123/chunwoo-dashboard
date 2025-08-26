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

async function checkTemplateFormulas() {
  try {
    console.log('🔍 템플릿 수식 확인 시작...');
    
    // Firebase Storage에서 템플릿 다운로드
    const storageRef = ref(storage, 'templates/NEWgisung.xlsx');
    const templateUrl = await getDownloadURL(storageRef);
    
    console.log('📥 템플릿 다운로드 중...');
    const response = await fetch(templateUrl);
    const templateBuffer = await response.arrayBuffer();
    
    // ExcelJS로 워크북 로드
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(templateBuffer);
    
    console.log('📋 시트 목록:', workbook.worksheets.map(ws => ws.name));
    
    // 기성금 내역서 시트 확인
    const detailSheet = workbook.getWorksheet('기성금 내역서');
    if (!detailSheet) {
      console.log('❌ 기성금 내역서 시트를 찾을 수 없습니다.');
      return;
    }
    
    console.log('\n📊 기성금 내역서 시트 수식 분석:');
    console.log('=' * 50);
    
    // 모든 셀의 수식 확인
    detailSheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        if (cell && cell.formula) {
          const colLetter = String.fromCharCode(64 + colNumber);
          console.log(`${colLetter}${rowNumber}: ${cell.formula}`);
        }
      });
    });
    
    // 특정 열의 수식 확인 (F~M열)
    console.log('\n🔍 F열~M열 수식 상세 분석:');
    console.log('=' * 50);
    
    for (let row = 6; row <= 30; row++) {
      for (let col = 6; col <= 13; col++) { // F=6, M=13
        const colLetter = String.fromCharCode(64 + col);
        const cell = detailSheet.getCell(`${colLetter}${row}`);
        
        if (cell && cell.formula) {
          console.log(`${colLetter}${row}: ${cell.formula}`);
        }
      }
    }
    
    // L28 셀 특별 확인
    const cellL28 = detailSheet.getCell('L28');
    if (cellL28 && cellL28.formula) {
      console.log('\n⚠️ L28 셀 수식:', cellL28.formula);
    } else {
      console.log('\n✅ L28 셀에 수식이 없습니다.');
    }
    
    console.log('\n🎉 템플릿 수식 분석 완료!');
    
  } catch (error) {
    console.error('❌ 템플릿 수식 확인 실패:', error);
  }
}

// 스크립트 실행
checkTemplateFormulas(); 
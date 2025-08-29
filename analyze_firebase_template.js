// Firebase Storage에서 NEWgisung.xlsx 템플릿 구조 분석 스크립트
import ExcelJS from 'exceljs';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { initializeApp } from 'firebase/app';

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyBqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqX",
  authDomain: "chunwooo-edf9f.firebaseapp.com",
  projectId: "chunwooo-edf9f",
  storageBucket: "chunwooo-edf9f.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

async function analyzeFirebaseTemplate() {
  try {
    console.log('📋 Firebase Storage에서 NEWgisung.xlsx 템플릿 구조 분석 시작...');
    
    // Firebase 초기화
    const app = initializeApp(firebaseConfig);
    const storage = getStorage(app);
    
    // 템플릿 파일 참조
    const templateRef = ref(storage, 'templates/NEWgisung.xlsx');
    
    // 다운로드 URL 가져오기
    const downloadURL = await getDownloadURL(templateRef);
    console.log('📥 다운로드 URL:', downloadURL);
    
    // 파일 다운로드
    const response = await fetch(downloadURL);
    if (!response.ok) {
      throw new Error(`파일 다운로드 실패: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log('✅ 파일 다운로드 완료:', arrayBuffer.byteLength, 'bytes');
    
    // 워크북 로드
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    console.log('✅ 템플릿 로드 완료');
    console.log('📋 시트 목록:', workbook.worksheets.map(ws => ws.name));
    
    // 각 시트 분석
    workbook.worksheets.forEach(worksheet => {
      console.log(`\n📊 시트 분석: ${worksheet.name}`);
      console.log(`📏 행 수: ${worksheet.rowCount}`);
      console.log(`📏 열 수: ${worksheet.columnCount}`);
      
      // 주요 셀 내용 확인
      console.log('🔍 주요 셀 내용:');
      
      // 1-10행, A-N열까지 확인
      for (let row = 1; row <= Math.min(10, worksheet.rowCount); row++) {
        for (let col = 1; col <= Math.min(14, worksheet.columnCount); col++) {
          const cell = worksheet.getCell(row, col);
          if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
            const cellAddress = worksheet.getCell(row, col).address;
            console.log(`  ${cellAddress}: "${cell.value}" (타입: ${typeof cell.value})`);
          }
        }
      }
      
      // 병합된 셀 확인
      if (worksheet.model && worksheet.model.merges) {
        console.log('🔗 병합된 셀:');
        worksheet.model.merges.forEach(merge => {
          console.log(`  ${merge.top}:${merge.left} - ${merge.bottom}:${merge.right}`);
        });
      }
      
      // 수식이 있는 셀 확인
      console.log('📊 수식이 있는 셀:');
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          if (cell.formula) {
            console.log(`  ${cell.address}: ${cell.formula}`);
          }
        });
      });
    });
    
    console.log('\n✅ 템플릿 구조 분석 완료');
    
  } catch (error) {
    console.error('❌ 템플릿 분석 실패:', error);
  }
}

// 스크립트 실행
analyzeFirebaseTemplate();

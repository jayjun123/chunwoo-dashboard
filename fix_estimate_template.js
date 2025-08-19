// 견적서 템플릿 공유 수식 제거 스크립트
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import fs from 'fs';
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

async function fixEstimateTemplate() {
  try {
    console.log('🔧 견적서 템플릿 공유 수식 제거 시작...');
    
    // 로컬 견적서 템플릿 읽기
    const templateBuffer = fs.readFileSync('./public/견적서.xlsx');
    console.log('📥 로컬 템플릿 읽기 완료:', templateBuffer.length, 'bytes');
    
    // ExcelJS로 워크북 로드
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(templateBuffer);
    
    console.log('✅ 워크북 로드 완료, 시트 수:', workbook.worksheets.length);
    
    // 모든 시트에서 공유 수식 제거
    workbook.worksheets.forEach((worksheet, index) => {
      console.log(`🔍 시트 ${index + 1}: ${worksheet.name} 처리 중...`);
      
      // 모든 셀을 순회하면서 공유 수식 제거
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          if (cell.formula && cell.formula.includes('shared')) {
            console.log(`⚠️ 공유 수식 발견: ${worksheet.name}!${cell.address} = ${cell.formula}`);
            // 공유 수식을 일반 수식으로 변환하거나 제거
            cell.formula = undefined;
            console.log(`✅ 공유 수식 제거: ${cell.address}`);
          }
        });
      });
    });
    
    // 수정된 템플릿을 버퍼로 저장
    const fixedBuffer = await workbook.xlsx.writeBuffer();
    console.log('✅ 수정된 템플릿 생성 완료:', fixedBuffer.length, 'bytes');
    
    // 파이어베이스에 업로드
    const templateRef = ref(storage, 'templates/견적서.xlsx');
    await uploadBytes(templateRef, fixedBuffer);
    console.log('✅ 수정된 템플릿 업로드 완료');
    
    console.log('🎉 견적서 템플릿 공유 수식 제거 완료!');
    
  } catch (error) {
    console.error('❌ 견적서 템플릿 수정 실패:', error);
  }
}

fixEstimateTemplate();

// 기존 견적서 템플릿에서 공유 수식만 제거
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import fs from 'fs';
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

async function fixEstimateSimple() {
  try {
    console.log('🔧 견적서 템플릿 공유 수식 제거 (간단 버전)...');
    
    // 기존 템플릿 읽기
    const templateBuffer = fs.readFileSync('./public/견적서.xlsx');
    console.log('📥 기존 템플릿 읽기 완료:', templateBuffer.length, 'bytes');
    
    // ExcelJS로 로드 (공유 수식 비활성화)
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(templateBuffer, {
      cellFormula: false, // 공유 수식 완전 비활성화
      cellStyles: true,
      cellDates: true,
      cellText: true,
      cellImages: true,
      cellMerges: true
    });
    
    console.log('✅ 워크북 로드 완료, 시트 수:', workbook.worksheets.length);
    
    // 모든 수식 제거 (공유 수식 문제 해결)
    workbook.worksheets.forEach((worksheet, index) => {
      console.log(`🔍 시트 ${index + 1}: ${worksheet.name} 처리 중...`);
      
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          if (cell.formula) {
            console.log(`⚠️ 수식 발견: ${worksheet.name}!${cell.address} = ${cell.formula}`);
            // 수식 제거하고 값만 유지
            const currentValue = cell.value;
            cell.formula = undefined;
            cell.value = currentValue;
            console.log(`✅ 수식 제거: ${cell.address}, 값 유지: ${currentValue}`);
          }
        });
      });
    });
    
    // 수정된 템플릿 저장
    const fixedBuffer = await workbook.xlsx.writeBuffer();
    console.log('✅ 수정된 템플릿 생성 완료:', fixedBuffer.length, 'bytes');
    
    // 파이어베이스에 업로드
    const templateRef = ref(storage, 'templates/견적서.xlsx');
    await uploadBytes(templateRef, fixedBuffer);
    console.log('✅ 수정된 템플릿 업로드 완료');
    
    console.log('🎉 견적서 템플릿 공유 수식 완전 제거 완료!');
    
  } catch (error) {
    console.error('❌ 견적서 템플릿 수정 실패:', error);
  }
}

fixEstimateSimple();

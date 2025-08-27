// 템플릿 파일의 페이지 설정 수정
import ExcelJS from 'exceljs';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './src/firebase.js';

const fixTemplatePages = async () => {
  try {
    console.log('🚀 템플릿 페이지 설정 수정 시작...');
    
    // 1. NEWgisung.xlsx 수정
    console.log('📝 NEWgisung.xlsx 페이지 설정 수정 중...');
    const newGisungRef = ref(storage, 'templates/NEWgisung.xlsx');
    const newGisungURL = await getDownloadURL(newGisungRef);
    const newGisungResponse = await fetch(newGisungURL);
    const newGisungBuffer = await newGisungResponse.arrayBuffer();
    
    const newWorkbook = new ExcelJS.Workbook();
    await newWorkbook.xlsx.load(newGisungBuffer);
    
    // 페이지 설정 수정
    const newSheet = newWorkbook.getWorksheet('기성금 내역서');
    if (newSheet) {
      // 페이지 나누기 제거
      newSheet.pageSetup.fitToPage = true;
      newSheet.pageSetup.fitToWidth = 1;
      newSheet.pageSetup.fitToHeight = 1;
      
      // 강제 페이지 나누기 제거
      newSheet.pageBreaks = null;
      
      console.log('✅ NEW 템플릿 페이지 설정 수정 완료');
    }
    
    // 2. LONGgisung.xlsx 수정
    console.log('📝 LONGgisung.xlsx 페이지 설정 수정 중...');
    const longGisungRef = ref(storage, 'templates/LONGgisung.xlsx');
    const longGisungURL = await getDownloadURL(longGisungRef);
    const longGisungResponse = await fetch(longGisungURL);
    const longGisungBuffer = await longGisungResponse.arrayBuffer();
    
    const longWorkbook = new ExcelJS.Workbook();
    await longWorkbook.xlsx.load(longGisungBuffer);
    
    // 페이지 설정 수정
    const longSheet = longWorkbook.getWorksheet('기성금 내역서');
    if (longSheet) {
      // 페이지 나누기 제거
      longSheet.pageSetup.fitToPage = true;
      longSheet.pageSetup.fitToWidth = 1;
      longSheet.pageSetup.fitToHeight = 1;
      
      // 강제 페이지 나누기 제거
      longSheet.pageBreaks = null;
      
      console.log('✅ LONG 템플릿 페이지 설정 수정 완료');
    }
    
    // 3. 수정된 파일들 업로드
    console.log('📤 수정된 파일들 업로드 중...');
    
    const newBuffer = await newWorkbook.xlsx.writeBuffer();
    await uploadBytes(newGisungRef, newBuffer);
    console.log('✅ NEWgisung.xlsx 업로드 완료');
    
    const longBuffer = await longWorkbook.xlsx.writeBuffer();
    await uploadBytes(longGisungRef, longBuffer);
    console.log('✅ LONGgisung.xlsx 업로드 완료');
    
    console.log('\n🎉 템플릿 페이지 설정 수정 완료!');
    console.log('📋 수정된 내용:');
    console.log('- 페이지 나누기 제거');
    console.log('- 1페이지에 맞춤 설정');
    console.log('- 강제 페이지 나누기 제거');
    
    alert('템플릿 페이지 설정 수정이 완료되었습니다!\n이제 1페이지로 출력됩니다.');
    
  } catch (error) {
    console.error('❌ 템플릿 페이지 설정 수정 실패:', error);
    alert(`템플릿 페이지 설정 수정 실패: ${error.message}`);
  }
};

// 전역 함수로 등록
window.fixTemplatePages = fixTemplatePages;

console.log('✅ 템플릿 페이지 설정 수정 스크립트 로드 완료');
console.log('🚀 브라우저 콘솔에서 다음 명령어를 실행하세요:');
console.log('fixTemplatePages()');


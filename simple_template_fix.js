// 기존 템플릿 파일의 제목만 수정
import ExcelJS from 'exceljs';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './src/firebase.js';

const fixTemplateTitles = async () => {
  try {
    console.log('🚀 템플릿 제목 수정 시작...');
    
    // 1. 기존 NEWgisung.xlsx 다운로드 및 수정
    console.log('📝 NEWgisung.xlsx 제목 수정 중...');
    const newGisungRef = ref(storage, 'templates/NEWgisung.xlsx');
    const newGisungURL = await getDownloadURL(newGisungRef);
    const newGisungResponse = await fetch(newGisungURL);
    const newGisungBuffer = await newGisungResponse.arrayBuffer();
    
    const newWorkbook = new ExcelJS.Workbook();
    await newWorkbook.xlsx.load(newGisungBuffer);
    
    // NEW 템플릿 제목 수정
    const newSheet = newWorkbook.getWorksheet('기성금 내역서');
    if (newSheet) {
      newSheet.getCell('A1').value = '기성금 내역서 (NEW 템플릿)';
      console.log('✅ NEW 템플릿 제목 수정 완료');
    }
    
    // 2. 기존 LONGgisung.xlsx 다운로드 및 수정
    console.log('📝 LONGgisung.xlsx 제목 수정 중...');
    const longGisungRef = ref(storage, 'templates/LONGgisung.xlsx');
    const longGisungURL = await getDownloadURL(longGisungRef);
    const longGisungResponse = await fetch(longGisungURL);
    const longGisungBuffer = await longGisungResponse.arrayBuffer();
    
    const longWorkbook = new ExcelJS.Workbook();
    await longWorkbook.xlsx.load(longGisungBuffer);
    
    // LONG 템플릿 제목 수정
    const longSheet = longWorkbook.getWorksheet('기성금 내역서');
    if (longSheet) {
      longSheet.getCell('A1').value = '기성금 내역서 (LONG 템플릿)';
      console.log('✅ LONG 템플릿 제목 수정 완료');
    }
    
    // 3. 수정된 파일들 업로드
    console.log('📤 수정된 파일들 업로드 중...');
    
    const newBuffer = await newWorkbook.xlsx.writeBuffer();
    await uploadBytes(newGisungRef, newBuffer);
    console.log('✅ NEWgisung.xlsx 업로드 완료');
    
    const longBuffer = await longWorkbook.xlsx.writeBuffer();
    await uploadBytes(longGisungRef, longBuffer);
    console.log('✅ LONGgisung.xlsx 업로드 완료');
    
    console.log('\n🎉 템플릿 제목 수정 완료!');
    console.log('📋 이제 제목으로 구분됩니다:');
    console.log('- NEW 템플릿: "기성금 내역서 (NEW 템플릿)"');
    console.log('- LONG 템플릿: "기성금 내역서 (LONG 템플릿)"');
    
    alert('템플릿 제목 수정이 완료되었습니다!\n이제 제목으로 NEW/LONG 템플릿을 구분할 수 있습니다.');
    
  } catch (error) {
    console.error('❌ 템플릿 제목 수정 실패:', error);
    alert(`템플릿 제목 수정 실패: ${error.message}`);
  }
};

// 전역 함수로 등록
window.fixTemplateTitles = fixTemplateTitles;

console.log('✅ 템플릿 제목 수정 스크립트 로드 완료');
console.log('🚀 브라우저 콘솔에서 다음 명령어를 실행하세요:');
console.log('fixTemplateTitles()');


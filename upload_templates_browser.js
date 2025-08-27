// 브라우저에서 실행할 수 있는 템플릿 업로드 스크립트
// 브라우저 개발자 도구 콘솔에서 실행하세요

// 전역 함수로 등록
window.uploadNewTemplates = async () => {
  try {
    console.log('🚀 새로운 템플릿 파일 생성 및 업로드 시작...');
    
    // Firebase 모듈 동적 import
    const { getStorage, ref, uploadBytes, deleteObject } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    
    // Firebase 설정 (실제 프로젝트 설정으로 교체 필요)
    const firebaseConfig = {
      apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      authDomain: "chunwooo-edf9f.firebaseapp.com",
      projectId: "chunwooo-edf9f",
      storageBucket: "chunwooo-edf9f.firebasestorage.app",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abcdef123456"
    };
    
    // Firebase 초기화
    const app = initializeApp(firebaseConfig);
    const storage = getStorage(app);
    
    // ExcelJS 동적 import
    const ExcelJS = await import('https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/es5/exceljs.min.js');
    
    const createNewTemplate = async (templateType) => {
      const workbook = new ExcelJS.Workbook();
      
      // 갑지 시트 생성
      const gapjiSheet = workbook.addWorksheet('갑지');
      
      // 기성금 내역서 시트 생성
      const detailSheet = workbook.addWorksheet('기성금 내역서');
      
      // 갑지 시트 설정
      gapjiSheet.columns = [
        { header: 'A', key: 'A', width: 15 },
        { header: 'B', key: 'B', width: 20 },
        { header: 'C', key: 'C', width: 15 },
        { header: 'D', key: 'D', width: 20 },
        { header: 'E', key: 'E', width: 15 },
        { header: 'F', key: 'F', width: 20 }
      ];
      
      // 갑지 시트 제목 설정
      gapjiSheet.getCell('A1').value = '기성금청구서';
      gapjiSheet.getCell('A1').font = { bold: true, size: 16 };
      gapjiSheet.getCell('A1').alignment = { horizontal: 'center' };
      gapjiSheet.mergeCells('A1:F1');
      
      // 템플릿 타입에 따른 제목 설정
      const templateTitle = templateType === 'NEW' ? '기성금청구서 (NEW 템플릿)' : '기성금청구서 (LONG 템플릿)';
      gapjiSheet.getCell('A2').value = templateTitle;
      gapjiSheet.getCell('A2').font = { bold: true, size: 14, color: { argb: 'FFFF0000' } };
      gapjiSheet.getCell('A2').alignment = { horizontal: 'center' };
      gapjiSheet.mergeCells('A2:F2');
      
      // 기본 정보 행들
      const basicInfo = [
        { row: 4, label: '현장명:', value: '' },
        { row: 5, label: '계약금액:', value: '' },
        { row: 6, label: '담당자:', value: '' },
        { row: 7, label: '회사명:', value: '' },
        { row: 8, label: '계약구분:', value: '유리공사' },
        { row: 9, label: '공사기간:', value: '' },
        { row: 10, label: '선급금:', value: '' },
        { row: 11, label: '인감타입:', value: 'A인감' }
      ];
      
      basicInfo.forEach(info => {
        gapjiSheet.getCell(`A${info.row}`).value = info.label;
        gapjiSheet.getCell(`A${info.row}`).font = { bold: true };
        gapjiSheet.getCell(`B${info.row}`).value = info.value;
        gapjiSheet.getCell(`B${info.row}`).border = { bottom: { style: 'thin' } };
      });
      
      // 기성금 내역서 시트 설정
      detailSheet.columns = [
        { header: 'A', key: 'A', width: 30 },
        { header: 'B', key: 'B', width: 40 },
        { header: 'C', key: 'C', width: 10 },
        { header: 'D', key: 'D', width: 15 },
        { header: 'E', key: 'E', width: 15 },
        { header: 'F', key: 'F', width: 20 }
      ];
      
      // 기성금 내역서 제목
      detailSheet.getCell('A1').value = '기성금 내역서';
      detailSheet.getCell('A1').font = { bold: true, size: 16 };
      detailSheet.getCell('A1').alignment = { horizontal: 'center' };
      detailSheet.mergeCells('A1:F1');
      
      // 템플릿 타입에 따른 제목 설정
      detailSheet.getCell('A2').value = templateTitle;
      detailSheet.getCell('A2').font = { bold: true, size: 14, color: { argb: 'FFFF0000' } };
      detailSheet.getCell('A2').alignment = { horizontal: 'center' };
      detailSheet.mergeCells('A2:F2');
      
      // 헤더 설정
      const headers = ['항목', '규격', '단위', '물량', '단가', '금액'];
      headers.forEach((header, index) => {
        const cell = detailSheet.getCell(4, index + 1);
        cell.value = header;
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        cell.border = { 
          top: { style: 'thin' }, 
          bottom: { style: 'thin' }, 
          left: { style: 'thin' }, 
          right: { style: 'thin' } 
        };
      });
      
      // 템플릿 타입에 따른 행 수 설정
      const maxRows = templateType === 'NEW' ? 20 : 50;
      
      // 빈 행들 생성
      for (let i = 5; i <= maxRows; i++) {
        for (let j = 1; j <= 6; j++) {
          const cell = detailSheet.getCell(i, j);
          cell.border = { 
            top: { style: 'thin' }, 
            bottom: { style: 'thin' }, 
            left: { style: 'thin' }, 
            right: { style: 'thin' } 
          };
        }
      }
      
      // 페이지 설정
      if (templateType === 'NEW') {
        // NEW 템플릿: 1페이지로 설정
        detailSheet.pageSetup.fitToPage = true;
        detailSheet.pageSetup.fitToWidth = 1;
        detailSheet.pageSetup.fitToHeight = 1;
      } else {
        // LONG 템플릿: 2페이지로 설정
        detailSheet.pageSetup.fitToPage = true;
        detailSheet.pageSetup.fitToWidth = 1;
        detailSheet.pageSetup.fitToHeight = 2;
      }
      
      return workbook;
    };
    
    const uploadTemplateToFirebase = async (workbook, fileName) => {
      try {
        console.log(`📤 ${fileName} 업로드 중...`);
        
        // 워크북을 버퍼로 변환
        const buffer = await workbook.xlsx.writeBuffer();
        
        // Firebase Storage에 업로드
        const fileRef = ref(storage, `templates/${fileName}`);
        
        await uploadBytes(fileRef, buffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        
        console.log(`✅ ${fileName} 업로드 완료`);
        return true;
      } catch (error) {
        console.error(`❌ ${fileName} 업로드 실패:`, error);
        return false;
      }
    };
    
    const deleteOldTemplates = async () => {
      try {
        console.log('🗑️ 기존 템플릿 파일 삭제 중...');
        
        const oldFiles = ['NEWgisung.xlsx', 'LONGgisung.xlsx'];
        
        for (const fileName of oldFiles) {
          try {
            const fileRef = ref(storage, `templates/${fileName}`);
            await deleteObject(fileRef);
            console.log(`✅ ${fileName} 삭제 완료`);
          } catch (error) {
            console.log(`⚠️ ${fileName} 삭제 실패 (파일이 없을 수 있음):`, error.message);
          }
        }
      } catch (error) {
        console.error('❌ 기존 템플릿 삭제 실패:', error);
      }
    };
    
    // 기존 템플릿 파일 삭제
    await deleteOldTemplates();
    
    // NEW 템플릿 생성 및 업로드
    console.log('\n📝 NEW 템플릿 생성 중...');
    const newTemplate = await createNewTemplate('NEW');
    await uploadTemplateToFirebase(newTemplate, 'NEWgisung.xlsx');
    
    // LONG 템플릿 생성 및 업로드
    console.log('\n📝 LONG 템플릿 생성 중...');
    const longTemplate = await createNewTemplate('LONG');
    await uploadTemplateToFirebase(longTemplate, 'LONGgisung.xlsx');
    
    console.log('\n🎉 모든 템플릿 파일 업로드 완료!');
    console.log('\n📋 업로드된 파일:');
    console.log('- NEWgisung.xlsx (NEW 템플릿 - 1페이지)');
    console.log('- LONGgisung.xlsx (LONG 템플릿 - 2페이지)');
    
  } catch (error) {
    console.error('❌ 템플릿 업로드 실패:', error);
  }
};

// 사용법 안내
console.log('📋 사용법:');
console.log('1. 브라우저 개발자 도구 콘솔에서 다음 명령어를 실행하세요:');
console.log('   uploadNewTemplates()');
console.log('');
console.log('2. 또는 다음 명령어로 실행하세요:');
console.log('   window.uploadNewTemplates()');

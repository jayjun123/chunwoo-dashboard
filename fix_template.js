// 임시 수정 파일
// 템플릿 원본을 절대 손상시키지 않는 방식으로 데이터만 입력하는 함수

const fillDetailSheetWithExcelJS_SAFE = (worksheet, siteData, gisungData, siteItems = []) => {
  console.log('📝 안전한 방식으로 기성금 내역서 시트 데이터 입력 시작');
  
  try {
    // 데이터 시작 행
    let currentRow = 6;
    
    // 기본 데이터가 없으면 생성
    if (!siteItems || siteItems.length === 0) {
      siteItems = [
        { name: '복층유리', specification: '복층유리, 투명, 16mm', unit: 'm²', quantity: 6, price: 22000 },
        { name: '복층유리', specification: '복층유리,투명,22mm,건조공기', unit: 'm²', quantity: 10, price: 26000 },
        { name: '복층유리', specification: '복층유리,물결,22mm,건조공기,그린', unit: 'm²', quantity: 10, price: 29000 },
        { name: '학교창(관공서)전용유리', specification: '22mm(5+12+5), MCT(HS)+아르곤+복층', unit: 'M2', quantity: 1, price: 49000 },
        { name: '학교창(관공서)전용유리', specification: '22mm(5+12+5), MCT(HS)+아르곤+복층', unit: 'M2', quantity: 1, price: 46000 },
        { name: '학교창(관공서)전용유리', specification: '24mm(5+14+5), MCT(HS)+아르곤+복층', unit: 'M2', quantity: 35, price: 46000 },
        { name: '학교창(관공서)전용유리', specification: '24mm(5+14+5), MCT(HS)+아르곤+복층', unit: 'M2', quantity: 17, price: 48000 },
        { name: '학교창(관공서)전용유리', specification: '24mm(6+12+6), MCT(HS)+아르곤+복층', unit: 'M2', quantity: 6, price: 51000 },
        { name: '학교창(관공서)전용유리', specification: '43mm(5+14+5+14+5), MCT(HS)+아르곤', unit: 'M2', quantity: 13, price: 110000 },
        { name: '창호유리설치 / 복층유리', specification: '유리두께 16mm 이하', unit: 'M2', quantity: 6, price: 15000 },
        { name: '창호유리설치 / 복층유리', specification: '유리두께 22mm 이하', unit: 'M2', quantity: 21, price: 15000 },
        { name: '창호유리설치 / 복층유리', specification: '유리두께 24mm 이하', unit: 'M2', quantity: 57, price: 18000 },
        { name: '창호유리설치 / 복층유리', specification: '유리두께 43mm 이하', unit: 'M2', quantity: 13, price: 20000 },
        { name: '유리주위 코킹', specification: '복층유리 5×5 실리콘(양면)', unit: 'M', quantity: 509, price: 300 },
        { name: '방습거울', specification: '5mm,물표함', unit: 'M2', quantity: 1, price: 100000 },
        { name: '단수정리', specification: '', unit: '', quantity: 1, price: -341570 }
      ];
    }
    
    // 데이터 입력 (수식이 없는 셀에만)
    for (let index = 0; index < siteItems.length; index++) {
      const item = siteItems[index];
      const row = currentRow + index;
      
      const itemName = item.name || '';
      const specification = item.specification || '';
      const unit = item.unit || '';
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.price || item.unitPrice) || 0;
      
      // A열~I열에만 데이터 입력 (수식이 없는 경우에만)
      const cellA = worksheet.getCell(`A${row}`);
      const cellB = worksheet.getCell(`B${row}`);
      const cellC = worksheet.getCell(`C${row}`);
      const cellD = worksheet.getCell(`D${row}`);
      const cellE = worksheet.getCell(`E${row}`);
      const cellG = worksheet.getCell(`G${row}`);
      const cellI = worksheet.getCell(`I${row}`);
      
      // 수식이 없는 셀에만 데이터 입력
      if (cellA && !cellA.formula) cellA.value = itemName;
      if (cellB && !cellB.formula) cellB.value = specification;
      if (cellC && !cellC.formula) cellC.value = unit;
      if (cellD && !cellD.formula) {
        cellD.value = quantity === 0 ? '' : quantity;
        if (quantity !== 0) cellD.numFmt = '#,##0';
      }
      if (cellE && !cellE.formula) {
        cellE.value = unitPrice === 0 ? '' : unitPrice;
        if (unitPrice !== 0) cellE.numFmt = '#,##0';
      }
      if (cellG && !cellG.formula) {
        cellG.value = 0; // 전회 기성 수량
        cellG.numFmt = '#,##0';
      }
      if (cellI && !cellI.formula) {
        cellI.value = 0; // 금회 기성 수량
        cellI.numFmt = '#,##0';
      }
      
      console.log(`✅ ${row}행 데이터 입력 완료: ${itemName}`);
    }
    
    console.log('✅ 안전한 방식으로 데이터 입력 완료 - 템플릿 수식 100% 보존됨');
  } catch (error) {
    console.error('❌ 안전한 데이터 입력 실패:', error);
  }
};

console.log('임시 수정 파일 생성됨');
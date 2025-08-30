// 실제 데이터 구조에 맞게 수정된 실물량원장 파싱 로직
const parseSilmulExcelFixed = (data, targetSiteName = '') => {
  console.log(`=== 실물량 원장 파싱 시작 (수정됨) ===`);
  console.log(`목표 현장명: "${targetSiteName}"`);
  console.log(`전체 데이터 행 수: ${data.length}`);
  
  const siteData = [];
  let currentSite = null;
  
  // 데이터 행을 순회하면서 현장명과 품목 정보 추출
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    if (!row || row.length < 10) continue;
    
    const cValue = String(row[2] || '').trim(); // C열에서 현장명 찾기
    
    // 괄호로 시작하고 끝나는 경우 현장명으로 간주
    if (cValue.startsWith('(') && cValue.endsWith(')')) {
      // 이전 현장 데이터 저장
      if (currentSite) {
        siteData.push(currentSite);
        console.log(`💾 현장 "${currentSite.siteName}" 저장 완료 (${currentSite.items.length}개 품목)`);
      }
      
      // 새 현장 시작
      currentSite = {
        siteName: cValue,
        startRow: rowIndex + 1,
        items: []
      };
      
      console.log(`✅ 현장 "${cValue}" 데이터 수집 시작 (행 ${rowIndex + 1})`);
    }
    
    // 현장명이 설정된 상태에서 품목 데이터 수집
    // 현장명 다음 행부터 다음 현장명까지 모든 행이 품목 데이터
    if (currentSite && !cValue.startsWith('(') && rowIndex > currentSite.startRow) {
      const itemName = String(row[2] || '').trim(); // C열: 품목명
      
      // 수식 결과 처리 함수
      const getCellValue = (cellValue) => {
        if (cellValue === null || cellValue === undefined || cellValue === '') return 0;
        
        // 수식 값이 객체로 반환되는 경우 처리
        if (typeof cellValue === 'object' && cellValue !== null) {
          if (cellValue.result !== undefined) {
            return parseFloat(cellValue.result) || 0;
          } else if (cellValue.v !== undefined) {
            return parseFloat(cellValue.v) || 0;
          } else {
            return 0;
          }
        }
        
        return parseFloat(cellValue) || 0;
      };
      
      const fValue = getCellValue(row[5]); // F열: 평수
      const gValue = getCellValue(row[6]); // G열: 단가
      const jValue = getCellValue(row[9]); // J열: 금액
      
      // 품목명이 있거나 F,G,J 값이 있으면 수집
      if (itemName && itemName.length > 0) {
        const item = {
          itemName: itemName,
          fValue: fValue,
          gValue: gValue,
          jValue: jValue,
          row: rowIndex + 1
        };
        
        currentSite.items.push(item);
        
        // "경운" 현장의 경우 로그 출력
        if (currentSite.siteName.toLowerCase().includes('경운')) {
          console.log(`📦 품목 추가: "${itemName}" (F: ${fValue}, G: ${gValue}, J: ${jValue})`);
        }
      }
    }
  }
  
  // 마지막 현장 데이터 저장
  if (currentSite) {
    siteData.push(currentSite);
  }
  
  console.log(`📊 수집된 현장 데이터: ${siteData.length}개 현장`);
  siteData.forEach(site => {
    console.log(`- ${site.siteName}: ${site.items.length}개 품목`);
  });
  
  // 검색어가 있으면 매칭되는 현장명들 찾기
  if (targetSiteName) {
    const matchingSites = siteData.filter(site => {
      const siteNameClean = site.siteName.toLowerCase().replace(/[()]/g, '').trim();
      const targetClean = targetSiteName.toLowerCase().trim();
      return siteNameClean.includes(targetClean);
    });
    
    console.log(`🔍 검색어 "${targetSiteName}"과 매칭된 현장들: ${matchingSites.length}개`);
    matchingSites.forEach(site => {
      console.log(`- ${site.siteName}: ${site.items.length}개 품목`);
    });
    
    if (matchingSites.length === 0) {
      return { 
        siteName: '', 
        items: [],
        siteData: siteData,
        availableSites: [],
        showSelectionDialog: false,
        error: `검색어 "${targetSiteName}"과 매칭되는 현장을 찾을 수 없습니다.`
      };
    } else if (matchingSites.length === 1) {
      const targetSite = matchingSites[0];
      console.log(`✅ 단일 현장 매칭: "${targetSite.siteName}"`);
      
      const aggregatedItems = aggregateItemsByType(targetSite.items);
      return {
        siteName: targetSite.siteName,
        items: aggregatedItems,
        siteData: siteData
      };
    } else {
      console.log(`📋 다이얼로그 선택 필요: ${matchingSites.length}개 현장`);
      return { 
        siteName: '', 
        items: [],
        siteData: siteData,
        availableSites: matchingSites.map(site => site.siteName),
        showSelectionDialog: true
      };
    }
  } else {
    return {
      siteName: '전체 현장',
      items: [],
      siteData: siteData,
      availableSites: siteData.map(site => site.siteName)
    };
  }
};

// 품목별로 합산하는 함수
const aggregateItemsByType = (items) => {
  const aggregated = {};
  
  items.forEach(item => {
    const key = item.itemName.trim();
    if (!aggregated[key]) {
      aggregated[key] = {
        itemName: key,
        fSum: 0,
        gValues: [],
        jSum: 0,
        count: 0
      };
    }
    
    aggregated[key].fSum += item.fValue;
    aggregated[key].jSum += item.jValue;
    aggregated[key].count += 1;
    
    if (item.gValue > 0) {
      aggregated[key].gValues.push(item.gValue);
    }
  });

  return Object.values(aggregated).map(item => {
    const quantity = item.fSum / 10.89;
    const unitPrice = item.gValues.length > 0 ? (item.gValues[0] * 10.89 / 1.1) : 0;
    const amount = item.jSum / 1.1;

    return {
      itemName: item.itemName,
      quantity: quantity,
      unitPrice: unitPrice,
      amount: amount,
      fSum: item.fSum,
      gFirst: item.gValues[0] || 0,
      jSum: item.jSum
    };
  });
};

module.exports = { parseSilmulExcelFixed };

import { db } from '../firebase.js';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import ExcelJS from 'exceljs';

// 기성금회기성 엑셀 파일을 파싱하고 파이어베이스에 저장
export const uploadGisungDataToFirebase = async (file, siteData = null) => {
  try {
    console.log('🚀 기성금회기성 데이터 업로드 시작...');
    
    // 파일을 ArrayBuffer로 읽기
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    console.log('📋 워크북 로드 완료, 시트 목록:', workbook.worksheets.map(ws => ws.name));
    
    // 기성금 내역서 시트 찾기
    const detailSheet = workbook.getWorksheet('기성금 내역서');
    if (!detailSheet) {
      throw new Error('파일 형식이 올바르지 않습니다. "기성금 내역서" 시트가 필요합니다.');
    }
    
    console.log('📊 기성금 내역서 시트 발견');
    
    // 이전 차수의 누계수량을 가져와서 전회수량으로 설정
    if (siteData) {
      await setPreviousCumulativeAsPreviousQuantity(detailSheet, siteData);
    }
    
    // 데이터 파싱
    const gisungData = parseGisungDataFromSheet(detailSheet);
    
    if (gisungData.length === 0) {
      throw new Error('데이터 없음: 기성금회기성 데이터를 찾을 수 없습니다.');
    }
    
    console.log(`📈 파싱된 기성금 데이터: ${gisungData.length}개 항목`);
    
    // 파이어베이스에 저장
    const savedCount = await saveGisungDataToFirebase(gisungData);
    
    console.log(`✅ 기성금 데이터 저장 완료: ${savedCount}개 항목`);
    
    return {
      success: true,
      message: `기성금회기성 데이터가 성공적으로 저장되었습니다. (${savedCount}개 항목)`,
      count: savedCount
    };
    
  } catch (error) {
    console.error('❌ 기성금회기성 데이터 업로드 실패:', error);
    throw error;
  }
};

// 이전 차수의 누계수량을 현재 차수의 전회수량으로 설정
const setPreviousCumulativeAsPreviousQuantity = async (worksheet, siteData) => {
  try {
    console.log('🔄 이전 차수 누계수량을 전회수량으로 설정 시작...');
    
    // 현재 차수 계산 (기존 모든 기성금 개수 + 1)
    const existingGisungQuery = query(
      collection(db, 'gisung'),
      where('siteName', '==', siteData.name)
    );
    const existingGisungSnapshot = await getDocs(existingGisungQuery);
    const currentSequence = existingGisungSnapshot.size + 1;
    
    console.log(`📊 현재 차수: ${currentSequence}차 (${siteData.name} - 전체 기성 데이터 ${existingGisungSnapshot.size}개)`);
    
    if (currentSequence === 1) {
      console.log('📊 1차 기성금이므로 이전 누계수량이 없습니다.');
      return;
    }
    
    // 이전 차수의 누계수량 데이터 가져오기
    const previousGisungQuery = query(
      collection(db, 'gisung'),
      where('siteName', '==', siteData.name),
      where('sequence', '==', currentSequence - 1)
    );
    const previousGisungSnapshot = await getDocs(previousGisungQuery);
    
    if (previousGisungSnapshot.empty) {
      console.log('⚠️ 이전 차수 기성금 데이터를 찾을 수 없습니다.');
      return;
    }
    
    const previousGisungData = previousGisungSnapshot.docs[0].data();
    console.log('📊 이전 차수 기성금 데이터:', previousGisungData);
    
    // 헤더 행 찾기
    let headerRow = 5;
    for (let row = 5; row <= 10; row++) {
      const cellA = worksheet.getCell(`A${row}`);
      const headerA = cellA ? String(cellA.value || '').trim() : '';
      if (headerA === '품명') {
        headerRow = row;
        break;
      }
    }
    
    const dataStartRow = headerRow + 1;
    console.log(`📊 데이터 시작 행: ${dataStartRow}행`);
    
    // 각 항목에 대해 이전 누계수량을 전회수량으로 설정
    for (let row = dataStartRow; row <= 50; row++) {
      const cellA = worksheet.getCell(`A${row}`);
      const cellG = worksheet.getCell(`G${row}`); // 전회수량 (G열)
      const cellK = worksheet.getCell(`K${row}`); // 누계수량 (K열)
      
      const itemName = cellA ? String(cellA.value || '').trim() : '';
      
      // 품명이 없으면 건너뛰기
      if (!itemName) {
        continue;
      }
      
      // 집계 행들은 건너뛰기
      if (itemName.includes('총 공사계') || itemName.includes('총공사계') || 
          itemName.includes('부가세') || itemName.includes('계약금액')) {
        break;
      }
      
      // 이전 차수에서 해당 항목의 누계수량 찾기
      const previousItem = previousGisungData.items?.find(item => 
        item.name === itemName
      );
      
      if (previousItem && previousItem.totalQuantity > 0) {
        // 전회수량(G열)에 이전 누계수량 설정
        cellG.value = previousItem.totalQuantity;
        console.log(`✅ ${row}행 전회수량 설정: ${itemName} = ${previousItem.totalQuantity}`);
        
        // 누계수량(K열)도 자동 계산 (전회수량 + 금회수량)
        const cellI = worksheet.getCell(`I${row}`); // 금회수량 (I열)
        const currentQuantity = parseFloat(cellI?.value || 0);
        const newTotalQuantity = previousItem.totalQuantity + currentQuantity;
        cellK.value = newTotalQuantity;
        console.log(`✅ ${row}행 누계수량 업데이트: ${itemName} = ${newTotalQuantity} (전회:${previousItem.totalQuantity} + 금회:${currentQuantity})`);
      }
    }
    
    console.log('✅ 이전 차수 누계수량을 전회수량으로 설정 완료');
    
  } catch (error) {
    console.error('❌ 이전 차수 누계수량 설정 실패:', error);
    // 오류가 발생해도 계속 진행
  }
};

// 기성금 내역서 시트에서 데이터 파싱
const parseGisungDataFromSheet = (worksheet) => {
  const gisungData = [];
  
  try {
    console.log('🔍 기성금 내역서 시트 데이터 파싱 시작...');
    
    // 헤더 행 찾기 (보통 5행에 있음)
    let headerRow = 5;
    let foundHeader = false;
    
    // 헤더 행 찾기 (5-10행 범위에서)
    for (let row = 5; row <= 10; row++) {
      const cellA = worksheet.getCell(`A${row}`);
      const cellB = worksheet.getCell(`B${row}`);
      const cellC = worksheet.getCell(`C${row}`);
      const cellD = worksheet.getCell(`D${row}`);
      const cellE = worksheet.getCell(`E${row}`);
      
      const headerA = cellA ? String(cellA.value || '').trim() : '';
      const headerB = cellB ? String(cellB.value || '').trim() : '';
      const headerC = cellC ? String(cellC.value || '').trim() : '';
      const headerD = cellD ? String(cellD.value || '').trim() : '';
      const headerE = cellE ? String(cellE.value || '').trim() : '';
      
      // 기성금 내역서 헤더 패턴 확인
      if (headerA === '품명' && headerB === '규격' && headerC === '단위' && 
          (headerD === '계약수량' || headerD === '수량') && 
          (headerE === '계약단가' || headerE === '단가')) {
        headerRow = row;
        foundHeader = true;
        console.log(`✅ 헤더 발견: ${row}행`);
        break;
      }
    }
    
    if (!foundHeader) {
      console.warn('⚠️ 헤더를 찾을 수 없어 기본값 5행 사용');
      headerRow = 5;
    }
    
    // 데이터 행 파싱 (헤더 다음 행부터)
    const dataStartRow = headerRow + 1;
    console.log(`📊 데이터 파싱 시작: ${dataStartRow}행부터`);
    
    // 최대 50행까지 검색
    for (let row = dataStartRow; row <= 50; row++) {
      const cellA = worksheet.getCell(`A${row}`);
      const cellB = worksheet.getCell(`B${row}`);
      const cellC = worksheet.getCell(`C${row}`);
      const cellD = worksheet.getCell(`D${row}`);
      const cellE = worksheet.getCell(`E${row}`);
      const cellF = worksheet.getCell(`F${row}`);
      const cellG = worksheet.getCell(`G${row}`);
      const cellH = worksheet.getCell(`H${row}`);
      const cellI = worksheet.getCell(`I${row}`);
      const cellJ = worksheet.getCell(`J${row}`);
      const cellK = worksheet.getCell(`K${row}`);
      const cellL = worksheet.getCell(`L${row}`);
      const cellM = worksheet.getCell(`M${row}`);
      
      const itemName = cellA ? String(cellA.value || '').trim() : '';
      const specification = cellB ? String(cellB.value || '').trim() : '';
      const unit = cellC ? String(cellC.value || '').trim() : '';
      
      // 단수정리나 NEGO 이후의 집계 행들을 만나면 중단 (총공사계, 부가세, 계약금액 등 제외)
      if (itemName.includes('총 공사계') || itemName.includes('총공사계') || 
          itemName.includes('부가세') || itemName.includes('계약금액')) {
        console.log(`🛑 집계행 발견: ${row}행 - 파싱 중단`);
        break;
      }
      
      // 품명이 비어있으면 건너뛰기
      if (!itemName) {
        continue;
      }
      
      // 숫자 데이터 추출 (더 안전한 파싱)
      const parseNumber = (value) => {
        if (value === null || value === undefined || value === '') return 0;
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
      };
      
      const contractQuantity = parseNumber(cellD?.value);
      const contractUnitPrice = parseNumber(cellE?.value);
      const contractAmount = parseNumber(cellF?.value);
      const previousQuantity = parseNumber(cellG?.value);
      const previousAmount = parseNumber(cellH?.value);
      const currentQuantity = parseNumber(cellI?.value);
      const currentAmount = parseNumber(cellJ?.value);
      const totalQuantity = parseNumber(cellK?.value);
      const totalAmount = parseNumber(cellL?.value);
      const progress = parseNumber(cellM?.value);
      
      // 디버깅 로그 추가 (모든 항목에 대해)
      if (itemName) {
        console.log(`🔍 ${row}행 데이터 파싱:`, {
          itemName,
          contractQuantity,
          contractUnitPrice,
          contractAmount,
          previousQuantity,
          previousAmount,
          currentQuantity,
          currentAmount,
          totalQuantity,
          totalAmount,
          progress,
          cellD_value: cellD?.value,
          cellE_value: cellE?.value,
          cellF_value: cellF?.value,
          cellG_value: cellG?.value,
          cellH_value: cellH?.value,
          cellI_value: cellI?.value,
          cellJ_value: cellJ?.value,
          cellK_value: cellK?.value,
          cellL_value: cellL?.value,
          cellM_value: cellM?.value
        });
      }
      
      // 유효한 데이터만 추가 (품명이 있고 수량이나 단가가 있는 경우)
      if (itemName && (contractQuantity > 0 || contractUnitPrice > 0 || currentQuantity > 0)) {
        const gisungItem = {
          name: itemName,
          specification: specification,
          unit: unit,
          contractQuantity: contractQuantity,
          contractUnitPrice: contractUnitPrice,
          contractAmount: contractAmount,
          previousQuantity: previousQuantity,
          previousAmount: previousAmount,
          currentQuantity: currentQuantity,
          currentAmount: currentAmount,
          totalQuantity: totalQuantity,
          totalAmount: totalAmount,
          progress: progress,
          row: row
        };
        
        gisungData.push(gisungItem);
        console.log(`✅ 데이터 파싱: ${row}행 - ${itemName} (금회기성: ${currentQuantity} ${unit}, ${currentAmount}원)`);
      }
    }
    
    console.log(`📊 파싱 완료: ${gisungData.length}개 항목`);
    return gisungData;
    
  } catch (error) {
    console.error('❌ 데이터 파싱 실패:', error);
    throw new Error('데이터 파싱 중 오류가 발생했습니다: ' + error.message);
  }
};

// 파이어베이스에 기성금 데이터 저장
const saveGisungDataToFirebase = async (gisungData) => {
  try {
    console.log('🔥 파이어베이스 저장 시작...');
    
    let savedCount = 0;
    
    // 각 기성금 항목을 개별 문서로 저장
    for (const item of gisungData) {
      try {
        console.log(`💾 저장할 데이터: ${item.name}`, {
          currentQuantity: item.currentQuantity,
          currentAmount: item.currentAmount,
          totalQuantity: item.totalQuantity,
          totalAmount: item.totalAmount,
          previousQuantity: item.previousQuantity,
          previousAmount: item.previousAmount
        });
        
        // 기존 데이터 확인 (품명과 규격으로 중복 체크)
        const existingQuery = query(
          collection(db, 'gisung_items'),
          where('name', '==', item.name),
          where('specification', '==', item.specification)
        );
        
        const existingSnapshot = await getDocs(existingQuery);
        
        if (!existingSnapshot.empty) {
          // 기존 데이터 업데이트
          const existingDoc = existingSnapshot.docs[0];
          await updateDoc(doc(db, 'gisung_items', existingDoc.id), {
            ...item,
            updatedAt: new Date()
          });
          console.log(`🔄 기존 데이터 업데이트: ${item.name} (금회기성: ${item.currentQuantity}, 누계: ${item.totalQuantity})`);
        } else {
          // 새 데이터 추가
          await addDoc(collection(db, 'gisung_items'), {
            ...item,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log(`➕ 새 데이터 추가: ${item.name} (금회기성: ${item.currentQuantity}, 누계: ${item.totalQuantity})`);
        }
        
        savedCount++;
        
      } catch (itemError) {
        console.error(`❌ 항목 저장 실패 (${item.name}):`, itemError);
        // 개별 항목 실패해도 계속 진행
      }
    }
    
    // 요약 데이터 저장
    const summaryData = {
      totalItems: gisungData.length,
      totalContractAmount: gisungData.reduce((sum, item) => sum + (item.contractAmount || 0), 0),
      totalCurrentAmount: gisungData.reduce((sum, item) => sum + (item.currentAmount || 0), 0),
      totalPreviousAmount: gisungData.reduce((sum, item) => sum + (item.previousAmount || 0), 0),
      uploadDate: new Date(),
      source: 'excel_upload'
    };
    
    await addDoc(collection(db, 'gisung_summaries'), summaryData);
    console.log('📊 요약 데이터 저장 완료');
    
    return savedCount;
    
  } catch (error) {
    console.error('❌ 파이어베이스 저장 실패:', error);
    throw new Error('파이어베이스 저장 중 오류가 발생했습니다: ' + error.message);
  }
};

// 저장된 기성금 데이터 조회
export const getGisungDataFromFirebase = async () => {
  try {
    console.log('📥 파이어베이스에서 기성금 데이터 조회...');
    
    const querySnapshot = await getDocs(collection(db, 'gisung_items'));
    const gisungData = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📊 조회된 기성금 데이터: ${gisungData.length}개 항목`);
    
    // 금회기성이 있는 항목들 확인
    const itemsWithCurrentQuantity = gisungData.filter(item => item.currentQuantity > 0);
    console.log(`💰 금회기성이 있는 항목: ${itemsWithCurrentQuantity.length}개`);
    
    if (itemsWithCurrentQuantity.length > 0) {
      itemsWithCurrentQuantity.forEach(item => {
        console.log(`  - ${item.name}: ${item.currentQuantity} ${item.unit}, ${item.currentAmount}원`);
      });
    }
    
    if (gisungData.length === 0) {
      console.log('⚠️ 기성금 데이터가 없습니다. 빈 배열 반환');
      return [];
    }
    
    return gisungData;
    
  } catch (error) {
    console.error('❌ 기성금 데이터 조회 실패:', error);
    console.log('⚠️ 에러 발생으로 빈 배열 반환');
    return [];
  }
};

// 기성금 데이터 삭제
export const deleteGisungDataFromFirebase = async () => {
  try {
    console.log('🗑️ 기성금 데이터 삭제 시작...');
    
    // gisung_items 컬렉션의 모든 문서 삭제
    const itemsSnapshot = await getDocs(collection(db, 'gisung_items'));
    const deletePromises = itemsSnapshot.docs.map(doc => 
      deleteDoc(doc(db, 'gisung_items', doc.id))
    );
    await Promise.all(deletePromises);
    
    // gisung_summaries 컬렉션의 모든 문서 삭제
    const summariesSnapshot = await getDocs(collection(db, 'gisung_summaries'));
    const deleteSummaryPromises = summariesSnapshot.docs.map(doc => 
      deleteDoc(doc(db, 'gisung_summaries', doc.id))
    );
    await Promise.all(deleteSummaryPromises);
    
    console.log('✅ 기성금 데이터 삭제 완료');
    return {
      success: true,
      message: '기성금 데이터가 성공적으로 삭제되었습니다.',
      deletedItems: itemsSnapshot.size,
      deletedSummaries: summariesSnapshot.size
    };
    
  } catch (error) {
    console.error('❌ 기성금 데이터 삭제 실패:', error);
    throw error;
  }
};

// 기성금 데이터를 현장관리 시스템에서 사용할 수 있도록 변환
export const convertGisungDataForSiteManagement = async (siteName) => {
  try {
    console.log(`🔄 기성금 데이터를 현장관리용으로 변환: ${siteName}`);
    
    const gisungData = await getGisungDataFromFirebase();
    
    if (!gisungData || gisungData.length === 0) {
      console.log('⚠️ 기성금 데이터가 없어서 빈 배열 반환');
      return [];
    }
    
    // 현장관리 시스템에서 사용하는 형태로 변환
    const siteItems = gisungData.map(item => ({
      name: item.name,                 // 규격 (B열)
      specification: item.specification, // 품명 (A열)
      unit: item.unit,
      quantity: item.quantity || item.contractQuantity || 0,
      price: item.unitPrice || item.contractUnitPrice || 0,
      contractAmount: item.contractAmount,
      previousQuantity: item.previousQuantity,
      previousAmount: item.previousAmount,
      currentQuantity: item.currentQuantity,
      currentAmount: item.currentAmount,
      totalQuantity: item.totalQuantity,
      totalAmount: item.totalAmount,
      progress: item.progress,
      siteName: siteName,
      source: 'gisung_upload'
    }));
    
    console.log(`✅ 현장관리용 데이터 변환 완료: ${siteItems.length}개 항목`);
    return siteItems;
    
  } catch (error) {
    console.error('❌ 현장관리용 데이터 변환 실패:', error);
    console.log('⚠️ 에러 발생으로 빈 배열 반환');
    return [];
  }
};

// 기성금 데이터를 기성금청구서 생성에 사용할 수 있도록 변환
export const convertGisungDataForGisungReport = async () => {
  try {
    console.log('🔄 기성금 데이터를 기성금청구서용으로 변환...');
    
    const gisungData = await getGisungDataFromFirebase();
    
    // 기성금청구서에서 사용하는 형태로 변환
    const reportItems = gisungData.map(item => ({
      name: item.name,
      specification: item.specification,
      unit: item.unit,
      contractQuantity: item.contractQuantity,
      contractUnitPrice: item.contractUnitPrice,
      contractAmount: item.contractAmount,
      previousQuantity: item.previousQuantity,
      previousAmount: item.previousAmount,
      currentQuantity: item.currentQuantity,
      currentAmount: item.currentAmount,
      totalQuantity: item.totalQuantity,
      totalAmount: item.totalAmount,
      progress: item.progress
    }));
    
    console.log(`✅ 기성금청구서용 데이터 변환 완료: ${reportItems.length}개 항목`);
    return reportItems;
    
  } catch (error) {
    console.error('❌ 기성금청구서용 데이터 변환 실패:', error);
    throw error;
  }
};

// 기성금 데이터를 물량데이터 형태로 변환
export const convertGisungDataToQuantityData = async () => {
  try {
    console.log('🔄 기성금 데이터를 물량데이터로 변환...');
    
    const gisungData = await getGisungDataFromFirebase();
    
    // 물량데이터 형태로 변환 (현장관리 시스템과 호환)
    const quantityData = gisungData.map(item => ({
      name: item.name,
      specification: item.specification,
      unit: item.unit,
      quantity: item.contractQuantity,
      price: item.contractUnitPrice,
      amount: item.contractAmount,
      // 기성금 관련 데이터는 별도 필드로 보관
      gisungData: {
        previousQuantity: item.previousQuantity,
        previousAmount: item.previousAmount,
        currentQuantity: item.currentQuantity,
        currentAmount: item.currentAmount,
        totalQuantity: item.totalQuantity,
        totalAmount: item.totalAmount,
        progress: item.progress
      }
    }));
    
    console.log(`✅ 물량데이터 변환 완료: ${quantityData.length}개 항목`);
    return quantityData;
    
  } catch (error) {
    console.error('❌ 물량데이터 변환 실패:', error);
    throw error;
  }
};

// 기성금 데이터 유효성 검증
export const validateGisungData = (gisungData) => {
  const errors = [];
  
  if (!Array.isArray(gisungData)) {
    errors.push('데이터가 배열 형태가 아닙니다.');
    return errors;
  }
  
  gisungData.forEach((item, index) => {
    if (!item.name) {
      errors.push(`${index + 1}번째 항목: 품명이 없습니다.`);
    }
    
    if (item.contractQuantity && item.contractQuantity < 0) {
      errors.push(`${index + 1}번째 항목: 계약수량이 음수입니다.`);
    }
    
    if (item.contractUnitPrice && item.contractUnitPrice < 0) {
      errors.push(`${index + 1}번째 항목: 계약단가가 음수입니다.`);
    }
    
    if (item.currentQuantity && item.currentQuantity < 0) {
      errors.push(`${index + 1}번째 항목: 금회기성수량이 음수입니다.`);
    }
    
    if (item.progress && (item.progress < 0 || item.progress > 100)) {
      errors.push(`${index + 1}번째 항목: 진도율이 0-100 범위를 벗어났습니다.`);
    }
  });
  
  return errors;
};

// 기성금 데이터 통계 계산
export const calculateGisungStatistics = (gisungData) => {
  if (!Array.isArray(gisungData) || gisungData.length === 0) {
    return {
      totalItems: 0,
      totalContractAmount: 0,
      totalCurrentAmount: 0,
      totalPreviousAmount: 0,
      totalAmount: 0,
      averageProgress: 0
    };
  }
  
  const statistics = {
    totalItems: gisungData.length,
    totalContractAmount: gisungData.reduce((sum, item) => sum + (item.contractAmount || 0), 0),
    totalCurrentAmount: gisungData.reduce((sum, item) => sum + (item.currentAmount || 0), 0),
    totalPreviousAmount: gisungData.reduce((sum, item) => sum + (item.previousAmount || 0), 0),
    totalAmount: gisungData.reduce((sum, item) => sum + (item.totalAmount || 0), 0),
    averageProgress: gisungData.reduce((sum, item) => sum + (item.progress || 0), 0) / gisungData.length
  };
  
  return statistics;
};

// 기성금 데이터 필터링
export const filterGisungData = (gisungData, filters = {}) => {
  let filteredData = [...gisungData];
  
  if (filters.name) {
    const nameLower = filters.name.toLowerCase();
    filteredData = filteredData.filter(item => 
      item.name && item.name.toLowerCase().includes(nameLower)
    );
  }
  
  if (filters.specification) {
    const specLower = filters.specification.toLowerCase();
    filteredData = filteredData.filter(item => 
      item.specification && item.specification.toLowerCase().includes(specLower)
    );
  }
  
  if (filters.hasCurrentQuantity) {
    filteredData = filteredData.filter(item => 
      item.currentQuantity && item.currentQuantity > 0
    );
  }
  
  if (filters.hasContractAmount) {
    filteredData = filteredData.filter(item => 
      item.contractAmount && item.contractAmount > 0
    );
  }
  
  if (filters.minProgress !== undefined) {
    filteredData = filteredData.filter(item => 
      item.progress && item.progress >= filters.minProgress
    );
  }
  
  if (filters.maxProgress !== undefined) {
    filteredData = filteredData.filter(item => 
      item.progress && item.progress <= filters.maxProgress
    );
  }
  
  return filteredData;
};

// 기성금 데이터 정렬
export const sortGisungData = (gisungData, sortBy = 'name', sortOrder = 'asc') => {
  const sortedData = [...gisungData];
  
  sortedData.sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    // 숫자 필드인 경우 숫자로 비교
    if (['contractQuantity', 'contractUnitPrice', 'contractAmount', 
         'previousQuantity', 'previousAmount', 'currentQuantity', 
         'currentAmount', 'totalQuantity', 'totalAmount', 'progress'].includes(sortBy)) {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    } else {
      // 문자열 필드인 경우 문자열로 비교
      aValue = String(aValue || '').toLowerCase();
      bValue = String(bValue || '').toLowerCase();
    }
    
    if (sortOrder === 'desc') {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    } else {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    }
  });
  
  return sortedData;
};

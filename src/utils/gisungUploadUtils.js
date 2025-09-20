import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';

// 기성금청구서 엑셀 업로드 처리 함수
export const parseGisungExcelUpload = async (file, siteData) => {
  try {
    console.log('📊 기성금청구서 업로드 시작:', file.name);
    
    // 파일 읽기
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    
    // 갑지 시트에서 전회기성, 선급금, 기성월 추출
    const gapjiSheet = workbook.Sheets['갑지'];
    let previousGisungResult = 0;
    let advancePaymentResult = 0;
    let gisungMonth = '';
    let currentGisungResult = 0;
    
    if (gapjiSheet) {
      console.log('📋 갑지 시트에서 전회기성과 선급금 추출 중...');
      
      // 전회기성 값 추출 (H18 셀) - result 필드 우선 확인
      const previousGisungCell = gapjiSheet['H18'];
      console.log(`🔍 H18 셀 전체 데이터:`, previousGisungCell);
      
      if (previousGisungCell) {
        // result 필드가 있으면 우선 사용 (수식 계산 결과)
        if (previousGisungCell.result !== undefined && previousGisungCell.result !== null) {
          previousGisungResult = previousGisungCell.result;
          console.log(`📊 전회기성 result 값 (수식 계산 결과): ${previousGisungResult}`);
        }
        // result가 없으면 v 값 사용 (직접 입력된 값)
        else if (previousGisungCell.v !== undefined && previousGisungCell.v !== null) {
          previousGisungResult = previousGisungCell.v;
          console.log(`📊 전회기성 v 값 (직접 입력): ${previousGisungResult}`);
        }
        // f 필드가 있으면 수식 확인
        else if (previousGisungCell.f) {
          console.log(`📊 H18 셀 수식: ${previousGisungCell.f}`);
          // 수식이 있지만 계산 결과가 없는 경우 기본값 사용
          previousGisungResult = 0;
          console.log(`📊 전회기성 수식 존재하지만 계산 결과 없음, 기본값 사용: ${previousGisungResult}`);
        }
        else {
          console.log(`📊 H18 셀에 값이 없음, 기본값 사용: ${previousGisungResult}`);
        }
      } else {
        console.log(`📊 H18 셀을 찾을 수 없음, 기본값 사용: ${previousGisungResult}`);
      }
      
      // 선급금 값 추출 (H16 셀) - result 필드 우선 확인
      const advancePaymentCell = gapjiSheet['H16'];
      console.log(`🔍 H16 셀 전체 데이터:`, advancePaymentCell);
      
      if (advancePaymentCell) {
        // result 필드가 있으면 우선 사용 (수식 계산 결과)
        if (advancePaymentCell.result !== undefined && advancePaymentCell.result !== null) {
          advancePaymentResult = advancePaymentCell.result;
          console.log(`📊 선급금 result 값 (수식 계산 결과): ${advancePaymentResult}`);
        }
        // result가 없으면 v 값 사용 (직접 입력된 값)
        else if (advancePaymentCell.v !== undefined && advancePaymentCell.v !== null) {
          advancePaymentResult = advancePaymentCell.v;
          console.log(`📊 선급금 v 값 (직접 입력): ${advancePaymentResult}`);
        }
        // f 필드가 있으면 수식 확인
        else if (advancePaymentCell.f) {
          console.log(`📊 H16 셀 수식: ${advancePaymentCell.f}`);
          // 수식이 있지만 계산 결과가 없는 경우 기본값 사용
          advancePaymentResult = 0;
          console.log(`📊 선급금 수식 존재하지만 계산 결과 없음, 기본값 사용: ${advancePaymentResult}`);
        }
        else {
          console.log(`📊 H16 셀에 값이 없음, 기본값 사용: ${advancePaymentResult}`);
        }
      } else {
        console.log(`📊 H16 셀을 찾을 수 없음, 기본값 사용: ${advancePaymentResult}`);
      }
      
      // 기성월 추출 (A36 셀)
      const gisungMonthCell = gapjiSheet['A36'];
      console.log(`🔍 A36 셀 전체 데이터:`, gisungMonthCell);
      
      if (gisungMonthCell && gisungMonthCell.v) {
        gisungMonth = String(gisungMonthCell.v).trim();
        console.log(`📊 기성월 추출: ${gisungMonth}`);
      } else {
        // 기본값으로 현재 월 설정
        const now = new Date();
        gisungMonth = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}`;
        console.log(`📊 기성월 기본값 설정: ${gisungMonth}`);
      }
      
      // 금회기성 추출 (H20 셀)
      const currentGisungCell = gapjiSheet['H20'];
      console.log(`🔍 H20 셀 전체 데이터:`, currentGisungCell);
      
      if (currentGisungCell) {
        // result 필드가 있으면 우선 사용 (수식 계산 결과)
        if (currentGisungCell.result !== undefined && currentGisungCell.result !== null) {
          currentGisungResult = currentGisungCell.result;
          console.log(`📊 금회기성 result 값 (수식 계산 결과): ${currentGisungResult}`);
        }
        // result가 없으면 v 값 사용 (직접 입력된 값)
        else if (currentGisungCell.v !== undefined && currentGisungCell.v !== null) {
          currentGisungResult = currentGisungCell.v;
          console.log(`📊 금회기성 v 값 (직접 입력): ${currentGisungResult}`);
        }
        // f 필드가 있으면 수식 확인
        else if (currentGisungCell.f) {
          console.log(`📊 H20 셀 수식: ${currentGisungCell.f}`);
          // 수식이 있지만 계산 결과가 없는 경우 기본값 사용
          currentGisungResult = 0;
          console.log(`📊 금회기성 수식 존재하지만 계산 결과 없음, 기본값 사용: ${currentGisungResult}`);
        }
        else {
          console.log(`📊 H20 셀에 값이 없음, 기본값 사용: ${currentGisungResult}`);
        }
      } else {
        console.log(`📊 H20 셀을 찾을 수 없음, 기본값 사용: ${currentGisungResult}`);
      }
    }
    
    // 기성금 내역서 시트에서 데이터 추출
    const detailSheet = workbook.Sheets['기성금 내역서'];
    const jsonData = detailSheet ? XLSX.utils.sheet_to_json(detailSheet, { header: 1 }) : [];
    
    // K값을 G값으로 복사하는 로직 추가
    if (detailSheet) {
      console.log('📊 K값을 G값으로 복사 중...');
      
      // 6행부터 50행까지 모든 행의 K열 값을 G열로 복사
      for (let row = 6; row <= 50; row++) {
        const cellK = detailSheet[`K${row}`]; // K열 (누계수량)
        
        // K열에 값이 있든 없든 G열에 복사 (값이 없으면 0으로 설정)
        let kValue = 0;
        
        if (cellK) {
          // result 필드가 있으면 우선 사용 (수식 계산 결과)
          if (cellK.result !== undefined && cellK.result !== null) {
            kValue = cellK.result;
            console.log(`📊 행 ${row}: K열 수식 계산 결과 사용 - ${kValue}`);
          }
          // result가 없으면 v 값 사용 (직접 입력된 값)
          else if (cellK.v !== undefined && cellK.v !== null) {
            kValue = cellK.v;
            console.log(`📊 행 ${row}: K열 직접 입력값 사용 - ${kValue}`);
          }
          // f 필드가 있으면 수식 확인
          else if (cellK.f) {
            console.log(`📊 행 ${row}: K열 수식 존재하지만 계산 결과 없음 - ${cellK.f}`);
            // 수식이 있지만 계산 결과가 없는 경우 기본값 사용
            kValue = 0;
          }
          else {
            console.log(`📊 행 ${row}: K열에 값이 없음`);
          }
        } else {
          console.log(`📊 행 ${row}: K열 셀이 존재하지 않음`);
        }
        
        // G열에 값 설정 (셀이 없으면 생성)
        if (!detailSheet[`G${row}`]) {
          detailSheet[`G${row}`] = {};
        }
        detailSheet[`G${row}`].v = kValue;
        detailSheet[`G${row}`].result = kValue;
        
        console.log(`📊 행 ${row}: K값(${kValue}) → G값으로 복사 완료`);
      }
      
      // 수정된 데이터로 jsonData 다시 생성
      const updatedJsonData = XLSX.utils.sheet_to_json(detailSheet, { header: 1 });
      jsonData.length = 0; // 기존 배열 비우기
      jsonData.push(...updatedJsonData); // 새로운 데이터로 교체
      
      console.log('✅ 6행부터 50행까지 모든 K값을 G값으로 복사 완료');
    }
    
    // 모든 항목의 K값과 L값 추출 (누계수량과 누계금액)
    const extractedItems = [];
    
    if (detailSheet) {
      console.log('📊 기성금 내역서 시트에서 모든 항목의 누계수량 데이터 추출 중...');
      
      // 6행부터 50행까지 모든 행의 K값과 L값 추출 (무조건 저장)
      for (let row = 6; row <= 50; row++) {
        const cellA = detailSheet[`A${row}`]; // 품명
        const cellB = detailSheet[`B${row}`]; // 규격
        const cellK = detailSheet[`K${row}`]; // K열 (누계수량)
        const cellL = detailSheet[`L${row}`]; // L열 (누계금액)
        
        // 품명이 있든 없든 모든 행의 K값과 L값을 저장
        const itemName = cellA && cellA.v ? String(cellA.v).trim() : `행${row}`;
        const specification = cellB && cellB.v ? String(cellB.v).trim() : '';
        
        // K값과 L값 추출 (result 필드 우선, 없으면 v 값, 없으면 0)
        let kValue = 0;
        let lValue = 0;
        
        if (cellK) {
          if (cellK.result !== undefined && cellK.result !== null) {
            kValue = cellK.result;
          } else if (cellK.v !== undefined && cellK.v !== null) {
            kValue = cellK.v;
          }
        }
        
        if (cellL) {
          if (cellL.result !== undefined && cellL.result !== null) {
            lValue = cellL.result;
          } else if (cellL.v !== undefined && cellL.v !== null) {
            lValue = cellL.v;
          }
        }
        
        // 모든 행의 데이터를 저장 (K값이 0이어도, 빈 셀이어도 저장)
        extractedItems.push({
          itemName: itemName,
          specification: specification,
          kValue: kValue,
          lValue: lValue,
          isSpecialItem: false,
          row: row,
          hasData: !!(cellA && cellA.v) // 실제 데이터가 있는지 여부
        });
        
        console.log(`📊 행 ${row}: ${itemName} - K값: ${kValue}, L값: ${lValue}`);
      }
      
      console.log(`✅ 6행부터 50행까지 총 ${extractedItems.length}개 행의 K값과 L값 추출 완료`);
    }
    
    console.log('📊 엑셀 데이터 읽기 완료:', jsonData.length, '행');
    console.log('📊 추출된 특수 항목:', extractedItems);
    console.log('📊 갑지 데이터:', { previousGisungResult, advancePaymentResult });
    
    // 차수 계산 (해당 현장의 모든 기성 데이터 개수 + 1, 1차부터 시작)
    let sequence = 1; // 기본값
    try {
      // 해당 현장의 모든 기성 데이터 개수 조회 (청구완료 상태와 관계없이)
      const allGisungQuery = query(
        collection(db, 'gisung'),
        where('siteId', '==', siteData.id)
      );
      const allGisungSnapshot = await getDocs(allGisungQuery);
      sequence = allGisungSnapshot.size + 1; // 1차부터 시작
      
      console.log(`📊 차수 계산: ${siteData.name} - 전체 기성 데이터 ${allGisungSnapshot.size}개 → ${sequence}차`);
    } catch (error) {
      console.error('❌ 기성 데이터 조회 실패:', error);
      // 에러 발생 시 기본값으로 1차 설정
      console.log(`📊 차수 계산 실패로 기본값 사용: ${sequence}차`);
    }
    
    // 기성금청구서 데이터 추출 및 처리
    // Firestore에 저장 가능한 형태로 데이터 변환
    const gisungData = {
      siteId: siteData.id,
      siteName: siteData.name,
      sequence: sequence,
      uploadDate: serverTimestamp(),
      fileName: file.name,
      status: '업로드완료',
      // 2차원 배열을 문자열로 변환하여 저장
      data: JSON.stringify(jsonData),
      // 갑지에서 추출한 result 값들 저장
      previousGisungResult: previousGisungResult,
      advancePaymentResult: advancePaymentResult,
      // 특수 항목들의 K값과 L값을 문자열로 변환하여 저장
      extractedItems: JSON.stringify(extractedItems)
    };
    
    // gisung_uploads 컬렉션에 저장
    const docRef = await addDoc(collection(db, 'gisung_uploads'), gisungData);
    
    // 누계기성 데이터 저장 (각 항목별 K값 저장)
    try {
      const { saveCumulativeGisungData } = await import('./gisungTemplateUtils');
      await saveCumulativeGisungData(siteData.id, `${sequence}차`, extractedItems);
      console.log('✅ 누계기성 데이터 저장 완료');
    } catch (cumulativeError) {
      console.warn('⚠️ 누계기성 데이터 저장 실패:', cumulativeError);
    }
    
    // gisung 컬렉션에도 저장 (테이블 표시용)
    const gisungTableData = {
      name: siteData.name,
      siteId: siteData.id,
      sequence: `${sequence}차`,
      status: '미청구',
      claimStatus: '미청구',
      contractAmount: Number(siteData?.contractAmount || 0),
      advance: Number(siteData?.advance || 0),
      prevGisung: previousGisungResult, // 전회기성 값 저장
      gisungAmount: currentGisungResult, // 금회기성 값 저장
      gisungMonth: gisungMonth, // 갑지에서 추출한 기성월
      note: '기성금청구서 업로드',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const gisungDocRef = await addDoc(collection(db, 'gisung'), gisungTableData);
    console.log('✅ gisung 컬렉션에 테이블 데이터 저장 완료:', gisungDocRef.id);
    
    console.log('✅ 기성금청구서 업로드 완료:', docRef.id);
    
    return {
      success: true,
      message: `${sequence}차 기성금청구서가 성공적으로 업로드되었습니다.`,
      docId: docRef.id,
      sequence: sequence,
      data: jsonData // 데이터 항목 수를 표시하기 위해 추가
    };
    
  } catch (error) {
    console.error('❌ 기성금청구서 업로드 실패:', error);
    throw new Error(`기성금청구서 업로드 중 오류가 발생했습니다: ${error.message}`);
  }
};

// 기성금청구서 데이터 조회 함수
export const getGisungUploads = async (siteId) => {
  try {
    const q = query(
      collection(db, 'gisung_uploads'),
      where('siteId', '==', siteId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // 문자열로 저장된 데이터를 다시 객체/배열로 변환
        data: data.data ? JSON.parse(data.data) : [],
        extractedItems: data.extractedItems ? JSON.parse(data.extractedItems) : []
      };
    });
  } catch (error) {
    console.error('❌ 기성금청구서 데이터 조회 실패:', error);
    throw error;
  }
};

// 기성금청구서 엑셀 다운로드 함수
export const downloadGisungExcel = (gisungData, fileName = '기성금청구서') => {
  try {
    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    
    // 데이터를 워크시트로 변환
    const worksheet = XLSX.utils.json_to_sheet(gisungData);
    
    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(workbook, worksheet, '기성금청구서');
    
    // 엑셀 파일 다운로드
    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    console.log('✅ 기성금청구서 다운로드 완료');
    return true;
  } catch (error) {
    console.error('❌ 기성금청구서 다운로드 실패:', error);
    return false;
  }
};

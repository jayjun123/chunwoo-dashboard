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
    
    // 갑지 시트에서 전회기성과 선급금 추출
    const gapjiSheet = workbook.Sheets['갑지'];
    let previousGisungResult = 0;
    let advancePaymentResult = 0;
    
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
    }
    
    // 기성금 내역서 시트에서 데이터 추출
    const detailSheet = workbook.Sheets['기성금 내역서'];
    const jsonData = detailSheet ? XLSX.utils.sheet_to_json(detailSheet, { header: 1 }) : [];
    
    // 특수 항목들의 K값과 L값 추출
    const extractedItems = [];
    const specialItems = ['단수정리', 'NEGO', '간접비', '이익', '부가세'];
    
    if (detailSheet) {
      console.log('📊 기성금 내역서 시트에서 특수 항목 데이터 추출 중...');
      
      // 6행부터 데이터 시작 (헤더는 5행)
      for (let row = 6; row <= 50; row++) {
        const cellA = detailSheet[`A${row}`]; // 품명
        const cellB = detailSheet[`B${row}`]; // 규격
        const cellK = detailSheet[`K${row}`]; // K열 (누계수량)
        const cellL = detailSheet[`L${row}`]; // L열 (누계금액)
        
        if (cellA && cellA.v) {
          const itemName = String(cellA.v).trim();
          const specification = cellB ? String(cellB.v || '').trim() : '';
          
          // 특수 항목 판별 (A와 B가 같거나 특수 항목명 포함)
          const isSpecialItem = (itemName && specification && itemName === specification) ||
                               specialItems.some(special => itemName.includes(special)) ||
                               specialItems.some(special => specification.includes(special));
          
          if (isSpecialItem) {
            // K값과 L값 추출 (result 필드 우선)
            let kValue = null;
            let lValue = null;
            
            if (cellK) {
              kValue = cellK.result !== undefined ? cellK.result : cellK.v;
            }
            if (cellL) {
              lValue = cellL.result !== undefined ? cellL.result : cellL.v;
            }
            
            extractedItems.push({
              itemName: itemName,
              specification: specification,
              kValue: kValue,
              lValue: lValue,
              isSpecialItem: true,
              row: row
            });
            
            console.log(`📊 특수 항목 발견: ${itemName} - K값: ${kValue}, L값: ${lValue}`);
          }
        }
      }
    }
    
    console.log('📊 엑셀 데이터 읽기 완료:', jsonData.length, '행');
    console.log('📊 추출된 특수 항목:', extractedItems);
    console.log('📊 갑지 데이터:', { previousGisungResult, advancePaymentResult });
    
    // 차수 계산 (해당 현장의 청구완료된 기성 데이터 개수 + 1, 1차부터 시작)
    let sequence = 1; // 기본값
    try {
      // 해당 현장의 청구완료된 기성 데이터 개수 조회
      const completedGisungQuery = query(
        collection(db, 'gisung'),
        where('siteId', '==', siteData.id),
        where('claimStatus', '==', '청구완료')
      );
      const completedGisungSnapshot = await getDocs(completedGisungQuery);
      sequence = completedGisungSnapshot.size + 1; // 1차부터 시작
      
      console.log(`📊 차수 계산: ${siteData.name} - 청구완료 ${completedGisungSnapshot.size}개 → ${sequence}차`);
    } catch (error) {
      console.error('❌ 청구완료 기성 데이터 조회 실패:', error);
      // 에러 발생 시 기본값으로 1차 설정
      console.log(`📊 차수 계산 실패로 기본값 사용: ${sequence}차`);
    }
    
    // 기성금청구서 데이터 추출 및 처리
    const gisungData = {
      siteId: siteData.id,
      siteName: siteData.name,
      sequence: sequence,
      uploadDate: serverTimestamp(),
      fileName: file.name,
      status: '업로드완료',
      data: jsonData,
      // 갑지에서 추출한 result 값들 저장
      previousGisungResult: previousGisungResult,
      advancePaymentResult: advancePaymentResult,
      // 특수 항목들의 K값과 L값 저장
      extractedItems: extractedItems
    };
    
    // gisung_uploads 컬렉션에 저장
    const docRef = await addDoc(collection(db, 'gisung_uploads'), gisungData);
    
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
      gisungAmount: 0, // 업로드 시에는 0으로 설정
      gisungMonth: new Date().toISOString().slice(0, 7), // 현재 월
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
      sequence: sequence
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
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
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

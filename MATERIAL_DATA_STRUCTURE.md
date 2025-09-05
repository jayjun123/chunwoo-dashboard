# 물량데이터 공통 구조 가이드

## 개요

견적서, 납품계약서, 기성금청구서에서 공통으로 사용되는 물량데이터를 일관된 구조로 관리하는 시스템입니다.

## 핵심 데이터 구조

### 1. 품목-규격-단위-물량 세트 (기본 정보)
```
{
  name: "품목명",           // 품목명
  specification: "규격",    // 규격 (A열)
  unit: "단위",            // 단위
  quantity: 100            // 물량
}
```

### 2. 단가 정보 (견적서/납품계약서용)
```
{
  JEprice: 1000,          // E열 - 재료비 단가
  NOprice: 500,           // G열 - 노무비 단가
  KYprice: 300            // I열 - 경비 단가
}
```

### 3. 합계 단가 (기성금청구서용)
```
{
  unitPrice: 1800,        // K열 - 합계 단가 (재료비+노무비+경비)
  amount: 180000          // L열 - 합계 금액 (수량 × 합계단가)
}
```

## 문서별 사용법

### 견적서 (estimate)
- **사용 데이터**: 품목-규격-단위-물량 세트 + 자재비/노무비/경비 단가
- **목적**: 세부 내역을 통한 정확한 견적 산출
- **셀 매핑**: A열(규격), B열(품명), E열(재료비), G열(노무비), I열(경비)

### 납품계약서 (delivery)
- **사용 데이터**: 품목-규격-단위-물량 세트 + 자재비/노무비/경비 단가
- **목적**: 계약 조건에 따른 세부 내역 제공
- **셀 매핑**: A열(품명), B열(규격), E열(단가), F열(금액)

### 기성금청구서 (progress)
- **사용 데이터**: 품목-규격-단위-물량 세트 + 합계단가
- **목적**: 기성률 계산 및 기성금액 산출
- **셀 매핑**: A열(품명), B열(규격), H열(합계단가), J열(기성률), K열(기성금액)

## 업로드 과정

### 1. 엑셀 파일 파싱
```javascript
const parseResult = await parseEstimateExcel(file, siteId, siteName);
```
- 견적서 엑셀 파일에서 물량데이터 추출
- 품목-규격-단위-물량 세트 + 자재비/노무비/경비/합계단가 파싱

### 2. 파이어베이스 저장
```javascript
const saveResult = await saveMaterialDataToFirebase(siteId, siteName, parseResult.data);
```
- `materialEstimates` 컬렉션에 전체 데이터 저장
- `sites` 컬렉션에 물량데이터 요약 정보 저장

### 3. 데이터 변환
```javascript
// 현장관리용
const siteManagementData = convertMaterialDataForSiteManagement(materialData);

// 문서별 변환
const estimateData = convertMaterialDataForDocument(items, 'estimate');
const deliveryData = convertMaterialDataForDocument(items, 'delivery');
const progressData = convertMaterialDataForDocument(items, 'progress');
```

## 저장되는 데이터 구조

### materialEstimates 컬렉션
```javascript
{
  siteId: "현장ID",
  siteName: "현장명",
  items: [
    {
      // === 기본 정보 (품목-규격-단위-물량 세트) ===
      name: "품목명",
      specification: "규격",
      unit: "단위",
      quantity: 100,
      
      // === 단가 정보 (견적서/납품계약서용) ===
      JEprice: 1000,    // 재료비 단가
      NOprice: 500,     // 노무비 단가
      KYprice: 300,     // 경비 단가
      
      // === 합계 단가 (기성금청구서용) ===
      unitPrice: 1800,  // 합계 단가
      
      // === 금액 정보 ===
      amount: 180000,   // 합계 금액
      
      // === 셀 주소 정보 ===
      A5: "품목명",     // A5, A6, A7... 형태로 저장
      B5: "규격",
      C5: "단위",
      // ... 기타 열들
    }
  ],
  summary: {
    totalContractAmount: 1000000,  // 총공사계
    totalVat: 100000,             // 부가세
    contractAmount: 1100000,      // 계약금액
    itemsCount: 50                // 항목 수
  }
}
```

### sites 컬렉션 (요약 정보)
```javascript
{
  // ... 기타 현장 정보
  contractAmount: 1100000,        // 계약금액
  materialEstimateId: "문서ID",   // 물량데이터 문서 참조
  lastMaterialUpdate: "2024-01-01", // 마지막 업데이트
  items: [
    {
      // === 기본 정보 (품목-규격-단위-물량 세트) ===
      name: "품목명",
      specification: "규격",
      unit: "단위",
      quantity: 100,
      
      // === 단가 정보 ===
      JEprice: 1000,    // 재료비 단가
      NOprice: 500,     // 노무비 단가
      KYprice: 300,     // 경비 단가
      unitPrice: 1800,  // 합계 단가
      
      // === 금액 정보 ===
      amount: 180000    // 합계 금액
    }
  ]
}
```

## 주요 함수들

### parseEstimateExcel(file, siteId, siteName)
- 견적서 엑셀 파일 파싱
- 품목-규격-단위-물량 세트 + 단가 정보 추출

### saveMaterialDataToFirebase(siteId, siteName, parsedData)
- 파싱된 데이터를 파이어베이스에 저장
- materialEstimates + sites 컬렉션 동시 업데이트

### convertMaterialDataForDocument(items, documentType)
- 문서 타입별로 데이터 변환
- estimate, delivery, progress 지원

### convertMaterialDataForSiteManagement(materialData)
- 현장관리용 데이터 형식으로 변환
- 품목-규격-단위-물량 세트 + 합계단가/금액

## 사용 예시

### 물량데이터 업로드
```javascript
import { uploadMaterialData } from '../utils/materialUploadUtils';

const result = await uploadMaterialData(file, siteId, siteName);
if (result.success) {
  console.log('업로드 완료:', result.data.items.length, '개 항목');
}
```

### 물량데이터 조회
```javascript
import { getMaterialDataFromFirebase } from '../utils/materialUploadUtils';

const result = await getMaterialDataFromFirebase(siteId);
if (result.success) {
  const materialData = result.data;
  // 품목-규격-단위-물량 세트 + 단가 정보 사용
}
```

### 문서별 데이터 변환
```javascript
import { convertMaterialDataForDocument } from '../utils/materialDataUtils';

// 견적서용 데이터
const estimateData = convertMaterialDataForDocument(items, 'estimate');

// 기성금청구서용 데이터
const progressData = convertMaterialDataForDocument(items, 'progress');
```

## 장점

1. **일관성**: 모든 문서에서 동일한 물량데이터 구조 사용
2. **재사용성**: 한 번 업로드한 데이터를 여러 문서에서 활용
3. **유지보수성**: 중앙 집중식 데이터 관리로 일관성 유지
4. **확장성**: 새로운 문서 타입 추가 시 쉽게 확장 가능

## 주의사항

1. **데이터 무결성**: 품목-규격-단위-물량은 반드시 하나의 세트로 관리
2. **단가 정보**: 견적서/납품계약서는 자재비/노무비/경비, 기성금청구서는 합계단가 사용
3. **셀 주소**: A5, B5, C5 형태로 저장하여 엑셀 생성 시 정확한 위치에 데이터 입력



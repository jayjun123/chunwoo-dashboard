# L/N 템플릿 시스템 가이드 📋

## 개요
이 시스템은 현장의 물량 개수에 따라 자동으로 적절한 템플릿을 선택하는 L/N 표시 시스템입니다.

## 템플릿 구분

### 🔵 N (NEW) 템플릿
- **파일**: `NEW.xlsx`
- **용도**: 물량 20개 이하 현장
- **특징**: 간단한 형태, 1페이지 출력
- **색상**: 초록색 칩 (#4caf50)

### 🟠 L (LONG) 템플릿  
- **파일**: `LONG.xlsx`
- **용도**: 물량 21개 이상 현장
- **특징**: 상세한 형태, 2페이지 출력
- **색상**: 주황색 칩 (#ff9800)

## 자동 설정 규칙

### 현장 저장 시
```javascript
// 물량 개수에 따른 자동 templateType 설정
const itemCount = form.items?.length || 0;
const templateType = itemCount > 20 ? 'L' : 'N';
```

### 마이그레이션
- 기존 현장들의 templateType을 물량에 맞게 자동 업데이트
- 20개 이하: N, 21개 이상: L

## 파일 구조

```
public/
├── NEW.xlsx          # N 뉴기성 템플릿
└── LONG.xlsx         # L 롱기성 템플릿

Firebase Storage/
└── templates/
    ├── NEW.xlsx      # 업로드된 N 템플릿
    └── LONG.xlsx     # 업로드된 L 템플릿
```

## 사용법

### 1. 템플릿 파일 업로드
```bash
# Node.js 스크립트 실행
node upload_public_templates.js

# 또는 브라우저에서
uploadPublicTemplates()
```

### 2. 현장 생성/수정 시
- 물량 데이터 입력 시 자동으로 templateType 설정
- L/N 칩이 자동으로 표시됨

### 3. 기성금청구서 생성 시
- templateType에 따라 자동으로 적절한 템플릿 선택
- 물량 개수에 맞는 최적의 출력 형태 제공

## UI 표시

### 현장 관리 페이지
- 물량 내역 섹션에 L/N 칩 표시
- 칩 색상으로 템플릿 타입 구분
- 툴팁으로 상세 정보 제공

### 기성금청구서 생성
- 로딩 메시지에 템플릿 타입 표시
- 생성된 파일명에 템플릿 정보 포함

## 설정 및 커스터마이징

### 물량 기준 변경
```javascript
// src/pages/NewSites.jsx에서 수정
const templateType = itemCount > 20 ? 'L' : 'N'; // 20개 기준

// 다른 기준으로 변경하려면
const templateType = itemCount > 30 ? 'L' : 'N'; // 30개 기준
```

### 템플릿 파일명 변경
```javascript
// src/utils/gisungTemplateUtils.js에서 수정
if (siteData.templateType === 'L') {
  templateFileName = 'LONG.xlsx'; // 파일명 변경
}
```

## 문제 해결

### 템플릿 파일을 찾을 수 없는 경우
1. Firebase Storage에 파일이 업로드되었는지 확인
2. 파일 경로가 올바른지 확인
3. 파일명이 정확한지 확인

### templateType이 설정되지 않는 경우
1. 현장 저장 시 물량 데이터가 올바르게 입력되었는지 확인
2. 브라우저 콘솔에서 오류 메시지 확인
3. 마이그레이션 스크립트 실행 여부 확인

## 최적화 팁

1. **정기적인 마이그레이션**: 새로운 현장이 추가될 때마다 마이그레이션 실행
2. **템플릿 파일 관리**: Firebase Storage의 템플릿 파일들을 정기적으로 확인
3. **사용자 교육**: 현장 담당자들에게 L/N 표시의 의미 교육

## 지원 및 문의

문제가 발생하거나 추가 기능이 필요한 경우:
1. 브라우저 개발자 도구 콘솔 확인
2. Firebase Storage 상태 확인
3. 템플릿 파일 업로드 상태 확인

---

**마지막 업데이트**: 2024년 12월
**버전**: 1.0.0
























<<<<<<< HEAD


=======
>>>>>>> ae5decb092edae570c53532171b77e663caa0146























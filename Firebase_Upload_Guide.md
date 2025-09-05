# 🔥 Firebase 스토리지 템플릿 업로드 가이드

## 📋 개요
견적서와 납품계약서 다운로드 시 물량 타입(N/L)에 따라 다른 템플릿을 사용하기 위해 필요한 파일들을 Firebase 스토리지에 업로드하는 방법을 설명합니다.

## 🎯 업로드할 파일 목록

### 견적서 템플릿
- `(N)견적서.xlsx` - N 타입 (물량 20개 이하)
- `(L)견적서.xlsx` - L 타입 (물량 20개 초과)

### 납품계약서 템플릿
- `(N)납품계약서.xlsx` - N 타입 (물량 20개 이하)
- `(L)납품계약서.xlsx` - L 타입 (물량 20개 초과)

## 🚀 Firebase 콘솔에서 업로드하기

### 1단계: Firebase 콘솔 접속
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 해당 프로젝트 선택

### 2단계: Storage 메뉴 접속
1. 왼쪽 메뉴에서 **Storage** 클릭
2. **Files** 탭 확인

### 3단계: 폴더 생성
1. **Create folder** 버튼 클릭
2. 폴더명: `templates`
3. **Create** 클릭

### 4단계: 파일 업로드
각 템플릿 파일을 `templates` 폴더에 업로드:

#### 4-1. (N)견적서.xlsx 업로드
1. `templates` 폴더 클릭
2. **Upload file** 버튼 클릭
3. `(N)견적서.xlsx` 파일 선택
4. **Upload** 클릭

#### 4-2. (L)견적서.xlsx 업로드
1. **Upload file** 버튼 클릭
2. `(L)견적서.xlsx` 파일 선택
3. **Upload** 클릭

#### 4-3. (N)납품계약서.xlsx 업로드
1. **Upload file** 버튼 클릭
2. `(N)납품계약서.xlsx` 파일 선택
3. **Upload** 클릭

#### 4-4. (L)납품계약서.xlsx 업로드
1. **Upload file** 버튼 클릭
2. `(L)납품계약서.xlsx` 파일 선택
3. **Upload** 클릭

## 🔗 다운로드 URL 가져오기

### 1단계: 파일 선택
1. `templates` 폴더에서 업로드된 파일 클릭

### 2단계: 다운로드 URL 복사
1. **Download URL** 버튼 클릭
2. 표시된 URL 복사
3. 각 파일별로 URL 저장

## 📝 코드 업데이트

업로드 완료 후 각 유틸리티 파일의 `templateUrl`을 새로운 URL로 업데이트:

### materialUploadUtils.js (견적서)
```javascript
// 기존
const templateUrl = 'https://firebasestorage.googleapis.com/v0/b/old-project.appspot.com/o/templates%2Festimate.xlsx?alt=media';

// 새로운 URL로 업데이트
const templateUrl = templateType === 'L' 
  ? 'https://firebasestorage.googleapis.com/v0/b/your-project.appspot.com/o/templates%2F(L)견적서.xlsx?alt=media'
  : 'https://firebasestorage.googleapis.com/v0/b/your-project.appspot.com/o/templates%2F(N)견적서.xlsx?alt=media';
```

### contractGabjiUtils.js (납품계약서)
```javascript
// 기존
const templateUrl = 'https://firebasestorage.googleapis.com/v0/b/old-project.appspot.com/o/templates%2Fcontract_gabji.xlsx?alt=media&token=...';

// 새로운 URL로 업데이트
const templateUrl = templateType === 'L' 
  ? 'https://firebasestorage.googleapis.com/v0/b/your-project.appspot.com/o/templates%2F(L)납품계약서.xlsx?alt=media'
  : 'https://firebasestorage.googleapis.com/v0/b/your-project.appspot.com/o/templates%2F(N)납품계약서.xlsx?alt=media';
```

### napfoomUtils.js (NAPFOOM 납품계약서)
```javascript
// 기존
const templateUrl = 'https://firebasestorage.googleapis.com/v0/b/old-project.appspot.com/o/templates%2Fnapfoom.xlsx?alt=media&token=...';

// 새로운 URL로 업데이트
const templateUrl = templateType === 'L' 
  ? 'https://firebasestorage.googleapis.com/v0/b/your-project.appspot.com/o/templates%2F(L)납품계약서.xlsx?alt=media'
  : 'https://firebasestorage.googleapis.com/v0/b/your-project.appspot.com/o/templates%2F(N)납품계약서.xlsx?alt=media';
```

## ✅ 업로드 완료 확인

### 파일 구조 확인
```
templates/
├── (N)견적서.xlsx
├── (L)견적서.xlsx
├── (N)납품계약서.xlsx
└── (L)납품계약서.xlsx
```

### 권한 설정 확인
1. **Rules** 탭 클릭
2. 읽기 권한이 설정되어 있는지 확인:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;  // 공개 읽기 권한
      allow write: if request.auth != null;  // 인증된 사용자만 쓰기
    }
  }
}
```

## 🎯 최종 결과

업로드 완료 후:
- 견적서 다운로드 시 물량 타입에 따라 `(N)견적서.xlsx` 또는 `(L)견적서.xlsx` 사용
- 납품계약서 다운로드 시 물량 타입에 따라 `(N)납품계약서.xlsx` 또는 `(L)납품계약서.xlsx` 사용
- 물량이 20개 이하면 N 템플릿, 20개 초과하면 L 템플릿 자동 선택

## 🔧 문제 해결

### 파일 업로드 실패
- 파일 크기 확인 (일반적으로 50MB 이하)
- 파일 형식 확인 (.xlsx)
- 네트워크 연결 상태 확인

### 다운로드 URL 접근 불가
- Storage Rules에서 읽기 권한 확인
- 파일 경로 정확성 확인
- 파일이 실제로 업로드되었는지 확인

### 코드에서 URL 오류
- URL 형식 정확성 확인
- 프로젝트 ID가 올바른지 확인
- 파일명에 특수문자가 포함된 경우 URL 인코딩 확인

# Google Tasks API 설정 가이드

## 개요
마스터 아이디만 Google Tasks와 연동되도록 설정하는 가이드입니다.

## 1. Google Cloud Console 설정

### 1.1 프로젝트 생성/선택
1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택

### 1.2 Google Tasks API 활성화
1. "API 및 서비스" > "라이브러리"로 이동
2. "Google Tasks API" 검색 후 활성화

### 1.3 OAuth 2.0 클라이언트 ID 생성
1. "API 및 서비스" > "사용자 인증 정보"로 이동
2. "사용자 인증 정보 만들기" > "OAuth 2.0 클라이언트 ID" 선택
3. 애플리케이션 유형: "웹 애플리케이션" 선택
4. 승인된 리디렉션 URI 추가:
   - `http://localhost:3000`
   - `https://your-domain.com` (배포 도메인)

## 2. 환경변수 설정

### 2.1 로컬 개발 환경 (.env.local)
```env
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
REACT_APP_MASTER_EMAIL=master@chunwoo.com
```

### 2.2 Netlify 배포 환경
Netlify 대시보드 > Site settings > Environment variables에서 추가:
- `REACT_APP_GOOGLE_CLIENT_ID`: your-google-client-id.apps.googleusercontent.com
- `REACT_APP_MASTER_EMAIL`: master@chunwoo.com

## 3. 코드 설정

### 3.1 마스터 이메일 설정
`src/services/googleTasksService.js`에서 마스터 이메일 변경:
```javascript
const MASTER_EMAIL = 'master@chunwoo.com'; // 실제 마스터 이메일로 변경
```

### 3.2 Google Client ID 설정
`src/services/googleTasksService.js`에서 클라이언트 ID 변경:
```javascript
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
```

## 4. 기능 설명

### 4.1 마스터 사용자
- 이메일이 `master@chunwoo.com`인 사용자만 Google Tasks 연동 가능
- 투두 추가/수정/삭제 시 Google Tasks와 자동 동기화
- Google Tasks 동기화 버튼으로 수동 동기화 가능

### 4.2 일반 사용자
- 개인 투두만 사용 (Firebase Firestore)
- Google Tasks 연동 없음
- 개인별로 독립적인 투두 관리

## 5. 사용법

### 5.1 마스터 사용자 로그인
1. 마스터 이메일로 로그인
2. Google Tasks 연동 상태 확인
3. 투두 추가/수정 시 자동으로 Google Tasks와 동기화

### 5.2 일반 사용자 로그인
1. 일반 이메일로 로그인
2. 개인 투두만 사용
3. Google Tasks 연동 없음

## 6. 문제 해결

### 6.1 Google Tasks 연동 실패
- Google Cloud Console에서 API 활성화 확인
- OAuth 2.0 클라이언트 ID 설정 확인
- 환경변수 설정 확인

### 6.2 권한 오류
- 마스터 이메일이 올바르게 설정되었는지 확인
- Google 계정 권한 확인

## 7. 보안 고려사항

- 마스터 이메일은 환경변수로 관리
- Google Client ID는 환경변수로 관리
- 일반 사용자는 Google Tasks 접근 불가
- 모든 API 키는 안전하게 보관

## 8. 배포 시 주의사항

1. Netlify 환경변수 설정 필수
2. Google Cloud Console에서 배포 도메인 추가
3. HTTPS 필수 (Google OAuth 요구사항) 
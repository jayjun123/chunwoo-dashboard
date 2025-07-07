# Google OAuth 설정 가이드

## 1. Google Cloud Console 설정

### 1.1 프로젝트 생성
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
   - `http://localhost:3000` (개발용)
   - `https://your-domain.com` (배포용)

### 1.4 클라이언트 ID와 시크릿 저장
생성된 클라이언트 ID와 시크릿을 안전한 곳에 저장

## 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일 생성:

```env
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here
REACT_APP_GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

## 3. Firebase Auth 설정

### 3.1 Google 로그인 활성화
1. Firebase Console > Authentication > Sign-in method
2. Google 제공업체 활성화
3. 프로젝트 지원 이메일 설정

### 3.2 OAuth 동의 화면 설정
1. Google Cloud Console > "OAuth 동의 화면"
2. 앱 정보 입력
3. 범위 추가: `https://www.googleapis.com/auth/tasks`

## 4. 사용 방법

### 4.1 Google 계정으로 로그인
1. 앱에서 Google 계정으로 로그인
2. Google Tasks API 권한 승인

### 4.2 Google Tasks 연동
1. 투두리스트 페이지에서 설정 버튼 클릭
2. "Google Tasks 연동" 버튼 클릭
3. Task 목록 선택 후 동기화 실행

## 5. 주의사항

- 클라이언트 시크릿은 절대 프론트엔드에 노출하지 마세요
- 프로덕션 환경에서는 적절한 보안 설정을 적용하세요
- Google API 할당량을 확인하고 필요시 증가 요청하세요

## 6. 문제 해결

### 6.1 인증 오류
- Google Cloud Console에서 API가 활성화되었는지 확인
- OAuth 동의 화면에서 필요한 범위가 추가되었는지 확인

### 6.2 권한 오류
- Firebase Auth에서 Google 로그인이 활성화되었는지 확인
- 사용자가 Google Tasks API 권한을 승인했는지 확인

### 6.3 동기화 오류
- 네트워크 연결 상태 확인
- Google API 할당량 초과 여부 확인
- 콘솔 로그에서 구체적인 오류 메시지 확인 
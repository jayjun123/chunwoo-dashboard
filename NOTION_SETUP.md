# Notion API 연동 설정 가이드

## 1. Notion API 설정

### 1.1 Notion Integration 생성
1. [Notion Developers](https://developers.notion.com/) 페이지 방문
2. "New integration" 클릭
3. Integration 이름 입력 (예: "건설현장관리")
4. Submit 클릭
5. Internal Integration 선택 (워크스페이스 내부용)
6. Integration Token 복사

### 1.2 데이터베이스 설정
1. Notion에서 새 데이터베이스 생성
2. 데이터베이스 공유 설정에서 Integration 추가
3. 데이터베이스 ID 복사 (URL에서 추출)

### 1.3 환경변수 설정
프로젝트 루트에 `.env` 파일 생성:
```env
VITE_NOTION_TOKEN=your_integration_token_here
VITE_NOTION_DATABASE_ID=your_database_id_here
```

## 2. Firebase 설정

### 2.1 Firebase 프로젝트 설정
1. [Firebase Console](https://console.firebase.google.com/) 방문
2. 프로젝트 선택 또는 새 프로젝트 생성
3. Firestore Database 활성화
4. Authentication 활성화

### 2.2 환경변수 설정
`.env` 파일에 Firebase 설정 추가:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 3. Firebase Firestore 인덱스 설정

### 3.1 복합 인덱스 생성
다음 쿼리들이 정상 작동하려면 Firestore에서 복합 인덱스가 필요합니다:

#### progress 컬렉션 인덱스
- **컬렉션**: `progress`
- **필드**: 
  - `siteId` (Ascending)
  - `date` (Ascending)
- **쿼리**: `where('siteId', '==', siteId) && where('date', '>=', startDate) && where('date', '<=', endDate)`

#### discussions 컬렉션 인덱스
- **컬렉션**: `discussions`
- **필드**:
  - `type` (Ascending)
  - `timestamp` (Descending)
- **쿼리**: `where('type', '==', 'room') && orderBy('timestamp', 'desc')`

#### discussions 컬렉션 인덱스 (메시지용)
- **컬렉션**: `discussions`
- **필드**:
  - `roomId` (Ascending)
  - `timestamp` (Ascending)
- **쿼리**: `where('roomId', '==', roomId) && orderBy('timestamp', 'asc')`

### 3.2 인덱스 생성 방법
1. [Firebase Console](https://console.firebase.google.com/) 방문
2. 프로젝트 선택
3. Firestore Database → Indexes 탭
4. "Create Index" 클릭
5. 위의 설정에 따라 인덱스 생성

### 3.3 자동 인덱스 생성
Firebase에서 오류 메시지에 포함된 링크를 클릭하면 자동으로 인덱스가 생성됩니다:
```
https://console.firebase.google.com/v1/r/project/chunwooo-edf9f/firestore/indexes?create_composite=...
```

## 4. 사용법

### 4.1 보고서 생성
1. 토론의견 메뉴에서 "보고서" 탭 클릭
2. "Notion 템플릿" 탭 선택
3. 템플릿 선택 및 데이터 입력
4. 미리보기 또는 다운로드

### 4.2 협의방 관리
1. 토론의견 메뉴에서 협의방 생성
2. 실시간 채팅 및 파일 공유
3. 보고서 내보내기 (PDF/Excel)

## 5. 문제 해결

### 5.1 인덱스 오류
- Firebase Console에서 인덱스 생성 대기
- 임시로 단순화된 쿼리 사용

### 5.2 Notion API 오류
- Integration Token 확인
- 데이터베이스 권한 설정 확인
- 환경변수 재시작

### 5.3 Firebase 연결 오류
- 환경변수 설정 확인
- Firebase 프로젝트 설정 확인
- 네트워크 연결 확인 
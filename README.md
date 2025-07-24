# 건설현장관리시스템

React 18, Material-UI, Firebase를 기반으로 한 현대적인 건설현장관리시스템입니다.

## 🚀 주요 기능

- **현장 관리**: 현장 정보, 상태, 계획 관리
- **기성 관리**: 기성금 청구 및 관리
- **안전 관리**: 안전 점검, 사고 관리, 교육 관리
- **일정 관리**: 프로젝트 일정 및 캘린더 관리
- **문서 관리**: 계약서, 도면, 사진 등 문서 관리
- **보고서**: 다양한 보고서 생성 및 내보내기
- **실시간 채팅**: 현장 내 실시간 소통
- **모바일 앱**: Android/iOS 네이티브 앱 지원

## 🚀 PWA (Progressive Web App) 지원

이 프로젝트는 **PWA**로 개발되어 **크롬 앱처럼** 사용할 수 있습니다!

### 📱 PWA 설치 방법

1. **Chrome/Edge 브라우저**에서 접속
2. 주소창 옆의 **설치 아이콘** 클릭
3. "천우현장관리 설치" 클릭
4. 완료! 홈 화면에 앱 아이콘이 생성됩니다

### ✨ PWA의 장점

- 🎯 **앱처럼 사용**: 홈 화면에 아이콘, 전체 화면 실행
- 📶 **오프라인 지원**: 인터넷 없이도 기본 기능 사용
- 🔄 **자동 업데이트**: 새 버전 자동 다운로드
- 💾 **적은 저장공간**: 앱스토어 앱보다 가벼움

자세한 설치 방법은 [PWA_INSTALL_GUIDE.md](./PWA_INSTALL_GUIDE.md)를 참조하세요.

## 🛠 기술 스택

### Frontend
- **React 18** - 사용자 인터페이스
- **Material-UI 7** - 디자인 시스템
- **TypeScript** - 타입 안정성
- **Vite** - 빌드 도구
- **React Router** - 라우팅
- **Redux Toolkit** - 상태 관리

### Backend & Database
- **Firebase** - 백엔드 서비스
  - **Firestore** - NoSQL 데이터베이스
  - **Authentication** - 사용자 인증
  - **Storage** - 파일 저장소
  - **Hosting** - 웹 호스팅
  - **Analytics** - 사용자 분석

### Mobile
- **Capacitor** - 하이브리드 앱 프레임워크
- **Android Studio** - Android 개발
- **Xcode** - iOS 개발

### DevOps & Deployment
- **GitHub Actions** - CI/CD
- **Netlify** - 웹 배포
- **Firebase Hosting** - 웹 호스팅

## 📦 설치 및 실행

### 1. 저장소 클론
```bash
git clone https://github.com/yourusername/construction-management.git
cd construction-management
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경변수 설정
프로젝트 루트에 `.env` 파일을 생성하고 다음 설정을 추가하세요:

```bash
# 환경변수 템플릿 복사
cp env.example .env
```

또는 직접 `.env` 파일을 생성하고 다음 설정을 추가하세요:

```env
# Firebase 설정
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# 날씨 API 키 (기상청 공공데이터 포털에서 발급)
VITE_WEATHER_API_KEY=your_weather_api_key_here

# 네이버 API 키 (뉴스 검색)
VITE_NAVER_CLIENT_ID=your_naver_client_id_here
VITE_NAVER_CLIENT_SECRET=your_naver_client_secret_here

# OpenAI API 키 (선택사항 - AI 기능 사용 시)
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

**날씨 API 키 발급 방법:**
1. [기상청 공공데이터 포털](https://data.go.kr/) 접속
2. 회원가입 및 로그인
3. "단기예보 조회서비스" 신청
4. 발급받은 서비스 키를 `VITE_WEATHER_API_KEY`에 설정

**OpenAI API 키 발급 방법 (선택사항):**
1. [OpenAI Platform](https://platform.openai.com/) 접속
2. 계정 생성 및 로그인
3. API Keys 메뉴에서 새 키 생성
4. 발급받은 키를 `VITE_OPENAI_API_KEY`에 설정

### 4. 개발 서버 실행
```bash
npm run dev
```

### 5. 브라우저에서 확인
```
http://localhost:3002
```

## 🔥 Firebase 설정

### 1. Firebase 프로젝트 생성
1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. Authentication, Firestore, Storage 활성화
3. 웹 앱 등록

### 2. 환경변수 설정
`.env` 파일에 Firebase 설정 추가:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 3. Firebase 배포
```bash
# Firebase CLI 설치
npm install -g firebase-tools

# 로그인
firebase login

# 프로젝트 초기화
firebase init

# 배포
npm run firebase:deploy
```

## 🌐 Netlify 배포

### 1. Netlify CLI 설치
```bash
npm install -g netlify-cli
```

### 2. 배포
```bash
# 프로덕션 배포
npm run netlify:deploy

# 프리뷰 배포
npm run netlify:deploy:preview
```

## 📱 모바일 앱 빌드

### Android APK 빌드
```bash
# Android 개발 환경 설정
# Android Studio, Java JDK 17, Android SDK 설치

# Capacitor 설정
npm run capacitor:add
npm run capacitor:sync

# APK 빌드
npm run android:build:release
```

### iOS IPA 빌드
```bash
# iOS 개발 환경 설정
# Xcode, macOS, Apple Developer 계정 필요

# Capacitor 설정
npx cap add ios
npx cap sync ios

# IPA 빌드
npm run ios:ipa
```

## 🤖 GitHub Actions 자동 배포

### 1. GitHub Secrets 설정
다음 환경변수들을 GitHub Secrets에 설정:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `FIREBASE_SERVICE_ACCOUNT`
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

### 2. 자동 배포
- `main` 브랜치에 푸시 시 자동으로 Firebase Hosting과 Netlify에 배포
- Android APK 자동 빌드 및 아티팩트 업로드

## 📊 사용 가능한 스크립트

### 개발
```bash
npm run dev          # 개발 서버 실행
npm run build        # 프로덕션 빌드
npm run preview      # 빌드 미리보기
npm run test         # 테스트 실행
npm run lint         # 코드 린팅
npm run format       # 코드 포맷팅
```

### Firebase
```bash
npm run firebase:deploy          # 전체 배포
npm run firebase:deploy:hosting  # 호스팅만 배포
npm run firebase:deploy:firestore # Firestore 규칙 배포
npm run firebase:emulators       # 에뮬레이터 실행
```

### Netlify
```bash
npm run netlify:deploy           # 프로덕션 배포
npm run netlify:deploy:preview   # 프리뷰 배포
```

### 모바일
```bash
npm run capacitor:sync           # 웹 빌드 동기화
npm run android:build:release    # Android 릴리즈 빌드
npm run ios:ipa                  # iOS IPA 빌드
```

## 🏗 프로젝트 구조

```
src/
├── components/          # React 컴포넌트
│   ├── auth/           # 인증 관련
│   ├── common/         # 공통 컴포넌트
│   ├── construction/   # 현장 관리
│   ├── dashboard/      # 대시보드
│   ├── safety/         # 안전 관리
│   └── ...
├── contexts/           # React Context
├── hooks/              # 커스텀 훅
├── pages/              # 페이지 컴포넌트
├── services/           # API 서비스
├── store/              # Redux 스토어
├── styles/             # CSS 스타일
├── types/              # TypeScript 타입
└── utils/              # 유틸리티 함수
```

## 🔒 보안

- Firebase 보안 규칙으로 데이터베이스 접근 제어
- 사용자 인증 및 권한 관리
- 환경변수를 통한 민감 정보 보호
- HTTPS 강제 적용

## 📈 성능 최적화

- 코드 분할 및 지연 로딩
- 이미지 최적화 및 압축
- 캐싱 전략 적용
- 번들 크기 최적화

## 🧪 테스트

```bash
# 단위 테스트
npm run test

# 커버리지 테스트
npm run test:coverage

# CI 테스트
npm run test:ci
```

## 📝 라이선스

MIT License

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 지원

- 이슈 리포트: [GitHub Issues](https://github.com/yourusername/construction-management/issues)
- 문서: [DEPLOYMENT.md](./DEPLOYMENT.md)
- 이메일: your-email@example.com

## 🔄 업데이트 로그

### v1.0.0 (2024-01-XX)
- 초기 릴리즈
- 기본 현장 관리 기능
- Firebase 연동
- 모바일 앱 지원
- 자동 배포 설정

---

**건설현장관리시스템** - 현대적인 건설 프로젝트 관리 솔루션 
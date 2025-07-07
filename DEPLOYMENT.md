# 배포 가이드

이 문서는 건설현장관리시스템의 Firebase, Netlify, APK/IPA 빌드 및 배포 방법을 설명합니다.

## 📋 목차

1. [Firebase 설정](#firebase-설정)
2. [Netlify 배포](#netlify-배포)
3. [APK 빌드](#apk-빌드)
4. [IPA 빌드](#ipa-빌드)
5. [GitHub Actions 자동 배포](#github-actions-자동-배포)
6. [환경변수 설정](#환경변수-설정)

## 🔥 Firebase 설정

### 1. Firebase CLI 설치
```bash
npm install -g firebase-tools
```

### 2. Firebase 로그인
```bash
npm run firebase:login
```

### 3. Firebase 프로젝트 초기화
```bash
npm run firebase:init
```

### 4. Firebase 배포
```bash
# 전체 배포
npm run firebase:deploy

# 호스팅만 배포
npm run firebase:deploy:hosting

# Firestore 규칙만 배포
npm run firebase:deploy:firestore

# Storage 규칙만 배포
npm run firebase:deploy:storage
```

### 5. Firebase 에뮬레이터 실행
```bash
# 에뮬레이터 시작
npm run firebase:emulators

# 에뮬레이터 데이터 내보내기
npm run firebase:emulators:export

# 에뮬레이터 데이터 가져오기
npm run firebase:emulators:import
```

## 🌐 Netlify 배포

### 1. Netlify CLI 설치
```bash
npm install -g netlify-cli
```

### 2. Netlify 로그인
```bash
netlify login
```

### 3. Netlify 배포
```bash
# 프로덕션 배포
npm run netlify:deploy

# 프리뷰 배포
npm run netlify:deploy:preview
```

### 4. Netlify 사이트 설정
- Netlify 대시보드에서 새 사이트 생성
- GitHub 저장소 연결
- 빌드 설정:
  - Build command: `npm run build`
  - Publish directory: `dist`
  - Node version: `18`

## 📱 APK 빌드

### 1. Android 개발 환경 설정
```bash
# Android Studio 설치
# Java JDK 17 설치
# Android SDK 설치
```

### 2. Capacitor 설정
```bash
# Capacitor 플랫폼 추가
npm run capacitor:add

# 웹 빌드를 네이티브 플랫폼에 동기화
npm run capacitor:sync

# Android Studio 열기
npm run capacitor:open:android
```

### 3. APK 빌드
```bash
# 디버그 APK 빌드
npm run android:build:debug

# 릴리즈 APK 빌드
npm run android:build:release

# 릴리즈 AAB 빌드 (Google Play Store용)
npm run android:bundle:release
```

### 4. 서명 설정
1. `my-release-key.keystore` 파일 생성
2. `capacitor.config.ts`에서 서명 정보 설정
3. 환경변수에 비밀번호 설정

## 🍎 IPA 빌드

### 1. iOS 개발 환경 설정
```bash
# Xcode 설치
# macOS 필요
# Apple Developer 계정 필요
```

### 2. Capacitor iOS 설정
```bash
# iOS 플랫폼 추가
npx cap add ios

# 웹 빌드를 iOS에 동기화
npx cap sync ios

# Xcode 열기
npm run capacitor:open:ios
```

### 3. IPA 빌드
```bash
# iOS 빌드
npm run ios:build

# IPA 생성
npm run ios:ipa
```

### 4. iOS 배포 설정
1. Xcode에서 프로젝트 설정
2. Bundle Identifier 설정
3. Provisioning Profile 설정
4. Code Signing 설정

## 🤖 GitHub Actions 자동 배포

### 1. GitHub Secrets 설정
다음 환경변수들을 GitHub Secrets에 설정:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
FIREBASE_SERVICE_ACCOUNT
NETLIFY_AUTH_TOKEN
NETLIFY_SITE_ID
```

### 2. 자동 배포 트리거
- `main` 브랜치에 푸시 시 자동 배포
- `develop` 브랜치에 푸시 시 테스트만 실행
- Pull Request 시 테스트 실행

### 3. 배포 확인
- GitHub Actions 탭에서 배포 상태 확인
- Firebase Hosting URL 확인
- Netlify URL 확인
- Android APK 아티팩트 다운로드

## 🔧 환경변수 설정

### 1. 로컬 개발
`.env` 파일 생성:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 2. 프로덕션 환경
- Firebase Console에서 환경변수 설정
- Netlify 대시보드에서 환경변수 설정
- GitHub Secrets에서 환경변수 설정

## 📊 모니터링 및 분석

### 1. Firebase Analytics
- Firebase Console에서 사용자 행동 분석
- 실시간 사용자 수 확인
- 이벤트 추적 설정

### 2. Netlify Analytics
- Netlify 대시보드에서 사이트 성능 확인
- 방문자 통계 확인
- 배포 상태 모니터링

### 3. 에러 모니터링
- Firebase Crashlytics 설정
- Sentry 연동 (선택사항)
- 콘솔 로그 모니터링

## 🚀 성능 최적화

### 1. 빌드 최적화
```bash
# 번들 분석
npm run analyze

# 코드 분할 확인
npm run build -- --analyze
```

### 2. 캐싱 전략
- Firebase Hosting 캐싱 설정
- Netlify 캐싱 설정
- CDN 활용

### 3. 이미지 최적화
- WebP 형식 사용
- 이미지 압축
- 지연 로딩 적용

## 🔒 보안 설정

### 1. Firebase 보안 규칙
- Firestore 보안 규칙 검토
- Storage 보안 규칙 검토
- Authentication 설정 확인

### 2. 환경변수 보안
- 민감한 정보는 환경변수로 관리
- .env 파일을 .gitignore에 추가
- 프로덕션 환경변수 암호화

### 3. HTTPS 설정
- Firebase Hosting 자동 HTTPS
- Netlify 자동 HTTPS
- 커스텀 도메인 SSL 인증서

## 📞 문제 해결

### 1. 일반적인 문제
- 빌드 실패: Node.js 버전 확인
- 배포 실패: 환경변수 확인
- 앱 크래시: Firebase 설정 확인

### 2. 디버깅
```bash
# 로컬 빌드 테스트
npm run build

# 에뮬레이터에서 테스트
npm run firebase:emulators

# 로그 확인
firebase functions:log
```

### 3. 지원
- Firebase 문서: https://firebase.google.com/docs
- Netlify 문서: https://docs.netlify.com
- Capacitor 문서: https://capacitorjs.com/docs

---

## 📝 체크리스트

배포 전 확인사항:

- [ ] 모든 테스트 통과
- [ ] 환경변수 설정 완료
- [ ] Firebase 프로젝트 설정 완료
- [ ] Netlify 사이트 설정 완료
- [ ] Android/iOS 빌드 설정 완료
- [ ] 보안 규칙 검토 완료
- [ ] 성능 테스트 완료
- [ ] 모바일 테스트 완료

배포 후 확인사항:

- [ ] 웹사이트 정상 작동 확인
- [ ] 모바일 앱 정상 작동 확인
- [ ] Firebase Analytics 데이터 확인
- [ ] 에러 로그 확인
- [ ] 사용자 피드백 수집 
# 천우 건설현장관리시스템 PWA — 제미나/챗GPT용 요약 (복사용)

아래 블록 전체를 복사해서 제미나나 챗GPT에 붙여넣고, **기능·UI·코드 완성도**에 대한 조언을 요청하면 됩니다.

---

## [여기부터 복사]

### 1. 프로젝트 개요

- **앱 이름**: 천우 건설현장관리시스템 (PWA)
- **용도**: 건설 현장·일정·기성·안전·문서 등을 통합 관리하는 비즈니스 PWA
- **주요 사용처**: 현장 관리자, 시공팀, 사무실 — PC·태블릿·스마트폰에서 웹/앱처럼 사용
- **배포**: Netlify + Firebase Hosting, Netlify Functions로 읽기 전용 API 제공

---

### 2. 기술 스택

- **프론트**: React 18, Vite, Material-UI 7, Redux Toolkit, React Router
- **백엔드/DB**: Firebase (Auth, Firestore, Storage, Analytics)
- **PWA**: vite-plugin-pwa (Workbox), registerType: 'autoUpdate'
- **모바일**: 반응형 + 터치/키보드 최적화 유틸, Capacitor로 네이티브 앱 빌드 가능
- **기타**: ExcelJS, Recharts, react-beautiful-dnd, date-fns 등

---

### 3. PWA 기능 요약

**구현된 것**

- **Manifest**: short_name/name, 다중 아이콘(72~512, maskable), standalone, theme/background #181A20, start_url, lang ko-KR, screenshots(wide/narrow), categories business/productivity
- **Service Worker**: VitePWA + Workbox, 자동 업데이트, 정적 자산(js,css,html,ico,png,svg) 캐시, 10MB 제한, opencv.js 제외, navigateFallback index.html
- **런타임 캐싱**: Google Fonts CacheFirst, API 요청 NetworkFirst(10초 타임아웃, 5분 만료)
- **설치**: PWAInstallPrompt 컴포넌트, 24시간 재표시 방지, iOS/Android/Edge 설치 가이드, PWA_INSTALL_GUIDE.md
- **모바일/PWA 전용 유틸**:  
  - mobileOptimization: 터치 최적화, 더블탭 줌 억제, viewport 초기화, 디바이스/PWA 여부 감지  
  - pwaKeyboardUtils: Visual Viewport 기반 키보드 높이 감지, 뷰포트 조정, 포커스/스크롤 처리  
  - touchOptimization, touchUtils, imeHandler(한글 입력), windowManager, backButtonHandler, materialUploadUtils(aria-hidden 등)
- **앱 진입점**: App.jsx에서 configureIME, initKeyboardManager, initMobileOptimization, initViewportHeight, initializeWindow, initializeMobileInputOptimization, initTouchOptimization 등 초기화
- **읽기 전용 API (Netlify Functions)**: GET /api/health, /api/schedule/today, /api/sites?name=...&field=... (소장, 잔액, 전체 정보 등) — PWA에서 외부 연동용

**미구현/약한 부분**

- Firestore 오프라인 영속성(enableIndexedDbPersistence) 미적용
- 오프라인 큐·Background Sync 미구현
- 푸시 알림(PushNotification 컴포넌트는 있으나 FCM/VAPID 연동 완성도는 미확인)
- 이미지 lazy loading·WebP·srcset 등은 일부만 적용

---

### 4. 비즈니스(기능) 요약

- **현장 관리**: 현장 CRUD, 상태, 계획, 시공팀 배정, 현장별 기성현황
- **기성 관리**: 기성금 청구서(엑셀 템플릿 N/L타입), 업로드/다운로드, 차수·전회기성 반영
- **일정**: 캘린더, 일정 추가/수정, 현장·시공팀 연동
- **안전**: 안전 점검, 사고/교육 관리
- **문서/보고**: 계약서, 도면, 사진, 견적·납품계약서·기성금청구서 생성
- **시공팀**: 팀 카드, 현장 배정, 수정 모달(네이티브 select·체크박스 목록으로 z-index 이슈 회피)
- **기타**: 대시보드, 실시간 채팅, 설정, 알림 크롤러, AI 요약 등

---

### 5. UI/UX 요약

- **테마**: 다크 배경(#181A20), MUI 기반, standalone 풀스크린에 가까운 PWA
- **레이아웃**: 반응형 그리드, 모바일 사이드바, SwipeableContainer
- **로딩/에러**: SplashScreen, LoadingProvider, ErrorBoundary
- **접근성**: aria-hidden 보정, 일부 키보드/포커스 처리 — 전반적 a11y 감사는 미실시
- **모바일**: 터치 최적화, 키보드 올라올 때 뷰포트/스크롤 조정, 한글 IME 처리

---

### 6. 코드 구조·완성도

- **구조**: src/pages(페이지), src/components(공통/도메인별), src/contexts, src/utils(엑셀·PWA·터치·IME 등), src/store, netlify/functions(PWA API)
- **번들**: manualChunks로 react/mui/firebase/charts/dnd/date-fns/export 등 벤더·페이지·utils 분리
- **상태**: 전역은 Redux + Auth/Todo/Theme/Popup Context
- **품질**: 일부 콘솔 로그 다수, drop_console false로 유지, 테스트/문서는 README·PWA_평가_및_개선제안.md·PWA_INSTALL_GUIDE.md 수준

**문서에 적힌 자체 평가**: PWA 종합 82/100 — 기본 요구사항·설치·모바일은 우수, 오프라인·캐싱·푸시 알림에서 개선 여지 있음.

---

### 7. 조언 요청 사항

다음 세 가지 관점에서 구체적인 조언을 부탁드립니다.

1. **기능적 관점**  
   - PWA로서 필수적으로 더 넣었으면 좋은 기능(오프라인, 동기화, 알림, 설치 후 온보딩 등)과 우선순위  
   - 읽기 전용 API만 두는 현재 방식의 장단점과, 쓰기까지 넣을 때 고려할 점  

2. **UI/UX 관점**  
   - 모바일·태블릿·데스크톱에서의 사용성 개선 포인트  
   - PWA 설치 전/후 경험 차이, 첫 진입·재방문 시 추천 개선  
   - 접근성(a11y)에서 우선 적용하면 좋은 항목  

3. **코드·완성도 관점**  
   - Service Worker·캐시 전략·오프라인 전략을 더 견고하게 만들기 위한 패턴이나 단계  
   - 성능(번들·LCP/CLS 등) 개선 시 우선 손대면 좋은 부분  
   - 유지보수성을 위해 구조·utils 분리·테스트 측면에서 추천하는 개선  

가능하면 “지금 당장 할 수 있는 작은 개선”과 “중기적으로 할 만한 개선”을 구분해 주시면 감사하겠습니다.

---

## [여기까지 복사]

# A~Z 기능·코드 점검 보고서

프로젝트 전반을 A부터 Z까지 검토한 **기능 및 코드 문제점** 요약입니다.

---

## A. App.jsx / 진입점

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **임시 마이그레이션 코드** | `addSequenceToCostsDirect`, `syncSiteNamesDirect`, `syncSiteNames`가 그대로 포함되어 있고, `window.syncSiteNames`, `window.addSequenceToCostsDirect` 등으로 전역에 노출됨. 프로덕션에서 콘솔로 호출 가능. | 높음 |
| **권장** | 마이그레이션은 별도 스크립트나 관리자 전용 경로로 분리하고, `window`에 붙이지 않기. 빌드 시 제거하거나 `import.meta.env.DEV`로 감싸기. | - |

---

## B. 보안 (Security)

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **Firebase 설정 하드코딩** | `firebase.js` 개발 환경에서 `VITE_FIREBASE_*` 없을 때 실제 API 키 등이 폴백으로 하드코딩됨. 저장소에 올라가면 키 유출 위험. | 높음 |
| **마스터 계정 하드코딩** | `masterUtils.js`에 마스터 이메일·UID가 하드코딩 (`fire8803@naver.com`, `HpF5IrlTscYbWPsUhtdzV05sjbF2` 등). | 중간 |
| **localStorage 사용자 정보** | `AuthContext`에서 로그인 사용자 객체를 `localStorage`에 JSON으로 저장. 토큰/민감 정보가 포함될 수 있음. | 중간 |
| **권장** | DEV용 폴백 키 제거(또는 별도 로컬 설정 파일·gitignore). 마스터 목록은 환경변수/설정 API로만 관리. 사용자 세션은 최소 정보만 저장. | - |

---

## C. 환경 변수 / 빌드

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **process.env 사용** | `errorHandler.js`, `performanceUtils.js` 등에서 `process.env.NODE_ENV` 사용. Vite 프로젝트에서는 `import.meta.env.DEV` / `import.meta.env.PROD` 사용이 맞음. | 중간 |
| **권장** | 전역 치환 여부 확인 후, Vite 기준으로 `import.meta.env`로 통일. | - |

---

## D. DnD 라이브러리 혼용

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **두 패키지 병존** | `react-beautiful-dnd`와 `@hello-pangea/dnd`가 둘 다 사용됨. `ScheduleManagement.jsx`, `CustomCalendar.jsx`, `Todo.jsx` 등은 `@hello-pangea/dnd`, `ProgressManagement.jsx`, `schedule/ProgressManagement.jsx`, `ScheduleList.jsx`는 `react-beautiful-dnd` 사용. | 중간 |
| **권장** | 한 라이브러리로 통일(권장: `@hello-pangea/dnd`). `dndScrollFix.js` 등 주석/이름도 해당 라이브러리에 맞게 정리. | - |

---

## E. 에러 처리 (Error handling)

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **전역 핸들러 중복** | `main.jsx`에서 `window.addEventListener('error')`, `window.addEventListener('unhandledrejection')` 등록하고, `errorHandler.js`에서도 동일 이벤트 등록. 두 곳에서 처리되어 동작·로그가 혼란스러울 수 있음. | 중간 |
| **빈 catch** | `workflow-diagram.html` 등에서 `catch (e) {}`로 에러 무시. | 낮음 |
| **권장** | 전역 에러는 한 곳(예: errorHandler)에서만 등록. 빈 catch는 최소한 로그나 상위 throw. | - |

---

## F. Firebase

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **오프라인 영속성 미사용** | Firestore `enableIndexedDbPersistence` 미호출. PWA 오프라인에서 로컬 캐시 읽기/쓰기 제한적. | 중간 |
| **console.error 덮어쓰기** | `firebase.js` 개발 환경에서 `console.error`를 덮어써 BloomFilter 등 특정 오류를 숨김. 디버깅 시 다른 오류까지 놓칠 수 있음. | 낮음 |
| **권장** | 오프라인 우선이 필요하면 `enableIndexedDbPersistence` 검토. console 오버라이드는 최소 범위로 또는 제거. | - |

---

## G. 전역 노출 (Global / window)

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **window에 디버/마이그레이션** | `window.syncSiteNames`, `window.syncSiteNamesDirect`, `window.addSequenceToCostsDirect` 등. 프로덕션에서도 호출 가능. | 높음 |
| **권장** | 개발/관리 전용이면 `if (import.meta.env.DEV)` 안에서만 등록하거나, 아예 제거. | - |

---

## H. index.html / 진입 HTML

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **매 로드/리사이즈 로그** | `diagnoseViewport()`가 load, resize, visualViewport resize마다 `console.log('뷰포트 진단:', ...)` 호출. 프로덕션에서 콘솔 과다. | 낮음 |
| **manifest 경로** | `link rel="manifest" href="/manifest.webmanifest"` 인데, VitePWA가 `manifest.webmanifest`로 생성하는지 확인 필요. (public/manifest.json과 불일치 가능) | 낮음 |
| **권장** | 뷰포트 진단은 개발 시에만 실행되게 하거나 제거. manifest 실제 빌드 결과와 일치시키기. | - |

---

## I. 인증 (Auth)

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **매 렌더 로그** | `AuthContext`에서 `console.log('🔐 AuthProvider 렌더링:', ...)` 매 렌더마다 실행. `ProtectedRoute`도 여러 번 로그. | 낮음 |
| **권장** | 개발 시에만 로그 출력하거나 제거. | - |

---

## J. 의존성 (dependencies)

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **중복/혼선** | `react-beautiful-dnd`와 `@hello-pangea/dnd` 동시 의존성. 번들 크기·동작 일관성에 불리. | 중간 |
| **테스트 스크립트** | `package.json`의 `test`가 `react-scripts test`를 사용. 프로젝트는 Vite 기반이면 CRA와 혼합 구성일 수 있음. | 낮음 |
| **권장** | DnD 하나로 통일 후 불필요 패키지 제거. 테스트는 Vite 기반(vitest 등)으로 정리 검토. | - |

---

## K. 콘솔 로그

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **과다 사용** | 전역·Auth·ProtectedRoute·다수 utils/페이지에서 `console.log/warn/error` 다수. 프로덕션에서도 전부 출력됨. (빌드 시 drop_console: false 유지) | 중간 |
| **권장** | 프로덕션에서는 `terser` 등으로 console 제거하거나, 로그 유틸을 두고 `import.meta.env.DEV`에서만 출력. | - |

---

## L. 라우팅

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **단축 경로** | `/d`, `/s`, `/g`, `/st` 등 단축 경로 다수. 유지보수·문서화 필요. | 낮음 |
| **일관성** | 대부분 `<Navigate to="..." replace />`로 처리되어 있어 문제 없음. | - |

---

## M. main.jsx

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **에러 시 innerHTML** | Root 없음/렌더 실패 시 `document.body.innerHTML`로 에러 메시지 직접 삽입. XSS는 에러 메시지 내용에 따라 가능성 있음(현재는 예외 메시지). | 낮음 |
| **과다 로그** | 로드·환경·root·렌더링 단계마다 console.log. 프로덕션에는 불필요. | 낮음 |
| **권장** | 에러 화면은 React 컴포넌트나 별도 HTML 템플릿으로 렌더하고, 사용자 메시지는 이스케이프. 로그는 개발 전용으로. | - |

---

## N. 네트워크 / API

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **PWA API** | Netlify Functions로 읽기 전용 API 제공. 문서화는 README 등에 있음. | - |
| **보안 로그용 외부 호출** | `securityUtils.js`에서 `https://api.ipify.org`로 클라이언트 IP 조회. CORS/실패 시 처리 확인 필요. | 낮음 |

---

## O. 오프라인 / PWA

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **Firestore 오프라인** | IndexedDB 영속성 미활성화. 오프라인 시 데이터 접근 제한적. | 중간 |
| **캐싱** | Workbox로 정적 자산·API NetworkFirst 등 설정됨. | - |

---

## P. 성능 (Performance)

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **manualChunks** | Vite 설정에서 벤더/페이지 분리 잘 되어 있음. | - |
| **Lazy loading** | 일부 페이지만 `React.lazy` 사용. 무거운 페이지는 더 늘리면 좋음. | 낮음 |
| **콘솔 유지** | `vite.config.js`에서 `drop_console: false`로 프로덕션에도 콘솔 유지. 성능·보안 측면에서 비권장. | 낮음 |

---

## Q. 코드 품질

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **백업/중복 파일** | `*_backup.js`, `*_backup.jsx`, `ImportantSite_backup.jsx` 등. 혼선·실수로 오래된 코드 참조 가능. | 낮음 |
| **권장** | 백업은 버전 관리(git)로 하고 소스 트리에서는 제거하거나 `scripts/backup` 등으로 이전. | - |

---

## R. Redux / 상태

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **슬라이스** | `auth`, `dashboard` 두 개만 사용. 나머지는 Context·로컬 state. 일관된 정책이면 문제 없음. | - |

---

## S. 스크립트/마이그레이션

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **src/scripts** | `syncSiteNames.js`, `migrateSiteStatus.js`, `createTestUser.js` 등 다수. 일부는 App에서 import되어 번들에 포함됨. | 중간 |
| **권장** | 일회성 마이그레이션/테스트는 `scripts/`에서 node로 실행하거나 관리자 전용 UI로만 호출. App 진입점에서 직접 import 제거. | - |

---

## T. 테스트

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **실제 테스트** | `@testing-library/react`, jest 등 설정은 있으나, Vite와 CRA 스크립트가 혼재할 수 있음. | 낮음 |
| **권장** | Vite + Vitest로 테스트 스크립트 통일하고, 핵심 플로우만이라도 단위/통합 테스트 추가. | - |

---

## U. 사용자 경험 (UX)

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **에러 경계** | `ErrorBoundary`로 메시지·새로고침/홈 제공. 적절함. | - |
| **로딩** | `SplashScreen`, `LoadingSpinner`, `LoadingProvider` 등으로 처리. | - |

---

## V. Vite 설정

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **PWA** | VitePWA, Workbox, manifest 설정됨. | - |
| **빌드** | manualChunks, terser 옵션 등 구성됨. `drop_console: false`만 프로덕션에서는 true 권장. | 낮음 |

---

## W. 보안 로그 / 권한

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **securityUtils** | 로그인 성공/실패, 로그아웃, 의심 활동 등 Firestore에 로그. 구조는 적절. | - |
| **마스터 체크** | `masterUtils.js`의 하드코딩 이메일/UID만 정리하면 됨. | 중간 |

---

## X. XSS / 인젝션

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **dangerouslySetInnerHTML** | 검색 결과에서 workflow-diagram 등 일부만 사용. 사용처는 제한적. | 낮음 |
| **에러 메시지** | main.jsx에서 `error.message`, `error.stack`을 innerHTML로 넣음. 사용자 입력이 아님 but 이스케이프 권장. | 낮음 |

---

## Y. 환경별 동작

| 구분 | 내용 | 심각도 |
|------|------|--------|
| **DEV 전용** | Firebase 에뮬레이터, console.error 필터, 뷰포트 진단 등은 DEV에서만 동작하도록 명확히 구분하면 유지보수에 유리. | 낮음 |

---

## Z. 정리 (우선 조치 권장)

**즉시 권장**

1. **App.jsx**  
   - `syncSiteNames`, `addSequenceToCostsDirect`, `syncSiteNamesDirect`를 `window`에 붙이지 않기.  
   - 마이그레이션은 별도 스크립트/관리자 전용으로 이전.

2. **firebase.js**  
   - 개발 환경에도 Firebase 설정은 환경변수만 사용.  
   - 하드코딩된 API 키(폴백) 제거.

3. **masterUtils.js**  
   - 마스터 이메일·UID를 환경변수 또는 안전한 설정 소스로 이전.  
   - 하드코딩 제거.

**단기 권장**

4. **errorHandler.js**  
   - `process.env.NODE_ENV` → `import.meta.env.DEV` / `import.meta.env.PROD`로 통일.

5. **전역 에러**  
   - `main.jsx`와 `errorHandler` 중 한 곳에서만 `error` / `unhandledrejection` 등록.

6. **DnD**  
   - `@hello-pangea/dnd`로 통일하고 `react-beautiful-dnd` 제거.

7. **콘솔**  
   - 프로덕션 빌드에서 `drop_console: true` 적용 또는 로그 래퍼로 DEV 전용 출력.

**중기 권장**

8. **Firestore**  
   - PWA 오프라인 활용 시 `enableIndexedDbPersistence` 검토.

9. **index.html**  
   - 뷰포트 진단 로그는 개발 시에만 실행되게 하거나 제거.

10. **백업 파일**  
    - `*_backup.*` 등 소스 트리에서 제거하고 git 히스토리로만 보관.

---

*작성 기준: 프로젝트 구조, App.jsx, firebase.js, main.jsx, errorHandler, AuthContext, ProtectedRoute, store, securityUtils, masterUtils, index.html, package.json, 라우팅, DnD 사용처, 일부 페이지/유틸 검색 결과.*

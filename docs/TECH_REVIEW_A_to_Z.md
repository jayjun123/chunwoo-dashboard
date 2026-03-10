# 앱 기술 점검 보고서 (A~Z)

> 검토일: 2025-01-27  
> 대상: MyProject (천우 건설현장관리시스템)

---

## 1. 요약 점수 (종합)

| 영역 | 점수(10점 만점) | 등급 |
|------|-----------------|------|
| 아키텍처/구조 | 7 | B |
| 보안 | 4 | D |
| 성능 | 7 | B |
| 접근성(a11y) | 6 | C |
| 코드 품질/유지보수성 | 5 | C |
| 테스트 | 2 | F |
| DevOps/CI | 7 | B |
| **종합** | **5.4** | **C** |

---

## 2. A~Z 세부 항목

### A. 아키텍처 (Architecture)

**장점**
- React 18 + Vite 기반으로 최신 스택 사용
- Redux + Context 혼합으로 전역/지역 상태 분리
- Firebase (Auth, Firestore, Storage) 통합
- 라우트 대부분 `React.lazy`로 코드 스플리팅 적용
- `vite.config.js`에서 manualChunks로 벤더/페이지 청크 분리 (react, mui, firebase, charts 등)

**문제점**
- 일부 페이지가 단일 파일에 지나치게 큼:
  - `SettlementDetail.jsx` **약 9,200줄** → 분할 필수
  - `NewSites.jsx` **약 4,900줄**
  - `GiftListTab.jsx` **약 4,300줄**
- App.jsx에 **일회성 마이그레이션/스크립트**(예: `addSequenceToCostsDirect`)가 포함되어 번들에 남아 있음 → 별도 스크립트로 분리 권장
- `__tests__` 디렉터리 없음, `*.test.jsx` / `*.spec.jsx` 테스트 파일 없음 → Jest 설정만 있고 실제 테스트 미작성

**권장**
- 대형 페이지는 기능별로 컴포넌트/훅/유틸로 분리
- 마이그레이션/유틸 스크립트는 `src/scripts/`에서만 실행하고 App 번들에서 제거

---

### B. 보안 (Security) — 최우선 개선

**치명적**
1. **하드코딩 비밀번호**
   - `Confidential.jsx`: `password === 'chunwoo8sth@'`
   - `SettlementManagement.jsx`, `SettlementDetail.jsx`: `password === '2046'`  
   → Firebase Auth 또는 백엔드 검증으로 대체하고, 코드/저장소에서 비밀번호 제거

2. **Firebase 설정 노출**
   - `src/firebase.js`: 개발 시 API 키 등이 폴백으로 **소스에 하드코딩**됨  
   → 프로덕션은 환경변수만 사용하고, 개발도 `.env` 없을 때 빌드 실패하도록 처리 권장

3. **Storage 규칙**
   - `storage.rules`: `allow read: if true;` 로 **모든 파일 공개 읽기**  
   → 인증된 사용자만 읽도록 수정 (필요 시 경로별 세분화)

**주의**
4. **Firestore 규칙**
   - 수정/삭제는 마스터/관리자만 가능하나, **마스터 이메일이 규칙에 하드코딩** (`fire8803@naver.com`, `parkmg0688@naver.com`)  
   → Custom Claims(`role == 'master'`)만 사용하고 이메일 열거 제거 권장

5. **.env 관리**
   - `.gitignore`에 `.env` 등이 명시되어 있지 않을 수 있음  
   → `.env`, `.env.local`, `.env.*.local` 무조건 제외 확인

**권장**
- 비밀번호 검증: Firebase Auth 또는 안전한 백엔드 API
- API 키/시크릿: 모두 환경변수, 저장소에 절대 커밋 금지
- Storage/Firestore 규칙 리뷰 후 최소 권한으로 재작성

---

### C. 성능 (Performance)

**장점**
- 라우트 단위 lazy loading
- Vite PWA 플러그인으로 캐시/오프라인 지원
- manualChunks로 벤더 번들 분리

**문제점**
- `touchOptimization.js`에서 **많은 input/textarea에** 매번 스타일·리스너 부여 → 대상 축소 또는 이벤트 위임 검토
- 대형 페이지(수천 줄)는 파싱/렌더 비용 증가 가능 → 컴포넌트 분할로 트리 쉐이킹·메모이제이션 효과 확보

**권장**
- LCP/CLS 등 Core Web Vitals 측정 (Lighthouse 또는 web-vitals)
- 리스트/테이블 가상화(react-window 등) 검토
- 이미지 lazy loading 및 적절한 크기/포맷 적용

---

### D. 접근성 (Accessibility)

**장점**
- MUI 사용으로 기본 스펙(포커스, 역할) 일부 확보
- `fixAriaHiddenIssues` 등 aria 관련 유틸 존재
- MUI Select native input 포커스 이슈는 `touchOptimization.js`에서 제외 처리됨

**문제점**
- `Typography` 내부에 `Chip`(div) 사용으로 **`<p>` 안에 `<div>`** DOM 경고 발생 가능 → `Box component="div"` 등으로 구조 수정
- kebab-case CSS(`ms-overflow-style`, `scrollbar-width`) 사용 시 MUI/Emotion 경고 → camelCase로 통일
- 스크린 리더용 라벨/aria-label 누락 가능성 → 폼/버튼/아이콘 버튼 점검

**권장**
- 폼/모달/탭에 `aria-label`, `aria-describedby` 등 보강
- 키보드만으로 주요 플로우 조작 가능한지 확인
- Lighthouse Accessibility 항목으로 정기 점검

---

### E. 에러 처리 (Error Handling)

**장점**
- `ErrorBoundary`로 상위 레벨 에러 포착
- `errorHandler.js` 유틸 존재
- Firestore onSnapshot/구독 실패 시 스낵바 등 사용자 안내 추가된 부분 있음

**문제점**
- Firestore `addDoc` 시 **undefined 필드**(예: `duplicateInfo`) 전달 시 런타임 오류 → 조건부 스프레드 등으로 제거 완료
- 일부 비동기 로직에 try/catch 없거나 사용자 노출 메시지 부족

**권장**
- API/Firebase 호출은 공통 래퍼에서 try/catch + 로깅 + 사용자 메시지
- 에러 로깅 서비스(Sentry 등) 연동 검토

---

### F. Firebase

**장점**
- Auth, Firestore, Storage, Analytics 통합
- Firestore 인덱스 `firestore.indexes.json`에 정의 (giftSections, giftCards 등)
- 개발 시 환경변수 우선 사용

**문제점**
- 개발 시 API 키 등 폴백 하드코딩 (보안 섹션 참고)
- `experimentalForceLongPolling` 사용 시 장기적으로 기본 채널로 전환 검토

**권장**
- 프로덕션 빌드에서만 Firebase 초기화하고, 필수 환경변수 없으면 빌드 실패하도록 처리

---

### G. 코드 품질 (Code Quality)

**문제점**
- **console.log/warn/error** 가 100곳 이상 사용 → 프로덕션에서는 제거 또는 로거로 대체
- **PropTypes/TypeScript** 거의 미사용 (일부 `.ts`만 존재) → 타입 안정성 부족
- 대형 단일 파일로 **가독성·재사용성** 저하
- 중복 코드(비슷한 폼, 테이블, 스타일) 다수

**권장**
- ESLint rule로 `no-console` 경고 또는 빌드 시 제거
- 점진적 TypeScript 도입 또는 PropTypes 적용
- 공통 컴포넌트(폼 필드, 테이블, 카드) 추출

---

### H. 테스트 (Testing)

**현황**
- Jest + Testing Library 설정 존재
- `test:ci` 등 CI 스크립트 있음
- **실제 테스트 파일 없음** (`src` 내 `__tests__`, `*.test.*`, `*.spec.*` 없음)
- coverage 임계값 80% 설정만 되어 있음

**권장**
- 핵심 플로우(로그인, 주요 CRUD, 대시보드)부터 단위/통합 테스트 작성
- coverage 임계값을 단계적으로 올리거나, 당장은 0%로 두고 테스트 추가 후 상향

---

### I. 번들/빌드 (Build)

**장점**
- Vite로 빠른 빌드
- manualChunks로 청크 분리
- PWA 설정 정리됨

**권장**
- `npm run build` 후 `dist` 용량 및 청크별 크기 확인
- 사용하지 않는 의존성 제거 (예: react-scripts와 Vite 병행 시 정리)

---

### J~Z 요약

- **라우팅**: ProtectedRoute로 인증 보호, 단축 URL 등 구조 양호
- **상태 관리**: Redux + Context 혼합은 유지하되, 도메인별로 슬라이스/컨텍스트 역할 명확히
- **스타일**: MUI + Tailwind + 개별 CSS 혼재 → 장기적으로 일관된 방식으로 정리 권장
- **모바일/터치**: touchOptimization, viewport 등 대응 있음. MUI Select 등 포커스 이슈는 수정됨
- **오프라인**: PWA로 캐시·오프라인 지원. Firestore 오프라인 지속성은 설정 확인 권장
- **CI/CD**: GitHub Actions로 테스트·빌드·배포 구성됨. 실제 테스트 추가 시 CI 신뢰도 상승

---

## 3. 우선순위별 조치 목록

### P0 (즉시)
1. **하드코딩 비밀번호 제거** — Confidential, Settlement* 페이지
2. **Firebase API 키** — 소스 하드코딩 제거, 환경변수만 사용
3. **Storage 규칙** — `read: if true` 제거, 인증 기반으로 변경

### P1 (단기)
4. Firestore 규칙에서 이메일 하드코딩 제거, Custom Claims만 사용
5. `.gitignore`에 `.env*` 명시
6. 프로덕션 빌드에서 `console.*` 제거 또는 로거로 대체
7. SettlementDetail / NewSites / GiftListTab 등 **대형 파일 분할**

### P2 (중기)
8. **실제 테스트** 작성 (인증, 주요 CRUD, 대시보드)
9. 점진적 **TypeScript** 또는 **PropTypes** 도입
10. 접근성 점검(라벨, 키보드, 스크린 리더)
11. 에러 로깅 서비스(Sentry 등) 도입
12. App.jsx 내 마이그레이션/스크립트 제거

### P3 (장기)
13. Core Web Vitals 모니터링
14. 리스트/테이블 가상화 검토
15. 스타일 체계(MUI vs Tailwind) 정리

---

## 4. 신규/보강 기능 제안

- **알림**: Firebase Cloud Messaging으로 푸시 알림 정리 및 권한/토큰 관리
- **감사 로그**: 중요 데이터 변경(생성/수정/삭제) 시 Firestore 또는 전용 컬렉션에 기록
- **데이터 내보내기**: 주요 화면별 CSV/Excel 내보내기 표준화
- **권한 UI**: 역할별 메뉴/버튼 노출 제어를 한곳에서 관리
- **다국어**: i18n 도입 시 라우트/메뉴/폼 라벨 통합 관리
- **설정 화면**: 테마, 알림 on/off, 캐시 삭제 등 사용자 설정 저장
- **오프라인 표시**: 네트워크 끊김 시 배너/스낵바로 안내
- **검색**: 전역 또는 도메인별 통합 검색(현장, 견적, 협의 등)

---

## 5. 결론

- **강점**: 현대적 스택, Firebase 연동, 라우트/코드 스플리팅, PWA, CI 구성이 잘 되어 있음.
- **취약점**: 보안(비밀번호·API 키·Storage 규칙), 테스트 부재, 대형 파일, console/타입 미정리.
- **종합**: 기능적으로는 풍부하나, **보안과 테스트·유지보수성**을 보강하면 안정성과 신뢰도가 크게 올라갑니다.  
  **P0 항목을 먼저 처리한 뒤**, P1·P2를 순차적으로 진행하는 것을 권장합니다.

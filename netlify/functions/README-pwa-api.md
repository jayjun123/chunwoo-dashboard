# PWA API (읽기 전용)

## 환경 변수 (Netlify)

- **FIREBASE_SERVICE_ACCOUNT_JSON**: Firebase 서비스 계정 JSON 전체 문자열  
  (Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 후, JSON 내용을 한 줄로 복사해 붙여넣기)

## 엔드포인트 (모두 GET만 지원)

**사용 URL**: `https://chunwoodb.netlify.app/api/...` (Netlify 리다이렉트로 함수 연결)

| 용도 | 경로 | 예시 |
|------|------|------|
| 상태 확인 | `GET /api/health` | 서버 동작 여부 |
| 앱/엔드포인트 안내 | `GET /api/config` | 앱명, 엔드포인트 목록, 페이지(히트맵·주요현장) 안내 |
| 오늘 일정 | `GET /api/schedule/today` | 오늘 일정 뭐 있어? |
| 히트맵(월별 일정 집계) | `GET /api/schedule/heatmap?year=YYYY&month=M` | 지정 연·월(1–12) 날짜별 일정 건수·요약 |
| 주요현장 목록 | `GET /api/important-sites` | 즐겨찾기(주요현장) 현장 목록 |
| 현장 소장 | `GET /api/sites?name=OO현장&field=manager` | OO현장 소장 누구야? |
| 현장 기성 잔액 | `GET /api/sites?name=OO현장&field=balance` | OO현장 기성금 얼마 남았어? |
| 현장 전체 정보 | `GET /api/sites?name=OO현장` | 소장, 계약금액, 주소, 창호업체, 준공일, 시공팀, 기성잔액 등 |

**config 응답의 pages**: 히트맵 분석 → `/schedule` (일정관리 탭 내), 주요현장 → `/importantsite`

쓰기(POST/PUT/DELETE)는 지원하지 않습니다.

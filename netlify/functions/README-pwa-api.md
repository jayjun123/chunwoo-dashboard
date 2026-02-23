# PWA API (읽기 전용)

## 환경 변수 (Netlify)

- **FIREBASE_SERVICE_ACCOUNT_JSON**: Firebase 서비스 계정 JSON 전체 문자열  
  (Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 후, JSON 내용을 한 줄로 복사해 붙여넣기)

## 엔드포인트 (모두 GET만 지원)

**사용 URL**: `https://chunwoodb.netlify.app/api/...` (Netlify 리다이렉트로 함수 연결)

| 용도 | 경로 | 예시 |
|------|------|------|
| 상태 확인 | `GET /api/health` | 서버 동작 여부 |
| 오늘 일정 | `GET /api/schedule/today` | 오늘 일정 뭐 있어? |
| 현장 소장 | `GET /api/sites?name=OO현장&field=manager` | OO현장 소장 누구야? |
| 현장 기성 잔액 | `GET /api/sites?name=OO현장&field=balance` | OO현장 기성금 얼마 남았어? |
| 현장 전체 정보 | `GET /api/sites?name=OO현장` | 소장+잔액+계약금액 등 |

쓰기(POST/PUT/DELETE)는 지원하지 않습니다.

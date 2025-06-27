# API 문서

## 보고서 API

### 보고서 목록 조회
```http
GET /api/reports
```

#### 쿼리 파라미터
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| type | string | 보고서 유형 (daily, weekly, monthly) |
| start_date | string | 시작일 (YYYY-MM-DD) |
| end_date | string | 종료일 (YYYY-MM-DD) |
| search | string | 검색어 |
| page | number | 페이지 번호 |
| limit | number | 페이지당 항목 수 |

#### 응답
```json
{
  "data": [
    {
      "id": 1,
      "title": "일일 보고서",
      "type": "daily",
      "created_at": "2024-03-20T10:00:00Z",
      "status": "completed"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10
  }
}
```

### 보고서 상세 조회
```http
GET /api/reports/{id}
```

#### 응답
```json
{
  "id": 1,
  "title": "일일 보고서",
  "type": "daily",
  "content": "보고서 내용...",
  "created_at": "2024-03-20T10:00:00Z",
  "updated_at": "2024-03-20T10:00:00Z",
  "status": "completed",
  "author": {
    "id": 1,
    "name": "홍길동"
  }
}
```

### 보고서 생성
```http
POST /api/reports
```

#### 요청 본문
```json
{
  "title": "일일 보고서",
  "type": "daily",
  "content": "보고서 내용..."
}
```

#### 응답
```json
{
  "id": 1,
  "title": "일일 보고서",
  "type": "daily",
  "content": "보고서 내용...",
  "created_at": "2024-03-20T10:00:00Z",
  "status": "draft"
}
```

### 보고서 수정
```http
PUT /api/reports/{id}
```

#### 요청 본문
```json
{
  "title": "수정된 보고서",
  "content": "수정된 내용..."
}
```

#### 응답
```json
{
  "id": 1,
  "title": "수정된 보고서",
  "type": "daily",
  "content": "수정된 내용...",
  "updated_at": "2024-03-20T11:00:00Z"
}
```

### 보고서 삭제
```http
DELETE /api/reports/{id}
```

#### 응답
```json
{
  "success": true,
  "message": "보고서가 삭제되었습니다."
}
```

## 통계 API

### 보고서 통계 조회
```http
GET /api/reports/stats
```

#### 쿼리 파라미터
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| type | string | 보고서 유형 |
| start_date | string | 시작일 |
| end_date | string | 종료일 |

#### 응답
```json
{
  "total_reports": 100,
  "completed_reports": 80,
  "draft_reports": 20,
  "by_type": {
    "daily": 50,
    "weekly": 30,
    "monthly": 20
  }
}
```

## 차트 API

### 보고서 차트 데이터 조회
```http
GET /api/reports/charts
```

#### 쿼리 파라미터
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| type | string | 차트 유형 (line, bar, pie) |
| start_date | string | 시작일 |
| end_date | string | 종료일 |

#### 응답
```json
{
  "labels": ["1월", "2월", "3월"],
  "datasets": [
    {
      "label": "일일 보고서",
      "data": [10, 20, 30]
    },
    {
      "label": "주간 보고서",
      "data": [5, 15, 25]
    }
  ]
}
```

## 에러 응답
모든 API는 에러 발생 시 다음과 같은 형식으로 응답합니다:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지",
    "details": {
      "field": "에러가 발생한 필드",
      "reason": "에러 원인"
    }
  }
}
```

### 주요 에러 코드
| 코드 | 설명 |
|------|------|
| INVALID_REQUEST | 잘못된 요청 |
| UNAUTHORIZED | 인증되지 않은 요청 |
| FORBIDDEN | 권한이 없는 요청 |
| NOT_FOUND | 리소스를 찾을 수 없음 |
| INTERNAL_ERROR | 서버 내부 에러 | 
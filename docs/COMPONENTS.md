# 컴포넌트 문서

## Reports 컴포넌트

### 개요
보고서 목록을 표시하고 관리하는 메인 컴포넌트입니다.

### Props
| Prop | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| initialType | string | ❌ | 'all' | 초기 보고서 유형 |
| initialDateRange | object | ❌ | null | 초기 날짜 범위 |
| onReportSelect | function | ❌ | null | 보고서 선택 시 호출되는 콜백 |

### 사용 예시
```jsx
import Reports from './components/Reports';

function App() {
  return (
    <Reports
      initialType="daily"
      initialDateRange={{
        start: '2024-03-01',
        end: '2024-03-31'
      }}
      onReportSelect={(report) => console.log(report)}
    />
  );
}
```

### 주요 기능
1. 보고서 목록 표시
2. 필터링 및 검색
3. 보고서 내보내기
4. 실시간 알림

## ReportList 컴포넌트

### 개요
보고서 목록을 표시하는 컴포넌트입니다.

### Props
| Prop | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| reports | array | ✅ | [] | 보고서 목록 |
| loading | boolean | ❌ | false | 로딩 상태 |
| error | object | ❌ | null | 에러 상태 |
| onReportClick | function | ❌ | null | 보고서 클릭 시 호출되는 콜백 |

### 사용 예시
```jsx
import ReportList from './components/ReportList';

function Reports() {
  return (
    <ReportList
      reports={reports}
      loading={loading}
      error={error}
      onReportClick={(report) => handleReportClick(report)}
    />
  );
}
```

## ReportFilters 컴포넌트

### 개요
보고서 필터링을 위한 컴포넌트입니다.

### Props
| Prop | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| filters | object | ✅ | {} | 현재 필터 상태 |
| onFilterChange | function | ✅ | null | 필터 변경 시 호출되는 콜백 |
| reportTypes | array | ❌ | [] | 보고서 유형 목록 |

### 사용 예시
```jsx
import ReportFilters from './components/ReportFilters';

function Reports() {
  return (
    <ReportFilters
      filters={filters}
      onFilterChange={handleFilterChange}
      reportTypes={['daily', 'weekly', 'monthly']}
    />
  );
}
```

## ReportStats 컴포넌트

### 개요
보고서 통계를 표시하는 컴포넌트입니다.

### Props
| Prop | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| stats | object | ✅ | {} | 통계 데이터 |
| loading | boolean | ❌ | false | 로딩 상태 |
| error | object | ❌ | null | 에러 상태 |

### 사용 예시
```jsx
import ReportStats from './components/ReportStats';

function Reports() {
  return (
    <ReportStats
      stats={stats}
      loading={loading}
      error={error}
    />
  );
}
```

## ReportCharts 컴포넌트

### 개요
보고서 차트를 표시하는 컴포넌트입니다.

### Props
| Prop | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| chartData | object | ✅ | {} | 차트 데이터 |
| type | string | ❌ | 'line' | 차트 유형 |
| loading | boolean | ❌ | false | 로딩 상태 |
| error | object | ❌ | null | 에러 상태 |

### 사용 예시
```jsx
import ReportCharts from './components/ReportCharts';

function Reports() {
  return (
    <ReportCharts
      chartData={chartData}
      type="bar"
      loading={loading}
      error={error}
    />
  );
}
```

## 공통 컴포넌트

### LoadingSpinner
로딩 상태를 표시하는 컴포넌트입니다.

### ErrorMessage
에러 메시지를 표시하는 컴포넌트입니다.

### Toast
알림 메시지를 표시하는 컴포넌트입니다.

### Button
재사용 가능한 버튼 컴포넌트입니다.

### Input
재사용 가능한 입력 컴포넌트입니다.

### Select
재사용 가능한 선택 컴포넌트입니다.

### DatePicker
날짜 선택 컴포넌트입니다.

### Modal
모달 다이얼로그 컴포넌트입니다.

### Table
테이블 컴포넌트입니다.

### Pagination
페이지네이션 컴포넌트입니다. 
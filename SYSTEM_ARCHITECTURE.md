# 건설 프로젝트 관리 시스템 - 전체 연결 관계 분석

## 🏗️ 시스템 개요
이 시스템은 건설 현장의 전반적인 관리를 위한 통합 플랫폼으로, 현장 정보, 기성 현황, 협의, 안전 관리, 할일 목록, 날씨 정보 등을 실시간으로 관리합니다.

## 📊 데이터베이스 구조 (Firestore)

### 핵심 컬렉션
```
📁 sites (현장 정보)
├── id: string
├── name: string (현장명)
├── status: string (진행중/완료/예정)
├── address: string (주소)
├── manager: string (현장장)
├── team: string (시공팀)
├── contractAmount: number (계약금액)
├── createdAt: timestamp
├── updatedAt: timestamp
└── statusUpdatedAt: timestamp

📁 progress (기성 현황)
├── id: string
├── siteId: string → sites.id (현장 연결)
├── type: string (청구/지급)
├── amount: number (금액)
├── date: timestamp
├── current: number (현재 진행률)
├── target: number (목표)
└── title: string

📁 discussions (협의 게시판)
├── id: string
├── title: string
├── content: string
├── roomId: string (채팅방 ID)
├── type: string (협의 유형)
├── createdAt: timestamp
├── read: boolean
└── userId: string → members.id

📁 safety (안전 관리)
├── id: string
├── title: string
├── content: string
├── type: string (점검/사고/교육)
├── siteId: string → sites.id (현장 연결)
├── createdAt: timestamp
├── resolved: boolean
└── priority: string

📁 todos (할일 목록)
├── id: string
├── text: string
├── completed: boolean
├── userId: string → members.id
├── createdAt: timestamp
└── updatedAt: timestamp

📁 members (회원 정보)
├── id: string
├── email: string
├── name: string
├── role: string (master/admin/user)
├── createdAt: timestamp
└── permissions: array

📁 siteComments (현장 댓글)
├── id: string
├── siteId: string → sites.id
├── content: string
├── userId: string → members.id
├── createdAt: timestamp
└── updatedAt: timestamp
```

## 🔗 데이터 연결 관계

### 1. 현장 중심 연결 (sites → 다른 컬렉션)
```
sites (현장)
├── progress (기성 현황) ← siteId로 연결
├── safety (안전 관리) ← siteId로 연결
├── siteComments (댓글) ← siteId로 연결
└── workers (작업자) ← siteId로 연결
```

### 2. 사용자 중심 연결 (members → 다른 컬렉션)
```
members (사용자)
├── todos (할일) ← userId로 연결
├── discussions (협의) ← userId로 연결
├── siteComments (댓글) ← userId로 연결
└── permissions (권한) ← role 기반
```

### 3. 실시간 데이터 흐름
```
BottomBar (하단바)
├── 실시간 현장 수: sites 컬렉션 onSnapshot
├── 실시간 기성 수: progress 컬렉션 onSnapshot
├── 실시간 협의 수: discussions 컬렉션 onSnapshot
├── 실시간 안전 수: safety 컬렉션 onSnapshot
└── 실시간 할일 수: todos 컬렉션 onSnapshot
```

## 🎯 주요 기능별 연결 관계

### 1. 현장 관리 시스템
```
ImportantSite.jsx (중요현장)
├── sites 컬렉션 조회
├── siteComments 컬렉션 연결
├── progress 페이지 연결 (siteId 파라미터)
├── safety 페이지 연결 (siteId 파라미터)
└── discussions 페이지 연결 (siteId 파라미터)
```

### 2. 기성 현황 관리
```
ProgressManagement.jsx
├── progress 컬렉션 CRUD
├── sites 컬렉션 조회 (현장명 표시)
└── 실시간 업데이트 (onSnapshot)
```

### 3. 협의 시스템
```
DiscussionMain.jsx
├── discussions 컬렉션 CRUD
├── DiscussionChat.jsx (실시간 채팅)
├── members 컬렉션 (사용자 정보)
└── 실시간 메시지 동기화
```

### 4. 안전 관리
```
SafetyIncidents.jsx
├── safety 컬렉션 CRUD
├── sites 컬렉션 연결 (현장별 필터링)
└── 실시간 알림 시스템
```

### 5. 할일 관리
```
TodoList.jsx
├── todos 컬렉션 CRUD
├── members 컬렉션 (사용자별 필터링)
└── 실시간 상태 업데이트
```

## 🔄 실시간 데이터 동기화

### BottomBar 실시간 모니터링
```javascript
// 각 컬렉션별 실시간 리스너
useEffect(() => {
  // 현장 수 모니터링
  const unsubSites = onSnapshot(
    query(collection(db, 'sites'), where('status', '==', '진행중')),
    (snapshot) => setStats(prev => ({ ...prev, todaySites: snapshot.size }))
  );

  // 기성 현황 모니터링
  const unsubProgress = onSnapshot(
    collection(db, 'progress'),
    (snapshot) => {
      const filtered = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => !['샘플','테스트','임시'].some(word => 
          (item.siteId||item.title||item.content||'').includes(word)
        ));
      setStats(prev => ({ ...prev, progressCount: filtered.length }));
      setProgressList(filtered.slice(-5).reverse());
    }
  );

  // 협의, 안전, 할일도 동일한 패턴으로 실시간 업데이트
}, []);
```

### 데이터 변경 시 연쇄 업데이트
```
1. 현장 상태 변경 (sites.status)
   ↓
2. BottomBar 현장 수 자동 업데이트
   ↓
3. 관련 기성 현황 필터링 변경
   ↓
4. UI 실시간 반영
```

## 🌐 외부 API 연동

### 날씨 API (기상청)
```
BottomBar.jsx
├── 기상청 공공데이터 API 호출
├── 실시간 날씨 정보 (온도, 상태, 아이콘)
├── 5일간 예보 데이터
└── 30분마다 자동 갱신
```

### 뉴스 API
```
NewsPanel.jsx
├── 외부 뉴스 API 호출
├── Firestore에 뉴스 저장
├── 중복 방지 (링크 해시 기반)
└── 카테고리별 분류 (유리공사/건설)
```

## 🔐 권한 관리 시스템

### 사용자 역할별 접근 제어
```
master (마스터)
├── 모든 기능 접근 가능
├── 회원 관리
├── 권한 관리
└── 시스템 설정

admin (관리자)
├── 현장 관리
├── 기성 현황 관리
├── 협의 관리
├── 안전 관리
└── 할일 관리

user (일반 사용자)
├── 현장 조회
├── 기성 현황 조회
├── 협의 참여
├── 안전 보고
└── 개인 할일 관리
```

## 📱 UI 컴포넌트 연결

### 레이아웃 구조
```
App.jsx
├── Layout.jsx (전체 레이아웃)
│   ├── Header.jsx (상단 헤더)
│   ├── Sidebar.jsx (사이드바 네비게이션)
│   └── BottomBar.jsx (하단 실시간 정보)
└── 페이지 라우팅
    ├── Dashboard.jsx (대시보드)
    ├── ImportantSite.jsx (중요현장)
    ├── ProgressManagement.jsx (기성관리)
    ├── DiscussionMain.jsx (협의)
    ├── SafetyIncidents.jsx (안전관리)
    └── TodoList.jsx (할일관리)
```

### 실시간 데이터 표시
```
BottomBar.jsx
├── 날짜/날씨 (외부 API)
├── 현장 수 (실시간)
├── 기성 수 (실시간)
├── 협의 수 (실시간)
├── 안전 수 (실시간)
└── 할일 수 (실시간)
```

## 🔄 데이터 흐름 요약

1. **사용자 인증** → AuthContext → 권한 확인
2. **현장 생성** → sites 컬렉션 → BottomBar 실시간 업데이트
3. **기성 현황 입력** → progress 컬렉션 → 현장별 연결
4. **협의 생성** → discussions 컬렉션 → 실시간 채팅
5. **안전 보고** → safety 컬렉션 → 현장별 필터링
6. **할일 추가** → todos 컬렉션 → 사용자별 관리
7. **댓글 작성** → siteComments 컬렉션 → 현장별 연결

## 🎯 시스템 특징

- **실시간 동기화**: 모든 데이터 변경이 즉시 UI에 반영
- **권한 기반 접근**: 사용자 역할에 따른 기능 제한
- **현장 중심 구조**: 모든 데이터가 현장과 연결
- **외부 API 연동**: 날씨, 뉴스 등 실시간 정보 제공
- **반응형 UI**: 다양한 화면 크기에 대응
- **오프라인 지원**: PWA 기능으로 오프라인 사용 가능 
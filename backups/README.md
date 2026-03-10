# 코드 백업 폴더

여기에는 `npm run backup` 실행 시 생성되는 **코드 스냅샷**이 저장됩니다.

## 백업 생성

```bash
npm run backup
```

- **저장 위치**: `backups/code-YYYY-MM-DD_HH-mm-ss/`
- **내용**: `src/` 전체 + `vite.config.js`, `firebase.json`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `package.json`

## 언제 쓰면 좋은지

- 큰 리팩터링이나 여러 파일 수정 전
- “이번에 많이 바꿀 거라 되돌리기 걱정”될 때
- Cursor/AI가 대량 수정 제안하기 전

## 복구 방법

1. `backups/` 안에서 **원하는 날짜/시간** 폴더를 연다 (예: `code-2025-01-27_14-30-00`).
2. **전체 되돌리기**: 해당 폴더의 `src`를 프로젝트 루트의 `src` 위에 덮어쓴다.
3. **일부만 되돌리기**: 해당 폴더에서 복구할 **파일만** 골라서 프로젝트의 같은 경로에 복사한다.

예: `App.jsx`만 예전 상태로 되돌리기  
→ `backups/code-2025-01-27_14-30-00/src/App.jsx` 를 `src/App.jsx` 로 복사

## 정리

- 백업이 많아지면 **오래된 폴더**부터 삭제해도 됩니다.
- 이 폴더(`backups/`)는 Git에 넣지 않는 것을 권장합니다. (용량·중복 방지)

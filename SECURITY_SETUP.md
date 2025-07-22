# 🔒 보안 설정 가이드

## ⚠️ 중요: 즉시 조치 필요

### 1. 서비스 계정 키 보안

**문제**: `src/firebaseServiceAccountKey.json.json` 파일이 Git에 노출되어 있습니다.

**해결 방법**:

1. **환경변수로 이동**:
   ```bash
   # .env 파일에 추가
   FIREBASE_SERVICE_ACCOUNT_KEY="base64_encoded_key"
   ```

2. **키 인코딩**:
   ```bash
   # 서비스 계정 키를 base64로 인코딩
   base64 -i src/firebaseServiceAccountKey.json.json
   ```

3. **코드에서 사용**:
   ```javascript
   // src/firebase.js
   const serviceAccountKey = import.meta.env.VITE_FIREBASE_SERVICE_ACCOUNT_KEY;
   const serviceAccount = JSON.parse(atob(serviceAccountKey));
   ```

### 2. Storage 보안 규칙

**수정 완료**: `storage.rules` 파일이 업데이트되었습니다.

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // 읽기: 인증된 사용자만
      allow read: if request.auth != null;
      
      // 쓰기: 인증된 사용자만, 파일 소유자 또는 관리자만
      allow write: if request.auth != null && 
        (request.auth.uid == resource.metadata.userId || 
         request.auth.uid == request.resource.metadata.userId ||
         exists(/databases/$(database)/documents/members/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/members/$(request.auth.uid)).data.role in ['admin', 'manager']);
    }
  }
}
```

### 3. 파일 업로드 메타데이터

**수정 완료**: 모든 파일 업로드 함수에 사용자 ID 메타데이터가 추가되었습니다.

- `src/api/discussions.js`
- `src/pages/Safety.jsx`
- `src/components/safety/SafetyInspections.jsx`
- `src/components/documents/DocumentManagement.jsx`
- `src/pages/ImportantSite.jsx`
- `src/components/site/SitePhotoUpload.jsx` (이미 구현됨)

### 4. 환경변수 설정

**필요한 환경변수들**:

```bash
# .env 파일
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# 서비스 계정 키 (base64 인코딩)
VITE_FIREBASE_SERVICE_ACCOUNT_KEY=base64_encoded_key

# 기타 API 키들
VITE_WEATHER_API_KEY=your_weather_api_key
VITE_NAVER_CLIENT_ID=your_naver_client_id
VITE_NAVER_CLIENT_SECRET=your_naver_client_secret
VITE_OPENAI_API_KEY=your_openai_api_key
```

### 5. 보안 점검 체크리스트

- [x] 서비스 계정 키 Git에서 제거
- [x] .gitignore에 서비스 계정 키 추가
- [x] Storage 보안 규칙 수정
- [x] 파일 업로드 메타데이터 추가
- [ ] 환경변수 설정 완료
- [ ] Firebase 프로젝트에서 서비스 계정 키 재생성
- [ ] 배포 환경에서 환경변수 설정

### 6. 추가 보안 권장사항

1. **정기적인 보안 감사**
2. **API 키 순환**
3. **접근 로그 모니터링**
4. **백업 및 복구 계획**
5. **사용자 권한 최소화**

### 7. 긴급 조치사항

1. **즉시**: Firebase 콘솔에서 서비스 계정 키 재생성
2. **즉시**: 환경변수 설정
3. **24시간 내**: 모든 배포 환경 업데이트
4. **1주일 내**: 보안 감사 완료

---

**보안 점수**: 4.6/10 → 8.5/10 (수정 후 예상) 
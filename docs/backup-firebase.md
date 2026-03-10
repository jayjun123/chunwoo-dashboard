# Firebase 전체 데이터 백업

## 1. 서비스 계정 키 발급 (최초 1회)

1. [Firebase 콘솔](https://console.firebase.google.com/) → 프로젝트 **chunwooo-edf9f** 선택
2. **프로젝트 설정**(휴지통 옆 톱니바퀴) → **서비스 계정** 탭
3. **Firebase Admin SDK** → **새 비공개 키 생성** → JSON 파일 다운로드
4. 다운로드한 JSON 파일을 **안전한 곳**에 저장 (예: `C:\keys\chunwooo-firebase-adminsdk.json`)  
   ⚠️ **절대 Git에 커밋하거나 공유하지 마세요.**

## 2. 백업 실행

### 방법 A: 환경변수로 키 경로 지정 (권장)

```bash
# Windows (CMD)
set GOOGLE_APPLICATION_CREDENTIALS=C:\keys\chunwooo-firebase-adminsdk.json
npm run backup:firebase

# Windows (PowerShell)
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\keys\chunwooo-firebase-adminsdk.json"
npm run backup:firebase
```

### 방법 B: 인자로 키 경로 전달

```bash
node scripts/backupFirebase.js C:\keys\chunwooo-firebase-adminsdk.json
```

### 방법 C: 프로젝트 루트에 키 파일 두기

키 파일 이름을 `serviceAccountKey.json`으로 바꿔 프로젝트 루트(`MyProject/`)에 두면 별도 설정 없이 실행할 수 있습니다.  
⚠️ **반드시 `.gitignore`에 `serviceAccountKey.json`을 추가하세요.**

```bash
npm run backup:firebase
```

## 3. 백업 결과

- **위치**: `MyProject/backup/firestore-YYYY-MM-DD_HH-mm-ss/`
- **내용**:
  - 컬렉션별 JSON 파일 (`sites.json`, `gisung.json`, `members.json` 등)
  - 각 문서는 `id` + 필드 데이터 (Timestamp는 ISO 문자열로 변환)
  - `_manifest.json`: 백업 시각, 컬렉션별 문서 수

백업 폴더는 용량이 클 수 있으니 `.gitignore`에 `backup/`을 추가하는 것을 권장합니다.

## 4. Storage / Auth 백업

이 스크립트는 **Firestore**만 백업합니다.

- **Storage**(파일): [Google Cloud Console](https://console.cloud.google.com/) → Storage → 버킷 선택 후 객체 다운로드 또는 `gsutil -m cp -r gs://버킷명/* ./backup-storage/`
- **Auth**(사용자 목록): Firebase 콘솔 → Authentication → 사용자 → 수동 내보내기 또는 [Admin SDK `auth.listUsers()`](https://firebase.google.com/docs/auth/admin/manage-users#list_all_users)로 스크립트 확장 가능

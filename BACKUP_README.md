# Firebase 자동 백업 시스템

Firebase의 모든 데이터를 일주일마다 자동으로 백업하는 시스템입니다.

## 📁 파일 구성

- `auto_backup.js` - 자동 백업 스크립트
- `restore_backup.js` - 백업 복원 스크립트
- `backup_manager.js` - 백업 관리 도구
- `setup_backup_scheduler.bat` - Windows 작업 스케줄러 설정
- `backups/` - 백업 파일 저장 디렉토리

## 🚀 빠른 시작

### 1. 자동 백업 스케줄러 설정

Windows 작업 스케줄러에 자동 백업을 등록합니다:

```bash
# 관리자 권한으로 실행
setup_backup_scheduler.bat
```

이 명령은 매주 일요일 오전 2시에 자동으로 백업을 실행하도록 설정합니다.

### 2. 수동 백업 실행

즉시 백업을 실행하려면:

```bash
# 자동 백업 스케줄러 시작 (일주일마다 반복)
node auto_backup.js

# 수동 백업만 실행
node auto_backup.js --manual
```

### 3. 백업 관리자 사용

대화형 백업 관리 도구를 사용하려면:

```bash
node backup_manager.js --cli
```

## 📊 백업 내용

### Firestore 데이터
- `sites` - 현장 정보
- `gisung` - 기성 데이터
- `claims` - 청구 데이터
- `documents` - 문서 관리
- `discussions` - 토론 데이터
- `safety` - 안전 관리
- `estimates` - 견적 데이터
- `progress` - 진행 상황
- `users` - 사용자 정보
- `templates` - 템플릿

### Storage 파일
- `documents/` - 업로드된 문서
- `sites/photos/` - 현장 사진
- `templates/` - 엑셀 템플릿
- `stamps/` - 인감 이미지
- `safety/` - 안전 관련 파일
- `discussion_files/` - 토론 첨부파일

## 🔄 백업 복원

### 백업 목록 조회
```bash
node restore_backup.js --list
```

### 전체 복원
```bash
node restore_backup.js --restore backup_2025-01-27T10-30-00-000Z
```

### 기존 데이터 삭제 후 복원
```bash
node restore_backup.js --restore backup_2025-01-27T10-30-00-000Z --clear
```

### 특정 컬렉션만 복원
```bash
node restore_backup.js --restore backup_2025-01-27T10-30-00-000Z --collections sites,gisung
```

### 특정 Storage 경로만 복원
```bash
node restore_backup.js --restore backup_2025-01-27T10-30-00-000Z --paths documents,templates
```

## 📁 백업 파일 구조

```
backups/
├── backup_2025-01-27T10-30-00-000Z/
│   ├── backup_data.json          # 전체 백업 데이터
│   └── backup_summary.txt        # 백업 요약 정보
├── backup_2025-01-20T10-30-00-000Z/
│   ├── backup_data.json
│   └── backup_summary.txt
└── ...
```

### backup_data.json 구조
```json
{
  "metadata": {
    "backupDate": "2025-01-27T10:30:00.000Z",
    "backupVersion": "1.0",
    "totalDocuments": 150,
    "totalStorageFiles": 25,
    "backupDuration": 5000
  },
  "firestore": {
    "sites": [...],
    "gisung": [...],
    "claims": [...],
    ...
  },
  "storage": {
    "documents": [...],
    "sites/photos": [...],
    ...
  }
}
```

## ⚙️ 설정 옵션

### 백업 스케줄 변경
`setup_backup_scheduler.bat` 파일을 수정하여 백업 일정을 변경할 수 있습니다:

```batch
# 매주 일요일 오전 2시 (기본값)
schtasks /create /tn "Firebase_Auto_Backup" /tr "node \"%CD%\auto_backup.js\"" /sc weekly /d SUN /st 02:00

# 매일 오전 3시
schtasks /create /tn "Firebase_Auto_Backup" /tr "node \"%CD%\auto_backup.js\"" /sc daily /st 03:00

# 매월 1일 오전 1시
schtasks /create /tn "Firebase_Auto_Backup" /tr "node \"%CD%\auto_backup.js\"" /sc monthly /d 1 /st 01:00
```

### 백업 보관 기간 변경
`auto_backup.js`에서 백업 보관 기간을 변경할 수 있습니다:

```javascript
// 30일 이상 된 백업 삭제 (기본값)
cleanupOldBackups(30);

// 60일로 변경
cleanupOldBackups(60);
```

## 🔧 문제 해결

### 백업 실패 시
1. Firebase 연결 확인
2. 디스크 공간 확인
3. 권한 확인
4. 로그 확인

### 복원 실패 시
1. 백업 파일 무결성 확인
2. Firebase 권한 확인
3. 네트워크 연결 확인

### 작업 스케줄러 문제
1. 관리자 권한으로 실행
2. Node.js 설치 확인
3. 경로 확인

## 📋 백업 관리 명령어

### 작업 스케줄러 관리
```bash
# 작업 목록 조회
schtasks /query /tn "Firebase_Auto_Backup"

# 작업 삭제
schtasks /delete /tn "Firebase_Auto_Backup" /f

# 작업 실행
schtasks /run /tn "Firebase_Auto_Backup"
```

### 백업 정리
```bash
# 30일 이상 된 백업 정리
node backup_manager.js --cli
# 메뉴에서 "4. 오래된 백업 정리" 선택
```

## 🔒 보안 고려사항

1. **백업 파일 보안**: 백업 파일에는 민감한 데이터가 포함될 수 있으므로 안전한 위치에 보관하세요.
2. **접근 권한**: 백업 디렉토리에 대한 접근 권한을 제한하세요.
3. **암호화**: 필요시 백업 파일을 암호화하여 보관하세요.
4. **오프사이트 백업**: 중요한 데이터는 외부 저장소에도 백업하세요.

## 📞 지원

문제가 발생하면 다음을 확인하세요:

1. Node.js 버전 (v16 이상 권장)
2. Firebase 프로젝트 설정
3. 네트워크 연결 상태
4. 디스크 공간

## 📝 변경 이력

- **v1.0** - 초기 버전
  - Firestore 데이터 백업
  - Storage 파일 목록 백업
  - 자동 스케줄링
  - 복원 기능
  - 관리 도구

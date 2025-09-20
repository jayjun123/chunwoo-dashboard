# Firebase 자동 백업 설정 가이드

## 📋 개요
Firebase 데이터를 일주일에 한번 자동으로 로컬에 백업하는 시스템입니다.

## 🚀 설정 방법

### 방법 1: 관리자 계정 사용 (간단)

1. **관리자 계정 생성**
   - Firebase Console → Authentication → Users
   - 새 사용자 추가 (이메일/비밀번호)
   - Firestore Rules에서 해당 사용자에게 읽기 권한 부여

2. **백업 스크립트 수정**
   ```javascript
   // auto_backup.js 파일에서
   const adminEmail = 'your-admin@email.com';     // 실제 관리자 이메일
   const adminPassword = 'your-admin-password';   // 실제 관리자 비밀번호
   ```

3. **백업 실행**
   ```bash
   # 수동 백업
   node auto_backup.js --manual
   
   # 자동 스케줄러 설정 (관리자 권한 필요)
   setup_backup_scheduler.bat
   ```

### 방법 2: 서비스 계정 사용 (권장)

1. **서비스 계정 키 다운로드**
   - Firebase Console → Project Settings → Service Accounts
   - "Generate new private key" 클릭
   - JSON 파일 다운로드

2. **백업 스크립트 수정**
   ```javascript
   // auto_backup_service.js 파일에서
   const serviceAccount = {
     // 다운로드한 JSON 파일 내용으로 교체
   };
   ```

3. **백업 실행**
   ```bash
   # 수동 백업
   node auto_backup_service.js --manual
   ```

## 📁 백업 파일 구조

```
backups/
├── backup_2024-01-15T02-00-00-000Z/
│   ├── backup_data.json      # 전체 데이터 (JSON)
│   └── backup_summary.txt    # 백업 요약
└── backup_2024-01-08T02-00-00-000Z/
    ├── backup_data.json
    └── backup_summary.txt
```

## 📊 백업 내용

### Firestore 데이터
- sites (현장 정보)
- gisung (기성금 데이터)
- claims (청구서)
- documents (문서)
- discussions (토론)
- safety (안전 관리)
- estimates (견적서)
- progress (진도)
- users (사용자)
- templates (템플릿)

### Storage 파일
- documents (문서 파일)
- sites/photos (현장 사진)
- templates (템플릿 파일)
- stamps (인감 이미지)
- safety (안전 관련 파일)
- discussion_files (토론 첨부파일)

## ⚙️ 자동 스케줄러 설정

### Windows 작업 스케줄러
```bash
# 관리자 권한으로 실행
setup_backup_scheduler.bat
```

- **실행 주기**: 매주 일요일 오전 2시
- **백업 위치**: `backups/` 폴더
- **자동 정리**: 30일 이상 된 백업 자동 삭제

## 🔧 문제 해결

### 권한 오류
```
❌ Firebase 인증 실패: permission-denied
```
**해결방법**: 관리자 계정 정보를 올바르게 설정하거나 서비스 계정 키를 사용

### 백업 실패
```
❌ 백업 실패: Missing or insufficient permissions
```
**해결방법**: Firestore Rules에서 백업 계정에 읽기 권한 부여

### 스케줄러 설정 실패
```
❌ 작업 스케줄러 설정 실패
```
**해결방법**: 관리자 권한으로 실행하거나 수동으로 작업 스케줄러 설정

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. Firebase 프로젝트 설정이 올바른지
2. 관리자 계정 또는 서비스 계정 권한
3. Firestore Rules 설정
4. 네트워크 연결 상태

## 🛡️ 백업 파일 보호

### ⚠️ 중요: 백업 파일은 절대 삭제하지 마세요!
- 백업 파일들은 귀중한 자산입니다
- 자동 삭제 기능이 비활성화되어 있습니다
- 모든 백업 파일을 안전하게 보관하세요

### 백업 파일 보호 시스템
```bash
# 백업 파일 무결성 검사
node backup_protection.js --check

# 백업 파일 이중 백업
node backup_protection.js --backup

# 백업 폴더 크기 확인
node backup_protection.js --size
```

### 권장 보관 방법
1. **로컬 백업**: `backups/` 폴더에 저장
2. **외부 저장소**: 외장하드, 클라우드에 복사본 보관
3. **이중 백업**: 정기적으로 `backup_backup_*` 폴더 생성
4. **무결성 검사**: 정기적으로 백업 파일 상태 확인

## 🔒 보안 주의사항

- 백업 파일에는 민감한 데이터가 포함될 수 있습니다
- 백업 파일을 안전한 위치에 보관하세요
- 서비스 계정 키는 절대 공개하지 마세요
- 정기적으로 백업 파일의 보안을 점검하세요
- **백업 파일은 절대 삭제하지 마세요!**

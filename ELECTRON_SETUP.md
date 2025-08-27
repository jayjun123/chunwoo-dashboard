# Electron 데스크톱 앱 설정 가이드

## 🚀 개요
이 프로젝트는 React + Vite 웹 애플리케이션을 Electron을 사용하여 Windows 데스크톱 앱으로 변환한 것입니다.

## 📋 주요 기능
- ✅ Windows 실행 파일 (.exe) 생성
- ✅ 네이티브 메뉴바 및 시스템 통합
- ✅ 자동 업데이트 지원
- ✅ 오프라인 동작
- ✅ 기존 웹 기능 100% 유지

## 🛠️ 설치 및 설정

### 1. 의존성 설치
```bash
npm install --legacy-peer-deps
```

### 2. 개발 모드 실행
```bash
# 방법 1: npm 스크립트 사용
npm run electron:dev

# 방법 2: 배치 파일 사용 (Windows)
run-electron.bat
```

### 3. 프로덕션 빌드
```bash
# 방법 1: npm 스크립트 사용
npm run electron:dist

# 방법 2: 배치 파일 사용 (Windows)
build-electron-exe.bat
```

## 📁 파일 구조
```
electron/
├── main.js          # Electron 메인 프로세스
├── preload.js       # 보안 통신 브리지
└── ...

# 생성된 파일들
electron-dist/       # 빌드 출력 디렉토리
├── 현장관리 시스템 Setup.exe  # Windows 설치 프로그램
└── ...
```

## 🔧 사용 가능한 스크립트

| 스크립트 | 설명 |
|----------|------|
| `npm run electron` | Electron 앱 실행 (빌드된 파일 필요) |
| `npm run electron:dev` | 개발 모드로 Electron 앱 실행 |
| `npm run electron:build` | Electron 앱 빌드 |
| `npm run electron:dist` | Windows 설치 프로그램 생성 |
| `npm run electron:pack` | 패키징 (설치 프로그램 없음) |

## 🎯 주요 특징

### 보안
- `contextIsolation: true` - 보안 강화
- `nodeIntegration: false` - Node.js API 비활성화
- `enableRemoteModule: false` - 원격 모듈 비활성화

### 사용자 경험
- 네이티브 Windows 메뉴바
- 시스템 트레이 통합
- 시작 메뉴 및 바탕화면 바로가기
- 자동 업데이트 지원

### 개발 편의성
- 핫 리로드 지원
- 개발자 도구 통합
- 소스맵 지원

## 🚨 문제 해결

### 일반적인 문제들

#### 1. 포트 충돌
```bash
# 3000번 포트가 사용 중인 경우
netstat -ano | findstr :3000
taskkill /PID [PID] /F
```

#### 2. 의존성 충돌
```bash
npm install --legacy-peer-deps
```

#### 3. 빌드 실패
```bash
# 캐시 정리
npm run clean:all
npm install --legacy-peer-deps
```

### 로그 확인
- 개발 모드: 개발자 도구 콘솔
- 프로덕션: `%APPDATA%/현장관리 시스템/logs/`

## 📦 배포

### Windows 설치 프로그램 생성
```bash
npm run electron:dist
```

생성된 파일:
- `electron-dist/현장관리 시스템 Setup.exe` - 설치 프로그램
- `electron-dist/win-unpacked/` - 포터블 버전

### 자동 업데이트 설정
`electron-builder` 설정에서 `publish` 옵션을 설정하여 자동 업데이트를 활성화할 수 있습니다.

## 🔗 관련 링크
- [Electron 공식 문서](https://www.electronjs.org/docs)
- [electron-builder 문서](https://www.electron.build/)
- [Vite + Electron 가이드](https://vitejs.dev/guide/backend-integration.html#electron)

## 📝 라이선스
이 프로젝트는 MIT 라이선스 하에 배포됩니다.

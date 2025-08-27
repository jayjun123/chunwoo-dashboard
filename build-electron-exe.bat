@echo off
echo ========================================
echo 현장관리 시스템 Electron 빌드 시작
echo ========================================
echo.

echo 1. 의존성 패키지 설치 확인...
npm install --legacy-peer-deps

echo.
echo 2. React 앱 빌드...
npm run build

echo.
echo 3. Electron 실행 파일 생성...
npm run electron:dist

echo.
echo ========================================
echo 빌드 완료!
echo ========================================
echo.
echo 생성된 파일 위치: electron-dist/
echo.
echo 설치 프로그램: electron-dist/현장관리 시스템 Setup.exe
echo.
pause

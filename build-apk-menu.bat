@echo off
setlocal enabledelayedexpansion

:menu
cls
echo.
echo ========================================
echo 🚀 천우시스템 APK 빌드 메뉴
echo ========================================
echo.
echo 1. 📱 릴리즈 APK 빌드 (풀버전)
echo 2. 🐛 디버그 APK 빌드 (빠른 버전)
echo 3. ⚡ 간단한 릴리즈 APK 빌드
echo 4. 🧹 빌드 캐시 정리
echo 5. 📋 빌드 환경 확인
echo 6. ❌ 종료
echo.
echo ========================================
echo 선택하세요 (1-6): 
set /p choice=

if "%choice%"=="1" goto full_build
if "%choice%"=="2" goto debug_build
if "%choice%"=="3" goto simple_build
if "%choice%"=="4" goto clean_build
if "%choice%"=="5" goto check_env
if "%choice%"=="6" goto exit
goto menu

:full_build
echo.
echo 📱 릴리즈 APK 빌드 (풀버전) 시작...
call build-apk-full.bat
goto menu

:debug_build
echo.
echo 🐛 디버그 APK 빌드 시작...
call build-apk-debug.bat
goto menu

:simple_build
echo.
echo ⚡ 간단한 릴리즈 APK 빌드 시작...
call build-apk-simple.bat
goto menu

:clean_build
echo.
echo 🧹 빌드 캐시 정리 중...
echo.

:: npm 캐시 정리
echo 📦 npm 캐시 정리 중...
call npm cache clean --force
echo ✅ npm 캐시 정리 완료

:: dist 폴더 정리
if exist "dist" (
    echo 📁 dist 폴더 삭제 중...
    rmdir /s /q "dist" 2>nul
    echo ✅ dist 폴더 삭제 완료
)

:: android build 폴더 정리
if exist "android\app\build" (
    echo 📁 android\app\build 폴더 삭제 중...
    rmdir /s /q "android\app\build" 2>nul
    echo ✅ android\app\build 폴더 삭제 완료
)

:: node_modules 정리 (선택사항)
echo.
echo 🔄 node_modules를 다시 설치하시겠습니까? (Y/N)
set /p reinstall=
if /i "!reinstall!"=="Y" (
    echo 📦 node_modules 삭제 중...
    rmdir /s /q "node_modules" 2>nul
    echo 📦 node_modules 재설치 중...
    call npm install --legacy-peer-deps
    echo ✅ node_modules 재설치 완료
)

echo.
echo ✅ 빌드 캐시 정리 완료!
echo.
pause
goto menu

:check_env
echo.
echo 📋 빌드 환경 확인 중...
echo.

:: Java 확인
echo 📋 Java 환경:
java -version 2>&1 | findstr "version"
if %errorlevel% neq 0 (
    echo ❌ Java가 설치되지 않았습니다.
) else (
    echo ✅ Java 확인 완료
)

echo.

:: Node.js 확인
echo 📋 Node.js 환경:
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js가 설치되지 않았습니다.
) else (
    echo ✅ Node.js 확인 완료
)

echo.

:: npm 확인
echo 📋 npm 환경:
npm --version
if %errorlevel% neq 0 (
    echo ❌ npm이 설치되지 않았습니다.
) else (
    echo ✅ npm 확인 완료
)

echo.

:: Android SDK 확인
echo 📋 Android SDK 환경:
if exist "%ANDROID_HOME%" (
    echo ✅ ANDROID_HOME: %ANDROID_HOME%
) else if exist "%LOCALAPPDATA%\Android\Sdk" (
    echo ✅ Android SDK: %LOCALAPPDATA%\Android\Sdk
) else (
    echo ⚠️  Android SDK를 찾을 수 없습니다.
)

echo.

:: Capacitor 확인
echo 📋 Capacitor 환경:
npx cap --version
if %errorlevel% neq 0 (
    echo ❌ Capacitor가 설치되지 않았습니다.
) else (
    echo ✅ Capacitor 확인 완료
)

echo.

:: 프로젝트 구조 확인
echo 📋 프로젝트 구조:
if exist "package.json" (
    echo ✅ package.json 존재
) else (
    echo ❌ package.json 없음
)

if exist "capacitor.config.ts" (
    echo ✅ capacitor.config.ts 존재
) else (
    echo ❌ capacitor.config.ts 없음
)

if exist "android" (
    echo ✅ android 폴더 존재
) else (
    echo ❌ android 폴더 없음
)

echo.
echo ✅ 환경 확인 완료!
echo.
pause
goto menu

:exit
echo.
echo 👋 APK 빌드 도구를 종료합니다.
echo.
exit /b 0 
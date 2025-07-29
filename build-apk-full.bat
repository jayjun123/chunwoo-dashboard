@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo 🚀 천우시스템 APK 빌드 도구
echo ========================================
echo.

:: 관리자 권한 확인
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  관리자 권한이 필요할 수 있습니다.
    echo.
)

:: Java 확인
echo 📋 Java 환경 확인 중...
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Java가 설치되지 않았습니다.
    echo    Java 11 이상을 설치해주세요.
    pause
    exit /b 1
)
echo ✅ Java 확인 완료

:: Node.js 확인
echo 📋 Node.js 환경 확인 중...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js가 설치되지 않았습니다.
    echo    Node.js를 설치해주세요.
    pause
    exit /b 1
)
echo ✅ Node.js 확인 완료

:: Android SDK 확인
echo 📋 Android SDK 확인 중...
if not exist "%ANDROID_HOME%" (
    if not exist "%LOCALAPPDATA%\Android\Sdk" (
        echo ⚠️  Android SDK를 찾을 수 없습니다.
        echo    Android Studio를 설치하거나 ANDROID_HOME을 설정해주세요.
    ) else (
        set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
    )
)
echo ✅ Android SDK 확인 완료

echo.
echo ========================================
echo 1단계: 의존성 설치
echo ========================================
echo.

:: 이전 빌드 정리
echo 🧹 이전 빌드 정리 중...
if exist "dist" (
    echo    dist 폴더 삭제 중...
    rmdir /s /q "dist" 2>nul
)
if exist "android\app\build" (
    echo    android\app\build 폴더 삭제 중...
    rmdir /s /q "android\app\build" 2>nul
)
echo ✅ 정리 완료

:: npm 의존성 설치
echo 📦 npm 의존성 설치 중...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo ❌ npm 의존성 설치 실패
    echo    인터넷 연결을 확인하거나 npm 캐시를 정리해주세요.
    pause
    exit /b 1
)
echo ✅ npm 의존성 설치 완료

echo.
echo ========================================
echo 2단계: 프로젝트 빌드
echo ========================================
echo.

:: 프로덕션 빌드
echo 🔨 프로덕션 빌드 중...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 프로덕션 빌드 실패
    echo    빌드 오류를 확인해주세요.
    pause
    exit /b 1
)
echo ✅ 프로덕션 빌드 완료

:: 빌드 결과 확인
if not exist "dist\index.html" (
    echo ❌ 빌드 결과물을 찾을 수 없습니다.
    pause
    exit /b 1
)
echo 📁 빌드 결과물 확인 완료

echo.
echo ========================================
echo 3단계: Capacitor 동기화
echo ========================================
echo.

:: Capacitor 동기화
echo 🔄 Capacitor 동기화 중...
call npx cap sync
if %errorlevel% neq 0 (
    echo ❌ Capacitor 동기화 실패
    echo    Capacitor 설정을 확인해주세요.
    pause
    exit /b 1
)
echo ✅ Capacitor 동기화 완료

:: Android 프로젝트 확인
if not exist "android\app\src\main\assets\public\index.html" (
    echo ❌ Android 프로젝트에 웹 에셋이 복사되지 않았습니다.
    pause
    exit /b 1
)
echo 📱 Android 프로젝트 확인 완료

echo.
echo ========================================
echo 4단계: Android APK 빌드
echo ========================================
echo.

:: Android 디렉토리로 이동
cd android

:: Gradle 캐시 정리 (선택사항)
echo 🧹 Gradle 캐시 정리 중...
call gradlew.bat clean >nul 2>&1
echo ✅ Gradle 캐시 정리 완료

:: Release APK 빌드
echo 🔨 Release APK 빌드 중...
call gradlew.bat assembleRelease
if %errorlevel% neq 0 (
    echo ❌ APK 빌드 실패
    echo    Android SDK 설정을 확인해주세요.
    cd ..
    pause
    exit /b 1
)
echo ✅ APK 빌드 완료

:: 프로젝트 루트로 복귀
cd ..

echo.
echo ========================================
echo 5단계: 결과 확인
echo ========================================
echo.

:: APK 파일 확인
set APK_PATH=android\app\build\outputs\apk\release\app-release.apk
if exist "%APK_PATH%" (
    echo ✅ APK 파일 생성 완료
    
    :: 파일 크기 확인
    for %%A in ("%APK_PATH%") do (
        set APK_SIZE=%%~zA
        set APK_SIZE_MB=!APK_SIZE:~0,-6!
        echo 📦 파일 크기: !APK_SIZE_MB! MB
    )
    
    :: 파일 정보 출력
    echo 📱 파일 경로: %APK_PATH%
    echo 📋 패키지명: com.chunwoo.ai
    echo 🏷️  앱명: 천우시스템
    echo 📅 빌드 시간: %date% %time%
    
    :: APK 파일을 탐색기에서 열기
    echo.
    echo 🔍 APK 파일을 탐색기에서 열까요? (Y/N)
    set /p OPEN_EXPLORER=
    if /i "!OPEN_EXPLORER!"=="Y" (
        explorer /select,"%APK_PATH%"
    )
    
) else (
    echo ❌ APK 파일을 찾을 수 없습니다.
    echo    빌드 과정에서 오류가 발생했을 수 있습니다.
    pause
    exit /b 1
)

echo.
echo ========================================
echo 🎉 APK 빌드 완료!
echo ========================================
echo.
echo 📱 APK 파일: %APK_PATH%
echo 📋 패키지명: com.chunwoo.ai
echo 🏷️  앱명: 천우시스템
echo 📅 빌드 시간: %date% %time%
echo.
echo 💡 다음 단계:
echo    1. APK 파일을 Android 기기에 설치
echo    2. 앱 기능 테스트
echo    3. 문제 발생 시 로그 확인
echo.
echo 🔧 문제 해결:
echo    - 빌드 실패: gradlew.bat clean 후 재시도
echo    - 동기화 실패: npx cap sync --force
echo    - 의존성 문제: npm install --legacy-peer-deps
echo.
pause 
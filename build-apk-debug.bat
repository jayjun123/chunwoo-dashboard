@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo 🐛 천우시스템 디버그 APK 빌드 도구
echo ========================================
echo.

:: 환경 확인
echo 📋 환경 확인 중...
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Java가 설치되지 않았습니다.
    pause
    exit /b 1
)

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js가 설치되지 않았습니다.
    pause
    exit /b 1
)
echo ✅ 환경 확인 완료

echo.
echo ========================================
echo 1단계: 프로젝트 빌드
echo ========================================
echo.

:: 개발 빌드 (더 빠름)
echo 🔨 개발 빌드 중...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 빌드 실패
    pause
    exit /b 1
)
echo ✅ 빌드 완료

echo.
echo ========================================
echo 2단계: Capacitor 동기화
echo ========================================
echo.

:: 빠른 동기화
echo 🔄 Capacitor 동기화 중...
call npx cap sync
if %errorlevel% neq 0 (
    echo ❌ 동기화 실패
    pause
    exit /b 1
)
echo ✅ 동기화 완료

echo.
echo ========================================
echo 3단계: 디버그 APK 빌드
echo ========================================
echo.

cd android

:: 디버그 APK 빌드 (더 빠름)
echo 🔨 디버그 APK 빌드 중...
call gradlew.bat assembleDebug
if %errorlevel% neq 0 (
    echo ❌ 디버그 APK 빌드 실패
    cd ..
    pause
    exit /b 1
)
echo ✅ 디버그 APK 빌드 완료

cd ..

echo.
echo ========================================
echo 4단계: 결과 확인
echo ========================================
echo.

:: 디버그 APK 파일 확인
set DEBUG_APK_PATH=android\app\build\outputs\apk\debug\app-debug.apk
if exist "%DEBUG_APK_PATH%" (
    echo ✅ 디버그 APK 파일 생성 완료
    
    :: 파일 크기 확인
    for %%A in ("%DEBUG_APK_PATH%") do (
        set APK_SIZE=%%~zA
        set APK_SIZE_MB=!APK_SIZE:~0,-6!
        echo 📦 파일 크기: !APK_SIZE_MB! MB
    )
    
    echo 📱 파일 경로: %DEBUG_APK_PATH%
    echo 📋 패키지명: com.chunwoo.ai
    echo 🏷️  앱명: 천우시스템 (디버그)
    echo 📅 빌드 시간: %date% %time%
    
    :: APK 파일을 탐색기에서 열기
    echo.
    echo 🔍 APK 파일을 탐색기에서 열까요? (Y/N)
    set /p OPEN_EXPLORER=
    if /i "!OPEN_EXPLORER!"=="Y" (
        explorer /select,"%DEBUG_APK_PATH%"
    )
    
) else (
    echo ❌ 디버그 APK 파일을 찾을 수 없습니다.
    pause
    exit /b 1
)

echo.
echo ========================================
echo 🎉 디버그 APK 빌드 완료!
echo ========================================
echo.
echo 📱 디버그 APK 파일: %DEBUG_APK_PATH%
echo 📋 패키지명: com.chunwoo.ai
echo 🏷️  앱명: 천우시스템 (디버그)
echo 📅 빌드 시간: %date% %time%
echo.
echo 💡 디버그 APK 특징:
echo    - 빠른 빌드 시간
echo    - 디버깅 정보 포함
echo    - 개발 테스트용
echo    - 서명되지 않음
echo.
pause 
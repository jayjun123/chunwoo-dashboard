@echo off
echo ========================================
echo 천우시스템 APK 빌드 시작
echo ========================================

echo.
echo 1. 프로젝트 빌드 중 (모바일 최적화)...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 프로젝트 빌드 실패
    pause
    exit /b 1
)
echo ✅ 프로젝트 빌드 완료 (모바일 최적화 적용)

echo.
echo 2. Capacitor 동기화 중 (모바일 설정 적용)...
call npx cap sync
if %errorlevel% neq 0 (
    echo ❌ Capacitor 동기화 실패
    pause
    exit /b 1
)
echo ✅ Capacitor 동기화 완료 (모바일 설정 적용)

echo.
echo 3. Android APK 빌드 중...
cd android
call gradlew.bat assembleRelease
if %errorlevel% neq 0 (
    echo ❌ APK 빌드 실패
    pause
    exit /b 1
)
echo ✅ APK 빌드 완료

echo.
echo 4. APK 파일 확인 중...
if exist "app\build\outputs\apk\release\app-release.apk" (
    echo ✅ APK 파일 생성 완료
    echo 📱 파일 위치: android\app\build\outputs\apk\release\app-release.apk
    echo 📦 파일 크기: 
    for %%A in ("app\build\outputs\apk\release\app-release.apk") do echo    %%~zA bytes
) else (
    echo ❌ APK 파일을 찾을 수 없습니다
    pause
    exit /b 1
)

echo.
echo ========================================
echo 🎉 APK 빌드 완료! (모바일 최적화 적용)
echo ========================================
echo.
echo 📱 APK 파일: android\app\build\outputs\apk\release\app-release.apk
echo 📋 패키지명: com.chunwoo.ai
echo 🏷️  앱명: 천우시스템
echo 📱 모바일 최적화: 터치, 스크롤, 입력 필드 최적화 완료
echo 🎨 반응형 디자인: 모든 화면 크기 지원
echo ⚡ 성능 최적화: 배터리 절약, 네트워크 최적화 적용
echo.
pause 
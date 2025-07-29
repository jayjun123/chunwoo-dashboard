@echo off
echo APK 빌드 시작...

npm run build
npx cap sync
cd android
gradlew.bat assembleRelease

echo.
echo APK 빌드 완료!
echo 파일 위치: android\app\build\outputs\apk\release\app-release.apk
pause 
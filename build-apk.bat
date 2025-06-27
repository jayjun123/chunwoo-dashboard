@echo off
echo Building Chunwoo APK...

echo 1. Building production...
npm run build

echo 2. Syncing with Android...
npx cap sync android

echo 3. Opening Android Studio...
npx cap open android

echo.
echo Please complete the following steps in Android Studio:
echo 1. Build -^> Generate Signed Bundle / APK
echo 2. Select APK and create keystore
echo 3. Build the release APK
echo.
echo APK will be located at: android/app/build/outputs/apk/release/app-release.apk
pause 
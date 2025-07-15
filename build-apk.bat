@echo off
echo Building Chunwoo APK...

echo 1. Cleaning previous build...
rmdir /s /q dist 2>nul
rmdir /s /q android\app\build 2>nul

echo 2. Installing dependencies...
npm install

echo 3. Building production...
npm run build

echo 4. Syncing with Android...
npx cap sync android

echo 5. Copying web assets...
npx cap copy android

echo 6. Opening Android Studio...
npx cap open android

echo.
echo Please complete the following steps in Android Studio:
echo 1. Build -^> Generate Signed Bundle / APK
echo 2. Select APK and create keystore
echo 3. Build the release APK
echo.
echo APK will be located at: android/app/build/outputs/apk/release/app-release.apk
echo.
echo Troubleshooting:
echo - If build fails, try: cd android && ./gradlew clean && cd ..
echo - If sync fails, try: npx cap sync android --force
echo.
pause 
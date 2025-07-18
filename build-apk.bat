@echo off
echo Building Chunwoo APK...

echo 1. Cleaning previous build...
if exist dist rmdir /s /q dist
if exist android\app\build rmdir /s /q android\app\build

echo 2. Installing dependencies...
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo Error: npm install failed
    pause
    exit /b 1
)

echo 3. Building production...
call npm run build
if errorlevel 1 (
    echo Error: npm run build failed
    pause
    exit /b 1
)

echo 4. Syncing with Android...
call npx cap sync android
if errorlevel 1 (
    echo Error: cap sync failed
    pause
    exit /b 1
)

echo 5. Copying web assets...
call npx cap copy android
if errorlevel 1 (
    echo Error: cap copy failed
    pause
    exit /b 1
)

echo 6. Opening Android Studio...
call npx cap open android

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
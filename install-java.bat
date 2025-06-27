@echo off
echo Java 설치 안내
echo.
echo 1. OpenJDK 11 또는 17을 다운로드하세요:
echo    https://adoptium.net/temurin/releases/
echo.
echo 2. 설치 후 환경변수를 설정하세요:
echo    JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-11.0.21.9-hotspot
echo    PATH에 %JAVA_HOME%\bin 추가
echo.
echo 3. 설치 확인:
echo    java -version
echo.
echo 4. 키스토어 생성:
echo    keytool -genkey -v -keystore android/app/chunwoo-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias chunwoo-key-alias
echo.
pause 
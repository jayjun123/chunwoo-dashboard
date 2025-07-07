@echo off
echo Java 21 설치를 시작합니다...

REM Java 21 다운로드 URL (Eclipse Temurin)
set DOWNLOAD_URL=https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.2%%2B13/OpenJDK21U-jdk_x64_windows_hotspot_21.0.2_13.msi

REM 다운로드할 파일명
set INSTALLER_FILE=OpenJDK21U-jdk_x64_windows_hotspot_21.0.2_13.msi

echo Java 21 다운로드 중...
powershell -Command "Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%INSTALLER_FILE%'"

if exist "%INSTALLER_FILE%" (
    echo Java 21 설치 중...
    msiexec /i "%INSTALLER_FILE%" /quiet /norestart
    
    echo 설치 완료 후 환경 변수 설정 중...
    setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-21.0.2.13-hotspot" /M
    setx PATH "%PATH%;C:\Program Files\Eclipse Adoptium\jdk-21.0.2.13-hotspot\bin" /M
    
    echo 설치 파일 정리 중...
    del "%INSTALLER_FILE%"
    
    echo Java 21 설치가 완료되었습니다!
    echo 새 명령 프롬프트를 열어서 'java -version'을 실행해보세요.
) else (
    echo 다운로드에 실패했습니다. 수동으로 설치해주세요.
    echo https://adoptium.net/temurin/releases/?version=21 에서 다운로드하세요.
)

pause 
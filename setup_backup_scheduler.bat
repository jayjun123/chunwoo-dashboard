@echo off
chcp 65001 >nul
echo ========================================
echo Firebase 자동 백업 스케줄러 설정
echo ========================================
echo.

:: 현재 디렉토리 확인
echo 현재 작업 디렉토리: %CD%
echo.

:: Node.js 설치 확인
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js가 설치되어 있지 않습니다.
    echo Node.js를 먼저 설치해주세요: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js 확인 완료
echo.

:: 백업 스크립트 존재 확인
if not exist "auto_backup.js" (
    echo ❌ auto_backup.js 파일을 찾을 수 없습니다.
    echo 현재 디렉토리에 auto_backup.js 파일이 있는지 확인해주세요.
    pause
    exit /b 1
)

echo ✅ 백업 스크립트 확인 완료
echo.

:: 작업 스케줄러 작업 이름
set "TASK_NAME=Firebase_Auto_Backup"
set "TASK_DESCRIPTION=Firebase 데이터 일주일마다 자동 백업"

:: 기존 작업 삭제 (있는 경우)
echo 기존 백업 작업 삭제 중...
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

:: 새 작업 생성
echo 새 백업 작업 생성 중...
schtasks /create /tn "%TASK_NAME%" /tr "node \"%CD%\auto_backup.js\"" /sc weekly /d SUN /st 02:00 /ru SYSTEM /f

if %errorlevel% equ 0 (
    echo.
    echo ✅ 자동 백업 스케줄러 설정 완료!
    echo.
    echo 📅 백업 일정: 매주 일요일 오전 2시
    echo 📁 백업 위치: %CD%\backups\
    echo 🔧 작업 이름: %TASK_NAME%
    echo.
    echo 📋 작업 정보:
    schtasks /query /tn "%TASK_NAME%" /fo list
    echo.
    echo 💡 수동 백업 실행: node auto_backup.js --manual
    echo 💡 작업 삭제: schtasks /delete /tn "%TASK_NAME%" /f
    echo.
) else (
    echo.
    echo ❌ 작업 스케줄러 설정 실패
    echo 관리자 권한으로 실행해주세요.
    echo.
)

:: 백업 디렉토리 생성
if not exist "backups" (
    mkdir backups
    echo 📁 백업 디렉토리 생성: backups\
)

echo.
echo ========================================
echo 설정 완료!
echo ========================================
pause

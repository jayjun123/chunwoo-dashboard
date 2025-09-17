@echo off
echo ========================================
echo    L/N 템플릿 파일 업로드 스크립트
echo ========================================
echo.
echo 이 스크립트는 public 폴더의 템플릿 파일들을
echo Firebase Storage에 업로드합니다.
echo.
echo 업로드할 파일:
echo - NEW.xlsx (N 뉴기성 - 20개 이하 물량)
echo - LONG.xlsx (L 롱기성 - 21개 이상 물량)
echo.
pause

echo.
echo 🚀 템플릿 업로드 시작...
node upload_public_templates.js

echo.
echo 📋 업로드 완료!
echo.
echo 다음 단계:
echo 1. Firebase Storage에서 templates 폴더 확인
echo 2. NEW.xlsx와 LONG.xlsx 파일 존재 여부 확인
echo 3. 현장에서 L/N 표시가 올바르게 작동하는지 테스트
echo.
pause
























<<<<<<< HEAD


=======
>>>>>>> ae5decb092edae570c53532171b77e663caa0146









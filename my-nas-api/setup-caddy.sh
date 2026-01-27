#!/bin/bash

# Caddy 설치 및 설정 스크립트
# NAS에서 실행: bash setup-caddy.sh

set -e

echo "=== Caddy 설치 및 설정 시작 ==="

# Caddy 다운로드 (Linux ARM64용)
CADDY_VERSION="2.7.6"
CADDY_DIR="/volume2/공유폴더/PLAYwithME/my-nas-api/caddy"
CADDY_BIN="$CADDY_DIR/caddy"

# 디렉토리 생성
mkdir -p "$CADDY_DIR"
cd "$CADDY_DIR"

# Caddy 다운로드
if [ ! -f "$CADDY_BIN" ]; then
    echo "Caddy 다운로드 중..."
    wget -O caddy.tar.gz "https://github.com/caddyserver/caddy/releases/download/v${CADDY_VERSION}/caddy_${CADDY_VERSION}_linux_arm64.tar.gz"
    tar -xzf caddy.tar.gz
    rm caddy.tar.gz
    chmod +x caddy
    echo "Caddy 다운로드 완료"
else
    echo "Caddy가 이미 설치되어 있습니다."
fi

# Caddyfile 확인
CADDYFILE="/volume2/공유폴더/PLAYwithME/my-nas-api/Caddyfile"
if [ ! -f "$CADDYFILE" ]; then
    echo "오류: Caddyfile을 찾을 수 없습니다: $CADDYFILE"
    exit 1
fi

echo "=== Caddy 설정 완료 ==="
echo ""
echo "Caddy 실행 방법:"
echo "  $CADDY_BIN run --config $CADDYFILE"
echo ""
echo "PM2로 실행하려면:"
echo "  pm2 start $CADDY_BIN --name caddy -- --config $CADDYFILE"
echo "  pm2 save"

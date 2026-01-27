#!/bin/bash

# UGREEN NAS용 Caddy 설치 스크립트
# NAS 아키텍처에 맞는 Caddy 바이너리 다운로드

set -e

echo "=== Caddy 설치 시작 ==="

# 아키텍처 확인
ARCH=$(uname -m)
echo "시스템 아키텍처: $ARCH"

# 아키텍처에 맞는 다운로드 URL 결정
case $ARCH in
    aarch64|arm64)
        CADDY_ARCH="arm64"
        ;;
    x86_64|amd64)
        CADDY_ARCH="amd64"
        ;;
    armv7l|armv6l)
        CADDY_ARCH="armv7"
        ;;
    *)
        echo "지원하지 않는 아키텍처: $ARCH"
        exit 1
        ;;
esac

CADDY_VERSION="2.7.6"
CADDY_DIR="/volume2/공유폴더/PLAYwithME/my-nas-api/caddy"
CADDY_BIN="$CADDY_DIR/caddy"

# 디렉토리 생성
mkdir -p "$CADDY_DIR"
cd "$CADDY_DIR"

# Caddy 다운로드
if [ ! -f "$CADDY_BIN" ]; then
    echo "Caddy v${CADDY_VERSION} (${CADDY_ARCH}) 다운로드 중..."
    
    # wget 또는 curl 사용
    if command -v wget &> /dev/null; then
        wget -O caddy.tar.gz "https://github.com/caddyserver/caddy/releases/download/v${CADDY_VERSION}/caddy_${CADDY_VERSION}_linux_${CADDY_ARCH}.tar.gz"
    elif command -v curl &> /dev/null; then
        curl -L -o caddy.tar.gz "https://github.com/caddyserver/caddy/releases/download/v${CADDY_VERSION}/caddy_${CADDY_VERSION}_linux_${CADDY_ARCH}.tar.gz"
    else
        echo "오류: wget 또는 curl이 필요합니다."
        exit 1
    fi
    
    # 압축 해제
    tar -xzf caddy.tar.gz
    rm caddy.tar.gz
    chmod +x caddy
    
    echo "✅ Caddy 설치 완료: $CADDY_BIN"
else
    echo "✅ Caddy가 이미 설치되어 있습니다: $CADDY_BIN"
fi

# 실행 권한 확인
if [ -x "$CADDY_BIN" ]; then
    echo "✅ Caddy 실행 권한 확인됨"
    $CADDY_BIN version
else
    echo "❌ Caddy 실행 권한이 없습니다"
    chmod +x "$CADDY_BIN"
fi

echo ""
echo "=== 설치 완료 ==="
echo ""
echo "다음 단계:"
echo "1. 공유기에서 포트 포워딩 설정:"
echo "   외부 포트 443 → 내부 IP 192.168.0.70:443"
echo ""
echo "2. Caddy 실행:"
echo "   pm2 start $CADDY_BIN --name caddy -- --config /volume2/공유폴더/PLAYwithME/my-nas-api/Caddyfile"
echo "   pm2 save"

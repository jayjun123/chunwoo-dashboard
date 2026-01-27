#!/bin/bash

# Caddy 시작 스크립트
CADDY_BIN="/volume2/공유폴더/PLAYwithME/my-nas-api/caddy/caddy"
CADDYFILE="/volume2/공유폴더/PLAYwithME/my-nas-api/Caddyfile"

if [ ! -f "$CADDY_BIN" ]; then
    echo "Caddy가 설치되어 있지 않습니다. setup-caddy.sh를 먼저 실행하세요."
    exit 1
fi

echo "Caddy 시작 중..."
$CADDY_BIN run --config "$CADDYFILE"

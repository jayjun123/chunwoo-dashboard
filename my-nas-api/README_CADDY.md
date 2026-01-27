# Caddy 설정 가이드

Caddy를 사용하여 HTTPS를 자동으로 설정하고 NAS API를 외부에 노출합니다.

## 설정 순서

### 1. NAS 터미널 접속

```bash
ssh 성현준@192.168.0.70
cd /volume2/공유폴더/PLAYwithME/my-nas-api
```

### 2. Caddy 설치

```bash
bash setup-caddy.sh
```

### 3. Caddy 실행 (PM2 사용)

```bash
# PM2로 Caddy 실행
pm2 start /volume2/공유폴더/PLAYwithME/my-nas-api/caddy/caddy --name caddy -- --config /volume2/공유폴더/PLAYwithME/my-nas-api/Caddyfile

# PM2 저장
pm2 save
```

### 4. 포트 포워딩 확인

공유기에서 다음 포트 포워딩이 설정되어 있어야 합니다:
- 외부 포트 443 (HTTPS) → 내부 IP 192.168.0.70:443

**중요**: Caddy는 443 포트에서 실행되므로, 공유기에서 443 포트를 NAS의 443 포트로 포워딩해야 합니다.

### 5. 환경변수 업데이트

프론트엔드 `.env` 파일과 Netlify 환경변수에 다음을 설정:

```
VITE_NAS_API_URL=https://chunwoo.iptime.org
```

## Caddy 작동 방식

1. Caddy가 `chunwoo.iptime.org` 도메인으로 들어오는 요청을 받습니다
2. 자동으로 Let's Encrypt 인증서를 발급받습니다 (처음 접속 시)
3. HTTPS로 암호화된 연결을 제공합니다
4. 내부의 `192.168.0.70:3000` (NAS API)로 요청을 프록시합니다

## 문제 해결

### Caddy가 시작되지 않는 경우

```bash
# 로그 확인
pm2 logs caddy

# Caddy 직접 실행하여 오류 확인
/volume2/공유폴더/PLAYwithME/my-nas-api/caddy/caddy run --config /volume2/공유폴더/PLAYwithME/my-nas-api/Caddyfile
```

### 인증서 발급 실패

- DDNS가 올바르게 설정되어 있는지 확인
- 포트 443이 외부에서 접근 가능한지 확인
- 방화벽에서 443 포트가 열려있는지 확인

### Caddy 재시작

```bash
pm2 restart caddy
```

## 확인

브라우저에서 다음 URL로 접속하여 확인:
- https://chunwoo.iptime.org/health
- https://chunwoo.iptime.org/mail-summaries

HTTPS로 정상 작동하면 성공입니다!

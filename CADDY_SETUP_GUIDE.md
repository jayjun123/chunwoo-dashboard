# Caddy HTTPS 설정 가이드

NAS API를 HTTPS로 외부에 노출하기 위한 Caddy 설정 가이드입니다.

## 🎯 목표

- `chunwoo.iptime.org` 도메인으로 HTTPS 자동 설정
- Let's Encrypt 인증서 자동 발급
- Mixed Content 오류 해결

## 📋 사전 준비

1. ✅ DDNS 설정 완료: `chunwoo.iptime.org` → `110.8.232.3`
2. ✅ NAS API 실행 중: `192.168.0.70:3000`
3. ✅ 포트 포워딩 준비 필요

## 🔧 설정 단계

### 1단계: NAS 터미널 접속

```bash
ssh 성현준@192.168.0.70
cd /volume2/공유폴더/PLAYwithME/my-nas-api
```

### 2단계: Caddy 설치

```bash
chmod +x install-caddy-nas.sh
bash install-caddy-nas.sh
```

### 3단계: 공유기 포트 포워딩 설정

**중요**: 기존 포트 포워딩을 변경해야 합니다.

#### ipTIME 공유기 설정:
1. 고급 설정 → NAT/라우터 관리 → 포트포워드 설정
2. 기존 `nas-api` 규칙 수정 또는 새 규칙 추가:
   - **규칙이름**: `caddy-https`
   - **내부 IP**: `192.168.0.70`
   - **프로토콜**: `TCP`
   - **외부 포트**: `443`
   - **내부 포트**: `443`
3. 적용 버튼 클릭

### 4단계: Caddy 실행 (PM2)

```bash
pm2 start /volume2/공유폴더/PLAYwithME/my-nas-api/caddy/caddy --name caddy -- --config /volume2/공유폴더/PLAYwithME/my-nas-api/Caddyfile
pm2 save
```

### 5단계: 환경변수 업데이트

#### 로컬 개발 환경 (`.env`)

```env
VITE_NAS_API_URL=https://chunwoo.iptime.org
```

#### Netlify 환경변수

1. Netlify 대시보드 → Site settings → Environment variables
2. `VITE_NAS_API_URL` 수정:
   - 기존: `http://110.8.232.3:3000` 또는 `http://192.168.0.70:3000`
   - 변경: `https://chunwoo.iptime.org`

### 6단계: 확인

브라우저에서 다음 URL 접속:
- ✅ https://chunwoo.iptime.org/health
- ✅ https://chunwoo.iptime.org/mail-summaries

## 🔍 문제 해결

### Caddy가 시작되지 않는 경우

```bash
# PM2 로그 확인
pm2 logs caddy

# Caddy 직접 실행하여 오류 확인
/volume2/공유폴더/PLAYwithME/my-nas-api/caddy/caddy run --config /volume2/공유폴더/PLAYwithME/my-nas-api/Caddyfile
```

### 인증서 발급 실패

1. **DDNS 확인**: `chunwoo.iptime.org`가 현재 공인 IP를 가리키는지 확인
2. **포트 확인**: 외부에서 443 포트 접근 가능한지 확인
   ```bash
   # 외부에서 테스트 (다른 컴퓨터나 모바일)
   curl -I https://chunwoo.iptime.org/health
   ```
3. **방화벽 확인**: NAS 방화벽에서 443 포트 허용 확인

### Mixed Content 오류가 계속 발생하는 경우

1. 브라우저 캐시 삭제
2. Netlify 재배포 (환경변수 변경 후)
3. 브라우저 개발자 도구에서 Network 탭 확인

## 📝 Caddy 관리 명령어

```bash
# Caddy 재시작
pm2 restart caddy

# Caddy 중지
pm2 stop caddy

# Caddy 상태 확인
pm2 status caddy

# Caddy 로그 확인
pm2 logs caddy
```

## ✅ 완료 체크리스트

- [ ] Caddy 설치 완료
- [ ] 공유기 포트 포워딩 설정 (443 → 443)
- [ ] Caddy PM2로 실행 중
- [ ] HTTPS 접속 테스트 성공
- [ ] 환경변수 업데이트 완료
- [ ] Netlify 재배포 완료
- [ ] 프론트엔드에서 API 호출 성공

## 🎉 완료!

이제 `https://chunwoo.iptime.org`로 안전하게 API에 접근할 수 있습니다!

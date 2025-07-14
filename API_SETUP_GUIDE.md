# API 키 설정 가이드

이 프로젝트는 실제 API 키를 사용하여 뉴스와 날씨 정보를 제공합니다. 더미 데이터는 제거되었으므로 API 키 설정이 필수입니다.

## 1. 네이버 뉴스 API 설정

### 1.1 네이버 개발자 센터에서 API 키 발급
1. [네이버 개발자 센터](https://developers.naver.com/)에 접속
2. 애플리케이션 등록
3. "검색" API 서비스 추가
4. Client ID와 Client Secret 발급

### 1.2 환경변수 설정
프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가:

```env
VITE_NAVER_CLIENT_ID=your_naver_client_id_here
VITE_NAVER_CLIENT_SECRET=your_naver_client_secret_here
```

## 2. 기상청 날씨 API 설정

### 2.1 기상청 API 키 발급
1. [공공데이터포털](https://www.data.go.kr/)에 접속
2. 회원가입 및 로그인
3. "단기예보 조회서비스" API 신청
4. 인증키 발급

### 2.2 환경변수 설정
`.env` 파일에 다음 내용 추가:

```env
VITE_WEATHER_API_KEY=your_weather_api_key_here
```

## 3. 서버 프록시 설정

### 3.1 서버에 네이버 뉴스 API 프록시 추가
`server/app.js`에 다음 라우트가 이미 설정되어 있습니다:

```javascript
// 네이버 뉴스 API 프록시
app.get('/naverapi/v1/search/news.json', async (req, res) => {
  try {
    const { query, display, sort, start } = req.query;
    const clientId = process.env.VITE_NAVER_CLIENT_ID;
    const clientSecret = process.env.VITE_NAVER_CLIENT_SECRET;
    
    const response = await axios.get('https://openapi.naver.com/v1/search/news.json', {
      params: { query, display, sort, start },
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('네이버 API 프록시 오류:', error);
    res.status(500).json({ error: '뉴스 검색 중 오류가 발생했습니다.' });
  }
});
```

## 4. 환경변수 파일 예시

완성된 `.env` 파일 예시:

```env
# 네이버 뉴스 API
VITE_NAVER_CLIENT_ID=your_actual_naver_client_id
VITE_NAVER_CLIENT_SECRET=your_actual_naver_client_secret

# 기상청 날씨 API
VITE_WEATHER_API_KEY=your_actual_weather_api_key

# Firebase 설정 (기존)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 5. API 키 설정 확인

### 5.1 개발 서버 재시작
API 키를 설정한 후 개발 서버를 재시작하세요:

```bash
npm run dev
```

### 5.2 브라우저 콘솔에서 확인
브라우저 개발자 도구 콘솔에서 다음 메시지들을 확인할 수 있습니다:

- "네이버 API 키 확인: 설정됨"
- "기상청 API 키 확인: 설정됨"
- "뉴스 데이터 로드 성공: X개"
- "날씨 데이터 로드 성공: X일"

## 6. 문제 해결

### 6.1 API 키가 설정되지 않은 경우
- "네이버 API 키가 설정되지 않았습니다." 오류
- "기상청 API 키가 설정되지 않았습니다." 오류
- 뉴스/날씨 데이터가 표시되지 않음

### 6.2 해결 방법
1. `.env` 파일이 프로젝트 루트에 있는지 확인
2. API 키가 올바르게 입력되었는지 확인
3. 개발 서버를 재시작
4. 브라우저 캐시 삭제

### 6.3 CORS 오류 해결
기상청 API는 CORS 정책으로 인해 직접 호출이 불가능할 수 있습니다. 이 경우 서버 프록시를 통해 호출하도록 설정되어 있습니다.

## 7. 주의사항

- API 키는 민감한 정보이므로 `.env` 파일을 Git에 커밋하지 마세요
- `.gitignore`에 `.env`가 포함되어 있는지 확인하세요
- 프로덕션 환경에서는 환경변수를 서버에서 설정하세요

## 8. API 사용량 및 제한

### 8.1 네이버 뉴스 API
- 일일 호출 제한: 25,000회
- 초당 호출 제한: 10회

### 8.2 기상청 날씨 API
- 일일 호출 제한: 1,000회
- 초당 호출 제한: 10회

API 키 설정이 완료되면 실제 뉴스와 날씨 데이터를 받아볼 수 있습니다! 
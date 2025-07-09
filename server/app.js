require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const todoRoutes = require('./routes/todos');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 데이터베이스 연결
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/todo-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB에 연결되었습니다.'))
.catch(err => console.error('MongoDB 연결 실패:', err));

// 네이버 뉴스 API 프록시
app.get('/naverapi/v1/search/news.json', async (req, res) => {
  try {
    const { query, display, sort, start } = req.query;
    const clientId = process.env.VITE_NAVER_CLIENT_ID;
    const clientSecret = process.env.VITE_NAVER_CLIENT_SECRET;
    
    if (!clientId || !clientSecret || clientId === 'your_naver_client_id_here' || clientSecret === 'your_naver_client_secret_here') {
      return res.status(500).json({ 
        error: '네이버 API 키가 설정되지 않았습니다. 환경 변수 VITE_NAVER_CLIENT_ID와 VITE_NAVER_CLIENT_SECRET을 설정하세요.' 
      });
    }
    
    const response = await axios.get('https://openapi.naver.com/v1/search/news.json', {
      params: { query, display, sort, start },
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret
      }
    });
    
    console.log('네이버 뉴스 API 응답:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('네이버 API 프록시 오류:', error.response?.data || error.message);
    res.status(500).json({ 
      error: '뉴스 데이터를 가져오는데 실패했습니다.',
      details: error.response?.data || error.message 
    });
  }
});

// 기상청 API 프록시 엔드포인트
app.get('/api/weather', async (req, res) => {
  try {
    const { nx = 89, ny = 90 } = req.query; // 대구 달서구 기본값
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    
    // 기상청 공공데이터 API 키 (실제 키로 교체 필요)
    const serviceKey = process.env.VITE_WEATHER_API_KEY || 'kuWeAWjDSGilngFowwhoPA';
    
    if (!serviceKey || serviceKey === 'your_weather_api_key_here') {
      return res.status(500).json({ 
        error: '날씨 API 키가 설정되지 않았습니다. 환경 변수 VITE_WEATHER_API_KEY를 설정하세요.' 
      });
    }

    const response = await axios.get('http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst', {
      params: {
        serviceKey: serviceKey,
        numOfRows: 1000,
        pageNo: 1,
        dataType: 'JSON',
        base_date: today,
        base_time: '0500',
        nx: nx,
        ny: ny
      }
    });

    console.log('기상청 API 응답:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('기상청 API 프록시 오류:', error.response?.data || error.message);
    res.status(500).json({ 
      error: '날씨 데이터를 가져오는데 실패했습니다.',
      details: error.response?.data || error.message 
    });
  }
});

// 라우트 설정
app.use('/api/todos', todoRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 에러 핸들링
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '서버 오류가 발생했습니다.' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 
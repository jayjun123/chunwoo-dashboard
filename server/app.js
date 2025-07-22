require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

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
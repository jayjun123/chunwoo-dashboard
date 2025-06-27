const express = require('express');
const router = express.Router();

// 임시 사용자 데이터
const mockUsers = [
  {
    id: 1,
    email: 'admin@example.com',
    password: 'password',
    name: '관리자',
    role: 'admin'
  },
  {
    id: 2,
    email: 'fire8803@naver.com',
    password: 'password',
    name: '사용자',
    role: 'master'
  }
];

// 로그인 라우트
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 사용자 찾기
    const user = mockUsers.find(u => u.email === email && u.password === password);

    if (user) {
      // 비밀번호는 제외하고 응답
      const { password, ...userWithoutPassword } = user;
      res.json({
        success: true,
        user: userWithoutPassword,
        token: 'mock-jwt-token'
      });
    } else {
      res.status(401).json({
        success: false,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

module.exports = router; 
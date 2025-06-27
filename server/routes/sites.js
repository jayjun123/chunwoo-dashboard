const express = require('express');
const router = express.Router();

// 임시 현장 데이터
const mockSites = [
  {
    id: 1,
    name: '서울 아파트 신축공사',
    location: '서울시 강남구',
    status: '진행중',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    manager: '김철수',
    progress: 35
  },
  {
    id: 2,
    name: '부산 상가 리모델링',
    location: '부산시 해운대구',
    status: '계획중',
    startDate: '2024-03-01',
    endDate: '2024-08-31',
    manager: '이영희',
    progress: 0
  }
];

// 현장 목록 조회
router.get('/', (req, res) => {
  try {
    res.json({
      success: true,
      sites: mockSites
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

// 현장 상세 조회
router.get('/:id', (req, res) => {
  try {
    const site = mockSites.find(s => s.id === parseInt(req.params.id));
    if (site) {
      res.json({
        success: true,
        site
      });
    } else {
      res.status(404).json({
        success: false,
        message: '현장을 찾을 수 없습니다.'
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
const express = require('express');
const router = express.Router();
const Todo = require('../models/Todo');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { startOfDay, endOfDay, subDays, subMonths, subYears } = require('date-fns');

// 대시보드 통계 조회
router.get('/stats', auth, async (req, res) => {
  try {
    const [totalUsers, activeProjects, completedTasks, pendingIssues] = await Promise.all([
      User.countDocuments(),
      Todo.countDocuments({ completed: false }),
      Todo.countDocuments({ completed: true }),
      Todo.countDocuments({ completed: false })
    ]);

    res.json({
      totalUsers,
      activeProjects,
      completedTasks,
      pendingIssues
    });
  } catch (error) {
    res.status(500).json({ message: '대시보드 통계를 불러오는데 실패했습니다.' });
  }
});

// 대시보드 차트 데이터 조회
router.get('/charts', auth, async (req, res) => {
  try {
    const { period, metric } = req.query;
    let startDate;

    // 기간 설정
    switch (period) {
      case 'month':
        startDate = subMonths(new Date(), 1);
        break;
      case 'year':
        startDate = subYears(new Date(), 1);
        break;
      default: // week
        startDate = subDays(new Date(), 7);
    }

    // 사용자 활동 데이터
    const userActivity = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          new: { $sum: 1 }
        }
      },
      {
        $project: {
          date: '$_id',
          new: 1,
          _id: 0
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    // 프로젝트 진행률 데이터
    const projectProgress = await Todo.aggregate([
      {
        $group: {
          _id: '$completed',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          name: {
            $cond: {
              if: '$_id',
              then: '완료',
              else: '진행중'
            }
          },
          count: 1,
          _id: 0
        }
      }
    ]);

    // 작업 완료율 데이터
    const taskCompletion = await Todo.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: ['$completed', 1, 0] }
          }
        }
      },
      {
        $project: {
          date: '$_id',
          completionRate: {
            $multiply: [
              { $divide: ['$completed', '$total'] },
              100
            ]
          },
          _id: 0
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    res.json({
      userActivity,
      projectProgress,
      taskCompletion
    });
  } catch (error) {
    res.status(500).json({ message: '대시보드 차트 데이터를 불러오는데 실패했습니다.' });
  }
});

module.exports = router; 
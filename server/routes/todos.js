const express = require('express');
const router = express.Router();
const Todo = require('../models/Todo');
const auth = require('../middleware/auth');

// 할 일 목록 조회
router.get('/', auth, async (req, res) => {
  try {
    const { filter, sortBy } = req.query;
    const query = { userId: req.user.id };

    // 필터 적용
    if (filter === 'active') {
      query.completed = false;
    } else if (filter === 'completed') {
      query.completed = true;
    }

    // 정렬 적용
    let sort = {};
    switch (sortBy) {
      case 'updated':
        sort = { updatedAt: -1 };
        break;
      case 'title':
        sort = { title: 1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    const todos = await Todo.find(query).sort(sort);
    res.json(todos);
  } catch (error) {
    res.status(500).json({ message: '할 일 목록을 불러오는데 실패했습니다.' });
  }
});

// 할 일 생성
router.post('/', auth, async (req, res) => {
  try {
    const { title } = req.body;
    const todo = new Todo({
      title,
      userId: req.user.id
    });
    await todo.save();
    res.status(201).json(todo);
  } catch (error) {
    res.status(400).json({ message: '할 일 생성에 실패했습니다.' });
  }
});

// 할 일 수정
router.patch('/:id', auth, async (req, res) => {
  try {
    const { title, completed } = req.body;
    const todo = await Todo.findOne({ _id: req.params.id, userId: req.user.id });

    if (!todo) {
      return res.status(404).json({ message: '할 일을 찾을 수 없습니다.' });
    }

    if (title !== undefined) todo.title = title;
    if (completed !== undefined) todo.completed = completed;

    await todo.save();
    res.json(todo);
  } catch (error) {
    res.status(400).json({ message: '할 일 수정에 실패했습니다.' });
  }
});

// 할 일 삭제
router.delete('/:id', auth, async (req, res) => {
  try {
    const todo = await Todo.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!todo) {
      return res.status(404).json({ message: '할 일을 찾을 수 없습니다.' });
    }

    res.json({ message: '할 일이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ message: '할 일 삭제에 실패했습니다.' });
  }
});

// 할 일 순서 변경
router.post('/reorder', auth, async (req, res) => {
  try {
    const { todoIds } = req.body;
    
    // 순서 업데이트를 위한 작업 배열 생성
    const updateOperations = todoIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, userId: req.user.id },
        update: { $set: { order: index } }
      }
    }));

    await Todo.bulkWrite(updateOperations);
    res.json({ message: '할 일 순서가 변경되었습니다.' });
  } catch (error) {
    res.status(500).json({ message: '할 일 순서 변경에 실패했습니다.' });
  }
});

module.exports = router; 
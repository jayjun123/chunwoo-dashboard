const express = require('express');
const cors = require('cors');
const { pool, initDB } = require('./db');
const { scheduleMailSync, syncMailbox } = require('./mailFetcher');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/mail-summaries', async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT *
        FROM mail_summaries
        WHERE received_at >= DATE '2026-01-01'
        ORDER BY
          CASE
            WHEN importance = 'high' THEN 0
            WHEN importance = 'medium' THEN 1
            WHEN importance = 'low' THEN 2
            ELSE 3
          END,
          received_at DESC
      `
    );
    res.json(result.rows);
  } catch (error) {
    console.error('메일 요약 조회 실패:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.patch('/mail-summaries/:id/read', async (req, res) => {
  const { id } = req.params;
  const { is_read } = req.body;

  try {
    const result = await pool.query(
      `
        UPDATE mail_summaries
        SET is_read = $1
        WHERE id = $2
        RETURNING *
      `,
      [Boolean(is_read), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mail not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('읽음 상태 업데이트 실패:', error);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.patch('/mail-summaries/:id/classification', async (req, res) => {
  const { id } = req.params;
  const { ai_classification } = req.body;

  try {
    const result = await pool.query(
      `
        UPDATE mail_summaries
        SET ai_classification = $1
        WHERE id = $2
        RETURNING *
      `,
      [ai_classification || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mail not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('AI 분류 업데이트 실패:', error);
    return res.status(500).json({ error: 'Database error' });
  }
});

app.post('/mail-summaries/sync', async (req, res) => {
  try {
    await syncMailbox();
    res.json({ ok: true });
  } catch (error) {
    console.error('수동 동기화 실패:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

const PORT = process.env.PORT || 3000;

initDB()
  .then(() => {
    scheduleMailSync();
// src/index.js 에 추가 (app.listen 위에 넣으세요)

const { pool } = require('./db'); // db.js 경로 확인

// 메일 목록 조회 API
app.get('/api/mails', async (req, res) => {
  try {
    // 최신순으로 100개만 가져오기
    const result = await pool.query(`
      SELECT * FROM mail_summaries 
      ORDER BY received_at DESC 
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB Error' });
  }
});
    app.listen(PORT, () => {
      console.log(`NAS API Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('DB 초기화 실패:', error);
    process.exit(1);
  });

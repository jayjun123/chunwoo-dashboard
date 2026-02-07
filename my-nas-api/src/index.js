const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { pool, initDB } = require('./db');
const { scheduleMailSync, syncMailbox } = require('./mailFetcher');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const PHOTOS_BASE_PATH = process.env.PHOTOS_BASE_PATH || '/data/site-photos';
const PHOTOS_API_KEY = process.env.PHOTOS_API_KEY || '';

const safeSegment = (value) => {
  return String(value || '')
    .replace(/[\\/]/g, '_')
    .replace(/\.+/g, '.')
    .replace(/[^0-9A-Za-z가-힣._\- ]/g, '_')
    .trim()
    .slice(0, 80) || 'unknown';
};

const ensureDir = async (dirPath) => {
  await fs.promises.mkdir(dirPath, { recursive: true });
};

const requirePhotosApiKey = (req, res, next) => {
  if (!PHOTOS_API_KEY) return next();
  const key = req.get('x-api-key') || '';
  if (key !== PHOTOS_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
};

const resolveSiteFolder = (siteId, siteName) => {
  const safeSiteId = safeSegment(siteId);
  const safeSiteName = safeSegment(siteName);

  if (!safeSiteId || !safeSiteName || safeSiteId === 'unknown' || safeSiteName === 'unknown') {
    return null;
  }

  return `${safeSiteId}_${safeSiteName}`;
};

const resolveSafePhotoPath = (siteFolder, fileName) => {
  const safeName = safeSegment(fileName);
  const base = path.resolve(PHOTOS_BASE_PATH);
  const full = path.resolve(PHOTOS_BASE_PATH, siteFolder, safeName);
  if (!full.startsWith(base + path.sep)) return null;
  return { safeName, full };
};

const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        const siteFolder = resolveSiteFolder(req.body.siteId, req.body.siteName);
        if (!siteFolder) {
          throw new Error('siteId and siteName are required');
        }
        const dest = path.join(PHOTOS_BASE_PATH, siteFolder);
        await ensureDir(dest);
        cb(null, dest);
      } catch (e) {
        cb(e);
      }
    },
    filename: (req, file, cb) => {
      const now = new Date();
      const yyyy = String(now.getFullYear());
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const mi = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');

      const original = safeSegment(file.originalname);
      cb(null, `${yyyy}${mm}${dd}_${hh}${mi}${ss}_${original}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 20,
  },
});

app.use('/site-photos', express.static(PHOTOS_BASE_PATH));

app.post('/site-photos/upload', requirePhotosApiKey, upload.array('files', 20), async (req, res) => {
  try {
    const siteId = req.body.siteId;
    const siteName = req.body.siteName;
    const siteFolder = resolveSiteFolder(siteId, siteName);

    if (!siteFolder) {
      return res.status(400).json({ error: 'siteId and siteName are required' });
    }

    const files = (req.files || []).map((f) => ({
      name: f.filename,
      originalName: f.originalname,
      size: f.size,
      mimeType: f.mimetype,
      url: `/site-photos/${encodeURIComponent(siteFolder)}/${encodeURIComponent(f.filename)}`,
    }));

    return res.json({ ok: true, siteFolder, files });
  } catch (error) {
    console.error('사진 업로드 실패:', error);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

app.delete('/site-photos/delete', requirePhotosApiKey, async (req, res) => {
  try {
    const siteFolder = resolveSiteFolder(req.query.siteId, req.query.siteName);
    const fileName = req.query.name;

    if (!siteFolder || !fileName) {
      return res.status(400).json({ error: 'siteId, siteName, and name are required' });
    }

    const resolved = resolveSafePhotoPath(siteFolder, fileName);
    if (!resolved) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    await fs.promises.unlink(resolved.full);
    return res.json({ ok: true });
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }
    console.error('사진 삭제 실패:', error);
    return res.status(500).json({ error: 'Delete failed' });
  }
});

app.post('/site-photos/replace', requirePhotosApiKey, upload.single('file'), async (req, res) => {
  try {
    const siteFolder = resolveSiteFolder(req.body.siteId, req.body.siteName);
    const oldName = req.body.oldName;

    if (!siteFolder || !oldName || !req.file) {
      return res.status(400).json({ error: 'siteId, siteName, oldName, and file are required' });
    }

    const resolvedOld = resolveSafePhotoPath(siteFolder, oldName);
    if (!resolvedOld) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    try {
      await fs.promises.unlink(resolvedOld.full);
    } catch (e) {
      if (!(e && e.code === 'ENOENT')) throw e;
    }

    return res.json({
      ok: true,
      siteFolder,
      file: {
        name: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        url: `/site-photos/${encodeURIComponent(siteFolder)}/${encodeURIComponent(req.file.filename)}`,
      },
    });
  } catch (error) {
    console.error('사진 변경 실패:', error);
    return res.status(500).json({ error: 'Replace failed' });
  }
});

app.get('/site-photos/list', async (req, res) => {
  try {
    const siteFolder = resolveSiteFolder(req.query.siteId, req.query.siteName);

    if (!siteFolder) {
      return res.status(400).json({ error: 'siteId and siteName are required' });
    }
    const dir = path.join(PHOTOS_BASE_PATH, siteFolder);

    let entries = [];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch (e) {
      if (e && e.code === 'ENOENT') {
        return res.json([]);
      }
      throw e;
    }

    const files = [];
    for (const ent of entries) {
      if (!ent.isFile()) continue;
      const filePath = path.join(dir, ent.name);
      const stat = await fs.promises.stat(filePath);
      files.push({
        name: ent.name,
        size: stat.size,
        mtimeMs: stat.mtimeMs,
        url: `/site-photos/${encodeURIComponent(siteFolder)}/${encodeURIComponent(ent.name)}`,
      });
    }

    files.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return res.json(files);
  } catch (error) {
    console.error('사진 목록 조회 실패:', error);
    return res.status(500).json({ error: 'List failed' });
  }
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/mail-summaries', async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT *
        FROM mail_summaries
        WHERE received_at >= DATE '2020-01-01'
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

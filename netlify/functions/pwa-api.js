/**
 * PWA 전용 통합 API (Netlify Function) - 읽기 전용
 * 예: 오늘 일정, OO현장 기성 잔액, OO현장 소장
 */

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const send = (statusCode, body) => ({
  statusCode,
  headers,
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

const getPath = (event) => {
  let raw = event.path || '';
  if (raw.startsWith('/api/')) raw = '/.netlify/functions/pwa-api' + raw.slice(4);
  const prefix = '/.netlify/functions/pwa-api';
  const path = raw.startsWith(prefix) ? raw.slice(prefix.length) || '/' : raw;
  return path.replace(/^\//, '').split('/').filter(Boolean);
};

const getQuery = (event) => event.queryStringParameters || {};

let _db = null;
const getDb = () => {
  if (_db) return _db;
  const admin = require('firebase-admin');
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not set');
  }
  if (!admin.apps.length) {
    const cred = JSON.parse(key);
    if (typeof cred.private_key === 'string' && cred.private_key.includes('\\n')) {
      cred.private_key = cred.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({ credential: admin.credential.cert(cred) });
  }
  _db = admin.firestore();
  return _db;
};

const hasFirebase = () => !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

const toDateStr = (v) => {
  if (!v) return null;
  if (v.toDate && typeof v.toDate === 'function') return v.toDate().toISOString().slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'string') return v.slice(0, 10);
  return null;
};

const parseAmount = (v) => {
  if (v == null || v === '') return 0;
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isNaN(n) ? 0 : n;
};

/** 오늘 일정 조회 (일정관리 schedules 컬렉션) */
async function getScheduleToday() {
  const db = getDb();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const snap = await db.collection('schedules')
    .where('date', '>=', startOfDay)
    .where('date', '<=', endOfDay)
    .get();

  const items = [];
  snap.docs.forEach((doc) => {
    const d = doc.data();
    const dateStr = toDateStr(d.date);
    items.push({
      id: doc.id,
      date: dateStr,
      text: d.text || '',
      siteName: d.siteName || d.company || '',
      type: d.type || '일정',
    });
  });
  return items;
}

/** 현장명으로 sites 검색 후 소장/잔액 등 반환 (읽기 전용) */
async function getSitesQuery(name, field) {
  const db = getDb();
  const sitesSnap = await db.collection('sites').get();
  const nameLower = (name || '').trim().toLowerCase();
  const matches = sitesSnap.docs.filter((doc) => {
    const data = doc.data();
    const siteName = (data.name || '').toLowerCase();
    return siteName.includes(nameLower) || nameLower.includes(siteName);
  });

  if (matches.length === 0) {
    return { data: [], message: '해당 현장을 찾을 수 없습니다.' };
  }

  const gisungSnap = await db.collection('gisung').get();
  const gisungList = gisungSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const result = [];
  for (const doc of matches) {
    const site = { id: doc.id, ...doc.data() };
    const siteName = site.name || '';

    const siteGisung = gisungList.filter((g) => {
      const gName = (g.name || '').trim();
      return gName === siteName || gName.includes(siteName) || siteName.includes(gName);
    });
    const paidGisung = siteGisung
      .filter((g) => g.paymentStatus === '입금완료')
      .reduce((sum, g) => sum + parseAmount(g.gisungAmount), 0);
    const contractAmount = parseAmount(site.contractAmount);
    const advance = parseAmount(site.advance);
    const balance = contractAmount - advance - paidGisung;

    const endDateStr = toDateStr(site.endDate);

    if (field === 'manager') {
      result.push({ name: siteName, manager: site.manager || '' });
      continue;
    }
    if (field === 'balance') {
      result.push({
        name: siteName,
        contractAmount,
        advance,
        paidGisung,
        balance,
        balanceFormatted: balance.toLocaleString(),
      });
      continue;
    }
    result.push({
      id: site.id,
      name: siteName,
      manager: site.manager || '',
      contractAmount,
      contractAmountFormatted: contractAmount.toLocaleString(),
      address: site.address || '',
      windowCompany: site.windowCompany || '',
      endDate: endDateStr,
      team: site.team || '',
      advance,
      paidGisung,
      balance,
      balanceFormatted: balance.toLocaleString(),
    });
  }

  return { data: result };
}

exports.handler = async function (event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return send(204, '');
  }

  if (event.httpMethod !== 'GET') {
    return send(405, { error: 'Method not allowed', hint: '이 API는 읽기 전용(GET)입니다.' });
  }

  const [resource, id, sub] = getPath(event);
  const query = getQuery(event);

  try {
    if (!resource || resource === 'health') {
      return send(200, {
        ok: true,
        service: 'pwa-api',
        readOnly: true,
        timestamp: new Date().toISOString(),
      });
    }

    if (resource === 'config') {
      return send(200, {
        appName: '천우 건설현장관리시스템',
        apiVersion: '1',
        readOnly: true,
        endpoints: {
          'GET /schedule/today': '오늘 일정 목록',
          'GET /sites?name=현장명': '현장 검색 (소장, 계약금액, 주소, 창호업체, 준공일, 시공팀, 기성잔액 등)',
          'GET /sites?name=현장명&field=manager': '해당 현장 소장만',
          'GET /sites?name=현장명&field=balance': '해당 현장 기성 잔액만',
        },
      });
    }

    // ----- 오늘 일정 (읽기 전용) -----
    if (resource === 'schedule' && id === 'today') {
      if (!hasFirebase()) {
        return send(503, { error: 'Firebase not configured', hint: 'FIREBASE_SERVICE_ACCOUNT_JSON 설정 필요' });
      }
      const items = await getScheduleToday();
      return send(200, { data: items, date: new Date().toISOString().slice(0, 10) });
    }

    // ----- 현장 검색: 소장, 기성 잔액 (읽기 전용) -----
    if (resource === 'sites') {
      if (!hasFirebase()) {
        return send(503, { error: 'Firebase not configured', hint: 'FIREBASE_SERVICE_ACCOUNT_JSON 설정 필요' });
      }
      const name = query.name || query.q || query.siteName || '';
      const field = query.field || ''; // 'manager' | 'balance' | 없으면 전체
      const out = await getSitesQuery(name, field);
      return send(200, out);
    }

    return send(404, { error: 'Not found', path: event.path });
  } catch (err) {
    console.error('pwa-api error:', err);
    return send(500, { error: 'Internal server error', message: err.message });
  }
};

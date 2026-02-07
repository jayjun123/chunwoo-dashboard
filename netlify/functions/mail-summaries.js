// Netlify Function: NAS API 프록시
// HTTPS 프론트엔드에서 HTTP NAS API를 호출하기 위한 서버사이드 프록시

const https = require('https');
const http = require('http');

exports.handler = async function(event, context) {
  // NAS API URL (HTTP)
  const NAS_API_URL = process.env.NAS_API_URL || 'http://chunwoo.iptime.org:3000';
  
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: '',
    };
  }

  try {
    const data = await new Promise((resolve, reject) => {
      const url = `${NAS_API_URL}/mail-summaries`;
      const timeoutMs = 12000;

      const req = http.get(url, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = body ? JSON.parse(body) : [];
              resolve(Array.isArray(parsed) ? parsed : parsed?.rows ?? parsed?.data ?? []);
            } catch (e) {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            reject(new Error(`NAS API responded with status: ${res.statusCode}`));
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        reject(new Error('NAS API request timeout'));
      });
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(Array.isArray(data) ? data : data),
    };
  } catch (error) {
    console.error('NAS API proxy error:', error);

    const returnEmptyOnError = process.env.MAIL_SUMMARIES_RETURN_EMPTY_ON_ERROR === 'true';
    if (returnEmptyOnError) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([]),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch from NAS API',
        message: error.message,
      }),
    };
  }
};

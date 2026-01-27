// Netlify Function: NAS API 프록시
// HTTPS 프론트엔드에서 HTTP NAS API를 호출하기 위한 서버사이드 프록시

export async function handler(event, context) {
  // NAS API URL (HTTP)
  const NAS_API_URL = process.env.NAS_API_URL || 'http://chunwoo.iptime.org:8080';
  
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
    const response = await fetch(`${NAS_API_URL}/mail-summaries`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`NAS API responded with status: ${response.status}`);
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('NAS API proxy error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch from NAS API',
        message: error.message,
      }),
    };
  }
}

/** VITE_NAS_API_URL 끝 슬래시 제거 */
export function normalizeNasApiUrl(url) {
  if (!url || typeof url !== 'string') return '';
  return url.replace(/\/+$/, '');
}

/**
 * NAS 현장사진 API fetch 실패 시 사용자/개발자용 메시지
 * ERR_NAME_NOT_RESOLVED 등은 브라우저에서 TypeError: Failed to fetch 로만 보이는 경우가 많음
 */
export function formatNasFetchErrorMessage(err, nasApiUrl) {
  const msg = err?.message || '';
  const isNetworkLike =
    err?.name === 'TypeError' &&
    (msg.includes('Failed to fetch') || msg.includes('Load failed') || msg.includes('NetworkError'));

  if (isNetworkLike) {
    let host = '';
    try {
      if (nasApiUrl) host = new URL(nasApiUrl).hostname;
    } catch (_) {
      /* ignore */
    }
    const isExpiredTunnel = host.includes('trycloudflare.com');
    return [
      '현장사진 서버에 연결할 수 없습니다.',
      host ? `주소: ${host}` : null,
      isExpiredTunnel
        ? 'Cloudflare 임시 터널 URL이 만료되었습니다. NAS에서 터널을 재시작하거나 .env의 VITE_NAS_API_URL을 https://chunwoo.iptime.org 등 고정 주소로 바꾼 뒤 개발 서버를 재시작하세요.'
        : 'NAS API(my-nas-api)·Caddy가 실행 중인지, VITE_NAS_API_URL이 올바른지 확인하세요.',
    ]
      .filter(Boolean)
      .join(' ');
  }

  return msg || '요청 중 오류가 발생했습니다.';
}

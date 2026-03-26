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
    return [
      '현장사진 서버에 연결할 수 없습니다.',
      host ? `주소: ${host}` : null,
      'NAS API(my-nas-api)가 실행 중인지, 배포 환경의 VITE_NAS_API_URL이 올바른지 확인하세요.',
      'Cloudflare 임시 터널(trycloudflare.com)은 재시작할 때마다 URL이 바뀌므로 .env를 갱신한 뒤 다시 빌드해야 합니다.',
    ]
      .filter(Boolean)
      .join(' ');
  }

  return msg || '요청 중 오류가 발생했습니다.';
}

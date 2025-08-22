// URL 단축 매핑 정의
export const URL_ALIASES = {
  // 메인 페이지
  '/': '/',
  '/d': '/dashboard',
  
  // 일정 관리
  '/s': '/schedule',
  '/g': '/gantt',
  
  // 현장 관리
  '/st': '/sites',
  '/is': '/importantsite',
  
  // 안전 관리
  '/sf': '/safety',
  
  // 토론
  '/dc': '/discussions',
  
  // 입찰/거래처
  '/v': '/vendors',
  '/vm': '/vendor-management',
  
  // 기성/비용
  '/p': '/progress',
  '/c': '/cost',
  
  // 팀 관리
  '/dt': '/daema-team',
  
  // 문서
  '/doc': '/documents',
  
  // 관리자
  '/m': '/members',
  '/pm': '/permissions',
  '/u': '/users',
  
  // 기타
  '/t': '/todo-list',
  '/ta': '/todo/all',
  '/gs': '/gisung',
  '/wl': '/whole-list',
  '/nf': '/news-favorites',
  '/pt': '/pdf-test',
  '/tu': '/template-upload',
  '/pr': '/profile',
  '/cl': '/claims',
  '/es': '/estimates',
  '/set': '/settings'
};

// 역방향 매핑 (긴 URL -> 짧은 URL)
export const REVERSE_ALIASES = Object.fromEntries(
  Object.entries(URL_ALIASES).map(([short, long]) => [long, short])
);

/**
 * 짧은 URL을 긴 URL로 변환
 * @param {string} shortUrl - 짧은 URL
 * @returns {string} 긴 URL 또는 원본 URL
 */
export const expandUrl = (shortUrl) => {
  return URL_ALIASES[shortUrl] || shortUrl;
};

/**
 * 긴 URL을 짧은 URL로 변환
 * @param {string} longUrl - 긴 URL
 * @returns {string} 짧은 URL 또는 원본 URL
 */
export const shortenUrl = (longUrl) => {
  return REVERSE_ALIASES[longUrl] || longUrl;
};

/**
 * 현재 URL이 단축 가능한지 확인
 * @param {string} url - 확인할 URL
 * @returns {boolean} 단축 가능 여부
 */
export const canShorten = (url) => {
  return REVERSE_ALIASES.hasOwnProperty(url);
};

/**
 * 사용 가능한 모든 URL 별칭 목록 반환
 * @returns {Array} URL 별칭 목록
 */
export const getAvailableAliases = () => {
  return Object.entries(URL_ALIASES).map(([short, long]) => ({
    short,
    long,
    description: getUrlDescription(long)
  }));
};

/**
 * URL에 대한 설명 반환
 * @param {string} url - URL
 * @returns {string} 설명
 */
const getUrlDescription = (url) => {
  const descriptions = {
    '/': '대시보드',
    '/dashboard': '대시보드',
    '/schedule': '일정관리',
    '/gantt': '현장일정',
    '/sites': '현장관리',
    '/importantsite': '주요현장',
    '/safety': '안전관리',
    '/discussions': '토론의견',
    '/vendors': '입찰현황',
    '/vendor-management': '거래처관리',
    '/progress': '기성관리',
    '/cost': '비용관리',
    '/daema-team': '시공팀',
    '/documents': '문서관리',
    '/members': '멤버 관리',
    '/permissions': '권한 관리',
    '/users': '사용자 관리',
    '/todo-list': '할일 목록',
    '/todo/all': '전체 할일',
    '/gisung': '기성관리',
    '/whole-list': '전체 목록',
    '/news-favorites': '뉴스 즐겨찾기',
    '/pdf-test': 'PDF 테스트',
    '/template-upload': '템플릿 업로드',
    '/profile': '프로필',
    '/claims': '청구',
    '/estimates': '견적',
    '/settings': '설정'
  };
  
  return descriptions[url] || '알 수 없음';
};

/** 현장 위치 기반 일별 날씨 (Open-Meteo) → 일정 이모지 */

const DEFAULT_WEATHER = '☀️';
const WEATHER_CACHE = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;

/** [lon, lat] — Mapping.jsx 도시 좌표 축약본 */
const CITY_COORDINATES = {
  서울: [126.978, 37.5665],
  서울시: [126.978, 37.5665],
  서울특별시: [126.978, 37.5665],
  서울강남구: [127.0476, 37.5172],
  서울강동구: [127.1238, 37.5301],
  서울강북구: [127.0103, 37.6399],
  서울강서구: [126.8215, 37.5509],
  서울관악구: [126.9515, 37.4784],
  서울광진구: [127.0843, 37.5385],
  서울구로구: [126.8874, 37.4954],
  서울금천구: [126.9027, 37.4563],
  서울노원구: [127.0568, 37.6542],
  서울도봉구: [127.0327, 37.6688],
  서울동대문구: [127.0402, 37.5838],
  서울동작구: [126.9397, 37.5124],
  서울마포구: [126.9027, 37.5663],
  서울서대문구: [126.9366, 37.5791],
  서울서초구: [127.0327, 37.4837],
  서울성동구: [127.0366, 37.5633],
  서울성북구: [127.0127, 37.5891],
  서울송파구: [127.1058, 37.5145],
  서울양천구: [126.8668, 37.5172],
  서울영등포구: [126.8969, 37.5264],
  서울용산구: [126.9942, 37.5384],
  서울은평구: [126.9308, 37.6028],
  서울종로구: [126.978, 37.5735],
  서울중구: [126.9979, 37.564],
  서울중랑구: [127.0843, 37.6066],
  경기: [127.5, 37.5],
  경기도: [127.5, 37.5],
  수원: [127.009, 37.2636],
  수원시: [127.009, 37.2636],
  성남: [127.1266, 37.4201],
  성남시: [127.1266, 37.4201],
  고양: [126.8329, 37.6584],
  고양시: [126.8329, 37.6584],
  용인: [127.1776, 37.2411],
  용인시: [127.1776, 37.2411],
  부천: [126.765, 37.5034],
  부천시: [126.765, 37.5034],
  안양: [126.9568, 37.3943],
  안양시: [126.9568, 37.3943],
  화성: [126.8329, 37.1995],
  화성시: [126.8329, 37.1995],
  평택: [127.1248, 36.9908],
  평택시: [127.1248, 36.9908],
  의정부: [127.0474, 37.7381],
  의정부시: [127.0474, 37.7381],
  파주: [126.7809, 37.7599],
  파주시: [126.7809, 37.7599],
  김포: [126.7176, 37.6153],
  김포시: [126.7176, 37.6153],
  광명: [126.8645, 37.4163],
  광명시: [126.8645, 37.4163],
  하남: [127.206, 37.5396],
  하남시: [127.206, 37.5396],
  양주: [127.0458, 37.7853],
  양주시: [127.0458, 37.7853],
  남양주: [127.2145, 37.636],
  남양주시: [127.2145, 37.636],
  인천: [126.7052, 37.4563],
  인천광역시: [126.7052, 37.4563],
  부산: [129.0756, 35.1796],
  부산광역시: [129.0756, 35.1796],
  부산해운대구: [129.1653, 35.163],
  대구: [128.5556, 35.8714],
  대구광역시: [128.5556, 35.8714],
  대구중구: [128.5556, 35.8714],
  대구동구: [128.6, 35.8864],
  대구서구: [128.52, 35.8719],
  대구남구: [128.5556, 35.8414],
  대구북구: [128.5556, 35.9014],
  대구수성구: [128.6, 35.8514],
  대구달서구: [128.5, 35.8214],
  대구달성군: [128.4, 35.7714],
  광주: [126.8531, 35.1595],
  광주광역시: [126.8531, 35.1595],
  대전: [127.3845, 36.3504],
  대전광역시: [127.3845, 36.3504],
  울산: [129.3114, 35.5384],
  울산광역시: [129.3114, 35.5384],
  세종: [127.289, 36.48],
  세종특별자치시: [127.289, 36.48],
  강원: [128.1555, 37.8228],
  강원도: [128.1555, 37.8228],
  춘천: [127.7306, 37.8813],
  원주: [127.9202, 37.3422],
  강릉: [128.8761, 37.7519],
  충북: [127.4913, 36.8],
  충청북도: [127.4913, 36.8],
  청주: [127.489, 36.6424],
  충주: [127.926, 36.991],
  충남: [126.845, 36.5184],
  충청남도: [126.845, 36.5184],
  천안: [127.1139, 36.8151],
  아산: [127.0025, 36.7898],
  전북: [127.1482, 35.7175],
  전라북도: [127.1482, 35.7175],
  전주: [127.148, 35.8242],
  군산: [126.7369, 35.9676],
  전남: [126.381, 34.8679],
  전라남도: [126.381, 34.8679],
  목포: [126.3922, 34.8118],
  여수: [127.6622, 34.7604],
  순천: [127.4872, 34.9506],
  경북: [128.8889, 36.4919],
  경상북도: [128.8889, 36.4919],
  포항: [129.3653, 36.019],
  포항시: [129.3653, 36.019],
  경주: [129.2247, 35.8562],
  경주시: [129.2247, 35.8562],
  구미: [128.3446, 36.1194],
  구미시: [128.3446, 36.1194],
  안동: [128.7294, 36.5684],
  경남: [128.2406, 35.4606],
  경상남도: [128.2406, 35.4606],
  창원: [128.6811, 35.2281],
  창원시: [128.6811, 35.2281],
  김해: [128.8814, 35.2281],
  김해시: [128.8814, 35.2281],
  진주: [128.1074, 35.1806],
  진주시: [128.1074, 35.1806],
  양산: [129.0374, 35.3381],
  양산시: [129.0374, 35.3381],
  제주: [126.5312, 33.4996],
  제주도: [126.5312, 33.4996],
  제주특별자치도: [126.5312, 33.4996],
};

const REGION_PATTERNS = [
  { pattern: /서울특별시\s*강남구|서울\s*강남구/, name: '서울강남구' },
  { pattern: /서울특별시\s*강동구|서울\s*강동구/, name: '서울강동구' },
  { pattern: /서울특별시\s*강북구|서울\s*강북구/, name: '서울강북구' },
  { pattern: /서울특별시\s*강서구|서울\s*강서구/, name: '서울강서구' },
  { pattern: /서울특별시\s*관악구|서울\s*관악구/, name: '서울관악구' },
  { pattern: /서울특별시\s*광진구|서울\s*광진구/, name: '서울광진구' },
  { pattern: /서울특별시\s*구로구|서울\s*구로구/, name: '서울구로구' },
  { pattern: /서울특별시\s*금천구|서울\s*금천구/, name: '서울금천구' },
  { pattern: /서울특별시\s*노원구|서울\s*노원구/, name: '서울노원구' },
  { pattern: /서울특별시\s*도봉구|서울\s*도봉구/, name: '서울도봉구' },
  { pattern: /서울특별시\s*동대문구|서울\s*동대문구/, name: '서울동대문구' },
  { pattern: /서울특별시\s*동작구|서울\s*동작구/, name: '서울동작구' },
  { pattern: /서울특별시\s*마포구|서울\s*마포구/, name: '서울마포구' },
  { pattern: /서울특별시\s*서대문구|서울\s*서대문구/, name: '서울서대문구' },
  { pattern: /서울특별시\s*서초구|서울\s*서초구/, name: '서울서초구' },
  { pattern: /서울특별시\s*성동구|서울\s*성동구/, name: '서울성동구' },
  { pattern: /서울특별시\s*성북구|서울\s*성북구/, name: '서울성북구' },
  { pattern: /서울특별시\s*송파구|서울\s*송파구/, name: '서울송파구' },
  { pattern: /서울특별시\s*양천구|서울\s*양천구/, name: '서울양천구' },
  { pattern: /서울특별시\s*영등포구|서울\s*영등포구/, name: '서울영등포구' },
  { pattern: /서울특별시\s*용산구|서울\s*용산구/, name: '서울용산구' },
  { pattern: /서울특별시\s*은평구|서울\s*은평구/, name: '서울은평구' },
  { pattern: /서울특별시\s*종로구|서울\s*종로구/, name: '서울종로구' },
  { pattern: /서울특별시\s*중구|서울\s*중구/, name: '서울중구' },
  { pattern: /서울특별시\s*중랑구|서울\s*중랑구/, name: '서울중랑구' },
  { pattern: /서울특별시|서울시|서울/, name: '서울' },
  { pattern: /부산광역시\s*해운대구|부산\s*해운대구/, name: '부산해운대구' },
  { pattern: /부산광역시|부산시|부산/, name: '부산' },
  { pattern: /대구광역시\s*중구|대구\s*중구/, name: '대구중구' },
  { pattern: /대구광역시\s*동구|대구\s*동구/, name: '대구동구' },
  { pattern: /대구광역시\s*서구|대구\s*서구/, name: '대구서구' },
  { pattern: /대구광역시\s*남구|대구\s*남구/, name: '대구남구' },
  { pattern: /대구광역시\s*북구|대구\s*북구/, name: '대구북구' },
  { pattern: /대구광역시\s*수성구|대구\s*수성구/, name: '대구수성구' },
  { pattern: /대구광역시\s*달서구|대구\s*달서구/, name: '대구달서구' },
  { pattern: /대구광역시\s*달성군|대구\s*달성군/, name: '대구달성군' },
  { pattern: /대구광역시|대구시|대구/, name: '대구' },
  { pattern: /인천광역시|인천시|인천/, name: '인천' },
  { pattern: /광주광역시|광주시(?!\s*도)|광주(?=\s|$)/, name: '광주' },
  { pattern: /대전광역시|대전시|대전/, name: '대전' },
  { pattern: /울산광역시|울산시|울산/, name: '울산' },
  { pattern: /세종특별자치시|세종시|세종/, name: '세종' },
  { pattern: /남양주시|남양주/, name: '남양주' },
  { pattern: /(?<!남)양주시|(?<!남)양주/, name: '양주' },
  { pattern: /수원시|수원/, name: '수원' },
  { pattern: /성남시|성남/, name: '성남' },
  { pattern: /고양시|고양/, name: '고양' },
  { pattern: /용인시|용인/, name: '용인' },
  { pattern: /화성시|화성/, name: '화성' },
  { pattern: /파주시|파주/, name: '파주' },
  { pattern: /김포시|김포/, name: '김포' },
  { pattern: /평택시|평택/, name: '평택' },
  { pattern: /의정부시|의정부/, name: '의정부' },
  { pattern: /부천시|부천/, name: '부천' },
  { pattern: /안양시|안양/, name: '안양' },
  { pattern: /광명시|광명/, name: '광명' },
  { pattern: /하남시|하남/, name: '하남' },
  { pattern: /포항시|포항/, name: '포항' },
  { pattern: /경주시|경주/, name: '경주' },
  { pattern: /구미시|구미/, name: '구미' },
  { pattern: /안동시|안동/, name: '안동' },
  { pattern: /창원시|창원/, name: '창원' },
  { pattern: /김해시|김해/, name: '김해' },
  { pattern: /진주시|진주/, name: '진주' },
  { pattern: /양산시|양산/, name: '양산' },
  { pattern: /청주시|청주/, name: '청주' },
  { pattern: /천안시|천안/, name: '천안' },
  { pattern: /아산시|아산/, name: '아산' },
  { pattern: /전주시|전주/, name: '전주' },
  { pattern: /군산시|군산/, name: '군산' },
  { pattern: /목포시|목포/, name: '목포' },
  { pattern: /여수시|여수/, name: '여수' },
  { pattern: /순천시|순천/, name: '순천' },
  { pattern: /춘천시|춘천/, name: '춘천' },
  { pattern: /원주시|원주/, name: '원주' },
  { pattern: /강릉시|강릉/, name: '강릉' },
  { pattern: /서귀포시|서귀포/, name: '제주' },
  { pattern: /제주시|제주특별자치도|제주도|제주/, name: '제주' },
  { pattern: /광주광역시/, name: '광주' },
  { pattern: /경기도|경기/, name: '경기도' },
  { pattern: /강원특별자치도|강원도|강원/, name: '강원도' },
  { pattern: /충청북도|충북/, name: '충청북도' },
  { pattern: /충청남도|충남/, name: '충청남도' },
  { pattern: /전북특별자치도|전라북도|전북/, name: '전라북도' },
  { pattern: /전라남도|전남/, name: '전라남도' },
  { pattern: /경상북도|경북/, name: '경상북도' },
  { pattern: /경상남도|경남/, name: '경상남도' },
];

export function extractRegionFromAddress(address) {
  if (!address || address === '주소 미입력') return null;
  const normalized = String(address).trim().replace(/\s+/g, ' ');
  for (const { pattern, name } of REGION_PATTERNS) {
    if (pattern.test(normalized)) return name;
  }
  return null;
}

export function getSiteAddress(site) {
  if (!site) return '';
  const raw = String(
    site.address ||
    site.companyAddress ||
    site.location ||
    site.fullAddress ||
    site.addr ||
    site.roadAddress ||
    site.jibunAddress ||
    ''
  ).trim();
  if (!raw || raw === '주소 미입력') return '';
  return raw;
}

function parseCoord(value) {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * @returns {{ lat: number, lon: number } | null}
 */
export function resolveSiteCoords(site) {
  if (!site) return null;

  const lat = parseCoord(site.latitude ?? site.lat);
  const lon = parseCoord(site.longitude ?? site.lng ?? site.lon);
  if (lat != null && lon != null && lat >= 33 && lat <= 39 && lon >= 124 && lon <= 132) {
    return { lat, lon };
  }

  const address = getSiteAddress(site);
  const region = extractRegionFromAddress(address);
  if (!region) return null;
  const pair = CITY_COORDINATES[region];
  if (!pair) return null;
  return { lon: pair[0], lat: pair[1] };
}

const GEOCODE_CACHE = new Map();

function buildGeocodeQueries(address) {
  const normalized = String(address || '').trim().replace(/\s+/g, ' ');
  if (!normalized || normalized === '주소 미입력') return [];
  const queries = [];
  const region = extractRegionFromAddress(normalized);
  if (region) {
    // 테이블 키 → 검색어 (서울강남구 → 강남구, 대구수성구 → 수성구 등)
    const short = region
      .replace(/^서울/, '')
      .replace(/^부산/, '')
      .replace(/^대구/, '')
      .replace(/^인천/, '');
    if (short && short !== region) queries.push(short);
    queries.push(region);
  }
  const cityMatches = normalized.match(/[가-힣]+(?:특별시|광역시|특별자치시|특별자치도|도|시|군|구)/g) || [];
  cityMatches.forEach((c) => queries.push(c));
  // 앞쪽 토큰 조합
  const tokens = normalized.split(' ').filter(Boolean);
  if (tokens.length >= 2) queries.push(`${tokens[0]} ${tokens[1]}`);
  if (tokens.length >= 1) queries.push(tokens[0]);
  queries.push(normalized.slice(0, 40));
  return [...new Set(queries.filter(Boolean))];
}

async function geocodeViaOpenMeteo(q) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&country=KR`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const hit = (data.results || []).find((r) => r.country_code === 'KR' && r.latitude && r.longitude);
  if (!hit) return null;
  return { lat: hit.latitude, lon: hit.longitude };
}

/** Open-Meteo가 못 잡는 도로명·지번 주소용 (OSM Nominatim) */
async function geocodeViaNominatim(q) {
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&countrycodes=kr&limit=3&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'ko',
      // 브라우저에서는 기본 UA 사용. Node 등에서 403 방지용.
      'User-Agent': 'ChunwooDashboard/1.0 (weather-autofill)',
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const hit = Array.isArray(data) ? data[0] : null;
  const lat = parseCoord(hit?.lat);
  const lon = parseCoord(hit?.lon);
  if (lat == null || lon == null) return null;
  if (lat < 33 || lat > 39 || lon < 124 || lon > 132) return null;
  return { lat, lon };
}

async function geocodeKoreanAddress(address) {
  const queries = buildGeocodeQueries(address);
  // 원문 전체 주소를 맨 앞에 (도로명 지오코딩용)
  const full = String(address || '').trim().replace(/\s+/g, ' ');
  const ordered = full && full !== '주소 미입력'
    ? [full, ...queries.filter((q) => q !== full)]
    : queries;

  for (const q of ordered) {
    if (GEOCODE_CACHE.has(q)) {
      const cached = GEOCODE_CACHE.get(q);
      if (cached) return cached;
      continue;
    }
    try {
      let coords = await geocodeViaOpenMeteo(q);
      if (!coords) coords = await geocodeViaNominatim(q);
      GEOCODE_CACHE.set(q, coords);
      if (coords) return coords;
    } catch (e) {
      console.warn('지오코딩 실패:', q, e);
      GEOCODE_CACHE.set(q, null);
    }
  }
  return null;
}

/** 동기 테이블 조회 후, 없으면 Open-Meteo 지오코딩 */
export async function resolveSiteCoordsAsync(site) {
  const sync = resolveSiteCoords(site);
  if (sync) return sync;
  const address = getSiteAddress(site);
  if (address) {
    const geo = await geocodeKoreanAddress(address);
    if (geo) return geo;
  }
  // 주소가 약해도 현장명에 지역이 들어있는 경우
  if (site?.name) {
    const fromName = extractRegionFromAddress(site.name);
    if (fromName && CITY_COORDINATES[fromName]) {
      const pair = CITY_COORDINATES[fromName];
      return { lon: pair[0], lat: pair[1] };
    }
    const geoName = await geocodeKoreanAddress(site.name);
    if (geoName) return geoName;
  }
  return null;
}

/** WMO weathercode → 일정 이모지 */
export function wmoCodeToEmoji(code) {
  const c = Number(code);
  if (!Number.isFinite(c)) return DEFAULT_WEATHER;
  if (c === 0 || c === 1 || c === 2) return '☀️';
  if (c === 3 || c === 45 || c === 48) return '☀️';
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return '☔';
  if ((c >= 71 && c <= 77) || (c >= 85 && c <= 86)) return '⛄';
  if (c >= 95 && c <= 99) return '🌀';
  return DEFAULT_WEATHER;
}

function todayStrSeoul() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

function normalizeDateStr(dateStr) {
  if (!dateStr) return null;
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.slice(0, 10);
  }
  try {
    const d = dateStr?.toDate ? dateStr.toDate() : new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
  } catch {
    return null;
  }
}

/** 일정 날짜가 오늘(서울)보다 이전인지 */
export function isPastScheduleDate(dateStr) {
  const day = normalizeDateStr(dateStr);
  if (!day) return false;
  return day < todayStrSeoul();
}

/**
 * 자동 날씨로 덮어쓸 수 있는지.
 * - manual: 불가
 * - 지난 날짜: 기본 불가(이미 저장된 날씨 고정). 생성·날짜 변경 시에만 allowPastFetch
 */
export function canAutoOverwriteWeather({ weatherSource, dateStr, allowPastFetch = false } = {}) {
  if (weatherSource === 'manual') return false;
  if (!allowPastFetch && isPastScheduleDate(dateStr)) return false;
  return true;
}

function cacheKey(lat, lon, dateStr) {
  return `${dateStr}_${lat.toFixed(3)}_${lon.toFixed(3)}`;
}

async function fetchWeatherCode(lat, lon, dateStr) {
  const today = todayStrSeoul();
  const isPast = dateStr < today;
  const base = isPast
    ? 'https://archive-api.open-meteo.com/v1/archive'
    : 'https://api.open-meteo.com/v1/forecast';
  // weather_code(신규) + weathercode(구) 둘 다 요청
  const url = `${base}?latitude=${lat}&longitude=${lon}&daily=weather_code,weathercode&timezone=Asia%2FSeoul&start_date=${dateStr}&end_date=${dateStr}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`weather http ${res.status}`);
  const data = await res.json();
  const codes = data?.daily?.weather_code || data?.daily?.weathercode;
  if (!Array.isArray(codes) || codes.length === 0) return null;
  return codes[0];
}

/**
 * @returns {Promise<string|null>} 이모지 또는 실패 시 null
 */
export async function fetchDailyWeatherEmoji({ lat, lon, dateStr }) {
  const day = normalizeDateStr(dateStr);
  if (!day || lat == null || lon == null) return null;

  const key = cacheKey(lat, lon, day);
  const cached = WEATHER_CACHE.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.emoji;
  }

  try {
    const code = await fetchWeatherCode(lat, lon, day);
    if (code == null) return null;
    const emoji = wmoCodeToEmoji(code);
    WEATHER_CACHE.set(key, { emoji, at: Date.now() });
    return emoji;
  } catch (e) {
    console.warn('날씨 조회 실패:', e);
    return null;
  }
}

/**
 * 현장 + 날짜로 날씨 이모지 조회.
 * 지난 날짜도 조회는 가능(생성·날짜이동용). 덮어쓰기 여부는 canAutoOverwriteWeather로 판단.
 * @returns {Promise<{ weather: string, weatherSource: 'auto', weatherFetchedAt: Date } | null>}
 */
export async function resolveWeatherForSite(site, dateStr) {
  if (!site) {
    console.warn('[weather] site 없음');
    return null;
  }
  const coords = await resolveSiteCoordsAsync(site);
  if (!coords) {
    console.warn('[weather] 좌표 해석 실패:', site.name || site.id, getSiteAddress(site));
    return null;
  }
  const weather = await fetchDailyWeatherEmoji({
    lat: coords.lat,
    lon: coords.lon,
    dateStr,
  });
  if (!weather) {
    console.warn('[weather] 날씨 조회 실패:', coords, dateStr);
    return null;
  }
  console.log('[weather] OK', site.name || site.id, dateStr, weather, coords);
  return {
    weather,
    weatherSource: 'auto',
    weatherFetchedAt: new Date(),
  };
}

const AUTO_REFRESH_COOLDOWN = new Map();

/**
 * 자동(weatherSource=auto) + 오늘/미래 일정만, 실제 날씨가 바뀌었으면 DB 갱신.
 * 수동(manual)·지난 날짜는 건드리지 않음.
 * @returns {Promise<boolean>} 갱신 여부
 */
export async function syncScheduleAutoWeather(schedule, site, updateFn) {
  if (!schedule?.id || typeof updateFn !== 'function') return false;
  if (schedule.weatherSource === 'manual') return false;
  // auto 이거나, 예전 데이터(weatherSource 없음)+siteId 있으면 갱신 시도
  const canSync =
    schedule.weatherSource === 'auto' ||
    (schedule.weatherSource == null && Boolean(schedule.siteId));
  if (!canSync) return false;

  const dateStr = normalizeDateStr(schedule.date);
  if (!dateStr || isPastScheduleDate(dateStr)) return false;

  const last = AUTO_REFRESH_COOLDOWN.get(schedule.id) || 0;
  if (Date.now() - last < CACHE_TTL_MS) return false;
  AUTO_REFRESH_COOLDOWN.set(schedule.id, Date.now());

  const info = await resolveWeatherForSite(site, dateStr);
  if (!info) return false;
  if (info.weather === schedule.weather && schedule.weatherSource === 'auto') return false;

  await updateFn(schedule.id, {
    weather: info.weather,
    weatherSource: 'auto',
    weatherFetchedAt: info.weatherFetchedAt,
  });
  return true;
}

export function findSiteByIdOrName(sites, { siteId, siteName, text } = {}) {
  const list = Array.isArray(sites) ? sites : [];
  if (siteId) {
    const byId = list.find((s) => s.id === siteId);
    if (byId) return byId;
  }
  const name = String(siteName || text || '').trim();
  if (!name) return null;
  return list.find((s) => String(s.name || '').trim() === name) || null;
}

export { DEFAULT_WEATHER };

/**
 * 일정관리 분류별 색상 — 전역 CSS가 Typography 색을 덮어쓰지 않도록 컴포넌트 sx와 동일 소스 유지
 */

export const SCHEDULE_CATEGORY_COLORS = {
  현장: '#ff6b6b',
  회의: '#4ecdc4',
  전자입찰: '#45b7d1',
  하자: '#ffeb3b',
  샘플: '#0984e3',
  현설: '#96ceb4',
  실측: '#feca57',
  기타: '#a55eea',
  날씨: '#ff9ff3',
  휴무: '#6c5ce7',
  검사: '#fd79a8',
  시설: '#00b894',
  관리: '#e17055',
  보수: '#74b9ff',
  정비: '#a29bfe',
  청소: '#00cec9',
  안전점검: '#fd79a8',
  설비점검: '#6c5ce7',
  환경점검: '#00b894',
  품질점검: '#e17055',
  보안점검: '#74b9ff',
  견적: '#ba68c8',
  입찰: '#22c55e',
  지원: '#26a69a',
};

/** scheduleTypePrefix와 동일한 우선순위 */
export function getScheduleTypeBadge(typeStr) {
  const t = (typeStr || '').toString();
  const pick = (key, label) => ({
    label,
    color: SCHEDULE_CATEGORY_COLORS[key] || '#e0e0e0',
  });

  if (t.includes('전자입찰')) return pick('전자입찰', '[전자입찰]');
  if (t.includes('견적')) return pick('견적', '[견적]');
  if (t.includes('입찰')) return pick('입찰', '[입찰]');
  if (t.includes('현장')) return pick('현장', '[현장]');
  if (t.includes('회의')) return pick('회의', '[회의]');
  if (t.includes('하자')) return pick('하자', '[하자]');
  if (t.includes('현설')) return pick('현설', '[현설]');
  if (t.includes('샘플')) return pick('샘플', '[샘플]');
  if (t.includes('실측')) return pick('실측', '[실측]');
  if (t.includes('지원')) return pick('지원', '[지원]');
  return null;
}

/** 뱃지 [분류]와 본문 앞 접두가 겹치면 제거 (목록·드래그 표시 등 공통) */
export function stripDuplicateScheduleBadgePrefix(typeStr, text) {
  const badge = getScheduleTypeBadge(typeStr);
  if (!badge) return text ?? '';
  let s = String(text ?? '').trimStart();
  if (s.startsWith(badge.label)) {
    return s.slice(badge.label.length).trimStart();
  }
  return String(text ?? '');
}

export function getCategoryColorForType(itemType) {
  if (!itemType) return '#181c24';
  const key = String(itemType).split(',')[0].trim();
  return SCHEDULE_CATEGORY_COLORS[key] || '#181c24';
}

/** 날짜 셀 행 배경 전용 (뱃지 글자색 SCHEDULE_CATEGORY_COLORS와 별도) */
export const SCHEDULE_CELL_BG_SILCHEUK = '#5b21b6';
export const SCHEDULE_CELL_BG_BID = '#eab308';
/** 현장: 분류 색(빨강)을 셀 배경에 쓰지 않고 기본 다크 톤 */
export const SCHEDULE_CELL_BG_FIELD = '#181c24';

function scheduleTypeTokensForCell(typeStr) {
  return String(typeStr || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

/** 분류 문자열에 특정 분류(예: 현장)가 포함되는지 확인 */
export function scheduleTypeIncludes(typeStr, label) {
  return scheduleTypeTokensForCell(typeStr).includes(label);
}

/**
 * 일정 캘린더 날짜 셀 행 배경. 실측→보라, 입찰→노랑, 첫 분류가 현장이면 빨강 배경 제거(다크).
 * @returns {string|null} 지정 색 또는 null(기존 item.color / getCategoryColorForType 로직 사용)
 */
export function getScheduleCellBackground(item) {
  if (!item) return null;
  if (item.color === 'transparent') return 'transparent';
  const typeStr = item.type ?? item.itemType ?? '';
  const tokens = scheduleTypeTokensForCell(typeStr);
  if (tokens.includes('실측')) return SCHEDULE_CELL_BG_SILCHEUK;
  if (tokens.includes('입찰')) return SCHEDULE_CELL_BG_BID;
  if (tokens[0] === '현장') return SCHEDULE_CELL_BG_FIELD;
  return null;
}

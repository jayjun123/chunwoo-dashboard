/**
 * 일정관리 분류별 색상 — 전역 CSS가 Typography 색을 덮어쓰지 않도록 컴포넌트 sx와 동일 소스 유지
 */

export const SCHEDULE_CATEGORY_COLORS = {
  현장: '#ff6b6b',
  회의: '#4ecdc4',
  전자입찰: '#45b7d1',
  하자: '#d63031',
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
  입찰: '#ff1744',
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

export function getCategoryColorForType(itemType) {
  if (!itemType) return '#181c24';
  const key = String(itemType).split(',')[0].trim();
  return SCHEDULE_CATEGORY_COLORS[key] || '#181c24';
}

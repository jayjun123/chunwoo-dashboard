/**
 * Project DSH — 기성현황(GisungStatusPage)·Progress·Cost와 동일한 집계 로직
 * - 계약금액: sites.contractAmount (1차), 없으면 progress 목록 합
 * - 기성누계: 청구완료만 (payments 합 또는 gisungAmount), 선급금 제외
 * - 입금누계: site.advance + 입금완료 기성 (예외·선급금 행 제외)
 * - 미수잔액: 계약금액 - 선급금 - 입금완료 기성금
 */

export function getTotalPayment(payments) {
  if (!Array.isArray(payments)) return 0;
  return payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
}

/** 선급금 행 여부 (기성현황과 동일) */
function isAdvanceRow(item) {
  return item.note && String(item.note).trim().includes('선급금');
}

/**
 * 계약금액: 기성현황과 동일하게 sites.contractAmount 우선
 * 없으면 Progress처럼 progressList의 contractAmount 합
 */
export function getContractTotal(progressList, site) {
  const fromSite = Number(site?.contractAmount) || 0;
  if (fromSite > 0) return fromSite;
  if (!Array.isArray(progressList)) return 0;
  return progressList.reduce((sum, item) => sum + (parseFloat(item.contractAmount) || 0), 0);
}

/**
 * 기성 누계: 청구완료만 합산 (선급금 미포함)
 * - payments 있으면 payments[].amount 합
 * - 없으면 gisungAmount (기성현황 gisung 스키마)
 */
export function getGisungTotal(progressList) {
  if (!Array.isArray(progressList)) return 0;
  return progressList
    .filter((item) => item.claimStatus === '청구완료')
    .reduce((sum, item) => {
      if (item.payments && item.payments.length) {
        return sum + getTotalPayment(item.payments);
      }
      return sum + (parseFloat(item.gisungAmount) || 0);
    }, 0);
}

/**
 * 입금 누계: 기성현황과 동일
 * = site.advance(선급금) + 입금완료 기성금 (예외·선급금 행 제외)
 */
export function getReceiptTotal(progressList, site) {
  const advance = Number(site?.advance) || 0;
  if (!Array.isArray(progressList)) return advance;
  const paidFromGisung = progressList
    .filter(
      (item) =>
        item.paymentStatus === '입금완료' &&
        !item.isException &&
        !isAdvanceRow(item)
    )
    .reduce((sum, item) => sum + (parseFloat(item.gisungAmount) || 0), 0);
  return advance + paidFromGisung;
}

/** 지출 누계: totalValue 합, 세금은 healthInsurance.amount 포함 */
export function getCostTotal(costs) {
  if (!Array.isArray(costs)) return 0;
  return costs.reduce((sum, cost) => {
    const base = Number(cost.totalValue) || 0;
    const health = (cost.healthInsurance || []).reduce(
      (s, item) => s + (Number(item.amount) || 0),
      0
    );
    return sum + base + health;
  }, 0);
}

/** 선급금: site.advance */
export function getAdvance(site) {
  return Number(site?.advance) || 0;
}

/**
 * 미수잔액: 기성현황과 동일 = 계약금액 - 선급금 - 입금완료 기성금
 * = contractAmount - receiptTotal (receiptTotal에 이미 선급금 포함)
 */
export function getBalance(contractAmount, receiptTotal) {
  return (Number(contractAmount) || 0) - (Number(receiptTotal) || 0);
}

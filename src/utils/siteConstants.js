/**
 * 현장(site) 폼/옵션 상수 — NewSites 등에서 사용
 * 데이터·디자인 변경 없이 분리만 함.
 */

export const STATUS_OPTIONS = ['예정', '진행', '완료', '미정'];
export const CONTRACT_TYPE_OPTIONS = ['하도급계약', '납품계약', '일반계약', '계약없음', '원도급', '관급'];
export const ESTIMATE_STATUS_OPTIONS = ['제출대기', '제출완료', '수주', '미수주', '기타'];
export const WORK_SCOPE_OPTIONS = ['없음', '관급', '사급'];

export const initialFormState = {
  name: '',
  status: '진행',
  contractType: '계약없음',
  subcontractGuardian: false,
  workScope: '없음',
  orderer: '',
  announcementNo: '',
  installment: '',
  contractAmount: '',
  advance: '',
  totalProgress: '',
  address: '',
  startDate: '',
  endDate: '',
  companyName: '',
  manager: '',
  phone: '',
  team: '',
  desc: '',
  isFavorite: false,
  stampType: '인감없음',
  safetyCost: 0,
  estimateStatus: '',
  windowCompany: '',
  note: '',
  items: [
    { isSpacer: true, name: '', quantity: '', price: '', amount: '' },
    { isSpacer: true, name: '', quantity: '', price: '', amount: '' },
    { isSpacer: true, name: '', quantity: '', price: '', amount: '' },
    { isTotal: true, name: '총 공사계(부가세별도)', quantity: '', price: '', amount: '0' },
    { isVat: true, name: '부가세', quantity: '', price: '', amount: '0' },
    { isTotalWithVat: true, name: '계약금액(부가세포함)', quantity: '', price: '', amount: '0' }
  ]
};

export const DEFAULT_ITEMS_WITH_SUMMARY = [
  { isSpacer: true, name: '', quantity: '', price: '', amount: '' },
  { isSpacer: true, name: '', quantity: '', price: '', amount: '' },
  { isSpacer: true, name: '', quantity: '', price: '', amount: '' },
  { isTotal: true, name: '총 공사계(부가세별도)', quantity: '', price: '', amount: '0' },
  { isVat: true, name: '부가세', quantity: '', price: '', amount: '0' },
  { isTotalWithVat: true, name: '계약금액(부가세포함)', quantity: '', price: '', amount: '0' }
];

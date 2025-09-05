// Firebase Storage 템플릿 다운로드 URL
// 생성일: 2025-09-01T05:31:49.264Z
// 프로젝트: chunwooo-edf9f

export const templateUrls = {
  // N 타입 견적서 템플릿
  "(N)견적서": "https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2FNgyunjuk.xlsx?alt=media",
  // L 타입 견적서 템플릿
  "(L)견적서": "https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2FLgyunjuk.xlsx?alt=media",
  // N 타입 납품계약서 템플릿
  "(N)납품계약서": "https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2FNnapfoom.xlsx?alt=media",
  // L 타입 납품계약서 템플릿
  "(L)납품계약서": "https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2FLnapfoom.xlsx?alt=media",
  // N 타입 기성금청구서 템플릿 (20개 이하 물량)
  "(N)기성금청구서": "https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2FNEW.xlsx?alt=media",
  // L 타입 기성금청구서 템플릿 (21개 이상 물량)
  "(L)기성금청구서": "https://firebasestorage.googleapis.com/v0/b/chunwooo-edf9f.firebasestorage.app/o/templates%2FLONG.xlsx?alt=media"
};

// 사용 예시:
// import { templateUrls } from './templateUrls';
// const estimateNUrl = templateUrls['(N)견적서'];
// const estimateLUrl = templateUrls['(L)견적서'];
// const contractNUrl = templateUrls['(N)납품계약서'];
// const contractLUrl = templateUrls['(L)납품계약서'];
// const gisungNUrl = templateUrls['(N)기성금청구서'];
// const gisungLUrl = templateUrls['(L)기성금청구서'];

// 템플릿 타입별 설명
export const templateDescriptions = {
  "(N)견적서": "N 타입 견적서 (물량 20개 이하)",
  "(L)견적서": "L 타입 견적서 (물량 21개 이상)",
  "(N)납품계약서": "N 타입 납품계약서 (물량 20개 이하)",
  "(L)납품계약서": "L 타입 납품계약서 (물량 21개 이상)",
  "(N)기성금청구서": "N 타입 기성금청구서 (물량 20개 이하)",
  "(L)기성금청구서": "L 타입 기성금청구서 (물량 21개 이상)"
};

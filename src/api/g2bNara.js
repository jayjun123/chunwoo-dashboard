/**
 * 나라장터(G2B) 낙찰정보 API 연동
 * 공공데이터포털 "조달청_나라장터 낙찰정보서비스" (data.go.kr/data/15129397) 활용
 * 인증키: 공공데이터포털에서 활용신청 후 VITE_G2B_API_KEY 로 설정
 */

import axios from 'axios';

const API_KEY = import.meta.env.VITE_G2B_API_KEY;
// 공공데이터 API URL (명세는 data.go.kr API 상세에서 확인)
const BASE_URL = import.meta.env.VITE_G2B_API_BASE || 'https://apis.data.go.kr/1311000/';

/**
 * 공고번호로 개찰(낙찰) 결과 조회
 * @param {string} announcementNo - 나라장터 공고번호
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function fetchBidResult(announcementNo) {
  if (!API_KEY) {
    return { success: false, error: 'VITE_G2B_API_KEY가 설정되지 않았습니다. 공공데이터포털(data.go.kr)에서 활용신청 후 인증키를 설정해주세요.' };
  }
  if (!announcementNo || !String(announcementNo).trim()) {
    return { success: false, error: '공고번호가 없습니다.' };
  }

  const no = String(announcementNo).trim();

  try {
    // 나라장터 낙찰정보 API (엔드포인트/파라미터는 API 명세에 따라 수정)
    // 참고: https://www.data.go.kr/data/15129397/openapi.do
    const url = `${BASE_URL}getBidPblancListInfo`;
    const params = new URLSearchParams({
      serviceKey: API_KEY,
      numOfRows: '100',
      pageNo: '1',
      type: 'json',
      bidNtceNo: no,
    });

    const response = await axios.get(`${url}?${params.toString()}`, { timeout: 15000 });

    const res = response.data;
    // 공공데이터 응답 구조: response.body.items.item 또는 response.response.body
    const body = res?.response?.body || res?.body || res;
    const items = body?.items?.item;
    const item = Array.isArray(items) ? items[0] : items || body?.item;

    if (!item && !body?.totalCount) {
      return { success: false, error: '개찰결과가 없거나 공고번호를 확인해주세요.' };
    }

    // 응답 필드명은 API 명세에 따라 매핑 (예: 낙찰자, 순위, 낙찰금액 등)
    const data = {
      announcementNo: no,
      winningCompany: item?.sucsbidComNm ?? item?.sucsbidComNm ?? item?.bidNtceNm ?? '-',
      winningAmount: item?.sucsbidAmt ?? item?.sucsbidAmount ?? item?.bidAmt ?? null,
      winningRate: item?.sucsbidRate ?? item?.sucsbidRt ?? null,
      resultRank: item?.rank ?? item?.ord ?? null,
      raw: item || body,
    };

    return { success: true, data };
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'API 요청 실패';
    return { success: false, error: msg };
  }
}

/**
 * 천우건업(주) 투찰 건에 대해 개찰결과를 조회해 반환 (여러 건)
 * @param {Array<{ id: string, naraAnnouncementNo?: string }>} bids - 공고번호가 있는 입찰 목록
 * @returns {Promise<Array<{ bidId: string, success: boolean, data?: object, error?: string }>>}
 */
export async function fetchBidResultsForBids(bids) {
  const list = Array.isArray(bids) ? bids : [];
  const withNo = list.filter((b) => b.naraAnnouncementNo && String(b.naraAnnouncementNo).trim());
  const results = [];

  for (const bid of withNo) {
    const result = await fetchBidResult(bid.naraAnnouncementNo);
    results.push({
      bidId: bid.id,
      announcementNo: bid.naraAnnouncementNo,
      ...result,
    });
    // API 부하 방지
    await new Promise((r) => setTimeout(r, 300));
  }

  return results;
}

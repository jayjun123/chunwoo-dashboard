import axios from 'axios';
import { db } from '../firebase';
import { collection, addDoc, setDoc, doc, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';

// 네이버 뉴스 검색 (키워드별)
const fetchNaverNews = async (keyword) => {
  try {
    const response = await axios.get(
      '/naverapi/v1/search/news.json',
      {
        params: {
          query: keyword,
          display: 10,
          sort: 'date'
        },
        headers: {
          'X-Naver-Client-Id': NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
        }
      }
    );
    return response.data.items;
  } catch (error) {
    console.error(`네이버 뉴스 검색 실패 (${keyword}):`, error);
    return [];
  }
};

// 뉴스 통합 검색 및 중복 제거, 최신순 10개
export const searchConstructionNews = async () => {
  try {
    const [news1, news2] = await Promise.all([
      fetchNaverNews('건설'),
      fetchNaverNews('유리공사')
    ]);
    
    // 중복 제거 (링크 기준)
    const allNews = [...news1, ...news2];
    const uniqueNews = Array.from(new Map(allNews.map(item => [item.link, item])).values());
    
    // 최신순 정렬
    uniqueNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    // 10개만 반환
    return uniqueNews.slice(0, 10);
  } catch (error) {
    console.error('뉴스 검색 중 오류 발생:', error);
    return [];
  }
};

// Firestore에 뉴스 저장 (배치 처리)
export const saveNewsToFirestore = async (newsList) => {
  try {
    const batch = newsList.map(async (item) => {
      // 링크 기준 중복 방지: doc id를 링크 해시로 사용
      const id = btoa(unescape(encodeURIComponent(item.link))).replace(/=+$/, '');
      const newsData = {
        ...item,
        savedAt: Timestamp.now(),
        category: item.title.includes('유리') ? '유리공사' : '건설'
      };
      await setDoc(doc(db, 'news', id), newsData);
    });
    await Promise.all(batch);
    console.log(`${newsList.length}개의 뉴스가 Firestore에 저장되었습니다.`);
  } catch (error) {
    console.error('뉴스 Firestore 저장 오류:', error);
    throw error;
  }
};

// Firestore에서 최신 뉴스 10개 가져오기 (캐시 적용)
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5분

export const getNewsFromFirestore = async (forceRefresh = false) => {
  const now = Date.now();
  
  // 캐시가 유효하고 강제 새로고침이 아닌 경우 캐시된 데이터 반환
  if (!forceRefresh && now - lastFetchTime < CACHE_DURATION) {
    return null;
  }

  try {
    const q = query(
      collection(db, 'news'),
      orderBy('savedAt', 'desc'),
      limit(10)
    );
    
    const snapshot = await getDocs(q);
    const news = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    lastFetchTime = now;
    return news;
  } catch (error) {
    console.error('Firestore에서 뉴스 조회 실패:', error);
    throw error;
  }
};

// 오래된 뉴스 정리 (7일 이상 지난 뉴스)
export const cleanupOldNews = async () => {
  try {
    const sevenDaysAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const q = query(
      collection(db, 'news'),
      where('savedAt', '<', sevenDaysAgo)
    );
    
    const snapshot = await getDocs(q);
    const batch = snapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(batch);
    
    console.log(`${snapshot.size}개의 오래된 뉴스가 삭제되었습니다.`);
  } catch (error) {
    console.error('오래된 뉴스 정리 실패:', error);
  }
}; 
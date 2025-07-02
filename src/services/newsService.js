import axios from 'axios';
import { db } from '../firebase';
import { collection, addDoc, setDoc, doc, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';

// 로컬 스토리지 키
const NEWS_STORAGE_KEY = 'chunwoo_news_cache';
const NEWS_DATE_KEY = 'chunwoo_news_date';

// 오늘 날짜 확인 (YYYY-MM-DD 형식)
const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};

// 로컬 스토리지에서 뉴스 가져오기
const getNewsFromLocalStorage = () => {
  try {
    const savedDate = localStorage.getItem(NEWS_DATE_KEY);
    const today = getTodayString();
    
    // 오늘 저장된 뉴스가 있는지 확인
    if (savedDate === today) {
      const savedNews = localStorage.getItem(NEWS_STORAGE_KEY);
      if (savedNews) {
        return JSON.parse(savedNews);
      }
    }
    return null;
  } catch (error) {
    console.error('로컬 스토리지에서 뉴스 읽기 실패:', error);
    return null;
  }
};

// 로컬 스토리지에 뉴스 저장
const saveNewsToLocalStorage = (newsList) => {
  try {
    const today = getTodayString();
    localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(newsList));
    localStorage.setItem(NEWS_DATE_KEY, today);
    console.log('뉴스가 로컬 스토리지에 저장되었습니다.');
  } catch (error) {
    console.error('로컬 스토리지에 뉴스 저장 실패:', error);
  }
};

// 네이버 뉴스 검색 (키워드별) - 실제 API 연동
const fetchNaverNews = async (keyword) => {
  try {
    const clientId = import.meta.env.VITE_NAVER_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_NAVER_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('네이버 API 키가 설정되지 않았습니다.');
    }
    
    // 현재 날짜와 일주일 전 날짜 계산
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // 날짜 범위를 문자열로 변환 (YYYY-MM-DD 형식)
    const startDate = oneWeekAgo.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];
    
    console.log(`뉴스 검색: ${keyword}, 기간: ${startDate} ~ ${endDate}`);
    
    const response = await axios.get(
      '/naverapi/v1/search/news.json',
      {
        params: {
          query: keyword,
          display: 20, // 더 많은 결과를 가져와서 필터링
          sort: 'date',
          start: 1
        },
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret
        }
      }
    );
    
    // 날짜 필터링 적용
    const filteredItems = (response.data.items || []).filter(item => {
      try {
        const pubDate = new Date(item.pubDate);
        return pubDate >= oneWeekAgo && pubDate <= now;
      } catch (error) {
        console.warn('날짜 파싱 실패:', item.pubDate);
        return false;
      }
    });
    
    console.log(`${keyword} 검색 결과: 전체 ${response.data.items?.length || 0}개, 필터링 후 ${filteredItems.length}개`);
    
    // 네이버 뉴스 API 결과를 내부 포맷으로 변환
    return filteredItems.map((item, idx) => ({
      id: `${keyword}_${idx}`,
      title: item.title,
      description: item.description,
      link: item.link,
      pubDate: item.pubDate
    }));
  } catch (error) {
    console.error(`네이버 뉴스 검색 실패 (${keyword}):`, error);
    throw error; // 더미 데이터 반환하지 않고 에러를 던짐
  }
};

// 뉴스 통합 검색 및 중복 제거, 최신순 10개
export const searchConstructionNews = async () => {
  try {
    console.log('뉴스 검색 시작');
    // 키워드별로 검색 (우선순위 순서)
    const keywords = ['유리공사', '건설', '대구', '경북'];
    const results = await Promise.all(keywords.map(fetchNaverNews));
    // 모든 키워드 결과 합치기
    const allNews = results.flat();
    // 중복 제거 (링크 기준)
    const uniqueNews = Array.from(new Map(allNews.map(item => [item.link, item])).values());
    // 우선순위에 따른 정렬 (유리공사 > 건설 > 대구/경북)
    uniqueNews.sort((a, b) => {
      // 우선순위 점수 계산
      const getPriorityScore = (item) => {
        const title = item.title.toLowerCase();
        const description = (item.description || '').toLowerCase();
        const content = title + ' ' + description;
        // 1순위: 유리공사
        if (content.includes('유리공사')) return 3;
        // 2순위: 건설
        if (content.includes('건설')) return 2;
        // 3순위: 대구 또는 경북
        if (content.includes('대구') || content.includes('경북')) return 1;
        return 0;
      };
      const scoreA = getPriorityScore(a);
      const scoreB = getPriorityScore(b);
      // 우선순위가 같으면 최신순
      if (scoreA === scoreB) {
        return new Date(b.pubDate) - new Date(a.pubDate);
      }
      // 우선순위가 높은 순서로 정렬
      return scoreB - scoreA;
    });
    // 10개만 반환
    const finalNews = uniqueNews.slice(0, 10);
    console.log('최종 뉴스 데이터:', finalNews.length, '개');
    saveNewsToLocalStorage(finalNews);
    return finalNews;
  } catch (error) {
    console.error('뉴스 검색 중 오류 발생:', error);
    throw error;
  }
};

// 뉴스 가져오기 (로컬 스토리지 우선, 없으면 새로 검색)
export const getNews = async (forceRefresh = false) => {
  // 강제 새로고침이 아닌 경우 로컬 스토리지 확인
  if (!forceRefresh) {
    const localNews = getNewsFromLocalStorage();
    if (localNews && localNews.length > 0) {
      console.log('로컬 스토리지에서 뉴스를 가져왔습니다.');
      return localNews;
    }
  }
  
  // 로컬 스토리지에 없거나 강제 새로고침인 경우 새로 검색
  console.log('새로운 뉴스를 검색합니다.');
  try {
    const news = await searchConstructionNews();
    return news || [];
  } catch (error) {
    console.error('뉴스 검색 실패:', error);
    return []; // 빈 배열 반환 (더미 데이터 없음)
  }
};

// Firestore에 뉴스 저장 (배치 처리)
export const saveNewsToFirestore = async (newsList) => {
  try {
    const batch = newsList.map(async (item) => {
      // 링크 기준 중복 방지: doc id를 링크 해시로 사용
      const id = btoa(unescape(encodeURIComponent(item.link)))
        .replace(/=+$/, '')
        .replace(/\//g, '_')
        .replace(/\+/g, '-');
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
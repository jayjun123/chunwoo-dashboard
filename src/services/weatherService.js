import { format, addDays } from 'date-fns';

/**
 * 기상청 단기예보 API를 사용하여 5일치 일기예보를 가져옵니다
 * @param {number} nx - X 좌표
 * @param {number} ny - Y 좌표
 * @returns {Promise<object|null>} 가공된 5일치 일기예보 객체
 */
export const get5DayForecast = async (nx = 89, ny = 90) => {
  try {
    // 기상청 API 키 확인
    const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
    console.log('기상청 API 키 확인:', apiKey ? '설정됨' : '설정되지 않음');
    
    if (!apiKey) {
      throw new Error('기상청 API 키가 설정되지 않았습니다.');
    }

    // 오늘 날짜 기준으로 API 호출
    const today = new Date();
    const baseDate = format(today, 'yyyyMMdd');
    
    // 현재 시간에 맞는 발표시각 설정
    let baseTime = '0500';
    const currentHour = today.getHours();
    if (currentHour < 6) {
      // 6시 이전이면 전날 23시 발표 데이터 사용
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const baseDate = format(yesterday, 'yyyyMMdd');
      baseTime = '2300';
    } else if (currentHour < 18) {
      baseTime = '0500';
    } else {
      baseTime = '1700';
    }

    const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${apiKey}&numOfRows=1000&pageNo=1&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;

    console.log('기상청 API 호출 URL:', url);
    console.log('요청 좌표:', { nx, ny });

    const response = await fetch(url);
    console.log('API 응답 상태:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`API 응답 오류: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('기상청 API 원본 응답:', data);

    if (!data.response?.body?.items?.item) {
      console.error('기상청 API 응답에 데이터가 없습니다.');
      throw new Error('API 응답에 데이터가 없음');
    }

    const items = data.response.body.items.item;
    console.log('기상청 데이터 아이템 수:', items.length);
    
    const processedData = processWeatherData(items);
    console.log('가공된 날씨 데이터:', processedData);
    
    return processedData;

  } catch (error) {
    console.error('기상청 API 호출 중 오류 발생:', error);
    throw error;
  }
};

/**
 * 기상청 API 데이터를 가공합니다
 * @param {Array} items - 기상청 API 응답 아이템들
 * @returns {object} 가공된 날씨 데이터
 */
const processWeatherData = (items) => {
  const dailyData = [];

  // 5일간의 데이터 처리
  for (let i = 0; i < 5; i++) {
    const targetDate = addDays(new Date(), i);
    const dateStr = format(targetDate, 'yyyyMMdd');
    
    // 해당 날짜의 데이터 필터링
    const dayItems = items.filter(item => item.fcstDate === dateStr);
    
    if (dayItems.length === 0) {
      console.log(`${dateStr} 날짜의 데이터가 없습니다.`);
      continue;
    }

    console.log(`${dateStr} 날짜의 데이터 수:`, dayItems.length);

    // 기온 데이터 (최고/최저)
    const tempItems = dayItems.filter(item => item.category === 'TMP');
    const maxTempItem = tempItems.find(item => item.fcstTime === '1500'); // 15시 (최고기온)
    const minTempItem = tempItems.find(item => item.fcstTime === '0600'); // 06시 (최저기온)
    
    // 하늘상태 데이터
    const skyItem = dayItems.find(item => item.category === 'SKY' && item.fcstTime === '1200');
    
    // 강수형태 데이터
    const ptyItem = dayItems.find(item => item.category === 'PTY' && item.fcstTime === '1200');
    
    // 강수확률 데이터
    const popItem = dayItems.find(item => item.category === 'POP' && item.fcstTime === '1200');

    const dayName = i === 0 ? '오늘' : 
                   i === 1 ? '내일' : 
                   i === 2 ? '모레' : 
                   i === 3 ? '글피' : '그글피';

    const dayData = {
      date: format(targetDate, 'yyyy-MM-dd'),
      dayName: dayName,
      maxTemp: maxTempItem ? parseInt(maxTempItem.fcstValue) : null,
      minTemp: minTempItem ? parseInt(minTempItem.fcstValue) : null,
      sky: getSkyText(skyItem?.fcstValue || '1'),
      pty: ptyItem?.fcstValue || '0',
      pop: popItem ? parseInt(popItem.fcstValue) : 0
    };

    console.log(`${dayName} 데이터:`, dayData);
    dailyData.push(dayData);
  }

  return { daily: dailyData };
};

/**
 * 기상청 하늘상태 코드를 텍스트로 변환
 * @param {string} skyCode - 기상청 하늘상태 코드
 * @returns {string} 하늘상태 텍스트
 */
const getSkyText = (skyCode) => {
  const skyMap = {
    '1': '맑음',
    '3': '구름많음',
    '4': '흐림'
  };
  return skyMap[skyCode] || '맑음';
};

/**
 * 현재 날씨 정보를 가져옵니다
 * @param {number} nx - X 좌표
 * @param {number} ny - Y 좌표
 * @returns {Promise<object>} 현재 날씨 정보
 */
export const getCurrentWeather = async (nx = 89, ny = 90) => {
  try {
    const forecastData = await get5DayForecast(nx, ny);
    const todayData = forecastData.daily[0];
    
    if (!todayData) {
      throw new Error('오늘 날씨 데이터가 없습니다.');
    }
    
    return {
      temperature: todayData.maxTemp,
      weather: todayData.sky,
      precipitation: todayData.pop,
      date: todayData.date
    };
  } catch (error) {
    console.error('현재 날씨 조회 실패:', error);
    throw error;
  }
};

/**
 * 지역별 좌표 정보
 */
export const LOCATION_COORDS = {
  '서울': { nx: 60, ny: 127 },
  '부산': { nx: 98, ny: 76 },
  '대구': { nx: 89, ny: 90 },
  '인천': { nx: 55, ny: 124 },
  '광주': { nx: 58, ny: 74 },
  '대전': { nx: 67, ny: 100 },
  '울산': { nx: 102, ny: 84 },
  '세종': { nx: 66, ny: 103 },
  '경기': { nx: 60, ny: 120 },
  '강원': { nx: 73, ny: 134 },
  '충북': { nx: 69, ny: 107 },
  '충남': { nx: 68, ny: 100 },
  '전북': { nx: 63, ny: 89 },
  '전남': { nx: 51, ny: 67 },
  '경북': { nx: 89, ny: 91 },
  '경남': { nx: 91, ny: 76 },
  '제주': { nx: 53, ny: 38 }
};

/**
 * 지역명으로 좌표를 찾습니다
 * @param {string} location - 지역명
 * @returns {object} 좌표 정보
 */
export const getLocationCoords = (location) => {
  if (!location) return { nx: 89, ny: 90 }; // 기본값: 대구
  
  // 입력된 지역명에서 매칭되는 좌표 찾기
  for (const [city, coords] of Object.entries(LOCATION_COORDS)) {
    if (location.includes(city)) {
      return coords;
    }
  }
  
  // 기본값: 대구
  return { nx: 89, ny: 90 };
}; 
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
      console.error('기상청 API 키가 설정되지 않았습니다.');
      throw new Error('API 키가 설정되지 않음');
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
    throw error; // 에러를 다시 던져서 상위에서 처리하도록 함
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
 * 하늘상태 코드를 텍스트로 변환
 * @param {string} skyCode - 하늘상태 코드
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
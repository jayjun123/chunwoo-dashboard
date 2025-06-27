import axios from 'axios';
import { format } from 'date-fns';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';

const WEATHER_API_KEY = process.env.REACT_APP_WEATHER_API_KEY;
const BASE_URL = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0';

// 기상청 API 호출
export const getWeatherForecast = async (nx = 55, ny = 127) => {
  try {
    const today = format(new Date(), 'yyyyMMdd');
    const response = await axios.get(
      `${BASE_URL}/getVilageFcst`,
      {
        params: {
          serviceKey: WEATHER_API_KEY,
          numOfRows: 1000,
          pageNo: 1,
          dataType: 'JSON',
          base_date: today,
          base_time: '0500',
          nx,
          ny
        }
      }
    );

    // 응답 데이터 가공
    const items = response.data.response.body.items.item;
    const forecast = processWeatherData(items);
    
    // Firestore에 저장
    await saveWeatherToFirestore(forecast);
    
    return forecast;
  } catch (error) {
    console.error('날씨 정보 조회 실패:', error);
    throw error;
  }
};

// 날씨 데이터 가공
const processWeatherData = (items) => {
  const forecast = {
    today: {},
    tomorrow: {},
    afterTomorrow: {}
  };

  items.forEach(item => {
    const date = item.fcstDate;
    const time = item.fcstTime;
    const category = item.category;
    const value = item.fcstValue;

    let targetDay;
    if (date === format(new Date(), 'yyyyMMdd')) {
      targetDay = 'today';
    } else if (date === format(new Date(Date.now() + 86400000), 'yyyyMMdd')) {
      targetDay = 'tomorrow';
    } else {
      targetDay = 'afterTomorrow';
    }

    if (!forecast[targetDay][time]) {
      forecast[targetDay][time] = {};
    }

    switch (category) {
      case 'TMP': // 기온
        forecast[targetDay][time].temperature = value;
        break;
      case 'SKY': // 하늘상태
        forecast[targetDay][time].sky = getSkyStatus(value);
        break;
      case 'PTY': // 강수형태
        forecast[targetDay][time].precipitation = getPrecipitationType(value);
        break;
      case 'POP': // 강수확률
        forecast[targetDay][time].precipitationProbability = value;
        break;
      default:
        break;
    }
  });

  return forecast;
};

// 하늘상태 변환
const getSkyStatus = (code) => {
  switch (code) {
    case '1': return '맑음';
    case '3': return '구름많음';
    case '4': return '흐림';
    default: return '알 수 없음';
  }
};

// 강수형태 변환
const getPrecipitationType = (code) => {
  switch (code) {
    case '0': return '없음';
    case '1': return '비';
    case '2': return '비/눈';
    case '3': return '눈';
    case '4': return '소나기';
    default: return '알 수 없음';
  }
};

// Firestore에 날씨 데이터 저장
const saveWeatherToFirestore = async (forecast) => {
  try {
    await addDoc(collection(db, 'weather'), {
      ...forecast,
      timestamp: new Date(),
      location: { nx: 55, ny: 127 } // 서울 좌표
    });
  } catch (error) {
    console.error('날씨 데이터 저장 실패:', error);
  }
};

// Firestore에서 최신 날씨 데이터 조회
export const getLatestWeather = async () => {
  try {
    const q = query(
      collection(db, 'weather'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data();
    }
    return null;
  } catch (error) {
    console.error('날씨 데이터 조회 실패:', error);
    return null;
  }
}; 
// 한국의 명절, 국가기념일, 기념일 데이터
// 음력 날짜는 매년 달라지므로 대략적인 양력 날짜로 설정

export const getKoreanHolidays = (year) => {
  const holidays = {};

  // 고정 기념일 (양력) - 주요 공휴일
  const fixedHolidays = [
    { month: 1, day: 1, name: '신정' },
    { month: 3, day: 1, name: '삼일절' },
    { month: 5, day: 5, name: '어린이날' },
    { month: 6, day: 6, name: '현충일' },
    { month: 8, day: 15, name: '광복절' },
    { month: 10, day: 3, name: '개천절' },
    { month: 10, day: 9, name: '한글날' },
    { month: 12, day: 25, name: '크리스마스' }
  ];

  // 음력 기념일 (대략적인 양력 날짜)
  const lunarHolidays = [
    { month: 1, day: 1, name: '설날' }, // 음력 1월 1일 (대략 양력 1월 말~2월 초)
    { month: 4, day: 8, name: '부처님오신날' }, // 음력 4월 8일 (대략 양력 4월 말~5월 초)
    { month: 8, day: 15, name: '추석' }, // 음력 8월 15일 (대략 양력 9월 중순~10월 초)
  ];

  // 각 년도별 음력 날짜, 대체휴일, 연휴 (대략적인 양력 날짜)
  const lunarDates = {
    2024: {
      '설날': { month: 2, day: 10 },
      '설날연휴': { month: 2, day: 11 },
      '설날연휴': { month: 2, day: 12 },
      '부처님오신날': { month: 5, day: 15 },
      '추석연휴': { month: 9, day: 15 },
      '추석연휴': { month: 9, day: 16 },
      '추석': { month: 9, day: 17 },
      '추석연휴': { month: 9, day: 18 },
      '추석연휴': { month: 9, day: 19 },
      '추석연휴': { month: 9, day: 20 },
      '추석연휴': { month: 9, day: 21 }
    },
    2025: {
      '설날': { month: 1, day: 29 },
      '설날연휴': { month: 1, day: 30 },
      '설날연휴': { month: 1, day: 31 },
      '부처님오신날': { month: 5, day: 5 },
      '추석연휴': { month: 10, day: 4 },
      '추석연휴': { month: 10, day: 5 },
      '추석': { month: 10, day: 6 },
      '대체휴일': { month: 10, day: 7 },
      '대체휴일': { month: 10, day: 8 },
      '한글날': { month: 10, day: 9 }
    },
    2026: {
      '설날': { month: 2, day: 17 },
      '설날연휴': { month: 2, day: 18 },
      '설날연휴': { month: 2, day: 19 },
      '부처님오신날': { month: 4, day: 25 },
      '추석연휴': { month: 9, day: 23 },
      '추석연휴': { month: 9, day: 24 },
      '추석': { month: 9, day: 25 },
      '추석연휴': { month: 9, day: 26 },
      '추석연휴': { month: 9, day: 27 },
      '추석연휴': { month: 9, day: 28 },
      '추석연휴': { month: 9, day: 29 }
    },
    2027: {
      '설날': { month: 2, day: 6 },
      '설날연휴': { month: 2, day: 7 },
      '설날연휴': { month: 2, day: 8 },
      '부처님오신날': { month: 5, day: 13 },
      '추석연휴': { month: 10, day: 13 },
      '추석연휴': { month: 10, day: 14 },
      '추석': { month: 10, day: 15 },
      '추석연휴': { month: 10, day: 16 },
      '추석연휴': { month: 10, day: 17 },
      '추석연휴': { month: 10, day: 18 },
      '추석연휴': { month: 10, day: 19 }
    },
    2028: {
      '설날': { month: 1, day: 26 },
      '설날연휴': { month: 1, day: 27 },
      '설날연휴': { month: 1, day: 28 },
      '부처님오신날': { month: 5, day: 2 },
      '추석연휴': { month: 10, day: 1 },
      '추석연휴': { month: 10, day: 2 },
      '추석': { month: 10, day: 3 },
      '추석연휴': { month: 10, day: 4 },
      '추석연휴': { month: 10, day: 5 },
      '추석연휴': { month: 10, day: 6 },
      '추석연휴': { month: 10, day: 7 }
    }
  };

  // 고정 기념일 추가
  fixedHolidays.forEach(holiday => {
    const dateStr = `${year}-${String(holiday.month).padStart(2, '0')}-${String(holiday.day).padStart(2, '0')}`;
    holidays[dateStr] = {
      name: holiday.name,
      type: 'national',
      isHoliday: true
    };
  });

  // 음력 기념일 및 연휴 추가 (해당 년도 데이터가 있는 경우)
  if (lunarDates[year]) {
    Object.entries(lunarDates[year]).forEach(([name, date]) => {
      const dateStr = `${year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
      holidays[dateStr] = {
        name: name,
        type: 'lunar',
        isHoliday: true
      };
    });
  }

  // 대체휴일 추가 (주말과 겹치는 공휴일의 대체)
  const substituteHolidays = {
    2024: [
      { month: 2, day: 12, name: '대체휴일' }, // 설날연휴 대체
      { month: 9, day: 20, name: '대체휴일' }, // 추석연휴 대체
      { month: 9, day: 21, name: '대체휴일' }  // 추석연휴 대체
    ],
    2025: [
      { month: 1, day: 31, name: '대체휴일' }, // 설날연휴 대체
      { month: 10, day: 7, name: '대체휴일' }, // 추석연휴 대체
      { month: 10, day: 8, name: '대체휴일' }  // 추석연휴 대체
    ],
    2026: [
      { month: 2, day: 19, name: '대체휴일' }, // 설날연휴 대체
      { month: 9, day: 28, name: '대체휴일' }, // 추석연휴 대체
      { month: 9, day: 29, name: '대체휴일' }  // 추석연휴 대체
    ],
    2027: [
      { month: 2, day: 8, name: '대체휴일' },  // 설날연휴 대체
      { month: 10, day: 18, name: '대체휴일' }, // 추석연휴 대체
      { month: 10, day: 19, name: '대체휴일' } // 추석연휴 대체
    ],
    2028: [
      { month: 1, day: 28, name: '대체휴일' }, // 설날연휴 대체
      { month: 10, day: 6, name: '대체휴일' }, // 추석연휴 대체
      { month: 10, day: 7, name: '대체휴일' }  // 추석연휴 대체
    ]
  };

  // 대체휴일 추가
  if (substituteHolidays[year]) {
    substituteHolidays[year].forEach(holiday => {
      const dateStr = `${year}-${String(holiday.month).padStart(2, '0')}-${String(holiday.day).padStart(2, '0')}`;
      holidays[dateStr] = {
        name: holiday.name,
        type: 'substitute',
        isHoliday: true
      };
    });
  }

  // 기타 기념일들 (중복 제거)
  const otherHolidays = [
    { month: 1, day: 2, name: '신정연휴' },
    { month: 1, day: 3, name: '신정연휴' },
    { month: 2, day: 14, name: '발렌타인데이' },
    { month: 3, day: 8, name: '국제여성의날' },
    { month: 3, day: 14, name: '화이트데이' },
    { month: 4, day: 1, name: '만우절' },
    { month: 4, day: 5, name: '식목일' },
    { month: 4, day: 22, name: '지구의날' },
    { month: 5, day: 1, name: '근로자의날' },
    { month: 5, day: 8, name: '어버이날' },
    { month: 5, day: 15, name: '스승의날' },
    { month: 5, day: 18, name: '박물관의날' },
    { month: 5, day: 21, name: '부부의날' },
    { month: 6, day: 1, name: '의병의날' },
    { month: 6, day: 25, name: '6.25전쟁일' },
    { month: 7, day: 7, name: '칠석' },
    { month: 7, day: 17, name: '제헌절' },
    { month: 9, day: 9, name: '중양절' },
    { month: 10, day: 1, name: '국군의날' },
    { month: 11, day: 11, name: '빼빼로데이' },
    { month: 12, day: 31, name: '대설' }
  ];

  otherHolidays.forEach(holiday => {
    const dateStr = `${year}-${String(holiday.month).padStart(2, '0')}-${String(holiday.day).padStart(2, '0')}`;
    holidays[dateStr] = {
      name: holiday.name,
      type: 'memorial',
      isHoliday: false
    };
  });

  return holidays;
};

// 특정 날짜가 휴일인지 확인하는 함수
export const isHoliday = (dateStr, year) => {
  const holidays = getKoreanHolidays(year);
  return holidays[dateStr]?.isHoliday || false;
};

// 특정 날짜의 기념일 정보를 가져오는 함수
export const getHolidayInfo = (dateStr, year) => {
  const holidays = getKoreanHolidays(year);
  return holidays[dateStr] || null;
};

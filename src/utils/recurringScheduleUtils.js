import { addDays, addWeeks, addMonths, addYears, isSameDay, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

// 반복 일정 생성
export const generateRecurringSchedules = (schedule, startDate, endDate) => {
  if (!schedule.repeat?.enabled) {
    return [schedule];
  }

  const schedules = [];
  const { repeat } = schedule;
  let currentDate = new Date(schedule.startDate);

  // 시작 날짜가 지정된 범위보다 이전인 경우, 시작 날짜부터 시작
  if (isBefore(currentDate, startDate)) {
    currentDate = new Date(startDate);
  }

  // 종료 날짜 설정
  const maxEndDate = repeat.endDate 
    ? new Date(repeat.endDate)
    : addYears(new Date(), 1); // 기본 1년

  const actualEndDate = isBefore(endDate, maxEndDate) ? endDate : maxEndDate;

  while (isBefore(currentDate, actualEndDate)) {
    // 반복 유형에 따른 다음 날짜 계산
    const nextDate = getNextRecurringDate(currentDate, repeat);
    
    if (isAfter(nextDate, actualEndDate)) {
      break;
    }

    // 일정 생성
    const newSchedule = {
      ...schedule,
      id: `${schedule.id}_${currentDate.getTime()}`,
      startDate: new Date(currentDate),
      endDate: new Date(currentDate.getTime() + (schedule.endDate - schedule.startDate)),
      isRecurring: true,
      originalScheduleId: schedule.id,
      recurringDate: new Date(currentDate)
    };

    schedules.push(newSchedule);
    currentDate = nextDate;
  }

  return schedules;
};

// 다음 반복 날짜 계산
export const getNextRecurringDate = (currentDate, repeat) => {
  const { type, interval, daysOfWeek } = repeat;

  switch (type) {
    case 'daily':
      return addDays(currentDate, interval);

    case 'weekly':
      return addWeeks(currentDate, interval);

    case 'monthly':
      return addMonths(currentDate, interval);

    case 'yearly':
      return addYears(currentDate, interval);

    case 'custom':
      return getNextCustomRecurringDate(currentDate, daysOfWeek, interval);

    default:
      return addDays(currentDate, 1);
  }
};

// 사용자 정의 반복 날짜 계산
export const getNextCustomRecurringDate = (currentDate, daysOfWeek, interval) => {
  if (!daysOfWeek || daysOfWeek.length === 0) {
    return addDays(currentDate, 1);
  }

  const currentDayOfWeek = currentDate.getDay();
  const sortedDays = [...daysOfWeek].sort((a, b) => a - b);

  // 현재 요일 이후의 다음 요일 찾기
  let nextDay = sortedDays.find(day => day > currentDayOfWeek);
  
  if (!nextDay) {
    // 다음 주의 첫 번째 요일
    nextDay = sortedDays[0];
    return addWeeks(addDays(currentDate, nextDay - currentDayOfWeek), interval);
  }

  return addDays(currentDate, nextDay - currentDayOfWeek);
};

// 반복 일정 규칙 문자열 생성
export const getRecurringRuleText = (repeat) => {
  if (!repeat?.enabled) {
    return '반복 없음';
  }

  const { type, interval, daysOfWeek } = repeat;

  switch (type) {
    case 'daily':
      return interval === 1 ? '매일' : `${interval}일마다`;

    case 'weekly':
      if (daysOfWeek && daysOfWeek.length > 0) {
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const selectedDays = daysOfWeek.map(day => dayNames[day]).join(', ');
        return interval === 1 ? `매주 ${selectedDays}` : `${interval}주마다 ${selectedDays}`;
      }
      return interval === 1 ? '매주' : `${interval}주마다`;

    case 'monthly':
      return interval === 1 ? '매월' : `${interval}개월마다`;

    case 'yearly':
      return interval === 1 ? '매년' : `${interval}년마다`;

    case 'custom':
      if (daysOfWeek && daysOfWeek.length > 0) {
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const selectedDays = daysOfWeek.map(day => dayNames[day]).join(', ');
        return `매주 ${selectedDays}`;
      }
      return '사용자 정의';

    default:
      return '반복 없음';
  }
};

// 반복 일정 수정 (단일/전체)
export const updateRecurringSchedule = (schedule, updateType = 'single') => {
  if (updateType === 'single') {
    // 단일 일정만 수정
    return {
      ...schedule,
      isRecurringException: true,
      updatedAt: new Date()
    };
  } else {
    // 전체 반복 일정 수정
    return {
      ...schedule,
      updatedAt: new Date()
    };
  }
};

// 반복 일정 삭제 (단일/전체)
export const deleteRecurringSchedule = (schedule, deleteType = 'single') => {
  if (deleteType === 'single') {
    // 단일 일정만 삭제 (예외로 표시)
    return {
      ...schedule,
      isRecurringException: true,
      isDeleted: true,
      deletedAt: new Date()
    };
  } else {
    // 전체 반복 일정 삭제
    return {
      ...schedule,
      isDeleted: true,
      deletedAt: new Date()
    };
  }
};

// 반복 일정 예외 처리
export const handleRecurringException = (schedule, action, type) => {
  switch (action) {
    case 'update':
      return updateRecurringSchedule(schedule, type);
    case 'delete':
      return deleteRecurringSchedule(schedule, type);
    default:
      return schedule;
  }
};

// 반복 일정 유효성 검사
export const validateRecurringSchedule = (schedule) => {
  const errors = [];

  if (schedule.repeat?.enabled) {
    const { type, interval, daysOfWeek } = schedule.repeat;

    if (!type) {
      errors.push('반복 유형을 선택해주세요');
    }

    if (!interval || interval < 1) {
      errors.push('반복 간격은 1 이상이어야 합니다');
    }

    if (type === 'custom' && (!daysOfWeek || daysOfWeek.length === 0)) {
      errors.push('반복 요일을 선택해주세요');
    }

    if (schedule.repeat.endDate && isBefore(new Date(schedule.repeat.endDate), schedule.startDate)) {
      errors.push('반복 종료 날짜는 시작 날짜보다 늦어야 합니다');
    }
  }

  return errors;
};

// 반복 일정 미리보기 (다음 10개)
export const getRecurringSchedulePreview = (schedule, count = 10) => {
  if (!schedule.repeat?.enabled) {
    return [schedule];
  }

  const previews = [];
  let currentDate = new Date(schedule.startDate);

  for (let i = 0; i < count; i++) {
    const nextDate = getNextRecurringDate(currentDate, schedule.repeat);
    
    const previewSchedule = {
      ...schedule,
      id: `preview_${i}`,
      startDate: new Date(currentDate),
      endDate: new Date(currentDate.getTime() + (schedule.endDate - schedule.startDate)),
      isPreview: true
    };

    previews.push(previewSchedule);
    currentDate = nextDate;
  }

  return previews;
};

// 반복 일정 통계
export const getRecurringScheduleStats = (schedules) => {
  const stats = {
    total: 0,
    recurring: 0,
    nonRecurring: 0,
    byType: {
      daily: 0,
      weekly: 0,
      monthly: 0,
      yearly: 0,
      custom: 0
    }
  };

  schedules.forEach(schedule => {
    stats.total++;
    
    if (schedule.repeat?.enabled) {
      stats.recurring++;
      const type = schedule.repeat.type;
      if (stats.byType[type] !== undefined) {
        stats.byType[type]++;
      }
    } else {
      stats.nonRecurring++;
    }
  });

  return stats;
}; 
import { addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../firebase';

// 알림 생성 함수
export const createNotification = async (notificationData) => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const notification = {
      userId: user.uid,
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type || 'info',
      read: false,
      createdAt: new Date(),
      ...notificationData
    };

    await addDoc(collection(db, 'notifications'), notification);
    console.log('알림 생성됨:', notification);
  } catch (error) {
    console.error('알림 생성 실패:', error);
  }
};

// 일정 관련 알림
export const createScheduleNotification = async (schedule, type) => {
  const notifications = {
    'added': {
      title: '새 일정 추가',
      message: `"${schedule.text || schedule.title}" 일정이 추가되었습니다.`,
      type: 'schedule'
    },
    'updated': {
      title: '일정 수정',
      message: `"${schedule.text || schedule.title}" 일정이 수정되었습니다.`,
      type: 'schedule'
    },
    'deleted': {
      title: '일정 삭제',
      message: `"${schedule.text || schedule.title}" 일정이 삭제되었습니다.`,
      type: 'schedule'
    },
    'today': {
      title: '오늘 일정',
      message: `"${schedule.text || schedule.title}" 일정이 오늘입니다.`,
      type: 'warning'
    },
    'overdue': {
      title: '지연된 일정',
      message: `"${schedule.text || schedule.title}" 일정이 지연되었습니다.`,
      type: 'error'
    }
  };

  const notification = notifications[type];
  if (notification) {
    await createNotification(notification);
  }
};

// 현장 관련 알림
export const createSiteNotification = async (site, type) => {
  const notifications = {
    'added': {
      title: '새 현장 추가',
      message: `"${site.name}" 현장이 추가되었습니다.`,
      type: 'site'
    },
    'updated': {
      title: '현장 정보 수정',
      message: `"${site.name}" 현장 정보가 수정되었습니다.`,
      type: 'site'
    },
    'status_changed': {
      title: '현장 상태 변경',
      message: `"${site.name}" 현장 상태가 "${site.status}"로 변경되었습니다.`,
      type: 'info'
    },
    'progress_updated': {
      title: '진행률 업데이트',
      message: `"${site.name}" 현장 진행률이 ${site.totalProgress}%로 업데이트되었습니다.`,
      type: 'success'
    },
    'completed': {
      title: '현장 완료',
      message: `"${site.name}" 현장이 완료되었습니다!`,
      type: 'success'
    }
  };

  const notification = notifications[type];
  if (notification) {
    await createNotification(notification);
  }
};

// 예산 관련 알림
export const createBudgetNotification = async (site, type, data) => {
  const notifications = {
    'over_budget': {
      title: '예산 초과 경고',
      message: `"${site.name}" 현장이 예산을 초과했습니다. (${data.percentage}% 초과)`,
      type: 'budget'
    },
    'near_budget': {
      title: '예산 임계점',
      message: `"${site.name}" 현장이 예산의 ${data.percentage}%를 사용했습니다.`,
      type: 'warning'
    },
    'under_budget': {
      title: '예산 절약',
      message: `"${site.name}" 현장이 예산을 ${data.saved}만원 절약했습니다.`,
      type: 'success'
    }
  };

  const notification = notifications[type];
  if (notification) {
    await createNotification(notification);
  }
};

// 안전 관련 알림
export const createSafetyNotification = async (safety, type) => {
  const notifications = {
    'incident': {
      title: '안전 사고 발생',
      message: `"${safety.title}" 안전 사고가 보고되었습니다.`,
      type: 'error'
    },
    'inspection': {
      title: '안전 점검 완료',
      message: `"${safety.title}" 안전 점검이 완료되었습니다.`,
      type: 'success'
    },
    'training': {
      title: '안전 교육 예정',
      message: `"${safety.title}" 안전 교육이 예정되어 있습니다.`,
      type: 'warning'
    }
  };

  const notification = notifications[type];
  if (notification) {
    await createNotification(notification);
  }
};

// 시스템 알림
export const createSystemNotification = async (type, data) => {
  const notifications = {
    'login': {
      title: '로그인 알림',
      message: '새로운 기기에서 로그인되었습니다.',
      type: 'info'
    },
    'backup': {
      title: '데이터 백업',
      message: '데이터 백업이 완료되었습니다.',
      type: 'success'
    },
    'maintenance': {
      title: '시스템 점검',
      message: '시스템 점검이 예정되어 있습니다.',
      type: 'warning'
    },
    'update': {
      title: '시스템 업데이트',
      message: '새로운 기능이 업데이트되었습니다.',
      type: 'info'
    }
  };

  const notification = notifications[type];
  if (notification) {
    await createNotification(notification);
  }
};

// 일정 알림 체크 (매일 실행)
export const checkScheduleNotifications = async (schedules) => {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  schedules.forEach(schedule => {
    if (!schedule.date) return;

    let scheduleDate;
    if (schedule.date.toDate) {
      scheduleDate = schedule.date.toDate();
    } else if (schedule.date instanceof Date) {
      scheduleDate = schedule.date;
    } else {
      scheduleDate = new Date(schedule.date);
    }

    const scheduleDateStr = scheduleDate.toISOString().slice(0, 10);
    
    // 오늘 일정
    if (scheduleDateStr === todayStr) {
      createScheduleNotification(schedule, 'today');
    }
    
    // 지연된 일정 (어제 이전)
    if (scheduleDateStr < todayStr) {
      createScheduleNotification(schedule, 'overdue');
    }
  });
};

// 현장 진행률 알림 체크
export const checkSiteProgressNotifications = async (sites) => {
  sites.forEach(site => {
    const progress = parseFloat(site.totalProgress) || 0;
    
    // 100% 완료
    if (progress >= 100 && site.status !== '완료') {
      createSiteNotification(site, 'completed');
    }
    
    // 50% 달성
    if (progress >= 50 && progress < 51) {
      createSiteNotification(site, 'progress_updated');
    }
    
    // 90% 달성
    if (progress >= 90 && progress < 91) {
      createSiteNotification(site, 'progress_updated');
    }
  });
}; 
// 알림 크롤링 유틸리티
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// 알림 데이터 구조
export const notificationTypes = {
  KAKAO: 'kakao',
  WHATSAPP: 'whatsapp',
  TELEGRAM: 'telegram',
  EMAIL: 'email',
  SYSTEM: 'system'
};

// 알림 크롤링 설정
export const crawlerConfig = {
  kakao: {
    enabled: true,
    keywords: ['공사', '현장', '일정', '안전', '자재'],
    priority: 'high'
  },
  whatsapp: {
    enabled: true,
    keywords: ['work', 'construction', 'site'],
    priority: 'medium'
  },
  email: {
    enabled: true,
    keywords: ['견적', '계약', '청구'],
    priority: 'high'
  }
};

// 알림 데이터 저장
export const saveNotification = async (notificationData) => {
  try {
    const docRef = await addDoc(collection(db, 'crawledNotifications'), {
      ...notificationData,
      crawledAt: serverTimestamp(),
      processed: false
    });
    console.log('알림 저장 완료:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('알림 저장 실패:', error);
    throw error;
  }
};

// 키워드 필터링
export const filterByKeywords = (content, keywords) => {
  const lowerContent = content.toLowerCase();
  return keywords.some(keyword => 
    lowerContent.includes(keyword.toLowerCase())
  );
};

// 알림 우선순위 계산
export const calculatePriority = (notification) => {
  const { type, content, sender } = notification;
  const config = crawlerConfig[type];
  
  if (!config) return 'low';
  
  // 키워드 매칭으로 우선순위 조정
  if (filterByKeywords(content, config.keywords)) {
    return config.priority;
  }
  
  return 'low';
};

// 웹 기반 알림 크롤링 (PWA)
export const setupWebNotificationCrawler = () => {
  if ('Notification' in window) {
    // 알림 권한 요청
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log('알림 권한 허용됨');
        
        // 알림 수신 리스너 설정
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'NOTIFICATION_RECEIVED') {
            handleIncomingNotification(event.data.notification);
          }
        });
      }
    });
  }
};

// 수신된 알림 처리
export const handleIncomingNotification = async (notification) => {
  const processedNotification = {
    id: Date.now().toString(),
    type: notification.type || 'system',
    title: notification.title,
    content: notification.body || notification.content,
    sender: notification.sender || 'unknown',
    timestamp: new Date(notification.timestamp || Date.now()),
    priority: calculatePriority({
      type: notification.type,
      content: notification.body || notification.content,
      sender: notification.sender
    }),
    source: 'web'
  };
  
  // 키워드 필터링
  const config = crawlerConfig[processedNotification.type];
  if (config && config.enabled) {
    if (filterByKeywords(processedNotification.content, config.keywords)) {
      await saveNotification(processedNotification);
      console.log('중요 알림 저장됨:', processedNotification);
    }
  }
};

// 서버 사이드 크롤링 시뮬레이션
export const simulateNotificationCrawling = async () => {
  const mockNotifications = [
    {
      type: 'kakao',
      title: '현장 일정 변경',
      content: '내일 공사 일정이 오후 2시로 변경되었습니다.',
      sender: '현장팀',
      timestamp: new Date()
    },
    {
      type: 'email',
      title: '견적서 승인 요청',
      content: '새로운 건물 공사 견적서 승인이 필요합니다.',
      sender: '관리팀',
      timestamp: new Date()
    },
    {
      type: 'whatsapp',
      title: '안전 점검 완료',
      content: '오늘 안전 점검을 완료했습니다.',
      sender: '안전팀',
      timestamp: new Date()
    }
  ];
  
  for (const notification of mockNotifications) {
    await handleIncomingNotification(notification);
  }
};

// 알림 크롤링 시작
export const startNotificationCrawling = () => {
  console.log('알림 크롤링 시작...');
  
  // 웹 알림 설정
  setupWebNotificationCrawler();
  
  // 주기적 크롤링 (5분마다)
  setInterval(() => {
    simulateNotificationCrawling();
  }, 5 * 60 * 1000);
  
  // 초기 크롤링
  simulateNotificationCrawling();
};

// 알림 크롤링 중지
export const stopNotificationCrawling = () => {
  console.log('알림 크롤링 중지...');
  // 필요한 정리 작업 수행
};

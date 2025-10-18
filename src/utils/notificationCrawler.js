// 알림 크롤링 유틸리티
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// 알림 데이터 구조
export const notificationTypes = {
  KAKAO: 'kakao',
  WHATSAPP: 'whatsapp',
  TELEGRAM: 'telegram',
  EMAIL: 'email',
  SYSTEM: 'system',
  BANK: 'bank'
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
  },
  bank: {
    enabled: true,
    keywords: ['입금', '출금', '이체', '결제', '수수료', '대구은행'],
    priority: 'high',
    bankName: '대구은행'
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

// 대구은행 거래 내역 파싱
export const parseBankTransaction = (notification) => {
  const content = notification.body || notification.content;
  const title = notification.title;
  
  // 대구은행 알림 패턴 분석
  const patterns = {
    // 입금: "입금 1,000,000원 (급여)"
    deposit: /입금\s*([0-9,]+)원\s*(?:\(([^)]+)\))?/,
    // 출금: "출금 50,000원 (ATM)"
    withdrawal: /출금\s*([0-9,]+)원\s*(?:\(([^)]+)\))?/,
    // 이체: "이체 100,000원 → 홍길동"
    transfer: /이체\s*([0-9,]+)원\s*→\s*([^)]+)/,
    // 결제: "결제 25,000원 (스타벅스)"
    payment: /결제\s*([0-9,]+)원\s*(?:\(([^)]+)\))?/
  };
  
  let transactionType = 'unknown';
  let amount = 0;
  let description = '';
  
  for (const [type, pattern] of Object.entries(patterns)) {
    const match = content.match(pattern);
    if (match) {
      transactionType = type;
      amount = parseInt(match[1].replace(/,/g, ''));
      description = match[2] || '';
      break;
    }
  }
  
  return {
    transactionType,
    amount,
    description,
    originalContent: content,
    isIncome: transactionType === 'deposit',
    isExpense: ['withdrawal', 'transfer', 'payment'].includes(transactionType)
  };
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
  
  // 대구은행 거래 내역인 경우 추가 파싱
  if (processedNotification.type === 'bank' && processedNotification.sender.includes('대구은행')) {
    const bankData = parseBankTransaction(notification);
    processedNotification.bankData = bankData;
    processedNotification.category = bankData.isIncome ? 'income' : 'expense';
  }
  
  // 키워드 필터링
  const config = crawlerConfig[processedNotification.type];
  if (config && config.enabled) {
    if (filterByKeywords(processedNotification.content, config.keywords)) {
      await saveNotification(processedNotification);
      console.log('중요 알림 저장됨:', processedNotification);
    }
  }
};

// 대구은행 알림 크롤링 시뮬레이션
export const simulateBankNotificationCrawling = async () => {
  const bankNotifications = [
    {
      type: 'bank',
      title: '대구은행',
      content: '입금 2,500,000원 (급여)',
      sender: '대구은행',
      timestamp: new Date()
    },
    {
      type: 'bank',
      title: '대구은행',
      content: '출금 150,000원 (ATM)',
      sender: '대구은행',
      timestamp: new Date(Date.now() - 3600000) // 1시간 전
    },
    {
      type: 'bank',
      title: '대구은행',
      content: '결제 45,000원 (현장자재구매)',
      sender: '대구은행',
      timestamp: new Date(Date.now() - 7200000) // 2시간 전
    },
    {
      type: 'bank',
      title: '대구은행',
      content: '이체 500,000원 → 협력업체',
      sender: '대구은행',
      timestamp: new Date(Date.now() - 10800000) // 3시간 전
    },
    {
      type: 'bank',
      title: '대구은행',
      content: '입금 800,000원 (기성금)',
      sender: '대구은행',
      timestamp: new Date(Date.now() - 14400000) // 4시간 전
    }
  ];
  
  for (const notification of bankNotifications) {
    await handleIncomingNotification(notification);
  }
};

// 서버 사이드 크롤링 시뮬레이션
export const simulateNotificationCrawling = async () => {
  // 대구은행 알림 우선 크롤링
  await simulateBankNotificationCrawling();
  
  const otherNotifications = [
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
    }
  ];
  
  for (const notification of otherNotifications) {
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

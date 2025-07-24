import { db } from '../firebase.js';
import { collection, addDoc } from 'firebase/firestore';

const createTestTodos = async () => {
  try {
    console.log('투두 테스트 데이터 생성 시작...');
    
    // 한국 시간 기준 날짜 생성 함수
    const getKoreanDate = (date) => {
      const koreanTime = new Date(date.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
      return koreanTime.toISOString().split('T')[0];
    };
    
    // 전날 날짜
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getKoreanDate(yesterday);
    
    // 오늘 날짜
    const today = getKoreanDate(new Date());
    
    const testTodos = [
      {
        text: '전날 미완료 투두 1 - 안전점검 실시',
        completed: false,
        userId: 'test-user', // 실제 사용자 ID로 변경 필요
        date: yesterdayStr, // 전날 날짜
        createdAt: new Date(yesterday),
        updatedAt: new Date(yesterday)
      },
      {
        text: '전날 미완료 투두 2 - 기성청구서 작성',
        completed: false,
        userId: 'test-user',
        date: yesterdayStr,
        createdAt: new Date(yesterday),
        updatedAt: new Date(yesterday)
      },
      {
        text: '전날 미완료 투두 3 - 협력업체 미팅',
        completed: false,
        userId: 'test-user',
        date: yesterdayStr,
        createdAt: new Date(yesterday),
        updatedAt: new Date(yesterday)
      },
      {
        text: '오늘 완료된 투두 1',
        completed: true,
        userId: 'test-user',
        date: today,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        text: '오늘 미완료 투두 1',
        completed: false,
        userId: 'test-user',
        date: today,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const todo of testTodos) {
      await addDoc(collection(db, 'todos'), todo);
      console.log(`투두 추가됨: ${todo.text} - ${todo.date} - 완료: ${todo.completed}`);
    }

    console.log('투두 테스트 데이터 생성 완료!');
    console.log('전날 날짜:', yesterdayStr);
    console.log('오늘 날짜:', today);
    console.log('총', testTodos.length, '개의 투두가 추가되었습니다.');
    
  } catch (error) {
    console.error('투두 테스트 데이터 생성 중 오류 발생:', error);
  }
};

export default createTestTodos; 
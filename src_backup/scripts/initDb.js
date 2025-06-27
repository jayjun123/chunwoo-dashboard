import { db, collections } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

// 초기 날씨 데이터
const initWeather = async () => {
  const weatherData = [
    { day: '월', temp: 23, weather: '맑음', icon: '☀️' },
    { day: '화', temp: 24, weather: '구름', icon: '⛅' },
    { day: '수', temp: 22, weather: '비', icon: '🌧️' },
    { day: '목', temp: 21, weather: '흐림', icon: '☁️' },
    { day: '금', temp: 25, weather: '맑음', icon: '☀️' },
    { day: '토', temp: 26, weather: '맑음', icon: '☀️' },
    { day: '일', temp: 24, weather: '구름', icon: '⛅' },
  ];

  for (const weather of weatherData) {
    await addDoc(collection(db, collections.weather), weather);
  }
};

// 초기 현장 데이터
// const initSites = async () => {
//   const sitesData = [
//     { name: '현장 A', status: 'active', completedDate: null },
//     { name: '현장 B', status: 'completed', completedDate: '2024-03-20' },
//     { name: '현장 C', status: 'active', completedDate: null },
//   ];
//
//   for (const site of sitesData) {
//     await addDoc(collection(db, collections.sites), site);
//   }
// };

// 초기 기성 현황 데이터
const initProgress = async () => {
  const progressData = [
    { name: '프로젝트 A', current: 75, target: 100 },
    { name: '프로젝트 B', current: 30, target: 100 },
  ];

  for (const progress of progressData) {
    await addDoc(collection(db, collections.progress), progress);
  }
};

// 초기 협의 게시판 데이터
const initDiscussions = async () => {
  const discussionsData = [
    { title: '안전 점검 일정', content: '내용...', read: false },
    { title: '기성 청구 관련', content: '내용...', read: true },
  ];

  for (const discussion of discussionsData) {
    await addDoc(collection(db, collections.discussions), discussion);
  }
};

// 초기 안전 관리 데이터
const initSafety = async () => {
  const safetyData = [
    { title: '안전모 미착용', content: '내용...', resolved: false },
    { title: '작업장 정리정돈', content: '내용...', resolved: true },
  ];

  for (const safety of safetyData) {
    await addDoc(collection(db, collections.safety), safety);
  }
};

// 초기 할일 목록 데이터
const initTodos = async () => {
  const todosData = [
    { text: '안전점검 실시', completed: false, createdAt: new Date() },
    { text: '기성청구서 작성', completed: false, createdAt: new Date() },
    { text: '협력업체 미팅', completed: true, createdAt: new Date() },
  ];

  for (const todo of todosData) {
    await addDoc(collection(db, collections.todos), todo);
  }
};

// 모든 초기 데이터 설정
export const initializeDatabase = async () => {
  try {
    await initWeather();
    // await initSites();
    await initProgress();
    await initDiscussions();
    await initSafety();
    await initTodos();
    console.log('데이터베이스 초기화 완료');
  } catch (error) {
    console.error('데이터베이스 초기화 실패:', error);
  }
}; 